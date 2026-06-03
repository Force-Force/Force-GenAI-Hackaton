import { postJson } from '../http/client';
import {
  chatResponseSchema,
  type ChatResponse,
} from '../../contracts/aiActions';
import { validateWith } from '../../contracts/api';
import type { PipelineEdge, PipelineNode } from '../../types/pipeline';

export interface AiResult {
  ok: boolean;
  response?: ChatResponse;
  error?: string;
}

interface GraphSnapshot {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

function toGraphPayload(graph: GraphSnapshot) {
  // Send a lean projection of the graph as backend context.
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      position: n.position,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: e.data,
    })),
  };
}

/**
 * All AI processing happens in the FastAPI backend. The frontend only sends
 * the prompt + current graph context and validates the structured response.
 */
export async function chat(
  message: string,
  graph: GraphSnapshot,
  signal?: AbortSignal,
): Promise<AiResult> {
  try {
    const raw = await postJson(
      '/chat',
      { message, graph: toGraphPayload(graph) },
      { signal },
    );
    const validated = validateWith(chatResponseSchema, raw);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    return { ok: true, response: validated.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'AI request failed',
    };
  }
}

/**
 * Submit edited processing-node source code back to the AI backend. The backend
 * may reply with conversational text and/or a follow-up action.
 */
export async function submitProcessingCode(
  nodeId: string,
  language: 'sql' | 'python',
  code: string,
  signal?: AbortSignal,
): Promise<AiResult> {
  try {
    const raw = await postJson(
      '/processing/submit',
      { nodeId, language, code },
      { signal },
    );
    const validated = validateWith(chatResponseSchema, raw);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    return { ok: true, response: validated.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Code submission failed',
    };
  }
}
