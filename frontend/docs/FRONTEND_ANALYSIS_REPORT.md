# AuraBI Frontend Analysis Report

Generated: 2026-06-03

## Executive Summary

The frontend is a single-page React 19 application for designing a data warehouse schema visually. It combines a draggable schema canvas, an AI assistant panel, mock external data source ingestion, schema validation, ETL generation, SQL export, and a contextual inspector.

The current implementation is effective as a hackathon/demo scaffold: the interactions are visible, state changes are immediate, and the workspace tells a coherent product story. The main limitations are that most data operations are simulated, all application state is held in `App.tsx`, and the AI action contract does not currently match what the backend returns. That mismatch can break the "Apply Schema" flow for AI-generated table and pipeline suggestions.

`npm run lint` passes with `tsc --noEmit`.

## Frontend Architecture

The app is a Vite + React SPA served by the Express server in `server.ts`. The frontend entry point is `src/main.tsx`, and nearly all application state and business logic live in `src/App.tsx`.

Key files:

- `src/App.tsx`: root state container, orchestration, API calls, validation, export, ETL generation, layout state.
- `src/components/TopNav.tsx`: project title, validation status, and workspace actions.
- `src/components/ChatPanel.tsx`: AI chat UI, prompt shortcuts, structured action cards.
- `src/components/DesignCanvas.tsx`: draggable schema canvas, table cards, column linking, SVG relationship lines.
- `src/components/DataSourceManager.tsx`: source connection cards and simulated schema import.
- `src/components/ValidationBanner.tsx`: validation summary and result list.
- `src/components/InspectorPanel.tsx`: selected table editing and transformation detail view.
- `src/types.ts`: shared frontend domain types.
- `src/initialData.ts`: demo schema, sources, validation results, and transformation seed data.

The data flow is simple:

```text
initialData.ts
  -> App.tsx state hooks
  -> child components via props
  -> callbacks back into App.tsx
```

There is no router, global store, persistence layer, query library, or component-level data fetching. This keeps the app easy to reason about but makes `App.tsx` large and tightly coupled.

## Functionalities

### Visual Warehouse Canvas

Implemented in `DesignCanvas.tsx`, backed by `tables`, `connections`, and `expandedTables` state in `App.tsx`.

Current capabilities:

- Renders fact, dimension, source, and generated table nodes.
- Supports dragging table cards with 10px grid snapping.
- Supports expanding and collapsing table columns.
- Allows adding manual fact, dimension, and source nodes.
- Lets the user click one column, then another column in a different table, to create a relationship.
- Draws animated SVG relationship lines between connected tables.
- Shows an empty state after resetting the workspace.

Observed limitations:

- Canvas movement is mouse-only; there is no keyboard interaction or touch support.
- Linking mode allows retargeting within the same table but does not strongly guide valid FK direction.
- Duplicate connections are not prevented.
- Relationships are stored as table IDs, but some export logic assumes IDs are valid SQL table names.

### AI Chat Assistant

Implemented in `ChatPanel.tsx`, with API orchestration in `App.onSendMessage`.

Current capabilities:

- User can send prompts to `/api/chat`.
- Suggestion pills trigger common prompts such as promotion dimension, currency dimension, auto layout, and FactSales explanation.
- Assistant responses are rendered with a small custom Markdown-like parser.
- Structured AI actions display action cards with "Apply Schema" and "Explain Reason" buttons.
- Loading skeleton appears while a response is pending.

Observed limitations:

- The frontend does not send chat history, although `server.ts` accepts a `history` field.
- The Markdown parser only handles a few string patterns and does not actually render inline code or rich Markdown.
- API errors are shown as a generic fallback message and do not expose the real failure.
- Action cards assume every action has `payload`, but the server currently returns action-specific top-level fields such as `table`, `pipelineName`, and `sql`.

### Inspector Panel

Implemented in `InspectorPanel.tsx`.

Current capabilities:

- Shows workspace metrics when nothing is selected.
- Shows ETL/dbt transformation cards in the empty selection state.
- Shows selected table details, editable description, column list, and add/delete column controls.
- Shows active transformation details with source columns, output columns, and generated SQL/dbt logic.
- Allows deleting the selected table.

Observed limitations:

- Deleting a column does not remove or update relationships that reference that column.
- Adding a column does not validate duplicate names.
- Multiple primary keys can be added without warning.
- The workspace metrics view lists transformations but does not let the user select one directly.

### External Source Ingestion

Implemented in `DataSourceManager.tsx`.

Current capabilities:

- Displays mock source systems, including PostgreSQL, Salesforce, Stripe, and Snowflake.
- Lets the user toggle a source between connected and offline.
- Simulates CSV and SQL DDL parsing.
- Supports drag/drop text detection to choose CSV vs SQL simulation.
- Lets the user map the simulated schema onto the canvas as a source node.

Observed limitations:

- No actual file is read from the drop event.
- CSV/SQL parsing is hard-coded to two demo schemas.
- Source connection toggles are local UI state only; they do not connect to real services.
- Re-importing an already deployed schema silently does nothing because duplicate table IDs are ignored.

### Validation Center

Implemented in `ValidationBanner.tsx`, with validation logic in `App.handleValidateWarehouse`.

Current capabilities:

- Shows success, warning, and error counts.
- Lists validation messages by category.
- Runs a simulated validation process with a loading state.
- Checks for missing primary keys.
- Checks whether the first fact table has at least one relationship.
- Checks whether a date/calendar dimension exists.
- Lets the user append a mock custom rule or clear all checks.

Observed limitations:

- Relationship validation only checks the first fact table, not all facts.
- The validation result replaces the entire validation list, so previous context is lost.
- `isValid` is true whenever there are no error validations, even when warnings exist or validations have been cleared.
- "Run Custom Rules" appends a success regardless of actual schema state.

### ETL Generation

Implemented in `App.handleGenerateETL` and the transformation mode in `InspectorPanel.tsx`.

Current capabilities:

- Generates a mock dbt incremental transformation.
- Adds the transformation to the top of the transformation list.
- Opens the right inspector to show the generated logic.
- AI can also suggest a pipeline action, intended to create a transformation.

Observed limitations:

- Generated SQL/dbt logic is static and not derived from current schema changes.
- The generated pipeline maps `customer_email` directly to `customer_key`, which is likely semantically incorrect without a dimension lookup.
- There is no validation of SQL syntax or lineage against current tables.
- AI pipeline actions are affected by the action payload mismatch described below.

### SQL Export

Implemented in `App.handleExportSchema`.

Current capabilities:

- Generates SQL DDL for all current tables.
- Includes primary key declarations.
- Adds foreign key constraints from the current connections.
- Shows the generated SQL in a modal and supports copy-to-clipboard.

Observed limitations:

- The header says "DLL" in multiple places, but this should be "DDL".
- Foreign key `ALTER TABLE` statements use `conn.fromTable` and `conn.toTable`, which are table IDs rather than guaranteed SQL table names.
- Identifiers are not quoted or sanitized.
- Source tables are exported the same as warehouse tables, which may not be desired.
- Clipboard writes are not error-handled.

## Interactions

The primary interaction model is a three-panel workspace:

- Left: AI assistant.
- Center: tabbed workspace for canvas, sources, and validation.
- Right: context inspector.

Important interaction flows:

1. User asks AI for a schema change.
2. `App.onSendMessage` posts the prompt plus current tables/connections to `/api/chat`.
3. The assistant response is appended to chat.
4. If the response includes an action, `ChatPanel` renders an action card.
5. User clicks "Apply Schema".
6. `App.handleApplyAction` mutates schema or transformation state.

Manual schema flow:

1. User clicks "+ Add Fact", "+ Add Dim", or "+ Add Src".
2. `App.handleAddTable` creates a table node.
3. The canvas selects and expands the new node.
4. The inspector allows editing description and adding columns.

Relationship flow:

1. User clicks a column in the canvas.
2. `DesignCanvas` enters linking mode and stores the source column.
3. User clicks a column in another table.
4. `App.handleAddConnection` creates a connection and marks the source column as an FK.

Validation flow:

1. User clicks "Validate Schema" in `TopNav`.
2. `App.handleValidateWarehouse` expands all tables and waits 1.2 seconds.
3. New validation items are generated.
4. The center tab switches to validation.
5. A chat message summarizes the validation action.

Source import flow:

1. User simulates CSV or SQL import, or drops text into the import zone.
2. `DataSourceManager` creates a hard-coded `WarehouseNode`.
3. User clicks "Map onto Canvas".
4. `App.handleDeployImportedSource` adds the source node and switches to the canvas.

## Code Issues and Risks

### High Impact

#### AI action contract mismatch

The backend documents and returns actions such as:

```json
{
  "type": "create_table",
  "table": {
    "id": "DimPromotion",
    "name": "DimPromotion"
  }
}
```

But `ChatPanel.tsx` expects:

```json
{
  "type": "create_table",
  "payload": {
    "id": "DimPromotion",
    "name": "DimPromotion"
  }
}
```

`App.onSendMessage` assigns `data.action` directly to `actionRequired`, and `handleApplyAction` receives `msg.actionRequired.payload`. For the current server shape, `payload` will be undefined. This can break "Apply Schema" and can also break rendering when `ChatPanel` tries to read `msg.actionRequired.payload.name`.

Recommended fix: normalize server actions in `onSendMessage`, or update the backend contract to always return `{ type, payload }`.

#### `connect_tables` is not implemented in the frontend

`server.ts` lists `connect_tables` as a supported AI action, but `ChatPanel.tsx` only renders `create_table` and `suggest_pipeline`, and `App.handleApplyAction` only handles `create_table` and `suggest_pipeline`.

Recommended fix: add action rendering and an apply branch that calls `handleAddConnection`.

#### Column deletion leaves stale relationships

`InspectorPanel.handleDeleteColumn` updates only the table columns. Connections that reference the deleted column remain in `connections`, so the canvas and export can contain invalid relationships.

Recommended fix: move column deletion logic into `App.tsx` or pass a dedicated callback that can update both `tables` and `connections`.

#### SQL export can generate invalid foreign keys

`handleExportSchema` creates tables using `t.name`, but foreign keys use `conn.fromTable` and `conn.toTable`. This only works while IDs and names are identical.

Recommended fix: resolve connection table IDs to `WarehouseNode.name` during export and sanitize/quote identifiers.

### Medium Impact

#### `App.tsx` is too large and owns too many concerns

`App.tsx` currently owns layout state, schema graph mutations, validation, SQL export, ETL generation, AI chat, modal state, and source import side effects. This makes changes risky as the product grows.

Recommended fix: extract a schema reducer or custom hooks such as `useWarehouseSchema`, `useChatAssistant`, `useValidation`, and `useSqlExport`.

#### Validation status can be misleading

`isValid` is derived only from error count. If validations are cleared, the UI shows "Validated" because there are zero errors. Warnings also still show a valid state.

Recommended fix: track validation run status separately from validation severity.

#### Demo actions are presented as real integrations

Source imports, ETL generation, source toggles, and validation rules are all simulated. This is acceptable for a demo, but the UI copy often implies real parsing, compilation, or connectivity.

Recommended fix: label mock actions explicitly or wire them to real implementations before production use.

#### Duplicate schema objects are not consistently handled

Imported tables are deduplicated by ID, but manual nodes use timestamp suffixes and AI-created nodes are silently ignored if their ID already exists.

Recommended fix: surface duplicate feedback and decide whether "apply" should update existing nodes or create a new version.

### Low Impact / Maintainability

- `motion` is listed in `package.json` but is not used in the frontend.
- Several icon imports appear unused in some components.
- The app uses many nonstandard Tailwind-like classes such as `text-slate-450`, `border-slate-250`, and `shadow-3xs`. Tailwind 4 may allow custom values if configured, but there is no visible theme config in this repo, so these may silently produce no CSS.
- `index.html` still has the title "My Google AI Studio App".
- The copy uses "DLL" where it means "DDL".
- There are no tests for core schema mutations or API action handling.
- Many action payloads use `any`, especially around AI actions.

## Accessibility Notes

- Many icon buttons use `title` but not `aria-label`.
- Canvas dragging and column linking are mouse-driven only.
- The table canvas has limited keyboard navigation.
- Drag/drop import has no equivalent file input or accessible fallback.
- Some small text and low-contrast slate variants may be difficult to read.

## Recommended Fix Priorities

1. Normalize AI actions to a single frontend contract and add `connect_tables` support.
2. Update column deletion so it also removes affected connections.
3. Fix SQL export to use resolved table names, quote identifiers, and correct "DDL" copy.
4. Split schema state and mutations out of `App.tsx` into a reducer or custom hook.
5. Make validation status explicit: not run, running, passed, warnings, failed.
6. Add focused tests for `handleApplyAction`, connection creation/deletion, validation, and SQL export.
7. Decide which demo-only features should be clearly labeled versus implemented for real.

## Verification

Command run:

```bash
npm run lint
```

Result: passed. The TypeScript compiler did not report errors.

## Addendum: Can the backend AI modify the canvas? (route verification)

Question: do the documented routes (`Documentation/API_ROUTES.md`) let the backend AI agent modify the canvas?

Finding: not directly. The only AI route is `POST /api/v1/pipelines/{id}/chat` (route 13). It returns a text reply, `agent_tasks` (created `PENDING`, "non executees en MVP"), and metadata. It emits only `chat.message` and `agent_task.updated` over WebSocket. It never creates/updates/deletes nodes or edges and never emits `node.*` / `edge.*` events. The graph-mutating routes (7-11: POST/PATCH/DELETE nodes and edges) are all non-AI CRUD endpoints meant to be called by the client. The Python backend is not part of this repository, so the backend agent cannot be changed from here.

Conclusion: the routes DO enable AI-driven canvas changes, but the actuation must happen on the frontend. The frontend AI agent turns a backend message into structured actions, applies them locally, and persists them through the node/edge REST routes; the backend then echoes `node.created` / `node.updated` / `edge.created` over WebSocket to other clients.

### Persistence design (implemented)

- New top-level nodes/edges created by an applied action are persisted via `POST .../nodes` and `POST .../edges` (`syncCreated` in `src/features/workspace/store/pipelineStore.ts`), with client-to-backend id reconciliation.
- In-place updates to existing nodes are now persisted via `PATCH .../nodes/{id}` (`syncChanged`). This closes the gap where a table routed INTO a warehouse/database container (which mutates the container's `data.children` but not its id) was never written to the backend. Container `data` (including nested `children`) is round-tripped losslessly by `services/mapping/graphMapping.ts`, and `nodeReadSchema.data` is free-form JSON (`z.record`), so PATCH responses still validate.

### Validation endpoint note

There is no dedicated validation/scoring endpoint in the provided routes. The "Run Validation" action therefore queries the authoritative graph via `GET /api/v1/pipelines/{id}` (route 4), runs the local rule set against that server-truth graph, and surfaces a weighted Schema Health Score (success = 1, warning = 0.5, error = 0). It falls back to the local graph when no pipeline is bound or the request fails, and labels which source was used.
