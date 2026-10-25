# 3.7 Sponsor Technology Explanation

## Overview

AuraBI combines governed data access, natural-language analysis, and a visual
ETL workflow. The sponsor technologies fit into different parts of that
workflow:

```text
User question / ETL instruction
          |
          v
  NVIDIA Nemotron (reasoning and SQL planning)
          |
          v
       Zetaris (read-only data execution)
          |
          v
  Evidence, explanation, and ReactFlow UI
```

The active runtime model route is selected with `MODEL_PROVIDER`. The required
submission route is `nightshift`, where Nightshift supplies the runtime and a
Nemotron lane serves requests. A direct `nvidia` route remains available for
local/provider testing. The Nightshift endpoint, token, and lane name must be
provided by HackOS or the event organizers; no credentials are stored in this
repository.

## Zetaris

### How it is integrated

Zetaris is integrated through a dedicated `ZetarisClient` in
`app/analysis/data.py`. The backend configures the client with:

- `ZETARIS_API_URL` or `ZETARIS_REST_URL` for the Zetaris REST base URL
- `ZETARIS_SQL_ENDPOINT`, defaulting to `/sql-editor/sqls/run`
- `ZETARIS_API_KEY` for authentication
- `ZETARIS_ORG_ID` for organization scoping

For every request, the client sends `Authorization`, `X-Org-ID`,
`X-Request-ID`, and JSON containing a generated query ID, SQL text, source
`SqlEditor`, and a row limit.

The integration is used by `POST /api/v1/agent/query` and
`POST /api/v1/pipelines/{pipeline_id}/chat`. The ETL workflow also uses the
configured data-source/SQL services when introspecting and executing pipeline
instructions.

### What role it plays

Zetaris is the governed data execution layer. Nemotron can interpret a question
and propose a query, but Zetaris runs the read query against the analytical data
source and returns rows as evidence.

The analysis client only permits read-oriented SQL: `SELECT`, `SHOW`, and
`DESCRIBE`. It rejects write or schema-changing statements such as `INSERT`,
`UPDATE`, `DELETE`, `DROP`, and `ALTER`, and rejects multiple SQL statements.
Timeouts, authentication failures, rate limits, transport errors, and malformed
responses are returned as explicit provider errors.

This gives AuraBI a clear control boundary: the model reasons about the user's
request, while Zetaris supplies the factual result used in the answer. The
response can expose generated SQL, source name, trace, latency, and warnings so
the frontend can show how an answer was produced.

## Meterless

### How it is integrated

Meterless is integrated through the provider selector and the OpenAI-compatible
model adapter. Set `MODEL_PROVIDER=nightshift` and provide
`NIGHTSHIFT_BASE_URL`, `NIGHTSHIFT_API_KEY`, and `NIGHTSHIFT_MODEL`. The
Nightshift token is intentionally separate from both `NVIDIA_API_KEY` and
coding-tool credentials. The adapter preserves the contract:

```text
messages + optional tools -> model response
```

The active provider is returned by `/health`, included in analysis traces, and
returned as `provider` in `/agent/query`. Missing Nightshift configuration makes
the service report `llm_configured=false`; it never claims Meterless/Nightshift
served a request. The provider contract is covered by adapter/configuration
tests, while live authentication, tool calling, rate-limit, timeout, and lane
compatibility checks require the organizer-issued endpoint and token.

### What role it would play

Nightshift/Meterless is the runtime model provider for the natural-language
layer. It generates or refines analysis plans, SQL proposals, explanations, and
follow-up questions, while Zetaris remains the data execution layer.

## NVIDIA

### How it is integrated

NVIDIA technology contributes directly through the NVIDIA API Catalog/NIM
OpenAI-compatible endpoint and the Nemotron model adapter in
`app/analysis/model.py`. The direct NVIDIA route reads `NVIDIA_BASE_URL`,
`NVIDIA_API_KEY`, and `NVIDIA_MODEL`, with the default endpoint
`https://integrate.api.nvidia.com/v1`. The selected model is currently
`nvidia/nemotron-3.5-lightning-30b-a3b`, which was confirmed available for the
configured NVIDIA account during integration testing. It can be changed without
code changes.

The model is used in the `AnalysisAgent`, called by
`POST /api/v1/agent/query` and
`POST /api/v1/pipelines/{pipeline_id}/chat`. The adapter supports ordinary chat
completion and tool-enabled completion, allowing the agent to use iterative
reasoning and select the appropriate data-analysis action before Zetaris
executes the read-only query.

The adapter handles provider rate limits with bounded retries and returns
explicit errors when the model route is unavailable. Each model step records
the provider, model, latency, input/output token counts when supplied by the
provider, and whether tools were enabled. `/health` reports the configured
provider/model route and whether the required LLM settings are present.

### What role it plays

NVIDIA Nemotron is the reasoning and orchestration layer of AuraBI. It helps
turn a human business question into a structured process:

1. Understand the business intent.
2. Decide whether data retrieval is needed.
3. Generate a read-only SQL query or use an analysis tool.
4. Receive data returned from Zetaris.
5. Produce an explanation grounded in the returned evidence.
6. Include trace data such as SQL, sources, latency, and warnings.

In the visual ETL experience, the model-backed chat helps users understand a
pipeline and request transformations in natural language. Execution and
high-risk operations remain behind validation and Guardian approval flows.

## What is unique about our use of the sponsor technologies

1. **The model does not pretend to be the database.** Nemotron interprets the
   question and plans the analysis; Zetaris executes the read query and returns
   the evidence.
2. **The result is explainable.** AuraBI returns the answer together with trace
   data, generated SQL, sources, latency, and warnings.
3. **The same intelligence works at two levels.** It supports both standalone
   analyst questions and contextual pipeline chat connected to the ReactFlow
   graph.
4. **Safety is part of the workflow.** Analysis SQL is restricted to one
   read-oriented statement, while pipeline execution can pause for Guardian
   approvals or user questions.
5. **The runtime route is explicit.** Scout Intent classifies every request and
   exposes intent, risk, route, and approval requirement. NVIDIA/Nemotron
   provides the model response only after that decision, and provider identity,
   model, latency, and token usage are visible in health and traces.

Together, NVIDIA provides reasoning, Zetaris provides governed data access, and
the frontend presents the resulting analysis and controls in a visual workflow.

## Meterless engines mounted in AuraBI

AuraBI mounts **H-MEM Agent Engine** as the first Meterless engine because its
core problem is repeated analysis across pipeline chats and runs. The
implementation is in `app/meterless/memory.py`:

- short, normalized memory records are persisted as append-only JSONL;
- records carry source, confidence, layer, namespace, agent, and run IDs;
- relevant memories are retrieved before each Nemotron call;
- Zetaris tool results and final answers are mined back into memory;
- duplicate facts are content-addressed and written once;
- retrieval and writes are included in the analysis trace for judge inspection.

This is the headless version described by the Meterless guides: no UI-only
memory panel, no hidden provider call, and a durable JSONL artifact under
`logs/`. The `METERLESS_MEMORY_LOG` variable allows Docker or local deployments
to choose the artifact location.

### Manual setup checklist

There is no Meterless package, server, API key, or external Meterless account to
install for the mounted H-MEM implementation. The engines in the supplied
Meterless resources are reference architectures implemented inside the
application.

Manually do the following:

1. From the repository root, create `.env` from `.env.example` if it does not
   exist.
2. Keep this setting in `.env`:

   ```env
   METERLESS_MEMORY_LOG=logs/meterless_memory.jsonl
   ```

3. Ensure the process can create the `logs/` directory and write the JSONL
   file. The application creates the directory automatically on the first
   memory write.
4. Activate the project `.venv` and install `requirements.txt`.
5. Configure the model provider and Zetaris credentials if you want live
   memories mined from real analysis results. H-MEM itself has no separate
   credentials.
6. Run an analysis request twice with related questions. The second request
   should retrieve relevant memories, and the trace should contain
   `trace.memory.retrieved` and `trace.memory.written`.

For a credential-free generic-data verification of the complete flow, run:

```bash
python -m pytest -q tests/test_generic_data_flow.py
```

This uses a fake Zetaris-shaped read result and a fake model tool call. It
verifies that rows flow through the agent, become auditable H-MEM records, are
retrieved on a later run, and that an unsafe action is stopped before Zetaris.

For Docker, mount a persistent volume or host directory for `logs/`; otherwise
memory survives only for the lifetime of the API container. Do not commit
`logs/meterless_memory.jsonl` if it contains business data.

Scout Intent remains the request-routing guard in front of H-MEM and the model:
it classifies informational, predictive, and action-oriented requests before
the agent runs. We intentionally do not claim Markovian or World Model support
yet. Those engines require bounded chunk orchestration or a durable entity/
relationship control plane; adding an unconsumed helper would violate the
Meterless guide's "stored ≠ loaded" rule.

## NVIDIA Skills repository

The referenced [NVIDIA Skills repository](https://github.com/NVIDIA/skills) is
an official catalog of portable instructions for coding agents such as Claude
Code and Codex. It is not a model SDK and it does not replace the OpenAI
compatible runtime client used by AuraBI. We used the relevant NVIDIA guidance
by keeping the application integration standards-based:

- NVIDIA API Catalog/NIM endpoint configured through environment variables
- OpenAI-compatible `chat.completions` calls
- explicit model selection instead of hard-coding provider behavior
- tool calling tested independently from ordinary chat
- provider/model/latency/token metadata retained in the trace

The application therefore benefits from NVIDIA's model/runtime ecosystem without
copying agent-only skill files into production code.