import { buildUrl } from './config';
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

export async function postJson<TBody extends object>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
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

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }

  return parseJsonSafely(response);
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

  if (!response.ok) {
    throw new ApiError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }

  return parseJsonSafely(response);
}
