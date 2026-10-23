# AuraBI implementation assessment

## Verified baseline

- The repository is a FastAPI/SQLAlchemy ETL application with PostgreSQL metadata
  persistence and existing Guardian/approval models.
- A hackathon endpoint already existed at `POST /api/v1/agent/query`, but it
  delegated directly to a tool-calling loop and returned an untyped trace.
- Zetaris requests used a fixed endpoint and a prefix-only SQL check. Multiple
  statements and semicolon/comment edge cases were not rejected.
- Nemotron is configured through an OpenAI-compatible client, but no live
  credentials or provider health could be verified in this environment.
- The baseline test command could not run because `pytest` is not installed in
  the active Python environment.

## Implemented in this iteration

- Strict one-statement validation that understands quoted strings and SQL
  comments.
- Read-only enforcement for the analytical Zetaris client.
- Request-ID propagation from the API to the Zetaris request and trace response.
- Redacted, categorized Zetaris errors for timeout, authentication,
  authorization, rate limit, transport, and malformed responses.
- Typed Explain Why response fields and a trace retrieval endpoint.
- Deterministic gross-margin calculations in `app/analysis/calculations.py`.
- Canonical Zetaris URL/endpoint configuration placeholders.

## Unverified or remaining work

- Live Zetaris, Meterless, NVIDIA, Nightshift, and TPCH access require
  credentials and environment services that were not available for verification.
- Semantic views/KPI catalogue and workflow traces are not yet persisted as
  dedicated PostgreSQL tables.
- Trace retrieval is process-local until an execution-trace migration and
  repository service are added.
- Authentication/tenant authorization, profiling, alerting, and frontend evidence
  panels remain follow-up work.
