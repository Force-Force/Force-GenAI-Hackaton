import type { Connect, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readLlmConfig, isLlmConfigured, planActions } from '../src/server/llmPlanner';

const STATUS_PATH = '/__llm/status';
const PLAN_PATH = '/__llm/plan';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Vite plugin that serves the frontend AI agent's LLM endpoint from the dev /
 * preview server. The API key is read from server-side env (no VITE_ prefix),
 * so it never reaches the browser bundle and provider calls avoid CORS.
 */
export function llmAgentPlugin(env: Record<string, string | undefined>): Plugin {
  const config = readLlmConfig(env);

  if (isLlmConfigured(config)) {
    console.log(
      `\x1b[36m[aura-llm-agent]\x1b[0m enabled · provider=${config.provider} · model=${config.model}`,
    );
  } else {
    console.log(
      '\x1b[33m[aura-llm-agent]\x1b[0m disabled (no API key found). Set AI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY in .env to enable.',
    );
  }

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url ?? '';

    if (url.startsWith(STATUS_PATH) && req.method === 'GET') {
      sendJson(res, 200, {
        enabled: isLlmConfigured(config),
        provider: config.provider,
        model: config.model,
      });
      return;
    }

    if (url.startsWith(PLAN_PATH) && req.method === 'POST') {
      if (!isLlmConfigured(config)) {
        sendJson(res, 503, { error: 'LLM agent not configured. Set AI_API_KEY in .env.' });
        return;
      }
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (typeof body.message !== 'string' || !body.graph) {
          sendJson(res, 400, { error: 'Expected { message: string, graph: PipelineGraph }.' });
          return;
        }
        const result = await planActions(config, {
          message: body.message,
          graph: body.graph,
        });
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, {
          error: err instanceof Error ? err.message : 'LLM planning failed.',
        });
      }
      return;
    }

    next();
  };

  return {
    name: 'aura-llm-agent',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
