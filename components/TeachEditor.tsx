"use client";

import { useState, useRef, useMemo } from "react";
import { apiFetch } from "@/lib/fetch";
import { diffLines } from "@/lib/diff";
import HistoryTimeline from "./HistoryTimeline";

interface HistoryEntry {
  content: string;
  label: string;
  timestamp: string;
}

interface Props {
  fixed: string;
  adaptive: string;
  initialHistory: HistoryEntry[];
}

export default function TeachEditor({ fixed, adaptive, initialHistory }: Props) {
  const [content, setContent] = useState(adaptive);
  const [savedContent, setSavedContent] = useState(adaptive);
  const [saving, setSaving] = useState(false);
  const [fixedCollapsed, setFixedCollapsed] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = content !== savedContent;

  async function save(text?: string) {
    const toSave = text ?? content;
    setSaving(true);
    try {
      const res = await apiFetch("/api/teach/save", { content: toSave });
      if (res.ok) {
        setSavedContent(toSave);
        // Refresh history
        const histRes = await fetch("/api/teach/history");
        if (histRes.ok) setHistory(await histRes.json());
      }
    } finally {
      setSaving(false);
    }
  }

  // Diff between history entry (old) and current saved content (new)
  const diff = useMemo(() => {
    if (viewingIdx === null) return null;
    return diffLines(history[viewingIdx].content, savedContent);
  }, [viewingIdx, history, savedContent]);

  function viewVersion(idx: number) {
    setViewingIdx(idx);
  }

  function backToCurrent() {
    setViewingIdx(null);
  }

  async function restoreVersion() {
    if (viewingIdx === null) return;
    const restored = history[viewingIdx].content;
    setViewingIdx(null);
    setContent(restored);
    await save(restored);
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-100px)]">
      {/* Page title */}
      <div className="shrink-0">
        <h1 className="text-xl font-semibold text-brand-white m-0">Teach Sofia</h1>
        <p className="text-[0.8rem] text-brand-white opacity-35 mt-1">
          Edit Sofia&apos;s adaptive instructions — style, tone, and copy guidelines
        </p>
      </div>

      <div className="flex gap-0 flex-1 min-h-0 max-lg:flex-col max-lg:gap-6">
        {/* Left column — FIXED.md (read-only) */}
        <div className={`shrink-0 flex flex-col transition-all duration-200 max-lg:w-full ${fixedCollapsed ? "w-10" : "w-[420px]"}`}>
          {/* Header row */}
          <div className={`flex items-center h-[34px] mb-3 shrink-0 ${fixedCollapsed ? "justify-center" : "gap-2"}`}>
            <button
              onClick={() => setFixedCollapsed(!fixedCollapsed)}
              className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 shrink-0"
              title={fixedCollapsed ? "Show fixed instructions" : "Hide fixed instructions"}
            >
              {fixedCollapsed ? (
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="text-muted">
                  <path d="M1 9l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <>
                  <span className="text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
                    Fixed Instructions
                  </span>
                  <span className="text-[0.5rem] text-muted">(read-only)</span>
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="text-muted">
                    <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
          {!fixedCollapsed && (
            <pre className="text-[0.7rem] leading-relaxed text-brand-white/60 font-mono whitespace-pre-wrap break-words bg-surface border border-border rounded-lg p-4 overflow-y-auto m-0 mr-6 flex-1 min-h-0">
              {fixed}
            </pre>
          )}
          {fixedCollapsed && (
            <div className="flex-1 flex items-start justify-center pt-4">
              <button
                onClick={() => setFixedCollapsed(false)}
                className="bg-transparent border-none cursor-pointer p-0"
                title="Show fixed instructions"
              >
                <span className="text-[0.6rem] font-semibold text-muted tracking-[0.08em] uppercase [writing-mode:vertical-lr] rotate-180">
                  Fixed
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Right column — ADAPTIVE.md (editable) */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Header row */}
          <div className="flex items-center justify-between h-[34px] mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
                Adaptive Instructions
              </span>
              {viewingIdx !== null && (
                <span className="text-[0.55rem] font-semibold text-accent-culture/70 tracking-[0.04em]">
                  viewing history
                </span>
              )}
              {viewingIdx === null && isDirty && (
                <span className="text-[0.55rem] font-semibold text-amber-400/70 tracking-[0.04em]">
                  unsaved changes
                </span>
              )}
            </div>
            <button
              onClick={() => save()}
              disabled={!isDirty || saving || viewingIdx !== null}
              className={`px-4 py-1.5 rounded-[5px] text-[0.65rem] font-semibold tracking-[0.04em] border-none transition-all duration-150 ${
                !isDirty || saving || viewingIdx !== null
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-brand-white text-brand-black cursor-pointer"
              }`}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>

          {/* Editor or diff view */}
          {viewingIdx !== null && diff ? (
            <div className="w-full flex-1 min-h-0 rounded-lg border border-border-mid bg-surface text-[0.7rem] leading-relaxed font-mono p-4 overflow-y-auto">
              {diff.map((d, i) => {
                if (d.type === "same") {
                  return (
                    <div key={i} className="text-brand-white/40 whitespace-pre-wrap min-h-[1.4em]">
                      {d.line || "\u00A0"}
                    </div>
                  );
                }
                if (d.type === "removed") {
                  return (
                    <div key={i} className="text-danger/70 line-through whitespace-pre-wrap bg-danger/5 -mx-4 px-4 min-h-[1.4em]">
                      {d.line || "\u00A0"}
                    </div>
                  );
                }
                return (
                  <div key={i} className="text-success/90 whitespace-pre-wrap bg-success/5 -mx-4 px-4 min-h-[1.4em]">
                    {d.line || "\u00A0"}
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="w-full flex-1 min-h-0 rounded-lg border border-border-mid bg-surface text-[0.7rem] leading-relaxed text-brand-white/85 font-mono p-4 resize-none focus:outline-none focus:border-border-mid placeholder:text-muted"
              onKeyDown={(e) => {
                if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (isDirty) save();
                }
              }}
            />
          )}

          {/* Version history */}
          <div className="mt-3 shrink-0">
            <HistoryTimeline
              entries={history}
              viewingIdx={viewingIdx}
              onSelect={viewVersion}
              onRestore={restoreVersion}
              onBack={backToCurrent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
