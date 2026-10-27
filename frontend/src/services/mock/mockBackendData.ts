import type {
  AgentQueryResponse,
  BackendAgentTask,
  BackendApproval,
  BackendPipeline,
  BackendQuestion,
  BackendRun,
  PipelineInsightsGenerateResponse,
  PipelineInsightsSnapshotResponse,
  PipelineListItem,
  StartRunResponse,
} from "../../contracts/backendApi";
import type { PipelineGraph } from "../../types/pipeline";
import { createInitialPipeline } from "../../features/workspace/data/initialPipeline";
import {
  AI_PROPOSED_INSIGHTS,
  INITIAL_SUMMARY_CARDS,
} from "../../features/insights/data/mockInsightData";
import { toFrontendGraph } from "../mapping/backendGraphMapper";

export const CANONICAL_PIPELINE_ID = "11111111-1111-4111-8111-111111111111";
export const CANONICAL_RUN_ID = "44444444-4444-4444-8444-444444444444";
export const CANONICAL_EVENT_ID = "66666666-6666-4666-8666-666666666666";

/**
 * Exact canonical pipeline response from docs/integration/FRONTEND_MOCK_API_ALIGNMENT.md (§1),
 * enriched with column definitions so the canvas & inspector display full schema details.
 */
export const MOCK_CANONICAL_PIPELINE: BackendPipeline = {
  id: CANONICAL_PIPELINE_ID,
  name: "Customer Revenue Pipeline",
  status: "ACTIVE",
  architecture_design: {
    overview: "Revenue flow from source to warehouse",
    domain: "sales",
  },
  updated_at: "2026-10-27T10:00:00Z",
  nodes: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "SOURCE",
      subtype: "csv",
      label: "Orders CSV",
      position: { x: 80, y: 160 },
      data: {
        table: "orders",
        source: "s3://demo/orders.csv",
        format: "csv",
        description:
          "Raw S3 orders extract containing customer transactions, gross amounts, and settlement timestamps.",
        columns: [
          {
            name: "order_id",
            type: "BIGINT",
            isPrimaryKey: true,
            isForeignKey: false,
          },
          {
            name: "customer_id",
            type: "VARCHAR(64)",
            isPrimaryKey: false,
            isForeignKey: true,
            fkRefTable: "dim_customer_360",
            fkRefColumn: "customer_key",
          },
          {
            name: "gross_amount",
            type: "DECIMAL(14,2)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "discount_amount",
            type: "DECIMAL(10,2)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "refund_amount",
            type: "DECIMAL(10,2)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "order_date",
            type: "TIMESTAMP",
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
      status: "VALID",
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      type: "TRANSFORM",
      subtype: "sql_query",
      label: "Clean Revenue",
      position: { x: 460, y: 160 },
      data: {
        sql: "SELECT * FROM raw_orders WHERE amount > 0",
        language: "sql",
        engine: "sql",
        description:
          "Filters invalid/negative order rows, resolves customer keys, and computes net recognized amount.",
        code: `SELECT
  order_id,
  customer_id AS customer_key,
  gross_amount,
  discount_amount,
  refund_amount,
  (gross_amount - COALESCE(discount_amount, 0) - COALESCE(refund_amount, 0)) AS net_amount,
  order_date
FROM raw_orders
WHERE gross_amount > 0;`,
        inputColumns: [
          "order_id",
          "customer_id",
          "gross_amount",
          "discount_amount",
          "refund_amount",
          "order_date",
        ],
        outputColumns: [
          "order_id",
          "customer_key",
          "gross_amount",
          "net_amount",
          "order_date",
        ],
      },
      status: "PENDING",
    },
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      type: "SINK",
      subtype: "postgres_sink",
      label: "Revenue Warehouse",
      position: { x: 840, y: 160 },
      data: {
        table: "fact_revenue",
        category: "datamart",
        containerKind: "warehouse",
        description:
          "Curated PostgreSQL analytical revenue warehouse storing reconciled Q3 net revenue facts ($1.15M).",
        expanded: false,
        columns: [
          {
            name: "revenue_key",
            type: "BIGINT",
            isPrimaryKey: true,
            isForeignKey: false,
          },
          {
            name: "customer_key",
            type: "VARCHAR(64)",
            isPrimaryKey: false,
            isForeignKey: true,
            fkRefTable: "dim_customer_360",
            fkRefColumn: "customer_key",
          },
          {
            name: "amount",
            type: "DECIMAL(14,2)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "settled_at",
            type: "TIMESTAMP",
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
        children: {
          nodes: [
            {
              id: "fact_revenue",
              type: "resource",
              position: { x: 320, y: 120 },
              data: {
                category: "resource",
                kind: "warehouse",
                label: "fact_revenue",
                description:
                  "Certified Q3 revenue fact table ($1.15M net recognized revenue).",
                warehouseRole: "fact",
                columns: [
                  {
                    name: "revenue_key",
                    type: "BIGINT",
                    isPrimaryKey: true,
                    isForeignKey: false,
                  },
                  {
                    name: "customer_key",
                    type: "VARCHAR(64)",
                    isPrimaryKey: false,
                    isForeignKey: true,
                    fkRefTable: "dim_customer_360",
                    fkRefColumn: "customer_key",
                  },
                  {
                    name: "amount",
                    type: "DECIMAL(14,2)",
                    isPrimaryKey: false,
                    isForeignKey: false,
                  },
                  {
                    name: "settled_at",
                    type: "TIMESTAMP",
                    isPrimaryKey: false,
                    isForeignKey: false,
                  },
                ],
              },
            },
            {
              id: "dim_customer_360",
              type: "resource",
              position: { x: 40, y: 120 },
              data: {
                category: "resource",
                kind: "warehouse",
                label: "dim_customer_360",
                description: "Conformed SCD Type-2 customer dimension.",
                warehouseRole: "dimension",
                columns: [
                  {
                    name: "customer_key",
                    type: "VARCHAR(64)",
                    isPrimaryKey: true,
                    isForeignKey: false,
                  },
                  {
                    name: "customer_name",
                    type: "VARCHAR(150)",
                    isPrimaryKey: false,
                    isForeignKey: false,
                  },
                  {
                    name: "segment",
                    type: "VARCHAR(50)",
                    isPrimaryKey: false,
                    isForeignKey: false,
                  },
                ],
              },
            },
          ],
          edges: [
            {
              id: "e_rev_cust",
              source: "fact_revenue",
              target: "dim_customer_360",
              data: {
                relationship: "foreign_key",
                fromColumn: "customer_key",
                toColumn: "customer_key",
              },
            },
          ],
        },
      },
      status: "IDLE",
    },
  ],
  edges: [
    {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      source: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      target: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      from_column: "customer_id",
      to_column: "customer_key",
      source_handle: "right-center",
      target_handle: "left-center",
      relationship: "foreign_key",
      metadata: {
        fkRefTable: "dim_customer_360",
      },
    },
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      source: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      target: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      from_column: "net_amount",
      to_column: "amount",
      source_handle: "right-center",
      target_handle: "left-center",
      relationship: "transform",
      metadata: {
        mappingType: "computed",
      },
    },
  ],
};

/**
 * Fraud & Real-Time Ledger Demo Pipeline for Project Switcher
 */
const FRAUD_DEMO_GRAPH: PipelineGraph = {
  nodes: [
    {
      id: "src_kafka_payments",
      type: "resource",
      position: { x: 60, y: 120 },
      data: {
        category: "resource",
        kind: "source",
        label: "src_stripe_live_stream",
        description:
          "Sub-second Stripe payment authorization & card fingerprint stream.",
        warehouseRole: "source",
        format: "stripe",
        columns: [
          {
            name: "auth_id",
            type: "VARCHAR(64)",
            isPrimaryKey: true,
            isForeignKey: false,
          },
          {
            name: "card_fingerprint",
            type: "VARCHAR(128)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "amount_usd",
            type: "DECIMAL(12,2)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
          {
            name: "ip_country",
            type: "VARCHAR(3)",
            isPrimaryKey: false,
            isForeignKey: false,
          },
        ],
      },
    },
    {
      id: "proc_fraud_scorer",
      type: "processing",
      position: { x: 440, y: 120 },
      data: {
        category: "processing",
        language: "python",
        engine: "spark",
        label: "velocity_risk_scorer",
        description:
          "Scores card velocity anomalies and tokenizes PII card fingerprints before warehouse landing.",
        code: `def score_transactions(df):
    df["risk_score"] = (df["tx_count_5m"] * 18.5).clip(0, 100)
    df["is_flagged"] = df["risk_score"] >= 75.0
    return df`,
        inputColumns: [
          "auth_id",
          "card_fingerprint",
          "amount_usd",
          "ip_country",
        ],
        outputColumns: [
          "auth_id",
          "tokenized_card",
          "amount_usd",
          "risk_score",
          "is_flagged",
        ],
      },
    },
    {
      id: "mart_fraud_ledger",
      type: "datamart",
      position: { x: 840, y: 120 },
      data: {
        category: "datamart",
        containerKind: "warehouse",
        label: "Risk & Compliance Vault",
        description:
          "Guardian-protected financial risk mart with tokenized PII and dispute reserve tracking.",
        expanded: false,
        children: { nodes: [], edges: [] },
      },
    },
  ],
  edges: [
    {
      id: "e_fraud_1",
      source: "src_kafka_payments",
      target: "proc_fraud_scorer",
      sourceHandle: "right-center",
      targetHandle: "left-center",
      data: {
        relationship: "data_flow",
        fromColumn: "auth_id",
        toColumn: "auth_id",
      },
    },
    {
      id: "e_fraud_2",
      source: "proc_fraud_scorer",
      target: "mart_fraud_ledger",
      sourceHandle: "right-center",
      targetHandle: "left-center",
      data: {
        relationship: "transform",
        fromColumn: "risk_score",
        toColumn: "risk_score",
      },
    },
  ],
};

export const MOCK_PIPELINES_LIST: PipelineListItem[] = [
  {
    id: CANONICAL_PIPELINE_ID,
    name: "Retail Lakehouse Master Pipeline",
    status: "ACTIVE",
    updated_at: "2026-10-27T10:00:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Customer Revenue Pipeline",
    status: "ACTIVE",
    updated_at: "2026-10-27T09:45:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Real-Time Fraud & Ledger Pipeline",
    status: "ACTIVE",
    updated_at: "2026-10-26T16:20:00Z",
  },
];

export function getDemoGraphForPipeline(
  pipelineId: string,
  name?: string,
): PipelineGraph {
  if (
    pipelineId === "22222222-2222-4222-8222-222222222222" ||
    name?.toLowerCase().includes("customer revenue pipeline")
  ) {
    return toFrontendGraph(MOCK_CANONICAL_PIPELINE);
  }
  if (
    pipelineId === "33333333-3333-4333-8333-333333333333" ||
    name?.toLowerCase().includes("fraud")
  ) {
    return structuredClone(FRAUD_DEMO_GRAPH);
  }
  return createInitialPipeline();
}

/**
 * Exact POST /pipelines/{pipeline_id}/runs response from FRONTEND_MOCK_API_ALIGNMENT.md (§2)
 */
export const MOCK_CANONICAL_START_RUN_RESPONSE: StartRunResponse = {
  run: {
    id: CANONICAL_RUN_ID,
    pipeline_id: CANONICAL_PIPELINE_ID,
    status: "RUNNING",
    run_number: 105,
    duration_seconds: 1.2,
    records_processed: 12000,
    nodes_executed: 1,
    total_nodes: 6,
    current_node_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    context: {
      node_order: [
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ],
      completed_nodes: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      open_questions: [],
    },
    error_message: null,
    started_at: "2026-10-27T10:05:00Z",
    completed_at: null,
    created_at: "2026-10-27T10:05:00Z",
    events: [
      {
        id: CANONICAL_EVENT_ID,
        run_id: CANONICAL_RUN_ID,
        pipeline_id: CANONICAL_PIPELINE_ID,
        event_type: "RUN_STARTED",
        message_md:
          "Exécution démarrée — Chargement des sources et validation du graphe",
        payload: {
          nodes_count: 6,
        },
        created_at: "2026-10-27T10:05:00Z",
        phase: "execution",
        status: "SUCCESS",
        duration_ms: 250,
      },
    ],
    pending_approvals: [],
    pending_questions: [],
  },
  message:
    "Exécution démarrée. Approuvez les demandes Guardian puis appelez POST .../resume.",
};

export const MOCK_INITIAL_AGENT_TASKS: BackendAgentTask[] = [
  {
    id: "task-profiler-01",
    node_id: "src_postgres_web_orders",
    agent_role: "PROFILER",
    instruction:
      "Profile primary key uniqueness and timestamp nullability across 14,850 orders in src_postgres_web_orders",
    status: "COMPLETED",
    created_at: "2026-10-27T10:01:00Z",
    completed_at: "2026-10-27T10:01:04Z",
  },
  {
    id: "task-engineer-02",
    node_id: "proc_clean_stripe",
    agent_role: "ENGINEER",
    instruction:
      "Compile SHA-256 idempotency deduplication (350 duplicate retries) and gross-to-net SQL transformation into fact_daily_revenue",
    status: "COMPLETED",
    created_at: "2026-10-27T10:02:00Z",
    completed_at: "2026-10-27T10:02:08Z",
  },
  {
    id: "task-guardian-03",
    node_id: "db_crm",
    agent_role: "GUARDIAN",
    instruction:
      "Enforce column-level PII masking on customer email and payment fingerprint attributes (4,250 CRM profiles)",
    status: "COMPLETED",
    created_at: "2026-10-27T10:03:00Z",
    completed_at: "2026-10-27T10:03:03Z",
  },
  {
    id: "task-auditor-04",
    node_id: "dw_core",
    agent_role: "AUDITOR",
    instruction:
      "Verify zero-variance ledger reconciliation ($1,340,000.00 GMV → $1,150,000.00 Net Revenue across 14,850 orders)",
    status: "COMPLETED",
    created_at: "2026-10-27T10:04:00Z",
    completed_at: "2026-10-27T10:04:05Z",
  },
];

export const MOCK_GUARDIAN_APPROVAL: BackendApproval = {
  id: "app-guardian-pii-01",
  status: "PENDING",
  operation_type: "PII Column Tokenization & Mart Promotion",
  risk_level: "MEDIUM_RISK",
  masked_preview: {
    table: "dim_customer_360",
    columns_masked: ["email", "card_fingerprint"],
    rows_affected: 4242,
    impact_summary:
      "Guardian detected 4,242 customer email addresses and 8 incomplete postal codes before promoting fact_daily_revenue ($1.15M net). Approve to apply SHA-256 PII masking and route 8 rows to DLQ.",
  },
  pii_findings: ["email (RFC-5322)", "stripe_card_hash (SHA-256)"],
  created_at: "2026-10-27T10:05:02Z",
};

export const MOCK_GUARDIAN_QUESTION: BackendQuestion = {
  id: "uuid-question-guardian-01",
  run_id: CANONICAL_RUN_ID,
  status: "PENDING",
  agent_role: "GUARDIAN",
  phase: "execution",
  question_text:
    "Guardian detected 8 international customer profiles with incomplete postal codes in dim_customer_360. How should the run proceed?",
  choices: [
    "Route 8 incomplete rows to Dead-Letter Queue (DLQ) & Commit Mart (Recommended)",
    "Coalesce postal codes to ISO country default",
    "Halt pipeline execution",
  ],
  context_snapshot: {
    context:
      "Stage 03 Customer 360 SCD-2 Sync · 4,242 of 4,250 profiles clean (99.81%)",
  },
  created_at: "2026-10-27T10:05:03Z",
};

/**
 * Exact POST /pipelines/{pipeline_id}/insights/generate response from FRONTEND_MOCK_API_ALIGNMENT.md (§3)
 */
export const MOCK_INSIGHTS_GENERATE_RESPONSE: PipelineInsightsGenerateResponse =
  {
    reply:
      "I queried the pipeline profile and generated the dashboard summary.",
    summaryCards: [
      {
        id: "sum_rev_q3",
        label: "Net revenue (Q3)",
        value: "$1.15M",
        delta: "+9.1%",
        trend: "up",
        sourceTable: "fact_daily_revenue",
      },
      {
        id: "sum_gmv_q3",
        label: "Gross sales (GMV)",
        value: "$1.34M",
        delta: "+11.2%",
        trend: "up",
        sourceTable: "v_bi_executive_sales",
      },
      {
        id: "sum_ret_q3",
        label: "Repeat B2B retention",
        value: "118.2%",
        delta: "+4.5%",
        trend: "up",
        sourceTable: "v_customer_retention_cohorts",
      },
      {
        id: "sum_aud_q3",
        label: "Audit integrity",
        value: "100% Reconciled",
        delta: "14,850 Orders",
        trend: "neutral",
        sourceTable: "audit_kpi_reconciliation_ledger",
      },
    ],
    insights: AI_PROPOSED_INSIGHTS,
    uiop: {
      protocol: "uiop",
      version: "1.0",
      messageId: `msg_ins_gen_${CANONICAL_PIPELINE_ID}`,
      workspaceId: CANONICAL_PIPELINE_ID,
      baseRevision: 1,
      source: {
        agentId: "insights-agent",
        executionId: "exec_insights",
      },
      operations: [
        {
          op: "insight.set_summary",
          params: {
            cards: INITIAL_SUMMARY_CARDS,
          },
        },
      ],
    },
  };

/**
 * Exact GET /pipelines/{pipeline_id}/insights response from FRONTEND_MOCK_API_ALIGNMENT.md (§3)
 */
export const MOCK_INSIGHTS_SNAPSHOT_RESPONSE: PipelineInsightsSnapshotResponse =
  {
    summaryCards: INITIAL_SUMMARY_CARDS,
    insights: AI_PROPOSED_INSIGHTS,
    prompt: "Pipeline overview",
    domains: ["sales", "customers", "operations", "anomalies"],
  };

/**
 * Synthesizes a realistic Nightshift AgentQueryResponse for interactive queries on the Insights page
 * when the backend is unavailable.
 */
export function synthesizeMockNightshiftQuery(
  question: string,
  requestId: string,
): AgentQueryResponse {
  const lower = question.toLowerCase();

  if (
    lower.includes("pie") ||
    lower.includes("share") ||
    lower.includes("payment") ||
    lower.includes("method")
  ) {
    return {
      response:
        "Stripe Credit Card accounts for **64.2% ($738.3K)** of our **$1.15M** net settled volume across 14,850 orders, followed by ACH / SEPA Direct Debit at **21.8% ($250.7K)** and Apple Pay at **9.5% ($109.3K)**.",
      request_id: requestId,
      status: "completed",
      sql: "SELECT method_name, SUM(net_revenue) AS net_volume, ROUND(SUM(net_revenue)*100.0/SUM(SUM(net_revenue)) OVER(), 1) AS share_pct FROM fact_daily_revenue JOIN dim_payment_method USING (payment_method_sk) GROUP BY 1;",
      sources: ["fact_daily_revenue", "dim_payment_method"],
      views_used: ["v_bi_executive_sales"],
      model: "nemotron-70b-instruct",
      model_route: "zetaris-federated-sql",
      latency_ms: 420,
      provider: "nightshift",
      intent: "informational",
      risk_level: "low",
      approval_required: false,
      calculations: [
        {
          method_name: "Stripe Credit Card",
          net_volume: 738300,
          share_pct: 64.2,
          formatted: "$738.3K",
        },
        {
          method_name: "ACH / SEPA Debit",
          net_volume: 250700,
          share_pct: 21.8,
          formatted: "$250.7K",
        },
        {
          method_name: "Apple Pay / Wallet",
          net_volume: 109250,
          share_pct: 9.5,
          formatted: "$109.3K",
        },
        {
          method_name: "Wholesale Invoice",
          net_volume: 51750,
          share_pct: 4.5,
          formatted: "$51.8K",
        },
      ],
      evidence: [],
      warnings: [
        "Moving 20% of B2B wholesale card orders to ACH Direct Debit saves ~$5.8K/year in gateway fees.",
      ],
      chart: {
        type: "pie",
        data: [
          {
            label: "Stripe Credit Card",
            value: 738300,
            sharePct: 64.2,
            formatted: "$738.3K",
          },
          {
            label: "ACH / SEPA Debit",
            value: 250700,
            sharePct: 21.8,
            formatted: "$250.7K",
          },
          {
            label: "Apple Pay / Wallet",
            value: 109250,
            sharePct: 9.5,
            formatted: "$109.3K",
          },
          {
            label: "Wholesale Invoice",
            value: 51750,
            sharePct: 4.5,
            formatted: "$51.8K",
          },
        ],
      },
    };
  }

  if (
    lower.includes("trend") ||
    lower.includes("line") ||
    lower.includes("month") ||
    lower.includes("growth")
  ) {
    return {
      response:
        "Recognized monthly net revenue grew steadily across Q3 from **$345K in July** (4,460 orders) to **$382K in August** (4,930 orders) and **$423K in September** (5,460 orders), totaling **$1.15M** (+9.1% QoQ).",
      request_id: requestId,
      status: "completed",
      sql: "SELECT d.month_name, SUM(f.net_revenue) AS net_revenue, COUNT(f.revenue_key) AS orders FROM fact_daily_revenue f JOIN dim_date d ON f.date_key = d.date_key GROUP BY 1 ORDER BY MIN(d.date_key);",
      sources: ["fact_daily_revenue", "dim_date"],
      views_used: ["v_bi_executive_sales"],
      model: "nemotron-70b-instruct",
      model_route: "zetaris-federated-sql",
      latency_ms: 385,
      provider: "nightshift",
      intent: "predictive",
      risk_level: "low",
      approval_required: false,
      calculations: [
        { month: "May", net_revenue: 298000, formatted: "$298K" },
        { month: "Jun", net_revenue: 324000, formatted: "$324K" },
        { month: "Jul", net_revenue: 345000, formatted: "$345K" },
        { month: "Aug", net_revenue: 382000, formatted: "$382K" },
        { month: "Sep", net_revenue: 423000, formatted: "$423K" },
      ],
      evidence: [],
      warnings: [
        "Q3 monthly trajectory ($345K → $382K → $423K = $1.15M) projects a $465K monthly run-rate entering Q4.",
      ],
      chart: {
        type: "line",
        data: [
          { x: "May", y: 298000, formatted: "$298K" },
          { x: "Jun", y: 324000, formatted: "$324K" },
          { x: "Jul", y: 345000, formatted: "$345K" },
          { x: "Aug", y: 382000, formatted: "$382K" },
          { x: "Sep", y: 423000, formatted: "$423K" },
        ],
      },
    };
  }

  if (
    lower.includes("waterfall") ||
    lower.includes("bridge") ||
    lower.includes("revenu") ||
    lower.includes("flux")
  ) {
    return {
      response:
        "Net recognized revenue reached **$1,150,000 (+9.1% QoQ)** across **14,850 orders ($77.44 Net AOV)** from **$1.34M Gross GMV**, with promotional discounts (-$92K), gateway fees (-$50K), and settled refunds (-$48K) within guardrails.",
      request_id: requestId,
      status: "completed",
      sql: "SELECT SUM(gross_amount) AS gmv, SUM(discount_amount) AS discounts, SUM(gateway_fee) AS fees, SUM(refund_amount) AS refunds, SUM(net_revenue) AS net_revenue FROM fact_daily_revenue;",
      sources: [
        "src_postgres_web_orders",
        "src_stripe_events",
        "fact_daily_revenue",
      ],
      views_used: ["v_bi_executive_sales"],
      model: "nemotron-70b-instruct",
      model_route: "zetaris-federated-sql",
      latency_ms: 460,
      provider: "nightshift",
      intent: "informational",
      risk_level: "low",
      approval_required: false,
      calculations: [
        { stage: "Gross GMV", amount: 1340000, formatted: "$1.34M" },
        {
          stage: "Promotional Discounts",
          amount: -92000,
          formatted: "-$92.0K",
        },
        { stage: "Gateway Fees", amount: -50000, formatted: "-$50.0K" },
        { stage: "Refunds", amount: -48000, formatted: "-$48.0K" },
        {
          stage: "Net Recognized Revenue",
          amount: 1150000,
          formatted: "$1.15M",
        },
      ],
      evidence: [],
      warnings: [
        "Zero dollar variance verified between Stripe settlement webhooks and fact_daily_revenue ($1,150,000.00).",
      ],
      chart: {
        type: "waterfall-decomposition",
        data: [
          {
            id: "w1",
            label: "Gross GMV",
            amount: 1340000,
            formatted: "$1.34M",
            type: "base",
            note: "14,850 completed orders ($90.24 Gross AOV)",
          },
          {
            id: "w2",
            label: "Promo Discounts",
            amount: -92000,
            formatted: "-$92.0K",
            type: "deduction",
            note: "Summer & wholesale coupon codes",
            driftPct: "-6.9%",
          },
          {
            id: "w3",
            label: "Gateway Fees",
            amount: -50000,
            formatted: "-$50.0K",
            type: "deduction",
            note: "Stripe 2.9% + $0.30 processing fees",
            driftPct: "-3.7%",
          },
          {
            id: "w4",
            label: "Customer Refunds",
            amount: -48000,
            formatted: "-$48.0K",
            type: "deduction",
            note: "520 refunded orders (3.5%)",
            driftPct: "-3.6%",
          },
          {
            id: "w5",
            label: "Net Revenue",
            amount: 1150000,
            formatted: "$1.15M",
            type: "total",
            note: "Certified fact_daily_revenue ($77.44 Net AOV)",
          },
        ],
      },
    };
  }

  // Default: Categorical Bar Breakdown by Customer Segment totaling $1.15M
  return {
    response:
      "Repeat Subscription Members generated **$518K (45.0%)** of our **$1.15M** net revenue across 4,242 active customers, followed by Wholesale B2B Partners (**$391K, 34.0%**) and First-Time Web Buyers (**$241K, 21.0%**).",
    request_id: requestId,
    status: "completed",
    sql: "SELECT c.tier AS customer_segment, SUM(f.net_revenue) AS net_revenue, COUNT(f.revenue_key) AS orders FROM fact_daily_revenue f JOIN dim_customer_360 c ON f.customer_key = c.customer_key WHERE c.is_current = TRUE GROUP BY 1 ORDER BY 2 DESC;",
    sources: ["fact_daily_revenue", "dim_customer_360"],
    views_used: ["v_bi_executive_sales", "v_customer_retention_cohorts"],
    model: "nemotron-70b-instruct",
    model_route: "zetaris-federated-sql",
    latency_ms: 390,
    provider: "nightshift",
    intent: "informational",
    risk_level: "low",
    approval_required: false,
    calculations: [
      { category: "Subscription Members", value: 518000, formatted: "$518.0K" },
      {
        category: "Wholesale B2B Partners",
        value: 391000,
        formatted: "$391.0K",
      },
      {
        category: "First-Time Web Buyers",
        value: 241000,
        formatted: "$241.0K",
      },
    ],
    evidence: [],
    warnings: [
      "Wholesale B2B Partners show 118.2% net dollar retention with zero churn in Q3.",
    ],
    chart: {
      type: "bar",
      data: [
        {
          category: "Subscription Members",
          value: 518000,
          formatted: "$518.0K",
        },
        {
          category: "Wholesale B2B Partners",
          value: 391000,
          formatted: "$391.0K",
        },
        {
          category: "First-Time Web Buyers",
          value: 241000,
          formatted: "$241.0K",
        },
      ],
    },
  };
}

/**
 * Builds progressive BackendRun snapshots for a realistic live demo execution
 * matching FRONTEND_MOCK_API_ALIGNMENT.md (§2 & §4).
 */
export function buildSimulatedRunStep(
  step: "started" | "ingesting" | "guardian_pause" | "completed",
  pipelineId: string = CANONICAL_PIPELINE_ID,
  runNumber = 105,
): BackendRun {
  const nowIso = new Date().toISOString();

  const baseEvents = [
    {
      id: CANONICAL_EVENT_ID,
      run_id: CANONICAL_RUN_ID,
      pipeline_id: pipelineId,
      event_type: "RUN_STARTED",
      timestamp: nowIso,
      message:
        "Run started — Validated DAG topology and connected Zetaris SQL gateway",
      message_md:
        "Run started — Validated DAG topology and connected Zetaris SQL gateway",
      payload: { nodes_count: 8, node_id: "src_postgres_web_orders" },
      created_at: nowIso,
      phase: "Initialization",
      status: "SUCCESS",
      duration_ms: 250,
    },
  ];

  if (step === "started") {
    return {
      id: CANONICAL_RUN_ID,
      pipeline_id: pipelineId,
      status: "RUNNING",
      run_number: runNumber,
      duration_seconds: 1.4,
      records_processed: 4850,
      nodes_executed: 3,
      total_nodes: 9,
      current_node_id: "proc_stg_orders",
      context: {
        trigger_type: "MANUAL",
        node_order: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
          "proc_stg_orders",
          "proc_clean_stripe",
          "proc_py_features",
          "proc_fct_sales",
          "proc_audit_gate",
          "dw_core",
          "mart_sales_analytics",
        ],
        completed_nodes: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
        ],
        open_questions: [],
      },
      error_message: null,
      started_at: nowIso,
      completed_at: null,
      created_at: nowIso,
      events: [
        ...baseEvents,
        {
          id: "ev_sim_2",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "SOURCE_INGESTED",
          timestamp: nowIso,
          message:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          message_md:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          payload: { node_id: "src_stripe_events", rows: 14850 },
          created_at: nowIso,
          phase: "Bronze Ingestion",
          status: "SUCCESS",
          duration_ms: 1150,
        },
      ],
      pending_approvals: [],
      pending_questions: [],
    };
  }

  if (step === "ingesting") {
    return {
      id: CANONICAL_RUN_ID,
      pipeline_id: pipelineId,
      status: "RUNNING",
      run_number: runNumber,
      duration_seconds: 3.2,
      records_processed: 9800,
      nodes_executed: 5,
      total_nodes: 9,
      current_node_id: "proc_clean_stripe",
      context: {
        trigger_type: "MANUAL",
        node_order: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
          "proc_stg_orders",
          "proc_clean_stripe",
          "proc_py_features",
          "proc_fct_sales",
          "proc_audit_gate",
          "dw_core",
          "mart_sales_analytics",
        ],
        completed_nodes: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
          "proc_stg_orders",
        ],
        open_questions: [],
      },
      error_message: null,
      started_at: nowIso,
      completed_at: null,
      created_at: nowIso,
      events: [
        ...baseEvents,
        {
          id: "ev_sim_2",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "SOURCE_INGESTED",
          timestamp: nowIso,
          message:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          message_md:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          payload: { node_id: "src_stripe_events", rows: 14850 },
          created_at: nowIso,
          phase: "Bronze Ingestion",
          status: "SUCCESS",
          duration_ms: 1150,
        },
        {
          id: "ev_sim_3",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "TRANSFORM_EXECUTED",
          timestamp: nowIso,
          message:
            "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
          message_md:
            "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
          payload: { node_id: "proc_clean_stripe", deduplicated: 350 },
          created_at: nowIso,
          phase: "Silver Cleansing",
          status: "SUCCESS",
          duration_ms: 1620,
        },
      ],
      pending_approvals: [],
      pending_questions: [],
    };
  }

  if (step === "guardian_pause") {
    return {
      id: CANONICAL_RUN_ID,
      pipeline_id: pipelineId,
      status: "AWAITING_APPROVAL",
      run_number: runNumber,
      duration_seconds: 4.8,
      records_processed: 14092,
      nodes_executed: 6,
      total_nodes: 9,
      current_node_id: "proc_py_features",
      context: {
        trigger_type: "MANUAL",
        node_order: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
          "proc_stg_orders",
          "proc_clean_stripe",
          "proc_py_features",
          "proc_fct_sales",
          "proc_audit_gate",
          "dw_core",
          "mart_sales_analytics",
        ],
        completed_nodes: [
          "src_postgres_web_orders",
          "src_stripe_events",
          "db_crm",
          "proc_stg_orders",
          "proc_clean_stripe",
        ],
        open_questions: ["uuid-question-guardian-01"],
      },
      error_message: null,
      started_at: nowIso,
      completed_at: null,
      created_at: nowIso,
      events: [
        ...baseEvents,
        {
          id: "ev_sim_2",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "SOURCE_INGESTED",
          timestamp: nowIso,
          message:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          message_md:
            "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
          payload: { node_id: "src_stripe_events", rows: 14850 },
          created_at: nowIso,
          phase: "Bronze Ingestion",
          status: "SUCCESS",
          duration_ms: 1150,
        },
        {
          id: "ev_sim_3",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "TRANSFORM_EXECUTED",
          timestamp: nowIso,
          message:
            "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
          message_md:
            "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
          payload: { node_id: "proc_clean_stripe", deduplicated: 350 },
          created_at: nowIso,
          phase: "Silver Cleansing",
          status: "SUCCESS",
          duration_ms: 1620,
        },
        {
          id: "ev_sim_4",
          run_id: CANONICAL_RUN_ID,
          pipeline_id: pipelineId,
          event_type: "GUARDIAN_APPROVAL_REQUIRED",
          timestamp: nowIso,
          message:
            "Guardian Gate: Verify PII masking on 4,242 CRM profiles & 8 DLQ postal codes before Gold Mart commit",
          message_md:
            "Guardian Gate: Verify PII masking on 4,242 CRM profiles & 8 DLQ postal codes before Gold Mart commit",
          payload: {
            node_id: "proc_py_features",
            approval_id: "app-guardian-pii-01",
          },
          created_at: nowIso,
          phase: "Guardian Governance",
          status: "WARNING",
          duration_ms: 410,
        },
      ],
      pending_approvals: [
        MOCK_GUARDIAN_APPROVAL as unknown as Record<string, unknown>,
      ],
      pending_questions: [
        MOCK_GUARDIAN_QUESTION as unknown as Record<string, unknown>,
      ],
    };
  }

  return {
    id: CANONICAL_RUN_ID,
    pipeline_id: pipelineId,
    status: "COMPLETED",
    run_number: runNumber,
    duration_seconds: 8.4,
    records_processed: 14850,
    nodes_executed: 9,
    total_nodes: 9,
    current_node_id: null,
    context: {
      trigger_type: "MANUAL",
      records_processed: 14850,
      nodes_executed: 9,
      total_nodes: 9,
      node_order: [
        "src_postgres_web_orders",
        "src_stripe_events",
        "db_crm",
        "proc_stg_orders",
        "proc_clean_stripe",
        "proc_py_features",
        "proc_fct_sales",
        "proc_audit_gate",
        "dw_core",
        "mart_sales_analytics",
      ],
      completed_nodes: [
        "src_postgres_web_orders",
        "src_stripe_events",
        "db_crm",
        "proc_stg_orders",
        "proc_clean_stripe",
        "proc_py_features",
        "proc_fct_sales",
        "proc_audit_gate",
        "dw_core",
        "mart_sales_analytics",
      ],
      open_questions: [],
    },
    error_message: null,
    started_at: nowIso,
    completed_at: new Date(Date.now() + 8400).toISOString(),
    created_at: nowIso,
    events: [
      ...baseEvents,
      {
        id: "ev_sim_2",
        run_id: CANONICAL_RUN_ID,
        pipeline_id: pipelineId,
        event_type: "SOURCE_INGESTED",
        timestamp: nowIso,
        message:
          "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
        message_md:
          "Ingested 14,850 orders from PostgreSQL ($1.34M GMV) & 15,200 Stripe webhook events",
        payload: { node_id: "src_stripe_events", rows: 14850 },
        created_at: nowIso,
        phase: "Bronze Ingestion",
        status: "SUCCESS",
        duration_ms: 1150,
      },
      {
        id: "ev_sim_3",
        run_id: CANONICAL_RUN_ID,
        pipeline_id: pipelineId,
        event_type: "TRANSFORM_EXECUTED",
        timestamp: nowIso,
        message:
          "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
        message_md:
          "Executed clean_stripe_events.sql: 350 duplicate webhook retries deduplicated via SHA-256",
        payload: { node_id: "proc_clean_stripe", deduplicated: 350 },
        created_at: nowIso,
        phase: "Silver Cleansing",
        status: "SUCCESS",
        duration_ms: 1620,
      },
      {
        id: "ev_sim_4",
        run_id: CANONICAL_RUN_ID,
        pipeline_id: pipelineId,
        event_type: "GUARDIAN_APPROVED",
        timestamp: nowIso,
        message:
          "Guardian Gate Approved: PII tokenization applied to dim_customer_360 (4,242 active profiles, 8 DLQ)",
        message_md:
          "Guardian Gate Approved: PII tokenization applied to dim_customer_360 (4,242 active profiles, 8 DLQ)",
        payload: { node_id: "proc_py_features" },
        created_at: nowIso,
        phase: "Guardian Governance",
        status: "SUCCESS",
        duration_ms: 680,
      },
      {
        id: "ev_sim_5",
        run_id: CANONICAL_RUN_ID,
        pipeline_id: pipelineId,
        event_type: "MART_COMMITTED",
        timestamp: nowIso,
        message:
          "Committed 14,850 reconciled orders to fact_daily_revenue ($1,150,000.00 Net / $1,340,000.00 GMV, 0.00% variance)",
        message_md:
          "Committed 14,850 reconciled orders to fact_daily_revenue ($1,150,000.00 Net / $1,340,000.00 GMV, 0.00% variance)",
        payload: { node_id: "dw_core", rows_committed: 14850 },
        created_at: nowIso,
        phase: "Gold Star Schema & Audit",
        status: "SUCCESS",
        duration_ms: 2100,
      },
    ],
    pending_approvals: [],
    pending_questions: [],
  };
}
