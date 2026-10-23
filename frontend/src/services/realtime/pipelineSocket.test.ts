import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectPipelineSocket } from './pipelineSocket';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 1; // OPEN
  onmessage: ((ev: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  triggerMessage(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
}

describe('connectPipelineSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    usePipelineStore.setState({ nodes: [], edges: [], pipelineId: 'pipe-ws' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('connects to the pipeline websocket route and dispatches node.created event', () => {
    const disconnect = connectPipelineSocket('pipe-ws');
    const ws = MockWebSocket.instances[0];

    expect(ws).toBeDefined();
    expect(ws.url).toContain('/ws/pipelines/pipe-ws');

    ws.triggerMessage({
      type: 'node.created',
      payload: {
        id: 'ws-node-1',
        type: 'SOURCE',
        subtype: 'csv',
        label: 'Inbound Orders',
        position: { x: 10, y: 20 },
        data: {},
        status: 'IDLE',
      },
    });

    const nodes = usePipelineStore.getState().nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('ws-node-1');

    disconnect();
  });

  it('dispatches edge.created and edge.deleted events', () => {
    const disconnect = connectPipelineSocket('pipe-ws');
    const ws = MockWebSocket.instances[0];

    ws.triggerMessage({
      type: 'edge.created',
      payload: {
        id: 'ws-edge-1',
        source: 'node-a',
        target: 'node-b',
      },
    });

    expect(usePipelineStore.getState().edges).toHaveLength(1);
    expect(usePipelineStore.getState().edges[0].id).toBe('ws-edge-1');

    ws.triggerMessage({
      type: 'edge.deleted',
      payload: {
        id: 'ws-edge-1',
      },
    });

    expect(usePipelineStore.getState().edges).toHaveLength(0);

    disconnect();
  });

  it('ignores non-json and irrelevant frames safely', () => {
    const disconnect = connectPipelineSocket('pipe-ws');
    const ws = MockWebSocket.instances[0];

    expect(() => {
      ws.triggerMessage('PONG');
      ws.triggerMessage({ type: 'chat.message', payload: {} });
    }).not.toThrow();

    disconnect();
  });
});

