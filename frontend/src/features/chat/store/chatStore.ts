import { create } from "zustand";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { genId } from "../../../utils/graph";
import type { AgentTask, ChatMessage } from "../types";

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  appendMessage: (message: ChatMessage) => void;
  sendMessage: (text: string) => Promise<void>;
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

function assistant(text: string, tasks: AgentTask[] = []): ChatMessage {
  return {
    id: genId("ai"),
    sender: "assistant",
    timestamp: now(),
    text,
    tasks,
  };
}

const WELCOME: ChatMessage = {
  id: "welcome",
  sender: "assistant",
  timestamp: now(),
  text: "### Welcome to AuraBI Workspace\n\nI am your AI Data Architect, served by the backend. Ask me to design pipelines, add tables, or connect nodes.",
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

    get().appendMessage(
      assistant(
        "### Backend Not Connected\n\nThe backend chat integration is being upgraded to the new UIOP protocol. Your message was recorded locally.",
      ),
    );
    set({ isGenerating: false });
  },

  submitProcessingCode: async (nodeId, language, code) => {
    usePipelineStore.getState().updateProcessingCode(nodeId, code);
    await get().sendMessage(
      `I updated the ${language.toUpperCase()} code for node "${nodeId}". Please review it:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    );
  },
}));
