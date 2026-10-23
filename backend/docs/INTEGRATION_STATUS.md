# Integration status

| Integration | Status | Evidence / limitation |
|---|---|---|
| Zetaris SQL REST | Implemented, unverified live | Client targets the configurable `/sql-editor/sqls/run` path, sends `Authorization`, `X-Org-ID`, and `X-Request-ID`, and validates response shape. No credentials were available for a live request. |
| NVIDIA Nemotron | Implemented adapter, unverified live | `NemotronClient` uses the OpenAI-compatible configuration `MODEL_BASE_URL`, `MODEL_API_KEY`, and `NEMOTRON_MODEL`. Endpoint compatibility still needs an opt-in integration test. |
| Meterless | Unverified | No confirmed endpoint or credential was present in the environment; the runtime must not claim this route is active. |
| Nightshift | Unverified | No service or artifact configuration was present in the repository. |
| TPCH/demo dataset | Unverified | No live Zetaris catalog was available, so no dataset availability is claimed. |

Secrets belong in `.env` or a deployment secret manager. `.env.example` contains
placeholders only; startup diagnostics and traces must not print secret values.
