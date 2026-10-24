# AuraBI Frontend Integration API

This is the integration contract for the React/ReactFlow frontend. The backend is
FastAPI and returns JSON unless noted otherwise.

## 1. Connection settings

Configure one value in the frontend:

```text
REST_BASE_URL = http://localhost:8000/api/v1
WS_BASE_URL   = ws://localhost:8000/api/v1
```

For a deployed backend, replace the host and use `https`/`wss` as appropriate.
There is no authentication in the current MVP. The frontend must still send
`Content-Type: application/json` for JSON request bodies.

### Common response and error rules

- UUID path parameters must be valid UUID strings.
- Dates are ISO-8601 strings.
- Enum values are case-sensitive and must match the values listed below.
- Successful create operations return `201`.
- Successful deletes return `204` with an empty body.
- Validation failures normally return `422` with FastAPI's `detail` array.
- Business errors return JSON such as `{ "detail": "..." }`.
- Treat `404` as a missing pipeline/resource, `409` as a state conflict,
  `400` as an invalid operation, and `503` as an incomplete database schema.
- After mutations, update local state from the response or refetch the pipeline;
  do not manufacture server IDs in the browser.

## 2. Core data types

### Pipeline

```json
{
  "id": "uuid",
  "name": "Bank ETL",
  "status": "DRAFT",
  "architecture_design": {},
  "updated_at": "2026-01-01T12:00:00Z",
  "nodes": [],
  "edges": []
}
```

Pipeline statuses: `DRAFT`, `ACTIVE`, `ARCHIVED`.

### ReactFlow node

```json
{
  "id": "uuid",
  "type": "SOURCE",
  "subtype": "postgres_sink",
  "label": "Customers",
  "position": { "x": 100, "y": 80 },
  "data": {},
  "status": "IDLE"
}
```

Node types: `SOURCE`, `TRANSFORM`, `SINK`. Subtypes: `csv`, `json`,
`python_script`, `sql_query`, `postgres_sink`, `sqlite`, `generic`. Node statuses:
`IDLE`, `PENDING`, `VALID`, `ERROR`.

### ReactFlow edge

```json
{
  "id": "uuid",
  "source": "source-node-uuid",
  "target": "target-node-uuid"
}
```

## 3. Health and pipeline endpoints

### `GET /health`

No backend requirements. Use it for startup/readiness checks.

Response:

```json
{
  "status": "ok",
  "model": "model-name-or-null",
  "llm_configured": true
}
```

### `POST /pipelines`

Create a pipeline/project.

Request:

```json
{ "name": "Bank ETL" }
```

`name` is required and must contain 1-255 characters. Returns a complete
`Pipeline` with empty `nodes` and `edges`.

### `GET /pipelines?skip=0&limit=50`

List pipelines. `skip` is at least `0`; `limit` is `1-100`.

Each item contains:

```json
{
  "id": "uuid",
  "name": "Bank ETL",
  "status": "DRAFT",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

### `GET /pipelines/{pipeline_id}`

Fetch the complete pipeline graph. Use this as the initial ReactFlow state and
after reconnecting to the WebSocket.

### `PATCH /pipelines/{pipeline_id}`

Update any provided fields; omitted fields are unchanged:

```json
{
  "name": "Bank ETL v2",
  "status": "ACTIVE",
  "architecture_design": { "layout": "left-to-right" }
}
```

`status` must be `DRAFT`, `ACTIVE`, or `ARCHIVED`. Returns the complete pipeline.

### `DELETE /pipelines/{pipeline_id}`

Deletes the pipeline and its graph. Returns `204`. Remove it from frontend state
only after the request succeeds.

## 4. Graph editing endpoints

### `POST /pipelines/{pipeline_id}/nodes`

Create a node:

```json
{
  "type": "SOURCE",
  "subtype": "generic",
  "label": "Input",
  "position": { "x": 0, "y": 0 },
  "data": {},
  "status": "IDLE"
}
```

Only `type` is required. Defaults are `subtype=generic`, `label=Node`,
`position={x:0,y:0}`, `data={}`, and `status=IDLE`. Returns the server-generated
node with `201`.

### `PATCH /pipelines/{pipeline_id}/nodes/{node_id}`

Update any subset of `type`, `subtype`, `label`, `position`, `data`, and `status`.
Returns the complete node. A node update that triggers a Guardian approval can
return a conflict response containing an approval record; the frontend should
refresh approvals instead of applying the change optimistically.

### `DELETE /pipelines/{pipeline_id}/nodes/{node_id}`

Deletes the node and linked edges. Returns `204`.

### `POST /pipelines/{pipeline_id}/edges`

Create an edge:

```json
{
  "source_node_id": "source-node-uuid",
  "target_node_id": "target-node-uuid"
}
```

Source and target must be different existing nodes. Returns the normalized edge
with `201`.

### `DELETE /pipelines/{pipeline_id}/edges/{edge_id}`

Deletes an edge. Returns `204`.

## 5. Chat and agent tasks

### `GET /pipelines/{pipeline_id}/chat`

Returns chat messages, newest/oldest ordering as returned by the backend. A
message has `id`, `pipeline_id`, `sender`, `content_md`, `metadata`, and
`created_at`. Senders are `USER`, `MASTER_AGENT`, and `GUARDIAN_AGENT`.

### `POST /pipelines/{pipeline_id}/chat`

Request:

```json
{ "content": "Profile the customer source and suggest a transform." }
```

`content` must be non-empty. Response:

```json
{
  "user_message": {},
  "agent_message": {},
  "agent_tasks": []
}
```

The response may create delegated tasks. Refresh the task list and listen for
`chat.message` and `agent_task.updated` events.

### `GET /pipelines/{pipeline_id}/agent-tasks`

Returns tasks with `id`, `node_id`, `agent_role`, `instruction`,
`input_payload`, `output_payload`, `status`, `created_at`, and `completed_at`.
Agent roles include `MASTER`, `PROFILER`, `ENGINEER`, `DEBUGGER`, `GUARDIAN`,
`QA`, and `AUDITOR`. Task statuses are `PENDING`, `RUNNING`, `COMPLETED`, and
`FAILED`.

### `POST /pipelines/{pipeline_id}/agent-tasks/{task_id}/execute`

Execute a pending task. Returns the task. A non-executable task returns `409`.

## 6. Pipeline execution and approvals

### `POST /pipelines/{pipeline_id}/runs`

Start a run. The pipeline must contain at least one node; a concurrent active run
returns `409`. Response:

```json
{
  "run": {},
  "message": "..."
}
```

The run includes `status`, `current_node_id`, `context`, `error_message`,
timestamps, `events`, `pending_approvals`, and `pending_questions`.

Run statuses: `PENDING`, `RUNNING`, `AWAITING_APPROVAL`, `AWAITING_USER_INPUT`,
`COMPLETED`, `FAILED`, `CANCELLED`.

### `GET /pipelines/{pipeline_id}/runs/{run_id}`

Fetch the run, event history, and currently pending approvals/questions. Poll this
endpoint after an event if the frontend needs the authoritative full state.

### `POST /pipelines/{pipeline_id}/runs/{run_id}/resume`

Resume a paused run after all required Guardian approvals and user questions are
resolved. A run in an invalid state returns `409`.

### `POST /pipelines/{pipeline_id}/runs/{run_id}/answer`

Answer a Guardian question event:

```json
{
  "question_id": "event-or-question-id",
  "answer": "approved value"
}
```

`answer` must be non-empty. Prefer the dedicated questions endpoint below for
normal user questions; this run endpoint is for Guardian question events.

## 7. Guardian approvals and user questions

### `GET /pipelines/{pipeline_id}/approvals?status=PENDING`

List approvals. `status` is optional and may be `PENDING`, `APPROVED`, or
`REJECTED`. Approval records contain the operation type, risk level, masked
preview, PII findings, pending action, and resolution data.

### `POST /pipelines/{pipeline_id}/approvals/{approval_id}/decide`

Request:

```json
{
  "approved": true,
  "comment": "Reviewed by data owner"
}
```

`comment` is optional. A resolved approval returns `409`.

### `GET /pipelines/{pipeline_id}/questions?run_id={uuid}&pending_only=true`

Lists user questions. By default only pending questions are returned. Set
`pending_only=false` to retrieve the full history; optionally filter by `run_id`.
Question statuses are `PENDING`, `ANSWERED`, and `CANCELLED`.

### `POST /pipelines/{pipeline_id}/questions/{question_id}/answer`

Request:

```json
{ "answer": "Use the accounts table." }
```

The answer must be non-empty. The backend continues the associated run when the
question is linked to one. A missing or already answered question returns `404`
or `409`.

## 8. ETL endpoints

### `POST /pipelines/{pipeline_id}/etl/introspect`

No request body. Reads the configured source and returns:

```json
{
  "live_data_profile": {},
  "message": "..."
}
```

Requires an accessible PostgreSQL source node/database. If no source is
accessible, returns `422`.

### `POST /pipelines/{pipeline_id}/etl/execute`

Request:

```json
{ "instruction": "Keep customers with an active account and summarize by city." }
```

`instruction` must contain at least 3 characters. Response fields are
`instruction`, generated `sql`, `explanation`, `row_count`, `rows`,
`summary_md`, and `stored_in_pipeline`.

This endpoint executes data operations. The frontend should display the
explanation/summary and should not expose raw SQL as an editable trust boundary.
Validation or ETL planning errors return `422`.

### `GET /pipelines/{pipeline_id}/etl/results`

Returns the last stored ETL result. Returns `404` when this pipeline has no ETL
result yet.

## 9. Standalone analysis agent

These routes are not pipeline-scoped:

### `POST /agent/query`

Request:

```json
{ "question": "What is the monthly revenue trend?" }
```

`question` must be non-empty. An optional `X-Request-ID` header can be supplied
for client correlation; otherwise the backend generates one. Response includes
`response`, `trace`, `request_id`, `status`, `sql`, `sources`, `views_used`,
`model`, `model_route`, `latency_ms`, calculation/evidence arrays, and warnings.
The backend returns `500` for incomplete provider configuration and `502` when
the external analysis provider fails.

### `GET /agent/traces/{request_id}`

Fetch a previously completed analysis response by request ID. Traces are
in-memory and are lost when the API process restarts; a missing trace returns
`404`.

## 10. WebSocket real-time updates

Connect to:

```text
ws://HOST:8000/api/v1/ws/pipelines/{pipeline_id}
```

The server accepts the connection and sends text frames containing JSON:

```json
{
  "type": "pipeline.run_updated",
  "pipeline_id": "pipeline-uuid",
  "payload": {}
}
```

Event types:

| Type | Frontend action |
|---|---|
| `pipeline.updated` | Refetch pipeline metadata |
| `node.created`, `node.updated`, `node.deleted` | Update graph or refetch pipeline |
| `edge.created`, `edge.deleted` | Update graph or refetch pipeline |
| `chat.message` | Append/refetch chat |
| `agent_task.updated` | Refetch tasks |
| `guardian.approval_required`, `guardian.approval_resolved` | Refetch approvals and run |
| `pipeline.run_updated`, `pipeline.run_event` | Refetch run; display new event |
| `user_input.required`, `user_input.answered` | Refetch questions and run |

The current server expects the client to keep the connection alive by sending
text frames. Implement a heartbeat (for example, a periodic `ping`/text message
supported by the client library), reconnect with backoff after disconnect, and
refetch the pipeline/run after reconnect because events are not replayed.

## 11. Recommended frontend flow

1. Call `GET /health`; show a backend-unavailable state unless it returns `200`.
2. Call `GET /pipelines` and let the user create a pipeline with
   `POST /pipelines`.
3. Load `GET /pipelines/{id}` and map `nodes`/`edges` directly to ReactFlow.
4. Open the pipeline WebSocket before editing or starting a run.
5. Persist node and edge changes through the corresponding mutation endpoint.
6. For chat, post the message, render both returned messages, then refresh tasks.
7. Start a run and render its status/events.
8. When approval or question events arrive, fetch the pending records, render the
   masked approval/question details, and submit the user's decision/answer.
9. Resume only when the run is eligible; otherwise show the backend's `detail`.
10. Refetch authoritative state after reconnects and after any mutation conflict.
