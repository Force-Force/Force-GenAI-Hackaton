import {
  uiopEnvelopeSchema,
  UIOP_PROTOCOL,
  UIOP_VERSION,
  type EdgeAddParams,
  type EdgeRemoveParams,
  type EdgeUpdateParams,
  type LayoutUpdateParams,
  type NodeAddParams,
  type NodeRemoveParams,
  type NodeUpdateParams,
  type PanelAddParams,
  type PanelRemoveParams,
  type PanelUpdateParams,
  type PlanCreateParams,
  type PlanUpdateParams,
  type QuestionAnswerParams,
  type QuestionProposeParams,
  type QuestionRemoveParams,
  type ReportUpdateParams,
  type UiopEnvelope,
  type UiopExecutionReport,
  type UiopOperation,
  type UiopValidationError,
} from "../../../contracts/uiop";
import {
  containerKindOf,
  isDatamartNode,
  isResourceNode,
  type DatamartNode,
  type PipelineEdge,
  type PipelineNode,
  type ProcessingNode,
  type ResourceNode,
} from "../../../types/pipeline";
import { genId } from "../../../utils/graph";
import { layoutGraph } from "../../workspace/layout/dagreLayout";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { useWorkspaceStore } from "../../workspace/store/workspaceStore";
import { validateComponentConfig } from "../registry/componentRegistry";
import {
  usePlanStore,
  type ActiveUiopPanel,
  type ClarifyingQuestion,
  type PlanAndProtocolState,
} from "../store/planStore";

export interface ExecuteUiopOptions {
  /**
   * When true, skips strict `baseRevision` equality check (used when a user
   * manually clicks "Apply" on an earlier chat proposal card after making
   * local canvas edits). Defaults to false (strict protocol mode).
   */
  allowRebase?: boolean;
}

interface SimulatedBatchState {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  focusNodeId?: string;
  navigatedTo?: "/workspace" | "/plan" | "/audit";
  planTitle: string;
  planPrompt: string | null;
  planSummary: string;
  stages: PlanAndProtocolState["stages"];
  reasoningPhases: PlanAndProtocolState["reasoningPhases"];
  kpis: PlanAndProtocolState["kpis"];
  selectedKpiIds: string[];
  compiledSql: string;
  questions: ClarifyingQuestion[];
  selectedAnswers: Record<string, string>;
  panels: ActiveUiopPanel[];
  reports: Record<string, ReportUpdateParams>;
}

/**
 * XYFlow Adapter: Translates a UIOP `node.add` operation into a typed XYFlow
 * `PipelineNode` (`ResourceNode`, `ProcessingNode`, or `DatamartNode`).
 */
export function toXYFlowNode(
  params: NodeAddParams,
  indexOffset = 0,
): PipelineNode {
  const defaultPos = params.position ?? {
    x: 160 + (indexOffset % 3) * 260,
    y: 140 + Math.floor(indexOffset / 3) * 160,
  };

  const resolvedType =
    params.type === "processing" || params.data.language || params.data.code
      ? "processing"
      : params.type === "datamart" || params.data.containerKind
        ? "datamart"
        : "resource";

  if (resolvedType === "processing") {
    const procNode: ProcessingNode = {
      id: params.id,
      type: "processing",
      position: defaultPos,
      data: {
        category: "processing",
        language: params.data.language ?? "sql",
        engine: params.data.engine,
        label: params.data.label,
        description: params.data.description ?? "",
        code:
          params.data.code ??
          `-- Transformation: ${params.data.label}\nSELECT * FROM source_table;`,
        inputColumns: params.data.inputColumns ?? [],
        outputColumns: params.data.outputColumns ?? [],
      },
    };
    return procNode;
  }

  if (resolvedType === "datamart") {
    const martNode: DatamartNode = {
      id: params.id,
      type: "datamart",
      position: defaultPos,
      data: {
        category: "datamart",
        label: params.data.label,
        description: params.data.description ?? "",
        containerKind: params.data.containerKind ?? "datamart",
        expanded: params.data.expanded ?? false,
        children: { nodes: [], edges: [] },
      },
    };
    return martNode;
  }

  const resNode: ResourceNode = {
    id: params.id,
    type: "resource",
    position: defaultPos,
    data: {
      category: "resource",
      kind: params.data.kind ?? "table",
      label: params.data.label,
      description: params.data.description ?? "",
      columns: params.data.columns ?? [],
      warehouseRole: params.data.warehouseRole,
      format: params.data.format,
    },
  };
  return resNode;
}

function nodeExistsInGraph(nodes: PipelineNode[], id: string): boolean {
  return nodes.some(
    (n) =>
      n.id === id ||
      (isDatamartNode(n) && n.data.children.nodes.some((c) => c.id === id)),
  );
}

/**
 * Central UIOP Runtime Executor — Implements the 8-step lifecycle from
 * `docs/FRONTEND_SPECS (1).md` Section 6:
 *   1. Receive
 *   2. Validate envelope
 *   3. Validate schemas (Zod)
 *   4. Check semantics
 *   5. Check revision
 *   6. Apply (all-or-nothing atomic batch)
 *   7. Render (via Zustand stores -> React & XYFlow)
 *   8. Report (structured execution report + audit history)
 */
export function executeUiop(
  rawPayload: unknown,
  options: ExecuteUiopOptions = {},
): UiopExecutionReport {
  const nowIso = new Date().toISOString();
  const planStore = usePlanStore.getState();
  const pipeStore = usePipelineStore.getState();

  // --- Step 1 & 2: Receive & Validate Envelope + Version ---
  if (!rawPayload || typeof rawPayload !== "object") {
    return recordRejection(planStore, {
      messageId: "unknown",
      workspaceId: planStore.workspaceId,
      baseRevision: planStore.revision,
      errors: [
        {
          code: "INVALID_ENVELOPE",
          message: "UIOP payload must be a non-null JSON object.",
        },
      ],
      timestamp: nowIso,
    });
  }

  const rawObj = rawPayload as Record<string, unknown>;
  if (rawObj.protocol !== UIOP_PROTOCOL) {
    return recordRejection(planStore, {
      messageId: String(rawObj.messageId ?? "unknown"),
      workspaceId: String(rawObj.workspaceId ?? planStore.workspaceId),
      baseRevision: Number(rawObj.baseRevision ?? planStore.revision),
      errors: [
        {
          code: "INVALID_ENVELOPE",
          message: `Invalid protocol "${String(rawObj.protocol)}"; expected "${UIOP_PROTOCOL}".`,
        },
      ],
      timestamp: nowIso,
    });
  }

  if (rawObj.version !== UIOP_VERSION) {
    return recordRejection(planStore, {
      messageId: String(rawObj.messageId ?? "unknown"),
      workspaceId: String(rawObj.workspaceId ?? planStore.workspaceId),
      baseRevision: Number(rawObj.baseRevision ?? planStore.revision),
      errors: [
        {
          code: "UNSUPPORTED_VERSION",
          message: `Unsupported UIOP version "${String(rawObj.version)}"; supported version is "${UIOP_VERSION}".`,
        },
      ],
      timestamp: nowIso,
    });
  }

  // --- Step 3: Validate Operation Schemas with Zod ---
  const parsedEnvelope = uiopEnvelopeSchema.safeParse(rawPayload);
  if (!parsedEnvelope.success) {
    const errors: UiopValidationError[] = parsedEnvelope.error.issues.map(
      (iss) => ({
        code: "SCHEMA_VALIDATION_FAILED",
        message: `${iss.path.join(".") || "(root)"}: ${iss.message}`,
      }),
    );
    return recordRejection(planStore, {
      messageId: String(rawObj.messageId ?? "unknown"),
      workspaceId: String(rawObj.workspaceId ?? planStore.workspaceId),
      baseRevision: Number(rawObj.baseRevision ?? planStore.revision),
      errors,
      timestamp: nowIso,
    });
  }

  const envelope: UiopEnvelope = parsedEnvelope.data;

  // Check duplicate messageId
  if (planStore.processedMessageIds.includes(envelope.messageId)) {
    return recordRejection(planStore, {
      messageId: envelope.messageId,
      workspaceId: envelope.workspaceId,
      baseRevision: envelope.baseRevision,
      source: envelope.source,
      errors: [
        {
          code: "DUPLICATE_MESSAGE",
          message: `Message "${envelope.messageId}" has already been applied.`,
        },
      ],
      timestamp: nowIso,
    });
  }

  // --- Step 5: Check Revision ---
  if (!options.allowRebase && envelope.baseRevision !== planStore.revision) {
    return recordRejection(planStore, {
      messageId: envelope.messageId,
      workspaceId: envelope.workspaceId,
      baseRevision: envelope.baseRevision,
      source: envelope.source,
      errors: [
        {
          code: "STALE_REVISION",
          message: `Revision mismatch: message targets baseRevision ${envelope.baseRevision}, but workspace is at revision ${planStore.revision}.`,
        },
      ],
      timestamp: nowIso,
    });
  }

  // --- Step 4 & 6: Semantic Validation & Atomic Batch Simulation ---
  const sim: SimulatedBatchState = {
    nodes: structuredClone(pipeStore.nodes),
    edges: structuredClone(pipeStore.edges),
    planTitle: planStore.planTitle,
    planPrompt: planStore.planPrompt,
    planSummary: planStore.planSummary,
    stages: structuredClone(planStore.stages),
    reasoningPhases: structuredClone(planStore.reasoningPhases),
    kpis: structuredClone(planStore.kpis),
    selectedKpiIds: [...planStore.selectedKpiIds],
    compiledSql: planStore.compiledSql,
    questions: structuredClone(planStore.questions),
    selectedAnswers: { ...planStore.selectedAnswers },
    panels: structuredClone(planStore.panels),
    reports: structuredClone(planStore.reports),
  };

  const summary: string[] = [];
  const errors: UiopValidationError[] = [];

  for (let i = 0; i < envelope.operations.length; i += 1) {
    const operation = envelope.operations[i];
    const err = applySingleOperationToSim(sim, operation, i, summary);
    if (err) {
      errors.push(err);
      // All-or-nothing atomic batch: abort on first semantic failure
      break;
    }
  }

  if (errors.length > 0) {
    return recordRejection(planStore, {
      messageId: envelope.messageId,
      workspaceId: envelope.workspaceId,
      baseRevision: envelope.baseRevision,
      source: envelope.source,
      errors,
      timestamp: nowIso,
    });
  }

  // --- Commit Atomic Batch to Stores (Step 6 & 7) ---
  const newRevision = planStore.revision + 1;

  usePipelineStore.setState({
    nodes: sim.nodes,
    edges: sim.edges,
    selectedNodeId: sim.focusNodeId ?? pipeStore.selectedNodeId,
  });

  if (sim.focusNodeId) {
    useWorkspaceStore.getState().setActiveTab("canvas");
  }

  const report: UiopExecutionReport = {
    ok: true,
    status: "applied",
    messageId: envelope.messageId,
    workspaceId: envelope.workspaceId,
    baseRevision: envelope.baseRevision,
    newRevision,
    source: envelope.source,
    appliedCount: envelope.operations.length,
    summary,
    focusNodeId: sim.focusNodeId,
    navigatedTo: sim.navigatedTo,
    errors: [],
    timestamp: nowIso,
  };

  planStore.commitUiopState({
    revision: newRevision,
    processedMessageIds: [...planStore.processedMessageIds, envelope.messageId],
    executionHistory: [report, ...planStore.executionHistory].slice(0, 50),
    planTitle: sim.planTitle,
    planPrompt: sim.planPrompt,
    planSummary: sim.planSummary,
    stages: sim.stages,
    reasoningPhases: sim.reasoningPhases,
    kpis: sim.kpis,
    selectedKpiIds: sim.selectedKpiIds,
    compiledSql: sim.compiledSql,
    questions: sim.questions,
    selectedAnswers: sim.selectedAnswers,
    panels: sim.panels,
    reports: sim.reports,
  });

  return report;
}

function recordRejection(
  planStore: PlanAndProtocolState,
  info: {
    messageId: string;
    workspaceId: string;
    baseRevision: number;
    source?: UiopEnvelope["source"];
    errors: UiopValidationError[];
    timestamp: string;
  },
): UiopExecutionReport {
  const report: UiopExecutionReport = {
    ok: false,
    status: "rejected",
    messageId: info.messageId,
    workspaceId: info.workspaceId,
    baseRevision: info.baseRevision,
    newRevision: planStore.revision,
    source: info.source,
    appliedCount: 0,
    summary: [],
    errors: info.errors,
    timestamp: info.timestamp,
  };

  planStore.commitUiopState({
    executionHistory: [report, ...planStore.executionHistory].slice(0, 50),
  });

  return report;
}

function applySingleOperationToSim(
  sim: SimulatedBatchState,
  operation: UiopOperation,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  switch (operation.op) {
    case "node.add":
      return simNodeAdd(sim, operation.params, operationIndex, summary);
    case "node.update":
      return simNodeUpdate(sim, operation.params, operationIndex, summary);
    case "node.remove":
      return simNodeRemove(sim, operation.params, operationIndex, summary);
    case "edge.add":
      return simEdgeAdd(sim, operation.params, operationIndex, summary);
    case "edge.update":
      return simEdgeUpdate(sim, operation.params, operationIndex, summary);
    case "edge.remove":
      return simEdgeRemove(sim, operation.params, operationIndex, summary);
    case "layout.update":
      return simLayoutUpdate(sim, operation.params, summary);
    case "panel.add":
      return simPanelAdd(sim, operation.params, operationIndex, summary);
    case "panel.update":
      return simPanelUpdate(sim, operation.params, operationIndex, summary);
    case "panel.remove":
      return simPanelRemove(sim, operation.params, operationIndex, summary);
    case "report.update":
      return simReportUpdate(sim, operation.params, summary);
    case "plan.create":
      return simPlanCreate(sim, operation.params, summary);
    case "plan.update":
      return simPlanUpdate(sim, operation.params, summary);
    case "question.propose":
      return simQuestionPropose(sim, operation.params, summary);
    case "question.answer":
      return simQuestionAnswer(sim, operation.params, operationIndex, summary);
    case "question.remove":
      return simQuestionRemove(sim, operation.params, operationIndex, summary);
  }
}

// ============================================================================
// Graph / Canvas Operation Handlers
// ============================================================================

function simNodeAdd(
  sim: SimulatedBatchState,
  params: NodeAddParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (nodeExistsInGraph(sim.nodes, params.id)) {
    return {
      code: "DUPLICATE_ENTITY_ID",
      message: `Node "${params.id}" already exists in the workspace graph.`,
      operationIndex,
      op: "node.add",
    };
  }

  const newNode = toXYFlowNode(params, sim.nodes.length);

  // Route warehouse tables (fact / dimension / generated) or explicit targetContainerId into container
  const isWarehouseChild =
    newNode.type === "resource" &&
    ((params.data.warehouseRole && params.data.warehouseRole !== "source") ||
      Boolean(params.data.targetContainerId));

  if (isWarehouseChild) {
    const containerIdx = params.data.targetContainerId
      ? sim.nodes.findIndex(
          (n) => isDatamartNode(n) && n.id === params.data.targetContainerId,
        )
      : sim.nodes.findIndex(
          (n) => isDatamartNode(n) && containerKindOf(n.data) === "warehouse",
        );

    if (params.data.targetContainerId && containerIdx < 0) {
      return {
        code: "ENTITY_NOT_FOUND",
        message: `Target container "${params.data.targetContainerId}" does not exist.`,
        operationIndex,
        op: "node.add",
      };
    }

    if (containerIdx >= 0) {
      const container = sim.nodes[containerIdx] as DatamartNode;
      container.data.expanded = true;
      container.data.children.nodes.push(newNode);
      sim.focusNodeId = container.id;
      summary.push(
        `Added table "${params.data.label}" inside container "${container.data.label}".`,
      );
      return null;
    }
  }

  sim.nodes.push(newNode);
  sim.focusNodeId = newNode.id;
  summary.push(`Added node "${params.data.label}" (${newNode.type}).`);
  return null;
}

function simNodeUpdate(
  sim: SimulatedBatchState,
  params: NodeUpdateParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  // Check top-level nodes first
  const idx = sim.nodes.findIndex((n) => n.id === params.id);
  if (idx >= 0) {
    const node = sim.nodes[idx];
    if (params.position) {
      node.position = { ...params.position };
    }
    if (params.data) {
      node.data = { ...node.data, ...params.data } as PipelineNode["data"];
    }
    sim.focusNodeId = node.id;
    summary.push(`Updated node "${node.data.label}".`);
    return null;
  }

  // Check inside containers
  for (const n of sim.nodes) {
    if (isDatamartNode(n)) {
      const childIdx = n.data.children.nodes.findIndex(
        (c) => c.id === params.id,
      );
      if (childIdx >= 0) {
        const child = n.data.children.nodes[childIdx];
        if (params.position) child.position = { ...params.position };
        if (params.data) {
          child.data = {
            ...child.data,
            ...params.data,
          } as PipelineNode["data"];
        }
        sim.focusNodeId = n.id;
        summary.push(
          `Updated nested table "${child.data.label}" in "${n.data.label}".`,
        );
        return null;
      }
    }
  }

  return {
    code: "ENTITY_NOT_FOUND",
    message: `Cannot update node "${params.id}": node does not exist.`,
    operationIndex,
    op: "node.update",
  };
}

function simNodeRemove(
  sim: SimulatedBatchState,
  params: NodeRemoveParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  const existsTop = sim.nodes.some((n) => n.id === params.id);
  const existsNested = sim.nodes.some(
    (n) =>
      isDatamartNode(n) &&
      n.data.children.nodes.some((c) => c.id === params.id),
  );

  if (!existsTop && !existsNested) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot remove node "${params.id}": node does not exist.`,
      operationIndex,
      op: "node.remove",
    };
  }

  const incidentEdges = sim.edges.filter(
    (e) => e.source === params.id || e.target === params.id,
  );
  if (!params.cascadeEdges && incidentEdges.length > 0) {
    return {
      code: "DEPENDENCY_CONFLICT",
      message: `Cannot remove node "${params.id}": ${incidentEdges.length} connected edge(s) exist and cascadeEdges is false.`,
      operationIndex,
      op: "node.remove",
    };
  }

  if (existsTop) {
    sim.nodes = sim.nodes.filter((n) => n.id !== params.id);
    sim.edges = sim.edges.filter(
      (e) => e.source !== params.id && e.target !== params.id,
    );
  } else {
    for (const n of sim.nodes) {
      if (isDatamartNode(n)) {
        n.data.children.nodes = n.data.children.nodes.filter(
          (c) => c.id !== params.id,
        );
        n.data.children.edges = n.data.children.edges.filter(
          (e) => e.source !== params.id && e.target !== params.id,
        );
      }
    }
  }

  summary.push(`Removed node "${params.id}".`);
  return null;
}

function simEdgeAdd(
  sim: SimulatedBatchState,
  params: EdgeAddParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (params.source === params.target) {
    return {
      code: "DEPENDENCY_CONFLICT",
      message: `Self-loop edges are not permitted ("${params.source}" -> "${params.target}").`,
      operationIndex,
      op: "edge.add",
    };
  }

  const sourceNode = sim.nodes.find((n) => n.id === params.source);
  const targetNode = sim.nodes.find((n) => n.id === params.target);

  if (!sourceNode || !targetNode) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot create edge "${params.source}" -> "${params.target}": both source and target nodes must exist.`,
      operationIndex,
      op: "edge.add",
    };
  }

  const edgeId = params.id ?? genId("edge");
  if (sim.edges.some((e) => e.id === edgeId)) {
    return {
      code: "DUPLICATE_ENTITY_ID",
      message: `Edge ID "${edgeId}" already exists.`,
      operationIndex,
      op: "edge.add",
    };
  }

  // Avoid duplicate parallel edges between the same endpoints/columns
  const alreadyConnected = sim.edges.some(
    (e) =>
      e.source === params.source &&
      e.target === params.target &&
      e.data?.fromColumn === params.data?.fromColumn &&
      e.data?.toColumn === params.data?.toColumn,
  );
  if (alreadyConnected) {
    summary.push(
      `Edge ${sourceNode.data.label} -> ${targetNode.data.label} already exists.`,
    );
    return null;
  }

  const edge: PipelineEdge = {
    id: edgeId,
    source: params.source,
    target: params.target,
    data: {
      fromColumn: params.data?.fromColumn,
      toColumn: params.data?.toColumn,
      relationship:
        params.data?.relationship ??
        (params.type === "foreign_key" ? "foreign_key" : "data_flow"),
    },
  };

  // Mark foreign key metadata on source resource column if specified
  if (params.data?.fromColumn && isResourceNode(sourceNode)) {
    sourceNode.data.columns = sourceNode.data.columns.map((c) =>
      c.name === params.data?.fromColumn
        ? {
            ...c,
            isForeignKey: true,
            fkRefTable: params.target,
            fkRefColumn: params.data?.toColumn,
          }
        : c,
    );
  }

  sim.edges.push(edge);
  summary.push(
    `Connected "${sourceNode.data.label}" → "${targetNode.data.label}".`,
  );
  return null;
}

function simEdgeUpdate(
  sim: SimulatedBatchState,
  params: EdgeUpdateParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  const edge = sim.edges.find((e) => e.id === params.id);
  if (!edge) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot update edge "${params.id}": edge does not exist.`,
      operationIndex,
      op: "edge.update",
    };
  }
  edge.data = { ...edge.data, ...params.data };
  summary.push(`Updated edge "${params.id}".`);
  return null;
}

function simEdgeRemove(
  sim: SimulatedBatchState,
  params: EdgeRemoveParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (!sim.edges.some((e) => e.id === params.id)) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot remove edge "${params.id}": edge does not exist.`,
      operationIndex,
      op: "edge.remove",
    };
  }
  sim.edges = sim.edges.filter((e) => e.id !== params.id);
  summary.push(`Removed edge "${params.id}".`);
  return null;
}

function simLayoutUpdate(
  sim: SimulatedBatchState,
  params: LayoutUpdateParams,
  summary: string[],
): UiopValidationError | null {
  if (params.positions && Object.keys(params.positions).length > 0) {
    for (const [nodeId, pos] of Object.entries(params.positions)) {
      const node = sim.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.position = { ...pos };
      }
    }
    summary.push(
      `Updated positions for ${Object.keys(params.positions).length} node(s).`,
    );
    return null;
  }

  sim.nodes = layoutGraph(sim.nodes, sim.edges);
  summary.push(`Applied Dagre (${params.direction}) auto-layout to canvas.`);
  return null;
}

// ============================================================================
// UI Panels & Reports Operation Handlers
// ============================================================================

function simPanelAdd(
  sim: SimulatedBatchState,
  params: PanelAddParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (sim.panels.some((p) => p.id === params.id)) {
    return {
      code: "DUPLICATE_ENTITY_ID",
      message: `Panel "${params.id}" already exists.`,
      operationIndex,
      op: "panel.add",
    };
  }

  const configCheck = validateComponentConfig(params.component, params.config);
  if (configCheck.ok === false) {
    return {
      code: configCheck.error.includes("not registered")
        ? "UNREGISTERED_COMPONENT"
        : "INVALID_COMPONENT_CONFIG",
      message: configCheck.error,
      operationIndex,
      op: "panel.add",
    };
  }

  sim.panels.push({
    id: params.id,
    component: params.component,
    title: params.title,
    open: true,
    config: configCheck.data,
  });
  summary.push(`Added UI panel "${params.title}" (${params.component}).`);
  return null;
}

function simPanelUpdate(
  sim: SimulatedBatchState,
  params: PanelUpdateParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  const panel = sim.panels.find((p) => p.id === params.id);
  if (!panel) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot update panel "${params.id}": panel does not exist.`,
      operationIndex,
      op: "panel.update",
    };
  }

  if (params.config) {
    const mergedConfig = { ...panel.config, ...params.config };
    const configCheck = validateComponentConfig(panel.component, mergedConfig);
    if (configCheck.ok === false) {
      return {
        code: "INVALID_COMPONENT_CONFIG",
        message: configCheck.error,
        operationIndex,
        op: "panel.update",
      };
    }
    panel.config = configCheck.data;
  }

  if (params.title !== undefined) panel.title = params.title;
  if (params.open !== undefined) panel.open = params.open;

  summary.push(`Updated panel "${panel.title}".`);
  return null;
}

function simPanelRemove(
  sim: SimulatedBatchState,
  params: PanelRemoveParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (!sim.panels.some((p) => p.id === params.id)) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot remove panel "${params.id}": panel does not exist.`,
      operationIndex,
      op: "panel.remove",
    };
  }
  sim.panels = sim.panels.filter((p) => p.id !== params.id);
  summary.push(`Removed panel "${params.id}".`);
  return null;
}

function simReportUpdate(
  sim: SimulatedBatchState,
  params: ReportUpdateParams,
  summary: string[],
): UiopValidationError | null {
  sim.reports[params.id] = params;
  summary.push(`Updated structured report "${params.title}".`);
  return null;
}

// ============================================================================
// Plans & Clarifying Questions Operation Handlers
// ============================================================================

function simPlanCreate(
  sim: SimulatedBatchState,
  params: PlanCreateParams,
  summary: string[],
): UiopValidationError | null {
  sim.planTitle = params.title;
  if (params.prompt !== undefined) sim.planPrompt = params.prompt;
  if (params.summary !== undefined) sim.planSummary = params.summary;
  sim.stages = params.stages;
  if (params.reasoningPhases) sim.reasoningPhases = params.reasoningPhases;
  if (params.kpis) {
    sim.kpis = params.kpis;
    sim.selectedKpiIds = params.kpis.map((k) => k.id);
  }
  if (params.compiledSql) sim.compiledSql = params.compiledSql;
  summary.push(
    `Created architecture plan "${params.title}" (${params.stages.length} stages).`,
  );
  return null;
}

function simPlanUpdate(
  sim: SimulatedBatchState,
  params: PlanUpdateParams,
  summary: string[],
): UiopValidationError | null {
  if (params.title !== undefined) sim.planTitle = params.title;
  if (params.prompt !== undefined) sim.planPrompt = params.prompt;
  if (params.summary !== undefined) sim.planSummary = params.summary;
  if (params.stages !== undefined) sim.stages = params.stages;
  if (params.reasoningPhases !== undefined) {
    sim.reasoningPhases = params.reasoningPhases;
  }
  if (params.kpis !== undefined) sim.kpis = params.kpis;
  if (params.selectedKpiIds !== undefined) {
    sim.selectedKpiIds = params.selectedKpiIds;
  }
  if (params.compiledSql !== undefined) sim.compiledSql = params.compiledSql;
  summary.push(`Updated architecture plan "${sim.planTitle}".`);
  return null;
}

function simQuestionPropose(
  sim: SimulatedBatchState,
  params: QuestionProposeParams,
  summary: string[],
): UiopValidationError | null {
  const existingIdx = sim.questions.findIndex((q) => q.id === params.id);
  if (existingIdx >= 0) {
    sim.questions[existingIdx] = params;
  } else {
    sim.questions.push(params);
  }

  const defaultOptionId =
    params.selectedOptionId ??
    params.options.find((o) => o.isRecommended)?.id ??
    params.options[0]?.id;
  if (defaultOptionId) {
    sim.selectedAnswers[params.id] = defaultOptionId;
  }

  summary.push(`Proposed clarifying question: "${params.question}"`);
  return null;
}

function simQuestionAnswer(
  sim: SimulatedBatchState,
  params: QuestionAnswerParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  const question = sim.questions.find((q) => q.id === params.id);
  if (!question) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot answer question "${params.id}": question does not exist.`,
      operationIndex,
      op: "question.answer",
    };
  }

  const validOption = question.options.some((o) => o.id === params.optionId);
  if (!validOption) {
    return {
      code: "INVALID_OPTION",
      message: `Option "${params.optionId}" is not a valid choice for question "${params.id}".`,
      operationIndex,
      op: "question.answer",
    };
  }

  sim.selectedAnswers[params.id] = params.optionId;
  summary.push(
    `Recorded answer "${params.optionId}" for question "${params.id}".`,
  );
  return null;
}

function simQuestionRemove(
  sim: SimulatedBatchState,
  params: QuestionRemoveParams,
  operationIndex: number,
  summary: string[],
): UiopValidationError | null {
  if (!sim.questions.some((q) => q.id === params.id)) {
    return {
      code: "ENTITY_NOT_FOUND",
      message: `Cannot remove question "${params.id}": question does not exist.`,
      operationIndex,
      op: "question.remove",
    };
  }
  sim.questions = sim.questions.filter((q) => q.id !== params.id);
  summary.push(`Removed clarifying question "${params.id}".`);
  return null;
}
