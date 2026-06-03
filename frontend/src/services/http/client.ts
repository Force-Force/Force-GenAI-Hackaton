import { buildHealthUrl, buildUrl } from './config';
import { withAuthHeaders } from './authInterceptor';

/** Normalized API error so callers can handle failures consistently. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('Response was not valid JSON', response.status);
  }
}

async function ensureOk(response: Response, path: string): Promise<void> {
  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }
}

async function sendWithBody<TBody extends object>(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
  return parseJsonSafely(response);
}

export function postJson<TBody extends object>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<unknown> {
  return sendWithBody('POST', path, body, options);
}

export function patchJson<TBody extends object>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<unknown> {
  return sendWithBody('PATCH', path, body, options);
}

export async function getJson(
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'GET',
      headers: withAuthHeaders(),
      signal: options.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
  return parseJsonSafely(response);
}

/** DELETE request. Backend returns 204 with no body for these routes. */
export async function del(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers: withAuthHeaders(),
      signal: options.signal,
    });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
}

/** Liveness ping against the API root `/health` route. */
export async function health(options: RequestOptions = {}): Promise<boolean> {
  try {
    const response = await fetch(buildHealthUrl(), {
      method: 'GET',
      headers: withAuthHeaders(),
      signal: options.signal,
    });
    if (!response.ok) return false;
    const raw = await parseJsonSafely(response);
    if (raw && typeof raw === 'object' && 'status' in raw) {
      return (raw as { status?: string }).status === 'ok';
    }
    return false;
  } catch {
    return false;
  }
}
