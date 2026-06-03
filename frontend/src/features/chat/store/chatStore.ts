import { create } from 'zustand';
import type { AiAction } from '../../../contracts/aiActions';
import * as aiService from '../../../services/ai/aiService';
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
  submitProcessingCode: (
    nodeId: string,
    language: 'sql' | 'python',
    code: string,
  ) => Promise<void>;
}

function now(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function assistant(text: string, action: AiAction | null = null): ChatMessage {
  return { id: genId('ai'), sender: 'assistant', timestamp: now(), text, action };
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

    const { nodes, edges } = usePipelineStore.getState();
    const result = await aiService.chat(trimmed, { nodes, edges });

    if (result.ok && result.response) {
      get().appendMessage(
        assistant(result.response.text, result.response.action),
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
      get().appendMessage(
        assistant(`### Action Rejected\n\n${result.error}`),
      );
      return;
    }
    if (result.changed) {
      useWorkspaceStore.getState().setActiveTab('canvas');
      get().appendMessage(assistant(`### Applied\n\n${result.message}`));
    } else if (result.message) {
      get().appendMessage(assistant(result.message));
    }
  },

  submitProcessingCode: async (nodeId, language, code) => {
    usePipelineStore.getState().updateProcessingCode(nodeId, code);
    set({ isGenerating: true });
    const result = await aiService.submitProcessingCode(nodeId, language, code);
    if (result.ok && result.response) {
      get().appendMessage(
        assistant(result.response.text, result.response.action),
      );
    } else {
      get().appendMessage(
        assistant(
          `### Code Saved Locally\n\nThe updated ${language.toUpperCase()} code was applied to the node, but the backend review could not be reached.\n\nDetails: ${result.error ?? 'unknown error'}`,
        ),
      );
    }
    set({ isGenerating: false });
  },
}));
