import { create } from "zustand";
import {
  uiopEnvelopeSchema,
  type UiopEnvelope,
  type UiopExecutionReport,
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
  hydrateChatHistory: (pipelineId: string) => Promise<void>;
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

function formatIsoTime(iso?: string): string {
  if (!iso) return now();
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return now();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return now();
  }
}

function extractUiopFromMessage(
  metadata?: Record<string, unknown>,
  contentMd?: string,
): UiopEnvelope | null {
  if (metadata && metadata.uiop) {
    const parsed = uiopEnvelopeSchema.safeParse(metadata.uiop);
    if (parsed.success) return parsed.data;
  }
  if (contentMd) {
    const match = contentMd.match(/```(?:uiop|json)\s*([\s\S]*?)```/i);
    if (match) {
      try {
        const jsonObj = JSON.parse(match[1]);
        const parsed = uiopEnvelopeSchema.safeParse(jsonObj);
        if (parsed.success) return parsed.data;
      } catch {
        // Not a UIOP JSON block
      }
    }
  }
  return null;
}

function assistant(
  text: string,
  uiop: UiopEnvelope | null = null,
  tasks: AgentTask[] = [],
  id?: string,
  timestamp?: string,
): ChatMessage {
  return {
    id: id || genId("ai"),
    sender: "assistant",
    timestamp: timestamp || now(),
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
    set((s) => ({
      messages: s.messages.some((m) => m.id === message.id)
        ? s.messages.map((m) => (m.id === message.id ? message : m))
        : [...s.messages, message],
    })),

  hydrateChatHistory: async (pipelineId: string) => {
    try {
      const history = await chatApi.getChatHistory(pipelineId);
      const mapped: ChatMessage[] = history.map((m) => {
        const isUser = m.sender === "USER";
        const uiop = extractUiopFromMessage(
          m.metadata as Record<string, unknown>,
          m.content_md,
        );
        return {
          id: m.id,
          sender: isUser ? "user" : "assistant",
          timestamp: formatIsoTime(m.created_at),
          text: m.content_md,
          uiop,
        };
      });
      set({ messages: mapped.length > 0 ? mapped : [WELCOME] });
    } catch {
      set({ messages: [WELCOME] });
    }
  },

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

    const backendStore = useBackendStore.getState();
    const isOnline = backendStore.isOnline;
    let activePipelineId = backendStore.activePipelineId;

    if (isOnline) {
      try {
        if (!activePipelineId) {
          const created = await backendStore.createPipeline(
            trimmed.slice(0, 48) || "New Pipeline",
          );
          activePipelineId = created?.id ?? null;
        }

        if (!activePipelineId) {
          throw new Error("Could not initialize a backend pipeline session.");
        }

        const backendRes = await chatApi.sendChatMessage(
          activePipelineId,
          trimmed,
        );
        const agentMsgObj = (backendRes.agent_message || {}) as Record<
          string,
          unknown
        >;
        const metadata = (agentMsgObj.metadata || {}) as Record<
          string,
          unknown
        >;
        const textContent =
          typeof agentMsgObj.content_md === "string"
            ? agentMsgObj.content_md
            : typeof agentMsgObj.text === "string"
              ? agentMsgObj.text
              : "I have processed your request.";

        const uiopEnvelope = extractUiopFromMessage(metadata, textContent);
        if (uiopEnvelope) {
          executeUiop(uiopEnvelope, { allowRebase: true });
        }

        const tasks: AgentTask[] = (backendRes.agent_tasks || []).map((t) => ({
          id: t.id,
          agent_role: t.agent_role,
          instruction: t.instruction,
          status: t.status,
          input_data: t.input_payload,
          output_data: t.output_payload,
        }));

        get().appendMessage(
          assistant(
            textContent,
            uiopEnvelope,
            tasks,
            typeof agentMsgObj.id === "string" ? agentMsgObj.id : undefined,
            typeof agentMsgObj.created_at === "string"
              ? formatIsoTime(agentMsgObj.created_at)
              : undefined,
          ),
        );

        // Refresh delegated tasks & pipeline state from backend
        void backendStore.refreshTasks();
        void backendStore.refreshQuestions();
        void backendStore.refreshApprovals();
        set({ isGenerating: false });
        return;
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Backend chat request failed.";
        get().appendMessage(
          assistant(`### Backend Error\n\n${errMsg}`),
        );
        set({ isGenerating: false });
        return;
      }
    }

    // Offline Mode only: Local UIOP synthesis fallback
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
