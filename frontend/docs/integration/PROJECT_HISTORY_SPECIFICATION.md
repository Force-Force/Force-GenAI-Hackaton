# AuraBI — Project History & Version Ledger Specification
**Document Version:** 1.0.0  
**Target Audience:** Backend Core Engineering (FastAPI, PostgreSQL, SQLAlchemy, WebSockets)  
**Status:** Approved for Implementation  
**Frontend Route:** `/history` & TopNav Project History Drawer (`ProjectHistoryModal.tsx`)

---

## 1. Executive Summary & Architecture Goals

In AuraBI, data lakehouse pipelines are constructed and evolved through human-agent collaboration. Architectural decisions, schema migrations, and ETL transformations are continuously proposed and executed by autonomous sub-agents (`Master Builder`, `Architectural Planner`, `Guardian Gate`, `Independent Audit Agent`).

To guarantee enterprise auditability, compliance, and disaster recovery, the backend must provide a **first-class Project History & Version Ledger**:

1. **Architectural Revisions (`pipeline_revisions`):** Immutable version snapshots capturing every state transition of the pipeline (node additions, edge connections, Star Schema datamarts, SCD Type-2 policies, and SQL transformations).
2. **One-Click Reversion / Rollback (`POST /pipelines/{id}/revisions/{rev_id}/rollback`):** Ability to safely revert the canvas and architecture design to any prior revision, creating an audited rollback record without destructive history mutation.
3. **Execution Run Audits (`pipeline_runs` & `pipeline_run_events`):** High-throughput execution telemetry tracking batch run duration, throughput (records processed), step-by-step phase events, and Guardian approval interventions.
4. **Multi-Project Management (`GET /pipelines`):** Rapid project switching, cloning, and metadata inspection.

---

## 2. Database Schema (PostgreSQL DDL)

```sql
-- 1. Pipeline Architectural Revisions Table
CREATE TABLE IF NOT EXISTS pipeline_revisions (
    id VARCHAR(64) PRIMARY KEY,
    pipeline_id VARCHAR(64) NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    author_type VARCHAR(32) NOT NULL CHECK (author_type IN ('USER', 'MASTER_AGENT', 'PLANNER_AGENT', 'GUARDIAN_AGENT', 'AUDITOR_AGENT')),
    author_name VARCHAR(128) NOT NULL DEFAULT 'AuraBI System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    node_count INTEGER NOT NULL DEFAULT 0,
    edge_count INTEGER NOT NULL DEFAULT 0,
    stage_count INTEGER NOT NULL DEFAULT 0,
    operations_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    snapshot JSONB NOT NULL, -- Full snapshot: { nodes: [...], edges: [...], planTitle: "...", stages: [...], kpis: [...] }
    CONSTRAINT uq_pipeline_revision UNIQUE (pipeline_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_revisions_pipeline ON pipeline_revisions(pipeline_id, revision DESC);

-- 2. Pipeline Execution Runs Table
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id VARCHAR(64) PRIMARY KEY,
    pipeline_id VARCHAR(64) NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    run_number SERIAL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'AWAITING_APPROVAL', 'AWAITING_USER_INPUT', 'CANCELLED')),
    trigger_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL' CHECK (trigger_type IN ('MANUAL', 'SCHEDULED', 'AGENT_OPTIMIZATION', 'WEBHOOK')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds NUMERIC(8, 2) DEFAULT 0.0,
    records_processed BIGINT DEFAULT 0,
    nodes_executed INTEGER DEFAULT 0,
    total_nodes INTEGER DEFAULT 0,
    error_message TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_runs_pipeline ON pipeline_runs(pipeline_id, started_at DESC);

-- 3. Pipeline Run Step Events Table
CREATE TABLE IF NOT EXISTS pipeline_run_events (
    id VARCHAR(64) PRIMARY KEY,
    run_id VARCHAR(64) NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    phase VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('INFO', 'RUNNING', 'SUCCESS', 'WARNING', 'ERROR')),
    message TEXT NOT NULL,
    node_id VARCHAR(64),
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_run_events_run ON pipeline_run_events(run_id, timestamp ASC);
```

---

## 3. REST API Endpoints Specification

### 3.1 List Architectural Revisions
- **HTTP Method:** `GET`
- **Path:** `/pipelines/{pipeline_id}/revisions`
- **Query Parameters:**
  - `limit` (int, default `50`): Max revisions to return.
  - `offset` (int, default `0`): Pagination offset.
- **Response Status:** `200 OK`
- **Response Payload:**
```json
[
  {
    "id": "rev_01j7abc123",
    "revision": 4,
    "pipeline_id": "pipe_retail_99",
    "title": "Star Schema Datamart & Independent Audit Seal",
    "description": "Promoted dimensional Star Schema with fact_daily_revenue and conformed customer dimension. Audit Agent verified zero-variance tolerance.",
    "author_type": "AUDITOR_AGENT",
    "author_name": "Independent Audit Agent",
    "created_at": "2026-10-26T14:30:00Z",
    "node_count": 5,
    "edge_count": 4,
    "stage_count": 5,
    "operations_summary": [
      "Verified zero-variance financial reconciliation on fact_daily_revenue",
      "Affixed SHA-256 cryptographic verification seal",
      "Configured SCD Type-2 temporal dimension tracking"
    ],
    "tags": ["audit_passed", "star_schema", "production_ready"]
  }
]
```

---

### 3.2 Get Specific Revision Snapshot & Diff
- **HTTP Method:** `GET`
- **Path:** `/pipelines/{pipeline_id}/revisions/{revision_id}`
- **Response Status:** `200 OK`
- **Response Payload:** Returns full revision record including the `snapshot` object (`nodes`, `edges`, `stages`, `kpis`).

---

### 3.3 Rollback / Revert to a Prior Revision
- **HTTP Method:** `POST`
- **Path:** `/pipelines/{pipeline_id}/revisions/{revision_id}/rollback`
- **Request Body:**
```json
{
  "reason": "Reverting broken SCD-2 timestamp transformation"
}
```
- **Backend Execution Rules:**
  1. Retrieve the historical revision snapshot.
  2. Replace current pipeline nodes and edges with the snapshot contents in database.
  3. Increment pipeline revision counter ($N + 1$).
  4. Create a new `pipeline_revisions` record:
     - `title`: `"Rollback to Revision v{historical_rev}: {historical_title}"`
     - `author_type`: `"USER"`
     - `tags`: `["rollback", "reverted_to_v{historical_rev}"]`
  5. Broadcast WebSocket event: `pipeline.updated` and `pipeline.revision_created`.
- **Response Status:** `200 OK`
- **Response Payload:**
```json
{
  "success": true,
  "message": "Pipeline successfully rolled back to revision v2",
  "previous_revision": 4,
  "new_revision": 5,
  "restored_snapshot": {
    "node_count": 3,
    "edge_count": 2
  }
}
```

---

### 3.4 List Pipeline Execution Runs
- **HTTP Method:** `GET`
- **Path:** `/pipelines/{pipeline_id}/runs`
- **Query Parameters:**
  - `status` (string, optional): Filter by `COMPLETED`, `RUNNING`, `FAILED`, `AWAITING_APPROVAL`.
  - `limit` (int, default `30`)
  - `offset` (int, default `0`)
- **Response Status:** `200 OK`
- **Response Payload:**
```json
[
  {
    "id": "run_01j7xyz987",
    "pipeline_id": "pipe_retail_99",
    "run_number": 104,
    "status": "COMPLETED",
    "trigger_type": "MANUAL",
    "started_at": "2026-10-26T15:10:00Z",
    "completed_at": "2026-10-26T15:10:14Z",
    "duration_seconds": 14.2,
    "records_processed": 1248500,
    "nodes_executed": 5,
    "total_nodes": 5,
    "error_message": null,
    "events": [
      {
        "id": "ev_1",
        "timestamp": "2026-10-26T15:10:02Z",
        "phase": "Source Ingestion",
        "status": "SUCCESS",
        "message": "Streamed 840,000 raw transaction records from PostgreSQL cluster",
        "node_id": "node_pos_transactions",
        "duration_ms": 2200
      },
      {
        "id": "ev_2",
        "timestamp": "2026-10-26T15:10:07Z",
        "phase": "Transformation",
        "status": "SUCCESS",
        "message": "Executed clean_stripe_events.sql with 0 dropped rows",
        "node_id": "node_clean_sql",
        "duration_ms": 4800
      }
    ]
  }
]
```

---

### 3.5 Trigger Pipeline Execution
- **HTTP Method:** `POST`
- **Path:** `/pipelines/{pipeline_id}/runs`
- **Response Status:** `201 Created`
- **Response Payload:** Returns created `BackendRun` object with status `RUNNING`.

---

## 4. WebSocket Real-Time Events (`pipelineSocket`)

When connected via `/ws/pipelines/{pipeline_id}`, emit these messages so the frontend ledger stays live without polling:

| Event Type | Payload | Action on Frontend |
|---|---|---|
| `pipeline.revision_created` | `{ "revision_id": "rev_x", "revision": 5, "title": "..." }` | Refetches `revisions` and updates TopNav version badge (`v5`). |
| `pipeline.run_updated` | `{ "run_id": "run_y", "status": "COMPLETED", "duration_seconds": 12.4 }` | Updates active run card and refetches runs list. |
| `pipeline.run_event` | `{ "run_id": "run_y", "phase": "...", "status": "SUCCESS", "message": "..." }` | Appends event directly to run step timeline. |

---

## 5. Ready-to-Use FastAPI Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class RevisionAuthor(str, Enum):
    USER = "USER"
    MASTER_AGENT = "MASTER_AGENT"
    PLANNER_AGENT = "PLANNER_AGENT"
    GUARDIAN_AGENT = "GUARDIAN_AGENT"
    AUDITOR_AGENT = "AUDITOR_AGENT"

class PipelineRevisionModel(BaseModel):
    id: str
    revision: int
    pipeline_id: str
    title: str
    description: str = ""
    author_type: RevisionAuthor
    author_name: str = "AuraBI System"
    created_at: datetime
    node_count: int
    edge_count: int
    stage_count: int = 0
    operations_summary: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    snapshot: Optional[Dict[str, Any]] = None

class RollbackRequest(BaseModel):
    reason: Optional[str] = "Rollback requested from AuraBI UI"

class RollbackResponse(BaseModel):
    success: bool
    message: str
    previous_revision: int
    new_revision: int
    restored_snapshot: Optional[Dict[str, Any]] = None

class RunEventModel(BaseModel):
    id: str
    timestamp: datetime
    phase: str
    status: str
    message: str
    node_id: Optional[str] = None
    duration_ms: Optional[int] = None

class PipelineRunModel(BaseModel):
    id: str
    pipeline_id: str
    run_number: int
    status: str
    trigger_type: str = "MANUAL"
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    records_processed: int = 0
    nodes_executed: int = 0
    total_nodes: int = 0
    error_message: Optional[str] = None
    events: List[RunEventModel] = Field(default_factory=list)
```

---

## 6. Verification Checklist for Backend Engineers

- [ ] Revisions are created automatically whenever a UIOP batch completes or nodes/edges are updated via API.
- [ ] Rollback (`POST /revisions/{id}/rollback`) creates a new incremented revision and does **not** delete historical revisions.
- [ ] `GET /pipelines/{id}/runs` returns descending by `started_at` with step events nested.
- [ ] WebSocket broadcasts `pipeline.revision_created` and `pipeline.run_updated` to connected clients.
- [ ] All timestamps are in standard ISO-8601 UTC.

