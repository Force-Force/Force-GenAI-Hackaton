import { buildHealthUrl, buildUrl } from './config';
import { withAuthHeaders } from './authInterceptor';

/**
 * Normalized API error with FastAPI response details (e.g. 422 detail, 409 conflict records).
 */
export class ApiError extends Error {
  status: number;
  detail?: string | unknown[];
  data?: unknown;

  constructor(message: string, status: number, detail?: string | unknown[], data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.data = data;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function ensureOk(response: Response, path: string): Promise<void> {
  if (!response.ok) {
    const errorBody = await parseJsonSafely(response);
    let message = `Request to ${path} failed with status ${response.status}`;
    let detail: string | unknown[] | undefined;

    if (errorBody && typeof errorBody === 'object') {
      const errObj = errorBody as { detail?: string | unknown[]; message?: string };
      if (errObj.detail) {
        detail = errObj.detail;
        message = typeof errObj.detail === 'string' ? errObj.detail : JSON.stringify(errObj.detail);
      } else if (errObj.message) {
        message = errObj.message;
      }
    }

    throw new ApiError(message, response.status, detail, errorBody);
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
      headers: withAuthHeaders({
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      }),
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
  return parseJsonSafely(response);
}

export function postJson<TBody extends object, TRes = unknown>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TRes> {
  return sendWithBody('POST', path, body, options) as Promise<TRes>;
}

export function patchJson<TBody extends object, TRes = unknown>(
  path: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TRes> {
  return sendWithBody('PATCH', path, body, options) as Promise<TRes>;
}

export async function getJson<TRes = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<TRes> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'GET',
      headers: withAuthHeaders(options.headers ?? {}),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
  return parseJsonSafely(response) as Promise<TRes>;
}

/** DELETE request. Backend returns 204 with no body. */
export async function del(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'DELETE',
      headers: withAuthHeaders(options.headers ?? {}),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  await ensureOk(response, path);
}

/** Health check ping against root `/health`. */
export async function health(options: RequestOptions = {}): Promise<boolean> {
  try {
    const response = await fetch(buildHealthUrl(), {
      method: 'GET',
      headers: withAuthHeaders(options.headers ?? {}),
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
