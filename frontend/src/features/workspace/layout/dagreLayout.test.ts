import { describe, expect, it } from 'vitest';
import { layoutGraph } from './dagreLayout';
import type { PipelineEdge, PipelineNode } from '../../../types/pipeline';

describe('dagreLayout', () => {
  it('computes left-to-right positions for connected nodes', () => {
    const nodes: PipelineNode[] = [
      {
        id: 'node-1',
        type: 'resource',
        position: { x: 0, y: 0 },
        data: { category: 'resource', kind: 'table', label: 'Source Table', description: '', columns: [] },
      },
      {
        id: 'node-2',
        type: 'processing',
        position: { x: 0, y: 0 },
        data: {
          category: 'processing',
          label: 'Transform Step',
          description: '',
          language: 'sql',
          code: '',
          engine: 'sql',
          inputColumns: [],
          outputColumns: [],
        },
      },
    ];

    const edges: PipelineEdge[] = [
      { id: 'e1', source: 'node-1', target: 'node-2' },
    ];

    const positioned = layoutGraph(nodes, edges);

    expect(positioned).toHaveLength(2);
    const n1 = positioned.find((n) => n.id === 'node-1')!;
    const n2 = positioned.find((n) => n.id === 'node-2')!;

    // In Left-to-Right layout, source node x is strictly less than target node x
    expect(n1.position.x).toBeLessThan(n2.position.x);
  });

  it('handles isolated nodes gracefully without mutation', () => {
    const original: PipelineNode[] = [
      {
        id: 'iso-1',
        type: 'resource',
        position: { x: 50, y: 50 },
        data: { category: 'resource', kind: 'table', label: 'Isolated', description: '', columns: [] },
      },
    ];

    const positioned = layoutGraph(original, []);
    expect(positioned).toHaveLength(1);
    expect(original[0].position).toEqual({ x: 50, y: 50 }); // Immutability
  });

  it('safely ignores edges that reference non-existent nodes', () => {
    const nodes: PipelineNode[] = [
      {
        id: 'only-one',
        type: 'resource',
        position: { x: 0, y: 0 },
        data: { category: 'resource', kind: 'table', label: 'Single', description: '', columns: [] },
      },
    ];
    const ghostEdges: PipelineEdge[] = [
      { id: 'ghost', source: 'missing-1', target: 'missing-2' },
    ];

    expect(() => layoutGraph(nodes, ghostEdges)).not.toThrow();
  });
});
