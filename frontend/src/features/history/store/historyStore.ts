import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persistStateStorage } from "../../../store/persistStorage";
import type {
  PipelineRevision,
  PipelineRevisionAuthor,
  PipelineRunHistoryItem,
} from "../../../contracts/projectHistory";
import { historyApi } from "../../../services/api/historyApi";
import { useBackendStore } from "../../../services/session/backendSession";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { usePlanStore } from "../../uiop/store/planStore";
import { useWorkspaceStore } from "../../workspace/store/workspaceStore";

export const INITIAL_OFFLINE_REVISIONS: PipelineRevision[] = [
  {
    id: "rev_initial_4",
    revision: 4,
    pipeline_id: "local_pipe_retail",
    title: "Star Schema Datamart & Independent Audit Seal",
    description:
      "Promoted Kimball Star Schema with fact_daily_revenue ($1,150,000.00 net across 14,850 orders) and conformed dimensions. Independent Audit Agent verified zero-variance tolerance.",
    author_type: "AUDITOR_AGENT",
    author_name: "Independent Audit Agent",
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    node_count: 8,
    edge_count: 8,
    stage_count: 5,
    operations_summary: [
      "Verified zero-variance financial reconciliation on fact_daily_revenue ($1,150,000.00 Net / $1,340,000.00 GMV)",
      "Validated 100% row conservation across 14,850 customer orders and 4,250 CRM profiles",
      "Affixed SHA-256 cryptographic verification seal (AGT-AUDIT-4091)",
      "Configured SCD Type-2 temporal dimension tracking for dim_customer_360",
    ],
    tags: ["audit_passed", "star_schema", "production_ready"],
  },
  {
    id: "rev_initial_3",
    revision: 3,
    pipeline_id: "local_pipe_retail",
    title: "Automated Stripe & PostgreSQL Cleansing Transform",
    description:
      "Implemented SQL cleansing queries to deduplicate 350 Stripe webhook retries via SHA-256, normalize currencies, and stage 14,850 clean orders.",
    author_type: "MASTER_AGENT",
    author_name: "AuraBI Master Builder",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    node_count: 6,
    edge_count: 5,
    stage_count: 4,
    operations_summary: [
      "Added clean_stripe_events SQL processing node with SHA-256 idempotency guard (350 duplicate retries filtered)",
      "Added stg_clean_orders SQL staging node (14,850 valid storefront & B2B orders)",
      "Connected src_stripe_events -> clean_stripe_events -> build_fact_daily_revenue",
      "Connected db_crm -> enrich_customer_scd -> build_fact_daily_revenue",
    ],
    tags: ["transformation", "sql", "silver_layer"],
  },
  {
    id: "rev_initial_2",
    revision: 2,
    pipeline_id: "local_pipe_retail",
    title: "Architectural Blueprint Approved & Ingestion Configured",
    description:
      "User approved 5-stage Lakehouse proposal. Instantiated PostgreSQL storefront order ledger, Stripe webhook receiver, and imported CRM database.",
    author_type: "USER",
    author_name: "Pipeline Architect",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    node_count: 4,
    edge_count: 2,
    stage_count: 5,
    operations_summary: [
      "Approved Retail & Financial Lakehouse Architecture Blueprint",
      "Instantiated src_postgres_web_orders (14,850 Q3 orders)",
      "Instantiated src_stripe_events webhook listener (15,200 payment events)",
      "Imported db_crm PostgreSQL container (crm_accounts, crm_contacts — 4,250 profiles)",
    ],
    tags: ["blueprint_approved", "ingestion", "bronze_layer"],
  },
  {
    id: "rev_initial_1",
    revision: 1,
    pipeline_id: "local_pipe_retail",
    title: "Project Initialized from Natural Language Prompt",
    description:
      "Decomposed prompt into 5 Kimball dimensional stages and synthesized Net Revenue ($1.15M), GMV ($1.34M), and Net AOV ($77.44) KPI contracts.",
    author_type: "PLANNER_AGENT",
    author_name: "Master Architectural Planner",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    node_count: 2,
    edge_count: 0,
    stage_count: 5,
    operations_summary: [
      "Decomposed prompt into 5 Kimball dimensional stages",
      "Synthesized Net Recognized Revenue ($1.15M) and GMV ($1.34M) KPI contracts",
      "Compiled initial ANSI SQL DDL draft",
    ],
    tags: ["initialization", "ai_proposal"],
  },
];

export const INITIAL_OFFLINE_RUNS: PipelineRunHistoryItem[] = [
  {
    id: "run_init_104",
    pipeline_id: "local_pipe_retail",
    run_number: 104,
    status: "COMPLETED",
    trigger_type: "MANUAL",
    started_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    completed_at: new Date(
      Date.now() - 1000 * 60 * 12 + 1000 * 14,
    ).toISOString(),
    duration_seconds: 14.2,
    records_processed: 14850,
    nodes_executed: 8,
    total_nodes: 8,
    events: [
      {
        id: "ev-1",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        phase: "Source Ingestion",
        status: "SUCCESS",
        message:
          "Streamed 14,850 completed storefront & B2B orders from PostgreSQL (src_postgres_web_orders — $1,340,000.00 GMV)",
        node_id: "src_postgres_web_orders",
        duration_ms: 3200,
      },
      {
        id: "ev-2",
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 3500).toISOString(),
        phase: "Stripe Webhooks",
        status: "SUCCESS",
        message:
          "Polled 15,200 payment events from Stripe API ledger (src_stripe_events)",
        node_id: "src_stripe_events",
        duration_ms: 2800,
      },
      {
        id: "ev-3",
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 6500).toISOString(),
        phase: "Data Cleansing",
        status: "SUCCESS",
        message:
          "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated; 14,850 unique settled charges verified",
        node_id: "proc_clean_stripe",
        duration_ms: 4100,
      },
      {
        id: "ev-4",
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 9500).toISOString(),
        phase: "Feature Enrichment",
        status: "SUCCESS",
        message:
          "Joined 4,242 active CRM customer profiles with pandas in enrich_customer_scd (8 incomplete postal codes routed to DLQ)",
        node_id: "proc_py_features",
        duration_ms: 1800,
      },
      {
        id: "ev-5",
        timestamp: new Date(Date.now() - 1000 * 60 * 12 + 11500).toISOString(),
        phase: "Mart Rollup",
        status: "SUCCESS",
        message:
          "Committed 14,850 orders into fact_daily_revenue ($1,150,000.00 net, $77.44 Net AOV) with Zetaris acceleration",
        node_id: "dw_core",
        duration_ms: 2700,
      },
    ],
  },
  {
    id: "run_init_103",
    pipeline_id: "local_pipe_retail",
    run_number: 103,
    status: "COMPLETED",
    trigger_type: "AGENT_OPTIMIZATION",
    started_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    completed_at: new Date(
      Date.now() - 1000 * 60 * 75 + 1000 * 18,
    ).toISOString(),
    duration_seconds: 18.0,
    records_processed: 14120,
    nodes_executed: 7,
    total_nodes: 8,
    events: [
      {
        id: "ev-103-1",
        timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        phase: "Ingestion & Partitioning",
        status: "SUCCESS",
        message:
          "Validated source table constraints and indexed Q3 date partitions (14,120 orders)",
        duration_ms: 8400,
      },
      {
        id: "ev-103-2",
        timestamp: new Date(Date.now() - 1000 * 60 * 75 + 9000).toISOString(),
        phase: "Transformation",
        status: "SUCCESS",
        message:
          "Applied gross-to-net transformation logic across staging ledger",
        duration_ms: 9600,
      },
    ],
  },
  {
    id: "run_init_102",
    pipeline_id: "local_pipe_retail",
    run_number: 102,
    status: "AWAITING_APPROVAL",
    trigger_type: "SCHEDULED",
    started_at: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    duration_seconds: 6.5,
    records_processed: 4250,
    nodes_executed: 2,
    total_nodes: 8,
    error_message:
      "Guardian Gate held pipeline: detected unmasked customer email/card fingerprint in staging preview.",
    events: [
      {
        id: "ev-102-1",
        timestamp: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
        phase: "Guardian Inspection",
        status: "WARNING",
        message:
          "PII pattern detected: 4,250 customer contact records flagged for column masking before BI view publication.",
      },
    ],
  },
];

interface HistoryState {
  isHistoryOpen: boolean;
  activeTab: "revisions" | "runs" | "projects";
  revisions: PipelineRevision[];
  runs: PipelineRunHistoryItem[];
  selectedRevision: PipelineRevision | null;
  selectedRun: PipelineRunHistoryItem | null;
  isLoading: boolean;
  isMockSeedData: boolean;
  error: string | null;

  openHistory: (tab?: "revisions" | "runs" | "projects") => void;
  closeHistory: () => void;
  setActiveTab: (tab: "revisions" | "runs" | "projects") => void;
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
      activeTab: "revisions",
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
            error: err.message || "Failed to load project history from server.",
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
            set({ isLoading: false, error: err.message || "Rollback failed." });
            return false;
          }
        }

        // Local / Offline rollback simulation
        const target = get().revisions.find((r) => r.id === revisionId);
        if (!target) return false;

        if (target.snapshot?.nodes && target.snapshot?.edges) {
          usePipelineStore
            .getState()
            .hydrateGraph(target.snapshot.nodes, target.snapshot.edges);
        }

        if (target.snapshot?.planTitle) {
          useWorkspaceStore
            .getState()
            .setProjectName(target.snapshot.planTitle);
        }

        // Create a new rollback revision
        const newRevNumber =
          Math.max(...get().revisions.map((r) => r.revision), 0) + 1;
        const rollbackRev: PipelineRevision = {
          id: `rev_rb_${Date.now()}`,
          revision: newRevNumber,
          pipeline_id: target.pipeline_id,
          title: `Rollback to Revision v${target.revision}: ${target.title}`,
          description: `Restored architectural state from v${target.revision} created on ${new Date(target.created_at).toLocaleDateString()}.`,
          author_type: "USER",
          author_name: "Pipeline Architect",
          created_at: new Date().toISOString(),
          node_count: target.node_count,
          edge_count: target.edge_count,
          stage_count: target.stage_count,
          operations_summary: [
            `Restored topology and plan to revision v${target.revision}`,
          ],
          tags: ["rollback", `reverted_to_v${target.revision}`],
          snapshot: target.snapshot,
        };

        set((s) => ({
          revisions: [rollbackRev, ...s.revisions],
          selectedRevision: rollbackRev,
        }));

        return true;
      },

      recordLocalRevision: (
        title,
        description,
        authorType,
        authorName,
        operationsSummary,
      ) => {
        const pipeState = usePipelineStore.getState();
        const planState = usePlanStore.getState();
        const currentRevs = get().revisions;
        const nextRevNum =
          (currentRevs.length > 0
            ? Math.max(...currentRevs.map((r) => r.revision))
            : 0) + 1;

        const newRev: PipelineRevision = {
          id: `rev_local_${Date.now()}`,
          revision: nextRevNum,
          pipeline_id:
            useBackendStore.getState().activePipelineId || "local_pipe",
          title,
          description,
          author_type: authorType,
          author_name: authorName,
          created_at: new Date().toISOString(),
          node_count: pipeState.nodes.length,
          edge_count: pipeState.edges.length,
          stage_count: planState.stages.length,
          operations_summary: operationsSummary,
          tags: ["user_edit"],
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
      name: "aura-bi.project-history.v1",
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        isMockSeedData: s.isMockSeedData,
      }),
    },
  ),
);
