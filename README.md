# AuraBI — Force GenAI Hackathon

**Visual ETL and AI data analyst for banking data.** Design data pipelines on a canvas,
ask questions in plain French or English, and get answers computed on real data:
**NVIDIA Nemotron** reasons, **Zetaris** runs the SQL, and a complete demo bank is
included so you can test everything right away.

> New to the project? Read the **[Application guide](docs/APPLICATION_GUIDE.md)** — what
> AuraBI does, how it works, and a tour of every screen.

---

## Contents

1. [What you need](#1-what-you-need)
2. [Launch in 4 steps](#2-launch-in-4-steps)
3. [Open the app](#3-open-the-app)
4. [Check that everything works](#4-check-that-everything-works)
5. [Demo data included](#5-demo-data-included)
6. [Everyday commands](#6-everyday-commands)
7. [Troubleshooting](#7-troubleshooting)
8. [Project structure](#8-project-structure)
9. [Team](#9-team)

---

## 1. What you need

| Requirement | Details |
|---|---|
| **Docker Desktop** (Windows / macOS) or Docker Engine + Compose (Linux) | Settings → Resources → **Memory: 8 GB or more**, 4 CPUs |
| **Zetaris platform** | `zetaris-platform.zip` and the registry sign-in command, both from the Zetaris Cloud download page |
| **NVIDIA API key** | Free at <https://build.nvidia.com> → any model → **Get API Key** (starts with `nvapi-`) |
| ~15 GB free disk | Docker images and data |

Everything else (Python, Node.js, PostgreSQL…) runs inside Docker — nothing to install.

## 2. Launch in 4 steps

**Step 1 — Get the code**

```bash
git clone https://github.com/Force-Force/Force-GenAI-Hackaton.git
cd Force-GenAI-Hackaton
```

**Step 2 — Add the Zetaris platform** (it is proprietary, so it is not in the repository)

Unzip `zetaris-platform.zip` **inside this folder**, so that you get `./zetaris-platform/docker-compose.yml`,
then sign in to the Zetaris image registry with the command from the Zetaris Cloud download page:

```bash
docker login zetarishackathon.azurecr.io
```

**Step 3 — Add your NVIDIA key**

```bash
cp .env.example .env
```

Open `.env` and paste your key after `NVIDIA_API_KEY=`. That is the only required setting.

**Step 4 — Start everything**

```bash
docker compose up -d --build
```

This one command starts the whole platform: Zetaris, the bank database, the AI backend and
the web app. **The first start takes 10–15 minutes** (image downloads and Zetaris's first
boot). Later starts take about a minute.

Follow the progress with `docker compose ps`: when `web` is running and `demo-seed` shows
`Exited (0)`, AuraBI is ready.

## 3. Open the app

| What | Address | Sign-in |
|---|---|---|
| **AuraBI** | **<http://localhost:8080>** | none |
| API documentation (Swagger) | <http://localhost:8000/docs> | none |
| Zetaris console | <http://localhost:3000> | `ZETARIS_ADMIN_EMAIL` / `ZETARIS_ADMIN_PASSWORD` from `zetaris-platform/.env` |

On first opening, AuraBI shows the demo pipeline **“Démo — Banque AuraBI : fraude &
conformité”** with its first AI conversation. Try these questions in the chat:

- *Combien de clients avons-nous par pays et par segment ?*
- *Quelle catégorie de commerçants a le plus progressé entre 2024 et 2025 ?*
- *Quels clients ont plusieurs fraudes confirmées ?*
- *Quelles agences ont le taux de défaut le plus élevé ?*

## 4. Check that everything works

```bash
docker compose run --rm verify
```

Runs 10 checks against the real services — API, database, Zetaris, Nemotron, and a full
business flow — and ends with `All 10 checks passed`.

## 5. Demo data included

A realistic bank operating in **Cameroon (XAF)** and **France (EUR)** over 2024–2025, loaded
automatically on first start and registered in Zetaris as `AURABI_BANK`:

| | |
|---|---|
| 6,000 customers · 9,165 accounts · 6,059 cards | 263,243 transactions (cards, ATM, transfers, mobile money, salaries) |
| 1,800 loans · 28,609 repayments | 1,290 fraud cases (fraud ground truth) |
| 400 merchants · 25 branches | Daily exchange rates |

It also hides real data-quality problems (duplicates, invalid IBANs, minors with credit
cards…) for the AI agents to find, with an answer key. Details, sample queries and how to
connect: **[database/README.md](database/README.md)**.

## 6. Everyday commands

| Task | Command |
|---|---|
| Status of every service | `docker compose ps` |
| Logs of a service | `docker compose logs -f backend` (or `web`, `zetaris-setup`, `driver`…) |
| Stop (keeps all data) | `docker compose stop` |
| Start again | `docker compose up -d` |
| Update after `git pull` | `docker compose up -d --build` |
| Reset everything (deletes all data) | `docker compose down -v` then `docker compose up -d --build` |

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `zetaris-platform/docker-compose.yml: no such file` | Unzip `zetaris-platform.zip` inside the project folder (step 2) |
| `pull access denied` for `zetarishackathon.azurecr.io` | Run the `docker login` command from step 2 |
| `driver` never becomes healthy | Give Docker more memory (8 GB), then `docker compose up -d` |
| `port is already allocated` | Another program uses 3000, 8000, 8080 or 8888 — stop it, or change `AURABI_*_PORT` in `.env` |
| AI answers “Analyse indisponible… NVIDIA_API_KEY” | Put the key in `.env`, then `docker compose up -d` |
| `zetaris-setup` exited with an error | `docker compose logs zetaris-setup` explains why |
| Something else | `docker compose run --rm verify` names the failing part |

## 8. Project structure

```
.
├── docker-compose.yml     # the whole platform (includes ./zetaris-platform)
├── .env.example           # configuration template (only NVIDIA_API_KEY is required)
├── frontend/              # React + Vite web app, served by nginx
├── backend/               # FastAPI: pipelines, AI agents, Guardian, Zetaris & Nemotron clients
├── database/              # demo bank: schema, data, answer key
└── docs/                  # application guide
```

## 9. Team

Built for the Force GenAI Hackathon by **JeffreyYAJ**, **christotop5**, **kyler004** and
**princemabs** — the full history of both original repositories (backend and frontend) is
preserved in this one.

Licensed under the [MIT License](LICENSE).
