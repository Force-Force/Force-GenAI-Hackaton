# AuraBI — User Flow Guide

This guide walks through how a user works with the **AuraBI Data Pipeline Builder** from first launch to compiling deployable SQL. Each section lists the concrete on-screen actions in order.

---

## 1. The Workspace at a Glance

When the app loads you land on the **Workspace**, a three-panel shell:

| Region | Location | Purpose |
| --- | --- | --- |
| **AI Data Architect** | Left panel | Conversational assistant that designs and edits the pipeline |
| **Pipeline Canvas** | Center | The visual node graph (sources → transformations → warehouse → mart) |
| **Inspector** | Right panel | Context-sensitive details + generated code for the selected node |
| **Top Navigation** | Top bar | Project name, theme toggle, panel toggles, Reset, Validate, Compile DDL |

The center area also has three tabs: **Pipeline Canvas**, **Data Sources**, and **Validation**.

On first load, the app connects to the backend and either reuses or creates a pipeline. If the backend is unreachable, the workspace falls back to a local offline mode and you can still design visually.

---

## 2. Reading the Pipeline Canvas

The canvas is organized left-to-right to mirror real data flow. Each node type is visually distinct:

1. **Source nodes** (rectangular cards) — show the source name, kind, and a **technology icon + badge** (e.g. `PostgreSQL`, `CSV`, `API`).
2. **Transformation nodes** (rectangular blocks) — show the transform name and the **technology used** (`SQL`, `Python`, `Pandas`, `Spark`).
3. **Data Warehouse node** — a single large block with a prominent **"W"** icon. Collapsed by default, showing only metadata.
4. **Database node** — a single block with a **"D"** icon for imported databases.
5. **Data Mart node** — a container with an **"M"** icon for curated KPI tables.

**Animated connectors** stream a glowing particle and dashed flow from each node to the next, communicating the direction and progress of data movement. Foreign-key links render in cyan; data-flow links in indigo.

### Step-by-step: explore the canvas
1. Use the mouse wheel to **zoom** and drag the background to **pan**.
2. Use the **MiniMap** (bottom-right) to jump around large pipelines.
3. Use the **Controls** (bottom-left) to fit-to-view or reset zoom.
4. Press the **arrow keys** to move between nodes when the canvas is focused.

---

## 3. Expanding Warehouse & Database Containers

Warehouse and Database nodes act as **intelligent containers** — their tables live *inside* them, never as loose nodes.

### Step-by-step: inspect a warehouse
1. **Click** the Data Warehouse ("W") node.
2. It **expands smoothly in place**, revealing every table as a structured schema grid.
3. Each table shows its **name**, **columns**, **column types**, and **relationships** (🔑 primary keys, 🔗 foreign keys with their `→ referenced table`).
4. **Click again** to collapse it back to the compact metadata view.
5. Imported **Database ("D")** nodes behave identically — click to reveal their tables and schema.

> Other nodes (sources and transformations) stay simple processing units and do not expand.

---

## 4. Inspecting a Node

The right-hand **Inspector** updates whenever you select a node.

### Step-by-step
1. **Click any node** on the canvas.
2. The Inspector shows context for that node:
   - **Source/Table** → editable description, the full column list, and an "Add Column" form.
   - **Transformation** → its inlets/outlets and an editable code editor.
   - **Warehouse/Database/Mart** → its metadata and a list of contained tables, plus an Expand/Collapse (or Open) button.
3. Scroll down to the **Generated Code** section to see the live SQL and/or Python implementation for that node (see Section 7).

---

## 5. Designing with the AI Data Architect

The left panel is the fastest way to build or modify a pipeline.

### Step-by-step: ask the AI to make a change
1. Type a request into the chat box, e.g. *"Add a promotion dimension table"* or *"Suggest an ETL pipeline for web orders"*. You can also click one of the **prompt shortcuts** above the input.
2. Press **Enter** (or the send button). The assistant shows a "thinking" indicator while the backend responds.
3. The reply is rendered as **rich Markdown** — headings, lists, tables, code blocks, and links all display properly.
4. If the AI proposes a structural change, a **Recommended Action** card appears at the end of the message with an **Apply Changes** button.

### Step-by-step: apply an AI suggestion
1. Review the action summary on the card (e.g. *"Add Resource: DimPromotion (table)"*).
2. Click **Apply Changes**.
3. The canvas updates automatically — new nodes are created, connections are added, and existing nodes are updated. The view switches to the canvas and the affected node is focused.
4. Optionally click **Explain** instead, to ask the AI to justify the recommendation before applying it.

> Warehouse tables created by the AI are automatically placed **inside** the warehouse container (which auto-expands), keeping the hierarchy clean.

---

## 6. Building Manually

You can also edit the graph directly without the AI.

### Step-by-step: add and connect nodes
1. On the **Pipeline Canvas** tab, use the floating **toolbar** (top-left):
   - **Resource** → adds a new table node.
   - **Processing** → adds a new transformation node.
   - **Auto Layout** → tidies the graph into a clean left-to-right arrangement.
   - **Full Screen** → maximizes the canvas.
2. **Drag** from a node's right-edge handle to another node's left-edge handle to create a **connection**.
3. Select a node and edit it in the Inspector:
   - For tables: add/remove columns, mark surrogate primary keys, edit the description.
   - For transformations: edit the SQL/Python source in the code editor and click **Submit to AI** to have it reviewed.
4. Select a node and press **Delete** (or use the **Delete Node** button in the Inspector) to remove it.

---

## 7. Viewing Generated Code

Every selected node exposes its real implementation code.

### Step-by-step
1. Select a node.
2. Open the **Generated Code** panel in the Inspector.
3. Switch between the **SQL** and **Python** tabs (only the relevant tabs appear):
   - **Source/table** → `CREATE TABLE` DDL + a pandas/SQLAlchemy ingestion loader.
   - **Transformation** → the node's own SQL or Python source.
   - **Warehouse/Database/Mart** → full DDL for all contained tables (with foreign keys) + an ETL loader skeleton.
4. Click **Copy** to copy the snippet to your clipboard.

The displayed code always reflects the **currently selected** node/component.

---

## 8. Importing Real Data Sources

### Step-by-step
1. Click the **Data Sources** tab in the center.
2. Review **Connected Sources** on the left; click a source's status badge to toggle it connected/disconnected.
3. On the right, under **Import Schema**:
   - Choose **CSV** or **SQL DDL**.
   - Paste content into the editor, or click **Upload file** to load a `.csv` / `.sql` file.
   - Click **Parse & Add to Canvas**.
4. Parsed tables appear as nodes (with the correct technology badge). Click **View on canvas →** to see them.

---

## 9. Validating the Schema

### Step-by-step
1. Click **Validate** in the top bar (or open the **Validation** tab).
2. Click **Run Validation**.
3. Review the results, grouped by category:
   - **Keys** — every table must declare a primary key.
   - **Relationships** — the fact table must be linked to dimensions.
   - **Standards** — recommends a date/calendar dimension, naming conventions, etc.
4. The top bar shows a **Valid** or **Errors** badge summarizing the outcome. Fix any flagged issues and re-run.

> Validation looks *inside* containers, so warehouse and database tables are audited too.

---

## 10. Compiling & Exporting DDL

### Step-by-step
1. Click **Compile DDL** in the top bar.
2. A modal opens with the **complete ANSI SQL** for the warehouse — `DROP`/`CREATE TABLE` statements for every table (including those inside containers) plus `ALTER TABLE … FOREIGN KEY` constraints.
3. Click **Copy** to copy the script, or **Download .sql** to save it as a file named after your project.
4. Close the modal to return to the workspace.

---

## 11. Personalizing the Workspace

- **Theme** — click the **Sun/Moon** button in the top bar to switch between **Light** and **Dark** mode. The choice is remembered and applies to every surface (canvas, nodes, panels, tables, code, modals) with smooth transitions.
- **Panels** — use the **left/right panel toggles** in the top bar (or the chevrons in each panel header) to hide/show the chat and inspector and maximize canvas space.
- **Project name** — click the project name in the top bar to rename it; the name is used for the exported `.sql` file.
- **Reset** — click **Reset** to clear the canvas and start a new design.

---

## Typical End-to-End Flow

1. **Open** the workspace.
2. **Ask the AI** to design a starter pipeline, then **Apply Changes**.
3. **Import** any real CSV/SQL sources from the Data Sources tab.
4. **Click the Warehouse node** to expand it and review the table structure.
5. **Select nodes** to refine columns and inspect the generated SQL/Python.
6. **Run Validation** and fix any flagged issues.
7. **Compile DDL** and download the deployable SQL.
8. **Toggle dark mode** and collapse panels whenever you want a cleaner view.
