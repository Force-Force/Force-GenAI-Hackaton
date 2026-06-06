# DataPipe — API Routes Reference

Complete reference of every HTTP and WebSocket endpoint, with request and response examples.

- **Local base URL**: `http://127.0.0.1:8000`
- **LAN base URL**: `http://<your-ip>:8000`
- **API prefix**: `/api/v1`
- **Interactive docs**: `/docs` (Swagger) and `/redoc`
- **Auth (MVP)**: none — all routes are public. Use only on a trusted LAN/VPN.

## Contents

| # | Method | Path | AI | Group |
|---|--------|------|----|-------|
| 1 | GET | `/health` | No | Health |
| 2 | POST | `/api/v1/pipelines` | No | Pipelines |
| 3 | GET | `/api/v1/pipelines` | No | Pipelines |
| 4 | GET | `/api/v1/pipelines/{pipeline_id}` | No | Pipelines |
| 5 | PATCH | `/api/v1/pipelines/{pipeline_id}` | No | Pipelines |
| 6 | DELETE | `/api/v1/pipelines/{pipeline_id}` | No | Pipelines |
| 7 | POST | `/api/v1/pipelines/{pipeline_id}/validate` | Optional | Validation |
| 8 | GET | `/api/v1/pipelines/{pipeline_id}/validations` | No | Validation |
| 9 | GET | `/api/v1/pipelines/{pipeline_id}/validations/latest` | No | Validation |
| 10 | POST | `/api/v1/pipelines/{pipeline_id}/nodes` | No | Nodes |
| 11 | PATCH | `/api/v1/pipelines/{pipeline_id}/nodes/{node_id}` | No | Nodes |
| 12 | DELETE | `/api/v1/pipelines/{pipeline_id}/nodes/{node_id}` | No | Nodes |
| 13 | POST | `/api/v1/pipelines/{pipeline_id}/edges` | No | Edges |
| 14 | DELETE | `/api/v1/pipelines/{pipeline_id}/edges/{edge_id}` | No | Edges |
| 15 | GET | `/api/v1/pipelines/{pipeline_id}/chat` | No | Chat |
| 16 | POST | `/api/v1/pipelines/{pipeline_id}/chat` | Yes | Chat |
| 17 | POST | `/api/v1/pipelines/{pipeline_id}/chat/{message_id}/apply-ops` | No | Chat |
| 18 | WS | `/api/v1/ws/pipelines/{pipeline_id}` | No | WebSocket |

## Common enums

- `NodeType`: `SOURCE`, `TRANSFORM`, `SINK`
- `NodeSubtype`: `csv`, `json`, `python_script`, `sql_query`, `postgres_sink`, `sqlite`, `generic`
- `NodeStatus`: `IDLE`, `PENDING`, `VALID`, `ERROR`
- `PipelineStatus`: `DRAFT`, `ACTIVE`, `ARCHIVED`
- `ChatSender`: `USER`, `MASTER_AGENT`
- `AgentRole`: `MASTER`, `PROFILER`, `ENGINEER`, `DEBUGGER`, `GUARDIAN`, `QA`, `AUDITOR`
- `AgentTaskStatus`: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- `ValidationStatus`: `PASSED`, `FAILED`
- `ValidationSeverity`: `ERROR`, `WARNING`, `INFO`

---

## 1. `GET /health`

Liveness probe plus LLM configuration status.

**Response** `200`

```json
{
  "status": "ok",
  "llm_provider": "cursor",
  "llm_configured": true
}
```

```bash
curl http://127.0.0.1:8000/health
```

---

## 2. `POST /api/v1/pipelines`

Create an empty pipeline. Broadcasts `pipeline.updated`.

**Request body** (`PipelineCreate`)

```json
{ "name": "Bank ETL Demo" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string (1–255) | Yes | Display name |

**Response** `201` (`PipelineRead`)

```json
{
  "id": "3f1c2d4e-0000-0000-0000-000000000001",
  "name": "Bank ETL Demo",
  "status": "DRAFT",
  "architecture_design": null,
  "updated_at": "2026-06-04T11:00:00Z",
  "nodes": [],
  "edges": []
}
```

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/pipelines \
  -H 'Content-Type: application/json' -d '{"name":"Bank ETL Demo"}'
```

---

## 3. `GET /api/v1/pipelines`

List pipelines, newest first.

**Query params**: `skip` (default `0`, ≥ 0), `limit` (default `50`, 1–100)

**Response** `200` (list of `PipelineListItem`)

```json
[
  {
    "id": "3f1c2d4e-0000-0000-0000-000000000001",
    "name": "Bank ETL Demo",
    "status": "DRAFT",
    "updated_at": "2026-06-04T11:00:00Z"
  }
]
```

---

## 4. `GET /api/v1/pipelines/{pipeline_id}`

Full graph, ReactFlow-ready. `404` if not found.

**Response** `200` (`PipelineRead`)

```json
{
  "id": "3f1c2d4e-0000-0000-0000-000000000001",
  "name": "Bank ETL Demo",
  "status": "DRAFT",
  "architecture_design": null,
  "updated_at": "2026-06-04T11:05:00Z",
  "nodes": [
    {
      "id": "a1111111-0000-0000-0000-000000000001",
      "type": "SOURCE",
      "subtype": "csv",
      "label": "Transactions CSV",
      "position": { "x": 120, "y": 120 },
      "data": { "path": "/data/transactions.csv" },
      "status": "VALID"
    }
  ],
  "edges": [
    {
      "id": "e1111111-0000-0000-0000-000000000001",
      "source": "a1111111-0000-0000-0000-000000000001",
      "target": "a1111111-0000-0000-0000-000000000002"
    }
  ]
}
```

---

## 5. `PATCH /api/v1/pipelines/{pipeline_id}`

Update metadata (partial). Broadcasts `pipeline.updated`.

**Request body** (`PipelineUpdate`, all optional)

```json
{
  "name": "Pipeline Production",
  "status": "ACTIVE",
  "architecture_design": { "model_type": "STAR", "scd_type": "TYPE_2" }
}
```

**Response** `200` — `PipelineRead`.

---

## 6. `DELETE /api/v1/pipelines/{pipeline_id}`

Delete a pipeline and all related rows (nodes, edges, chat, agent tasks, validation runs).

**Response** `204` (no body).

---

## 7. `POST /api/v1/pipelines/{pipeline_id}/validate`

Run a static validation, persist the result, update node statuses, and broadcast `validation.completed` (plus `node.updated` for changed nodes).

**Query params**: `use_llm` (bool, default `true`) — when `true` and an LLM is configured, a best-effort advisory is appended to `summary` (does not change the score).

**Request body**: none.

**Response** `201` (`ValidationRunRead`)

```json
{
  "id": "b2222222-0000-0000-0000-000000000001",
  "pipeline_id": "3f1c2d4e-0000-0000-0000-000000000001",
  "score": 60,
  "grade": "C",
  "status": "FAILED",
  "issues": [
    {
      "severity": "ERROR",
      "code": "missing_config",
      "message": "Node 'Transactions CSV' (csv) is missing required config: `path` or `file` or `source`.",
      "node_id": "a1111111-0000-0000-0000-000000000001"
    },
    {
      "severity": "WARNING",
      "code": "orphan_node",
      "message": "Node 'Notes' is not connected to any edge.",
      "node_id": "a1111111-0000-0000-0000-000000000009"
    }
  ],
  "summary": "Validation FAILED: score 60/100 (grade C). 1 error(s), 1 warning(s), 0 info.",
  "created_at": "2026-06-04T11:10:00Z"
}
```

Scoring: base 100, −20 per `ERROR`, −8 per `WARNING`, clamped 0–100. Grade: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, E < 40. `status` is `FAILED` if any error, else `PASSED`.

```bash
curl -s -X POST "http://127.0.0.1:8000/api/v1/pipelines/<id>/validate?use_llm=false"
```

---

## 8. `GET /api/v1/pipelines/{pipeline_id}/validations`

Validation history, newest first.

**Response** `200` — list of `ValidationRunRead` (same shape as route 7).

---

## 9. `GET /api/v1/pipelines/{pipeline_id}/validations/latest`

Most recent validation run, or `null` if none.

**Response** `200` — `ValidationRunRead` or `null`.

---

## 10. `POST /api/v1/pipelines/{pipeline_id}/nodes`

Create a node. Broadcasts `node.created`.

**Request body** (`NodeCreate`)

```json
{
  "type": "SOURCE",
  "subtype": "csv",
  "label": "Transactions CSV",
  "position": { "x": 100, "y": 200 },
  "data": { "path": "/data/transactions.csv" },
  "status": "IDLE"
}
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | `NodeType` | required | `SOURCE` / `TRANSFORM` / `SINK` |
| `subtype` | `NodeSubtype` | `generic` | see enums |
| `label` | string | `"Node"` | |
| `position` | `{x,y}` | `{0,0}` | |
| `data` | object | `{}` | free-form config / code |
| `status` | `NodeStatus` | `IDLE` | |

**Response** `201` (`NodeRead`)

```json
{
  "id": "a1111111-0000-0000-0000-000000000001",
  "type": "SOURCE",
  "subtype": "csv",
  "label": "Transactions CSV",
  "position": { "x": 100, "y": 200 },
  "data": { "path": "/data/transactions.csv" },
  "status": "IDLE"
}
```

---

## 11. `PATCH /api/v1/pipelines/{pipeline_id}/nodes/{node_id}`

Update a node (partial). Broadcasts `node.updated`. `404` if node not in pipeline.

**Request body** (`NodeUpdate`, all optional): `type`, `subtype`, `label`, `position`, `data`, `status`.

```json
{ "position": { "x": 250, "y": 180 }, "data": { "code": "df = df.dropna()" } }
```

**Response** `200` — `NodeRead`.

---

## 12. `DELETE /api/v1/pipelines/{pipeline_id}/nodes/{node_id}`

Delete a node and its connected edges (cascade). Broadcasts `node.deleted`.

**Response** `204`.

---

## 13. `POST /api/v1/pipelines/{pipeline_id}/edges`

Connect two nodes. Broadcasts `edge.created`. `400` if source equals target; `404` if a node is not in the pipeline.

**Request body** (`EdgeCreate`)

```json
{
  "source_node_id": "a1111111-0000-0000-0000-000000000001",
  "target_node_id": "a1111111-0000-0000-0000-000000000002"
}
```

**Response** `201` (`EdgeRead`)

```json
{
  "id": "e1111111-0000-0000-0000-000000000001",
  "source": "a1111111-0000-0000-0000-000000000001",
  "target": "a1111111-0000-0000-0000-000000000002"
}
```

---

## 14. `DELETE /api/v1/pipelines/{pipeline_id}/edges/{edge_id}`

Delete an edge (nodes kept). Broadcasts `edge.deleted`. `404` if not found.

**Response** `204`.

---

## 15. `GET /api/v1/pipelines/{pipeline_id}/chat`

Chat history (chronological).

**Response** `200` (list of `ChatMessageRead`)

```json
[
  {
    "id": "c1111111-0000-0000-0000-000000000001",
    "pipeline_id": "3f1c2d4e-0000-0000-0000-000000000001",
    "sender": "USER",
    "content_md": "Add a CSV source and connect it to a cleaning step.",
    "metadata": {},
    "created_at": "2026-06-04T11:20:00Z"
  }
]
```

---

## 16. `POST /api/v1/pipelines/{pipeline_id}/chat`

Send a message to the Master Agent. Broadcasts `chat.message` (×2) and `agent_task.updated` if the agent delegates. The reply may include `proposed_ops` (canvas changes awaiting confirmation — see route 17).

**Request body** (`ChatMessageCreate`)

```json
{ "content": "Add a CSV source and connect it to a cleaning step." }
```

**Response** `200` (`ChatResponse`)

```json
{
  "user_message": {
    "id": "c1111111-0000-0000-0000-000000000001",
    "pipeline_id": "3f1c2d4e-0000-0000-0000-000000000001",
    "sender": "USER",
    "content_md": "Add a CSV source and connect it to a cleaning step.",
    "metadata": {},
    "created_at": "2026-06-04T11:20:00Z"
  },
  "agent_message": {
    "id": "c1111111-0000-0000-0000-000000000002",
    "pipeline_id": "3f1c2d4e-0000-0000-0000-000000000001",
    "sender": "MASTER_AGENT",
    "content_md": "I propose adding a CSV source feeding a Python cleaning step.",
    "metadata": {
      "proposed_ops": [
        { "op": "add_node", "ref": "src1", "type": "SOURCE", "subtype": "csv", "label": "Customers CSV", "position": null, "data": { "path": "/data/customers.csv" }, "status": "IDLE" },
        { "op": "add_node", "ref": "t1", "type": "TRANSFORM", "subtype": "python_script", "label": "Clean", "position": null, "data": { "code": "df = df.dropna()" }, "status": "IDLE" },
        { "op": "add_edge", "source": "src1", "target": "t1" }
      ],
      "ops_applied": false
    },
    "created_at": "2026-06-04T11:20:02Z"
  },
  "agent_tasks": [],
  "proposed_ops": [
    { "op": "add_node", "ref": "src1", "type": "SOURCE", "subtype": "csv", "label": "Customers CSV", "position": null, "data": { "path": "/data/customers.csv" }, "status": "IDLE" },
    { "op": "add_node", "ref": "t1", "type": "TRANSFORM", "subtype": "python_script", "label": "Clean", "position": null, "data": { "code": "df = df.dropna()" }, "status": "IDLE" },
    { "op": "add_edge", "source": "src1", "target": "t1" }
  ]
}
```

**Notes**
- Requires an LLM provider (`cursor`, `gemini`, or `openai`) configured; otherwise an offline fallback reply is returned.
- The agent may create `PENDING` `AgentTask`s (returned in `agent_tasks`) — not executed in MVP.
- `metadata.requires_user_input` may be set when the agent needs an upload or DB credentials.

### Graph op shapes (`proposed_ops` items)

| `op` | Fields |
|------|--------|
| `add_node` | `ref` (string, temp id), `type`, `subtype`, `label`, `position` (`{x,y}` or `null`), `data`, `status` |
| `add_edge` | `source`, `target` (each a `ref` from this batch or an existing node UUID) |
| `update_node` | `node_id` (existing UUID), `label?`, `data?` |

---

## 17. `POST /api/v1/pipelines/{pipeline_id}/chat/{message_id}/apply-ops`

Apply the canvas operations previously proposed in the agent message identified by `message_id`. Ops are applied via the node/edge services, so this broadcasts `node.created` / `edge.created` / `node.updated` and a final `pipeline.updated` — the canvas re-renders automatically.

**Request body**: none (the ops are read from the stored message).

**Errors**
- `404` — message not found / not in pipeline.
- `409` — message has no `proposed_ops`, or they were already applied (`ops_applied` is `true`).

**Response** `200` (`GraphOpsResult`)

```json
{
  "created_node_ids": [
    "a1111111-0000-0000-0000-000000000010",
    "a1111111-0000-0000-0000-000000000011"
  ],
  "created_edge_ids": [
    "e1111111-0000-0000-0000-000000000010"
  ],
  "updated_node_ids": [],
  "errors": []
}
```

If individual ops fail (e.g. an edge referencing an unknown ref), they are collected in `errors` rather than failing the whole batch:

```json
{
  "created_node_ids": ["a1111111-0000-0000-0000-000000000010"],
  "created_edge_ids": [],
  "updated_node_ids": [],
  "errors": ["add_edge: unresolved source/target (ghost -> t1)"]
}
```

```bash
curl -s -X POST \
  http://127.0.0.1:8000/api/v1/pipelines/<id>/chat/<message_id>/apply-ops
```

---

## 18. `WS /api/v1/ws/pipelines/{pipeline_id}`

Subscribe to real-time pipeline events. The client may send text (keep-alive); the server pushes JSON events.

**Event envelope**

```json
{
  "type": "node.created",
  "pipeline_id": "3f1c2d4e-0000-0000-0000-000000000001",
  "payload": { }
}
```

| `type` | Triggered by | `payload` |
|--------|--------------|-----------|
| `pipeline.updated` | create/patch pipeline, apply-ops final sync | `PipelineRead` |
| `node.created` | create node | `NodeRead` |
| `node.updated` | patch node, validation status change | `NodeRead` |
| `node.deleted` | delete node | `{ "id": "<uuid>" }` |
| `edge.created` | create edge | `EdgeRead` |
| `edge.deleted` | delete edge | `{ "id": "<uuid>" }` |
| `chat.message` | post chat (user + agent) | `ChatMessageRead` |
| `agent_task.updated` | agent delegation | `AgentTaskRead` |
| `validation.completed` | validate pipeline | `ValidationRunRead` |

```
ws://127.0.0.1:8000/api/v1/ws/pipelines/<pipeline_id>
```

---

## Common error codes

| Code | Meaning |
|------|---------|
| `400` | Invalid request (e.g. edge source equals target) |
| `404` | Pipeline, node, edge, or chat message not found |
| `409` | Conflict (no proposed ops, or ops already applied) |
| `422` | Body failed Pydantic validation |
| `500` | Server error (DB, LLM, etc.) |

## Source files

| Area | File |
|------|------|
| Pipelines + validation | `app/api/v1/pipelines.py` |
| Nodes | `app/api/v1/nodes.py` |
| Edges | `app/api/v1/edges.py` |
| Chat + apply-ops | `app/api/v1/chat.py` |
| WebSocket | `app/api/v1/ws.py` |
| Validation logic | `app/services/validation_service.py` |
| Graph ops apply | `app/services/graph_ops_service.py` |
| Schemas | `app/schemas/` |
| WS events | `app/websocket/events.py` |
