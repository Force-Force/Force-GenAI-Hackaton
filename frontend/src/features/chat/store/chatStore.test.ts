import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from './chatStore';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import * as aiService from '../../../services/ai/aiService';
import * as pipelineService from '../../../services/pipeline/pipelineService';
import type { AiAction } from '../../../contracts/aiActions';
import type { ChatMessageRead } from '../../../contracts/backend';
import type { ProcessingNode } from '../../../types/pipeline';

describe('chatStore', () => {
  beforeEach(() => {
    usePipelineStore.setState({
      pipelineId: 'pipe-test',
      nodes: [],
      edges: [],
    });
    useChatStore.setState({
      messages: [],
      isGenerating: false,
    });
    useWorkspaceStore.setState({ activeTab: 'canvas' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores empty or whitespace messages', async () => {
    await useChatStore.getState().sendMessage('   ');
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(useChatStore.getState().isGenerating).toBe(false);
  });

  it('warns when backend is not connected (no pipeline bound)', async () => {
    usePipelineStore.setState({ pipelineId: null });

    await useChatStore.getState().sendMessage('Hello AI');

    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].sender).toBe('user');
    expect(msgs[1].sender).toBe('assistant');
    expect(msgs[1].text).toContain('Backend Not Connected');
  });

  it('sends user message and appends AI response on success', async () => {
    vi.spyOn(aiService, 'chat').mockResolvedValueOnce({
      ok: true,
      response: {
        text: 'I suggest creating a customer dimension table.',
        action: {
          type: 'create_resource',
          payload: {
            id: 'DimCustomer',
            label: 'DimCustomer',
            kind: 'table',
            description: '',
            columns: [{ name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false }],
          },
        },
        tasks: [
          { id: 't1', agent_role: 'PROFILER', status: 'PENDING', instruction: 'Audit customer data' },
        ],
      },
    });

    await useChatStore.getState().sendMessage('Help design customers table');

    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].text).toBe('Help design customers table');
    expect(msgs[1].sender).toBe('assistant');
    expect(msgs[1].text).toContain('customer dimension table');
    expect(msgs[1].action?.type).toBe('create_resource');
    expect(msgs[1].tasks).toHaveLength(1);
  });

  it('applies action to pipeline store and switches to canvas tab', () => {
    const action: AiAction = {
      type: 'create_resource',
      payload: {
        id: 'DimProduct',
        label: 'DimProduct',
        kind: 'table',
        description: '',
        columns: [],
      },
    };

    useWorkspaceStore.setState({ activeTab: 'sources' });
    useChatStore.getState().applyAction(action);

    expect(useWorkspaceStore.getState().activeTab).toBe('canvas');
    expect(usePipelineStore.getState().nodes.some((n) => n.id === 'DimProduct')).toBe(true);
    const lastMsg = useChatStore.getState().messages.at(-1);
    expect(lastMsg?.text).toContain('### Applied');
  });

  it('submits processing code and prompts Master Agent review', async () => {
    const node: ProcessingNode = {
      id: 'step-1',
      type: 'processing',
      position: { x: 0, y: 0 },
      data: {
        category: 'processing',
        label: 'Transform',
        description: '',
        language: 'sql',
        code: 'SELECT 1;',
        inputColumns: [],
        outputColumns: [],
      },
    };
    usePipelineStore.setState({ nodes: [node] });

    vi.spyOn(aiService, 'chat').mockResolvedValueOnce({
      ok: true,
      response: { text: 'Code looks clean.', action: null, tasks: [] },
    });

    await useChatStore.getState().submitProcessingCode('step-1', 'sql', 'SELECT * FROM raw;');

    const updatedNode = usePipelineStore.getState().nodes.find((n) => n.id === 'step-1');
    expect((updatedNode?.data as { code: string }).code).toBe('SELECT * FROM raw;');

    const userMsg = useChatStore.getState().messages.find((m) => m.sender === 'user');
    expect(userMsg?.text).toContain('Please review it:');
  });

  it('loads chat history into the store', async () => {
    const history: ChatMessageRead[] = [
      {
        id: 'h1',
        sender: 'USER',
        content_md: 'Initial request',
        created_at: '2026-06-03T10:00:00Z',
      },
      {
        id: 'h2',
        sender: 'MASTER_AGENT',
        content_md: 'Initial advice',
        created_at: '2026-06-03T10:00:05Z',
      },
    ];

    vi.spyOn(pipelineService, 'getChatHistory').mockResolvedValueOnce(history);

    await useChatStore.getState().loadHistory('pipe-test');

    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].sender).toBe('user');
    expect(msgs[1].sender).toBe('assistant');
  });
});
