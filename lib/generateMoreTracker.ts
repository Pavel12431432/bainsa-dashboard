/**
 * Per-date tracker for "generate more stories" requests.
 *
 * Holds richer state than the agentTracker factory because we surface a phase
 * and an error message to the UI. The fetch itself is owned by `runGenerateMore`
 * (a module-level function), so closing the modal mid-flight does not abort it.
 *
 * In-memory only — a page reload kills the request anyway.
 */

export type GenerateMorePhase = "marco" | "sofia";

export const GENERATE_MORE_PREFS_KEY = "bainsa-generate-more-prefs";

interface Entry {
  phase: GenerateMorePhase;
  progress: number;
  tickHandle: ReturnType<typeof setInterval> | null;
  marcoRate: number;
  sofiaRate: number;
}

const TICK_MS = 180;

function ratesForCount(count: number): { marcoRate: number; sofiaRate: number } {
  // Empirical: Marco ~60+5*count seconds, Sofia ~10+10*count seconds.
  // Exponential ease reaches ~95% of target after `T` seconds when
  // rate-per-tick ≈ 3 * (TICK_MS/1000) / T.
  const marcoSecs = 60 + count * 5;
  const sofiaSecs = 10 + count * 10;
  return {
    marcoRate: Math.max((3 * TICK_MS) / 1000 / marcoSecs, 0.004),
    sofiaRate: Math.max((3 * TICK_MS) / 1000 / sofiaSecs, 0.01),
  };
}

const entries = new Map<string, Entry>();
const errors = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

function phaseTarget(phase: GenerateMorePhase): number {
  return phase === "marco" ? 50 : 95;
}

function startTicker(date: string) {
  const entry = entries.get(date);
  if (!entry || entry.tickHandle) return;
  entry.tickHandle = setInterval(() => {
    const e = entries.get(date);
    if (!e) return;
    const target = phaseTarget(e.phase);
    // Cap just below target so the bar never stops moving while the phase
    // hasn't actually completed.
    const ceiling = target - 0.5;
    if (e.progress >= ceiling) return;
    const rate = e.phase === "marco" ? e.marcoRate : e.sofiaRate;
    const step = Math.max((target - e.progress) * rate, 0.04);
    e.progress = Math.min(e.progress + step, ceiling);
    notify();
  }, TICK_MS);
}

function stopTicker(date: string) {
  const entry = entries.get(date);
  if (entry?.tickHandle) {
    clearInterval(entry.tickHandle);
    entry.tickHandle = null;
  }
}

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getSnapshot(): number {
  return version;
}

export function isGenerateMoreRunning(date: string): boolean {
  return entries.has(date);
}

export function getGenerateMorePhase(date: string): GenerateMorePhase | null {
  return entries.get(date)?.phase ?? null;
}

export function getGenerateMoreProgress(date: string): number {
  return entries.get(date)?.progress ?? 0;
}

export function getGenerateMoreError(date: string): string | null {
  return errors.get(date) ?? null;
}

export function clearGenerateMoreError(date: string) {
  if (errors.delete(date)) notify();
}

/**
 * Kick off a generate-more request. Owns the fetch + SSE parse loop, so the
 * caller can unmount freely. On done/error, dispatches `stories-changed` so
 * the grid re-fetches.
 *
 * Idempotent: if a request is already running for this date, becomes a no-op.
 */
export async function runGenerateMore(date: string, count: number, focus: string, suggestChain: boolean): Promise<void> {
  if (entries.has(date)) return;
  const { marcoRate, sofiaRate } = ratesForCount(count);
  entries.set(date, { phase: "marco", progress: 0, tickHandle: null, marcoRate, sofiaRate });
  errors.delete(date);
  notify();
  startTicker(date);

  try {
    const res = await fetch(`/api/generate-more?date=${encodeURIComponent(date)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ count, focus, suggestChain }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let succeeded = false;
    let serverError: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE: events are separated by blank lines; each event is a set of
      // `field: value` lines. We only use `event:` and `data:`.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let eventName = "message";
        let dataLines: string[] = [];
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        const data = dataLines.join("\n");

        if (eventName === "phase") {
          const entry = entries.get(date);
          if (entry && (data === "marco" || data === "sofia")) {
            entry.phase = data;
            // Floor jump on phase change so progress doesn't go backward
            const floor = data === "sofia" ? 50 : 0;
            if (entry.progress < floor) entry.progress = floor;
            notify();
          }
        } else if (eventName === "done") {
          succeeded = true;
        } else if (eventName === "error") {
          serverError = data || "Generation failed";
        }
      }
    }

    if (serverError) throw new Error(serverError);
    if (!succeeded) throw new Error("Generation ended unexpectedly");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    stopTicker(date);
    entries.delete(date);
    errors.set(date, message);
    notify();
    return;
  }

  stopTicker(date);
  entries.delete(date);
  notify();
  if (typeof window !== "undefined") {
    // Clear the persisted focus so a future dialog open doesn't reload the
    // already-used prompt. Count is kept (it's a preference, not a one-shot).
    try {
      const raw = localStorage.getItem(GENERATE_MORE_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          parsed.focus = "";
          localStorage.setItem(GENERATE_MORE_PREFS_KEY, JSON.stringify(parsed));
        }
      }
    } catch {}
    document.dispatchEvent(new CustomEvent("stories-changed"));
  }
}
