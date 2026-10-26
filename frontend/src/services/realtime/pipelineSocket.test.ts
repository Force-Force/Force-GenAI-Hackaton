import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { pipelineSocket } from './pipelineSocket';
import type { BackendWsFrame } from '../../contracts/backendApi';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) this.onopen();
  }

  simulateMessage(data: string | object) {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.onmessage) this.onmessage({ data: raw });
  }

  simulateClose() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  send(msg: string) {
    this.sentMessages.push(msg);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
}

describe('PipelineSocketManager', () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).WebSocket = MockWebSocket;
    pipelineSocket.disconnect();
  });

  afterEach(() => {
    pipelineSocket.disconnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).WebSocket = originalWebSocket;
  });

  it('connects to pipeline WebSocket URL and notifies status listeners', () => {
    const statusHistory: string[] = [];
    const unsub = pipelineSocket.onStatusChange((status) => {
      statusHistory.push(status);
    });

    pipelineSocket.connect('pipe-xyz-123');

    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain('/ws/pipelines/pipe-xyz-123');
    expect(pipelineSocket.getStatus()).toBe('connecting');

    // Simulate connection open
    MockWebSocket.instances[0].simulateOpen();
    expect(pipelineSocket.getStatus()).toBe('connected');

    unsub();
  });

  it('receives frames and notifies registered event listeners', () => {
    pipelineSocket.connect('pipe-xyz-123');
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const receivedFrames: BackendWsFrame[] = [];
    const unsub = pipelineSocket.on('node.created', (frame) => {
      receivedFrames.push(frame);
    });

    const testFrame: BackendWsFrame = {
      type: 'node.created',
      pipeline_id: 'pipe-xyz-123',
      payload: {
        id: 'node-stripe-in',
        type: 'SOURCE',
        subtype: 'stripe',
        label: 'Stripe Webhooks',
        status: 'IDLE',
      },
    };

    ws.simulateMessage(testFrame);
    expect(receivedFrames).toHaveLength(1);
    expect(receivedFrames[0].type).toBe('node.created');
    expect((receivedFrames[0].payload as { id: string }).id).toBe('node-stripe-in');

    unsub();
  });

  it('handles disconnect and cleanup cleanly', () => {
    pipelineSocket.connect('pipe-xyz-123');
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    pipelineSocket.disconnect();
    expect(pipelineSocket.getStatus()).toBe('disconnected');
    expect(pipelineSocket.getPipelineId()).toBeNull();
  });
});

