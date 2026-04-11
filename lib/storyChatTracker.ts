/**
 * Module-level tracker for in-flight story chat requests.
 * Lives outside React so requests survive component unmounts.
 */

const loading = new Set<string>();
const listeners = new Set<() => void>();

const UPDATED_STORAGE_KEY = "sofia-updated-stories";

function key(date: string, index: number) {
  return `${date}:${index}`;
}

function notify() {
  listeners.forEach((fn) => fn());
}

// --- Loading state ---

export function markLoading(date: string, index: number) {
  loading.add(key(date, index));
  notify();
}

export function clearLoading(date: string, index: number) {
  loading.delete(key(date, index));
  notify();
}

export function isStoryChatLoading(date: string, index: number): boolean {
  return loading.has(key(date, index));
}

// --- Updated-but-unseen state (persisted to localStorage) ---

function readUpdated(): Set<string> {
  try {
    const raw = localStorage.getItem(UPDATED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeUpdated(set: Set<string>) {
  localStorage.setItem(UPDATED_STORAGE_KEY, JSON.stringify([...set]));
}

export function markUpdated(date: string, index: number) {
  const set = readUpdated();
  set.add(key(date, index));
  writeUpdated(set);
  notify();
}

export function clearUpdated(date: string, index: number) {
  const set = readUpdated();
  if (set.delete(key(date, index))) {
    writeUpdated(set);
    notify();
  }
}

export function isUpdatedUnseen(date: string, index: number): boolean {
  return readUpdated().has(key(date, index));
}

// --- Subscription ---

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
