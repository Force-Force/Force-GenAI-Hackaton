# Comprehensive Analysis of Backend Deficiencies & Frontend Discrepancies

**Date:** October 2026  
**Project:** AuraBI / DataPipe Platform  
**Scope:** Static comparative audit between `frontend/` (React 19 / TypeScript / Vite / ReactFlow / UIOP) and `backend/` (FastAPI / SQLAlchemy / PostgreSQL / Zetaris / Nemotron).

---

## 1. Executive Summary

AuraBI's frontend is designed as an **autonomous, agent-driven visual workspace** governed by the **UI Operations Protocol (UIOP v1.0)**. The frontend expects a backend capable of:
1. Emitting declarative, atomic graph mutations (`node.*`, `edge.*`, `plan.*`, `insight.*`, `question.*`).
2. Maintaining column-level lineage and handle connections between tables and transformations.
3. Managing external data sources (Parquet, REST Web APIs, Snowflake, MySQL, PostgreSQL, and Zetaris virtualization).
4. Persisting complete architectural snapshots (including dimensional stages, KPI definitions, and human-in-the-loop decisions) across revisions.
5. Tracking operational run telemetry (throughput, duration, granular step phases).

In contrast, the actual backend is a **partially completed MVP** centered primarily around:
- A PostgreSQL relational schema with basic CRUD for nodes and node-to-node edges.
- A Guardian approval gateway for pausing execution runs on high-risk operations.
- Dedicated standalone analytics agents querying a **Zetaris** Spark SQL cluster and **Nemotron** LLM.

Because of this architectural divergence, several core frontend features either rely on simulated browser mocks, call non-existent endpoints, or suffer silent data loss when communicating with the live backend.

---

## 2. API Endpoint Discrepancies & Missing Routes

| Frontend Expectation & Caller | Backend Reality | Severity | Root Cause & File Reference |
| :--- | :--- | :--- | :--- |
| **Dynamic Insight Generation**<br>`POST /pipelines/{id}/insights/generate`<br>Called in `etlAndAgentApi.ts:54` | **Route Does Not Exist** in `backend/app/api/v1/insights.py`. Backend only provides `GET /pipelines/{id}/insights`. | **Critical** | Frontend expects an endpoint to generate custom KPI insights based on prompt and domain filters (`PipelineInsightsGenerateResponse`). Calling this results in HTTP 404/405. |
| **Plan Approval Execution**<br>`POST /pipelines/{id}/plan/approve`<br>Implemented in `plan.py:157` | **Frontend Never Calls It.**<br>In `PlanProposalPage.tsx:252`, frontend directly calls `PATCH /pipelines/{id}` with raw stages and answers. | **High** | The backend's `approve_plan` route sets pipeline status to `ACTIVE`, creates QA and Auditor agent tasks, and records approval. By calling `PATCH` directly, the frontend bypasses backend task generation and **completely overwrites/erases `architecture_design["plan"]`**. |
| **Data Source Ingestion & Registration**<br>Simulated in `DataSourceManager.tsx` & `ImportDataModal.tsx` | **Zero Backend Endpoints.**<br>No routes for `GET/POST /data-sources`, connection testing, file uploads, or catalog discovery. | **High** | Frontend supports Parquet, REST APIs, Snowflake, MySQL, and PostgreSQL. Backend only supports reading PostgreSQL tables defined in local `.env` via `db_introspection.py`. |
| **Pipeline Schema Validation**<br>Validation Center (`/audit`) & `validationRules.ts` | **Zero Backend Endpoints.**<br>No route for `POST /pipelines/{id}/validate` or automated architectural audits. | **Medium** | All foreign key, primary key, and star-schema dimensional validation checks run entirely client-side in browser JavaScript. |
| **Agent Trace Persistence**<br>`GET /agent/traces/{request_id}`<br>Called in `etlAndAgentApi.ts:83` | **In-Memory Ephemeral Storage.**<br>Stored in a transient Python dictionary (`_traces: dict`) in `analysis.py:15`. | **Medium** | Traces are lost whenever the backend server restarts, worker threads cycle, or in multi-process deployments. |
| **Dead/Orphaned Route**<br>`backend/app/api/v1/hackathon.py` | **Unregistered Router.**<br>`hackathon.py` defines `/agent/query` but is never registered in `backend/app/main.py`. | **Low** | Superseded by `analysis.py`, but left unmaintained in codebase. |

---

## 3. Data Model & Database Schema Mismatches

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND EXPECTS                     │
│  - Edges with column-level handles (fromColumn/to)     │
│  - Rich Node categories: resource, processing, datamart│
│  - Full Plan, Stages, and KPIs inside Revisions        │
│  - Metric Telemetry: records_processed, duration_sec   │
└───────────────────────────┬────────────────────────────┘
                            │
                   PERSISTENCE MISMATCH
                            │
┌───────────────────────────▼────────────────────────────┐
│                   BACKEND ACTUALLY HAS                 │
│  - Edges: only (source_node_id, target_node_id)        │
│  - Nodes: type (SOURCE/TRANSFORM/SINK), JSONB internal │
│  - Revisions: snapshots only 'nodes' and 'edges' tables│
│  - Runs: generic context JSONB without typed metrics   │
└────────────────────────────────────────────────────────┘
```

### 3.1 Edges & Column-Level Lineage (Silent Data Loss)
* **Frontend (`src/types/pipeline.ts` & `src/contracts/backendApi.ts`):**
  Edges connect specific source columns to destination columns:
  ```ts
  interface PipelineEdgeData {
    fromColumn?: string;
    toColumn?: string;
    relationship?: 'foreign_key' | 'data_flow';
  }
  // ReactFlow edge includes sourceHandle and targetHandle
  ```
* **Backend Database (`backend/app/models/edge.py`):**
  ```python
  class Edge(Base):
      __tablename__ = "edges"
      id = mapped_column(UUID, primary_key=True)
      pipeline_id = mapped_column(UUID, ForeignKey("pipelines.id"))
      source_node_id = mapped_column(UUID, ForeignKey("nodes.id"))
      target_node_id = mapped_column(UUID, ForeignKey("nodes.id"))
  ```
* **Discrepancy:** The backend database **lacks columns or JSON payload storage for handles and column names**. When the user draws connections between specific table columns in the UI, saving the graph to the backend strips `fromColumn`, `toColumn`, and handle anchors. On pipeline reload, edges degrade to generic node-to-node arrows.

---

### 3.2 Pipeline Revisions & Rollback Data Loss
* **Frontend Expects (`src/contracts/projectHistory.ts`):**
  Each revision snapshot must retain:
  - Complete graph layout (`nodes`, `edges`).
  - Kimball planning architecture (`planTitle`, `stages`, `kpis`).
  - Metadata: `stage_count`, `tags`, `operations_summary`.
* **Backend Implementation (`backend/app/services/revision_service.py`):**
  ```python
  async def _snapshot(db: AsyncSession, pipeline_id: UUID) -> dict:
      nodes = (await db.execute(select(Node).where(Node.pipeline_id == pipeline_id))).scalars().all()
      edges = (await db.execute(select(Edge).where(Edge.pipeline_id == pipeline_id))).scalars().all()
      return {
          "nodes": [...],
          "edges": [...]
      }
  ```
* **Discrepancy:**
  1. `stage_count` and `tags` are **not columns** in the `pipeline_revisions` table (they only exist as default placeholders in Pydantic's `PipelineRevisionRead`).
  2. `_snapshot()` **does not capture `pipeline.architecture_design`**. It only saves raw `Node` and `Edge` table rows.
  3. When `POST /pipelines/{id}/revisions/{rev_id}/rollback` is called, the database restores nodes and edges, but **wipes out all stages, KPIs, reasoning phases, and decisions** previously configured in the Plan Proposal page.

---

### 3.3 Pipeline Runs & Telemetry Discrepancies
* **Frontend Expects (`src/contracts/projectHistory.ts`):**
  - Run metadata: `run_number` (int), `trigger_type` (`MANUAL`, `SCHEDULED`, `AGENT_OPTIMIZATION`, `WEBHOOK`), `duration_seconds`, `records_processed`, `nodes_executed`, `total_nodes`.
  - Run step events: `phase` (string), `status` (`INFO`, `RUNNING`, `SUCCESS`, `WARNING`, `ERROR`), `duration_ms` (int).
* **Backend Model (`backend/app/models/pipeline_run.py` & `pipeline_run_event.py`):**
  - `PipelineRun` contains only: `id`, `pipeline_id`, `status`, `current_node_id`, `context` (JSONB), `error_message`, `started_at`, `completed_at`, `created_at`.
  - `PipelineRunEvent` contains only: `id`, `run_id`, `pipeline_id`, `event_type` (Enum), `message_md`, `payload` (JSONB), `created_at`.
* **Frontend Workaround (`src/services/api/historyApi.ts:54-95`):**
  Because the backend lacks these fields, the frontend is forced to manufacture artificial data:
  - Fabricates `run_number` as `runs.length - idx`.
  - Calculates `duration_seconds` client-side from timestamp deltas.
  - Inspects `event_type` with regex (`/FAIL|ERROR/`, `/APPROVAL|PAUSE/`, etc.) to synthesize a status.

---

## 4. The UIOP (UI Operations Protocol) Divide

The core design principle of AuraBI is that **autonomous AI agents converse with the UI using declarative UIOP envelopes** ([`src/contracts/uiop.ts`](file:///media/kyler/F1/dev-force/Force-GenAI-Hackaton/frontend/src/contracts/uiop.ts)).

### 4.1 Where Backend Emits UIOP
* `POST /pipelines/{id}/plan/generate` in `plan.py:145`: Returns `plan.create`, `plan.update`, and `question.propose`.
* `GET /pipelines/{id}/insights` in `insights_service.py:221`: Returns `insight.clear`, `insight.set_summary`, and `insight.add`.

### 4.2 Where Backend Completely Breaks UIOP (The Chat Problem)
* In the visual workspace, the prompt bar and AI thought panel send instructions to `POST /pipelines/{id}/chat` ([`backend/app/api/v1/chat.py`](file:///media/kyler/F1/dev-force/Force-GenAI-Hackaton/backend/app/api/v1/chat.py)).
* In [`chat_service.py:41-97`](file:///media/kyler/F1/dev-force/Force-GenAI-Hackaton/backend/app/services/chat_service.py#L41-L97), user prompts are forwarded directly to `AnalysisAgent.run(content)`.
* `AnalysisAgent` is a **banking SQL query agent** connected to Zetaris. It searches tables in `banking_demo` using `run_sql`.
* It returns **conversational markdown text and an empty task list (`agent_tasks: []`)**.
* **Impact:**
  - If a user in the workspace types: *"Add a customer loyalty dimension table"*, *"Connect orders to clean_orders"*, or *"Add updated_at column to dim_customer"*, the backend chat agent **cannot modify the graph**.
  - It does not emit `node.add`, `edge.add`, or `node.update` operations.
  - The chat responds with banking data analysis text instead of acting as a data warehouse architect.

---

## 5. Data Source Virtualization & External Ingestion

| Capability | Frontend State | Backend State | Missing Backend Component |
| :--- | :--- | :--- | :--- |
| **Parquet Files** | Ingestion modal parses metadata, Snappy/ZSTD compression, row groups, and schema (`inferParquetSchema` in `sourceCatalog.ts`). | No Parquet parser or storage handler. | No file upload handler or local file reader (e.g. PyArrow / DuckDB). |
| **Web REST APIs** | Ingestion modal allows setting HTTP method, headers, Bearer tokens, JSON paths, and payload preview. | No generic HTTP ingestion client. | No scheduled polling or streaming fetch worker for external webhooks/APIs. |
| **External Databases** | Connectors for PostgreSQL, MySQL, and Snowflake configured in UI. | Hardcoded PostgreSQL connection only. | Database connections cannot be saved per pipeline; requires environment variable `POSTGRES_*`. |
| **Zetaris Virtual Layer** | Simulates zero-ETL virtual views (`zetaris.<format>.<name>`). | Hardcoded to read single database (`ZETARIS_BANK_DATABASE`). | No dynamic schema registration via Zetaris REST API. |

---

## 6. Execution Engine & Guardian Approvals

When a user clicks **"Run Pipeline"** in the top navigation bar:
1. Backend creates a `PipelineRun` with status `RUNNING`.
2. Backend immediately registers a `GuardianApproval` of type `PIPELINE_RUN` and pauses execution in `AWAITING_APPROVAL`.
3. After the user approves via `POST /approvals/{id}/decide`, the engine enters `run_initial_study()` in `workflow_study_service.py`.
4. It introspects pipeline sources for PostgreSQL connections. If nodes do not specify valid PostgreSQL table names (`data.table`), it logs non-connected status.
5. It generates contextual user questions via `question_generator.py` and pauses again in `AWAITING_USER_INPUT`.
6. Only when all questions are answered does it attempt execution. However, actual node execution is limited to:
   - Profiling PostgreSQL tables (`PROFILER`).
   - Running SQL queries on local PostgreSQL (`ENGINEER`).
   - Checking PII (`GUARDIAN`).
7. **It cannot execute Python scripts, Spark transformations, dbt models, or Parquet sinks**, despite the frontend offering these choices in the node inspector.

---

## 7. Why This Machine Cannot Run This Backend

The backend cannot be fully started or run locally due to the following infrastructure prerequisites:

1. **PostgreSQL 15+ Database Server:**
   - Requires migrations `001_initial_schema`, `002_guardian_execution`, `003_user_questions`, and `004_pipeline_revisions`.
   - Requires custom PostgreSQL enum types (`pipeline_run_status`, `guardian_operation_type`, `agent_role`, etc.).
   - Will return HTTP 503 (`database_schema_error`) if tables are absent.
2. **Zetaris Virtual Data Warehouse Cluster:**
   - `ZetarisClient` requires a live remote or Docker-hosted Zetaris REST instance (`ZETARIS_REST_URL`, port 8888) with an authorized `ZETARIS_API_KEY` and `ZETARIS_ORG_ID`.
   - Calls to `/plan/generate`, `/insights`, and `/agent/query` will raise `ZetarisError` and return HTTP 500/502 without this connection.
3. **NVIDIA NIM / Nightshift Nemotron LLM Server:**
   - `NemotronClient` expects an OpenAI-compatible endpoint hosting `nvidia/nemotron-4-340b-instruct` or `meta/llama-3.1-70b-instruct`.
   - Running these models locally requires enterprise-grade GPUs (multiple A100/H100 80GB cards) and high VRAM.
   - Without an active remote API key and network connectivity, agent planning calls time out.

---

## 8. Prioritized Remediation Roadmap

To achieve full parity between frontend and backend without running external heavy models:

### High Priority
1. **Implement `POST /api/v1/pipelines/{id}/insights/generate`:**  
   Add this route in `backend/app/api/v1/insights.py` to accept `{ prompt?: string, domains?: string[] }` and return dynamic KPI cards and chart payloads.
2. **Wire Frontend Plan Approval to `POST /plan/approve`:**  
   Update `frontend/src/pages/PlanProposalPage.tsx` to call the existing `POST /pipelines/{id}/plan/approve` endpoint instead of directly overwriting `PATCH /pipelines/{id}`.
3. **Add Column & Handle Support to `Edge` Model:**  
   Add `from_column`, `to_column`, `source_handle`, and `target_handle` columns (or a `metadata JSONB` column) to the `edges` table and Alembic migrations.
4. **Preserve Architectural Design in Revisions:**  
   Update `_snapshot()` in `backend/app/services/revision_service.py` to store `pipeline.architecture_design` alongside `nodes` and `edges`.

### Medium Priority
5. **Support UIOP Envelope Generation in Chat:**  
   Update `backend/app/services/chat_service.py` so that architectural prompts emit UIOP graph operations (`node.add`, `edge.add`) in message metadata.
6. **Persist Execution Telemetry in `pipeline_runs`:**  
   Add `run_number`, `duration_seconds`, `records_processed`, `nodes_executed`, and `total_nodes` to the database schema, removing the need for frontend heuristic shims.
7. **Local DuckDB / SQLite Fallback Mode:**  
   Provide a lightweight, in-memory execution mode (e.g. DuckDB) for local testing when Zetaris and Nemotron are unavailable.

