import * as pipelineService from '../pipeline/pipelineService';
import { adaptChatResponse, type AdaptedChat } from './chatAdapter';

export interface AiResult {
  ok: boolean;
  response?: AdaptedChat;
  error?: string;
}

/**
 * All AI processing happens in the FastAPI backend's Master Agent. The chat
 * route is pipeline-scoped; the backend already holds the graph context, so the
 * frontend only sends the user's message and adapts the structured response.
 */
export async function chat(
  pipelineId: string,
  message: string,
  signal?: AbortSignal,
): Promise<AiResult> {
  try {
    const res = await pipelineService.postChat(pipelineId, message, signal);
    return { ok: true, response: adaptChatResponse(res) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'AI request failed',
    };
  }
}
