import { isDatamartNode, type PipelineEdge, type PipelineNode } from '../types/pipeline';

let counter = 0;

/** Stable-ish unique id generator for client-created nodes/edges. */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function findNode(
  nodes: PipelineNode[],
  id: string | null | undefined,
): PipelineNode | undefined {
  if (!id) return undefined;
  return nodes.find((n) => n.id === id);
}

export function edgeExists(
  edges: PipelineEdge[],
  source: string,
  target: string,
): boolean {
  return edges.some((e) => e.source === source && e.target === target);
}

/** Display name for any node category. */
export function nodeLabel(node: PipelineNode): string {
  return node.data.label;
}

/**
 * Flatten container nodes (warehouse / database / datamart) so the tables they
 * hold are surfaced alongside top-level nodes. Used by DDL compilation and
 * validation, which operate on the full set of physical tables regardless of
 * which container they live in.
 */
export function flattenGraph(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): { nodes: PipelineNode[]; edges: PipelineEdge[] } {
  const outNodes: PipelineNode[] = [];
  const outEdges: PipelineEdge[] = [...edges];

  for (const node of nodes) {
    outNodes.push(node);
    if (isDatamartNode(node)) {
      outNodes.push(...node.data.children.nodes);
      outEdges.push(...node.data.children.edges);
    }
  }

  return { nodes: outNodes, edges: outEdges };
}
