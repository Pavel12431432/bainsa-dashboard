"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  isGenerateMoreRunning,
  getGenerateMorePhase,
  getGenerateMoreProgress,
  getGenerateMoreError,
  clearGenerateMoreError,
  runGenerateMore,
  GENERATE_MORE_PREFS_KEY,
} from "@/lib/generateMoreTracker";

interface Props {
  date: string;
  onClose: () => void;
}

const COUNTS = [1, 3, 5] as const;
const FOCUS_MAX = 300;

interface Prefs { count: number; focus: string; }

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { count: 3, focus: "" };
  try {
    const raw = localStorage.getItem(GENERATE_MORE_PREFS_KEY);
    if (!raw) return { count: 3, focus: "" };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const validCount = (COUNTS as readonly number[]).includes(parsed.count as number) ? (parsed.count as number) : 3;
    const validFocus = typeof parsed.focus === "string" ? parsed.focus.slice(0, FOCUS_MAX) : "";
    return { count: validCount, focus: validFocus };
  } catch {
    return { count: 3, focus: "" };
  }
}

export default function GenerateMoreDialog({ date, onClose }: Props) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const running = isGenerateMoreRunning(date);
  const phase = getGenerateMorePhase(date);
  const progress = getGenerateMoreProgress(date);
  const error = getGenerateMoreError(date);

  const [count, setCount] = useState<number>(() => loadPrefs().count);
  const [focus, setFocus] = useState<string>(() => loadPrefs().focus);
  const focusRef = useRef<HTMLTextAreaElement | null>(null);
  const wasRunningRef = useRef(running);

  // Auto-close on successful completion. Failures stay open so the user can
  // see the error and tweak/retry without losing their input.
  useEffect(() => {
    if (wasRunningRef.current && !running && !error) onClose();
    wasRunningRef.current = running;
  }, [running, error, onClose]);

  // Persist form prefs on change
  useEffect(() => {
    try {
      localStorage.setItem(GENERATE_MORE_PREFS_KEY, JSON.stringify({ count, focus }));
    } catch {}
  }, [count, focus]);

  useEffect(() => {
    if (running) return;
    const el = focusRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [running]);

  function submit() {
    if (running) return;
    clearGenerateMoreError(date);
    runGenerateMore(date, count, focus.trim());
  }

  const progressLabel =
    phase === "marco" ? "Marco is researching…" :
    phase === "sofia" ? "Sofia is writing…" : "";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] bg-surface border border-border-mid rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <span className="text-xs font-semibold text-brand-white tracking-[0.08em]">GENERATE MORE STORIES</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-brand-white opacity-40 hover:opacity-80 cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[0.65rem] font-semibold text-muted tracking-[0.08em]">HOW MANY</span>
            <div className="flex gap-2">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  disabled={running}
                  className={`px-5 py-1.5 rounded-md border text-xs font-semibold tracking-[0.04em] cursor-pointer transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                    count === n
                      ? "border-brand-white bg-brand-white text-brand-black"
                      : "border-border-mid bg-transparent text-brand-white hover:bg-border"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold text-muted tracking-[0.08em]">FOCUS (OPTIONAL)</span>
              <span className="text-[0.65rem] text-muted tabular-nums">{focus.length}/{FOCUS_MAX}</span>
            </div>
            <textarea
              ref={focusRef}
              value={focus}
              onChange={(e) => setFocus(e.target.value.slice(0, FOCUS_MAX))}
              disabled={running}
              rows={3}
              placeholder="e.g. focus on new model releases, or a specific company"
              className="w-full rounded-md border border-border-input bg-surface-2 text-brand-white text-sm px-3 py-2.5 resize-none placeholder:text-muted focus:outline-none focus:border-border-mid disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-[0.65rem] text-muted leading-snug">
              Marco will research first, then Sofia will write.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-danger/40 bg-danger/10">
              <span className="text-[0.7rem] text-danger leading-snug flex-1">{error}</span>
              <button
                onClick={() => clearGenerateMoreError(date)}
                className="text-danger opacity-60 hover:opacity-100 cursor-pointer text-xs leading-none shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {!running ? (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-semibold tracking-[0.06em] text-muted bg-transparent hover:text-brand-white cursor-pointer transition-colors duration-150"
            >
              CANCEL
            </button>
            <button
              onClick={submit}
              className="px-5 py-2 rounded-md border border-brand-white bg-brand-white text-brand-black text-xs font-semibold tracking-[0.06em] cursor-pointer hover:bg-brand-white/90 transition-colors duration-150"
            >
              GENERATE
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[0.7rem] font-semibold text-brand-white tracking-[0.04em]">{progressLabel}</span>
              <span className="text-[0.65rem] text-muted tabular-nums">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-brand-white transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[0.65rem] text-muted leading-snug">
              You can close this — generation will continue in the background.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
