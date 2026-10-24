import { create } from "zustand";
import type {
  UiopEnvelope,
  UiopExecutionReport,
} from "../../../contracts/uiop";
import { synthesizeUiopFromPrompt } from "../../uiop/adapter/promptToUiopAdapter";
import { executeUiop } from "../../uiop/runtime/uiopRuntime";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { genId } from "../../../utils/graph";
import type { AgentTask, ChatMessage } from "../types";

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  appendMessage: (message: ChatMessage) => void;
  sendMessage: (text: string) => Promise<void>;
  applyUiop: (envelope: UiopEnvelope) => UiopExecutionReport;
  submitProcessingCode: (
    nodeId: string,
    language: "sql" | "python",
    code: string,
  ) => Promise<void>;
}

function now(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function assistant(
  text: string,
  uiop: UiopEnvelope | null = null,
  tasks: AgentTask[] = [],
): ChatMessage {
  return {
    id: genId("ai"),
    sender: "assistant",
    timestamp: now(),
    text,
    uiop,
    tasks,
  };
}

const WELCOME: ChatMessage = {
  id: "welcome",
  sender: "assistant",
  timestamp: now(),
  text: "### Welcome to AuraBI Workspace\n\nI am your AI Data Architect powered by the **UI Operations Protocol (UIOP v1.0)**. Ask me to design pipelines, add tables, connect lineage, update plans, or propose clarifying questions.",
  uiop: null,
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [WELCOME],
  isGenerating: false,

  appendMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: genId("user"),
      sender: "user",
      timestamp: now(),
      text: trimmed,
    };
    set((s) => ({ messages: [...s.messages, userMsg], isGenerating: true }));

    const synthesized = synthesizeUiopFromPrompt(trimmed);
    get().appendMessage(
      assistant(synthesized.replyMarkdown, synthesized.envelope),
    );
    set({ isGenerating: false });
  },

  applyUiop: (envelope) => {
    const report = executeUiop(envelope, { allowRebase: true });
    if (report.ok) {
      get().appendMessage(
        assistant(
          `### UIOP Batch Applied (rev #${report.newRevision})\n\n${report.summary.map((s) => `- ${s}`).join("\n")}`,
        ),
      );
    } else {
      get().appendMessage(
        assistant(
          `### UIOP Batch Rejected\n\n${report.errors.map((e) => `- **${e.code}**: ${e.message}`).join("\n")}`,
        ),
      );
    }
    return report;
  },

  submitProcessingCode: async (nodeId, language, code) => {
    usePipelineStore.getState().updateProcessingCode(nodeId, code);
    await get().sendMessage(
      `I updated the ${language.toUpperCase()} code for node "${nodeId}". Please review it:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    );
  },
}));
