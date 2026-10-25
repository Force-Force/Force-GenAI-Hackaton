# Explain Why: AuraBI architecture and end-to-end data flow

## 1. Purpose

AuraBI is a business-analysis backend with two related capabilities:

1. **Visual ETL pipelines** for defining, approving, and executing data flows.
2. **Explain Why analysis** for answering a business question with evidence,
   calculations, SQL, provenance, and recommended next actions.

The Explain Why feature is not intended to be a free-form chatbot that invents
an answer. Its purpose is to connect a business question to an authorized data
source, show how the result was obtained, and distinguish observed facts from
calculations, inferences, and recommendations.

The most important architectural boundary is:

> PostgreSQL stores AuraBI's application and workflow metadata. Zetaris is the
> analytical source of truth for the hackathon query path. The LLM interprets
> questions and explains verified results; it does not become the database and
> it does not get permission to perform writes.

---

## 2. System map

```text
Business user / frontend
        |
        | REST, WebSocket, X-Request-ID
        v
FastAPI application
        |
        +--> Pipeline API ----------------------+
        |                                       |
        +--> Pipeline execution service         |
        |       |                               |
        |       +--> Guardian / approvals       |
        |       +--> SQLAlchemy metadata DB     |
        |       +--> source introspection       |
        |       +--> node execution             |
        |                                       |
        +--> Explain Why API                    |
                |                               |
                +--> bounded agent supervisor   |
                        |                       |
                        +--> Nemotron adapter   |
                        |       (question -> SQL/tool call)
                        |
                        +--> Zetaris client
                        |       (validated read SQL)
                        |
                        +--> deterministic analysis
                        |       (Python/SQL arithmetic)
                        |
                        +--> evidence and trace
                                |
                                +--> answer, caveats,
                                     calculations, recommendations

PostgreSQL: pipelines, nodes, edges, runs, approvals, tasks, chat metadata
Zetaris: analytical data queried by the Explain Why path
Nemotron: language understanding and concise explanation
```

The current repository contains both the established visual ETL path and the
newer hackathon Explain Why path. They share the FastAPI application and
configuration conventions, but they do not use the same data connection:

- Existing ETL source introspection and node execution primarily work with the
  configured application PostgreSQL database.
- The hackathon analytical path uses `ZetarisClient` and must not silently
  replace Zetaris with local PostgreSQL.

This distinction prevents application metadata from being confused with the
business facts used to answer an analytical question.

---

## 3. Connections and configuration

### 3.1 Application connection

`DATABASE_URL` configures PostgreSQL for AuraBI's own state. SQLAlchemy's async
session is used by services and API routes to persist:

- pipelines and their visual graph;
- source, transformation, and destination nodes;
- edges between nodes;
- pipeline runs and run events;
- agent tasks and contextual questions;
- Guardian approvals;
- chat and workflow metadata.

This database describes what AuraBI knows about a project and how its workflow
is progressing. It is not a substitute for the analytical source.

### 3.2 Zetaris connection

The Explain Why path uses:

- `ZETARIS_API_URL` or `ZETARIS_REST_URL`;
- `ZETARIS_SQL_ENDPOINT`;
- `ZETARIS_API_KEY`;
- `ZETARIS_ORG_ID`.

The client sends a request to the configured SQL endpoint with:

- `Authorization`;
- `X-Org-ID`;
- the same `X-Request-ID` received by the API;
- a generated query ID;
- one SQL statement;
- a bounded row limit.

Only the request construction and response shape are implemented locally. Live
Zetaris availability, credentials, dataset registration, and the exact
deployment-specific SQL contract must be verified in the target environment.
The application must report that integration as unavailable rather than
fabricating data if the service cannot be reached.

### 3.3 Nemotron connection

The runtime model uses the OpenAI-compatible adapter in `app/analysis/model.py` and these
canonical settings:

- `MODEL_BASE_URL`;
- `MODEL_API_KEY`;
- `NEMOTRON_MODEL`.

Nemotron is responsible for language tasks:

- understanding the intent of a business question;
- selecting an appropriate analytical query;
- requesting the read-only SQL tool;
- turning verified facts into a readable explanation.

Nemotron is not trusted to execute SQL directly. Every SQL string passes through
the Zetaris client's local validator before a network request is made.

Meterless and an NVIDIA fallback route are configuration/integration concerns,
not separate business agents. They should be introduced only when their actual
endpoint, authentication, and failover contract are confirmed.

---

## 4. Data-source and pipeline lifecycle

### Step 1: Create the project

The user creates a pipeline through
`POST /api/v1/pipelines`. A `Pipeline` is the container for the project and
starts with a draft status.

The frontend can then load the graph with
`GET /api/v1/pipelines/{pipeline_id}`. The graph contains:

- `SOURCE` nodes for files, tables, or external sources;
- transformation or processing nodes;
- destination/sink nodes;
- edges describing execution order.

The graph is stored in PostgreSQL, not inferred from the frontend state at
runtime.

### Step 2: Register source nodes

The user adds a source node with metadata such as source type, schema, table,
location, and connection hints. The source definition is metadata; it does not
automatically grant the model permission to query every table.

For the existing ETL path, `data_source_service.py` inspects configured
PostgreSQL source tables. It records a profile containing connection status,
qualified name, row count, columns, and masked sample rows in the pipeline's
architecture metadata. PII scanning and masking are applied where configured.

For the hackathon path, the equivalent analytical source is expected to be
available through Zetaris. A future governed semantic catalogue should map a
business concept such as `monthly_margin` to an approved Zetaris view and its
allowed measures and dimensions. Until that catalogue is persisted, the
current implementation records the executed source as Zetaris and exposes
warnings when a semantic view was not supplied.

### Step 3: Design and connect the pipeline

Edges are stored as explicit source-to-target relationships. When execution
starts, the execution service calculates a topological order. This ensures that
an upstream source or transformation completes before a dependent node runs.

The pipeline can be edited through the pipeline, node, and edge APIs. WebSocket
events notify the frontend when the graph or run state changes, so the user can
observe progress instead of waiting for a silent background operation.

### Step 4: Start a run

`POST /api/v1/pipelines/{pipeline_id}/runs` creates a `PipelineRun`. The run
records its current node, context, status, timestamps, completed nodes, and
events.

Before potentially impactful operations, the Guardian service creates a
`GuardianApproval`. A run can therefore stop in `AWAITING_APPROVAL` rather than
executing automatically. The user decides through the approval API, and the
decision becomes part of the workflow history.

Contextual questions can also pause a run in `AWAITING_USER_INPUT`. This is used
when the system needs a business decision or missing parameter instead of
guessing.

### Step 5: Execute nodes and record events

After approval, the execution service advances through the graph. Each
significant transition is recorded as a run event, including:

- run started;
- approval required or granted;
- source/profile results;
- node started and completed;
- questions raised and answered;
- failures and resumptions;
- final completion.

This pipeline trace is separate from, but conceptually related to, the Explain
Why trace. A production implementation should connect them with a common
request/run identifier when an analytical question is launched from a pipeline.

---

## 5. Explain Why request lifecycle

The Explain Why entry point is:

```text
POST /api/v1/agent/query
```

The request body currently contains a natural-language `question`. The API
normalizes the request identifier:

1. If `X-Request-ID` is valid and supplied, it is reused.
2. Otherwise AuraBI generates a UUID.
3. The identifier is returned in the response header.
4. The identifier is placed in the trace.
5. The identifier is sent to Zetaris.

This lets an operator correlate the API request, provider request, query trace,
and user-visible response without putting secrets into logs.

### Phase A: Initialize

The API loads the hackathon configuration and constructs:

- a `ZetarisClient`;
- a `NemotronClient`;
- a bounded `HackathonAgent`.

Missing model or Zetaris settings result in an explicit configuration failure.
Secrets are not included in the error message.

### Phase B: Understand and plan

The agent sends the question to Nemotron with a narrow system contract. The
model is told to rely on Zetaris for facts and to use the `run_sql` tool for
retrieval.

The model may identify:

- the requested KPI;
- the periods or dimensions involved;
- the comparison requested;
- the source/view needed;
- a candidate read-only query.

The model's reasoning is not exposed as hidden chain-of-thought. AuraBI records
the operational step and the resulting SQL/tool call instead.

### Phase C: Validate SQL

Before execution, `ZetarisClient`:

1. trims and normalizes the SQL;
2. detects semicolons outside quoted strings and comments;
3. rejects multiple statements;
4. rejects unterminated strings or block comments;
5. classifies the statement;
6. permits only `SELECT`, `SHOW`, and `DESCRIBE`;
7. rejects writes such as `DROP`, `DELETE`, `UPDATE`, `CREATE`, and `ALTER`;
8. applies the configured row limit.

This validation is a safety boundary, not a claim that the remote engine's
entire SQL grammar has been validated locally. Remote syntax and permissions
still have to succeed at Zetaris.

The planned semantic-view layer adds another boundary: the query must target an
approved view and allowed columns. Model output must never be treated as trusted
merely because it came from Nemotron.

### Phase D: Query Zetaris

The client sends exactly one validated request to
`/sql-editor/sqls/run`. It captures:

- request ID;
- SQL actually submitted;
- row count;
- response timing;
- safe result preview;
- provider error category if the request fails.

The client distinguishes timeout, authentication, authorization, rate limit,
transport, provider, and malformed-response errors. It does not expose raw
authorization headers or provider secrets.

If the model requests more than one query, the bounded iteration limit prevents
an unbounded model-driven loop. A future Analyst service may add a small,
explicit correction attempt using the real Zetaris error, but every corrected
query must go through the same validator again.

### Phase E: Inspect and calculate

Returned rows are evidence, not prose. Numerical conclusions should be
calculated using ordinary Python or SQL:

```text
gross_margin = revenue - cost_of_goods_sold
gross_margin_percentage = gross_margin / revenue * 100
period_change = current_period_value - previous_period_value
```

`app/analysis/calculations.py` implements these calculations with `Decimal` and
guards against zero revenue and missing/non-numeric measures.

For a question such as:

> Why did gross margin decline in September compared with August?

the system should retain the two input periods, revenue, cost of goods sold,
gross margin, and percentage change. It should not ask the LLM to perform the
arithmetic or invent a missing period.

### Phase F: Explain the result

Nemotron receives the verified tool result and produces the concise business
response. The answer should separate:

- **Observed facts:** values returned by Zetaris.
- **Calculated results:** values derived deterministically from those facts.
- **Inferences:** plausible interpretation of the observed change.
- **Recommendations:** investigations suggested by the evidence.
- **Unverified hypotheses:** questions requiring another query or human review.

Recommendations are not proof. For example, a margin decline may justify
investigating product mix, discounting, freight, or input costs, but the system
must label those as next investigations unless the data directly supports the
claim.

### Phase G: Return and retrieve the trace

The API returns the answer and the machine-readable Explain Why contract. A
client can retrieve the same result using:

```text
GET /api/v1/agent/traces/{request_id}
```

The current trace store is process-local for the demo. It is not durable across
process restarts and does not yet provide tenant-scoped authorization. A
production deployment must persist execution traces in PostgreSQL and restrict
trace access to the owning user/tenant.

---

## 6. Explain Why response contract

```json
{
  "request_id": "uuid",
  "answer": "Business-friendly explanation",
  "response": "Compatibility field containing the final answer",
  "status": "completed",
  "sql": "SELECT ...",
  "sources": ["Zetaris"],
  "views_used": ["approved_margin_view"],
  "model": "configured Nemotron model",
  "model_route": "meterless-or-nvidia-route",
  "latency_ms": 123.4,
  "tokens_in": null,
  "tokens_out": null,
  "steps": [],
  "calculations": [],
  "evidence": [],
  "warnings": [],
  "trace": {
    "question": "...",
    "steps": [],
    "sql_executions": [],
    "request_id": "uuid"
  }
}
```

### Meaning of the fields

| Field | Meaning |
|---|---|
| `request_id` | Correlation identifier for the API, agent, Zetaris request, and trace. |
| `response` / `answer` | Final user-facing explanation. |
| `sql` | SQL actually submitted, not merely proposed by the model. |
| `sources` | External systems that supplied evidence. |
| `views_used` | Governed semantic views used by the query, when available. |
| `model` | Configured model identifier. |
| `model_route` | Actual provider route when verified; never a fabricated value. |
| `latency_ms` | Measured end-to-end request latency. |
| `tokens_in` / `tokens_out` | Provider token counts, or `null` when unavailable. |
| `steps` | Operational workflow stages and their outcomes. |
| `calculations` | Formula, inputs, result, and evidence references. |
| `evidence` | Source rows or safe references supporting claims. |
| `warnings` | Missing data, unverified integrations, caveats, or partial failures. |
| `status` | Completed, partial, failed, or another explicit workflow state. |

AuraBI must never fill unavailable model metadata, source attribution, or token
counts with plausible-looking values.

---

## 7. How recommendations are produced

Recommendations are the final layer, after evidence collection:

1. The user asks a business question.
2. Zetaris supplies the factual rows.
3. Deterministic code calculates the KPI and change.
4. The trace links the calculation to its inputs.
5. Nemotron summarizes what changed.
6. The response proposes next investigations that are consistent with the
   evidence.
7. The response labels anything not directly verified as an inference or
   hypothesis.

For the gross-margin example, a responsible response could say:

- observed: September gross margin was lower than August;
- calculated: the decline was driven by the difference between revenue and cost
  of goods sold in the two periods;
- recommendation: investigate the products, customers, discounts, or cost
  categories contributing most to the change;
- caveat: the recommendation is not proof until a further breakdown query
  confirms the driver.

The LLM may phrase the recommendation, but it must not override the data,
change the formula, authorize a write operation, or conceal a warning.

---

## 8. Failure and safety behavior

AuraBI should fail explicitly:

- missing credentials produce a redacted configuration error;
- Zetaris timeout produces a timeout category and request ID;
- 401/403 errors are not retried as if they were transient;
- rate limits and eligible provider failures may use bounded retry/failover;
- malformed provider responses are not converted into empty successful results;
- invalid SQL is rejected before the network request;
- missing data produces a limitation or partial result, not fabricated numbers;
- pending Guardian approval pauses a pipeline rather than silently executing it;
- incomplete user input pauses for a question rather than guessing.

The system must not expose hidden chain-of-thought. It should expose concise
decision summaries, executed actions, calculations, evidence references, and
warnings that a reviewer can audit.

---

## 9. Current implementation status

Implemented now:

- FastAPI Explain Why endpoint;
- bounded Nemotron tool-calling loop;
- Zetaris client with request-ID propagation;
- one-statement and read-only SQL checks;
- categorized and redacted Zetaris failures;
- deterministic margin calculation helpers;
- typed response fields;
- process-local trace retrieval;
- existing PostgreSQL-backed pipeline, approval, event, and WebSocket flow.

Still required for a complete production architecture:

- persistent semantic-view and KPI catalogue;
- independent authorization of views and columns;
- PostgreSQL execution-trace persistence;
- tenant/user authentication and trace access control;
- independent Evidence/Guardian verification of claims;
- proposal-only data profiler;
- persisted source onboarding and human approval records;
- verified Meterless/NVIDIA failover;
- verified live Zetaris dataset and TPCH/demo setup;
- durable recommendation/evidence links and visualization specifications.

These gaps are intentionally visible in the response's warnings and integration
documentation rather than being hidden behind mocked success.
