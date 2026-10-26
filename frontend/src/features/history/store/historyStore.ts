import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStateStorage } from '../../../store/persistStorage';
import type {
  PipelineRevision,
  PipelineRevisionAuthor,
  PipelineRunHistoryItem,
} from '../../../contracts/projectHistory';
import { historyApi } from '../../../services/api/historyApi';
import { useBackendStore } from '../../../services/session/backendSession';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { usePlanStore } from '../../uiop/store/planStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';

export const INITIAL_OFFLINE_REVISIONS: PipelineRevision[] = [
  {
    id: 'rev_initial_4',
    revision: 4,
    pipeline_id: 'local_pipe_retail',
    title: 'Star Schema Datamart & Independent Audit Seal',
    description: 'Promoted dimensional Star Schema with fact_daily_revenue and conformed customer dimension. Audit Agent verified zero-variance tolerance.',
    author_type: 'AUDITOR_AGENT',
    author_name: 'Independent Audit Agent',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    node_count: 5,
    edge_count: 4,
    stage_count: 5,
    operations_summary: [
      'Verified zero-variance financial reconciliation on fact_daily_revenue',
      'Affixed SHA-256 cryptographic verification seal',
      'Configured SCD Type-2 temporal dimension tracking',
    ],
    tags: ['audit_passed', 'star_schema', 'production_ready'],
  },
  {
    id: 'rev_initial_3',
    revision: 3,
    pipeline_id: 'local_pipe_retail',
    title: 'Automated Stripe & PostgreSQL Cleansing Transform',
    description: 'Implemented SQL cleansing queries to normalize currency values to USD and filter out refunded test charges.',
    author_type: 'MASTER_AGENT',
    author_name: 'AuraBI Master Builder',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    node_count: 4,
    edge_count: 3,
    stage_count: 4,
    operations_summary: [
      'Added clean_stripe_events.sql processing node',
      'Connected raw_stripe_events -> clean_stripe_events',
      'Linked customer_dimension_raw to clean_stripe_events',
    ],
    tags: ['transformation', 'sql'],
  },
  {
    id: 'rev_initial_2',
    revision: 2,
    pipeline_id: 'local_pipe_retail',
    title: 'Architectural Blueprint Approved & Ingestion Configured',
    description: 'User approved 5-stage Lakehouse proposal. Instantiated PostgreSQL raw source ledger and Stripe webhook receiver.',
    author_type: 'USER',
    author_name: 'Pipeline Architect',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    node_count: 3,
    edge_count: 1,
    stage_count: 5,
    operations_summary: [
      'Approved Lakehouse Architecture Blueprint',
      'Created raw_pos_transactions PostgreSQL source node',
      'Created raw_stripe_events Webhook source node',
    ],
    tags: ['blueprint_approved', 'ingestion'],
  },
  {
    id: 'rev_initial_1',
    revision: 1,
    pipeline_id: 'local_pipe_retail',
    title: 'Project Initialized from Natural Language Prompt',
    description: 'Decomposed prompt into 5 Kimball dimensional stages and synthesized domain KPIs.',
    author_type: 'PLANNER_AGENT',
    author_name: 'Master Architectural Planner',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    node_count: 1,
    edge_count: 0,
    stage_count: 5,
    operations_summary: [
      'Decomposed architectural prompt into Kimball dimensional phases',
      'Generated 4-stage AI reasoning timeline',
      'Compiled initial ANSI SQL DDL draft',
    ],
    tags: ['initialization', 'ai_proposal'],
  },
];

export const INITIAL_OFFLINE_RUNS: PipelineRunHistoryItem[] = [
  {
    id: 'run_init_104',
    pipeline_id: 'local_pipe_retail',
    run_number: 104,
    status: 'COMPLETED',
    trigger_type: 'MANUAL',
    started_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 12 + 1000 * 14).toISOString(),
    duration_seconds: 14.2,
    records_processed: 1248500,
    nodes_executed: 5,
    total_nodes: 5,
    events: [
      {
        id: 'ev-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        phase: 'Source Ingestion',
        status: 'SUCCESS',
        message: 'Streamed 840,000 raw transaction records from PostgreSQL cluster',
        node_id: 'src-pos',
        duration_ms: 3200,
      },
      {
        id: 'ev-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 3500).toISOString(),
        phase: 'Stripe Webhooks',
        status: 'SUCCESS',
        message: 'Polled 408,500 payment events from Stripe API ledger',
        node_id: 'src-stripe',
        duration_ms: 2800,
      },
      {
        id: 'ev-3',
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 6500).toISOString(),
        phase: 'Data Cleansing',
        status: 'SUCCESS',
        message: 'Executed clean_stripe_events.sql with 0 dropped anomalous rows',
        node_id: 'proc-clean',
        duration_ms: 4100,
      },
      {
        id: 'ev-4',
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 11000).toISOString(),
        phase: 'Mart Rollup',
        status: 'SUCCESS',
        message: 'Committed fact_daily_revenue into Star Schema with Zetaris acceleration',
        node_id: 'mart-star',
        duration_ms: 3100,
      },
    ],
  },
  {
    id: 'run_init_103',
    pipeline_id: 'local_pipe_retail',
    run_number: 103,
    status: 'COMPLETED',
    trigger_type: 'AGENT_OPTIMIZATION',
    started_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    completed_at: new Date(Date.now() - 1000 * 60 * 75 + 1000 * 18).toISOString(),
    duration_seconds: 18.0,
    records_processed: 950000,
    nodes_executed: 4,
    total_nodes: 4,
    events: [
      {
        id: 'ev-103-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        phase: 'Ingestion & Partitioning',
        status: 'SUCCESS',
        message: 'Validated source table constraints and indexed date partitions',
        duration_ms: 8400,
      },
      {
        id: 'ev-103-2',
        timestamp: new Date(Date.now() - 1000 * 60 * 75 + 9000).toISOString(),
        phase: 'Transformation',
        status: 'SUCCESS',
        message: 'Applied transformation logic across staging ledger',
        duration_ms: 9600,
      },
    ],
  },
  {
    id: 'run_init_102',
    pipeline_id: 'local_pipe_retail',
    run_number: 102,
    status: 'AWAITING_APPROVAL',
    trigger_type: 'SCHEDULED',
    started_at: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    duration_seconds: 6.5,
    records_processed: 120000,
    nodes_executed: 2,
    total_nodes: 4,
    error_message: 'Guardian Gate held pipeline: detected unmasked credit_card_hash in payload preview.',
    events: [
      {
        id: 'ev-102-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
        phase: 'Guardian Inspection',
        status: 'WARNING',
        message: 'PII pattern detected: 408 credit card numbers flagged for tokenization masking.',
      },
    ],
  },
];

interface HistoryState {
  isHistoryOpen: boolean;
  activeTab: 'revisions' | 'runs' | 'projects';
  revisions: PipelineRevision[];
  runs: PipelineRunHistoryItem[];
  selectedRevision: PipelineRevision | null;
  selectedRun: PipelineRunHistoryItem | null;
  isLoading: boolean;
  isMockSeedData: boolean;
  error: string | null;

  openHistory: (tab?: 'revisions' | 'runs' | 'projects') => void;
  closeHistory: () => void;
  setActiveTab: (tab: 'revisions' | 'runs' | 'projects') => void;
  setSelectedRevision: (rev: PipelineRevision | null) => void;
  setSelectedRun: (run: PipelineRunHistoryItem | null) => void;

  fetchHistory: (pipelineId?: string) => Promise<void>;
  rollbackToRevision: (revisionId: string) => Promise<boolean>;
  recordLocalRevision: (
    title: string,
    description: string,
    authorType: PipelineRevisionAuthor,
    authorName: string,
    operationsSummary: string[],
  ) => void;
  clearMockHistoryForLiveBackend: () => void;
  resetToInitialMock: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      isHistoryOpen: false,
      activeTab: 'revisions',
      revisions: INITIAL_OFFLINE_REVISIONS,
      runs: INITIAL_OFFLINE_RUNS,
      selectedRevision: null,
      selectedRun: null,
      isLoading: false,
      isMockSeedData: true,
      error: null,

      openHistory: (tab) => {
        set({ isHistoryOpen: true, ...(tab ? { activeTab: tab } : {}) });
        const pid = useBackendStore.getState().activePipelineId;
        void get().fetchHistory(pid || undefined);
      },

      closeHistory: () => set({ isHistoryOpen: false }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSelectedRevision: (rev) => set({ selectedRevision: rev }),

      setSelectedRun: (run) => set({ selectedRun: run }),

      fetchHistory: async (pipelineId) => {
        const isOnline = useBackendStore.getState().isOnline;
        const pid = pipelineId || useBackendStore.getState().activePipelineId;

        if (!isOnline || !pid) {
          // Keep local/mock data in offline mode
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const [revisions, runs] = await Promise.all([
            historyApi.listRevisions(pid).catch(() => []),
            historyApi.listRuns(pid).catch(() => []),
          ]);

          set({
            revisions,
            runs,
            isMockSeedData: false,
            isLoading: false,
          });
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Failed to load project history from server.',
          });
        }
      },

      rollbackToRevision: async (revisionId: string) => {
        const isOnline = useBackendStore.getState().isOnline;
        const pid = useBackendStore.getState().activePipelineId;

        if (isOnline && pid) {
          set({ isLoading: true });
          try {
            const res = await historyApi.rollbackRevision(pid, revisionId);
            if (res.success) {
              await useBackendStore.getState().loadPipeline(pid);
              await get().fetchHistory(pid);
              set({ isLoading: false });
              return true;
            }
          } catch (err: any) {
            set({ isLoading: false, error: err.message || 'Rollback failed.' });
            return false;
          }
        }

        // Local / Offline rollback simulation
        const target = get().revisions.find((r) => r.id === revisionId);
        if (!target) return false;

        if (target.snapshot?.nodes && target.snapshot?.edges) {
          usePipelineStore.getState().hydrateGraph(target.snapshot.nodes, target.snapshot.edges);
        }

        if (target.snapshot?.planTitle) {
          useWorkspaceStore.getState().setProjectName(target.snapshot.planTitle);
        }

        // Create a new rollback revision
        const newRevNumber = Math.max(...get().revisions.map((r) => r.revision), 0) + 1;
        const rollbackRev: PipelineRevision = {
          id: `rev_rb_${Date.now()}`,
          revision: newRevNumber,
          pipeline_id: target.pipeline_id,
          title: `Rollback to Revision v${target.revision}: ${target.title}`,
          description: `Restored architectural state from v${target.revision} created on ${new Date(target.created_at).toLocaleDateString()}.`,
          author_type: 'USER',
          author_name: 'Pipeline Architect',
          created_at: new Date().toISOString(),
          node_count: target.node_count,
          edge_count: target.edge_count,
          stage_count: target.stage_count,
          operations_summary: [`Restored topology and plan to revision v${target.revision}`],
          tags: ['rollback', `reverted_to_v${target.revision}`],
          snapshot: target.snapshot,
        };

        set((s) => ({
          revisions: [rollbackRev, ...s.revisions],
          selectedRevision: rollbackRev,
        }));

        return true;
      },

      recordLocalRevision: (title, description, authorType, authorName, operationsSummary) => {
        const pipeState = usePipelineStore.getState();
        const planState = usePlanStore.getState();
        const currentRevs = get().revisions;
        const nextRevNum = (currentRevs.length > 0 ? Math.max(...currentRevs.map((r) => r.revision)) : 0) + 1;

        const newRev: PipelineRevision = {
          id: `rev_local_${Date.now()}`,
          revision: nextRevNum,
          pipeline_id: useBackendStore.getState().activePipelineId || 'local_pipe',
          title,
          description,
          author_type: authorType,
          author_name: authorName,
          created_at: new Date().toISOString(),
          node_count: pipeState.nodes.length,
          edge_count: pipeState.edges.length,
          stage_count: planState.stages.length,
          operations_summary: operationsSummary,
          tags: ['user_edit'],
          snapshot: {
            nodes: pipeState.nodes,
            edges: pipeState.edges,
            planTitle: planState.planTitle,
            stages: planState.stages,
            kpis: planState.kpis,
          },
        };

        set((s) => ({
          revisions: [newRev, ...s.revisions],
          isMockSeedData: false,
        }));
      },

      clearMockHistoryForLiveBackend: () => {
        set({
          revisions: [],
          runs: [],
          selectedRevision: null,
          selectedRun: null,
          isMockSeedData: false,
        });
      },

      resetToInitialMock: () => {
        set({
          revisions: INITIAL_OFFLINE_REVISIONS,
          runs: INITIAL_OFFLINE_RUNS,
          selectedRevision: null,
          selectedRun: null,
          isMockSeedData: true,
        });
      },
    }),
    {
      name: 'aura-bi.project-history.v1',
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        isMockSeedData: s.isMockSeedData,
      }),
    },
  ),
);

