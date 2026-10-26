import { getJson, postJson } from '../http/client';
import type {
  AgentQueryResponse,
  EtlExecuteResponse,
  EtlIntrospectResponse,
  EtlResultsResponse,
} from '../../contracts/backendApi';

export const etlAndAgentApi = {
  /** POST /pipelines/{pipeline_id}/etl/introspect */
  async introspectEtlSource(
    pipelineId: string,
    signal?: AbortSignal,
  ): Promise<EtlIntrospectResponse> {
    return postJson<Record<string, never>, EtlIntrospectResponse>(
      `/pipelines/${pipelineId}/etl/introspect`,
      {},
      { signal },
    );
  },

  /** POST /pipelines/{pipeline_id}/etl/execute */
  async executeEtlInstruction(
    pipelineId: string,
    instruction: string,
    signal?: AbortSignal,
  ): Promise<EtlExecuteResponse> {
    return postJson<{ instruction: string }, EtlExecuteResponse>(
      `/pipelines/${pipelineId}/etl/execute`,
      { instruction },
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/etl/results */
  async getEtlResults(pipelineId: string, signal?: AbortSignal): Promise<EtlResultsResponse> {
    return getJson<EtlResultsResponse>(`/pipelines/${pipelineId}/etl/results`, { signal });
  },

  /** POST /agent/query (Nightshift standalone analysis agent) */
  async queryAnalysisAgent(
    question: string,
    requestId?: string,
    signal?: AbortSignal,
  ): Promise<AgentQueryResponse> {
    const headers: Record<string, string> = {};
    if (requestId) headers['X-Request-ID'] = requestId;

    return postJson<{ question: string }, AgentQueryResponse>(
      '/agent/query',
      { question },
      { signal, headers },
    );
  },

  /** GET /agent/traces/{request_id} */
  async getAnalysisTrace(requestId: string, signal?: AbortSignal): Promise<unknown> {
    return getJson<unknown>(`/agent/traces/${encodeURIComponent(requestId)}`, { signal });
  },
};

