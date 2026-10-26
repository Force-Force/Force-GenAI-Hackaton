# AuraBI Scaffold Project Analysis

## Project Overview

AuraBI Scaffold is a React and Express application for visually designing, validating, and generating data warehouse architecture. The frontend behaves like a technical workspace where users can inspect warehouse tables, drag schema nodes on a canvas, connect columns, simulate source ingestion, run validation checks, generate transformation logic, and chat with an AI data architect.

The project is structured as a single-page React app served through Vite in development and by Express in production. The backend exposes health and chat endpoints, integrates with Gemini when a valid API key is available, and falls back to deterministic local suggestions when the key is missing.

Core technologies used:

- React 19 for the interactive UI.
- TypeScript for typed warehouse models and component contracts.
- Vite with Tailwind CSS v4 for frontend bundling and styling.
- Express for the local API server and production static hosting.
- Google GenAI SDK for AI-assisted schema and pipeline suggestions.
- Lucide React for consistent line-icon UI.
- Motion-ready UI patterns through CSS animations and transition classes.

## Functional Functionalities

### Workspace Shell

- Provides a full-screen app shell with a fixed top navigation bar.
- Splits the main workspace into three primary areas: left AI chat panel, central visual workspace, and right inspector panel.
- Allows the left and right side panels to collapse and reopen with floating handles.
- Maintains a current project name that can be edited from the top navigation.
- Tracks active workspace tab state across canvas, sources, and validation views.

### Visual Schema Canvas

- Displays warehouse objects as draggable node cards.
- Supports four table/node types: fact, dimension, source, and generated.
- Renders tables with names, types, descriptions, columns, primary key markers, and foreign key markers.
- Allows users to expand or collapse individual table cards.
- Allows users to select a node and inspect it in the right panel.
- Supports drag repositioning with simulated grid snapping.
- Draws animated Bezier connection lines between related tables and columns.
- Supports manual connection creation by selecting a source column and destination column.
- Provides quick controls to add fact, dimension, and source nodes.
- Displays an empty-state prompt when no tables exist.

### AI Architect Chat

- Provides a chat panel for user instructions and assistant responses.
- Sends user messages to the backend `/api/chat` endpoint with the current table and connection context.
- Displays markdown-like assistant responses using simple custom formatting.
- Shows loading skeletons while AI output is being generated.
- Supports recommended AI actions returned by the backend, including creating tables and suggesting pipelines.
- Provides prompt shortcut pills for common schema-generation requests.
- Includes local fallback behavior when Gemini is not configured.

### Schema Editing and Inspection

- Shows workspace metrics when no specific node or transformation is selected.
- Shows selected table details in the inspector panel.
- Allows editing a selected table description.
- Allows adding new columns with name, type, and primary-key flag.
- Allows deleting columns from the selected table.
- Allows deleting an entire table node and its associated connections.
- Shows active generated transformation details when a pipeline is selected.
- Displays transformation input columns, output columns, and SQL/dbt logic in a code-styled block.

### Data Source Management

- Displays a list of configured external source systems and connection states.
- Allows toggling a source between connected and disconnected states.
- Provides a drag-and-drop import zone for DDL SQL or CSV-like source definitions.
- Simulates CSV and SQL DDL parsing into generated source table metadata.
- Shows parsed schema preview with columns and data types.
- Allows deploying parsed source schema onto the visual canvas.

### Validation Center

- Displays validation checks grouped by success, warning, and error states.
- Computes validation counts for passed actions, warnings, and failed audits.
- Runs schema validation against core rules such as primary-key presence, fact table relationships, and date dimension presence.
- Allows seeding additional validation rules.
- Allows clearing validation checks.
- Updates the top navigation validation state based on current validation errors.

### Transformation and Export

- Generates a mock dbt-style transformation and shows it in the inspector panel.
- Exports the current schema into SQL DDL-style output.
- Displays generated SQL inside a modal code preview.
- Allows copying generated SQL to the clipboard.
- Supports closing the export preview modal.

### Backend API

- Provides `GET /api/health` for runtime health checks and API key status.
- Provides `POST /api/chat` for AI-assisted warehouse design suggestions.
- Builds a system instruction containing the current visual schema and connection graph.
- Requests structured JSON responses from Gemini when configured.
- Returns deterministic fallback suggestions for promotion dimensions, currency dimensions, ETL pipelines, and general warehouse guidance.
- Serves Vite middleware in development.
- Serves the built frontend from `dist` in production.

## Non-Functional Functionalities

### Usability

- Uses a dense but readable three-panel workspace suitable for technical users.
- Keeps high-frequency actions close to their working context.
- Uses collapsible panels to reduce visual clutter.
- Uses empty states, loading states, and status indicators to guide user actions.
- Uses compact metadata labels and iconography for fast scanning.

### Maintainability

- Separates UI into focused components: navigation, chat, canvas, inspector, data source manager, and validation banner.
- Centralizes domain types in `src/types.ts`.
- Keeps initial mock state in `src/initialData.ts`.
- Encapsulates backend AI integration in `server.ts`.
- Uses TypeScript interfaces to keep data structures explicit.

### Extensibility

- The table model supports multiple node types and optional foreign-key metadata.
- Chat actions can be extended by adding new backend action types and frontend handlers.
- Validation rules can be expanded beyond the current built-in checks.
- Data source parsing can be replaced with real CSV/DDL parsing without changing the overall UI flow.
- The canvas can support additional graph behaviors such as auto-layout, zoom, pan, or multi-select.

### Reliability

- The backend avoids startup failure when `GEMINI_API_KEY` is missing by lazy-loading the AI client.
- The chat endpoint provides local fallback behavior for common prompts.
- UI state updates preserve existing tables and avoid duplicate imported table insertion.
- Schema deletion also removes connected edges to prevent dangling visual relationships.

### Performance

- The app uses local React state and mock data, so most interactions are immediate.
- Vite provides fast frontend development builds.
- Side panels and canvas areas scroll independently to avoid full-page reflow.
- The canvas uses fixed-size positioning and SVG paths, which is appropriate for the current mock data volume.

Potential performance considerations:

- Very large schema graphs could require virtualization or canvas rendering optimization.
- Frequent drag updates currently update React state on mouse movement and may need throttling at scale.
- Large AI responses or generated SQL previews may need streaming or truncation.

### Accessibility

- Many controls include clear text labels, icons, and button semantics.
- Semantic colors are generally paired with text labels or icons.
- Focus styling exists for inputs through border/ring changes.

Accessibility gaps to address:

- Some icon buttons rely heavily on title attributes and should include stronger accessible labels.
- Drag-and-drop interactions need keyboard alternatives.
- The visual graph connection workflow may need screen-reader-friendly summaries.
- Color contrast should be verified for all custom slate shade combinations.

### Security

- Gemini API key is expected from environment variables, not committed code.
- The AI key is only used server-side.
- Express uses JSON request parsing for the chat endpoint.

Security gaps to address before production:

- Add request validation for `/api/chat` payload shape and size.
- Add rate limiting for AI endpoints.
- Sanitize or constrain AI-generated action payloads before applying them to UI state.
- Avoid displaying untrusted generated content as executable HTML.
- Add CORS, auth, and environment-specific configuration if exposed publicly.

### Portability and Deployment

- The app can run locally through the Express server with Vite middleware.
- Production mode serves built assets from `dist`.
- The build script bundles the server with esbuild.
- The frontend and backend are simple enough to deploy together as a Node service.

## Frontend Design Used

The frontend uses a light technical data-workspace design style. It is closer to a professional command center or BI modeling tool than a marketing SaaS dashboard.

### Design Language

- Light slate backgrounds with white panels and cards.
- Indigo primary brand color for main actions, AI/system affordances, and active states.
- Semantic accent colors: emerald for success/connected states, sky/cyan for dimension/info states, amber for warnings or linking mode, rose/red for destructive or failed states, purple for generated artifacts.
- Dense expert UI with compact controls, metadata labels, and small type sizes.
- Rounded cards and pill buttons with tactile bottom borders.
- Subtle shadows and borders for hierarchy instead of heavy gradients.
- Animated live indicators such as pulsing dots, spinning icons, animated connection lines, and loading skeletons.

### Typography

- Sans font: Inter for primary interface copy, headings, controls, labels, and forms.
- Mono font: JetBrains Mono for technical metadata, counters, timestamps, column names, data types, badges, and code.
- Frequent use of small uppercase mono labels with letter spacing for system-like metadata.
- Compact heading scale, usually between 14px and 18px.

### Layout

- Fixed 64px top navigation.
- Main body uses a three-column layout:
  - Left: AI assistant/chat panel.
  - Center: tabbed visual workspace.
  - Right: inspector/details panel.
- The central workspace contains a tab strip and one active content area.
- Canvas mode uses a large scrollable white design surface with a dotted grid.
- Source and validation modes use large rounded white panels inside the workspace.

### Controls and Components

- Primary actions use indigo pill buttons with white text, bottom border depth, hover lift, and active press-down movement.
- Secondary actions use white pill buttons with slate borders and the same tactile press model.
- Cards use white or slate-50 surfaces, slate borders, rounded corners, and subtle elevation.
- Node cards use colored headers based on object type and compact mono column rows.
- Status badges use soft semantic backgrounds with matching text and borders.
- Code previews use dark slate backgrounds and cyan mono text.
- Modals use a dim slate overlay with a subtle blur and an elevated white container.

## Component Map

### `App`

`App` is the application orchestrator. It owns most top-level state, including project name, active tab, panel visibility, tables, connections, sources, validations, transformations, selected node, active transformation, chat messages, loading states, and export modal state.

Primary responsibilities:

- Coordinates state between all workspace components.
- Handles table creation, deletion, movement, expansion, and updates.
- Handles connection creation and foreign-key metadata updates.
- Runs validation checks and switches to the validation tab.
- Generates mock transformation pipelines.
- Exports current schema to SQL DDL.
- Sends chat requests to the backend and applies returned AI actions.

### `TopNav`

`TopNav` renders the fixed application header.

Primary responsibilities:

- Shows brand/project identity.
- Allows project renaming.
- Shows live architecture validation status.
- Exposes global actions: validate, generate ETL, export, and reset.

### `ChatPanel`

`ChatPanel` provides the conversational AI interface.

Primary responsibilities:

- Renders user and assistant messages.
- Shows assistant loading skeletons.
- Provides shortcut prompt pills.
- Sends new user messages upward to `App`.
- Renders AI-recommended action cards.
- Lets users apply or request explanations for recommended actions.
- Supports panel collapse through `App` state.

### `DesignCanvas`

`DesignCanvas` renders the visual schema modeling surface.

Primary responsibilities:

- Displays draggable table nodes.
- Draws animated SVG connection paths between nodes.
- Handles node selection and drag behavior.
- Supports column-to-column linking mode.
- Shows canvas-level controls for adding new node types.
- Shows live status chips and empty-state content.

### `InspectorPanel`

`InspectorPanel` renders contextual details for the current selection.

Primary responsibilities:

- Shows workspace metrics when nothing is selected.
- Shows selected node details and editable description.
- Allows column creation and deletion.
- Allows node deletion.
- Shows generated pipeline details and SQL code.
- Supports panel collapse through `App` state.

### `DataSourceManager`

`DataSourceManager` handles source-system and import simulation workflows.

Primary responsibilities:

- Lists source systems and connection status.
- Toggles source connection state.
- Simulates CSV or SQL DDL parsing.
- Provides drag-and-drop schema import behavior.
- Shows parsed source preview.
- Deploys parsed source nodes onto the canvas.

### `ValidationBanner`

`ValidationBanner` renders the validation center.

Primary responsibilities:

- Shows aggregate success, warning, and error counts.
- Lists validation result cards.
- Allows adding a mock validation rule.
- Allows clearing checks.
- Presents validation state with semantic color and icon treatment.

### `server.ts`

`server.ts` provides the backend runtime.

Primary responsibilities:

- Loads environment variables.
- Creates an Express app.
- Exposes health and chat endpoints.
- Lazily initializes the Gemini client only when a valid API key exists.
- Provides fallback responses when AI is not configured.
- Uses Vite middleware in development.
- Serves static built assets in production.

## Component Interaction Model

### High-Level State Flow

`App` is the central state owner. Child components receive state and callback props from `App`, then notify `App` when user actions occur. `App` updates state and passes the new state back down.

Main state flow:

1. User interacts with a child component.
2. Child component calls a callback prop.
3. `App` updates React state.
4. Updated state flows back into child components.
5. The UI re-renders with the new workspace state.

### Chat-to-Canvas Flow

1. User sends a message from `ChatPanel`.
2. `ChatPanel` calls `onSendMessage`.
3. `App` appends the user message and sets `isGenerating`.
4. `App` posts to `/api/chat` with the message, current tables, and current connections.
5. `server.ts` returns a text response and optional structured action.
6. `App` appends the assistant response.
7. If an action exists, `ChatPanel` renders an action card.
8. User clicks apply.
9. `ChatPanel` calls `onApplyAction`.
10. `App` creates a table, selects it, switches to canvas, or creates a transformation depending on the action type.

### Canvas-to-Inspector Flow

1. User selects a table card in `DesignCanvas`.
2. `DesignCanvas` calls `onSelectNode`.
3. `App` sets `selectedNodeId` and clears the active transformation.
4. `InspectorPanel` receives the selected node.
5. User edits details or columns in `InspectorPanel`.
6. `InspectorPanel` calls `onUpdateTableDetails`.
7. `App` updates the matching table in state.
8. `DesignCanvas` and `InspectorPanel` re-render with the updated node.

### Canvas Linking Flow

1. User clicks a column in `DesignCanvas`.
2. `DesignCanvas` enters link mode and stores the source table/column locally.
3. User clicks a destination column in another table.
4. `DesignCanvas` calls `onAddConnection`.
5. `App` creates a new connection object.
6. `App` updates the source column metadata as a foreign key.
7. `DesignCanvas` renders the new animated SVG relationship path.
8. `ChatPanel` receives an assistant/system message describing the mapping.

### Data Source Import Flow

1. User toggles a source or imports a CSV/DDL in `DataSourceManager`.
2. Source toggles call `onToggleSource`, which updates source status in `App`.
3. Import simulation creates a local parsed schema preview inside `DataSourceManager`.
4. User maps parsed output onto the canvas.
5. `DataSourceManager` calls `onDeployImportedSource`.
6. `App` adds the table if it does not already exist, expands it, selects it, and switches to canvas.
7. `InspectorPanel` shows the newly imported source node.

### Validation Flow

1. User clicks validate in `TopNav`.
2. `TopNav` calls `onValidate`.
3. `App` sets validation loading state and expands all tables.
4. Validation rules are computed against current tables and connections.
5. `App` updates validation results, clears loading state, and switches to the validation tab.
6. `ValidationBanner` displays aggregate counts and detailed validation cards.
7. `TopNav` reflects the overall validation status.

### Transformation Flow

1. User clicks generate ETL in `TopNav`.
2. `TopNav` calls `onGenerateETL`.
3. `App` creates a new mock transformation.
4. `App` prepends it to transformations, marks it active, and clears node selection.
5. `InspectorPanel` shows the active transformation details and code block.
6. `ChatPanel` receives a system message confirming the generated pipeline.

### Export Flow

1. User clicks export in `TopNav`.
2. `TopNav` calls `onExport`.
3. `App` compiles current tables and connections into SQL DDL text.
4. `App` opens the export modal.
5. User can copy the SQL or close the modal.

## Current Limitations

- AI action schemas are inconsistent between backend examples and frontend handling: backend fallback returns `action.table`, while the frontend expects some paths to contain `action.payload`.
- Some fallback and mock data are domain-specific and not yet generalized for arbitrary warehouse design.
- Validation rules are illustrative rather than complete warehouse-quality validation.
- CSV and SQL parsing are simulated rather than real parsers.
- There is no persistence layer; all workspace changes live in React state.
- There is no authentication or user/session isolation.
- There is no automated test suite in the current project.
- Large graph scalability has not yet been addressed.

## Recommended Improvements

- Normalize AI action payload contracts across backend and frontend.
- Add schema validation for AI responses before applying them.
- Add real CSV and SQL DDL parsing.
- Persist workspaces to a database or local storage.
- Add graph zoom, pan, auto-layout, and keyboard navigation.
- Add unit tests for validation, DDL export, and action application.
- Add integration tests for chat-to-canvas workflows.
- Add accessibility labels and keyboard alternatives for graph operations.
- Add request validation, rate limiting, and authentication before production deployment.
