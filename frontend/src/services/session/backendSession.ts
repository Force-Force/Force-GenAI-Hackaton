import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ApiError } from '../http/client';
import { pipelineApi } from '../api/pipelineApi';
import { chatApi } from '../api/chatApi';
import { runAndGovernanceApi } from '../api/runAndGovernanceApi';
import { pipelineSocket, type WebSocketStatus } from '../realtime/pipelineSocket';
import { toFrontendGraph } from '../mapping/backendGraphMapper';
import { handleBackendQuestionPrompt } from '../mapping/backendToUiopBridge';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';
import { usePlanStore } from '../../features/uiop/store/planStore';
import { useWorkspaceStore } from '../../features/workspace/store/workspaceStore';
import { useInsightStore } from '../../features/insights/store/insightStore';
import { useChatStore } from '../../features/chat/store/chatStore';
import { useHistoryStore } from '../../features/history/store/historyStore';
import { persistStateStorage } from '../../store/persistStorage';
import type {
  BackendAgentTask,
  BackendApproval,
  BackendPipeline,
  BackendQuestion,
  BackendRun,
  HealthResponse,
  PipelineListItem,
} from '../../contracts/backendApi';

interface BackendSessionState {
  isOnline: boolean;
  health: HealthResponse | null;
  activePipelineId: string | null;
  activePipeline: BackendPipeline | null;
  pipelinesList: PipelineListItem[];
  wsStatus: WebSocketStatus;

  activeRun: BackendRun | null;
  pendingApprovals: BackendApproval[];
  pendingQuestions: BackendQuestion[];
  agentTasks: BackendAgentTask[];
  isLoading: boolean;

  checkHealth: () => Promise<boolean>;
  refreshPipelines: () => Promise<PipelineListItem[]>;
  setActivePipelineId: (id: string | null) => void;
  loadPipeline: (pipelineId: string) => Promise<BackendPipeline | null>;
  createPipeline: (name: string) => Promise<BackendPipeline | null>;

  refreshApprovals: () => Promise<BackendApproval[]>;
  decideApproval: (approvalId: string, approved: boolean, comment?: string) => Promise<boolean>;

  refreshQuestions: () => Promise<BackendQuestion[]>;
  answerQuestion: (questionId: string, answer: string) => Promise<boolean>;

  refreshTasks: () => Promise<BackendAgentTask[]>;
  executeTask: (taskId: string) => Promise<boolean>;

  startPipelineRun: () => Promise<BackendRun | null>;
  resumePipelineRun: (runId: string) => Promise<BackendRun | null>;
}

export const useBackendStore = create<BackendSessionState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      health: null,
      activePipelineId: null,
      activePipeline: null,
      pipelinesList: [],
      wsStatus: 'disconnected',

      activeRun: null,
      pendingApprovals: [],
      pendingQuestions: [],
      agentTasks: [],
      isLoading: false,

      checkHealth: async () => {
        try {
          const res = await pipelineApi.getHealth();
          const online = res.status === 'ok';
          set({ isOnline: online, health: res });
          if (online) {
            // Immediately purge offline mock seed data when connected to a live backend
            usePipelineStore.getState().clearMockGraphForLiveBackend();
            usePlanStore.getState().clearMockPlanForLiveBackend();
            useInsightStore.getState().clearMockDataForLiveBackend();
            useHistoryStore.getState().clearMockHistoryForLiveBackend();

            const pid = get().activePipelineId;
            if (pid) {
              void get().loadPipeline(pid);
            } else {
              void get()
                .refreshPipelines()
                .then((list) => {
                  if (list.length > 0 && !get().activePipelineId) {
                    void get().loadPipeline(list[0].id);
                  } else if (list.length === 0) {
                    useWorkspaceStore.getState().setProjectName('New Pipeline');
                  }
                });
            }
          }
          return online;
        } catch {
          set({ isOnline: false, health: null });
          return false;
        }
      },

      refreshPipelines: async () => {
        try {
          const list = await pipelineApi.listPipelines(0, 50);
          set({ pipelinesList: list });
          return list;
        } catch {
          return [];
        }
      },

      setActivePipelineId: (id) => {
        set({ activePipelineId: id });
        if (id) {
          pipelineSocket.connect(id);
        } else {
          pipelineSocket.disconnect();
        }
      },

      loadPipeline: async (pipelineId: string) => {
        set({ isLoading: true });
        try {
          const pipeline = await pipelineApi.getPipeline(pipelineId);
          set({
            activePipeline: pipeline,
            activePipelineId: pipeline.id,
            isLoading: false,
          });

          // Hydrate frontend stores (unconditionally overwrite so empty backend pipelines clear mock nodes)
          const { nodes, edges } = toFrontendGraph(pipeline);
          usePipelineStore.getState().hydrateGraph(nodes, edges);

          useWorkspaceStore.getState().setProjectName(pipeline.name);
          usePlanStore.getState().clearMockPlanForLiveBackend(pipeline.name);
          useInsightStore.getState().clearMockDataForLiveBackend();
          useHistoryStore.getState().clearMockHistoryForLiveBackend();

          // Restore plan if persisted in architecture_design
          const design = (pipeline.architecture_design ?? {}) as Record<string, any>;
          if (design.plan) {
            usePlanStore.getState().commitUiopState(design.plan);
          }

          // Connect socket
          pipelineSocket.connect(pipeline.id);

          // Parallel fetch chat history, live insights, approvals, questions, tasks, project history
          void useChatStore.getState().hydrateChatHistory(pipeline.id);
          void useInsightStore.getState().fetchLiveInsights(pipeline.id);
          void useHistoryStore.getState().fetchHistory(pipeline.id);
          void get().refreshApprovals();
          void get().refreshQuestions();
          void get().refreshTasks();

          return pipeline;
        } catch (err) {
          set({ isLoading: false });
          // The remembered pipeline no longer exists (e.g. the database was recreated):
          // forget it and open the most recent pipeline instead.
          if (err instanceof ApiError && err.status === 404 && get().activePipelineId === pipelineId) {
            set({ activePipelineId: null, activePipeline: null });
            pipelineSocket.disconnect();
            const list = await get().refreshPipelines();
            if (list.length > 0) return get().loadPipeline(list[0].id);
            useWorkspaceStore.getState().setProjectName('New Pipeline');
          }
          return null;
        }
      },

      createPipeline: async (name: string) => {
        set({ isLoading: true });
        try {
          const pipeline = await pipelineApi.createPipeline(name);
          set({
            activePipeline: pipeline,
            activePipelineId: pipeline.id,
            isLoading: false,
          });

          // Clear mock data and start with a clean live pipeline state
          usePipelineStore.getState().hydrateGraph([], []);
          usePlanStore.getState().clearMockPlanForLiveBackend(pipeline.name);
          useInsightStore.getState().clearMockDataForLiveBackend();
          useWorkspaceStore.getState().setProjectName(pipeline.name);
          pipelineSocket.connect(pipeline.id);
          void get().refreshPipelines();
          return pipeline;
        } catch (err) {
          set({ isLoading: false });
          return null;
        }
      },

      refreshApprovals: async () => {
        const pid = get().activePipelineId;
        if (!pid) return [];
        try {
          const list = await runAndGovernanceApi.listApprovals(pid, 'PENDING');
          set({ pendingApprovals: list });
          return list;
        } catch {
          return [];
        }
      },

      decideApproval: async (approvalId, approved, comment) => {
        const pid = get().activePipelineId;
        if (!pid) return false;
        try {
          await runAndGovernanceApi.decideApproval(pid, approvalId, approved, comment);
          await get().refreshApprovals();
          return true;
        } catch {
          return false;
        }
      },

      refreshQuestions: async () => {
        const pid = get().activePipelineId;
        if (!pid) return [];
        try {
          const list = await runAndGovernanceApi.listQuestions(pid, { pending_only: true });
          set({ pendingQuestions: list });
          for (const q of list) {
            handleBackendQuestionPrompt(q);
          }
          return list;
        } catch {
          return [];
        }
      },

      answerQuestion: async (questionId, answer) => {
        const pid = get().activePipelineId;
        if (!pid) return false;
        try {
          await runAndGovernanceApi.answerQuestion(pid, questionId, answer);
          await get().refreshQuestions();
          return true;
        } catch {
          return false;
        }
      },

      refreshTasks: async () => {
        const pid = get().activePipelineId;
        if (!pid) return [];
        try {
          const list = await chatApi.getAgentTasks(pid);
          set({ agentTasks: list });
          return list;
        } catch {
          return [];
        }
      },

      executeTask: async (taskId) => {
        const pid = get().activePipelineId;
        if (!pid) return false;
        try {
          await chatApi.executeAgentTask(pid, taskId);
          await get().refreshTasks();
          return true;
        } catch {
          return false;
        }
      },

      startPipelineRun: async () => {
        const pid = get().activePipelineId;
        if (!pid) return null;
        try {
          const res = await runAndGovernanceApi.startRun(pid);
          set({ activeRun: res.run });
          return res.run;
        } catch {
          return null;
        }
      },

      resumePipelineRun: async (runId) => {
        const pid = get().activePipelineId;
        if (!pid) return null;
        try {
          const run = await runAndGovernanceApi.resumeRun(pid, runId);
          set({ activeRun: run });
          return run;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'aura-bi.backend-session.v1',
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        activePipelineId: s.activePipelineId,
      }),
    },
  ),
);

// Synchronize socket status and real-time events into session store (FRONTEND_INTEGRATION.md §10)
queueMicrotask(() => {
  if (!pipelineSocket) return;
  pipelineSocket.onStatusChange((status) => {
    useBackendStore.setState({ wsStatus: status });
  });

  pipelineSocket.on('*', (event) => {
    const state = useBackendStore.getState();
    const pid = state.activePipelineId;
    if (!pid) return;

    switch (event.type) {
      case 'ws.connected':
      case 'pipeline.updated':
      case 'pipeline.revision_created':
        void state.loadPipeline(pid);
        void useHistoryStore.getState().fetchHistory(pid);
        break;
      case 'chat.message':
        void useChatStore.getState().hydrateChatHistory(pid);
        break;
      case 'agent_task.updated':
        void state.refreshTasks();
        break;
      case 'guardian.approval_required':
      case 'guardian.approval_resolved':
        void state.refreshApprovals();
        break;
      case 'user_input.required':
      case 'user_input.answered':
        void state.refreshQuestions();
        break;
      case 'pipeline.run_updated':
      case 'pipeline.run_event': {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const runId = state.activeRun?.id || (payload.run_id as string | undefined);
        if (runId) {
          void runAndGovernanceApi
            .getRun(pid, runId)
            .then((run) => {
              useBackendStore.setState({ activeRun: run });
              void useHistoryStore.getState().fetchHistory(pid);
              if (run.status === 'COMPLETED') {
                void useInsightStore.getState().fetchLiveInsights(pid);
              }
            })
            .catch(() => {
              // Ignore transient fetch errors
            });
        }
        break;
      }
    }
  });
});

