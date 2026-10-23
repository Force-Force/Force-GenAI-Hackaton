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
| `ZETARIS_API_URL` or `ZETARIS_REST_URL` | Zetaris-backed analysis/ETL | Use a container-reachable hostname, not an inaccessible host-local address. |
| `ZETARIS_API_KEY` | Zetaris-backed analysis/ETL | Keep secret; never commit `.env`. |
| `ZETARIS_ORG_ID` | Zetaris-backed analysis/ETL | Use the organization ID supplied by Zetaris. |

The checked-in Compose file explicitly supplies the database URL and CORS values
to the API. If the API needs the LLM or Zetaris variables in Docker, pass them to
the `api` service through a local Compose override or add them to the service's
`environment`/`env_file`; do not put secret values in the committed
`docker-compose.yml`.

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
