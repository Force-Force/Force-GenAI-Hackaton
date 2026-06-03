# AuraBI Workspace

An AI-powered ETL pipeline design workspace. Visually design data warehouses and
ETL pipelines on a React Flow canvas, converse with an AI Data Architect (served
by a **FastAPI backend**), inspect resources, edit transformation code, and
compile warehouse DDL.

The frontend is backend-agnostic: it talks to the FastAPI backend exclusively
through a configurable service layer. There is **no** AI SDK or Express server in
this repository.

## Architecture

```text
src/
  app/providers/        Error boundary + React Flow provider
  pages/                WorkspacePage (top-level composition)
  layouts/              TopNav + 3-panel resizable WorkspaceLayout
  components/ui/         Design-system primitives (Button, Badge, Panel, ...)
  features/
    chat/               AI chat panel + chatStore
    workspace/          Pipeline canvas, nodes, widgets, hooks, pipeline/workspace stores
    inspector/          Context-sensitive inspector views
    sources/            CSV / SQL DDL import
    validation/         Schema validation center
  services/             http client, ai service, persistence adapters
  contracts/            Zod schemas for AI actions + API (single source of truth)
  types/                Domain model (pipeline graph)
  utils/                validationRules, ddlExport, applyAiAction, parsers, graph
  store/                Persistence storage bridge
```

State is managed with **Zustand** (`persist` middleware) across three stores:
`pipelineStore` (graph), `chatStore` (messages), and `workspaceStore` (UI/session).

## Backend contract

The frontend expects the FastAPI backend to expose:

- `POST /chat` → `{ message, graph }` returns `{ text, action }`
- `POST /processing/submit` → `{ nodeId, language, code }` returns `{ text, action }`

`action` must conform to the discriminated union in
[`src/contracts/aiActions.ts`](src/contracts/aiActions.ts) (`create_resource`,
`create_processing`, `connect_nodes`, `explain`). Every response is validated
with Zod before it is allowed to mutate the canvas; invalid payloads are rejected.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy env config: `cp .env.example .env` and set `VITE_API_BASE_URL`
   (defaults to `/api`, proxied to `VITE_API_PROXY_TARGET` in dev).
3. Start the dev server: `npm run dev`

The Vite dev server proxies `/api` to the FastAPI backend
(`VITE_API_PROXY_TARGET`, default `http://localhost:8000`).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — `tsc --noEmit` type-check
- `npm test` — unit + integration tests (Vitest)
- `npm run test:e2e` — Playwright e2e tests (run `npx playwright install` once)

## Configuration

| Variable                 | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `VITE_API_BASE_URL`      | Base URL for all backend calls (e.g. `/api`).        |
| `VITE_API_PROXY_TARGET`  | Dev-only proxy target for `/api`.                    |
| `VITE_API_AUTH_TOKEN`    | Optional Bearer token attached to requests.          |
