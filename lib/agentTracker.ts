/**
 * Factory for module-level trackers of in-flight agent work.
 *
 * Each tracker holds two kinds of per-key state:
 *   - "loading": ephemeral, in-memory. Survives React unmounts (but not page reloads).
 *   - "changed": optional "finished while you weren't looking" flag, optionally
 *     persisted to localStorage so it survives reloads too.
 *
 * Consumers subscribe via useSyncExternalStore(subscribe, getSnapshot).
 */

export interface AgentTracker {
  markLoading(key: string): void;
  clearLoading(key: string): void;
  isLoading(key: string): boolean;
  markChanged(key: string): void;
  clearChanged(key: string): void;
  isChanged(key: string): boolean;
  subscribe(fn: () => void): () => void;
  getSnapshot(): number;
}

interface Options {
  /** If set, `changed` flags persist to localStorage under this key. */
  storageKey?: string;
}

export function createAgentTracker(options: Options = {}): AgentTracker {
  const { storageKey } = options;
  const loading = new Set<string>();
  const changed = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;

  // Hydrate changed set from localStorage once at boot
  if (storageKey && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) for (const k of JSON.parse(raw) as string[]) changed.add(k);
    } catch {}
  }

  function persist() {
    if (!storageKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...changed]));
    } catch {}
  }

  function notify() {
    version++;
    listeners.forEach((fn) => fn());
  }

  return {
    markLoading(key) { loading.add(key); notify(); },
    clearLoading(key) { loading.delete(key); notify(); },
    isLoading(key) { return loading.has(key); },
    markChanged(key) { changed.add(key); persist(); notify(); },
    clearChanged(key) {
      if (changed.delete(key)) { persist(); notify(); }
    },
    isChanged(key) { return changed.has(key); },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    getSnapshot() { return version; },
  };
}
