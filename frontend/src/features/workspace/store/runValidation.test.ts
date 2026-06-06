import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from './workspaceStore';
import { usePipelineStore } from './pipelineStore';

function jsonRes(body: unknown, status = 200) {
  return { ok: status < 400, status, text: async () => JSON.stringify(body) };
}

const VALIDATION_RUN = {
  id: 'run-1',
  pipeline_id: 'pipe-1',
  score: 60,
  grade: 'C',
  status: 'FAILED',
  issues: [
    {
      severity: 'ERROR',
      code: 'missing_config',
      message: "Node 'Transactions CSV' is missing required config.",
      node_id: 'n1',
    },
    {
      severity: 'WARNING',
      code: 'orphan_node',
      message: "Node 'Notes' is not connected to any edge.",
      node_id: 'n2',
    },
  ],
  summary: 'Validation FAILED: score 60/100 (grade C). 1 error(s), 1 warning(s), 0 info.',
  created_at: '2026-06-04T11:10:00Z',
};

beforeEach(() => {
  usePipelineStore.setState({ pipelineId: 'pipe-1', syncStatus: 'online' });
  useWorkspaceStore.getState().clearValidations();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runValidation (backend-driven)', () => {
  it('POSTs to the validate endpoint and displays the backend result', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/validate')) {
        expect(init?.method).toBe('POST');
        return jsonRes(VALIDATION_RUN);
      }
      return jsonRes({}, 500);
    });
    vi.stubGlobal('fetch', fetchMock);

    await useWorkspaceStore.getState().runValidation();

    const s = useWorkspaceStore.getState();
    const calledValidate = fetchMock.mock.calls.some(([u]) =>
      String(u).includes('/pipelines/pipe-1/validate'),
    );
    expect(calledValidate).toBe(true);

    expect(s.validationSource).toBe('backend');
    expect(s.validationScore).toBe(60);
    expect(s.validationGrade).toBe('C');
    expect(s.validationStatus).toBe('FAILED');
    expect(s.isValid).toBe(false);
    expect(s.validationSummary).toContain('score 60/100');

    expect(s.validations).toHaveLength(2);
    const error = s.validations.find((v) => v.type === 'error');
    expect(error?.category).toBe('standards');
    const warning = s.validations.find((v) => v.type === 'warning');
    expect(warning?.category).toBe('relationships');
  });

  it('falls back to local validation when the backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    await useWorkspaceStore.getState().runValidation();

    const s = useWorkspaceStore.getState();
    expect(s.validationSource).toBe('local');
    expect(s.validationScore).not.toBeNull();
    expect(usePipelineStore.getState().syncStatus).toBe('offline');
  });
});
