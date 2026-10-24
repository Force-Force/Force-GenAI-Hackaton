# Backend Implementation Guide — UI Operations Protocol (UIOP v1.0)

> **Target Audience:** Backend & AI Agent Engineers  
> **Protocol Version:** `uiop` / `1.0`  
> **Frontend Contract Source of Truth:** [`src/contracts/uiop.ts`](../src/contracts/uiop.ts) · [`src/features/uiop/registry/componentRegistry.ts`](../src/features/uiop/registry/componentRegistry.ts) · [`src/features/uiop/runtime/uiopRuntime.ts`](../src/features/uiop/runtime/uiopRuntime.ts)

---

## 1. Purpose & Architectural Overview

In AuraBI, AI agents (`planner-agent`, `builder-agent`, `audit-agent`, etc.) do **not** mutate frontend state through ad-hoc REST routes or raw code injection. Instead, the backend emits **UI Operations Protocol (`UIOP v1.0`)** envelopes.

UIOP v1.0 is a **declarative, versioned, atomic batch protocol** that allows backend agents to:

1. **Manipulate the ETL Canvas (`XYFlow`)** — Add, update, remove, and connect sources, SQL/Python transformations, warehouse tables (`fact`, `dimension`, `generated`), and data marts, or trigger automatic DAG layout.
2. **Create & Refine Architecture Plans** — Populate or update multi-stage pipeline plans, AI reasoning phases, KPI reconciliation contracts, and compiled ANSI SQL DDL.
3. **Propose & Resolve Clarifying Questions** — Present stepped architectural trade-off questions with recommended options before generating or modifying a blueprint.
4. **Open Approved Inspection Panels & Audit Reports** — Instantiate pre-registered frontend panels (e.g., `DataQualityPanel`, `KpiReconciliationPanel`) and publish evidence-backed verification reports.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           BACKEND / AI AGENTS                            │
│  (Planner Agent · Builder Agent · Transformation Agent · Audit Agent)    │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │
                     1. Emits UIOP v1.0 JSON Envelope
                     (via WebSocket, SSE, or HTTP Response)
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND UIOP RUNTIME EXECUTOR                      │
│  Step 1: Receive Envelope                                                │
│  Step 2: Validate Envelope Header (protocol="uiop", version="1.0")       │
│  Step 3: Validate Operation Payloads (Zod Discriminated Union)           │
│  Step 4: Check Idempotency (messageId) & Revision (baseRevision)         │
│  Step 5: Simulate Batch Semantics (All-or-Nothing Atomic Verification)   │
│  Step 6: Commit State Atomically (PipelineStore + PlanStore + Workspace) │
│  Step 7: Render & Focus Updated Canvas / Plan / Question View            │
│  Step 8: Emit UiopExecutionReport (applied / rejected + error codes)     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Top-Level UIOP Envelope Specification

Every UIOP payload sent from the backend to the frontend **must** conform to the `UiopEnvelope` schema:

```json
{
  "protocol": "uiop",
  "version": "1.0",
  "messageId": "msg_01J8Z9K2X4",
  "workspaceId": "workspace_01",
  "baseRevision": 1,
  "source": {
    "agentId": "builder-agent",
    "executionId": "exec_9921"
  },
  "operations": [
    {
      "op": "node.add",
      "params": { ... }
    }
  ]
}
```

### Envelope Field Reference

| Field                | Type              | Required | Constraints & Semantics                                                                                                             |
| :------------------- | :---------------- | :------: | :---------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`           | `"uiop"`          |   Yes    | Must be the exact literal `"uiop"`.                                                                                                 |
| `version`            | `"1.0"`           |   Yes    | Must be the exact literal `"1.0"`.                                                                                                  |
| `messageId`          | `string`          |   Yes    | Non-empty unique ID per envelope (UUIDv4/ULID). Used for idempotency; duplicate `messageId`s are rejected with `DUPLICATE_MESSAGE`. |
| `workspaceId`        | `string`          |   Yes    | Identifier of the active workspace (default `"workspace_01"`).                                                                      |
| `baseRevision`       | `integer >= 0`    |   Yes    | The workspace revision number the agent observed when generating the batch. Increments by `+1` after every applied UIOP batch.      |
| `source.agentId`     | `string`          |   Yes    | Identifier of the agent emitting the batch (e.g., `"planner-agent"`, `"builder-agent"`, `"audit-agent"`).                           |
| `source.executionId` | `string`          |   Yes    | Trace/run ID for observability and audit logging.                                                                                   |
| `operations`         | `UiopOperation[]` |   Yes    | Ordered array of `1` to `50` operations (`MAX_UIOP_OPERATIONS = 50`). Executed sequentially in an atomic transaction.               |

> [!IMPORTANT]
> **Atomic Batch Guarantee (All-or-Nothing):**  
> The frontend simulates all operations in `operations[]` in order before mutating any store. If operation `#4` in a 5-operation batch fails schema or semantic validation (for example, referencing a non-existent node ID), **the entire batch is rejected** and operations `#1–#3` are rolled back.

---

## 3. Complete Operation Catalog (`operations[]`)

Each item in `operations` is a discriminated union keyed by `"op"`:

```ts
type UiopOperationType =
  // 1. Canvas / Graph Operations
  | "node.add"
  | "node.update"
  | "node.remove"
  | "edge.add"
  | "edge.update"
  | "edge.remove"
  | "layout.update"
  // 2. UI Panels & Structured Reports
  | "panel.add"
  | "panel.update"
  | "panel.remove"
  | "report.update"
  // 3. Architecture Plans & Clarifying Questions
  | "plan.create"
  | "plan.update"
  | "question.propose"
  | "question.answer"
  | "question.remove";
```

---

### 3.1 Canvas & Graph Operations

#### A. `node.add`

Creates a node on the ETL canvas (or adds a warehouse table directly inside the Star Schema `warehouse` container).

```json
{
  "op": "node.add",
  "params": {
    "id": "dim_customer_360",
    "type": "dataModel",
    "position": { "x": 420, "y": 200 },
    "data": {
      "label": "dim_customer_360",
      "description": "Conformed SCD Type-2 customer dimension",
      "kind": "table",
      "warehouseRole": "dimension",
      "columns": [
        {
          "name": "customer_sk",
          "type": "BIGINT",
          "isPrimaryKey": true,
          "isForeignKey": false,
          "description": "Surrogate primary key"
        },
        {
          "name": "customer_id",
          "type": "VARCHAR(64)",
          "isPrimaryKey": false,
          "isForeignKey": false
        }
      ]
    }
  }
}
```

**`node.add` Parameters (`params`):**

- `id` (`string`, required): Unique node ID. Fails with `DUPLICATE_ENTITY_ID` if it already exists.
- `type` (`"dataModel" | "resource" | "processing" | "datamart"`, default `"dataModel"`):
  - Use `"resource"` or `"dataModel"` for sources, staging tables, dimensions, and facts.
  - Use `"processing"` for SQL/Python/Spark/dbt transformation nodes.
  - Use `"datamart"` for container nodes (`warehouse`, `database`, `datamart`).
- `position` (`{ x: number, y: number }`, optional): Canvas coordinates.
- `data` (object, required):
  - `label` (`string`, required): Table or step name.
  - `description` (`string`, default `""`): Human-readable description.
  - `kind` (`"database" | "warehouse" | "table" | "source" | "external"`, optional)
  - `warehouseRole` (`"fact" | "dimension" | "source" | "generated"`, optional):
    - **Automatic Warehouse Container Routing:** When a `warehouse` container node exists on the canvas and `warehouseRole` is `"fact"`, `"dimension"`, or `"generated"` (or `targetContainerId` is provided), the frontend automatically places the table inside the warehouse container's internal Star Schema sub-graph.
  - `format` (optional, for sources): `"csv" | "xlsx" | "json" | "parquet" | "api" | "postgresql" | "mysql" | "snowflake" | "salesforce" | "stripe" | "mongodb" | "generic"`
  - `columns` (`UiopColumn[]`, default `[]`):
    - `name` (`string`), `type` (`string`), `isPrimaryKey` (`boolean`), `isForeignKey` (`boolean`), `fkRefTable` (`string`, optional), `fkRefColumn` (`string`, optional), `description` (`string`, optional).
  - **For `"processing"` nodes:**
    - `language` (`"sql" | "python"`, default `"sql"`)
    - `engine` (`"sql" | "python" | "spark" | "pandas" | "dbt"`, optional)
    - `code` (`string`, optional): SQL query or Python transformation script.
    - `inputColumns` (`string[]`, optional), `outputColumns` (`string[]`, optional)
  - **For `"datamart"` container nodes:**
    - `containerKind` (`"warehouse" | "database" | "datamart"`, default `"datamart"`)
    - `expanded` (`boolean`, default `false`)

---

#### B. `node.update`

Updates an existing top-level canvas node or a table nested inside a `datamart`/`warehouse` container.

```json
{
  "op": "node.update",
  "params": {
    "id": "proc_clean_orders",
    "position": { "x": 520, "y": 180 },
    "data": {
      "label": "transform_orders_clean",
      "engine": "dbt",
      "language": "sql",
      "code": "SELECT DISTINCT ON (charge_id) * FROM stg_raw_transactions WHERE gross_amount > 0;"
    }
  }
}
```

- Fails with `ENTITY_NOT_FOUND` if `params.id` does not exist on the canvas or inside any container.

---

#### C. `node.remove`

Removes a node (and optionally its incident edges).

```json
{
  "op": "node.remove",
  "params": {
    "id": "stg_legacy_feed",
    "cascadeEdges": true
  }
}
```

- `cascadeEdges` (`boolean`, default `true`): When `true`, automatically deletes any edges connected to `id`. When `false`, fails with `DEPENDENCY_CONFLICT` if the node still has connected edges.

---

#### D. `edge.add`, `edge.update`, `edge.remove`

Manages lineage and foreign-key relationships between nodes (both top-level canvas nodes and warehouse child tables).

```json
{
  "op": "edge.add",
  "params": {
    "id": "e_dim_cust_to_fact_rev",
    "source": "dim_customer_360",
    "target": "fact_daily_revenue",
    "type": "foreign_key",
    "data": {
      "label": "customer_sk",
      "fromColumn": "customer_sk",
      "toColumn": "customer_sk",
      "relationship": "foreign_key"
    }
  }
}
```

- **Intra-Batch Ordering Rule:** You may add nodes and connect them with `edge.add` in the **same** UIOP envelope, provided the `node.add` operations appear **earlier** in the `operations` array than the `edge.add` operation.
- If `source` or `target` does not exist by the time `edge.add` is evaluated, the batch is rejected with `ENTITY_NOT_FOUND`.

---

#### E. `layout.update`

Triggers automatic Dagre DAG layout (`LR` or `TB`) and/or applies explicit node coordinate overrides.

```json
{
  "op": "layout.update",
  "params": {
    "direction": "LR",
    "positions": {
      "src_postgres": { "x": 80, "y": 120 }
    }
  }
}
```

---

### 3.2 Architecture Plan & Clarifying Question Operations

These operations drive the **Plan Proposal Page (`/plan`)** and the **KPI & Audit Reconciliation** views.

#### A. `plan.create` & `plan.update`

`plan.create` replaces the entire architectural plan blueprint; `plan.update` patches any subset of plan properties (`title`, `prompt`, `summary`, `stages`, `reasoningPhases`, `kpis`, `selectedKpiIds`, `compiledSql`).

```json
{
  "op": "plan.update",
  "params": {
    "title": "Retail Lakehouse Master Pipeline",
    "summary": "Kimball Star Schema with isolated KPI reconciliation.",
    "stages": [
      {
        "id": "stage-1",
        "number": "01",
        "title": "Raw Source Ingestion & Bronze Staging",
        "category": "Ingestion",
        "description": "Extract transactional streams into immutable staging tables.",
        "tables": ["stg_raw_transactions", "stg_customer_events"],
        "technologies": ["PostgreSQL", "Stripe API", "Zetaris"]
      }
    ],
    "reasoningPhases": [
      {
        "id": "phase-1",
        "stepIndex": 1,
        "title": "Phase 1: Source Discovery & Schema Profiling",
        "scripts": ["executing source_catalog_inspector.py..."],
        "reasoning": "Detected candidate primary keys on customer_id and stripe_charge_id."
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
        "description": "Reconciles net settled revenue across Stripe and Postgres against fact_daily_revenue."
      }
    ],
    "selectedKpiIds": ["net-recognized-revenue"],
    "compiledSql": "CREATE TABLE dim_customer_360 (\n  customer_sk BIGINT PRIMARY KEY\n);"
  }
}
```

---

#### B. `question.propose`, `question.answer`, `question.remove`

Allows the AI Planner Agent to propose architectural decision questions to the user and record answers.

```json
{
  "op": "question.propose",
  "params": {
    "id": "scd-strategy",
    "question": "How should historical changes to customer attributes be tracked?",
    "context": "Customer tier and billing region change periodically and affect historical cohort revenue.",
    "options": [
      {
        "id": "scd-2",
        "label": "SCD Type 2 (Full History)",
        "description": "Tracks effective_from / effective_to windows with surrogate keys.",
        "isRecommended": true
      },
      {
        "id": "scd-1",
        "label": "SCD Type 1 (Overwrite)",
        "description": "Overwrites old attributes in place; simplest storage footprint."
      }
    ],
    "selectedOptionId": "scd-2"
  }
}
```

- `options` must contain **at least 2 options** (`min(2)`).
- `question.answer` takes `{ "id": "<questionId>", "optionId": "<optionId>" }`. If `optionId` is not present in the question's `options[]`, the runtime rejects the batch with `INVALID_OPTION`.

---

### 3.3 Approved UI Panels & Structured Reports

For security, the frontend **never** executes dynamic JavaScript or arbitrary HTML from the backend. `panel.add` and `panel.update` are validated against a strict component whitelist in [`componentRegistry.ts`](../src/features/uiop/registry/componentRegistry.ts).

#### Approved `component` Whitelist for `panel.add`

| `component` Name           | Purpose                                                                    | Allowed `config` Schema                                                                                                |
| :------------------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `"DataQualityPanel"`       | Displays null ratios and missing value checks for a dataset.               | `{ datasetId: string, showMissingValues?: boolean, nullThresholdPct?: number (0..100) }`                               |
| `"ValidationSummaryPanel"` | Displays primary/foreign key and naming standard diagnostics.              | `{ strictMode?: boolean, focusCategory?: "keys" \| "relationships" \| "standards" \| "naming" }`                       |
| `"LineageInspectorPanel"`  | Inspects upstream/downstream column lineage for a node.                    | `{ rootNodeId: string, depth?: number (1..10) }`                                                                       |
| `"KpiReconciliationPanel"` | Renders the Independent Audit Agent's ledger-vs-mart reconciliation table. | `{ kpiIds?: string[], presentationFormat?: "reconciliation-table" \| "cohort-drift-matrix" \| "checksum-parity-log" }` |
| `"PlanStageSummaryPanel"`  | Summarizes architectural stages and compiled SQL preview.                  | `{ stageId?: string, showSqlPreview?: boolean }`                                                                       |

**Example `panel.add` Operation:**

```json
{
  "op": "panel.add",
  "params": {
    "id": "panel_dq_revenue",
    "component": "DataQualityPanel",
    "title": "Fact Daily Revenue — Data Quality",
    "config": {
      "datasetId": "fact_daily_revenue",
      "showMissingValues": true,
      "nullThresholdPct": 2.5
    }
  }
}
```

> Any unknown `component` name fails with `UNREGISTERED_COMPONENT`. Any invalid `config` property fails with `INVALID_COMPONENT_CONFIG`.

#### `report.update`

Upserts a structured markdown & evidence report (used by the Independent Audit Agent):

```json
{
  "op": "report.update",
  "params": {
    "id": "report_audit_01",
    "title": "Independent KPI Reconciliation Report",
    "summary": "All 4 selected KPIs passed zero-variance ledger verification.",
    "sections": [
      {
        "id": "sec_rev",
        "heading": "Net Recognized Revenue Parity",
        "bodyMd": "Verified `$4,829,140.50` across `stg_raw_transactions` and `fact_daily_revenue`.",
        "verified": true,
        "evidenceRefs": [
          "fact_daily_revenue.net_revenue",
          "stg_raw_transactions.gross_amount"
        ]
      }
    ]
  }
}
```

---

## 4. Execution Report & Error Handling (`UiopExecutionReport`)

Every time the frontend executes a UIOP envelope, `executeUiop(envelope)` returns a structured `UiopExecutionReport` (which can be sent back to the backend over WebSocket or REST so the agent knows whether its batch succeeded or why it was rejected):

```json
{
  "ok": true,
  "status": "applied",
  "messageId": "msg_01J8Z9K2X4",
  "workspaceId": "workspace_01",
  "baseRevision": 1,
  "newRevision": 2,
  "source": {
    "agentId": "builder-agent",
    "executionId": "exec_9921"
  },
  "appliedCount": 3,
  "summary": [
    "Added table \"dim_customer_360\" to warehouse container \"Enterprise Star Schema\".",
    "Added processing node \"transform_orders_clean\".",
    "Connected \"transform_orders_clean\" → \"dim_customer_360\"."
  ],
  "focusNodeId": "dim_customer_360",
  "navigatedTo": "/workspace",
  "errors": [],
  "timestamp": "2026-10-24T16:30:00.000Z"
}
```

### Error Codes Reference (`UiopErrorCode`)

When `ok === false` (`status: "rejected"`), `errors[]` contains one or more `UiopValidationError` objects:

| Error Code                 | Cause                                                                                             | Recommended Backend / Agent Action                                                                         |
| :------------------------- | :------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| `INVALID_ENVELOPE`         | Missing required header fields or `operations` array is empty / exceeds 50 items.                 | Fix top-level envelope generator.                                                                          |
| `UNSUPPORTED_VERSION`      | `protocol !== "uiop"` or `version !== "1.0"`.                                                     | Pin backend serializer to `protocol: "uiop"`, `version: "1.0"`.                                            |
| `SCHEMA_VALIDATION_FAILED` | An operation's `params` failed Zod schema validation (missing required field, wrong enum).        | Feed `errors[0].message` and `operationIndex` back to the agent's structured-output retry loop.            |
| `DUPLICATE_MESSAGE`        | `messageId` was already applied in this workspace session.                                        | Safely ignore (idempotent no-op) or generate a fresh `messageId` for new intent.                           |
| `STALE_REVISION`           | Envelope `baseRevision` does not match the frontend's current `revision`.                         | Fetch the latest workspace state & `revision`, rebase the operation batch, and resend.                     |
| `UNREGISTERED_COMPONENT`   | `panel.add` requested a component not in `APPROVED_PANEL_COMPONENTS`.                             | Restrict LLM tool schema for `panel.add` to the 5 approved component names.                                |
| `INVALID_COMPONENT_CONFIG` | `panel.add` or `panel.update` `config` failed the component's Zod schema.                         | Match the component's exact `config` schema in Section 3.3.                                                |
| `DUPLICATE_ENTITY_ID`      | `node.add`, `edge.add`, or `panel.add` used an `id` that already exists.                          | Use `node.update` / `edge.update` / `panel.update` when modifying existing entities.                       |
| `ENTITY_NOT_FOUND`         | `*.update`, `*.remove`, or `edge.add` referenced an `id` (`source`/`target`) that does not exist. | Ensure `node.add` precedes `edge.add` in the batch, or verify existing node IDs in the workspace snapshot. |
| `DEPENDENCY_CONFLICT`      | `node.remove` with `cascadeEdges: false` was called on a node that still has connected edges.     | Either set `cascadeEdges: true` or emit `edge.remove` operations first.                                    |
| `INVALID_OPTION`           | `question.answer` supplied an `optionId` not found in the question's `options[]`.                 | Use one of the `options[].id` values defined on that question.                                             |

---

## 5. Recommended Backend Integration Pattern

### 5.1 Chat / Agent Endpoint Contract

When the frontend sends a user prompt (or answers clarifying questions), the backend response can include both conversational markdown (`reply` / `text`) and an optional `uiop` envelope:

```json
{
  "reply": "I have added the `dim_promotion` dimension table and linked it to `fact_daily_revenue`.",
  "tasks": [
    {
      "id": "task_1",
      "agent_role": "Dimensional Builder Agent",
      "instruction": "Create dim_promotion and foreign key link",
      "status": "COMPLETED"
    }
  ],
  "uiop": {
    "protocol": "uiop",
    "version": "1.0",
    "messageId": "msg_promo_001",
    "workspaceId": "workspace_01",
    "baseRevision": 4,
    "source": {
      "agentId": "builder-agent",
      "executionId": "exec_promo_001"
    },
    "operations": [
      {
        "op": "node.add",
        "params": {
          "id": "dim_promotion",
          "type": "resource",
          "position": { "x": 260, "y": 240 },
          "data": {
            "label": "dim_promotion",
            "kind": "table",
            "warehouseRole": "dimension",
            "description": "Promotional campaign & discount code dimension",
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
              },
              {
                "name": "discount_pct",
                "type": "NUMERIC(5,2)",
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
          "id": "e_promo_to_fact",
          "source": "dim_promotion",
          "target": "fact_daily_revenue",
          "type": "foreign_key",
          "data": {
            "fromColumn": "promo_sk",
            "toColumn": "promo_sk",
            "relationship": "foreign_key"
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

### 5.2 Backend Checklist for Agent Prompting / Structured Outputs

1. **Pass Current Workspace Context to the LLM:** Include the current `workspaceId`, `revision` (`baseRevision`), existing node IDs/labels, and active plan stages/questions in the agent's system context so it never hallucinates non-existent node IDs.
2. **Generate `messageId` & `source` on the Backend:** Do not ask the LLM to invent UUIDs for `messageId`, `workspaceId`, or `baseRevision`. Have the LLM output only `operations: UiopOperation[]`, and wrap them in the `UiopEnvelope` header in deterministic backend code.
3. **Order Operations Topologically:** When generating a pipeline in a single batch, always emit:
   - `node.add` (containers/sources/tables/transforms) **first**
   - `edge.add` (connections between those nodes) **second**
   - `layout.update` (`direction: "LR"`) **last**
