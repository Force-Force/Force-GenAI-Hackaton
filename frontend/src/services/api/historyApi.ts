import { getJson, postJson } from '../http/client';
import type {
  PipelineRevision,
  PipelineRunHistoryItem,
  RollbackResponse,
} from '../../contracts/projectHistory';
import { runAndGovernanceApi } from './runAndGovernanceApi';

export const historyApi = {
  /** GET /pipelines/{pipeline_id}/revisions */
  async listRevisions(
    pipelineId: string,
    params?: { limit?: number; offset?: number },
    signal?: AbortSignal,
  ): Promise<PipelineRevision[]> {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return getJson<PipelineRevision[]>(`/pipelines/${pipelineId}/revisions${qs}`, { signal });
  },

  /** GET /pipelines/{pipeline_id}/revisions/{revision_id} */
  async getRevision(
    pipelineId: string,
    revisionId: string,
    signal?: AbortSignal,
  ): Promise<PipelineRevision> {
    return getJson<PipelineRevision>(`/pipelines/${pipelineId}/revisions/${revisionId}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/revisions/{revision_id}/rollback */
  async rollbackRevision(
    pipelineId: string,
    revisionId: string,
    signal?: AbortSignal,
  ): Promise<RollbackResponse> {
    return postJson<{ reason?: string }, RollbackResponse>(
      `/pipelines/${pipelineId}/revisions/${revisionId}/rollback`,
      { reason: `Rollback requested from AuraBI UI` },
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/runs */
  async listRuns(
    pipelineId: string,
    params?: { status?: string; limit?: number; offset?: number },
    signal?: AbortSignal,
  ): Promise<PipelineRunHistoryItem[]> {
    try {
      const runs = await runAndGovernanceApi.listRuns(pipelineId, params, signal);
      // Backend runs (newest first) -> history items, using only what the backend recorded.
      return runs.map((r, idx) => {
        const run = r as typeof r & { started_at?: string | null; completed_at?: string | null };
        const ctx = r.context ?? {};
        const count = (v: unknown) => (typeof v === 'number' ? v : 0);
        const startedAt = run.started_at || r.created_at || '';
        const completedAt = run.completed_at || undefined;
        const computedDuration =
          startedAt && completedAt
            ? Math.max(0, (Date.parse(completedAt) - Date.parse(startedAt)) / 1000)
            : 0;
        return {
          id: r.id,
          pipeline_id: r.pipeline_id || pipelineId,
          run_number: typeof r.run_number === 'number' ? r.run_number : runs.length - idx,
          status: r.status,
          trigger_type: ((ctx.trigger_type as PipelineRunHistoryItem['trigger_type']) || 'MANUAL'),
          started_at: startedAt,
          completed_at: completedAt,
          duration_seconds:
            typeof r.duration_seconds === 'number' ? r.duration_seconds : computedDuration,
          records_processed:
            typeof r.records_processed === 'number'
              ? r.records_processed
              : count(ctx.records_processed),
          nodes_executed:
            typeof r.nodes_executed === 'number' ? r.nodes_executed : count(ctx.nodes_executed),
          total_nodes:
            typeof r.total_nodes === 'number' ? r.total_nodes : count(ctx.total_nodes),
          error_message: r.error_message,
          events: (r.events ?? []).map((e, eIdx) => {
            const type = String(e.event_type ?? '');
            const payload = (e.payload ?? {}) as Record<string, unknown>;
            const rawStatus = String(e.status ?? '');
            return {
              id: (e.id as string) || `event_${eIdx}`,
              timestamp: (e.created_at as string) || startedAt,
              phase: (e.phase as string) || type || 'RUN',
              status:
                rawStatus === 'SUCCESS' || rawStatus === 'WARNING' || rawStatus === 'ERROR' || rawStatus === 'RUNNING'
                  ? rawStatus
                  : /FAIL|ERROR/.test(type)
                    ? ('ERROR' as const)
                    : /APPROVAL|PAUSE|QUESTION|PII/.test(type)
                      ? ('WARNING' as const)
                      : /STARTED/.test(type)
                        ? ('RUNNING' as const)
                        : ('SUCCESS' as const),
              message: (e.message_md as string) || type,
              node_id: payload.node_id as string | undefined,
              duration_ms: typeof e.duration_ms === 'number' ? e.duration_ms : undefined,
            };
          }),
        };
      });
    } catch {
      return [];
    }
  },
};

