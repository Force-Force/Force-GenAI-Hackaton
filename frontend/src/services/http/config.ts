/**
 * Centralized, configurable API settings. The base URL is environment-driven
 * so the FastAPI endpoint can be reconfigured per environment without code
 * changes (see .env.example).
 */
export interface ApiConfig {
  baseUrl: string;
  authToken?: string;
}

export const apiConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api',
  authToken: import.meta.env.VITE_API_AUTH_TOKEN || undefined,
};

export function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiConfig.baseUrl}${normalized}`;
}
