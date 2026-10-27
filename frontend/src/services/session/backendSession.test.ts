import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackendStore } from './backendSession';
import { usePipelineStore } from '../../features/workspace/store/pipelineStore';
import { usePlanStore } from '../../features/uiop/store/planStore';
import { useInsightStore } from '../../features/insights/store/insightStore';
import { useHistoryStore } from '../../features/history/store/historyStore';
import { useWorkspaceStore } from '../../features/workspace/store/workspaceStore';
import { pipelineApi } from '../api/pipelineApi';
import { chatApi } from '../api/chatApi';
import { historyApi } from '../api/historyApi';
import { etlAndAgentApi } from '../api/etlAndAgentApi';
import { runAndGovernanceApi } from '../api/runAndGovernanceApi';

describe('Mock to Live Data Switch (backendSession)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Reset stores to initial mock / offline state
    usePipelineStore.setState({
      nodes: [
        {
          id: 'mock_node_1',
          type: 'resource',
          position: { x: 0, y: 0 },
          data: {
            category: 'resource',
            label: 'mock_table',
            kind: 'table',
            description: 'Mock seed node',
            columns: [],
          },
        },
      ],
      edges: [],
      isMockSeedData: true,
    });

    usePlanStore.getState().resetProtocolState();
    useInsightStore.getState().resetInsights();
    useHistoryStore.getState().resetToInitialMock();
    useWorkspaceStore.setState({ projectName: 'Retail Lakehouse Master Pipeline' });

    useBackendStore.setState({
      isOnline: false,
      health: null,
      activePipelineId: null,
      activePipeline: null,
      pipelinesList: [],
      activeRun: null,
      pendingApprovals: [],
      pendingQuestions: [],
      agentTasks: [],
      isLoading: false,
    });
  });

  it('starts in offline mock state with isMockSeedData=true across all stores', () => {
    expect(useBackendStore.getState().isOnline).toBe(false);
    expect(usePipelineStore.getState().isMockSeedData).toBe(true);
    expect(usePlanStore.getState().isMockSeedData).toBe(true);
    expect(useInsightStore.getState().isMockSeedData).toBe(true);
    expect(useHistoryStore.getState().isMockSeedData).toBe(true);

    expect(usePipelineStore.getState().nodes.length).toBeGreaterThan(0);
    expect(usePlanStore.getState().stages.length).toBeGreaterThan(0);
    expect(useInsightStore.getState().insights.length).toBeGreaterThan(0);
    expect(useHistoryStore.getState().revisions.length).toBeGreaterThan(0);
  });

  it('purges all mock seed data upon successful health check (online transition)', async () => {
    vi.spyOn(pipelineApi, 'getHealth').mockResolvedValueOnce({
      status: 'ok',
      model: 'nemotron-70b',
      llm_configured: true,
    });
    vi.spyOn(pipelineApi, 'listPipelines').mockResolvedValueOnce([]);

    const online = await useBackendStore.getState().checkHealth();

    expect(online).toBe(true);
    expect(useBackendStore.getState().isOnline).toBe(true);

    // All stores must have purged their mock data
    expect(usePipelineStore.getState().isMockSeedData).toBe(false);
    expect(usePipelineStore.getState().nodes).toHaveLength(0);
    expect(usePipelineStore.getState().edges).toHaveLength(0);

    expect(usePlanStore.getState().isMockSeedData).toBe(false);
    expect(usePlanStore.getState().stages).toHaveLength(0);
    expect(usePlanStore.getState().kpis).toHaveLength(0);
    expect(usePlanStore.getState().questions).toHaveLength(0);

    expect(useInsightStore.getState().isMockSeedData).toBe(false);
    expect(useInsightStore.getState().insights).toHaveLength(0);
    expect(useInsightStore.getState().summaryCards).toHaveLength(0);

    expect(useHistoryStore.getState().isMockSeedData).toBe(false);
    expect(useHistoryStore.getState().revisions).toHaveLength(0);
    expect(useHistoryStore.getState().runs).toHaveLength(0);
  });

  it('hydrates real backend pipeline data and overwrites mock state cleanly', async () => {
    const liveBackendPipeline = {
      id: 'pipe-live-99',
      name: 'Production Banking ETL',
      status: 'ACTIVE' as const,
      updated_at: '2026-10-27T10:00:00Z',
      architecture_design: {},
      nodes: [
        {
          id: 'bn-1',
          type: 'SOURCE' as const,
          subtype: 'postgres_sink' as const,
          label: 'live_customers',
          position: { x: 50, y: 50 },
          data: { label: 'live_customers', columns: [] },
          status: 'VALID' as const,
        },
      ],
      edges: [],
    };

    vi.spyOn(pipelineApi, 'getPipeline').mockResolvedValueOnce(liveBackendPipeline);
    vi.spyOn(chatApi, 'getChatHistory').mockResolvedValueOnce([]);
    vi.spyOn(etlAndAgentApi, 'getPipelineInsights').mockResolvedValueOnce({ insights: [], summaryCards: [] });
    vi.spyOn(historyApi, 'listRevisions').mockResolvedValueOnce([]);
    vi.spyOn(historyApi, 'listRuns').mockResolvedValueOnce([]);
    vi.spyOn(runAndGovernanceApi, 'listApprovals').mockResolvedValueOnce([]);
    vi.spyOn(runAndGovernanceApi, 'listQuestions').mockResolvedValueOnce([]);
    vi.spyOn(chatApi, 'getAgentTasks').mockResolvedValueOnce([]);

    await useBackendStore.getState().loadPipeline('pipe-live-99');

    expect(useBackendStore.getState().activePipelineId).toBe('pipe-live-99');
    expect(useWorkspaceStore.getState().projectName).toBe('Production Banking ETL');

    // Pipeline store should now hold the live backend node
    const pipeState = usePipelineStore.getState();
    expect(pipeState.isMockSeedData).toBe(false);
    expect(pipeState.nodes).toHaveLength(1);
    expect(pipeState.nodes[0].id).toBe('bn-1');
  });

  it('remains in offline mode gracefully when health check fails without crashing stores', async () => {
    vi.spyOn(pipelineApi, 'getHealth').mockRejectedValueOnce(new Error('Connection refused'));

    const online = await useBackendStore.getState().checkHealth();

    expect(online).toBe(false);
    expect(useBackendStore.getState().isOnline).toBe(false);
    expect(useBackendStore.getState().health).toBeNull();

    // Offline data remains intact for offline usage
    expect(usePipelineStore.getState().isMockSeedData).toBe(true);
    expect(usePipelineStore.getState().nodes.length).toBeGreaterThan(0);
  });
});

