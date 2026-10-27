import dagre from '@dagrejs/dagre';
import type { PipelineEdge, PipelineNode } from '../../../types/pipeline';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;

/**
 * Compute a left-to-right (or top-to-bottom) auto-layout for the pipeline graph using dagre.
 * Returns new node objects with updated positions; inputs are not mutated.
 */
export function layoutGraph(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  direction: 'LR' | 'TB' = 'LR',
): PipelineNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => {
    if (nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    } as PipelineNode;
  });
}
