import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../features/chat/store/chatStore';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../features/workspace/store/workspaceStore';
import type { AiAction } from '../../contracts/aiActions';
import type { PipelineNode } from '../../types/pipeline';

/** Build a backend chat response, optionally carrying a structured action. */
function chatResponse(text: string, action?: AiAction) {
  return {
    user_message: { id: 'u1', sender: 'USER', content_md: 'q', created_at: '2026-06-03T10:00:00Z' },
    agent_message: {
      id: 'a1',
      sender: 'MASTER_AGENT',
      content_md: text,
      metadata: action ? { action } : null,
      created_at: '2026-06-03T10:00:01Z',
    },
    agent_tasks: [
      { id: 't1', agent_role: 'PROFILER', instruction: 'Profile the data', status: 'PENDING' },
    ],
  };
}

/**
 * Route the chat endpoint to a given body; all other endpoints (node/edge
 * create from optimistic sync) fail so reconciliation is skipped and the
 * locally-created ids are preserved for assertions.
 */
function mockChat(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/chat')) {
        return { ok: true, status: 200, text: async () => JSON.stringify(body) };
      }
      return { ok: false, status: 500, text: async () => '' };
    }),
  );
}

beforeEach(() => {
  usePipelineStore.setState({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    viewStack: [],
    pipelineId: 'pipe-1',
    syncStatus: 'online',
  });
  // These tests exercise the manual apply flow; auto-apply has its own tests.
  useChatStore.setState({ messages: [], isGenerating: false, autoApply: false });
  useWorkspaceStore.setState({ activeTab: 'sources' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chat → action → canvas flow', () => {
  it('appends an assistant message with an action parsed from metadata', async () => {
    mockChat(
      chatResponse('Here is a promotion dimension.', {
        type: 'create_resource',
        payload: {
          id: 'DimPromotion',
          label: 'DimPromotion',
          kind: 'table',
          description: '',
          columns: [{ name: 'promo_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
        },
      }),
    );

    await useChatStore.getState().sendMessage('add a promotion dimension');

    const last = useChatStore.getState().messages.at(-1)!;
    expect(last.sender).toBe('assistant');
    expect(last.action?.type).toBe('create_resource');
    expect(last.tasks?.[0]?.agent_role).toBe('PROFILER');
  });

  it('applies an action so the node appears and switches to the canvas tab', async () => {
    mockChat(
      chatResponse('Adding it.', {
        type: 'create_resource',
        payload: { id: 'DimPromotion', label: 'DimPromotion', kind: 'table', description: '', columns: [] },
      }),
    );

    await useChatStore.getState().sendMessage('add it');
    const action = useChatStore.getState().messages.at(-1)!.action!;
    useChatStore.getState().applyAction(action);

    expect(usePipelineStore.getState().nodes.some((n) => n.id === 'DimPromotion')).toBe(true);
    expect(useWorkspaceStore.getState().activeTab).toBe('canvas');
  });

  it('drops an invalid action from metadata without an error message', async () => {
    mockChat(chatResponse('bad action', { type: 'create_resource', payload: { label: 'X' } } as unknown as AiAction));

    await useChatStore.getState().sendMessage('break it');

    const last = useChatStore.getState().messages.at(-1)!;
    expect(last.text).toContain('bad action');
    expect(last.action ?? null).toBeNull();
    expect(usePipelineStore.getState().nodes).toHaveLength(0);
  });

  it('surfaces a network failure as an assistant message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    await useChatStore.getState().sendMessage('hello');
    const last = useChatStore.getState().messages.at(-1)!;
    expect(last.text).toContain('Backend Unavailable');
  });

  it('warns when no pipeline is bound', async () => {
    usePipelineStore.setState({ pipelineId: null });
    await useChatStore.getState().sendMessage('hello');
    const last = useChatStore.getState().messages.at(-1)!;
    expect(last.text).toContain('Backend Not Connected');
  });
});

interface ApiCall {
  method: string;
  url: string;
}

function jsonRes(status: number, body: unknown) {
  return { ok: status < 400, status, text: async () => JSON.stringify(body) };
}

/** Mock the node/edge REST routes and record every call's method + url. */
function mockGraphApi(): ApiCall[] {
  const calls: ApiCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const u = String(url);
      calls.push({ method, url: u });
      if (method === 'PATCH' && u.includes('/nodes/')) {
        const id = u.split('/nodes/')[1];
        return jsonRes(200, {
          id,
          type: 'SINK',
          subtype: 'generic',
          label: '',
          position: { x: 0, y: 0 },
          data: {},
          status: 'IDLE',
        });
      }
      if (method === 'POST' && u.includes('/nodes')) {
        return jsonRes(201, {
          id: 'srv-node',
          type: 'SINK',
          subtype: 'generic',
          label: '',
          position: { x: 0, y: 0 },
          data: {},
          status: 'IDLE',
        });
      }
      if (method === 'POST' && u.includes('/edges')) {
        return jsonRes(201, { id: 'srv-edge', source: 'a', target: 'b' });
      }
      return jsonRes(500, {});
    }),
  );
  return calls;
}

async function waitFor(predicate: () => boolean, ms = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('waitFor timed out');
}

describe('AI canvas persistence via REST routes', () => {
  it('PATCHes the container when an AI table is routed into a warehouse (not a stray POST)', async () => {
    const container: PipelineNode = {
      id: 'dw_core',
      type: 'datamart',
      position: { x: 0, y: 0 },
      data: {
        category: 'datamart',
        label: 'Warehouse',
        description: '',
        containerKind: 'warehouse',
        children: { nodes: [], edges: [] },
      },
    };
    usePipelineStore.setState({
      nodes: [container],
      edges: [],
      selectedNodeId: null,
      viewStack: [],
      pipelineId: 'pipe-1',
      syncStatus: 'online',
    });

    const calls = mockGraphApi();

    usePipelineStore.getState().applyAction({
      type: 'create_resource',
      payload: {
        id: 'fct_sales',
        label: 'fct_sales',
        kind: 'table',
        warehouseRole: 'fact',
        description: '',
        columns: [{ name: 'sales_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
      },
    });

    await waitFor(() =>
      calls.some((c) => c.method === 'PATCH' && c.url.includes('/nodes/dw_core')),
    );

    // The nested table must not be POSTed as a standalone backend node.
    expect(calls.some((c) => c.method === 'POST' && c.url.includes('/nodes'))).toBe(false);
    // It now lives inside the container's children.
    const stored = usePipelineStore.getState().nodes.find((n) => n.id === 'dw_core')!;
    expect(
      stored.data.category === 'datamart' &&
        stored.data.children.nodes.some((n) => n.id === 'fct_sales'),
    ).toBe(true);
  });

  it('POSTs a standalone node for a top-level AI resource', async () => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      viewStack: [],
      pipelineId: 'pipe-1',
      syncStatus: 'online',
    });

    const calls = mockGraphApi();

    usePipelineStore.getState().applyAction({
      type: 'create_resource',
      payload: {
        id: 'raw_orders',
        label: 'raw_orders',
        kind: 'source',
        description: '',
        columns: [],
      },
    });

    await waitFor(() => calls.some((c) => c.method === 'POST' && c.url.includes('/nodes')));
    expect(calls.some((c) => c.method === 'PATCH' && c.url.includes('/nodes/'))).toBe(false);
  });
});

describe('datamart navigation', () => {
  it('drills into a datamart and back out via the view stack', () => {
    const innerNode: PipelineNode = {
      id: 'inner',
      type: 'resource',
      position: { x: 0, y: 0 },
      data: { category: 'resource', kind: 'table', label: 'inner', description: '', columns: [] },
    };
    const martNode: PipelineNode = {
      id: 'mart',
      type: 'datamart',
      position: { x: 0, y: 0 },
      data: {
        category: 'datamart',
        label: 'Mart',
        description: '',
        children: { nodes: [innerNode], edges: [] },
      },
    };
    usePipelineStore.setState({ nodes: [martNode], edges: [], viewStack: [] });

    usePipelineStore.getState().enterDatamart('mart');
    expect(usePipelineStore.getState().viewStack).toHaveLength(1);
    expect(usePipelineStore.getState().nodes.some((n) => n.id === 'inner')).toBe(true);

    usePipelineStore.getState().exitToRoot();
    expect(usePipelineStore.getState().viewStack).toHaveLength(0);
    expect(usePipelineStore.getState().nodes.some((n) => n.id === 'mart')).toBe(true);
  });
});
