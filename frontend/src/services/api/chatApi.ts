import { getJson, postJson } from '../http/client';
import type {
  BackendAgentTask,
  BackendChatMessage,
  SendChatResponse,
} from '../../contracts/backendApi';

export const chatApi = {
  /** GET /pipelines/{pipeline_id}/chat */
  async getChatHistory(pipelineId: string, signal?: AbortSignal): Promise<BackendChatMessage[]> {
    return getJson<BackendChatMessage[]>(`/pipelines/${pipelineId}/chat`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/chat */
  async sendChatMessage(
    pipelineId: string,
    content: string,
    signal?: AbortSignal,
  ): Promise<SendChatResponse> {
    return postJson<{ content: string }, SendChatResponse>(
      `/pipelines/${pipelineId}/chat`,
      { content },
      { signal },
    );
  },

  /** GET /pipelines/{pipeline_id}/agent-tasks */
  async getAgentTasks(pipelineId: string, signal?: AbortSignal): Promise<BackendAgentTask[]> {
    return getJson<BackendAgentTask[]>(`/pipelines/${pipelineId}/agent-tasks`, { signal });
  },

  /** POST /pipelines/{pipeline_id}/agent-tasks/{task_id}/execute */
  async executeAgentTask(
    pipelineId: string,
    taskId: string,
    signal?: AbortSignal,
  ): Promise<BackendAgentTask> {
    return postJson<Record<string, never>, BackendAgentTask>(
      `/pipelines/${pipelineId}/agent-tasks/${taskId}/execute`,
      {},
      { signal },
    );
  },
};

