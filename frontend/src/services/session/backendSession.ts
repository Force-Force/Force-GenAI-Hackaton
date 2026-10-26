import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { pipelineApi } from '../api/pipelineApi';
import { chatApi } from '../api/chatApi';
import { runAndGovernanceApi } from '../api/runAndGovernanceApi';
import { pipelineSocket, type WebSocketStatus } from '../realtime/pipelineSocket';
import { toFrontendGraph } from '../mapping/backendGraphMapper';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';
import { usePlanStore } from '../../features/uiop/store/planStore';
import { useWorkspaceStore } from '../../features/workspace/store/workspaceStore';
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

          // Hydrate frontend stores
          const { nodes, edges } = toFrontendGraph(pipeline);
          if (nodes.length > 0) {
            usePipelineStore.getState().hydrateGraph(nodes, edges);
          }

          useWorkspaceStore.getState().setProjectName(pipeline.name);

          // Restore plan if persisted in architecture_design
          const design = (pipeline.architecture_design ?? {}) as Record<string, any>;
          if (design.plan) {
            usePlanStore.getState().commitUiopState(design.plan);
          }

          // Connect socket
          pipelineSocket.connect(pipeline.id);

          // Parallel fetch approvals, questions, tasks
          void get().refreshApprovals();
          void get().refreshQuestions();
          void get().refreshTasks();

          return pipeline;
        } catch (err) {
          set({ isLoading: false });
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

// Synchronize socket status into session store
pipelineSocket.onStatusChange((status) => {
  useBackendStore.setState({ wsStatus: status });
});

