import type { ArchitectureDiagramModel } from '../types';
import type { LayoutRunDiagnostics } from './layoutPipeline';

export type CacheEntry = {
  model: ArchitectureDiagramModel;
  diagnostics: LayoutRunDiagnostics;
};

const DEFAULT_MAX_ENTRIES = 10;

export function createMentalMapCache(maxEntries = DEFAULT_MAX_ENTRIES) {
  const store = new Map<string, CacheEntry>();

  function get(key: string): CacheEntry | undefined {
    const hit = store.get(key);
    if (!hit) return undefined;
    // Move to end for LRU ordering
    store.delete(key);
    store.set(key, hit);
    return hit;
  }

  function set(key: string, entry: CacheEntry) {
    store.delete(key);
    store.set(key, entry);
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value as string | undefined;
      if (!oldestKey) break;
      store.delete(oldestKey);
    }
  }

  function invalidateAll() {
    store.clear();
  }

  function size() {
    return store.size;
  }

  return { get, set, invalidateAll, size };
}

export type MentalMapCache = ReturnType<typeof createMentalMapCache>;
