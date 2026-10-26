import type { StateStorage } from 'zustand/middleware';
import { localStorageAdapter } from '../services/persistence/localStorageAdapter';
import type { PersistenceAdapter } from '../services/persistence/persistenceAdapter';

/**
 * Bridges Zustand's persist middleware to our swappable PersistenceAdapter.
 * Replace the adapter here (or via setPersistenceAdapter) to move persistence
 * to a backend later without touching any store.
 */
let adapter: PersistenceAdapter = localStorageAdapter;

export function setPersistenceAdapter(next: PersistenceAdapter): void {
  adapter = next;
}

export const persistStateStorage: StateStorage = {
  getItem: (name) => adapter.load<string>(name) ?? null,
  setItem: (name, value) => adapter.save(name, value),
  removeItem: (name) => adapter.remove(name),
};
