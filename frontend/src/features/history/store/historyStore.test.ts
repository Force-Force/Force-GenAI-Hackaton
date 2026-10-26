import { beforeEach, describe, expect, it } from 'vitest';
import { useHistoryStore } from './historyStore';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';

describe('Project History Store & Version Ledger', () => {
  beforeEach(() => {
    useHistoryStore.getState().resetToInitialMock();
    usePipelineStore.setState({
      nodes: [
        {
          id: 'test_node_1',
          type: 'resource',
          position: { x: 100, y: 100 },
          data: {
            category: 'resource',
            label: 'raw_transactions',
            kind: 'source',
            description: 'Raw transactions',
            columns: [],
          },
        },
      ],
      edges: [],
    });
    useWorkspaceStore.setState({
      projectName: 'Test Retail Pipeline',
    });
  });

  it('initializes with offline revision ledger and runs', () => {
    const state = useHistoryStore.getState();
    expect(state.revisions.length).toBeGreaterThan(0);
    expect(state.runs.length).toBeGreaterThan(0);
    expect(state.isMockSeedData).toBe(true);
    expect(state.revisions[0].revision).toBe(4);
    expect(state.revisions[0].title).toContain('Star Schema');
  });

  it('records a new local revision with snapshot and incremented version number', () => {
    useHistoryStore.getState().recordLocalRevision(
      'Added Fact Daily Revenue Aggregation',
      'Compiled SQL transformation node for revenue reporting.',
      'MASTER_AGENT',
      'Master Builder Agent',
      ['Added fact_daily_revenue processing node'],
    );

    const state = useHistoryStore.getState();
    expect(state.revisions[0].revision).toBe(5);
    expect(state.revisions[0].title).toBe('Added Fact Daily Revenue Aggregation');
    expect(state.revisions[0].author_type).toBe('MASTER_AGENT');
    expect(state.revisions[0].operations_summary).toContain('Added fact_daily_revenue processing node');
    expect(state.revisions[0].snapshot?.nodes).toHaveLength(1);
    expect(state.isMockSeedData).toBe(false);
  });

  it('rolls back to an earlier revision and generates an audited rollback record', async () => {
    // Target revision 2
    const targetRev = useHistoryStore.getState().revisions.find((r) => r.revision === 2);
    expect(targetRev).toBeDefined();

    const ok = await useHistoryStore.getState().rollbackToRevision(targetRev!.id);
    expect(ok).toBe(true);

    const state = useHistoryStore.getState();
    // A new revision should be appended with rollback title
    expect(state.revisions[0].revision).toBe(5);
    expect(state.revisions[0].title).toContain('Rollback to Revision v2');
    expect(state.revisions[0].tags).toContain('rollback');
  });

  it('purges all mock revisions and runs when transitioning to live backend', () => {
    useHistoryStore.getState().clearMockHistoryForLiveBackend();
    const state = useHistoryStore.getState();
    expect(state.revisions).toHaveLength(0);
    expect(state.runs).toHaveLength(0);
    expect(state.selectedRevision).toBeNull();
    expect(state.selectedRun).toBeNull();
    expect(state.isMockSeedData).toBe(false);
  });

  it('controls modal state and active tab', () => {
    const store = useHistoryStore.getState();
    expect(store.isHistoryOpen).toBe(false);

    store.openHistory('runs');
    expect(useHistoryStore.getState().isHistoryOpen).toBe(true);
    expect(useHistoryStore.getState().activeTab).toBe('runs');

    store.closeHistory();
    expect(useHistoryStore.getState().isHistoryOpen).toBe(false);
  });
});

