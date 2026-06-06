import { generateText, Output, createGateway, type LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { PipelineGraph } from '../types/pipeline';
import type { AiAction } from '../contracts/aiActions';
import { llmPlanSchema, planToAiActions } from '../services/ai/llm/planSchema';
import { SYSTEM_PROMPT, buildUserPrompt } from '../services/ai/llm/promptBuilder';

/**
 * Server-side LLM planner. Runs inside the Vite dev/preview server (Node), so
 * the API key stays out of the browser bundle and provider calls are not
 * blocked by CORS. The "brain" (prompt + schema) is shared with the frontend.
 */

export type LlmProvider = 'gateway' | 'openai' | 'anthropic' | 'google';

export interface LlmConfig {
  apiKey: string;
  provider: LlmProvider;
  model: string;
}

export interface PlanRequest {
  message: string;
  graph: PipelineGraph;
}

export interface PlanResult {
  reasoning: string;
  actions: AiAction[];
}

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  gateway: 'openai/gpt-4o-mini',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  google: 'gemini-2.0-flash',
};

const SUPPORTED: LlmProvider[] = ['gateway', 'openai', 'anthropic', 'google'];

type Env = Record<string, string | undefined>;

function has(env: Env, key: string): boolean {
  return Boolean(env[key] && env[key]!.trim());
}

function resolveApiKey(env: Env, provider: LlmProvider): string {
  switch (provider) {
    case 'openai':
      return env.AI_API_KEY || env.OPENAI_API_KEY || '';
    case 'anthropic':
      return env.AI_API_KEY || env.ANTHROPIC_API_KEY || '';
    case 'google':
      return (
        env.AI_API_KEY ||
        env.GEMINI_API_KEY ||
        env.GOOGLE_GENERATIVE_AI_API_KEY ||
        env.GOOGLE_API_KEY ||
        ''
      );
    case 'gateway':
    default:
      return env.AI_API_KEY || env.AI_GATEWAY_API_KEY || '';
  }
}

function resolveModel(env: Env, provider: LlmProvider): string {
  if (env.AI_MODEL) return env.AI_MODEL;
  switch (provider) {
    case 'openai':
      return env.OPENAI_MODEL || DEFAULT_MODELS.openai;
    case 'anthropic':
      return env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
    case 'google':
      return env.GEMINI_MODEL || env.GOOGLE_MODEL || DEFAULT_MODELS.google;
    case 'gateway':
    default:
      return DEFAULT_MODELS.gateway;
  }
}

/**
 * Read and normalize LLM configuration from environment variables.
 *
 * Resolution order for the provider:
 *   1. AI_PROVIDER (explicit), if it names a supported provider.
 *   2. LLM_PROVIDER, if it names a supported provider (the backend uses this;
 *      values like "cursor" are unsupported here and fall through).
 *   3. Auto-detect from whichever provider key is present.
 *
 * This intentionally understands the common backend variable names
 * (OPENAI_API_KEY/OPENAI_MODEL, GEMINI_API_KEY/GEMINI_MODEL, ANTHROPIC_API_KEY)
 * so a single shared .env "just works".
 */
export function readLlmConfig(env: Env): LlmConfig {
  const explicit = (env.AI_PROVIDER || '').toLowerCase() as LlmProvider;
  const backend = (env.LLM_PROVIDER || '').toLowerCase() as LlmProvider;

  let provider: LlmProvider | '' = SUPPORTED.includes(explicit) ? explicit : '';
  if (!provider && SUPPORTED.includes(backend)) provider = backend;
  if (!provider) {
    if (has(env, 'OPENAI_API_KEY')) provider = 'openai';
    else if (
      has(env, 'GEMINI_API_KEY') ||
      has(env, 'GOOGLE_GENERATIVE_AI_API_KEY') ||
      has(env, 'GOOGLE_API_KEY')
    )
      provider = 'google';
    else if (has(env, 'ANTHROPIC_API_KEY')) provider = 'anthropic';
    else if (has(env, 'AI_GATEWAY_API_KEY') || has(env, 'AI_API_KEY')) provider = 'gateway';
    else provider = 'gateway';
  }

  return {
    apiKey: resolveApiKey(env, provider),
    provider,
    model: resolveModel(env, provider),
  };
}

export function isLlmConfigured(config: LlmConfig): boolean {
  return config.apiKey.trim().length > 0;
}

function buildModel(config: LlmConfig): LanguageModel {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({ apiKey: config.apiKey })(config.model);
    case 'anthropic':
      return createAnthropic({ apiKey: config.apiKey })(config.model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model);
    case 'gateway':
    default:
      return createGateway({ apiKey: config.apiKey })(config.model);
  }
}

/** Ask the LLM to translate a backend message into structured canvas actions. */
export async function planActions(
  config: LlmConfig,
  request: PlanRequest,
): Promise<PlanResult> {
  const model = buildModel(config);
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(request.message, request.graph),
    temperature: 0,
    output: Output.object({ schema: llmPlanSchema }),
  });

  const plan = result.output;
  return {
    reasoning: plan.reasoning,
    actions: planToAiActions(plan),
  };
}
