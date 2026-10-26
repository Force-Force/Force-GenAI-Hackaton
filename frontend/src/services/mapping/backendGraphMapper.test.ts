import { describe, expect, it } from 'vitest';
import {
  toFrontendNode,
  toFrontendEdge,
  toFrontendGraph,
  toBackendNodePayload,
  toBackendNodeUpdatePayload,
  toBackendEdgePayload,
} from './backendGraphMapper';
import type { BackendNode, BackendEdge, BackendPipeline } from '../../contracts/backendApi';
import type { PipelineNode } from '../../types/pipeline';
import { isDatamartNode } from '../../types/pipeline';

describe('backendGraphMapper', () => {
  it('maps backend SOURCE node to frontend ResourceNode', () => {
    const backendNode: BackendNode = {
      id: 'src-1',
      type: 'SOURCE',
      subtype: 'csv',
      label: 'customers_csv',
      status: 'IDLE',
      position: { x: 120, y: 240 },
      data: {
        description: 'Customer list uploaded',
        columns: [
          { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'name', type: 'VARCHAR', isPrimaryKey: false, isForeignKey: false },
        ],
      },
    };

    const frontendNode = toFrontendNode(backendNode);
    expect(frontendNode.id).toBe('src-1');
    expect(frontendNode.type).toBe('resource');
    expect(frontendNode.position).toEqual({ x: 120, y: 240 });
    expect(frontendNode.data.label).toBe('customers_csv');
    expect(frontendNode.data.category).toBe('resource');
    expect(frontendNode.data.format).toBe('csv');
    expect(frontendNode.data.columns).toHaveLength(2);
  });

  it('maps backend TRANSFORM node to frontend ProcessingNode', () => {
    const backendNode: BackendNode = {
      id: 'xf-1',
      type: 'TRANSFORM',
      subtype: 'sql_query',
      label: 'clean_customers',
      status: 'VALID',
      position: { x: 400, y: 240 },
      data: {
        code: 'SELECT id, UPPER(name) AS name FROM customers_csv;',
        language: 'sql',
        engine: 'sql',
      },
    };

    const frontendNode = toFrontendNode(backendNode);
    expect(frontendNode.id).toBe('xf-1');
    expect(frontendNode.type).toBe('processing');
    expect(frontendNode.data.category).toBe('processing');
    if (frontendNode.type === 'processing') {
      expect(frontendNode.data.language).toBe('sql');
      expect(frontendNode.data.code).toContain('SELECT id, UPPER(name)');
    }
  });

  it('maps backend datamart container node to frontend DatamartNode', () => {
    const backendNode: BackendNode = {
      id: 'mart-1',
      type: 'SINK',
      subtype: 'postgres_sink',
      label: 'Core Analytics Mart',
      status: 'IDLE',
      position: { x: 750, y: 200 },
      data: {
        category: 'datamart',
        containerKind: 'warehouse',
        expanded: true,
        children: {
          nodes: [],
          edges: [],
        },
      },
    };

    const frontendNode = toFrontendNode(backendNode);
    expect(frontendNode.id).toBe('mart-1');
    expect(frontendNode.type).toBe('datamart');
    if (isDatamartNode(frontendNode)) {
      expect(frontendNode.data.containerKind).toBe('warehouse');
      expect(frontendNode.data.expanded).toBe(true);
      expect(frontendNode.data.children.nodes).toEqual([]);
    }
  });

  it('maps complete backend pipeline graph to frontend nodes and edges', () => {
    const pipeline: BackendPipeline = {
      id: 'pipe-abc',
      name: 'E-commerce ETL',
      status: 'ACTIVE',
      architecture_design: {},
      nodes: [
        {
          id: 'n1',
          type: 'SOURCE',
          subtype: 'generic',
          label: 'raw_events',
          status: 'IDLE',
          position: { x: 0, y: 0 },
          data: { format: 'json' },
        },
        {
          id: 'n2',
          type: 'TRANSFORM',
          subtype: 'generic',
          label: 'aggregate_events',
          status: 'IDLE',
          position: { x: 300, y: 0 },
          data: { language: 'python' },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
        },
      ],
    };

    const graph = toFrontendGraph(pipeline);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source).toBe('n1');
    expect(graph.edges[0].target).toBe('n2');
  });

  it('maps frontend PipelineNode to backend CreateNodePayload', () => {
    const node: PipelineNode = {
      id: 'front-node-1',
      type: 'processing',
      position: { x: 150, y: 250 },
      data: {
        category: 'processing',
        label: 'Calculate Retention',
        description: 'Computes monthly retention cohorts',
        language: 'python',
        engine: 'python',
        code: 'def run(): pass',
        inputColumns: [],
        outputColumns: [],
      },
    };

    const payload = toBackendNodePayload(node);
    expect(payload.type).toBe('TRANSFORM');
    expect(payload.subtype).toBe('python_script');
    expect(payload.label).toBe('Calculate Retention');
    expect(payload.position).toEqual({ x: 150, y: 250 });
  });

  it('generates correct backend edge and node update payloads', () => {
    const edgePayload = toBackendEdgePayload('source_123', 'target_456');
    expect(edgePayload.source_node_id).toBe('source_123');
    expect(edgePayload.target_node_id).toBe('target_456');

    const updatePayload = toBackendNodeUpdatePayload(
      { label: 'Updated Label' },
      { x: 50, y: 60 },
    );
    expect(updatePayload.label).toBe('Updated Label');
    expect(updatePayload.position).toEqual({ x: 50, y: 60 });
  });
});

