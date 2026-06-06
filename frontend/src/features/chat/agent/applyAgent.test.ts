import { describe, expect, it } from 'vitest';
import { inferActionsFromMessage } from './applyAgent';
import type { PipelineGraph, PipelineNode } from '../../../types/pipeline';
import type { ChatMessage } from '../types';

function resourceNode(id: string, label = id): PipelineNode {
  return {
    id,
    type: 'resource',
    position: { x: 0, y: 0 },
    data: { category: 'resource', label, kind: 'table', description: '', columns: [] },
  };
}

function graph(nodes: PipelineNode[] = [], edges: PipelineGraph['edges'] = []): PipelineGraph {
  return { nodes, edges };
}

function message(partial: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1',
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    text: '',
    ...partial,
  };
}

describe('inferActionsFromMessage', () => {
  it('forwards a structured non-explain action', () => {
    const action = {
      type: 'create_resource' as const,
      payload: {
        id: 'DimDate',
        label: 'DimDate',
        kind: 'table' as const,
        description: '',
        columns: [],
      },
    };
    const { actions } = inferActionsFromMessage(message({ action }), graph());
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(action);
  });

  it('ignores explain actions (no graph change)', () => {
    const { actions } = inferActionsFromMessage(
      message({ action: { type: 'explain', payload: { target: 'x' } } }),
      graph(),
    );
    expect(actions).toHaveLength(0);
  });

  it('derives create_resource actions from embedded CREATE TABLE DDL', () => {
    const text = [
      'Here is the schema:',
      '```sql',
      'CREATE TABLE dim_store (store_key INT PRIMARY KEY, name VARCHAR(120));',
      '```',
    ].join('\n');
    const { actions } = inferActionsFromMessage(message({ text }), graph());
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('create_resource');
    if (actions[0].type === 'create_resource') {
      expect(actions[0].payload.id).toBe('dim_store');
      expect(actions[0].payload.columns.length).toBeGreaterThan(0);
    }
  });

  it('does not recreate tables that already exist', () => {
    const text = '```sql\nCREATE TABLE existing (id INT PRIMARY KEY);\n```';
    const { actions } = inferActionsFromMessage(
      message({ text }),
      graph([resourceNode('existing')]),
    );
    expect(actions).toHaveLength(0);
  });

  it('derives connect_nodes from "connect A -> B" referencing existing nodes', () => {
    const { actions } = inferActionsFromMessage(
      message({ text: 'Now connect orders -> warehouse to load the facts.' }),
      graph([resourceNode('orders'), resourceNode('warehouse')]),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      type: 'connect_nodes',
      payload: { fromNode: 'orders', toNode: 'warehouse' },
    });
  });

  it('skips connections referencing unknown nodes', () => {
    const { actions } = inferActionsFromMessage(
      message({ text: 'connect ghost -> phantom' }),
      graph([resourceNode('orders')]),
    );
    expect(actions).toHaveLength(0);
  });

  it('never processes its own system summaries indirectly (no actions from plain prose)', () => {
    const { actions } = inferActionsFromMessage(
      message({ text: '### Frontend Agent\nApplied 2 changes to the canvas.' }),
      graph(),
    );
    expect(actions).toHaveLength(0);
  });
});
