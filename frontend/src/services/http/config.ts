/**
 * Centralized, configurable API settings. The base URL is environment-driven
 * so the FastAPI endpoint can be reconfigured per environment without code
 * changes (see .env.example).
 *
 * In local dev the default relative base (`/api/v1`) is forwarded to the
 * FastAPI origin by the Vite proxy (see vite.config.ts), which avoids CORS.
 * In other environments set VITE_API_BASE_URL to the absolute API origin.
 */
export interface ApiConfig {
  baseUrl: string;
  wsBaseUrl: string;
  authToken?: string;
}

const rawBase =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1';

function deriveWsBase(httpBase: string): string {
  const explicit = import.meta.env.VITE_API_WS_URL?.replace(/\/$/, '');
  if (explicit) return explicit;

  // Absolute http(s) base -> swap protocol to ws(s).
  if (/^https?:\/\//i.test(httpBase)) {
    return httpBase.replace(/^http/i, 'ws');
  }

  // Relative base -> derive from the current origin (dev proxy forwards ws).
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${httpBase}`;
  }

  return httpBase;
}

export const apiConfig: ApiConfig = {
  baseUrl: rawBase,
  wsBaseUrl: deriveWsBase(rawBase),
  authToken: import.meta.env.VITE_API_AUTH_TOKEN || undefined,
};

export function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiConfig.baseUrl}${normalized}`;
}

export function buildWsUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiConfig.wsBaseUrl}${normalized}`;
}

/**
 * The `/health` route lives at the API origin root, not under the versioned
 * prefix. For an absolute base we resolve it against the origin; for a relative
 * base we return `/health` (the Vite dev proxy forwards it to the API).
 */
export function buildHealthUrl(): string {
  const { baseUrl } = apiConfig;
  if (/^https?:\/\//i.test(baseUrl)) {
    return new URL('/health', baseUrl).toString();
  }
  return '/health';
}
