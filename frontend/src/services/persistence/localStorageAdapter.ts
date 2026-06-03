import type { PersistenceAdapter } from './persistenceAdapter';

/** Default browser localStorage-backed persistence adapter. */
export const localStorageAdapter: PersistenceAdapter = {
  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable; persistence is best-effort.
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
};
