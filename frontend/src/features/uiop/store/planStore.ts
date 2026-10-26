import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  KpiDefinition,
  PlanStage,
  QuestionProposeParams,
  ReasoningPhase,
  ReportUpdateParams,
  UiopExecutionReport,
} from "../../../contracts/uiop";
import { persistStateStorage } from "../../../store/persistStorage";

export interface ActiveUiopPanel {
  id: string;
  component: string;
  title: string;
  open: boolean;
  config: Record<string, unknown>;
}

export interface ClarifyingQuestion extends QuestionProposeParams {
  id: string;
}

export const INITIAL_KPIS: KpiDefinition[] = [
  {
    id: "net-recognized-revenue",
    name: "Net Recognized Revenue",
    category: "Finance",
    formula: "SUM(gross_amount - tax_amount - refund_amount)",
    sourceSystem: "Stripe Webhooks + Postgres Orders",
    targetMart: "fact_daily_revenue",
    sourceLedgerValue: "Ledger Baseline",
    martOutputValue: "Mart Aggregate",
    variance: "Target: 0.00%",
    tolerance: "±0.00%",
    description:
      "Calculates realized net revenue after subtracting refunds, disputes, and localized sales tax.",
    dataRationale:
      "The AI detected raw order transactions in src_postgres_web_orders and payment charge/refund logs in src_stripe_charges. Raw gross sales alone overstate cash flow by ~4.2% due to unrecorded refunds and merchant disputes, requiring unified ledger reconciliation.",
    businessImpact:
      "Critical for GAAP/IFRS revenue recognition, cash runway forecasting, and board reporting. Gives finance leadership immediate visibility into true settled net income.",
  },
  {
    id: "gross-merchandise-volume",
    name: "Gross Merchandise Volume (GMV)",
    category: "Finance",
    formula: "SUM(gross_volume)",
    sourceSystem: "PostgreSQL Web Orders",
    targetMart: "v_bi_executive_sales",
    sourceLedgerValue: "Order Total",
    martOutputValue: "GMV View",
    variance: "Target: 0.00%",
    tolerance: "±0.00%",
    description:
      "Total monetary value of merchandise ordered across digital storefronts prior to deductions.",
    dataRationale:
      "Discovered line-item order catalogs in PostgreSQL with order timestamps and item quantities. The AI selected GMV as the fundamental top-of-funnel commercial velocity indicator.",
    businessImpact:
      "Core benchmark for digital storefront expansion, commercial demand momentum, and market share tracking across sales quarters.",
  },
  {
    id: "idempotent-charge-parity",
    name: "Payment Idempotency & Duplicate Guard",
    category: "Integrity",
    formula: "COUNT(DISTINCT charge_id) - COUNT(charge_id)",
    sourceSystem: "Stripe Webhook Event Stream",
    targetMart: "transform_orders_clean",
    sourceLedgerValue: "Unique Charges",
    martOutputValue: "Cleaned Orders",
    variance: "Target: 0 Dupes",
    tolerance: "Strict 0",
    description:
      "Guarantees that network-retried payment webhooks do not generate duplicate transaction records.",
    dataRationale:
      "Stripe webhooks frequently resend charge payloads under network timeouts or retries. The AI identified potential duplicate events that would artificially distort sales numbers if not guarded with SHA-256 event fingerprinting.",
    businessImpact:
      "Protects operational integrity and prevents double-billing reports, customer confusion, and false revenue surges.",
  },
  {
    id: "active-customer-360",
    name: "Active Customer 360 Cohorts",
    category: "Customer",
    formula: "COUNT(DISTINCT customer_id) WHERE is_current = TRUE",
    sourceSystem: "PostgreSQL Customer Profiles",
    targetMart: "dim_customer_360",
    sourceLedgerValue: "Raw Profiles",
    martOutputValue: "Current Dim Record",
    variance: "Target: 0 Orphans",
    tolerance: "0 Orphans",
    description:
      "Maintains point-in-time dimensional customer histories across loyalty tiers and address changes.",
    dataRationale:
      "Identified mutable customer profiles in raw_customers. The AI synthesized an SCD Type-2 dimension model to preserve historical purchase behavior across tier upgrades and geographic migrations.",
    businessImpact:
      "Powers customer lifetime value (LTV) models, retention curves, and executive churn analysis without losing historical attribution.",
  },
  {
    id: "net-aov",
    name: "Net Average Order Value (AOV)",
    category: "Finance",
    formula: "SUM(net_volume) / SUM(transaction_count)",
    sourceSystem: "Normalized Orders Mart",
    targetMart: "fact_daily_revenue",
    sourceLedgerValue: "Net Sales",
    martOutputValue: "Txn Count",
    variance: "Target: Benchmark",
    tolerance: "±0.01%",
    description:
      "Measures average net revenue generated per fulfilled transaction across currency domains.",
    dataRationale:
      "Identified multi-currency checkouts in Stripe and varying cart sizes in PostgreSQL. The AI recognized that price elasticity and cross-border currency conversion require basket-level tracking.",
    businessImpact:
      "Essential unit economics KPI for marketing acquisition spend (CAC payback) and promotional basket optimization.",
  },
];

export const INITIAL_REASONING_PHASES: ReasoningPhase[] = [
  {
    id: "phase-1",
    stepIndex: 1,
    title: "Phase 1: Source Discovery & Schema Profiling",
    scripts: [
      "executing source_catalog_inspector.py...",
      "executing postgres_foreign_keys_profiler.sql...",
    ],
    reasoning:
      "Identified transactional PostgreSQL cluster and Stripe payment event payloads. Detected candidate primary keys on customer_id and idempotency tokens on stripe_charge_id. Selected zero-copy federation via Zetaris gateway to avoid physical replication.",
  },
  {
    id: "phase-2",
    stepIndex: 2,
    title: "Phase 2: Dimensional Modeling & Trade-off Analysis",
    scripts: ["executing star_schema_generator.sql..."],
    reasoning:
      "Evaluated Inmon 3NF against Kimball Star Schema. Selected a central fact table (fact_daily_revenue) joined to conformed dimensions (dim_customer_360, dim_product_sku) with SCD Type-2 history tracking.",
  },
  {
    id: "phase-3",
    stepIndex: 3,
    title: "Phase 3: Pre-flight Verification & DDL Compilation",
    scripts: [
      "executing nullability_constraints_verifier.py...",
      "executing ddl_syntax_compiler.sql...",
    ],
    reasoning:
      "Verified foreign key referential integrity between dimension surrogate keys and fact measures. Compiled ANSI SQL-92 DDL with partitioned date keys.",
  },
  {
    id: "phase-4",
    stepIndex: 4,
    title: "Phase 4: KPI Verification & Reconciliation Setup",
    scripts: [
      "executing configure_kpi_reconciliation.py...",
      "executing compile_ledger_assertions.sql...",
    ],
    reasoning:
      "Configured automated verification checks for your selected KPIs and established a financial reconciliation table comparing source ledgers against target marts.",
  },
];

export const INITIAL_PLAN_STAGES: PlanStage[] = [
  {
    id: "stage-1",
    number: "01",
    title: "Raw Source Ingestion & Bronze Staging",
    category: "Ingestion",
    description:
      "Virtualize and extract raw transaction streams from operational databases into an immutable staging zone.",
    tables: [
      "stg_raw_transactions",
      "stg_customer_events",
      "stg_inventory_levels",
    ],
    technologies: ["PostgreSQL", "Stripe API", "Zetaris Connector"],
  },
  {
    id: "stage-2",
    number: "02",
    title: "Data Cleansing, Deduplication & SCD-2",
    category: "Transformation",
    description:
      "Resolve surrogate foreign keys, deduplicate idempotency tokens, and maintain SCD Type-2 historical timeline records.",
    tables: [
      "transform_orders_clean",
      "transform_scd2_customers",
      "transform_currency_norm",
    ],
    technologies: ["SQL dbt", "PySpark", "DuckDB Engine"],
  },
  {
    id: "stage-3",
    number: "03",
    title: "Curated Dimensional Star Schema",
    category: "Data Mart",
    description:
      "Assemble Kimball dimensional model with high-velocity fact measures surrounded by conformed dimensions.",
    tables: [
      "fact_daily_revenue",
      "dim_customer_360",
      "dim_product_sku",
      "dim_calendar",
    ],
    technologies: ["Snowflake Lakehouse", "Star Schema DDL"],
  },
  {
    id: "stage-4",
    number: "04",
    title: "Unified Zetaris SQL Virtualization Endpoint",
    category: "Virtualization",
    description:
      "Publish federated SQL views with zero-copy caching, role-based column masking, and sub-second BI aggregations.",
    tables: ["v_bi_executive_sales", "v_customer_retention_cohorts"],
    technologies: ["Zetaris Gateway", "ANSI SQL-92"],
  },
  {
    id: "stage-5",
    number: "05",
    title: "Independent KPI Verification & Reconciliation",
    category: "Verification",
    description:
      "Automatically verifies your selected KPIs against raw source data to ensure numbers reconcile before pipeline deployment.",
    tables: ["audit_kpi_reconciliation_ledger", "audit_variance_assertions"],
    technologies: ["Automated Verifier", "Zero-Variance Assertions"],
  },
];

export const INITIAL_CLARIFYING_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: "scd-strategy",
    question: "How should historical customer profile mutations be preserved?",
    context: "Customer addresses and tiers change over time.",
    options: [
      {
        id: "scd-2",
        label: "SCD Type 2 (valid_from / valid_to)",
        description:
          "Maintains full historical records for point-in-time auditability and cohort analysis.",
        isRecommended: true,
      },
      {
        id: "scd-1",
        label: "SCD Type 1 (Overwrite in place)",
        description:
          "Overwrites existing fields with the latest values. Lowest storage footprint, no history.",
      },
      {
        id: "append-only",
        label: "Immutable Event Log",
        description:
          "Stores every change as an append-only delta event with monotonic sequence IDs.",
      },
    ],
  },
  {
    id: "ingestion-frequency",
    question: "What is the required data freshness SLA for revenue reporting?",
    context:
      "Determines whether the pipeline runs on a micro-batch schedule or continuous stream.",
    options: [
      {
        id: "microbatch-15m",
        label: "15-Minute Micro-batch",
        description: "Balances low latency with warehouse compute efficiency.",
        isRecommended: true,
      },
      {
        id: "hourly-batch",
        label: "Hourly Batch Sync",
        description:
          "Cost-optimized scheduled ingestion with predictable compute windows.",
      },
      {
        id: "streaming-realtime",
        label: "Real-Time CDC (< 30s)",
        description:
          "Continuous Change Data Capture with always-on streaming workers.",
      },
    ],
  },
  {
    id: "data-quality-strategy",
    question: "How should schema drift and malformed records be handled?",
    context:
      "Defines error boundaries when external APIs introduce unexpected nulls or types.",
    options: [
      {
        id: "quarantine-dlq",
        label: "Quarantine to Dead-Letter Queue",
        description:
          "Routes failed rows to a quarantine table without halting the pipeline.",
        isRecommended: true,
      },
      {
        id: "strict-fail",
        label: "Strict Fail-Fast",
        description:
          "Immediately halts execution and alerts engineers on any constraint violation.",
      },
      {
        id: "impute-defaults",
        label: "Auto-Coalesce Defaults",
        description:
          "Replaces missing values with fallback constants and logs an audit warning.",
      },
    ],
  },
  {
    id: "audit-presentation-format",
    question: "How would you like your KPI verification results presented?",
    context:
      "Choose the presentation format that best fits your workflow and team.",
    options: [
      {
        id: "reconciliation-table",
        label: "Financial Reconciliation Table",
        description:
          "Side-by-side ledger vs. mart balance sheet with exact variance and match checks.",
        isRecommended: true,
      },
      {
        id: "cohort-drift-matrix",
        label: "Cohort & Distribution Drift Matrix",
        description:
          "Tracks customer cohort counts and historical SCD-2 timelines across dimensions.",
      },
      {
        id: "checksum-parity-log",
        label: "Checksum & Row Parity Log",
        description:
          "Row counts and parity verification across each pipeline stage.",
      },
    ],
  },
];

export const INITIAL_COMPILED_SQL = `-- AuraBI Auto-Compiled Warehouse DDL
-- Dialect: ANSI SQL-92 / Zetaris Virtualization Gateway

-- Stage 01: Bronze Staging Table
CREATE TABLE stg_raw_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    event_timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stage 02: Cleaned & Normalized Orders
CREATE TABLE transform_orders_clean (
    order_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    gross_amount DECIMAL(14,2) NOT NULL,
    tax_amount DECIMAL(14,2) DEFAULT 0.00,
    net_amount DECIMAL(14,2) NOT NULL,
    is_valid_transaction BOOLEAN DEFAULT TRUE
);

-- Stage 02 & 03: Conformed SCD Type-2 Customer Dimension
CREATE TABLE dim_customer_360 (
    customer_key BIGINT PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(255),
    tier VARCHAR(50),
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP,
    is_current BOOLEAN DEFAULT TRUE
);

-- Stage 03: Central Fact Table
CREATE TABLE fact_daily_revenue (
    revenue_key BIGINT PRIMARY KEY,
    date_key INT NOT NULL,
    customer_key BIGINT REFERENCES dim_customer_360(customer_key),
    gross_volume DECIMAL(18,2) NOT NULL,
    net_volume DECIMAL(18,2) NOT NULL,
    transaction_count INT NOT NULL
);

-- Stage 04: Zetaris SQL Virtualization Endpoint
CREATE OR REPLACE VIEW v_bi_executive_sales AS
SELECT 
    d.date_key,
    c.customer_name,
    c.tier,
    f.gross_volume,
    f.net_volume,
    f.transaction_count
FROM fact_daily_revenue f
JOIN dim_customer_360 c ON f.customer_key = c.customer_key
WHERE c.is_current = TRUE;

-- Stage 05: Independent Audit Agent Reconciliation Assertions (Author-Isolated)
CREATE OR REPLACE VIEW audit_kpi_reconciliation_ledger AS
SELECT
    'Net Recognized Revenue' AS kpi_name,
    (SELECT SUM(amount) FROM stg_raw_transactions) AS source_ledger_total,
    (SELECT SUM(net_volume) FROM fact_daily_revenue) AS mart_output_total,
    (SELECT SUM(amount) FROM stg_raw_transactions) - (SELECT SUM(net_volume) FROM fact_daily_revenue) AS variance_delta;
`;

export const INITIAL_PLAN_MARKDOWN = `# Pipeline Implementation Architecture Plan

## Executive Overview
AuraBI has formulated an autonomous, production-grade lakehouse pipeline to ingest, cleanse, normalize, and dimensionalize transactional records from operational PostgreSQL and Stripe webhook streams into a certified Kimball Star Schema.

---

## Stage 1: Source Discovery & Ingestion Architecture (Bronze Layer)
The ingestion tier establishes automated, idempotent extract streams directly from raw operational ledgers into append-only bronze landing storage.

- **PostgreSQL Database Stream (\`src_postgres_web_orders\`)**:
  - **Ingestion Mode**: 15-Minute Micro-batch Change Data Capture (CDC).
  - **Landing Target**: \`stg_raw_transactions\`.
  - **Data Invariants**: Strict primary key uniqueness on \`transaction_id\` and UTC timestamp alignment.
  - **Partitioning**: Dynamic date partitioning on \`event_timestamp\` (\`yyyy/mm/dd\`) for high-throughput parallel staging.

- **Stripe Webhook Gateway (\`src_stripe_charges\`)**:
  - **Deduplication Strategy**: Payload SHA-256 fingerprint verification to enforce idempotent event handling.
  - **Multi-Currency Normalization**: Automatic currency conversion to standardized base USD at point of capture.
  - **Landing Target**: \`raw_stripe_charges\`.

---

## Stage 2: Cleansing, Normalization & Quality Assurance (Silver Layer)
Raw incoming streams are parsed through schema validation, type enforcement, and automated deduplication rules to build audit-ready silver datasets.

- **Order Cleansing & Quality Control (\`transform_orders_clean\`)**:
  - **Error Boundary**: Dead-Letter Queue (DLQ) Quarantine (Routes invalid rows to isolation table).
  - Calculate normalized line-item totals (\`gross_amount\`, \`tax_amount\`, \`discount_amount\`, \`net_amount\`).
  - Standardize lifecycle status enumerations (\`completed\`, \`refunded\`, \`disputed\`).

- **Customer Dimension Historical Tracking (\`dim_customer_360\`)**:
  - **Historical Strategy**: Slowly Changing Dimension (SCD) Type-2.
  - Generates integer surrogate keys (\`customer_key\`) and tracks profile, address, and tier changes over time.
  - Effective interval tracking via \`valid_from\` and \`valid_to\` timestamps with a single \`is_current = TRUE\` active record per customer.

---

## Stage 3: Star Schema Dimensional Modeling (Gold Layer)
The curated business intelligence layer arranges data into a Kimball-compliant star schema optimized for fast analytical aggregations.

- **Central Daily Revenue Fact Table (\`fact_daily_revenue\`)**:
  - **Grain**: One record per finalized customer order transaction per calendar day.
  - **Dimensional Keys**: Foreign key references to \`dim_dates\`, \`dim_customer_360\`, and \`dim_products\`.
  - **Additive Measures**: \`gross_volume\`, \`net_volume\`, \`tax_amount\`, and \`transaction_count\`.

- **Conformed Supporting Dimensions**:
  - **\`dim_dates\`**: Pre-computed corporate fiscal calendar supporting 4-4-5 accounting quarters, ISO weeks, and holiday flags.
  - **\`dim_products\`**: Standardized SKU catalog hierarchy, department rollups, and category taxonomies.

---

## Stage 4: Virtualization & Analytical Query Delivery
- **Zetaris Federated Endpoints (\`v_bi_executive_sales\`)**:
  - Exposes certified ANSI SQL-92 query views for enterprise BI platforms (Tableau, PowerBI, Superset).
  - Sub-second execution SLAs powered by zero-copy semantic caching.
  - Dynamic column-level masking applied to sensitive customer PII (email, address, card fingerprint).

---

## Stage 5: Independent Verification & Audit Contracts
Before pipeline promotion, an author-isolated verification agent audits output tables directly against source transactions:
- **Net Recognized Revenue**: Reconciles Stripe settled net transactions with warehouse fact totals (0.00% variance tolerance).
- **Gross Merchandise Volume (GMV)**: Verifies zero dollar leakage between raw ingestion and executive views.
- **Idempotent Charge Parity**: Strict zero duplicate assertions on payment webhooks.
- **Active Customer 360**: Validates SCD-2 timeline continuity with zero orphan records.
`;

export function generatePlanMarkdown(state?: {
  planTitle?: string;
  planSummary?: string;
  stages?: PlanStage[];
  selectedAnswers?: Record<string, string>;
  kpis?: KpiDefinition[];
  selectedKpiIds?: string[];
  isMockSeedData?: boolean;
}): string {
  if (!state) return INITIAL_PLAN_MARKDOWN;

  const isCustomPlan =
    state.isMockSeedData === false ||
    (state.planTitle && state.planTitle !== "Retail Lakehouse Master Pipeline") ||
    (state.stages &&
      state.stages.length > 0 &&
      state.stages.some((s) => !INITIAL_PLAN_STAGES.some((init) => init.id === s.id)));

  if (isCustomPlan) {
    const title = state.planTitle || "Pipeline Implementation Architecture Plan";
    const summary =
      state.planSummary ||
      "Architecture blueprint synthesized by the AuraBI Master Agent.";
    const stagesList = state.stages || [];
    const activeKpis = (state.kpis || []).filter((k) =>
      (state.selectedKpiIds || []).includes(k.id),
    );

    const stageSections =
      stagesList.length > 0
        ? stagesList
            .map(
              (s) =>
                `## Stage ${s.number}: ${s.title} (${s.category})\n${s.description}\n\n` +
                (s.tables.length > 0
                  ? `- **Target Entities**: ${s.tables.map((t) => `\`${t}\``).join(", ")}\n`
                  : "") +
                (s.technologies.length > 0
                  ? `- **Stack**: ${s.technologies.join(", ")}\n`
                  : ""),
            )
            .join("\n---\n\n")
        : "## Architecture Stages\nAwaiting stage synthesis from backend agent.";

    const kpiSection =
      activeKpis.length > 0
        ? `\n---\n\n## Verified KPI Contracts\n` +
          activeKpis
            .map(
              (k) =>
                `- **${k.name}** (\`${k.targetMart}\`): \`${k.formula}\` — Tolerance: ${k.tolerance}`,
            )
            .join("\n")
        : "";

    return `# ${title}\n\n## Executive Overview\n${summary}\n\n---\n\n${stageSections}${kpiSection}\n`;
  }

  const scd =
    state.selectedAnswers?.["scd-strategy"] === "scd-1"
      ? "SCD Type-1 (Overwrite in place, latest values only)"
      : state.selectedAnswers?.["scd-strategy"] === "append-only"
        ? "Immutable Event Log (Append-only delta stream)"
        : "SCD Type-2 (Historical tracking with valid_from/valid_to)";

  const freq =
    state.selectedAnswers?.["ingestion-frequency"] === "streaming-realtime"
      ? "Real-Time Continuous Change Data Capture (CDC < 30s)"
      : state.selectedAnswers?.["ingestion-frequency"] === "hourly-batch"
        ? "Hourly Scheduled Batch Sync"
        : "15-Minute Micro-batch Change Data Capture (CDC)";

  const quality =
    state.selectedAnswers?.["data-quality-strategy"] === "strict-fail"
      ? "Strict Fail-Fast (Immediate pipeline halt and alert on constraint breach)"
      : state.selectedAnswers?.["data-quality-strategy"] === "impute-defaults"
        ? "Auto-Coalesce Defaults (Automatic fallback replacement with audit warning)"
        : "Dead-Letter Queue (DLQ) Quarantine (Routes invalid rows to isolation table)";

  const activeKpis = (state.kpis || INITIAL_KPIS).filter((k) =>
    (state.selectedKpiIds || []).includes(k.id),
  );

  const kpiLines =
    activeKpis.length > 0
      ? activeKpis
          .map(
            (k) =>
              `- **${k.name}** (\`${k.targetMart}\`): Reconciles source ledger against mart outputs. Formula: \`${k.formula}\` (SLA: ${k.tolerance}).`,
          )
          .join("\n")
      : "- **Net Recognized Revenue**: Reconciles Stripe settled net transactions with warehouse fact totals (0.00% tolerance).";

  return `# Pipeline Implementation Architecture Plan

## Executive Overview
AuraBI has formulated an autonomous, production-grade lakehouse pipeline to ingest, cleanse, normalize, and dimensionalize transactional records from operational PostgreSQL and Stripe webhook streams into a certified Kimball Star Schema.

---

## Stage 1: Source Discovery & Ingestion Architecture (Bronze Layer)
The ingestion tier establishes automated, idempotent extract streams directly from raw operational ledgers into append-only bronze landing storage.

- **PostgreSQL Database Stream (\`src_postgres_web_orders\`)**:
  - **Ingestion Mode**: ${freq}.
  - **Landing Target**: \`stg_raw_transactions\`.
  - **Data Invariants**: Strict primary key uniqueness on \`transaction_id\` and UTC timestamp alignment.
  - **Partitioning**: Dynamic date partitioning on \`event_timestamp\` (\`yyyy/mm/dd\`) for high-throughput parallel staging.

- **Stripe Webhook Gateway (\`src_stripe_charges\`)**:
  - **Deduplication Strategy**: Payload SHA-256 fingerprint verification to enforce idempotent event handling.
  - **Multi-Currency Normalization**: Automatic currency conversion to standardized base USD at point of capture.
  - **Landing Target**: \`raw_stripe_charges\`.

---

## Stage 2: Cleansing, Normalization & Quality Assurance (Silver Layer)
Raw incoming streams are parsed through schema validation, type enforcement, and automated deduplication rules to build audit-ready silver datasets.

- **Order Cleansing & Quality Control (\`transform_orders_clean\`)**:
  - **Error Boundary**: ${quality}.
  - Calculate normalized line-item totals (\`gross_amount\`, \`tax_amount\`, \`discount_amount\`, \`net_amount\`).
  - Standardize lifecycle status enumerations (\`completed\`, \`refunded\`, \`disputed\`).

- **Customer Dimension Historical Tracking (\`dim_customer_360\`)**:
  - **Historical Strategy**: ${scd}.
  - Generates integer surrogate keys (\`customer_key\`) and tracks profile, address, and tier changes over time.
  - Effective interval tracking via \`valid_from\` and \`valid_to\` timestamps with a single \`is_current = TRUE\` active record per customer.

---

## Stage 3: Star Schema Dimensional Modeling (Gold Layer)
The curated business intelligence layer arranges data into a Kimball-compliant star schema optimized for fast analytical aggregations.

- **Central Daily Revenue Fact Table (\`fact_daily_revenue\`)**:
  - **Grain**: One record per finalized customer order transaction per calendar day.
  - **Dimensional Keys**: Foreign key references to \`dim_dates\`, \`dim_customer_360\`, and \`dim_products\`.
  - **Additive Measures**: \`gross_volume\`, \`net_volume\`, \`tax_amount\`, and \`transaction_count\`.

- **Conformed Supporting Dimensions**:
  - **\`dim_dates\`**: Pre-computed corporate fiscal calendar supporting 4-4-5 accounting quarters, ISO weeks, and holiday flags.
  - **\`dim_products\`**: Standardized SKU catalog hierarchy, department rollups, and category taxonomies.

---

## Stage 4: Virtualization & Analytical Query Delivery
- **Zetaris Federated Endpoints (\`v_bi_executive_sales\`)**:
  - Exposes certified ANSI SQL-92 query views for enterprise BI platforms (Tableau, PowerBI, Superset).
  - Sub-second execution SLAs powered by zero-copy semantic caching.
  - Dynamic column-level masking applied to sensitive customer PII (email, address, card fingerprint).

---

## Stage 5: Independent Verification & Audit Contracts
Before pipeline promotion, an author-isolated verification agent audits output tables directly against source transactions:
${kpiLines}
- **Zero Dollar Leakage**: Validates that all settled Stripe charges match revenue facts with 0.00% variance tolerance.
- **Idempotency Assertions**: Guarantees zero duplicate transactions in cleansed marts.
- **SCD-2 Timeline Integrity**: Verifies zero overlapping temporal ranges across customer dimension history.
`;
}

export interface PlanAndProtocolState {
  // Protocol tracking
  workspaceId: string;
  revision: number;
  processedMessageIds: string[];
  executionHistory: UiopExecutionReport[];

  // Plan state
  planId: string;
  planTitle: string;
  planPrompt: string | null;
  planSummary: string;
  stages: PlanStage[];
  reasoningPhases: ReasoningPhase[];
  kpis: KpiDefinition[];
  selectedKpiIds: string[];
  compiledSql: string;
  planMarkdown: string;

  // Proposed clarifying questions state
  questions: ClarifyingQuestion[];
  selectedAnswers: Record<string, string>;

  // Dynamic UIOP panels & reports
  panels: ActiveUiopPanel[];
  reports: Record<string, ReportUpdateParams>;
  isMockSeedData: boolean;
  /** The planner agent is designing a plan on the backend (Nemotron + Zetaris). */
  isPlanning: boolean;
  planError: string | null;
  setPlanning: (isPlanning: boolean, planError?: string | null) => void;

  // Direct store actions
  setPlanMarkdown: (markdown: string) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  proposeQuestion: (question: ClarifyingQuestion) => void;
  removeQuestion: (questionId: string) => void;
  toggleKpiSelection: (kpiId: string) => void;
  addKpi: (kpi: KpiDefinition, select?: boolean) => void;
  setPlanPrompt: (prompt: string | null) => void;
  togglePanelOpen: (panelId: string, open?: boolean) => void;
  removePanel: (panelId: string) => void;
  commitUiopState: (patch: Partial<PlanAndProtocolState>) => void;
  resetProtocolState: () => void;
  clearMockPlanForLiveBackend: (pipelineName?: string, prompt?: string) => void;
}

export const usePlanStore = create<PlanAndProtocolState>()(
  persist(
    (set, get) => ({
      workspaceId: "workspace_01",
      revision: 1,
      processedMessageIds: [],
      executionHistory: [],

      planId: "plan_default_01",
      planTitle: "Retail Lakehouse Master Pipeline",
      planPrompt: null,
      planSummary:
        "A 5-stage architectural blueprint featuring Bronze raw staging, Silver SCD Type-2 transformations, a Kimball Star Schema warehouse, Zetaris SQL virtualization, and an author-isolated Independent Audit Agent.",
      stages: INITIAL_PLAN_STAGES,
      reasoningPhases: INITIAL_REASONING_PHASES,
      kpis: INITIAL_KPIS,
      selectedKpiIds: [
        "net-recognized-revenue",
        "gross-merchandise-volume",
        "idempotent-charge-parity",
        "active-customer-360",
      ],
      compiledSql: INITIAL_COMPILED_SQL,
      planMarkdown: INITIAL_PLAN_MARKDOWN,

      questions: INITIAL_CLARIFYING_QUESTIONS,
      selectedAnswers: {
        "scd-strategy": "scd-2",
        "ingestion-frequency": "microbatch-15m",
        "data-quality-strategy": "quarantine-dlq",
        "audit-presentation-format": "reconciliation-table",
      },

      panels: [],
      reports: {},
      isMockSeedData: true,

      setPlanMarkdown: (markdown) => set({ planMarkdown: markdown, isMockSeedData: false }),
      isPlanning: false,
      planError: null,
      setPlanning: (isPlanning, planError = null) => set({ isPlanning, planError }),

      setAnswer: (questionId, optionId) =>
        set((s) => {
          const nextAnswers = { ...s.selectedAnswers, [questionId]: optionId };
          return {
            selectedAnswers: nextAnswers,
            planMarkdown: generatePlanMarkdown({
              planTitle: s.planTitle,
              planSummary: s.planSummary,
              stages: s.stages,
              selectedAnswers: nextAnswers,
              kpis: s.kpis,
              selectedKpiIds: s.selectedKpiIds,
              isMockSeedData: s.isMockSeedData,
            }),
          };
        }),

      proposeQuestion: (question) =>
        set((s) => {
          const exists = s.questions.some((q) => q.id === question.id);
          const defaultAnswer =
            question.selectedOptionId ??
            question.options.find((o) => o.isRecommended)?.id ??
            question.options[0]?.id;
          return {
            isMockSeedData: false,
            questions: exists
              ? s.questions.map((q) => (q.id === question.id ? question : q))
              : [...(s.isMockSeedData ? [] : s.questions), question],
            selectedAnswers: defaultAnswer
              ? { ...(s.isMockSeedData ? {} : s.selectedAnswers), [question.id]: defaultAnswer }
              : s.selectedAnswers,
          };
        }),

      removeQuestion: (questionId) =>
        set((s) => ({
          questions: s.questions.filter((q) => q.id !== questionId),
        })),

      toggleKpiSelection: (kpiId) =>
        set((s) => {
          const nextSelectedKpiIds = s.selectedKpiIds.includes(kpiId)
            ? s.selectedKpiIds.length > 1
              ? s.selectedKpiIds.filter((id) => id !== kpiId)
              : s.selectedKpiIds
            : [...s.selectedKpiIds, kpiId];

          return {
            selectedKpiIds: nextSelectedKpiIds,
            planMarkdown: generatePlanMarkdown({
              planTitle: s.planTitle,
              planSummary: s.planSummary,
              stages: s.stages,
              selectedAnswers: s.selectedAnswers,
              kpis: s.kpis,
              selectedKpiIds: nextSelectedKpiIds,
              isMockSeedData: s.isMockSeedData,
            }),
          };
        }),

      addKpi: (kpi, select = true) =>
        set((s) => {
          const baseKpis = s.isMockSeedData ? [] : s.kpis;
          const baseSelected = s.isMockSeedData ? [] : s.selectedKpiIds;
          const nextKpis = [...baseKpis.filter((k) => k.id !== kpi.id), kpi];
          const nextSelectedKpiIds =
            select && !baseSelected.includes(kpi.id)
              ? [...baseSelected, kpi.id]
              : baseSelected;
          return {
            isMockSeedData: false,
            kpis: nextKpis,
            selectedKpiIds: nextSelectedKpiIds,
            planMarkdown: generatePlanMarkdown({
              planTitle: s.planTitle,
              planSummary: s.planSummary,
              stages: s.stages,
              selectedAnswers: s.selectedAnswers,
              kpis: nextKpis,
              selectedKpiIds: nextSelectedKpiIds,
              isMockSeedData: false,
            }),
          };
        }),

      setPlanPrompt: (prompt) => set({ planPrompt: prompt }),

      togglePanelOpen: (panelId, open) =>
        set((s) => ({
          panels: s.panels.map((p) =>
            p.id === panelId ? { ...p, open: open ?? !p.open } : p,
          ),
        })),

      removePanel: (panelId) =>
        set((s) => ({
          panels: s.panels.filter((p) => p.id !== panelId),
        })),

      commitUiopState: (patch) =>
        set((s) => {
          const next = { ...s, ...patch, isMockSeedData: false };
          if (patch.planTitle || patch.planSummary || patch.stages || patch.kpis || patch.selectedKpiIds || patch.selectedAnswers) {
            next.planMarkdown = generatePlanMarkdown({
              planTitle: next.planTitle,
              planSummary: next.planSummary,
              stages: next.stages,
              selectedAnswers: next.selectedAnswers,
              kpis: next.kpis,
              selectedKpiIds: next.selectedKpiIds,
              isMockSeedData: false,
            });
          }
          return next;
        }),

      resetProtocolState: () =>
        set({
          revision: 1,
          processedMessageIds: [],
          executionHistory: [],
          planId: "plan_default_01",
          planTitle: "Retail Lakehouse Master Pipeline",
          planPrompt: null,
          stages: INITIAL_PLAN_STAGES,
          reasoningPhases: INITIAL_REASONING_PHASES,
          kpis: INITIAL_KPIS,
          selectedKpiIds: [
            "net-recognized-revenue",
            "gross-merchandise-volume",
            "idempotent-charge-parity",
            "active-customer-360",
          ],
          compiledSql: INITIAL_COMPILED_SQL,
          planMarkdown: INITIAL_PLAN_MARKDOWN,
          questions: INITIAL_CLARIFYING_QUESTIONS,
          selectedAnswers: {
            "scd-strategy": "scd-2",
            "ingestion-frequency": "microbatch-15m",
            "data-quality-strategy": "quarantine-dlq",
            "audit-presentation-format": "reconciliation-table",
          },
          panels: [],
          reports: {},
          isMockSeedData: true,
        }),

      clearMockPlanForLiveBackend: (pipelineName, prompt) => {
        if (get().isMockSeedData) {
          const title = pipelineName || "Live Pipeline Architecture";
          set({
            isMockSeedData: false,
            planId: `plan_${Date.now().toString(36)}`,
            planTitle: title,
            planPrompt: prompt ?? null,
            planSummary: "Connected to live backend. Awaiting architecture synthesis and agent tasks.",
            stages: [],
            reasoningPhases: [],
            kpis: [],
            selectedKpiIds: [],
            compiledSql: "-- Connected to live backend. DDL will be populated by the backend agent.",
            planMarkdown: `# ${title}\n\n## Status\nConnected to live FastAPI backend. Submit a prompt or execute agent tasks to populate pipeline stages and questions.`,
            questions: [],
            selectedAnswers: {},
            panels: [],
            reports: {},
          });
        }
      },
    }),
    {
      name: "aura-bi.uiop-plan.v1",
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        revision: s.revision,
        planId: s.planId,
        planTitle: s.planTitle,
        planPrompt: s.planPrompt,
        planSummary: s.planSummary,
        stages: s.stages,
        reasoningPhases: s.reasoningPhases,
        kpis: s.kpis,
        selectedKpiIds: s.selectedKpiIds,
        compiledSql: s.compiledSql,
        planMarkdown: s.planMarkdown,
        questions: s.questions,
        selectedAnswers: s.selectedAnswers,
        panels: s.panels,
        reports: s.reports,
        isMockSeedData: s.isMockSeedData,
      }),
    },
  ),
);
