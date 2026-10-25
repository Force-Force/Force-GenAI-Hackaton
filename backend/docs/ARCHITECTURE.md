# AuraBI architecture

AuraBI keeps PostgreSQL for application metadata and uses Zetaris as the
analytical source of truth. The runtime path is:

1. FastAPI accepts a business question and normalizes `X-Request-ID`.
2. The analysis supervisor loop asks the configured Nemotron-compatible model
   for a read-only SQL tool call.
3. `ZetarisClient` validates one statement, applies the organization and request
   headers, and executes only approved read queries.
4. The response trace records the model, route, SQL execution, source, latency,
   and warnings without storing credentials.
5. `GET /api/v1/agent/traces/{request_id}` returns the explainability contract.

The current loop is intentionally bounded by `MAX_AGENT_ITERATIONS`. It does not
allow model-generated writes or recursive delegation. Deterministic financial
calculations belong in Python (`app/analysis/calculations.py`) rather than in the
LLM prompt.

The in-process trace store is a demo-stage implementation. Production deployment
must replace it with a PostgreSQL execution-trace repository and tenant-scoped
authorization before traces are considered durable.
