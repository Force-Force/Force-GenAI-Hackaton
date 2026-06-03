import type {
  AiAction,
  CreateProcessingPayload,
  CreateResourcePayload,
  ConnectNodesPayload,
} from '../contracts/aiActions';
import { aiActionSchema } from '../contracts/aiActions';
import { validateWith } from '../contracts/api';
import {
  containerKindOf,
  isDatamartNode,
  isResourceNode,
  type DatamartNode,
  type PipelineEdge,
  type PipelineGraph,
  type PipelineNode,
  type ProcessingNode,
  type ResourceNode,
} from '../types/pipeline';
import { edgeExists, genId } from './graph';

export interface ApplyActionResult {
  graph: PipelineGraph;
  changed: boolean;
  message: string;
  focusNodeId?: string;
  /** Set when the action is an "explain" request that should re-enter chat. */
  explain?: { target?: string; note?: string };
  error?: string;
}

/**
 * Pure reducer that applies a validated AI action to the pipeline graph.
 * Invalid payloads are rejected and the graph is returned unchanged.
 */
export function applyAiAction(
  graph: PipelineGraph,
  rawAction: unknown,
): ApplyActionResult {
  const validated = validateWith(aiActionSchema, rawAction);
  if (!validated.ok) {
    return { graph, changed: false, message: '', error: validated.error };
  }

  const action: AiAction = validated.data;

  switch (action.type) {
    case 'create_resource':
      return createResource(graph, action.payload);
    case 'create_processing':
      return createProcessing(graph, action.payload);
    case 'connect_nodes':
      return connectNodes(graph, action.payload);
    case 'explain':
      return {
        graph,
        changed: false,
        message: '',
        explain: action.payload,
      };
    default:
      return { graph, changed: false, message: '', error: 'Unknown action' };
  }
}

function createResource(
  graph: PipelineGraph,
  payload: CreateResourcePayload,
): ApplyActionResult {
  const existsAnywhere =
    graph.nodes.some((n) => n.id === payload.id) ||
    graph.nodes.some(
      (n) => isDatamartNode(n) && n.data.children.nodes.some((c) => c.id === payload.id),
    );
  if (existsAnywhere) {
    return {
      graph,
      changed: false,
      message: `Resource "${payload.label}" already exists; skipped.`,
    };
  }

  const node: ResourceNode = {
    id: payload.id,
    type: 'resource',
    position: payload.position ?? { x: 120 + Math.random() * 160, y: 120 + Math.random() * 120 },
    data: {
      category: 'resource',
      kind: payload.kind,
      label: payload.label,
      description: payload.description,
      columns: payload.columns,
      warehouseRole: payload.warehouseRole,
    },
  };

  // Warehouse tables (fact / dimension / generated) belong INSIDE the warehouse
  // container, never as standalone pipeline nodes (Section 8).
  const isWarehouseTable = payload.warehouseRole && payload.warehouseRole !== 'source';
  if (isWarehouseTable) {
    const containerIdx = graph.nodes.findIndex(
      (n) => isDatamartNode(n) && containerKindOf(n.data) === 'warehouse',
    );
    if (containerIdx >= 0) {
      const container = graph.nodes[containerIdx] as DatamartNode;
      const updated: DatamartNode = {
        ...container,
        data: {
          ...container.data,
          expanded: true,
          children: {
            nodes: [...container.data.children.nodes, node],
            edges: container.data.children.edges,
          },
        },
      };
      const nodes: PipelineNode[] = graph.nodes.map((n, i) =>
        i === containerIdx ? updated : n,
      );
      return {
        graph: { nodes, edges: graph.edges },
        changed: true,
        focusNodeId: container.id,
        message: `Added "${payload.label}" to the ${container.data.label} warehouse.`,
      };
    }
  }

  return {
    graph: { nodes: [...graph.nodes, node], edges: graph.edges },
    changed: true,
    focusNodeId: node.id,
    message: `Created resource "${payload.label}" on the canvas.`,
  };
}

function createProcessing(
  graph: PipelineGraph,
  payload: CreateProcessingPayload,
): ApplyActionResult {
  if (graph.nodes.some((n) => n.id === payload.id)) {
    return {
      graph,
      changed: false,
      message: `Processing step "${payload.label}" already exists; skipped.`,
    };
  }

  const node: ProcessingNode = {
    id: payload.id,
    type: 'processing',
    position: payload.position ?? { x: 200 + Math.random() * 160, y: 200 + Math.random() * 120 },
    data: {
      category: 'processing',
      language: payload.language,
      label: payload.label,
      description: payload.description,
      code: payload.code,
      inputColumns: payload.inputColumns,
      outputColumns: payload.outputColumns,
    },
  };

  return {
    graph: { nodes: [...graph.nodes, node], edges: graph.edges },
    changed: true,
    focusNodeId: node.id,
    message: `Created ${payload.language.toUpperCase()} processing step "${payload.label}".`,
  };
}

function connectNodes(
  graph: PipelineGraph,
  payload: ConnectNodesPayload,
): ApplyActionResult {
  const source = graph.nodes.find((n) => n.id === payload.fromNode);
  const target = graph.nodes.find((n) => n.id === payload.toNode);

  if (!source || !target) {
    return {
      graph,
      changed: false,
      message: '',
      error: 'connect_nodes references a node that does not exist',
    };
  }

  if (edgeExists(graph.edges, payload.fromNode, payload.toNode)) {
    return {
      graph,
      changed: false,
      message: 'Connection already exists; skipped.',
    };
  }

  const edge: PipelineEdge = {
    id: genId('edge'),
    source: payload.fromNode,
    target: payload.toNode,
    data: {
      fromColumn: payload.fromColumn,
      toColumn: payload.toColumn,
      relationship: 'data_flow',
    },
  };

  // Mark the source column as a foreign key when applicable.
  const nodes = graph.nodes.map((n) => {
    if (n.id === payload.fromNode && payload.fromColumn && isResourceNode(n)) {
      return {
        ...n,
        data: {
          ...n.data,
          columns: n.data.columns.map((c) =>
            c.name === payload.fromColumn
              ? {
                  ...c,
                  isForeignKey: true,
                  fkRefTable: payload.toNode,
                  fkRefColumn: payload.toColumn,
                }
              : c,
          ),
        },
      };
    }
    return n;
  });

  return {
    graph: { nodes, edges: [...graph.edges, edge] },
    changed: true,
    message: `Connected ${source.data.label} -> ${target.data.label}.`,
  };
}
