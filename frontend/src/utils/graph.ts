import type { PipelineEdge, PipelineNode } from '../types/pipeline';

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
