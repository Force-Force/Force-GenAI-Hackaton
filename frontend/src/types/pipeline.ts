import type { Edge, Node } from '@xyflow/react';

/**
 * Domain model for the ETL pipeline graph.
 *
 * The canvas renders three node categories, each with distinct interaction
 * behavior (see features/workspace/nodes/nodeRegistry.ts):
 *  - resource:   databases, warehouses, tables, sources -> info widget on click
 *  - processing: SQL / Python transform steps           -> code editor on click
 *  - datamart:   curated marts with an internal graph    -> drill-in sub-canvas
 */
export type NodeCategory = 'resource' | 'processing' | 'datamart';

export type ResourceKind = 'database' | 'warehouse' | 'table' | 'source' | 'external';

export type ProcessingLanguage = 'sql' | 'python';

/** Underlying source technology/file type surfaced on source nodes (Section 9). */
export type SourceFormat =
  | 'csv'
  | 'xlsx'
  | 'json'
  | 'parquet'
  | 'api'
  | 'postgresql'
  | 'mysql'
  | 'snowflake'
  | 'salesforce'
  | 'stripe'
  | 'mongodb'
  | 'generic';

/** Transformation technology surfaced on processing nodes (Section 9). */
export type TransformEngine = 'sql' | 'python' | 'spark' | 'pandas' | 'dbt';

/** Container behaviour for datamart-category nodes (Section 8). */
export type ContainerKind = 'warehouse' | 'database' | 'datamart';

/** Legacy warehouse role retained for validation + DDL export semantics. */
export type WarehouseRole = 'fact' | 'dimension' | 'source' | 'generated';

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  fkRefTable?: string;
  fkRefColumn?: string;
  description?: string;
}

/** React Flow requires node data to be index-signature compatible. */
export interface ResourceNodeData extends Record<string, unknown> {
  category: 'resource';
  kind: ResourceKind;
  label: string;
  description: string;
  columns: Column[];
  warehouseRole?: WarehouseRole;
  /** Source technology / file type (csv, postgresql, ...) for source nodes. */
  format?: SourceFormat;
  metadata?: Record<string, string | number | boolean>;
}

export interface ProcessingNodeData extends Record<string, unknown> {
  category: 'processing';
  language: ProcessingLanguage;
  /** Display technology (may differ from the editor language, e.g. spark). */
  engine?: TransformEngine;
  label: string;
  description: string;
  code: string;
  inputColumns: string[];
  outputColumns: string[];
}

export interface DatamartNodeData extends Record<string, unknown> {
  category: 'datamart';
  label: string;
  description: string;
  /**
   * Container role. `warehouse` / `database` nodes expand in place to reveal
   * their tables; `datamart` retains the drill-in sub-canvas behaviour.
   */
  containerKind?: ContainerKind;
  /** Whether the container is expanded to show its internal tables in place. */
  expanded?: boolean;
  /** Internal graph (tables + relationships) revealed on expand / drill-in. */
  children: PipelineGraph;
  metadata?: Record<string, string | number | boolean>;
}

export type PipelineNodeData =
  | ResourceNodeData
  | ProcessingNodeData
  | DatamartNodeData;

export type ResourceNode = Node<ResourceNodeData, 'resource'>;
export type ProcessingNode = Node<ProcessingNodeData, 'processing'>;
export type DatamartNode = Node<DatamartNodeData, 'datamart'>;

export type PipelineNode = ResourceNode | ProcessingNode | DatamartNode;

export interface PipelineEdgeData extends Record<string, unknown> {
  fromColumn?: string;
  toColumn?: string;
  relationship?: 'foreign_key' | 'data_flow';
}

export type PipelineEdge = Edge<PipelineEdgeData>;

export interface PipelineGraph {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface DataSource {
  id: string;
  name: string;
  type: SourceFormat;
  status: 'connected' | 'disconnected';
  tableCount: number;
  description: string;
}

export interface ValidationItem {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  category: 'keys' | 'relationships' | 'naming' | 'standards';
}

export function isResourceNode(node: PipelineNode): node is ResourceNode {
  return node.data.category === 'resource';
}

export function isProcessingNode(node: PipelineNode): node is ProcessingNode {
  return node.data.category === 'processing';
}

export function isDatamartNode(node: PipelineNode): node is DatamartNode {
  return node.data.category === 'datamart';
}

/** Resolve a container node's role, defaulting to a drill-in datamart. */
export function containerKindOf(data: DatamartNodeData): ContainerKind {
  return data.containerKind ?? 'datamart';
}

/** Container nodes that expand in place (warehouse + imported database). */
export function isExpandableContainer(node: PipelineNode): node is DatamartNode {
  if (!isDatamartNode(node)) return false;
  const kind = containerKindOf(node.data);
  return kind === 'warehouse' || kind === 'database';
}
