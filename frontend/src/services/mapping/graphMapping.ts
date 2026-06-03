import type {
  BackendNodeStatus,
  BackendNodeSubtype,
  BackendNodeType,
  EdgeRead,
  NodeRead,
} from '../../contracts/backend';
import type {
  Column,
  DatamartNodeData,
  PipelineEdge,
  PipelineEdgeData,
  PipelineNode,
  PipelineNodeData,
  ProcessingLanguage,
  ProcessingNodeData,
  ResourceKind,
  ResourceNodeData,
  WarehouseRole,
} from '../../types/pipeline';

/**
 * Translation layer between the frontend domain model
 * (resource | processing | datamart) and the backend wire model
 * (SOURCE | TRANSFORM | SINK + subtype + status + opaque data JSON).
 *
 * The full frontend `data` object is round-tripped inside the backend node
 * `data` field, so the mapping is lossless even though the backend's typed
 * fields are coarser than ours.
 */

export interface NodeCreateBody {
  type: BackendNodeType;
  subtype: BackendNodeSubtype;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  status: BackendNodeStatus;
}

export interface NodeUpdateBody {
  type?: BackendNodeType;
  subtype?: BackendNodeSubtype;
  label?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
  status?: BackendNodeStatus;
}

export interface EdgeCreateBody {
  source_node_id: string;
  target_node_id: string;
}

function deriveTypeSubtype(data: PipelineNodeData): {
  type: BackendNodeType;
  subtype: BackendNodeSubtype;
} {
  switch (data.category) {
    case 'processing':
      return {
        type: 'TRANSFORM',
        subtype: data.language === 'python' ? 'python_script' : 'sql_query',
      };
    case 'datamart':
      return { type: 'SINK', subtype: 'generic' };
    case 'resource':
    default: {
      const kind = (data as ResourceNodeData).kind;
      if (kind === 'source' || kind === 'external') {
        return { type: 'SOURCE', subtype: 'generic' };
      }
      return { type: 'SINK', subtype: 'postgres_sink' };
    }
  }
}

/** Backend node `status` derived from the frontend node, defaulting to IDLE. */
function deriveStatus(data: PipelineNodeData): BackendNodeStatus {
  const status = (data.metadata as Record<string, unknown> | undefined)?.status;
  if (status === 'PENDING' || status === 'VALID' || status === 'ERROR') {
    return status;
  }
  return 'IDLE';
}

/** Build the POST body for creating a node from a frontend node. */
export function toNodeCreateBody(node: PipelineNode): NodeCreateBody {
  const { type, subtype } = deriveTypeSubtype(node.data);
  return {
    type,
    subtype,
    label: node.data.label,
    position: node.position,
    // Persist the full frontend data so the round-trip is lossless.
    data: { ...node.data },
    status: deriveStatus(node.data),
  };
}

/** Build a PATCH body for a partial frontend-node update. */
export function toNodeUpdateBody(
  node: Pick<PipelineNode, 'position'> & { data?: PipelineNodeData },
): NodeUpdateBody {
  const body: NodeUpdateBody = { position: node.position };
  if (node.data) {
    const { type, subtype } = deriveTypeSubtype(node.data);
    body.type = type;
    body.subtype = subtype;
    body.label = node.data.label;
    body.data = { ...node.data };
    body.status = deriveStatus(node.data);
  }
  return body;
}

function asColumns(value: unknown): Column[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (c): c is Column =>
      !!c && typeof c === 'object' && typeof (c as Column).name === 'string',
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

/**
 * Reconstruct a frontend node from a backend node. Prefers the round-tripped
 * `data.category`; falls back to inferring a shape from the backend type when
 * the node was created outside this frontend.
 */
export function fromBackendNode(node: NodeRead): PipelineNode {
  const raw = (node.data ?? {}) as Record<string, unknown>;
  const category = raw.category;

  if (category === 'processing' || node.type === 'TRANSFORM') {
    const language: ProcessingLanguage =
      raw.language === 'python' || node.subtype === 'python_script'
        ? 'python'
        : 'sql';
    const data: ProcessingNodeData = {
      category: 'processing',
      language,
      label: (raw.label as string) ?? node.label,
      description: (raw.description as string) ?? '',
      code: (raw.code as string) ?? '',
      inputColumns: asStringArray(raw.inputColumns),
      outputColumns: asStringArray(raw.outputColumns),
    };
    return { id: node.id, type: 'processing', position: node.position, data };
  }

  if (category === 'datamart') {
    const children = (raw.children as DatamartNodeData['children']) ?? {
      nodes: [],
      edges: [],
    };
    const data: DatamartNodeData = {
      category: 'datamart',
      label: (raw.label as string) ?? node.label,
      description: (raw.description as string) ?? '',
      children,
      metadata: raw.metadata as DatamartNodeData['metadata'],
    };
    return { id: node.id, type: 'datamart', position: node.position, data };
  }

  // Default: resource node.
  const kind: ResourceKind =
    (raw.kind as ResourceKind) ?? (node.type === 'SOURCE' ? 'source' : 'warehouse');
  const data: ResourceNodeData = {
    category: 'resource',
    kind,
    label: (raw.label as string) ?? node.label,
    description: (raw.description as string) ?? '',
    columns: asColumns(raw.columns),
    warehouseRole: raw.warehouseRole as WarehouseRole | undefined,
    metadata: raw.metadata as ResourceNodeData['metadata'],
  };
  return { id: node.id, type: 'resource', position: node.position, data };
}

/** Build the POST body for creating an edge from a frontend edge. */
export function toEdgeCreateBody(edge: PipelineEdge): EdgeCreateBody {
  return { source_node_id: edge.source, target_node_id: edge.target };
}

/**
 * Reconstruct a frontend edge from a backend edge. The backend does not model
 * edge data, so column-level metadata is preserved only via the optional
 * `localData` carried by the client (e.g. an optimistic edge).
 */
export function fromBackendEdge(
  edge: EdgeRead,
  localData?: PipelineEdgeData,
): PipelineEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: localData ?? { relationship: 'data_flow' },
  };
}
