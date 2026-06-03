import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../features/chat/store/chatStore';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../features/workspace/store/workspaceStore';
import type { ChatResponse } from '../../contracts/aiActions';
import type { PipelineNode } from '../../types/pipeline';

function mockBackend(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    })),
  );
}

beforeEach(() => {
  usePipelineStore.setState({ nodes: [], edges: [], selectedNodeId: null, viewStack: [] });
  useChatStore.setState({ messages: [], isGenerating: false });
  useWorkspaceStore.setState({ activeTab: 'sources' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chat → action → canvas flow', () => {
  it('appends a validated assistant message with an action', async () => {
    const response: ChatResponse = {
      text: 'Here is a promotion dimension.',
      action: {
        type: 'create_resource',
        payload: {
          id: 'DimPromotion',
          label: 'DimPromotion',
          kind: 'table',
          description: '',
          columns: [{ name: 'promo_key', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
        },
      },
    };
    mockBackend(response);

    await useChatStore.getState().sendMessage('add a promotion dimension');

    const messages = useChatStore.getState().messages;
    const last = messages[messages.length - 1];
    expect(last.sender).toBe('assistant');
    expect(last.action?.type).toBe('create_resource');
  });

  it('applies an action so the node appears on the canvas and switches to the canvas tab', async () => {
    const response: ChatResponse = {
      text: 'Adding it.',
      action: {
        type: 'create_resource',
        payload: { id: 'DimPromotion', label: 'DimPromotion', kind: 'table', description: '', columns: [] },
      },
    };
    mockBackend(response);

    await useChatStore.getState().sendMessage('add it');
    const action = useChatStore.getState().messages.at(-1)!.action!;
    useChatStore.getState().applyAction(action);

    expect(usePipelineStore.getState().nodes.some((n) => n.id === 'DimPromotion')).toBe(true);
    expect(useWorkspaceStore.getState().activeTab).toBe('canvas');
  });

  it('rejects an invalid AI payload and does not mutate the graph', async () => {
    // action missing required `id` -> fails schema validation in aiService.
    mockBackend({ text: 'bad', action: { type: 'create_resource', payload: { label: 'X' } } });

    await useChatStore.getState().sendMessage('break it');

    const last = useChatStore.getState().messages.at(-1)!;
    expect(last.text).toContain('Backend Unavailable');
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
