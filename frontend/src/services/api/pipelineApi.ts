import { del, getJson, patchJson, postJson } from '../http/client';
import type {
  BackendEdge,
  BackendNode,
  BackendPipeline,
  CreateEdgePayload,
  CreateNodePayload,
  CreatePipelinePayload,
  HealthResponse,
  PipelineListItem,
  UpdateNodePayload,
  UpdatePipelinePayload,
} from '../../contracts/backendApi';
import { buildHealthUrl } from '../http/config';

export const pipelineApi = {
  /** GET /health */
  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    const res = await fetch(buildHealthUrl(), { signal });
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return (await res.json()) as HealthResponse;
  },

  /** POST /pipelines */
  async createPipeline(name: string, signal?: AbortSignal): Promise<BackendPipeline> {
    const payload: CreatePipelinePayload = { name };
    return postJson<CreatePipelinePayload, BackendPipeline>('/pipelines', payload, { signal });
  },

  /** GET /pipelines?skip={skip}&limit={limit} */
  async listPipelines(skip = 0, limit = 50, signal?: AbortSignal): Promise<PipelineListItem[]> {
    return getJson<PipelineListItem[]>(`/pipelines?skip=${skip}&limit=${limit}`, { signal });
  },

  /** GET /pipelines/{pipeline_id} */
  async getPipeline(pipelineId: string, signal?: AbortSignal): Promise<BackendPipeline> {
    return getJson<BackendPipeline>(`/pipelines/${pipelineId}`, { signal });
  },

  /** PATCH /pipelines/{pipeline_id} */
  async updatePipeline(
    pipelineId: string,
    patch: UpdatePipelinePayload,
    signal?: AbortSignal,
  ): Promise<BackendPipeline> {
    return patchJson<UpdatePipelinePayload, BackendPipeline>(`/pipelines/${pipelineId}`, patch, {
      signal,
    });
  },

  /**
   * POST /pipelines/{pipeline_id}/plan/generate — the planner agent designs the pipeline
   * with Nemotron from the live Zetaris catalog and measures each KPI on Zetaris.
   * Takes one to three minutes.
   */
  async generatePlan(
    pipelineId: string,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<{ reply: string; markdown: string; uiop: unknown }> {
    return postJson<{ prompt: string }, { reply: string; markdown: string; uiop: unknown }>(
      `/pipelines/${pipelineId}/plan/generate`,
      { prompt },
      { signal },
    );
  },

  /** DELETE /pipelines/{pipeline_id} */
  async deletePipeline(pipelineId: string, signal?: AbortSignal): Promise<void> {
    return del(`/pipelines/${pipelineId}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/nodes */
  async createNode(
    pipelineId: string,
    payload: CreateNodePayload,
    signal?: AbortSignal,
  ): Promise<BackendNode> {
    return postJson<CreateNodePayload, BackendNode>(`/pipelines/${pipelineId}/nodes`, payload, {
      signal,
    });
  },

  /** PATCH /pipelines/{pipeline_id}/nodes/{node_id} */
  async updateNode(
    pipelineId: string,
    nodeId: string,
    patch: UpdateNodePayload,
    signal?: AbortSignal,
  ): Promise<BackendNode> {
    return patchJson<UpdateNodePayload, BackendNode>(
      `/pipelines/${pipelineId}/nodes/${nodeId}`,
      patch,
      { signal },
    );
  },

  /** DELETE /pipelines/{pipeline_id}/nodes/{node_id} */
  async deleteNode(pipelineId: string, nodeId: string, signal?: AbortSignal): Promise<void> {
    return del(`/pipelines/${pipelineId}/nodes/${nodeId}`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/edges */
  async createEdge(
    pipelineId: string,
    sourceNodeId: string,
    targetNodeId: string,
    signal?: AbortSignal,
  ): Promise<BackendEdge> {
    const payload: CreateEdgePayload = {
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
    };
    return postJson<CreateEdgePayload, BackendEdge>(`/pipelines/${pipelineId}/edges`, payload, {
      signal,
    });
  },

  /** DELETE /pipelines/{pipeline_id}/edges/{edge_id} */
  async deleteEdge(pipelineId: string, edgeId: string, signal?: AbortSignal): Promise<void> {
    return del(`/pipelines/${pipelineId}/edges/${edgeId}`, { signal });
  },
};

