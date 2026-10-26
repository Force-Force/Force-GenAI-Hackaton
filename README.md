# AuraBI

Visual ETL and AI data analyst for banking data. Design pipelines on a canvas, ask questions
in plain language, and get answers computed on real data: **NVIDIA Nemotron** reasons,
**Zetaris** runs the SQL, and a complete test bank database is included.

## Before you start

1. **Docker Desktop** with at least 8 GB of memory.
2. **The Zetaris platform running** on the same machine (`zetaris-platform.zip`:
   `docker compose up -d`, then `./verify.sh` must pass).
3. **An NVIDIA API key**, free at <https://build.nvidia.com> ("Get API Key").

## Run it — 3 commands

```bash
cp .env.example .env            # then set NVIDIA_API_KEY and ZETARIS_PASSWORD in .env
docker compose up -d --build    # database + Zetaris registration + API + web app
docker compose run --rm verify  # end-to-end check on the real services
```

Open **<http://localhost:8080>**.

`verify` checks the API, the database, Zetaris (`SELECT 1` and bank queries), Nemotron (a
real completion), then a full business flow: a chat question answered from Zetaris data,
the analysis agent and the insights page. Every check must pass.

## What runs

| Service | Address | Role |
|---|---|---|
| web | <http://localhost:8080> | React app (canvas, AI chat, insights, history) |
| backend | <http://localhost:8000/docs> | FastAPI: pipelines, agents, Guardian, analysis |
| db | localhost:5433 | PostgreSQL: app data and the test bank |
| zetaris-setup | — | Registers the bank in Zetaris as `AURABI_BANK`, then exits |

The test database is described in **[database/README.md](database/README.md)**: 6,000
customers, 263,000 transactions, loans, fraud cases, and hidden data-quality problems with
their answer key.

## Questions to try in the chat

- *Combien de clients avons-nous par pays et par segment ?*
- *Quelle catégorie de commerçants a le plus progressé entre 2024 et 2025 ?*
- *Quels types de fraude coûtent le plus cher ?*
- *Quelles agences ont le taux de défaut le plus élevé ?*

## Troubleshooting

| Symptom | Fix |
|---|---|
| `network zetaris_default ... could not be found` | Start the Zetaris platform first |
| `zetaris-setup` exits with an error | Read it: `docker compose logs zetaris-setup` (usually `ZETARIS_PASSWORD`) |
| `verify` fails on Nemotron | Check `NVIDIA_API_KEY` in `.env`, then `docker compose up -d` |
| Start from scratch | `docker compose down -v && docker compose up -d --build` |
