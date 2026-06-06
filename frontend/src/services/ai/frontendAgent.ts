import { aiActionSchema, type AiAction } from '../../contracts/aiActions';
import type { PipelineGraph } from '../../types/pipeline';

/**
 * Client for the frontend AI agent's LLM endpoint (served by the Vite dev /
 * preview server in `vite-plugins/llmAgentPlugin.ts`). When configured, the
 * agent uses a real LLM to translate free-form backend messages into structured
 * canvas actions. When not configured (or unreachable) callers fall back to the
 * deterministic heuristic agent.
 */

export interface LlmStatus {
  enabled: boolean;
  provider?: string;
  model?: string;
}

export interface LlmPlanResult {
  reasoning: string;
  actions: AiAction[];
}

let statusCache: Promise<LlmStatus> | null = null;

/** Whether the server-side LLM agent is configured. Cached for the session. */
export function getLlmStatus(): Promise<LlmStatus> {
  if (!statusCache) {
    statusCache = fetch('/__llm/status')
      .then((res) => (res.ok ? (res.json() as Promise<LlmStatus>) : { enabled: false }))
      .catch(() => ({ enabled: false }));
  }
  return statusCache;
}

/** Force the next status check to re-fetch (e.g. after config changes). */
export function resetLlmStatus(): void {
  statusCache = null;
}

/**
 * Ask the LLM agent to read a backend message and return canvas actions.
 * Returns null when the agent is unavailable or produced no usable plan, so the
 * caller can fall back to the heuristic agent.
 */
export async function planActionsWithLlm(
  message: string,
  graph: PipelineGraph,
): Promise<LlmPlanResult | null> {
  try {
    const res = await fetch('/__llm/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, graph }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { reasoning?: string; actions?: unknown[] };
    const actions = (data.actions ?? [])
      .map((a) => aiActionSchema.safeParse(a))
      .filter((r): r is { success: true; data: AiAction } => r.success)
      .map((r) => r.data)
      .filter((a) => a.type !== 'explain');

    return { reasoning: data.reasoning ?? '', actions };
  } catch {
    return null;
  }
}
