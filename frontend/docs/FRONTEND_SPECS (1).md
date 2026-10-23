# AuraBI — Frontend Technology & UI Operations Protocol

**Project:** AuraBI\
**Event:** Open Agent Hackathon 2026\
**Document type:** Frontend Architecture & Technical Specification

version: 1.0

## 1. Objective

AuraBI is an agent-driven business intelligence platform intended to automate the process of transforming raw data into structured, verified, and explainable business insights. Its frontend must support interactive data-pipeline design, AI-assisted modifications, validation, visualization, and eventual integration with a multi-agent analytical workflow.

The central technical requirement is that agents must be able to modify the interface dynamically. They should be able to add or update panels, construct data-model graphs, create relationships between nodes, and present analytical results without generating arbitrary frontend code.

This document describes the existing frontend, justifies the technology stack, and proposes a **UI Operations Protocol (UIOP)** that extends the current architecture to support controlled, agent-driven interface changes.

## 2. Current Frontend Assessment

AuraBI already has a substantial interactive frontend MVP. It is not merely a static mockup, but it is not yet a complete, end-to-end data-processing platform either.

### 2.1 Existing architecture

| Area                            | Current implementation                                   |
| ------------------------------- | -------------------------------------------------------- |
| UI framework                    | React 19 and TypeScript                                  |
| Development and build           | Vite 6                                                   |
| Styling                         | Tailwind CSS 4, project UI primitives, Lucide icons      |
| Graph visualization             | `@xyflow/react`, custom nodes and edges, Dagre layout    |
| State management                | Zustand stores with persistence                          |
| Validation                      | Zod schemas and local validation rules                   |
| Data import                     | Papa Parse for CSV and SQL DDL parsing                   |
| Code editing                    | CodeMirror with SQL and Python modes                     |
| AI integration                  | Backend chat and a separate Vite-server LLM planner      |
| Persistence and synchronization | Pipeline service, bootstrap logic, and WebSocket updates |
| Testing                         | Vitest, Testing Library, and Playwright                  |

The application is organized into reusable pages, layouts, feature modules, stores, services, and contracts. The pipeline store manages graph state and synchronization, while dedicated services handle backend communication and real-time updates.

### 2.2 What already works

- **Visual pipeline editing:** Users can create and connect resource, processing, and container/datamart nodes, navigate the graph, and use layout controls.
- **Schema import:** Users can import CSV data or SQL DDL from text or files to create schema-related nodes.
- **AI-assisted modifications:** The chat interface can request graph changes through a frontend agent that interprets assistant responses using an LLM planner when configured, with heuristic fallback.
- **Backend synchronization:** The application supports pipeline bootstrap, graph hydration, persistence, WebSocket updates, and a local/offline mode.
- **Validation and export:** Local graph checks are available, and SQL DDL can be generated for download or copying.

### 2.3 Main gaps

1. **No end-to-end pipeline execution:** The frontend designs pipelines but does not demonstrate an execution engine, real transformation runs, or end-to-end data processing.
2. **Limited data-source integration:** CSV and SQL DDL import are supported, but live database connections, credentialed source setup, and live schema discovery are not implemented in the source manager.
3. **No complete agent swarm:** The current chat and action planner do not constitute the full multi-agent workflow envisioned for AuraBI, including autonomous engineering, debugging, independent auditing, and OLAP analysis.
4. **Missing governance workflows:** Human approval gates, PII masking, and comprehensive controls for sensitive or destructive actions are not implemented.
5. **Prototype-level validation and export:** Local checks are limited, and generated SQL is not proof of successful execution against a target database.
6. **Deployment limitations:** The LLM planner is provided through a Vite development-server plugin. Production deployment requires an appropriate server-side endpoint.
7. **API contract inconsistencies:** Existing documentation and implementation do not fully agree on some routes and behaviors, so the frontend/backend contract must be reconciled.
8. **Incomplete access control:** The current frontend does not provide a complete authentication, role-based authorization, and approval system suitable for sensitive enterprise data.

**Assessment:** The existing frontend is a strong foundation for the hackathon. The priority should be to extend its graph, state, AI-action, and synchronization mechanisms instead of rebuilding them. UIOP should formalize and strengthen the existing AI-assisted action mechanism rather than introduce an unrelated second system.

## 3. Recommended Frontend Technology Stack

The core stack should remain aligned with the current repository. The following technologies are already in use or are recommended as targeted extensions.

### 3.1 React and TypeScript

**Status:** Already implemented.

React's component model supports the modular workspace, while its state-driven rendering model allows agent-generated changes to appear without direct DOM manipulation. TypeScript provides explicit contracts for graph nodes, panels, messages, and operations, reducing integration errors as the agent capabilities expand. Together, they provide the foundation for a maintainable, dynamically updated interface.

### 3.2 Vite

**Status:** Already implemented.

Vite provides fast development and build cycles, which are valuable during a hackathon when the team must repeatedly test interactions between the frontend and backend. Its development-server plugins can support prototyping, but production-only services such as the LLM planner must ultimately be deployed through an appropriate server-side environment.

### 3.3 Tailwind CSS and existing UI primitives

**Status:** Already implemented.

Tailwind CSS and the project's UI primitives enable rapid, consistent styling across the workspace, dialogs, navigation, and analytical panels. Agent-generated elements should reuse registered components and design tokens so dynamic changes remain visually consistent, accessible, and predictable.

### 3.4 Zustand

**Status:** Already implemented.

Zustand provides shared state for the pipeline graph and workspace without requiring a large state-management framework. It is suitable for UIOP because validated operations can update a centralized store, after which React and XYFlow render the resulting state. Agent payloads should never be applied directly to the store without passing through the protocol executor.

### 3.5 Zod

**Status:** Already implemented; extend for UIOP.

Zod validates incoming data at runtime, complementing TypeScript's compile-time checks. It should validate UIOP envelopes, operation parameters, and component-specific configurations before any agent-requested change is applied. Additional semantic checks are still required for entity references, permissions, and workspace revisions.

### 3.6 XYFlow and Dagre

**Status:** Already implemented.

XYFlow supports the interactive node-and-edge canvas already central to AuraBI, while Dagre provides graph-layout capabilities. UIOP should manipulate stable graph IDs and structured node and edge data, with a dedicated adapter translating accepted changes into XYFlow state. This keeps the protocol independent of the visualization library.

### 3.7 Papa Parse and CodeMirror

**Status:** Already implemented.

Papa Parse supports CSV import, and CodeMirror provides an editing environment for SQL and Python content. These tools should remain part of the existing data-import and code-editing workflows. Their presence does not imply that AuraBI currently executes imported data pipelines or arbitrary processing code.

### 3.8 AI integration

**Status:** Backend chat and a separate Vite-server LLM planner already exist.

The current AI path can interpret assistant responses and apply supported graph actions. The recommended next step is to replace or formalize this implicit action mechanism around a versioned UIOP contract, preserving useful existing logic where appropriate. TanStack AI may be evaluated if it provides a concrete benefit for the existing backend integration, but it is optional and should not define the protocol itself.

### 3.9 Testing

**Status:** Vitest, Testing Library, and Playwright are already included.

These tools can test UIOP at multiple levels: schema validation and operation execution in unit tests, component behavior in integration tests, and complete agent-to-workspace flows in end-to-end tests. Protocol error handling and approval boundaries should be tested alongside successful UI changes.

## 4. Proposed Architecture

UIOP should fit into the existing frontend architecture and reuse its stores, graph components, services, and contracts.

```text
AI Agents / Backend
        |
        v
Backend API or Event Stream
        |
        v
AI Event / Message Adapter
        |
        v
UI Operations Protocol Runtime
        |
        +-- Validate message and version
        +-- Validate operation schemas
        +-- Check references and revisions
        +-- Enforce frontend policy
        |
        v
Central Operation Executor
        |
        +--> Zustand workspace / pipeline state
        |
        v
React Components and XYFlow Canvas
```

The backend remains responsible for authentication, data permissions, approval decisions, agent execution, and analytical verification. The frontend runtime controls how valid UI changes are interpreted and rendered; it must not become an alternative authorization system.

## 5. UI Operations Protocol (UIOP)

### 5.1 Definition

The **UI Operations Protocol (UIOP)** is a proposed, versioned, declarative contract through which AI agents request changes to AuraBI's interface.

Instead of returning HTML, React components, or executable JavaScript, agents send structured operations such as `panel.add`, `node.update`, or `edge.add`. The frontend validates each request and applies supported operations to application state.

UIOP is a protocol for controlled workspace mutations, not a general-purpose code execution system. Its initial implementation should build on the existing AI action contracts and graph state instead of duplicating those mechanisms.

### 5.2 Design principles

- **Declarative:** Agents describe the intended change, not how to execute browser code.
- **Typed and validated:** Every operation has a defined schema and required parameters.
- **Versioned:** Frontend and backend can evolve without silently interpreting incompatible messages.
- **Restricted:** Only registered operations and components are accepted.
- **Deterministic:** The same accepted operation sequence should produce predictable state changes.
- **Traceable:** Each operation can be associated with its source, execution, result, and workspace revision.

### 5.3 Message structure

The following is a proposed message format, not an existing backend contract:

```json
{
  "protocol": "uiop",
  "version": "1.0",
  "messageId": "msg_1042",
  "workspaceId": "workspace_01",
  "baseRevision": 12,
  "source": {
    "agentId": "data-model-agent",
    "executionId": "exec_208"
  },
  "operations": [
    {
      "op": "node.add",
      "params": {
        "id": "orders_model",
        "type": "dataModel",
        "position": {
          "x": 320,
          "y": 180
        },
        "data": {
          "label": "Orders"
        }
      }
    }
  ]
}
```

The envelope identifies the protocol version, message, target workspace, base revision, source metadata, and operations. The backend must establish trusted agent identity; the frontend must not treat a supplied `agentId` as proof of authorization.

### 5.4 Initial operation catalog

The first version should support a small, useful set of operations.

| Operation       | Function                                       |
| --------------- | ---------------------------------------------- |
| `panel.add`     | Add a registered UI panel.                     |
| `panel.update`  | Update permitted panel properties.             |
| `panel.remove`  | Remove an existing panel.                      |
| `node.add`      | Add a graph node.                              |
| `node.update`   | Update a node's supported properties.          |
| `node.remove`   | Remove a node under defined dependency rules.  |
| `edge.add`      | Create a relationship between existing nodes.  |
| `edge.update`   | Update permitted relationship properties.      |
| `edge.remove`   | Remove a relationship.                         |
| `layout.update` | Request graph layout or node-position changes. |
| `report.update` | Update a structured report or section.         |

A new operation should be added only when a real workflow requires it. Operations that replace entire views or trigger consequential backend work should be considered separately rather than included in the initial protocol by default.

### 5.5 Example: adding a panel

```json
{
  "op": "panel.add",
  "params": {
    "id": "quality_summary",
    "component": "DataQualityPanel",
    "title": "Data Quality",
    "config": {
      "datasetId": "orders",
      "showMissingValues": true
    }
  }
}
```

The runtime checks the operation schema, verifies that `DataQualityPanel` exists in the approved component registry, validates its configuration, and checks for an ID conflict. If valid, it updates workspace state and lets React render the panel.

The component name must resolve through a predefined registry. Agents must not provide arbitrary module paths, scripts, or executable component definitions.

### 5.6 Example: modifying the data-model graph

An agent can request the creation of two nodes and then a relationship between them:

```json
[
  {
    "op": "node.add",
    "params": {
      "id": "customers",
      "type": "dataModel",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Customers" }
    }
  },
  {
    "op": "node.add",
    "params": {
      "id": "orders",
      "type": "dataModel",
      "position": { "x": 400, "y": 100 },
      "data": { "label": "Orders" }
    }
  },
  {
    "op": "edge.add",
    "params": {
      "id": "customers_to_orders",
      "source": "customers",
      "target": "orders",
      "type": "relationship",
      "data": { "label": "Customer orders" }
    }
  }
]
```

The runtime must ensure that the nodes exist before creating the edge and that IDs are unique. The XYFlow adapter then translates the accepted graph changes into the existing pipeline store's state representation.

The resulting visualization describes a proposed relationship; it does not prove that the join keys, cardinality, or underlying data transformation are correct.

## 6. UIOP Execution Lifecycle

Every message should pass through the same centralized execution pipeline.

1. **Receive:** Accept a message from the backend communication layer.
2. **Validate envelope:** Check required fields, supported version, message size, and operation count.
3. **Validate schemas:** Reject unknown operations or invalid parameters using Zod.
4. **Check semantics:** Verify IDs, referenced entities, component registration, and dependencies.
5. **Check revision:** Compare `baseRevision` with the current workspace revision and resolve or reject conflicts.
6. **Apply:** Execute accepted operations through the centralized state-update mechanism.
7. **Render:** Allow React and XYFlow to render the new state.
8. **Report:** Return or record a structured success, rejection, or reconciliation result.

For a logical batch, the recommended default is all-or-nothing application: if an operation fails validation, no operation in that batch is committed. This avoids partially applied graph changes that leave the workspace inconsistent.

The protocol should also define duplicate-message handling, operation ordering, and behavior after stream reconnection.

## 7. Security and Business Controls

UIOP must never permit AI-generated JavaScript execution, unrestricted HTML injection, or dynamic loading of arbitrary components. All changes must use the operation catalog and approved component registry.

The frontend must also distinguish presentation changes from consequential business actions. Adding a node does not authorize a database transformation; displaying an approval state does not grant approval; and rendering a successful-looking audit panel does not establish that an independent audit passed.

Sensitive or destructive operations must follow explicit backend-controlled approval and authorization workflows. Trusted verification status, permissions, and execution results must come from authoritative application or backend state rather than agent-generated content.

For traceability, operations should retain message IDs, source metadata, workspace revisions, and structured outcomes. Analytical claims should link to evidence where available and distinguish verified findings from assumptions or unverified interpretations.

## 8. Integration with the Existing Frontend

The implementation should extend the existing codebase in the following order:

1. **Reconcile backend contracts:** Confirm current API routes, payloads, and error behavior before adding new integration logic.
2. **Formalize AI action contracts:** Review the existing AI action definitions and planner so supported actions can be mapped into UIOP without duplicating functionality.
3. **Add protocol schemas:** Define versioned envelopes and operation-specific Zod schemas.
4. **Implement the runtime:** Centralize validation, revision checks, batch handling, execution, and error reporting.
5. **Connect existing stores:** Apply accepted operations to the current Zustand pipeline and workspace state.
6. **Add the XYFlow adapter:** Translate graph operations into the existing node-and-edge representation.
7. **Integrate backend events:** Use the communication mechanism supported by the backend, including existing WebSocket infrastructure where appropriate.
8. **Test failure cases:** Cover malformed payloads, unknown operations, duplicate messages, invalid references, stale revisions, and unauthorized requests.

The initial demonstration should focus on a narrow, end-to-end workflow: import a CSV or SQL schema, use an AI assistant to construct or modify a graph, validate the resulting structure, and export SQL. UIOP should make the AI-driven modifications predictable and observable within that workflow.

## 9. Definition of Success

The frontend architecture will be ready for the hackathon demonstration when:

- Existing pipeline editing and persistence continue to work.
- AI-generated changes pass through a documented UIOP contract.
- Supported panels and graph elements can be added, updated, and removed dynamically.
- Invalid, duplicate, and stale operations fail safely.
- Graph operations integrate with the existing Zustand and XYFlow architecture.
- Agent activity and operation outcomes are traceable.
- UI changes cannot bypass backend authorization, approval, or verification controls.
- The team can add a new operation without rewriting the interface.

## 10. Conclusion

AuraBI already has the principal frontend technologies and interactive graph architecture required for an agent-driven workspace. The most valuable next step is not a complete rewrite, but the formalization of its current AI-assisted graph actions into a versioned UI Operations Protocol.

React, TypeScript, Zustand, Zod, and XYFlow provide the necessary foundation: React renders the state, Zustand manages it, Zod validates incoming operations, and XYFlow visualizes the graph. UIOP connects agent intentions to those existing mechanisms through a controlled and auditable contract.

**Agents propose interface changes; UIOP validates and applies supported operations; the frontend renders the resulting state; and the backend remains authoritative for permissions, approvals, execution, and verification.**
