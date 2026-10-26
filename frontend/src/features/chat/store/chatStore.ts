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
import { chatApi } from "../../../services/api/chatApi";
import { useBackendStore } from "../../../services/session/backendSession";

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

    const activePipelineId = useBackendStore.getState().activePipelineId;
    const isOnline = useBackendStore.getState().isOnline;

    if (activePipelineId && isOnline) {
      try {
        const backendRes = await chatApi.sendChatMessage(activePipelineId, trimmed);
        const agentMsgObj = (backendRes.agent_message || {}) as Record<string, any>;
        const metadata = (agentMsgObj.metadata || {}) as Record<string, any>;
        const uiopEnvelope = (metadata.uiop || null) as UiopEnvelope | null;

        const tasks: AgentTask[] = (backendRes.agent_tasks || []).map((t) => ({
          id: t.id,
          agent_role: t.agent_role,
          instruction: t.instruction,
          status: t.status,
          input_data: t.input_payload,
          output_data: t.output_payload,
        }));

        const textContent =
          typeof agentMsgObj.content_md === 'string'
            ? agentMsgObj.content_md
            : typeof agentMsgObj.text === 'string'
              ? agentMsgObj.text
              : 'I have processed your request.';

        get().appendMessage(assistant(textContent, uiopEnvelope, tasks));
        set({ isGenerating: false });
        return;
      } catch (err) {
        // Network or API failure -> fall through to local synthesis
      }
    }

    // Local UIOP synthesis fallback
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
