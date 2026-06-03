import { create } from 'zustand';
import type { AiAction } from '../../../contracts/aiActions';
import type { AgentTask } from '../../../contracts/backend';
import * as aiService from '../../../services/ai/aiService';
import * as pipelineService from '../../../services/pipeline/pipelineService';
import { adaptChatMessage } from '../../../services/ai/chatAdapter';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { genId } from '../../../utils/graph';
import type { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  appendMessage: (message: ChatMessage) => void;
  sendMessage: (text: string) => Promise<void>;
  applyAction: (action: AiAction) => void;
  loadHistory: (pipelineId: string) => Promise<void>;
  submitProcessingCode: (
    nodeId: string,
    language: 'sql' | 'python',
    code: string,
  ) => Promise<void>;
}

function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function assistant(
  text: string,
  action: AiAction | null = null,
  tasks: AgentTask[] = [],
): ChatMessage {
  return { id: genId('ai'), sender: 'assistant', timestamp: now(), text, action, tasks };
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  sender: 'assistant',
  timestamp: now(),
  text: '### Welcome to AuraBI Workspace\n\nI am your AI Data Architect, served by the backend. Ask me to design pipelines, add tables, or connect nodes, then click Apply to map changes onto the canvas.',
  action: null,
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
      id: genId('user'),
      sender: 'user',
      timestamp: now(),
      text: trimmed,
    };
    set((s) => ({ messages: [...s.messages, userMsg], isGenerating: true }));

    const pipelineId = usePipelineStore.getState().pipelineId;
    if (!pipelineId) {
      get().appendMessage(
        assistant(
          '### Backend Not Connected\n\nNo pipeline is bound yet, so the AI Master Agent is unavailable. Your message was not sent. Once the backend is reachable the workspace will reconnect automatically.',
        ),
      );
      set({ isGenerating: false });
      return;
    }

    const result = await aiService.chat(pipelineId, trimmed);

    if (result.ok && result.response) {
      get().appendMessage(
        assistant(
          result.response.text,
          result.response.action,
          result.response.tasks,
        ),
      );
    } else {
      get().appendMessage(
        assistant(
          `### Backend Unavailable\n\nThe AI backend could not be reached or returned an invalid response.\n\nDetails: ${result.error ?? 'unknown error'}`,
        ),
      );
    }
    set({ isGenerating: false });
  },

  applyAction: (action) => {
    if (action.type === 'explain') {
      const target = action.payload.target ?? 'this structure';
      void get().sendMessage(
        `Explain in depth why "${target}" is a good design choice for this pipeline.`,
      );
      return;
    }

    const result = usePipelineStore.getState().applyAction(action);
    if (result.error) {
      get().appendMessage(assistant(`### Action Rejected\n\n${result.error}`));
      return;
    }
    if (result.changed) {
      useWorkspaceStore.getState().setActiveTab('canvas');
      get().appendMessage(assistant(`### Applied\n\n${result.message}`));
    } else if (result.message) {
      get().appendMessage(assistant(result.message));
    }
  },

  loadHistory: async (pipelineId) => {
    try {
      const history = await pipelineService.getChatHistory(pipelineId);
      if (history.length === 0) return;
      const messages: ChatMessage[] = history.map((m) => {
        const adapted = adaptChatMessage(m);
        return {
          id: adapted.id,
          sender: adapted.sender,
          timestamp: adapted.timestamp,
          text: adapted.text,
          action: adapted.action,
        };
      });
      set({ messages });
    } catch {
      // History is best-effort; keep the in-memory conversation on failure.
    }
  },

  submitProcessingCode: async (nodeId, language, code) => {
    // The backend has no dedicated code-review route, so persist the code via
    // the node PATCH (handled by the store) and ask the Master Agent to review.
    usePipelineStore.getState().updateProcessingCode(nodeId, code);
    await get().sendMessage(
      `I updated the ${language.toUpperCase()} code for node "${nodeId}". Please review it:\n\n\`\`\`${language}\n${code}\n\`\`\``,
    );
  },
}));
