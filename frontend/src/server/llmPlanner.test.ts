import { describe, expect, it } from 'vitest';
import { readLlmConfig, isLlmConfigured } from './llmPlanner';

describe('readLlmConfig', () => {
  it('auto-detects OpenAI from OPENAI_API_KEY/OPENAI_MODEL (shared backend .env)', () => {
    const cfg = readLlmConfig({
      LLM_PROVIDER: 'cursor', // backend value, unsupported here → skipped
      OPENAI_API_KEY: 'sk-proj-abc',
      OPENAI_MODEL: 'gpt-4o-mini',
      GEMINI_API_KEY: 'g-key',
      GEMINI_MODEL: 'gemini-2.0-flash',
    });
    expect(cfg.provider).toBe('openai');
    expect(cfg.model).toBe('gpt-4o-mini');
    expect(cfg.apiKey).toBe('sk-proj-abc');
    expect(isLlmConfigured(cfg)).toBe(true);
  });

  it('honors explicit AI_PROVIDER over auto-detect', () => {
    const cfg = readLlmConfig({
      AI_PROVIDER: 'google',
      OPENAI_API_KEY: 'sk-proj-abc',
      GEMINI_API_KEY: 'g-key',
      GEMINI_MODEL: 'gemini-2.0-flash',
    });
    expect(cfg.provider).toBe('google');
    expect(cfg.apiKey).toBe('g-key');
    expect(cfg.model).toBe('gemini-2.0-flash');
  });

  it('falls back to a supported LLM_PROVIDER when no AI_PROVIDER', () => {
    const cfg = readLlmConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'a-key' });
    expect(cfg.provider).toBe('anthropic');
    expect(cfg.apiKey).toBe('a-key');
  });

  it('is disabled when no key is present', () => {
    const cfg = readLlmConfig({ LLM_PROVIDER: 'cursor' });
    expect(isLlmConfigured(cfg)).toBe(false);
  });
});
