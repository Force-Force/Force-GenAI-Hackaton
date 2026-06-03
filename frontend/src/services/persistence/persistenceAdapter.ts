/**
 * Storage-agnostic persistence contract. The workspace persists through this
 * interface so the localStorage implementation can later be swapped for a
 * backend-backed adapter (FastAPI) without touching store logic.
 */
export interface PersistenceAdapter {
  load<T>(key: string): T | null;
  save<T>(key: string, value: T): void;
  remove(key: string): void;
}

export const WORKSPACE_STORAGE_KEY = 'aura-bi.workspace.v1';
