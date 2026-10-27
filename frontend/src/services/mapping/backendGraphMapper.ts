import type {
  BackendEdge,
  BackendNode,
  BackendNodeStatus,
  BackendNodeSubtype,
  BackendNodeType,
  BackendPipeline,
  CreateEdgePayload,
  CreateNodePayload,
  UpdateNodePayload,
} from '../../contracts/backendApi';
import type {
  Column,
  ContainerKind,
  DatamartNode,
  PipelineEdge,
  PipelineNode,
  ProcessingLanguage,
  ProcessingNode,
  ResourceKind,
  ResourceNode,
  SourceFormat,
  TransformEngine,
  WarehouseRole,
} from '../../types/pipeline';
import { isDatamartNode, isProcessingNode } from '../../types/pipeline';
import { genId } from '../../utils/graph';

/**
 * Maps a backend format or subtype string to a valid frontend SourceFormat.
 */
function toSourceFormat(raw?: string): SourceFormat {
  if (!raw) return 'generic';
  const clean = raw.toLowerCase();
  if (clean === 'csv') return 'csv';
  if (clean === 'json') return 'json';
  if (clean === 'parquet') return 'parquet';
  if (clean === 'xlsx' || clean === 'excel') return 'xlsx';
  if (clean === 'postgres' || clean === 'postgresql' || clean === 'postgres_sink') return 'postgresql';
  if (clean === 'mysql') return 'mysql';
  if (clean === 'snowflake') return 'snowflake';
  if (clean === 'stripe') return 'stripe';
  if (clean === 'salesforce') return 'salesforce';
  if (clean === 'sqlite') return 'generic';
  return 'generic';
}

/**
 * Maps a backend node to a typed frontend PipelineNode.
 */
export function toFrontendNode(bn: BackendNode): PipelineNode {
  const data = (bn.data ?? {}) as Record<string, unknown>;
  const label = typeof data.label === 'string' && data.label ? data.label : bn.label || 'Node';
  const description = typeof data.description === 'string' ? data.description : '';
  const columns = Array.isArray(data.columns) ? (data.columns as Column[]) : [];

  // Check if this node was persisted as a datamart container
  const isContainer =
    data.category === 'datamart' ||
    bn.subtype === 'postgres_sink' ||
    typeof data.containerKind === 'string';

  if (isContainer) {
    const containerKind = (data.containerKind as ContainerKind) || 'warehouse';
    const rawChildren = data.children as { nodes?: PipelineNode[]; edges?: PipelineEdge[] } | undefined;

    const martNode: DatamartNode = {
      id: bn.id,
      type: 'datamart',
      position: bn.position || { x: 0, y: 0 },
      data: {
        category: 'datamart',
        containerKind,
        label,
        description,
        expanded: typeof data.expanded === 'boolean' ? data.expanded : false,
        columns,
        children: {
          nodes: rawChildren?.nodes || [],
          edges: rawChildren?.edges || [],
        },
        metadata: {
          ...data,
          backendStatus: bn.status,
          backendType: bn.type,
          backendSubtype: bn.subtype,
        },
      },
    };
    return martNode;
  }

  // Processing node (Transform)
  if (bn.type === 'TRANSFORM' || data.category === 'processing') {
    const language: ProcessingLanguage =
      bn.subtype === 'python_script' || data.language === 'python' ? 'python' : 'sql';
    const engine = (data.engine as TransformEngine) || (language === 'python' ? 'python' : 'sql');
    const code =
      typeof data.code === 'string'
        ? data.code
        : language === 'sql'
          ? `SELECT * FROM ${label.toLowerCase().replace(/[^a-z0-9_]/g, '_')};`
          : '# transform script';

    const procNode: ProcessingNode = {
      id: bn.id,
      type: 'processing',
      position: bn.position || { x: 0, y: 0 },
      data: {
        category: 'processing',
        label,
        description,
        language,
        engine,
        code,
        inputColumns: Array.isArray(data.inputColumns) ? (data.inputColumns as string[]) : [],
        outputColumns: Array.isArray(data.outputColumns) ? (data.outputColumns as string[]) : [],
        metadata: {
          ...data,
          backendStatus: bn.status,
          backendType: bn.type,
          backendSubtype: bn.subtype,
        },
      },
    };
    return procNode;
  }

  // Resource node (Source or Warehouse Table)
  const kind: ResourceKind =
    bn.type === 'SOURCE'
      ? 'source'
      : (data.kind as ResourceKind) || 'table';
  const warehouseRole = (data.warehouseRole as WarehouseRole) || (kind === 'source' ? 'source' : 'dimension');
  const format = toSourceFormat(typeof data.format === 'string' ? data.format : bn.subtype);

  const resNode: ResourceNode = {
    id: bn.id,
    type: 'resource',
    position: bn.position || { x: 0, y: 0 },
    data: {
      category: 'resource',
      kind,
      label,
      description,
      columns,
      warehouseRole,
      format,
      metadata: {
        ...data,
        backendStatus: bn.status,
        backendType: bn.type,
        backendSubtype: bn.subtype,
      },
    },
  };
  return resNode;
}

/**
 * Maps a backend edge to a frontend PipelineEdge.
 */
export function toFrontendEdge(be: BackendEdge): PipelineEdge {
  const rel =
    be.relationship === 'foreign_key' || be.relationship === 'transform'
      ? be.relationship
      : 'data_flow';
  return {
    id: be.id,
    source: be.source,
    target: be.target,
    sourceHandle: be.source_handle ?? undefined,
    targetHandle: be.target_handle ?? undefined,
    type: 'relationship',
    data: {
      relationship: rel,
      fromColumn: be.from_column ?? undefined,
      toColumn: be.to_column ?? undefined,
      metadata: be.metadata ?? undefined,
    },
  };
}

/**
 * Maps a complete backend pipeline response to frontend nodes and edges.
 */
export function toFrontendGraph(pipeline: BackendPipeline): {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
} {
  const nodes = (pipeline.nodes || []).map(toFrontendNode);
  const edges = (pipeline.edges || []).map(toFrontendEdge);
  return { nodes, edges };
}

/**
 * Maps a frontend PipelineNode to a backend CreateNodePayload for POST /pipelines/{id}/nodes.
 */
export function toBackendNodePayload(node: PipelineNode): CreateNodePayload {
  let type: BackendNodeType = 'SOURCE';
  let subtype: BackendNodeSubtype = 'generic';

  if (isProcessingNode(node)) {
    type = 'TRANSFORM';
    subtype = node.data.language === 'python' ? 'python_script' : 'sql_query';
  } else if (isDatamartNode(node)) {
    type = 'SINK';
    subtype = 'postgres_sink';
  } else {
    // ResourceNode
    if (node.data.kind === 'source') {
      type = 'SOURCE';
      if (node.data.format === 'csv') subtype = 'csv';
      else if (node.data.format === 'json') subtype = 'json';
      else subtype = 'generic';
    } else {
      type = 'SINK';
      subtype = 'postgres_sink';
    }
  }

  return {
    type,
    subtype,
    label: node.data.label,
    position: node.position,
    data: {
      ...node.data,
      id: node.id,
    },
    status: 'IDLE',
  };
}

/**
 * Maps frontend node updates to UpdateNodePayload for PATCH /pipelines/{id}/nodes/{node_id}.
 */
export function toBackendNodeUpdatePayload(
  patch: Partial<PipelineNode['data']>,
  position?: { x: number; y: number },
): UpdateNodePayload {
  const payload: UpdateNodePayload = {};
  if (position) payload.position = position;
  if (patch.label) payload.label = patch.label;
  payload.data = patch as Record<string, unknown>;
  return payload;
}

/**
 * Maps a frontend connection/edge creation to CreateEdgePayload.
 */
export function toBackendEdgePayload(
  sourceNodeId: string,
  targetNodeId: string,
  extra?: Partial<Omit<CreateEdgePayload, 'source_node_id' | 'target_node_id'>>,
): CreateEdgePayload {
  return {
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    ...extra,
  };
}

export const toBackendNode = toBackendNodePayload;
export const toBackendEdge = toBackendEdgePayload;

