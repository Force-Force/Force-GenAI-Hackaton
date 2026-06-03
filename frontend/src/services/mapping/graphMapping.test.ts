import { describe, expect, it } from 'vitest';
import {
  fromBackendEdge,
  fromBackendNode,
  toEdgeCreateBody,
  toNodeCreateBody,
} from './graphMapping';
import type { NodeRead } from '../../contracts/backend';
import type { PipelineEdge, PipelineNode } from '../../types/pipeline';

const resourceNode: PipelineNode = {
  id: 'FactSales',
  type: 'resource',
  position: { x: 10, y: 20 },
  data: {
    category: 'resource',
    kind: 'warehouse',
    label: 'FactSales',
    description: 'fact',
    warehouseRole: 'fact',
    columns: [{ name: 'sales_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
  },
};

const sourceNode: PipelineNode = {
  id: 'src_orders',
  type: 'resource',
  position: { x: 0, y: 0 },
  data: { category: 'resource', kind: 'source', label: 'src_orders', description: '', columns: [] },
};

const processingNode: PipelineNode = {
  id: 'stg_orders',
  type: 'processing',
  position: { x: 5, y: 5 },
  data: {
    category: 'processing',
    language: 'python',
    label: 'stg_orders',
    description: '',
    code: 'print(1)',
    inputColumns: ['a'],
    outputColumns: ['b'],
  },
};

describe('node mapping', () => {
  it('maps a warehouse resource to a SINK with postgres_sink subtype', () => {
    const body = toNodeCreateBody(resourceNode);
    expect(body.type).toBe('SINK');
    expect(body.subtype).toBe('postgres_sink');
    expect(body.label).toBe('FactSales');
    expect(body.status).toBe('IDLE');
    expect(body.data.category).toBe('resource');
  });

  it('maps a source resource to a SOURCE node', () => {
    expect(toNodeCreateBody(sourceNode).type).toBe('SOURCE');
  });

  it('maps a python processing node to a TRANSFORM with python_script subtype', () => {
    const body = toNodeCreateBody(processingNode);
    expect(body.type).toBe('TRANSFORM');
    expect(body.subtype).toBe('python_script');
  });

  it('round-trips a resource node through the backend shape', () => {
    const body = toNodeCreateBody(resourceNode);
    const backend: NodeRead = {
      id: 'srv-uuid',
      type: body.type,
      subtype: body.subtype,
      label: body.label,
      position: body.position,
      data: body.data,
      status: body.status,
    };
    const restored = fromBackendNode(backend);
    expect(restored.id).toBe('srv-uuid');
    expect(restored.type).toBe('resource');
    expect(restored.data.category).toBe('resource');
    expect(restored.data.label).toBe('FactSales');
  });

  it('infers a processing node from a TRANSFORM when category metadata is absent', () => {
    const backend: NodeRead = {
      id: 'n1',
      type: 'TRANSFORM',
      subtype: 'sql_query',
      label: 'derived',
      position: { x: 0, y: 0 },
      data: {},
      status: 'IDLE',
    };
    const restored = fromBackendNode(backend);
    expect(restored.type).toBe('processing');
    expect(restored.data.category).toBe('processing');
  });
});

describe('edge mapping', () => {
  it('maps edge endpoints to backend field names', () => {
    const edge: PipelineEdge = {
      id: 'e1',
      source: 'A',
      target: 'B',
      data: { relationship: 'data_flow' },
    };
    expect(toEdgeCreateBody(edge)).toEqual({ source_node_id: 'A', target_node_id: 'B' });
  });

  it('reconstructs an edge from the backend shape with default data', () => {
    const restored = fromBackendEdge({ id: 'e9', source: 'A', target: 'B' });
    expect(restored.id).toBe('e9');
    expect(restored.data?.relationship).toBe('data_flow');
  });
});
