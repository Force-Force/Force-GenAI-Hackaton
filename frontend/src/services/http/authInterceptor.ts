import { apiConfig } from './config';

/**
 * Frontend auth wiring. Attaches a Bearer token when one is configured.
 * This is intentionally simple and can be replaced by a real token provider
 * (e.g. reading from an auth store) without changing call sites.
 */
let tokenProvider: () => string | undefined = () => apiConfig.authToken;

export function setAuthTokenProvider(provider: () => string | undefined): void {
  tokenProvider = provider;
}

export function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = tokenProvider();
  if (!token) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}
