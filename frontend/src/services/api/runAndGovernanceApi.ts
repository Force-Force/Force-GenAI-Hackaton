import { getJson, postJson } from '../http/client';
import type {
  ApprovalStatus,
  BackendApproval,
  BackendQuestion,
  BackendRun,
  QuestionStatus,
  StartRunResponse,
} from '../../contracts/backendApi';

export const runAndGovernanceApi = {
  /** POST /pipelines/{pipeline_id}/runs */
  async startRun(pipelineId: string, signal?: AbortSignal): Promise<StartRunResponse> {
    return postJson<Record<string, never>, StartRunResponse>(
      `/pipelines/${pipelineId}/runs`,
      {},
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/runs */
  async listRuns(
    pipelineId: string,
    params?: { status?: string; limit?: number; offset?: number },
    signal?: AbortSignal,
  ): Promise<BackendRun[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return getJson<BackendRun[]>(`/pipelines/${pipelineId}/runs${qs}`, { signal });
  },

  /** GET /pipelines/{pipeline_id}/runs/{run_id} */
  async getRun(pipelineId: string, runId: string, signal?: AbortSignal): Promise<BackendRun> {
    return getJson<BackendRun>(`/pipelines/${pipelineId}/runs/${runId}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/runs/{run_id}/resume */
  async resumeRun(pipelineId: string, runId: string, signal?: AbortSignal): Promise<BackendRun> {
    return postJson<Record<string, never>, BackendRun>(
      `/pipelines/${pipelineId}/runs/${runId}/resume`,
      {},
      { signal },
    );
  },

  /** POST /pipelines/{pipeline_id}/runs/{run_id}/answer */
  async answerRunGuardianQuestion(
    pipelineId: string,
    runId: string,
    questionId: string,
    answer: string,
    signal?: AbortSignal,
  ): Promise<BackendRun> {
    return postJson<{ question_id: string; answer: string }, BackendRun>(
      `/pipelines/${pipelineId}/runs/${runId}/answer`,
      { question_id: questionId, answer },
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/approvals?status={status} */
  async listApprovals(
    pipelineId: string,
    status?: ApprovalStatus,
    signal?: AbortSignal,
  ): Promise<BackendApproval[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return getJson<BackendApproval[]>(`/pipelines/${pipelineId}/approvals${query}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/approvals/{approval_id}/decide */
  async decideApproval(
    pipelineId: string,
    approvalId: string,
    approved: boolean,
    comment?: string,
    signal?: AbortSignal,
  ): Promise<BackendApproval> {
    return postJson<{ approved: boolean; comment?: string }, BackendApproval>(
      `/pipelines/${pipelineId}/approvals/${approvalId}/decide`,
      { approved, comment },
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/questions?run_id={run_id}&pending_only={bool} */
  async listQuestions(
    pipelineId: string,
    params?: { run_id?: string; pending_only?: boolean; status?: QuestionStatus },
    signal?: AbortSignal,
  ): Promise<BackendQuestion[]> {
    const q = new URLSearchParams();
    if (params?.run_id) q.set('run_id', params.run_id);
    if (params?.pending_only !== undefined) q.set('pending_only', String(params.pending_only));
    if (params?.status) q.set('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return getJson<BackendQuestion[]>(`/pipelines/${pipelineId}/questions${qs}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/questions/{question_id}/answer */
  async answerQuestion(
    pipelineId: string,
    questionId: string,
    answer: string,
    signal?: AbortSignal,
  ): Promise<BackendQuestion> {
    return postJson<{ answer: string }, BackendQuestion>(
      `/pipelines/${pipelineId}/questions/${questionId}/answer`,
      { answer },
      { signal },
    );
  },
};

