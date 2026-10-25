# AuraBI Complete Backend API & UIOP v1.0 Specification

> **Target Audience:** Backend & AI Agent Engineers (FastAPI / Python / LLM Orchestration)  
> **Status:** Authoritative Frontend-to-Backend Contract (Supersedes `BACKEND_ENDPOINTS.md`)  
> **Base URLs:**
>
> - `REST_BASE_URL = http://localhost:8000/api/v1`
> - `WS_BASE_URL   = ws://localhost:8000/api/v1`

---

## 1. Executive Summary: Why the Previous Contract Was Insufficient

The legacy [`BACKEND_ENDPOINTS.md`](./BACKEND_ENDPOINTS.md) only covered a flat 3-node (`SOURCE / TRANSFORM / SINK`) CRUD graph and a run-blocking text prompt. The AuraBI frontend is a **4-stage Agent-First Data Lakehouse & BI Platform** that requires backend support across **6 core domains**:

1. **Multi-Source Ingestion & Schema Introspection (`/` & `/workspace`):** Uploading `.csv`, `.parquet`, `.json`, `.xlsx`, `.sql` files and testing/introspecting `postgresql`, `mysql`, `snowflake`, and `rest_api` connectors with column-level primary/foreign key metadata.
2. **AI Architecture Plan Proposal & Stepped Clarifying Questions (`/plan`):** Streaming 4-phase AI reasoning timelines (`ReasoningPhase[]`), proposing structured multiple-choice architectural trade-off questions (`QuestionProposeParams[]`), synthesizing 5-stage pipeline blueprints (`PlanStage[]`), and compiling ANSI SQL-92 / Zetaris DDL (`compiledSql`).
3. **Declarative UI Operations Protocol (`UIOP v1.0`) (`/plan` & `/workspace`):** Atomic, versioned (`baseRevision`) operation batches (`operations[]`) for manipulating the XYFlow canvas (including nested **Star Schema Warehouse Containers**), plans, questions, approved inspection panels, and audit reports.
4. **Interactive ETL Canvas & Code Execution (`/workspace`):** Executing SQL / Python / PySpark / dbt transformation nodes, inspecting live row previews, and exporting complete warehouse DDL.
5. **Independent Audit Agent & Zero-Variance KPI Reconciliation (`/plan` & `/audit`):** Author-isolated verification comparing **Source Ledger (Raw)** vs. **Warehouse Layer** vs. **Mart KPI (Built)** values (`FinancialReconciliationItem[]`), row conservation stages (`RowConservationStage[]`), state transition audits (`StateTransitionAuditItem[]`), and cryptographic verification seals (`AuditorVerificationSealData`).
6. **Dynamic AI Insights & Analytical Graphs (`/audit`):** Serving domain-categorized (`sales`, `customers`, `operations`, `anomalies`) executive insights (`AiInsightModel[]`) with 4 specialized chart payloads (`waterfall-decomposition`, `cohort-decay-curve`, `state-flow-funnel`, `anomaly-ribbon`).

---

## 2. Complete End-to-End User & API Flow

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: ENTRY & SOURCE ATTACHMENT (Route: `/` — AgentEntryPage.tsx)               │
│  • User uploads CSV/Parquet/SQL or connects DB  ──▶ POST /pipelines/{id}/sources  │
│  • User submits initial prompt                  ──▶ POST /pipelines/{id}/plan/init│
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: AI PLAN & CLARIFYING QUESTIONS (Route: `/plan` — PlanProposalPage.tsx)    │
│  • Backend streams reasoning phases, stages, KPIs & multi-option questions        │
│    via UIOP (`plan.create`, `question.propose`)                                   │
│  • User selects option pills                    ──▶ POST /pipelines/{id}/questions│
│  • User toggles KPIs or refines plan via prompt ──▶ POST /pipelines/{id}/chat     │
│  • User clicks "Validate & Build Pipeline"      ──▶ POST /pipelines/{id}/plan/approve
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: WORKSPACE CANVAS & UIOP (Route: `/workspace` — WorkspacePage.tsx)         │
│  • `/plan/approve` returns UIOP batch (`node.add`, `edge.add`, `layout.update`)   │
│    which populates the XYFlow canvas & Star Schema Warehouse Container.           │
│  • User chats with AI or edits SQL/Python code  ──▶ POST /pipelines/{id}/chat     │
│  • Frontend applies UIOP batch & sends report   ──▶ POST /pipelines/{id}/uiop/ack │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: AUDIT & DYNAMIC INSIGHTS (Route: `/audit` — AuditCenterPage.tsx)          │
│  • Independent Audit Agent reconciles KPIs      ──▶ GET /pipelines/{id}/audit     │
│  • Executive Insights & 4 chart types loaded    ──▶ GET /pipelines/{id}/insights  │
│  • User clicks "Refresh Insights"               ──▶ POST /pipelines/{id}/insights/refresh
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain 1: Pipeline Session & Workspace Bootstrap

### 3.1 `GET /health`

Checks backend readiness and active LLM configuration.

```json
{
  "status": "ok",
  "model": "gemini-2.5-pro",
  "llm_configured": true,
  "uiop_version": "1.0"
}
```

### 3.2 `POST /pipelines`

Creates a new workspace/pipeline session.

- **Request:**

```json
{
  "name": "Retail Lakehouse Master Pipeline",
  "initial_prompt": "Build an end-to-end data lakehouse pipeline..."
}
```

- **Response (`201 Created`):** Returns the full `PipelineWorkspaceSnapshot` (same schema as `GET /pipelines/{pipeline_id}` below).

### 3.3 `GET /pipelines/{pipeline_id}`

Returns the complete authoritative snapshot of the workspace so the frontend can hydrate [`usePipelineStore`](../../src/features/workspace/store/pipelineStore.ts), [`usePlanStore`](../../src/features/uiop/store/planStore.ts), and [`useChatStore`](../../src/features/chat/store/chatStore.ts) in a single call.

- **Response (`200 OK`):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Retail Lakehouse Master Pipeline",
  "status": "DRAFT",
  "revision": 4,
  "updated_at": "2026-10-25T09:00:00Z",
  "graph": {
    "nodes": [],
    "edges": []
  },
  "plan": {
    "id": "plan_01",
    "title": "Retail Lakehouse Master Pipeline",
    "prompt": "Build an end-to-end data lakehouse pipeline...",
    "summary": "5-stage Kimball Star Schema with isolated KPI audit.",
    "stages": [],
    "reasoningPhases": [],
    "kpis": [],
    "selectedKpiIds": [],
    "compiledSql": ""
  },
  "questions": [],
  "selectedAnswers": {},
  "panels": [],
  "reports": {}
}
```

---

## 4. Domain 2: Data Sources, File Uploads & Connector Introspection

Supports [`AgentEntryPage.tsx`](../../src/pages/AgentEntryPage.tsx), [`ImportDataModal.tsx`](../../src/features/sources/components/ImportDataModal.tsx), and [`sourceCatalog.ts`](../../src/features/sources/services/sourceCatalog.ts).

### 4.1 `POST /pipelines/{pipeline_id}/sources/upload`

Uploads a local data file (`.csv`, `.xlsx`, `.json`, `.parquet`, `.sql`), parses/infers its column schema, registers it in the pipeline catalog, and optionally emits a `UIOP v1.0` `node.add` operation.

- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file payload
  - `format` (optional): `"csv" | "xlsx" | "json" | "parquet" | "generic"`
- **Response (`201 Created`):**

```json
{
  "source": {
    "id": "src_sales_transactions",
    "name": "sales_transactions",
    "fileName": "sales_transactions.parquet",
    "format": "parquet",
    "rowCount": 125000,
    "columns": [
      {
        "name": "transaction_id",
        "type": "VARCHAR(64)",
        "isPrimaryKey": true,
        "isForeignKey": false,
        "description": "Primary transaction identifier"
      },
      {
        "name": "customer_id",
        "type": "INT",
        "isPrimaryKey": false,
        "isForeignKey": true,
        "fkRefTable": "dim_customer_360",
        "fkRefColumn": "customer_id"
      },
      {
        "name": "amount",
        "type": "DECIMAL(12,2)",
        "isPrimaryKey": false,
        "isForeignKey": false
      }
    ],
    "parquetMetadata": {
      "rowGroups": 4,
      "codec": "SNAPPY",
      "sizeBytes": 14820000,
      "version": "Parquet 2.6"
    }
  },
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_src_upload_01",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "baseRevision": 1,
    "source": { "agentId": "ingestion-agent", "executionId": "exec_upload_01" },
    "operations": [
      {
        "op": "node.add",
        "params": {
          "id": "src_sales_transactions",
          "type": "resource",
          "position": { "x": 80, "y": 140 },
          "data": {
            "label": "sales_transactions",
            "kind": "source",
            "warehouseRole": "source",
            "format": "parquet",
            "description": "Uploaded Parquet source (125,000 rows)",
            "columns": [
              {
                "name": "transaction_id",
                "type": "VARCHAR(64)",
                "isPrimaryKey": true,
                "isForeignKey": false
              },
              {
                "name": "customer_id",
                "type": "INT",
                "isPrimaryKey": false,
                "isForeignKey": true,
                "fkRefTable": "dim_customer_360",
                "fkRefColumn": "customer_id"
              },
              {
                "name": "amount",
                "type": "DECIMAL(12,2)",
                "isPrimaryKey": false,
                "isForeignKey": false
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 4.2 `POST /pipelines/{pipeline_id}/sources/connect`

Tests and introspects an external database (`postgresql`, `mysql`, `snowflake`) or REST API endpoint.

- **Request (Database Variant — matches `DatabaseConnectionConfig`):**

```json
{
  "kind": "database",
  "config": {
    "engine": "postgresql",
    "host": "db.internal.corp",
    "port": 5432,
    "database": "commerce_prod",
    "schema": "public",
    "username": "readonly_agent",
    "password": "secret",
    "sslMode": "require"
  }
}
```

- **Request (REST API Variant — matches `ApiEndpointConfig`):**

```json
{
  "kind": "api",
  "config": {
    "name": "stripe_charge_events",
    "url": "https://api.stripe.com/v1/charges",
    "method": "GET",
    "authType": "bearer",
    "authToken": "sk_test_...",
    "jsonPath": "$.data[*]",
    "headers": [{ "key": "Stripe-Version", "value": "2024-06-20" }]
  }
}
```

- **Response (`200 OK`):**

```json
{
  "tables": [
    {
      "tableName": "orders",
      "engine": "postgresql",
      "rowCount": 142890,
      "columns": [
        {
          "name": "order_id",
          "type": "UUID",
          "isPrimaryKey": true,
          "isForeignKey": false
        },
        {
          "name": "customer_id",
          "type": "UUID",
          "isPrimaryKey": false,
          "isForeignKey": true,
          "fkRefTable": "customers",
          "fkRefColumn": "id"
        },
        {
          "name": "gross_amount",
          "type": "NUMERIC(12,2)",
          "isPrimaryKey": false,
          "isForeignKey": false
        }
      ]
    }
  ],
  "uiop": null
}
```

---

## 5. Domain 3: Architecture Plan Proposal & Clarifying Questions (`/plan`)

Supports [`PlanProposalPage.tsx`](../../src/pages/PlanProposalPage.tsx) and [`usePlanStore`](../../src/features/uiop/store/planStore.ts).

### 5.1 `POST /pipelines/{pipeline_id}/plan/generate`

Triggered when the user submits an architectural prompt on [`AgentEntryPage.tsx`](../../src/pages/AgentEntryPage.tsx) or refines the prompt in [`PlanProposalPage.tsx`](../../src/pages/PlanProposalPage.tsx).

- **Request:**

```json
{
  "prompt": "Build an end-to-end data lakehouse pipeline connecting PostgreSQL transactions and Stripe events into a Star Schema.",
  "attachedSourceIds": ["src_sales_transactions"]
}
```

- **Response (`200 OK`):** Returns a `UIOP v1.0` envelope containing `plan.create` (or `plan.update`) and `question.propose` operations:

```json
{
  "reply": "I have analyzed your sources and synthesized a 5-stage Lakehouse blueprint. Please confirm the 4 architectural decisions below.",
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_plan_init_01",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "baseRevision": 1,
    "source": { "agentId": "planner-agent", "executionId": "exec_plan_01" },
    "operations": [
      {
        "op": "plan.create",
        "params": {
          "id": "plan_retail_01",
          "title": "Retail Lakehouse Master Pipeline",
          "prompt": "Build an end-to-end data lakehouse pipeline...",
          "summary": "Kimball Star Schema with isolated KPI audit reconciliation.",
          "reasoningPhases": [
            {
              "id": "phase-1",
              "stepIndex": 1,
              "title": "Phase 1: Source Discovery & Schema Profiling",
              "scripts": [
                "executing source_catalog_inspector.py...",
                "executing postgres_foreign_keys_profiler.sql..."
              ],
              "reasoning": "Identified transactional PostgreSQL cluster and Stripe payment event payloads. Selected zero-copy federation via Zetaris gateway."
            },
            {
              "id": "phase-2",
              "stepIndex": 2,
              "title": "Phase 2: Dimensional Modeling & Trade-off Analysis",
              "scripts": ["executing star_schema_generator.sql..."],
              "reasoning": "Selected a central fact table (fact_daily_revenue) joined to conformed dimensions (dim_customer_360, dim_product_sku) with SCD Type-2 history tracking."
            },
            {
              "id": "phase-3",
              "stepIndex": 3,
              "title": "Phase 3: Pre-flight Verification & DDL Compilation",
              "scripts": ["executing ddl_syntax_compiler.sql..."],
              "reasoning": "Verified foreign key referential integrity between dimension surrogate keys and fact measures."
            },
            {
              "id": "phase-4",
              "stepIndex": 4,
              "title": "Phase 4: KPI Verification & Reconciliation Setup",
              "scripts": ["executing configure_kpi_reconciliation.py..."],
              "reasoning": "Configured automated verification checks for selected KPIs."
            }
          ],
          "stages": [
            {
              "id": "stage-1",
              "number": "01",
              "title": "Raw Source Ingestion & Bronze Staging",
              "category": "Ingestion",
              "description": "Virtualize and extract raw transaction streams into an immutable staging zone.",
              "tables": ["stg_raw_transactions", "stg_customer_events"],
              "technologies": ["PostgreSQL", "Stripe API", "Zetaris Connector"]
            },
            {
              "id": "stage-2",
              "number": "02",
              "title": "Data Cleansing, Deduplication & SCD-2",
              "category": "Transformation",
              "description": "Resolve surrogate foreign keys, deduplicate idempotency tokens, and maintain SCD Type-2 records.",
              "tables": ["transform_orders_clean", "transform_scd2_customers"],
              "technologies": ["SQL dbt", "PySpark", "DuckDB Engine"]
            },
            {
              "id": "stage-3",
              "number": "03",
              "title": "Curated Dimensional Star Schema",
              "category": "Data Mart",
              "description": "Assemble Kimball dimensional model with high-velocity fact measures surrounded by conformed dimensions.",
              "tables": [
                "fact_daily_revenue",
                "dim_customer_360",
                "dim_product_sku"
              ],
              "technologies": ["Snowflake Lakehouse", "Star Schema DDL"]
            }
          ],
          "kpis": [
            {
              "id": "net-recognized-revenue",
              "name": "Net Recognized Revenue",
              "category": "Finance",
              "formula": "SUM(gross_amount - tax_amount - refund_amount)",
              "sourceSystem": "Stripe + Postgres Ledger",
              "targetMart": "fact_daily_revenue",
              "sourceLedgerValue": "$4,829,140.50",
              "martOutputValue": "$4,829,140.50",
              "variance": "$0.00 (0.00%)",
              "tolerance": "±0.00%",
              "description": "Reconciles net settled revenue across Stripe webhooks and operational orders against fact_daily_revenue."
            }
          ],
          "compiledSql": "CREATE TABLE dim_customer_360 (\n  customer_sk BIGINT PRIMARY KEY,\n  customer_id VARCHAR(64) NOT NULL\n);"
        }
      },
      {
        "op": "question.propose",
        "params": {
          "id": "scd-strategy",
          "question": "How should historical customer attribute changes (tier, region) be tracked?",
          "context": "Customer segments evolve over time and impact historical revenue attribution.",
          "options": [
            {
              "id": "scd-2",
              "label": "SCD Type 2 (Full History)",
              "description": "Preserves full historical versions using effective_from / effective_to timestamps.",
              "isRecommended": true
            },
            {
              "id": "scd-1",
              "label": "SCD Type 1 (Overwrite)",
              "description": "Overwrites old attributes in place; lower storage cost but loses historical state."
            }
          ],
          "selectedOptionId": "scd-2"
        }
      }
    ]
  }
}
```

### 5.2 `POST /pipelines/{pipeline_id}/plan/approve`

Called when the user finishes answering/skipping the clarifying questions on `/plan` and clicks **"Validate & Build Pipeline"**.

- **Request:**

```json
{
  "planId": "plan_retail_01",
  "selectedAnswers": {
    "scd-strategy": "scd-2",
    "ingestion-frequency": "microbatch-15m",
    "data-quality-strategy": "quarantine-dlq",
    "audit-presentation-format": "reconciliation-table"
  },
  "selectedKpiIds": [
    "net-recognized-revenue",
    "gross-merchandise-volume",
    "idempotent-charge-parity",
    "active-customer-360"
  ]
}
```

- **Response (`200 OK`):** Returns a `UIOP v1.0` envelope that materializes the pipeline nodes, Star Schema warehouse container, edges, and layout on the `/workspace` canvas:

```json
{
  "status": "ACTIVE",
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_plan_approved_01",
    "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
    "baseRevision": 2,
    "source": { "agentId": "builder-agent", "executionId": "exec_build_01" },
    "operations": [
      {
        "op": "node.add",
        "params": {
          "id": "dw_core",
          "type": "datamart",
          "position": { "x": 680, "y": 120 },
          "data": {
            "label": "Enterprise Star Schema",
            "description": "Curated Kimball warehouse container",
            "containerKind": "warehouse",
            "expanded": true
          }
        }
      },
      {
        "op": "node.add",
        "params": {
          "id": "fact_daily_revenue",
          "type": "dataModel",
          "data": {
            "label": "fact_daily_revenue",
            "kind": "table",
            "warehouseRole": "fact",
            "targetContainerId": "dw_core",
            "columns": [
              {
                "name": "revenue_sk",
                "type": "BIGINT",
                "isPrimaryKey": true,
                "isForeignKey": false
              },
              {
                "name": "customer_sk",
                "type": "BIGINT",
                "isPrimaryKey": false,
                "isForeignKey": true,
                "fkRefTable": "dim_customer_360",
                "fkRefColumn": "customer_sk"
              },
              {
                "name": "net_revenue",
                "type": "NUMERIC(14,2)",
                "isPrimaryKey": false,
                "isForeignKey": false
              }
            ]
          }
        }
      },
      {
        "op": "layout.update",
        "params": { "direction": "LR" }
      }
    ]
  }
}
```

---

## 6. Domain 4: Chat, Agent Tasks & UIOP v1.0 Execution

Supports [`chatStore.ts`](../../src/features/chat/store/chatStore.ts), [`AiThoughtPanel.tsx`](../../src/features/workspace/components/AiThoughtPanel.tsx), [`UiopBatchCard.tsx`](../../src/features/uiop/components/UiopBatchCard.tsx), and [`uiopRuntime.ts`](../../src/features/uiop/runtime/uiopRuntime.ts).

### 6.1 `POST /pipelines/{pipeline_id}/chat`

Sends a user message or code review request from the Workspace or Plan page.

- **Request:**

```json
{
  "content": "Add a promotion dimension table and connect it to fact_daily_revenue.",
  "baseRevision": 3,
  "autoApplyUiop": false
}
```

- **Response (`200 OK`):**

```json
{
  "user_message": {
    "id": "msg_u_101",
    "sender": "user",
    "timestamp": "09:30 AM",
    "text": "Add a promotion dimension table and connect it to fact_daily_revenue."
  },
  "agent_message": {
    "id": "msg_a_102",
    "sender": "assistant",
    "timestamp": "09:30 AM",
    "text": "I have prepared a UIOP v1.0 batch to create `dim_promotion` inside your Star Schema warehouse and link `promo_sk` to `fact_daily_revenue`.",
    "uiop": {
      "protocol": "uiop",
      "version": "1.0",
      "messageId": "msg_uiop_promo_01",
      "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
      "baseRevision": 3,
      "source": { "agentId": "builder-agent", "executionId": "exec_promo_01" },
      "operations": [
        {
          "op": "node.add",
          "params": {
            "id": "dim_promotion",
            "type": "resource",
            "data": {
              "label": "dim_promotion",
              "kind": "table",
              "warehouseRole": "dimension",
              "description": "Promotional campaign dimension",
              "columns": [
                {
                  "name": "promo_sk",
                  "type": "BIGINT",
                  "isPrimaryKey": true,
                  "isForeignKey": false
                },
                {
                  "name": "promo_code",
                  "type": "VARCHAR(32)",
                  "isPrimaryKey": false,
                  "isForeignKey": false
                }
              ]
            }
          }
        },
        {
          "op": "edge.add",
          "params": {
            "id": "e_promo_fact",
            "source": "dim_promotion",
            "target": "fact_daily_revenue",
            "type": "foreign_key",
            "data": {
              "fromColumn": "promo_sk",
              "toColumn": "promo_sk",
              "relationship": "foreign_key"
            }
          }
        }
      ]
    },
    "tasks": [
      {
        "id": "task_01",
        "agent_role": "ENGINEER",
        "instruction": "Synthesize dim_promotion DDL and foreign key link",
        "status": "COMPLETED"
      }
    ]
  }
}
```

### 6.2 `POST /pipelines/{pipeline_id}/uiop/ack`

After the frontend's [`executeUiop`](../../src/features/uiop/runtime/uiopRuntime.ts) applies (or rejects) a UIOP batch, the frontend posts the `UiopExecutionReport` so the backend persists the updated graph/plan state and increments the server's `revision`.

- **Request (`UiopExecutionReport`):**

```json
{
  "ok": true,
  "status": "applied",
  "messageId": "msg_uiop_promo_01",
  "workspaceId": "550e8400-e29b-41d4-a716-446655440000",
  "baseRevision": 3,
  "newRevision": 4,
  "appliedCount": 2,
  "summary": [
    "Added table \"dim_promotion\" to warehouse container \"Enterprise Star Schema\".",
    "Connected \"dim_promotion\" → \"fact_daily_revenue\"."
  ],
  "errors": [],
  "timestamp": "2026-10-25T09:30:05.000Z"
}
```

> Full details of all 16 UIOP operations (`node.add`, `node.update`, `node.remove`, `edge.add`, `edge.update`, `edge.remove`, `layout.update`, `panel.add`, `panel.update`, `panel.remove`, `report.update`, `plan.create`, `plan.update`, `question.propose`, `question.answer`, `question.remove`) and the 5 approved panel components are documented in [`docs/BACKEND_UIOP_GUIDE.md`](../BACKEND_UIOP_GUIDE.md).

---

## 7. Domain 5: Independent Audit Agent & Zero-Variance Reconciliation

Supports [`ReconciliationTable.tsx`](../../src/features/validation/components/ReconciliationTable.tsx), [`OperationsAuditView.tsx`](../../src/features/validation/components/OperationsAuditView.tsx), [`DomainAuditRenderer.tsx`](../../src/features/validation/components/DomainAuditRenderer.tsx), and [`src/features/validation/types.ts`](../../src/features/validation/types.ts).

### 7.1 `GET /pipelines/{pipeline_id}/audit` (and `POST /pipelines/{pipeline_id}/audit/run`)

Executes or retrieves the Independent Audit Agent's verification across Finance and Operations domains.

- **Response (`200 OK`) — Exact TypeScript match for `src/features/validation/types.ts`:**

```json
{
  "seal": {
    "auditorId": "audit_agent_isolated_v2",
    "auditorRole": "Independent Audit Agent (Read-Only Context)",
    "separationOfDuties": "Author-isolated from Builder & Transformation Agents; verified against raw source ledgers",
    "verifiedAt": "2026-10-25T09:35:00Z",
    "cryptoSignature": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "domain": "finance",
    "overallStatus": "VERIFIED_ZERO_VARIANCE"
  },
  "financialReconciliation": [
    {
      "id": "fin-rec-1",
      "kpiName": "Net Recognized Revenue",
      "category": "Revenue",
      "sourceLedger": {
        "system": "Stripe + Postgres Raw Ledger",
        "value": 4829140.5,
        "formatted": "$4,829,140.50"
      },
      "warehouse": {
        "layer": "transform_orders_clean (Silver)",
        "value": 4829140.5,
        "formatted": "$4,829,140.50"
      },
      "martKpi": {
        "target": "fact_daily_revenue (Gold)",
        "value": 4829140.5,
        "formatted": "$4,829,140.50"
      },
      "variance": 0,
      "varianceFormatted": "$0.00 (0.00%)",
      "tolerance": "±$0.01 (0.00%)",
      "status": "RECONCILED",
      "formula": "SUM(gross_amount - tax_amount - refund_amount)",
      "assertionSql": "SELECT ABS(src.total - mart.total) <= 0.01 FROM raw_ledger src CROSS JOIN fact_daily_revenue mart;",
      "lastAuditedAt": "2026-10-25T09:35:00Z"
    }
  ],
  "rowConservation": [
    {
      "id": "row-cons-1",
      "stageName": "Bronze Ingestion → Silver Deduplication",
      "sourceLayer": "stg_raw_transactions",
      "targetLayer": "transform_orders_clean",
      "rowsIn": 145000,
      "rowsOut": 142890,
      "rowsFiltered": 1950,
      "rowsQuarantined": 160,
      "conservationDelta": 0,
      "isConserved": true,
      "status": "CONSERVED",
      "notes": "1,950 retry webhook duplicates filtered; 160 malformed payloads routed to DLQ."
    }
  ],
  "stateTransitions": [
    {
      "id": "state-trans-1",
      "entityName": "Order Fulfillment Lifecycle",
      "fromState": "PAYMENT_AUTHORIZED",
      "toState": "ORDER_SETTLED",
      "transitionCount": 142890,
      "completionRate": "99.85%",
      "orphanCount": 0,
      "illegalSkips": 0,
      "averageLatency": "1.4m",
      "status": "OPTIMAL"
    }
  ]
}
```

---

## 8. Domain 6: Dynamic AI Insights & Analytical Graphs (`/audit`)

Supports [`AuditCenterPage.tsx`](../../src/pages/AuditCenterPage.tsx), [`ValidationCenter.tsx`](../../src/features/validation/components/ValidationCenter.tsx), [`DynamicDashboardView.tsx`](../../src/features/insights/components/DynamicDashboardView.tsx), [`DynamicInsightCard.tsx`](../../src/features/insights/components/DynamicInsightCard.tsx), and [`src/features/insights/types.ts`](../../src/features/insights/types.ts).

### 8.1 `GET /pipelines/{pipeline_id}/insights` & `POST /pipelines/{pipeline_id}/insights/refresh`

Returns the top-level summary cards and the array of `AiInsightModel` items for the Insights dashboard. Each insight includes data for one or more of the 4 chart components (`waterfallData`, `cohortData`, `stateFlowData`, `anomalyData`) so the user can even switch chart types interactively on a card.

- **Response (`200 OK`) — Exact TypeScript match for `src/features/insights/types.ts`:**

```json
{
  "summaryCards": [
    { "label": "Net revenue", "value": "$1.15M", "delta": "+9.1%" },
    { "label": "Enterprise retention", "value": "118%", "delta": "+4.5%" },
    {
      "label": "Orders processed",
      "value": "420K",
      "delta": "99.85% delivered"
    },
    { "label": "Outliers", "value": "1", "delta": "Oct 18" }
  ],
  "insights": [
    {
      "id": "insight-net-revenue-bridge",
      "kpiId": "net-recognized-revenue",
      "kpiName": "Net Recognized Revenue",
      "domain": "sales",
      "categoryLabel": "Revenue Decomposition",
      "title": "Gross-to-Net Revenue Bridge (Q3 Settlement)",
      "summary": "Net recognized revenue reached $1,150,000 (+9.1% QoQ), with promotional discounts (-$92K) and refunds (-$48K) within historical guardrails.",
      "aiReasoning": "Selected a Waterfall Decomposition graph because financial gross-to-net reconciliation is an additive/subtractive bridge across ledger adjustments.",
      "aiConfidenceScore": 99.4,
      "selectedGraphType": "waterfall-decomposition",
      "availableGraphOptions": [
        {
          "type": "waterfall-decomposition",
          "label": "Waterfall Bridge",
          "isAiRecommended": true,
          "reasoning": "Best for visualizing gross-to-net ledger deductions and subtotals."
        },
        {
          "type": "anomaly-ribbon",
          "label": "Anomaly Confidence Ribbon",
          "isAiRecommended": false,
          "reasoning": "Highlights daily revenue spikes outside the expected 95% confidence band."
        }
      ],
      "headlineMetrics": [
        {
          "label": "Gross Volume (GMV)",
          "value": "$1.34M",
          "delta": "+11.2%",
          "trend": "up"
        },
        {
          "label": "Net Recognized",
          "value": "$1.15M",
          "delta": "+9.1%",
          "trend": "up"
        },
        {
          "label": "Refund Leakage",
          "value": "3.58%",
          "delta": "-0.4%",
          "trend": "down"
        }
      ],
      "waterfallData": [
        {
          "id": "w1",
          "label": "Gross GMV",
          "amount": 1340000,
          "formatted": "$1.34M",
          "type": "base",
          "note": "Raw Stripe + POS orders"
        },
        {
          "id": "w2",
          "label": "Promo Discounts",
          "amount": -92000,
          "formatted": "-$92K",
          "type": "deduction",
          "driftPct": "-6.8%"
        },
        {
          "id": "w3",
          "label": "Refunds & Chargebacks",
          "amount": -48000,
          "formatted": "-$48K",
          "type": "deduction",
          "driftPct": "-3.6%"
        },
        {
          "id": "w4",
          "label": "Tax & FX Withholding",
          "amount": -50000,
          "formatted": "-$50K",
          "type": "deduction",
          "driftPct": "-3.7%"
        },
        {
          "id": "w5",
          "label": "Net Recognized Revenue",
          "amount": 1150000,
          "formatted": "$1.15M",
          "type": "total",
          "note": "Reconciled to Δ $0.00"
        }
      ],
      "cohortData": [
        { "period": "Day 0", "cohortA": 100, "cohortB": 100, "cohortC": 100 },
        { "period": "Day 30", "cohortA": 104, "cohortB": 82, "cohortC": 68 },
        { "period": "Day 60", "cohortA": 112, "cohortB": 76, "cohortC": 59 },
        { "period": "Day 90", "cohortA": 118, "cohortB": 71, "cohortC": 54 }
      ],
      "stateFlowData": [
        {
          "id": "sf1",
          "name": "Webhook Ingested",
          "count": 420000,
          "ratePct": 100,
          "avgDwellMinutes": 0.2,
          "anomalyCount": 0,
          "status": "optimal",
          "notes": "Zero packet loss on Zetaris ingestion gateway"
        },
        {
          "id": "sf2",
          "name": "Idempotency Verified",
          "count": 419370,
          "ratePct": 99.85,
          "avgDwellMinutes": 1.1,
          "anomalyCount": 12,
          "status": "normal",
          "notes": "630 duplicate retries deduplicated"
        }
      ],
      "anomalyData": [
        {
          "date": "Oct 16",
          "actual": 38200,
          "expectedUpper": 41000,
          "expectedLower": 34000,
          "isAnomaly": false
        },
        {
          "date": "Oct 18",
          "actual": 54800,
          "expectedUpper": 42000,
          "expectedLower": 35000,
          "isAnomaly": true,
          "anomalyDelta": "+30.5% above upper band",
          "anomalyCause": "Flash enterprise renewal batch in EMEA region"
        }
      ],
      "actionableInsights": [
        "Lock SCD Type-2 window on dim_customer_360 prior to Q4 enterprise renewals.",
        "Investigate Oct 18 EMEA flash batch (+30.5% above upper confidence bound)."
      ]
    }
  ]
}
```

---

## 9. Real-Time WebSocket Protocol (`ws://HOST:8000/api/v1/ws/pipelines/{pipeline_id}`)

Instead of firing dozens of granular `node.created` / `edge.created` frames that force full-pipeline refetches, the WebSocket stream should emit **typed envelopes**:

| `type`                  | `payload` Schema                                                      | Frontend Action                                                                                                                       |
| :---------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `"uiop.batch"`          | `UiopEnvelope` (`protocol: "uiop"`, `version: "1.0"`, `operations[]`) | Passed directly to `executeUiop(payload)` to atomically update canvas nodes, containers, edges, plans, questions, panels, or reports. |
| `"chat.message"`        | `ChatMessage` (`id`, `sender`, `text`, `uiop?`, `tasks?`)             | Appended to [`useChatStore`](../../src/features/chat/store/chatStore.ts).                                                             |
| `"agent_task.updated"`  | `AgentTask` (`id`, `agent_role`, `instruction`, `status`)             | Updates the live agent task status badge in the chat thread.                                                                          |
| `"plan.phase_progress"` | `{ liveStep: number, phaseId: string, script?: string }`              | Advances the live AI Thought Process timeline on [`PlanProposalPage.tsx`](../../src/pages/PlanProposalPage.tsx).                      |
| `"audit.updated"`       | Same schema as `GET /pipelines/{id}/audit`                            | Updates the Independent Audit Agent seal & reconciliation tables.                                                                     |
| `"insights.updated"`    | Same schema as `GET /pipelines/{id}/insights`                         | Updates the `/audit` Dynamic Insights dashboard in real time.                                                                         |

---

## 10. Summary Checklist for Backend Implementation Priority

1. **P0 — Core Session & UIOP Transport:**
   - `GET /health`
   - `POST /pipelines`, `GET /pipelines`, `GET /pipelines/{pipeline_id}`, `DELETE /pipelines/{pipeline_id}`
   - `POST /pipelines/{pipeline_id}/chat` (returning `agent_message.uiop: UiopEnvelope`)
   - `POST /pipelines/{pipeline_id}/uiop/ack` (persisting applied UIOP batches & incrementing `revision`)
   - WebSocket `ws://.../ws/pipelines/{pipeline_id}` emitting `"uiop.batch"` and `"chat.message"`
2. **P1 — Plan Proposal & Multi-Source Ingestion:**
   - `POST /pipelines/{pipeline_id}/plan/generate` (emitting `plan.create` + `question.propose`)
   - `POST /pipelines/{pipeline_id}/plan/approve` (emitting `node.add`, `edge.add`, `layout.update`)
   - `POST /pipelines/{pipeline_id}/sources/upload` (`multipart/form-data` for CSV/Parquet/SQL/JSON)
   - `POST /pipelines/{pipeline_id}/sources/connect` (DB & REST API schema introspection)
3. **P2 — Independent Audit Agent & Dynamic Insights:**
   - `GET /pipelines/{pipeline_id}/audit` & `POST /pipelines/{pipeline_id}/audit/run`
   - `GET /pipelines/{pipeline_id}/insights` & `POST /pipelines/{pipeline_id}/insights/refresh`
