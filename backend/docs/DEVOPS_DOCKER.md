# AuraBI Backend: Docker and DevOps Guide

This document explains how to run the AuraBI backend and PostgreSQL database with
Docker Compose, how to configure the services, and how to operate the stack safely.

## 1. What Docker runs

The repository contains two Compose services:

| Service | Image | Purpose | Port |
|---|---|---|---|
| `db` | `postgres:16-alpine` | Application PostgreSQL database | `5432` |
| `api` | Built from `Dockerfile` | FastAPI backend, migrations, and Uvicorn | `8000` |

The database data is stored in the named Docker volume `pgdata`, so restarting or
recreating containers does not remove the database. Removing the volume does remove
all stored data.

The API container starts with:

```text
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The migration runs before Uvicorn. If the migration fails, the API does not start.

## 2. Requirements

Install the following on the host:

- Docker Engine 24+ (or a current Docker Desktop)
- Docker Compose v2 (`docker compose`, not the deprecated `docker-compose`)
- Git
- At least 2 GB of available memory for the API, PostgreSQL, and optional model calls
- Network access from the API container to any external LLM or Zetaris endpoint

The host does not need Python or PostgreSQL for the Docker workflow.

## 2.1 Local Python virtual environment

For development, tests, the Scout Intent evaluation, and running the API without
Docker, use the repository virtual environment:

### Linux and macOS

From the repository root:

```bash
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If `python3 -m venv` fails on Debian/Ubuntu, install the venv package:

```bash
sudo apt update
sudo apt install -y python3-venv
```

### Windows PowerShell

From the repository root:

```powershell
py --version
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation for the current user, run PowerShell as the
developer account and use:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.venv\Scripts\Activate.ps1
```

`requirements.txt` contains both runtime and test dependencies. Verify the
installation with:

```bash
python -m pytest
python scripts/evaluate_scout_intent.py
```

Leave the environment with `deactivate`. The `.venv/` directory is ignored by
Git and must not be committed.

### Confirm the active interpreter

These commands must resolve to the repository venv, not the system Python:

```bash
python -c "import sys; print(sys.executable)"
python -c "import fastapi, sqlalchemy, pydantic_settings; print('dependencies ok')"
```

If the path does not contain `.venv`, activate the environment again or invoke
the interpreter explicitly as `.venv/bin/python` on Linux/macOS.

### Local API startup

After PostgreSQL is available and `.env` is configured:

```bash
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The local process uses `DATABASE_URL` from `.env`. For Docker, the API must use
the Compose hostname `db`, not `localhost`.

## 3. First-time setup

From the repository root:

```bash
cp .env.example .env
```

Edit `.env` before starting the stack. At minimum, review:

| Variable | Required for | Docker guidance |
|---|---|---|
| `DATABASE_URL` | API database access | Compose sets this to the `db` service internally. Do not use `localhost` from inside the API container. |
| `CORS_ORIGINS` | Browser frontend access | Set the exact frontend origins, for example `http://localhost:3000`. |
| `CORS_ALLOW_ALL` | Temporary LAN development | Keep `false` unless this is an isolated development network. |
| `MODEL_BASE_URL` | Agent analysis and Explain Why | Use an endpoint reachable from the container. |
| `MODEL_API_KEY` | Agent analysis and Explain Why | Keep secret; never commit `.env`. |
| `NEMOTRON_MODEL` | Agent analysis and Explain Why | Use the provider's model identifier. |
| `MODEL_PROVIDER` | Active model route | Set to `nvidia` for the NVIDIA API Catalog/NIM route or `nightshift` for the separate Nightshift runtime. |
| `NIGHTSHIFT_BASE_URL` | Nightshift runtime | Obtain the endpoint from HackOS/organizers; keep it separate from NVIDIA settings. |
| `NIGHTSHIFT_API_KEY` | Nightshift runtime | Obtain the runtime token from HackOS/organizers; never reuse a coding-tool token or NVIDIA key. |
| `NIGHTSHIFT_MODEL` | Nightshift runtime | Use the Nemotron lane/model name supplied by the organizers. |
| `NVIDIA_BASE_URL` | Direct NVIDIA route | Defaults to `https://integrate.api.nvidia.com/v1` for the OpenAI-compatible NVIDIA API Catalog route. |
| `NVIDIA_API_KEY` | Direct NVIDIA route | Optional direct-route credential; keep separate from `NIGHTSHIFT_API_KEY`. |
| `NVIDIA_MODEL` | Direct NVIDIA route | Defaults to `nvidia/nemotron-3.5-lightning-30b-a3b` in `.env.example`; select a model available to your NVIDIA key. |
| `METERLESS_MEMORY_LOG` | H-MEM audit memory | JSONL path for retrieved/written Meterless memory evidence; default `logs/meterless_memory.jsonl`. |
| `ZETARIS_API_URL` or `ZETARIS_REST_URL` | Zetaris-backed analysis/ETL | Use a container-reachable hostname, not an inaccessible host-local address. |
| `ZETARIS_API_KEY` | Zetaris-backed analysis/ETL | Keep secret; never commit `.env`. |
| `ZETARIS_ORG_ID` | Zetaris-backed analysis/ETL | Use the organization ID supplied by Zetaris. |

The checked-in Compose file explicitly supplies the database URL and CORS values
to the API. If the API needs the LLM or Zetaris variables in Docker, pass them to
the `api` service through a local Compose override or add them to the service's
`environment`/`env_file`; do not put secret values in the committed
`docker-compose.yml`.

Meterless H-MEM does not require a separate package or service. It runs inside
the API process and writes its append-only audit memory to
`METERLESS_MEMORY_LOG`. For Docker, persist that path if memory must survive
container replacement. For example, add this to a local, uncommitted Compose
override:

```yaml
services:
  api:
    volumes:
      - ./logs:/app/logs
```

The application creates `/app/logs` when it writes the first memory record.
Restrict access to this directory because it can contain analysis summaries and
provider/tool evidence.

Example local override (`docker-compose.override.yml`, not for commit):

```yaml
services:
  api:
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql+asyncpg://datapipe:datapipe@db:5432/datapipe
```

## 4. Start and verify

Build and start both services:

```bash
docker compose up -d --build
```

Check container status and logs:

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f db
```

The API is ready when this returns HTTP 200:

```bash
curl http://localhost:8000/health
```

Expected shape:

```json
{
  "status": "ok",
  "model": "configured-model-or-null",
  "llm_configured": true
}
```

Interactive API documentation is available at
`http://localhost:8000/docs`; the OpenAPI JSON is at
`http://localhost:8000/openapi.json`.

For the direct NVIDIA route, run the provider smoke tests from the activated
venv:

```bash
python smoke_test.py
```

This checks a normal Nemotron response and a required tool call without printing
the API key. Authentication, model availability, tool-calling support, and
timeout behavior depend on the endpoint and key configured in `.env`.

## 5. Frontend and LAN access

For a frontend running on the same machine:

- REST base URL: `http://localhost:8000/api/v1`
- WebSocket base URL: `ws://localhost:8000/api/v1`

For another machine on the LAN, replace `localhost` with the Docker host IP:

- REST: `http://HOST_IP:8000/api/v1`
- WebSocket: `ws://HOST_IP:8000/api/v1`

Set `CORS_ORIGINS` to the frontend's complete origin, including scheme and port.
The backend has no authentication in this MVP. Do not expose port `8000` or
PostgreSQL port `5432` directly to the public Internet.

## 6. Common operations

Stop containers while keeping data:

```bash
docker compose stop
```

Stop and remove containers/networks while keeping the `pgdata` volume:

```bash
docker compose down
```

Rebuild after application or dependency changes:

```bash
docker compose up -d --build
```

Run a migration manually when troubleshooting:

```bash
docker compose run --rm api alembic upgrade head
```

Open a PostgreSQL shell:

```bash
docker compose exec db psql -U datapipe -d datapipe
```

Remove all containers and database data only when intentionally resetting the
environment:

```bash
docker compose down -v
```

## 7. Troubleshooting

### API exits during startup

Read the API logs:

```bash
docker compose logs --tail=200 api
```

Typical causes are an invalid database URL, a failed migration, or missing
dependencies in the image. The API waits for PostgreSQL health, but a healthy
database does not guarantee that a migration can succeed.

### Health works but analysis fails

`/health` only reports whether the LLM configuration fields are present. Verify
that the API container received `MODEL_BASE_URL`, `MODEL_API_KEY`,
`NEMOTRON_MODEL`, and the Zetaris variables, then inspect `docker compose logs api`.
The analysis endpoint returns `500` for incomplete configuration and `502` when an
external analysis provider is unavailable.

### Browser reports a CORS error

Add the exact browser origin to `CORS_ORIGINS`, recreate the API container, and
retry:

```bash
docker compose up -d --force-recreate api
```

Do not solve this by enabling `CORS_ALLOW_ALL=true` on a shared or public host.

### Database data was unexpectedly lost

Check that the named volume still exists:

```bash
docker volume ls
docker compose config
```

Do not run `docker compose down -v` unless deleting the database is intended.

## 8. Production checklist

- Put the API behind HTTPS and an authenticated reverse proxy.
- Restrict firewall access to the frontend/reverse proxy; do not publish PostgreSQL.
- Use secret injection for API keys rather than committed files.
- Pin image versions and review dependency updates.
- Back up the PostgreSQL volume/database.
- Configure log collection and container restart policies.
- Set a specific `CORS_ORIGINS` value; do not use `CORS_ALLOW_ALL`.
- Add authentication and authorization before multi-user or Internet deployment.
