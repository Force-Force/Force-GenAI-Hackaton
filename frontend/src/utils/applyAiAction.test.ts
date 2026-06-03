import { describe, expect, it } from 'vitest';
import { applyAiAction } from './applyAiAction';
import type { PipelineGraph } from '../types/pipeline';

function emptyGraph(): PipelineGraph {
  return { nodes: [], edges: [] };
}

describe('applyAiAction', () => {
  it('rejects payloads that fail schema validation without mutating the graph', () => {
    const graph = emptyGraph();
    const result = applyAiAction(graph, { type: 'create_resource', payload: { label: 'missing id' } });
    expect(result.error).toBeTruthy();
    expect(result.changed).toBe(false);
    expect(result.graph.nodes).toHaveLength(0);
  });

  it('rejects unknown action types', () => {
    const result = applyAiAction(emptyGraph(), { type: 'nuke_everything', payload: {} });
    expect(result.error).toBeTruthy();
    expect(result.changed).toBe(false);
  });

  it('creates a resource node from a valid payload', () => {
    const result = applyAiAction(emptyGraph(), {
      type: 'create_resource',
      payload: {
        id: 'DimPromotion',
        label: 'DimPromotion',
        kind: 'table',
        columns: [{ name: 'promo_key', type: 'INT', isPrimaryKey: true }],
      },
    });
    expect(result.changed).toBe(true);
    expect(result.focusNodeId).toBe('DimPromotion');
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0].data.category).toBe('resource');
  });

  it('creates a processing node from a valid payload', () => {
    const result = applyAiAction(emptyGraph(), {
      type: 'create_processing',
      payload: { id: 'stg_x', label: 'stg_x', language: 'sql', code: 'SELECT 1' },
    });
    expect(result.changed).toBe(true);
    expect(result.graph.nodes[0].data.category).toBe('processing');
  });

  it('does not duplicate a node that already exists', () => {
    const first = applyAiAction(emptyGraph(), {
      type: 'create_resource',
      payload: { id: 'A', label: 'A' },
    });
    const second = applyAiAction(first.graph, {
      type: 'create_resource',
      payload: { id: 'A', label: 'A' },
    });
    expect(second.changed).toBe(false);
    expect(second.graph.nodes).toHaveLength(1);
  });

  it('connects two existing nodes and marks the source FK', () => {
    let graph = applyAiAction(emptyGraph(), {
      type: 'create_resource',
      payload: { id: 'Fact', label: 'Fact', columns: [{ name: 'dim_key', type: 'INT' }] },
    }).graph;
    graph = applyAiAction(graph, {
      type: 'create_resource',
      payload: { id: 'Dim', label: 'Dim', columns: [{ name: 'dim_key', type: 'INT', isPrimaryKey: true }] },
    }).graph;

    const result = applyAiAction(graph, {
      type: 'connect_nodes',
      payload: { fromNode: 'Fact', fromColumn: 'dim_key', toNode: 'Dim', toColumn: 'dim_key' },
    });

    expect(result.changed).toBe(true);
    expect(result.graph.edges).toHaveLength(1);
    const fact = result.graph.nodes.find((n) => n.id === 'Fact');
    const col = fact?.data.category === 'resource' ? fact.data.columns[0] : undefined;
    expect(col?.isForeignKey).toBe(true);
  });

  it('rejects a connection referencing a missing node', () => {
    const result = applyAiAction(emptyGraph(), {
      type: 'connect_nodes',
      payload: { fromNode: 'ghost', toNode: 'phantom' },
    });
    expect(result.error).toBeTruthy();
    expect(result.changed).toBe(false);
  });

  it('treats explain as a non-mutating request', () => {
    const result = applyAiAction(emptyGraph(), { type: 'explain', payload: { target: 'X' } });
    expect(result.changed).toBe(false);
    expect(result.explain?.target).toBe('X');
  });
});
