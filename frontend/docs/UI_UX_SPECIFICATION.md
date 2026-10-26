# AuraBI — Comprehensive UI & UX Specifications

**Project:** AuraBI Data Pipeline Workspace  
**Document Type:** Detailed UI/UX Architecture & Interface Specification  
**Version:** 2.0  
**Status:** Implemented & Verified  

---

## 1. Executive Summary & Design Philosophy

AuraBI is an agent-driven visual data intelligence and ETL pipeline platform. Its interface is designed to bridge natural language AI interaction with visual direct manipulation of complex data pipelines.

### Design Principles
1. **Direct Manipulation with AI Symbiosis**: Users can edit the pipeline directly using graphical tools, or converse with the AI Data Architect to generate, audit, and restructure pipelines.
2. **Predictable, Reversible Operations**: Every AI recommendation requires explicit user consent (via Action Cards) or is visually traceable. Mutations are non-destructive and auditable.
3. **Information Hierarchy & Progressive Disclosure**: Complex details (column data types, SQL code, lineage metrics) are progressively revealed via toolbars, accordions, and inspectors rather than cluttering the macro graph.
4. **Tactile & Responsive Feedback**: High-contrast states, physical-depth button styling (`border-b-[3px]`), animated data-flow edges, and clear optimistic state transitions keep the user informed.

---

## 2. Design System Foundations

### 2.1 Typography
The typography system uses two typefaces:
* **Interface Font**: Modern geometric sans-serif (`font-sans`, Inter / system sans) for all labels, navigation, headings, and conversational copy.
* **Monospace Font**: Monospace (`font-mono`, JetBrains Mono / Fira Code / system mono) for identifiers, table names, SQL/Python code, schema types, timestamps, and metrics.

| Style Token | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | Sans | 24px–30px | Black (900) / Bold (700) | 1.1 | Score digits, container letter badges |
| `text-heading-md` | Sans | 15px–16px | Bold (700) | 1.25 | Panel headers, modal titles, node labels |
| `text-heading-sm` | Sans | 13px–14px | Bold (700) / Semi (600) | 1.3 | Card titles, tab labels, section titles |
| `text-body` | Sans | 12px–13px | Regular (400) / Semi (600) | 1.5 | Message copy, descriptions, handbook |
| `text-mono-code` | Mono | 10.5px–11px| Regular (400) | 1.4 | Code blocks, CodeMirror, schema DDL |
| `text-caption` | Mono | 9px–10px | Bold (700) / Regular (400) | 1.2 | Uppercase tech badges, counts, metadata |

### 2.2 Color Tokens & Semantic Palette

AuraBI supports full Light and Dark modes with automatic contrast preservation:

```text
Light Mode: Slate 50 / White surfaces  -->  Slate 200 borders  -->  Slate 800 / 900 text
Dark Mode:  Slate 950 / 900 surfaces   -->  Slate 700 / 800 borders -->  Slate 100 / 200 text
```

| Semantic Role | Light Mode Value | Dark Mode Value | Representative Components |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `#4F46E5` (Indigo 600) | `#6366F1` (Indigo 500) | Logo, primary buttons, user bubbles, flow edges |
| **Success / Source**| `#10B981` (Emerald 500) | `#34D399` (Emerald 400) | Resource selection ring, Valid badge, CSV badges |
| **Transform / Engine**| `#A855F7` (Purple 500) | `#C084FC` (Fuchsia 400) | Processing selection ring, Processing button |
| **Info / Database** | `#06B6D4` (Cyan 500) | `#38BDF8` (Sky 400) | Database container, Foreign Key handles & edges |
| **Warning / Mart** | `#F59E0B` (Amber 500) | `#FBBF24` (Amber 400) | Datamart container, Pending tasks, warnings |
| **Danger / Error** | `#EF4444` (Rose 500) | `#F87171` (Rose 400) | Delete buttons, Error badges, Failed validation |

### 2.3 Tactile Button Styling
Buttons in AuraBI feature physical depth feedback:
* **Default State**: Defined base with physical bottom border: `border-b-[2.5px]` or `border-b-[3px]`.
* **Hover State**: Elevates by `-1px` with increased border depth `border-b-[4px]`.
* **Active (Pressed) State**: Depresses by `+1.5px` or `+2px` with border reduced to `border-b-[1px]`.
* **Disabled State**: Opacity reduced to 40%–50% with `cursor-not-allowed`.

---

## 3. High-Level Information Architecture & Shell Layout

The application viewport is managed by a single horizontal `react-resizable-panels` group:

```text
+----------------------------------------------------------------------------------------------------+
|  Top Navigation Bar (TopNav: h-14 / 56px)                                                          |
+--------------------------+----------------------------------------------+--------------------------+
|  Left Pane: Chat         |  Center Workspace (Tabs & Canvas)            |  Right Pane: Inspector   |
|  (ChatPanel)             |  (CenterWorkspace)                          |  (InspectorPanel)        |
|  Default: 24%            |  Flexible: 52%                               |  Default: 24%            |
|  Min: 16% / Max: 42%     |  Min: 30%                                    |  Min: 16% / Max: 42%     |
+--------------------------+----------------------------------------------+--------------------------+
|  Overlays & Modals: ExportModal (z-50)                                                             |
+----------------------------------------------------------------------------------------------------+
```

### Panel Controls & Resizing UX
* **Splitter Handles**: 6px (`w-1.5`) resize dividers between panes. Hovering activates an indigo wash (`#4F46E5/40`), and active dragging highlights solid `#4F46E5`.
* **Independent Collapse**: Both left and right panes can be independently collapsed via header icons or top-nav buttons. When collapsed, the center canvas automatically reclaims 100% of the remaining space.
* **Fullscreen Mode**: Activating fullscreen from the canvas toolbar hides the top navigation and both side panels, giving the canvas 100vw × 100vh of space. Pressing `Esc` or clicking "Exit" restores the previous panel sizes.

---

## 4. Comprehensive UI Specifications by Region

---

### Region 1: Top Navigation Bar (`TopNav.tsx`)

A fixed-height horizontal navigation header anchored at `z-30`.

```text
[ [Boxes] AuraBI ] / [ Project Name Input ] [ Valid / Errors ]   ...   [Moon/Sun] [PanelL] [PanelR] | [Reset] [Validate] [Compile DDL]
```

#### Visual Elements & Interactivity
1. **Brand Identity Badge**:
   * Icon container: 32×32px rounded square (`rounded-lg bg-[#4F46E5] text-white`).
   * Icon: Lucide `Boxes` (18px).
   * Brand text: **"AuraBI"** in bold sans-serif, uppercase tracking (`tracking-tight text-slate-900 dark:text-slate-100`).
2. **Breadcrumb Divider**:
   * Muted slash `/` in `text-slate-300 dark:text-slate-600`.
3. **Project Name Editable Input**:
   * Seamless inline editable text field (`projectName` state).
   * Visual state: Transparent background by default; soft slate highlight on hover and focus ring on click.
   * Truncates with ellipsis if project name exceeds available width.
4. **Validation Health Pill**:
   * Appears immediately beside the project title:
     * Green pill (`Badge tone="success"`): **"Valid"** when graph passes checks.
     * Red pill (`Badge tone="danger"`): **"Errors"** when issues exist.
     * Hidden if validation has not been run.
5. **Theme Switcher**:
   * Ghost icon button displaying `Sun` in dark mode or `Moon` in light mode.
   * Tooltip: *"Switch to light mode"* / *"Switch to dark mode"*.
6. **Panel Toggle Controls**:
   * **Left Panel Toggle**: Ghost button with `PanelLeft` icon. Displays active pressed state when panel is visible.
   * **Right Panel Toggle**: Ghost button with `PanelRight` icon. Displays active pressed state when panel is visible.
7. **Global Action Buttons**:
   * **"Reset" Button**: Secondary button (`RotateCcw` icon). Reverts the canvas to default ETL template and clears validations.
   * **"Validate" Button**: Secondary button (`ShieldCheck` icon). Runs graph auditing.
   * **"Compile DDL" Button**: Primary button (`FileCode2` icon, brand indigo). Generates SQL DDL and opens the Export Modal.

---

### Region 2: Left Panel — AI Data Architect (`ChatPanel.tsx`)

The conversational interface to the backend Master Agent.

#### 2.1 Header
* **Bot Avatar Tile**: Compact 28×28px indigo badge with `Bot` icon.
* **Header Titles**:
  * Title: **"AI Data Architect"** (14px, bold).
  * Subtitle: *"Backend-powered assistant"* (10px, monospace).
* **Collapse Button**: Ghost `ChevronLeft` button with hover highlight (`hover:bg-slate-100 dark:hover:bg-slate-800`).

#### 2.2 Message Feed (`MessageList.tsx`)
A scrollable stream with automatic smooth scroll to the bottom upon new messages.

* **User Message Bubble**:
  * Right-aligned (`self-end ml-auto max-w-[90%]`).
  * Surface: Solid indigo (`bg-indigo-600 text-white`).
  * Header: `User` icon + **"You"** + timestamp.
* **Assistant Message Bubble**:
  * Left-aligned (`self-start mr-auto max-w-[90%]`).
  * Surface: Slate surface (`bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700`).
  * Header: `Bot` icon (indigo) + **"AuraAI Architect"** + timestamp.
  * **Markdown Formatting (`Markdown.tsx`)**:
    * Headers: Bold headings (`h1`–`h4`) with top margin.
    * Lists: Bulleted with rounded markers.
    * Inline code: Slate pill background with monospace styling.
    * Code blocks: Fenced blocks with language badge and right-aligned "Copy" button.
* **Embedded Action Card (`ActionCard.tsx`)**:
  * Rendered directly inside an assistant bubble when a structured action is returned.
  * Header: `Sparkles` icon with uppercase label *"Recommended Action"*.
  * Action Summary Box:
    * `create_resource`: Displays target table label, kind, and list of columns.
    * `create_processing`: Displays transform language, label, and code snippet preview.
    * `connect_nodes`: Displays directed arrow `fromNode → toNode`.
  * Action Controls:
    * **"Apply Changes"** (`Wand2` icon): Primary button. Immediately dispatches the action to the canvas store and switches the center tab to Canvas.
    * **"Explain"**: Secondary button. Posts a follow-up query to the AI: *"Explain in depth why [target] is a good design choice..."*.
* **Delegated Sub-Agent Tasks (`AgentTaskList.tsx`)**:
  * Rendered when the Master Agent delegates work.
  * Header: `Workflow` icon with label *"Delegated Agents (count)"*.
  * Task Card:
    * Role Title: Monospace bold (e.g. `PROFILER`, `ENGINEER`, `DEBUGGER`, `QA`, `AUDITOR`).
    * Instruction: Monospace muted preview.
    * Status Badges:
      * `PENDING`: Amber (`bg-amber-50 text-amber-700`).
      * `RUNNING`: Sky blue (`bg-sky-50 text-sky-700`).
      * `COMPLETED`: Emerald (`bg-emerald-50 text-emerald-700`).
      * `FAILED`: Rose (`bg-rose-50 text-rose-700`).
* **Thinking State**:
  * Pulsing card with `Bot` icon and *"AuraAI thinking..."*.
  * 3 animated skeleton placeholder bars (`animate-pulse`).

#### 2.3 Prompt Shortcuts & Input (`PromptShortcuts.tsx` & `ChatInput.tsx`)
* **Prompt Pill Shortcuts**:
  * Horizontally wrapping pills with tactile press depth:
    * *"Add a promotion dimension table"*
    * *"Add a currency exchange rate dimension"*
    * *"Suggest an ETL pipeline for web orders"*
* **Chat Input**:
  * Pill-shaped input (`rounded-full`) with placeholder *"Ask the AI architect..."*.
  * Circular send button with `Send` icon; disabled when input is empty or AI is generating.

---

### Region 3: Center Workspace (`CenterWorkspace.tsx`)

#### 3.1 Workspace Tab Bar
Anchored at the top of the center panel:
1. **Pipeline Canvas** (`Workflow` icon)
2. **Data Sources** (`Database` icon)
3. **Validation** (`ShieldCheck` icon)

#### 3.2 Hierarchical Breadcrumb Navigation (`Breadcrumb.tsx`)
* Hidden at the root view.
* Appears when drilled into a Datamart:
  * `[Home icon] Pipeline` > `[ChevronRight]` > `[Datamart Name]`.
  * Allows one-click return to the top-level pipeline canvas.

---

### Region 4: Tab 1 — Pipeline Canvas (`PipelineCanvas.tsx`)

#### 4.1 Floating Canvas Toolbar (`CanvasToolbar.tsx`)
Anchored in the top-left corner (`z-20`):
* **`+ Resource`**: Emerald/indigo primary button (`PlusCircle` icon). Adds a new table/source node.
* **`+ Processing`**: Success-green button (`Code2` icon). Adds an SQL/Python processing step.
* **`Auto Layout`**: Secondary button (`LayoutGrid` icon). Computes clean Dagre `LR` layout.
* **`Full Screen` / `Exit`**: Secondary button (`Maximize2` / `Minimize2` icon).

#### 4.2 Graph Viewport & Canvas Controls
* **Background Grid**: Dot grid (`BackgroundVariant.Dots`, 24px spacing).
* **MiniMap**: Bottom-right corner, pannable, zoomable with viewport shadow.
* **Zoom / Pan Controls**: Bottom-left standard zoom in, zoom out, fit view, and lock controls.
* **Empty State**: Centered card with spinning `Orbit` icon and guidance when 0 nodes exist.

#### 4.3 Custom Node Specifications

##### A. Resource Node (`ResourceNode.tsx`)
* **Dimensions**: 224px fixed width, rounded-xl (`rounded-xl border`).
* **Handles**: Left target handle (`Position.Left`), Right source handle (`Position.Right`).
* **Selection State**: Highlighted by an Emerald border (`#10B981`) and focus ring (`ring-2 ring-[#10B981]/30`).
* **Icon Tile**: 40×40px square tile colored per technology:
  * `CSV`: Green tile with `FileText` icon.
  * `PostgreSQL`: Sky tile with `Database` icon.
  * `MySQL`: Orange tile with `Database` icon.
  * `Snowflake`: Cyan tile with `Cloud` icon.
  * `REST API`: Sky tile with `Globe` icon.
  * `Parquet / JSON / XLSX`: Distinct file icons.
* **Header**: Node label and uppercase kind (e.g. `TABLE SOURCE`).
* **Footer**: Tech badge pill + column counter (e.g. `8 cols`).
* **Selection Floating Toolbar (`ResourceInfoWidget.tsx`)**:
  * Floats above the node when selected.
  * Lists columns with `Key` icon (Primary Key) or `Link2` icon (Foreign Key), plus data types.

##### B. Processing Node (`ProcessingNode.tsx`)
* **Dimensions**: 224px fixed width, rounded-xl.
* **Selection State**: Purple border (`#A855F7`) with violet glow ring.
* **Icon Tile**: 40×40px square tile colored per engine:
  * `SQL`: Sky tile with `Database` icon.
  * `Python`: Yellow tile with `FileCode` icon.
  * `Spark`: Orange tile with `Boxes` icon.
  * `Pandas`: Indigo tile with `Code2` icon.
  * `dbt`: Rose tile with `Boxes` icon.
* **Header**: Transform step label + purple subtitle `"Transformation"`.
* **Footer**: Engine badge pill + inlet/outlet summary (e.g. `2 in / 1 out`).

##### C. Intelligent Container Node (`ContainerNode.tsx`)
* **Dimensions**: 260px wide (collapsed), expands to 320px wide (expanded).
* **Categories**:
  * **"W" - Data Warehouse**: Indigo gradient badge (`from-indigo-500 to-indigo-700`).
  * **"D" - Imported Database**: Cyan gradient badge (`from-cyan-500 to-sky-700`).
  * **"M" - Data Mart**: Amber gradient badge (`from-amber-400 to-orange-600`).
* **Interactive Behaviors**:
  * **Warehouse & Database**: Expand in-place via smooth accordion animation, exposing internal tables in an embedded tabular list.
  * **Datamart**: Displays **"Open Mart"** action (`ArrowRightToLine`) that navigates into a sub-canvas.

#### 4.4 Custom Lineage Connectors (`FlowEdge.tsx`)
Tri-layer SVG connector:
1. **Base Layer**: Soft static smooth-step curve.
2. **Streaming Layer**: Dashed stroke overlay flowing from source to target (`.aura-edge-flow`).
3. **Travelling Particle**: Glowing circular particle travelling along the stroke path (`.aura-edge-particle`).
4. **Color coding**: Cyan (`#06B6D4`) for Foreign Key links; Indigo (`#6366F1`) for data pipeline flows.

---

### Region 5: Tab 2 — Data Sources Manager (`DataSourceManager.tsx`)

A two-column management workspace:
* **Left Column ("Connected Sources")**:
  * Cards for active sources (*Production PostgreSQL*, *Stripe Billing API*, *Warehouse Lakehouse*).
  * Displays table count, format badge, and interactive **Live** (Green checkmark) / **Off** (Neutral cross) status switch.
* **Right Column ("Import Schema")**:
  * Format selector pills: **CSV** vs. **SQL DDL**.
  * File upload button: Accepts `.csv`, `.sql`, `.txt`.
  * Dark monospace textarea for pasting raw schema/data.
  * Action button: **"Parse & Add to Canvas"**.
  * Dynamic feedback alerts:
    * Emerald success card: Displays imported tables and rows with a direct `"View on canvas →"` link.
    * Amber notice card: Displays parser warnings (e.g. duplicate column names, inferred types).

---

### Region 6: Tab 3 — Schema Validation Center (`ValidationCenter.tsx`)

* **Header**: Title with `ShieldCheck` icon, plus a **"Run Validation"** button with a spinning refresh icon.
* **Schema Health Score Card**:
  * Status badge: Uppercase pill showing **`PASSED`** (Emerald) or **`FAILED`** (Rose).
  * Source indicator: *"Computed by the backend engine"* or *"Computed locally"*.
  * Large Score Display: Letter grade and numeric score (e.g. **`A  95/100`**).
  * Narrative Summary: Explanatory text detailing errors, warnings, and remediation steps.
* **Audit Items List**:
  * Color-coded cards:
    * **Success** (`bg-emerald-50`, green checkmark)
    * **Warning** (`bg-amber-50`, amber triangle)
    * **Error** (`bg-rose-50`, red circle cross)
  * Lists category tag (`STANDARDS`, `RELATIONSHIPS`, `ARCHITECTURE`) and the specific validation finding.

---

### Region 7: Right Panel — Context-Sensitive Inspector (`InspectorPanel.tsx`)

Adapts its contents based on the currently selected node:

#### 7.1 Default State (Nothing Selected): `WorkspaceMetrics.tsx`
* **2×2 Overview Grid**:
  * **Nodes**: Total count.
  * **Connections**: Total edge count.
  * **Processing**: Count of transform steps.
  * **Resources**: Count of source and warehouse tables.
* **Architect Handbook Callout**: Informational card explaining navigation, container expansion, and code inspection.

#### 7.2 Resource Selected: `ResourceInspector.tsx`
* Resource kind badge and label.
* Editable multiline Description textarea.
* Column list showing Primary Key status (`Key` icon) and individual delete buttons.
* **Add Column Form**:
  * Text input for column name.
  * Type dropdown (`INT`, `VARCHAR(100)`, `DECIMAL(10,2)`, `BOOLEAN`, `DATE`, `TIMESTAMP`).
  * "Surrogate PK" checkbox.
  * "Add" button.
* Role tag and red **"Delete Node"** button.

#### 7.3 Processing Step Selected: `ProcessingInspector.tsx`
* Step label and language badge.
* Badges for inlet dependencies and outlet columns.
* **Code Editor Widget (`CodeEditorWidget.tsx`)**:
  * Status indicator: *"in sync"* vs *"unsaved changes"*.
  * 240px CodeMirror editor with SQL/Python syntax highlighting.
  * **"Submit to AI"** button: Sends the code back to the Master Agent for review.
  * **"Revert"** button (`RotateCcw`): Resets local buffer to stored state.
* Red **"Delete Node"** button.

#### 7.4 Container Selected: `ContainerInspector.tsx`
* Container category title (*Data Warehouse*, *Imported Database*, *Data Mart*).
* List of all enclosed tables with column counts.
* **"Open Mart"** (if Datamart) or **"Expand/Collapse Tables"** (if Warehouse/Database).
* Red **"Delete"** button.

#### 7.5 Live Generated Code Panel (`GeneratedCodePanel.tsx`)
* Mounted at the bottom of the inspector for Resource and Container nodes.
* Tab toggle: **SQL** vs **Python**.
* Dark monospace viewer with compiled DDL.
* **"Copy"** button with a 1.5-second *"Copied"* confirmation checkmark.

---

### Region 8: Modals & Dialogs — Export Modal (`ExportModal.tsx`)

Triggered by the **"Compile DDL"** button in the TopNav.

* **Backdrop**: Translucent blur overlay (`bg-slate-900/40 backdrop-blur-sm`).
* **Modal Dialog**: Centered rounded card (`max-w-2xl max-h-[80vh]`).
* **Header**: Title *"Compiled Warehouse DDL"* and close `X` button.
* **Body**: Monospace syntax-highlighted code block displaying the compiled ANSI/PostgreSQL DDL script.
* **Footer Actions**:
  * **"Copy"** button: Copies DDL to clipboard with checkmark confirmation.
  * **"Download .sql"** button: Downloads a `.sql` file named `{project_name}.sql`.

---

## 5. Comprehensive UX & Accessibility (a11y) Specifications

### 5.1 Keyboard Navigation Matrix
The canvas supports full keyboard control (`tabIndex={0}`):

| Key Binding | Target / Context | Action |
| :--- | :--- | :--- |
| `Arrow Right` / `Arrow Down` | Canvas Node | Move selection to next downstream node |
| `Arrow Left` / `Arrow Up` | Canvas Node | Move selection to upstream parent node |
| `Enter` | Selected Datamart Node | Drill down into the datamart sub-canvas |
| `Delete` / `Backspace` | Selected Node | Delete node and cascade-delete connected edges |
| `Escape` | Modal / Fullscreen | Close export modal or exit fullscreen canvas mode |
| `Tab` / `Shift+Tab` | Application Shell | Cycle focus through TopNav, Chat, Tabs, and Inspector |

### 5.2 Screen Reader & ARIA Standards
* **Landmarks**: `<header>` for TopNav, `<nav aria-label="Datamart navigation">` for breadcrumbs.
* **Interactive Roles**:
  * Canvas is marked `role="application"` with descriptive `aria-label`.
  * Chat feed is marked `role="log"` with `aria-live="polite"` for automatic speech synthesis of new messages.
  * Tabs are marked `role="tablist"` and `role="tab"` with `aria-selected` bindings.
  * Modals are marked `role="dialog"` and `aria-modal="true"`.
* **Descriptive Labels**: All icon-only buttons include explicit `aria-label` tags (e.g. `"Collapse chat panel"`, `"Show inspector panel"`, `"Copy generated code"`).

### 5.3 State Transitions & Optimistic Updates
1. **Graph Actions**: Adding nodes or deleting elements updates the Zustand store instantly, syncing changes in the background via REST (`POST /nodes`, `POST /edges`, `PATCH /nodes/{id}`).
2. **WebSocket Reconciliation**: External updates from other users or backend tasks merge idempotently into the canvas without interrupting local drag or selection.
3. **Network Resilience**: When the backend is offline, the workspace transitions smoothly to local storage persistence without breaking UI functionality or throwing unhandled errors.

