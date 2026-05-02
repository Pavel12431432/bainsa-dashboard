"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { Story, HistoryEntry, ACCENT_COLORS } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { clearUpdated } from "@/lib/storyChatTracker";
import {
  markGenerating,
  clearGenerating,
  isGenerating,
  subscribe as subscribeVariants,
  getSnapshot as getVariantsSnapshot,
} from "@/lib/variantsTracker";
import { applyUpdates, diffFields, storyEqual, FIELD_LABELS } from "@/lib/storyUtils";
import { storyChatSessionKey } from "@/lib/chat";
import StoryCard from "./StoryCard";
import PhonePreview from "./PhonePreview";
import PreviewPanel from "./PreviewPanel";
import StoryChat from "./StoryChat";
import StoryFields from "./StoryFields";
import HistoryTimeline from "./HistoryTimeline";
import ExploreView from "./ExploreView";
import { Variant, ApplyMode } from "@/lib/variants";
import { variantToPatch } from "@/lib/storyUtils";
import type { MarcoStory } from "@/lib/marcoHandoff";

interface Props {
  story: Story;
  date: string;
  marco?: MarcoStory;
  onClose: () => void;
  onSaved: (updated: Story) => void;
}

// What Sofia proposed but hasn't been accepted/reverted yet
interface Pending {
  before: Story;
  after: Story;
  changedFields: string[];
  source: "chat" | "variant";
  variantMode?: "all" | "text" | "design";
}

function getSessionId(date: string, index: number): string {
  const key = storyChatSessionKey(date, index);
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function StoryEditor({ story, date, marco, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Story>({ ...story });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"fields" | "chat">("fields");
  const [preview, setPreviewState] = useState<"card" | "phone">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("preview-mode") as "card" | "phone") || "card";
    }
    return "card";
  });
  const setPreview = (mode: "card" | "phone") => {
    setPreviewState(mode);
    localStorage.setItem("preview-mode", mode);
  };
  const [sessionId, setSessionId] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenStory, setFullscreenStory] = useState<Story | null>(null);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"editor" | "explore">("editor");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(false);
  const [variantsError, setVariantsError] = useState("");
  useSyncExternalStore(subscribeVariants, getVariantsSnapshot, () => 0);
  const generating = isGenerating(date, story.index);

  const saved = useRef<Story>({ ...story });
  const currentBeforeViewing = useRef<Story>({ ...story });
  const originalRecorded = useRef(false);
  // Immutable snapshot of what was on disk when the editor was opened.
  // Used for the "Original" history entry — must not be saved.current, which
  // saveStory mutates before recordHistory runs.
  const originalStory = useRef<Story>({ ...story });
  const hasDirtyManualEdits = !pending && viewingIdx === null && !storyEqual(draft, saved.current);
  const isViewingHistory = viewingIdx !== null;

  const prevStoryRef = useRef<Story>(story);
  const historyUrl = `/api/stories/${date}/${story.index}/history`;

  // Detect external story changes (e.g., Sofia background auto-save updated the grid)
  useEffect(() => {
    if (storyEqual(story, prevStoryRef.current)) return;
    const before = { ...prevStoryRef.current };
    prevStoryRef.current = story;
    // If user has manual edits or is viewing history, don't overwrite
    if (viewingIdx !== null) return;
    const changedFields = diffFields(before, story);
    if (changedFields.length === 0) return;
    setPending({ before, after: story, changedFields, source: "chat" });
    setDraft({ ...story });
    saved.current = { ...story };
    // Refresh history (auto-save path already recorded it)
    fetch(historyUrl).then(r => r.json()).then(setHistory).catch(() => {});
  }, [story, viewingIdx, historyUrl]);

  useEffect(() => {
    setSessionId(getSessionId(date, story.index));
    clearUpdated(date, story.index);
  }, [date, story.index]);

  useEffect(() => {
    fetch(historyUrl)
      .then((r) => r.json())
      .then((entries: HistoryEntry[]) => {
        setHistory(entries);
        if (entries.length > 0) originalRecorded.current = true;
      })
      .catch(() => {});
  }, [historyUrl]);

  const recordHistory = useCallback(
    async (s: Story, label: string) => {
      try {
        if (!originalRecorded.current) {
          originalRecorded.current = true;
          await apiFetch(historyUrl, { story: originalStory.current, label: "Original" });
        }
        const res = await apiFetch(historyUrl, { story: s, label });
        if (res.ok) setHistory(await res.json());
      } catch {}
    },
    [historyUrl],
  );

  async function saveStory(s: Story): Promise<boolean> {
    const res = await apiFetch(`/api/stories/${date}/${s.index}/update`, s);
    if (res.ok) {
      saved.current = { ...s };
      onSaved(s);
    }
    return res.ok;
  }

  function update(field: keyof Story, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "division" && ACCENT_COLORS[value]) {
        next.accentColor = ACCENT_COLORS[value];
      }
      return next;
    });
  }

  async function applyUpdatesWithLabel(
    updates: Partial<Story>,
    labelFn: (fields: string[]) => string,
    source: "chat" | "variant" = "chat",
    variantMode?: "all" | "text" | "design",
  ) {
    const before = { ...draft };
    const after = applyUpdates(before, updates);
    const changedFields = diffFields(before, after);
    if (changedFields.length === 0) return;
    setPending({ before, after, changedFields, source, variantMode });
    setDraft(after);
    if (await saveStory(after)) {
      await recordHistory(after, labelFn(changedFields));
    }
  }

  async function handleChatUpdate(updates: Partial<Story>) {
    await applyUpdatesWithLabel(updates, (fields) =>
      `Sofia: ${fields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`,
    );
  }

  const variantsUrl = `/api/stories/${date}/${story.index}/variants`;

  useEffect(() => {
    if (mode !== "explore" || variantsLoaded) return;
    fetch(variantsUrl)
      .then((r) => r.json())
      .then((data: { variants: Variant[] }) => {
        setVariants(data.variants ?? []);
        setVariantsLoaded(true);
      })
      .catch(() => setVariantsLoaded(true));
  }, [mode, variantsLoaded, variantsUrl]);

  async function handleGenerateVariants() {
    markGenerating(date, story.index);
    setVariantsError("");
    try {
      const res = await apiFetch(variantsUrl, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setVariants(data.variants ?? []);
    } catch (err) {
      setVariantsError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      clearGenerating(date, story.index);
    }
  }

  // If generation finished while a previous editor instance was unmounted,
  // its setVariants no-op'd — refetch on true→false transition to catch up.
  const prevGeneratingRef = useRef(generating);
  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current;
    prevGeneratingRef.current = generating;
    if (wasGenerating && !generating) {
      fetch(variantsUrl)
        .then((r) => r.json())
        .then((data: { variants: Variant[] }) => setVariants(data.variants ?? []))
        .catch(() => {});
    }
  }, [generating, variantsUrl]);

  async function handleApplyVariant(variant: Variant, applyMode: ApplyMode) {
    const patch = variantToPatch(variant, applyMode);
    await applyUpdatesWithLabel(patch, () => `Variant applied (${applyMode})`, "variant", applyMode);
    try {
      const res = await apiFetch(`${variantsUrl}/${variant.id}`, {
        action: "apply",
        mode: applyMode,
      });
      const data = await res.json();
      if (res.ok && data.variants) setVariants(data.variants);
    } catch {}
  }

  async function handleDislikeVariant(variant: Variant, disliked: boolean) {
    try {
      const res = await apiFetch(`${variantsUrl}/${variant.id}`, {
        action: disliked ? "dislike" : "undislike",
      });
      const data = await res.json();
      if (res.ok && data.variants) setVariants(data.variants);
    } catch {}
  }

  async function handleRevert() {
    if (!pending) return;
    const reverted = pending.before;
    setPending(null);
    setDraft(reverted);
    if (await saveStory(reverted)) {
      await recordHistory(reverted, "Reverted Sofia edit");
    }
  }

  function handleReset() {
    const id = crypto.randomUUID();
    localStorage.setItem(storyChatSessionKey(date, story.index), id);
    setSessionId(id);
  }

  function handleViewVersion(idx: number) {
    if (viewingIdx === null) {
      currentBeforeViewing.current = { ...draft };
    }
    setViewingIdx(idx);
    setDraft({ ...history[idx].story });
  }

  async function handleRestoreVersion() {
    if (viewingIdx === null) return;
    const restored = { ...draft };
    const restoredLabel = history[viewingIdx]?.label ?? "previous version";
    setViewingIdx(null);
    if (await saveStory(restored)) {
      currentBeforeViewing.current = restored;
      await recordHistory(restored, `Restored: ${restoredLabel}`);
    }
  }

  function handleBackToCurrent() {
    setDraft({ ...currentBeforeViewing.current });
    setViewingIdx(null);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (!(await saveStory(draft))) throw new Error("Save failed");
      await recordHistory(draft, "Manual edit");
      onClose();
    } catch {
      setError("Save failed — try again.");
      setSaving(false);
    }
  }

  const tabBtn =
    "flex-1 py-2.5 text-[0.65rem] font-semibold tracking-[0.08em] bg-transparent border-none cursor-pointer";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6 max-md:p-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border-light rounded-xl flex flex-col w-full max-w-[1200px] max-h-[85vh] overflow-hidden max-md:max-w-none max-md:max-h-none max-md:h-full max-md:rounded-none max-md:border-none"
      >
        {/* Top bar with EDITOR/EXPLORE toggle */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-light shrink-0">
          <div className="flex gap-1 bg-border rounded-md p-1">
            <button
              onClick={() => setMode("editor")}
              className={`px-3 py-1.5 rounded text-[0.6rem] font-semibold tracking-[0.08em] border-none cursor-pointer transition-colors ${
                mode === "editor" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
              }`}
            >
              EDITOR
            </button>
            <button
              onClick={() => setMode("explore")}
              className={`px-3 py-1.5 rounded text-[0.6rem] font-semibold tracking-[0.08em] border-none cursor-pointer transition-colors ${
                mode === "explore" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
              }`}
            >
              EXPLORE
            </button>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-muted cursor-pointer text-xl leading-none p-0"
          >
            ✕
          </button>
        </div>

        {pending && (
          <div className="flex flex-col gap-2 px-4 py-2.5 border-b border-border-light bg-surface-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.7rem] text-brand-white opacity-70 m-0">
                {pending.source === "variant"
                  ? `Variant applied${pending.variantMode && pending.variantMode !== "all" ? ` (${pending.variantMode} only)` : ""}`
                  : `Sofia changed ${pending.changedFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`}
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleRevert}
                  className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-2.5 py-1 cursor-pointer hover:text-danger hover:border-danger/30"
                >
                  REVERT
                </button>
                <button
                  onClick={() => setPending(null)}
                  className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-2.5 py-1 cursor-pointer hover:text-brand-white"
                >
                  DISMISS
                </button>
              </div>
            </div>
            {pending.source === "chat" && (
              <div className="flex flex-col gap-1">
                {pending.changedFields.map((f) => {
                  const old = (pending.before as unknown as Record<string, string>)[f] ?? "";
                  const now = (pending.after as unknown as Record<string, string>)[f] ?? "";
                  return (
                    <div key={f} className="text-[0.65rem] leading-relaxed">
                      <span className="text-muted font-semibold uppercase tracking-[0.04em]">{FIELD_LABELS[f] ?? f}: </span>
                      <span className="text-danger/70 line-through">{old}</span>
                      <span className="text-muted mx-1">→</span>
                      <span className="text-success/90">{now}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {mode === "explore" ? (
          <ExploreView
            baseStory={draft}
            variants={variants}
            generating={generating}
            error={variantsError}
            onGenerate={handleGenerateVariants}
            onApply={handleApplyVariant}
            onDislike={handleDislikeVariant}
            preview={preview}
            onPreviewChange={setPreview}
            onFullscreen={(s: Story) => {
              setFullscreenStory(storyEqual(s, draft) ? null : s);
              setFullscreen(true);
            }}
          />
        ) : (
        <div className="flex flex-1 overflow-hidden max-md:flex-col">
        <PreviewPanel
          story={draft}
          preview={preview}
          onPreviewChange={setPreview}
          onFullscreen={() => { setFullscreenStory(null); setFullscreen(true); }}
        />

        {/* Mobile tab bar */}
        <div className="hidden max-md:flex items-center border-b border-border-light shrink-0">
          <button
            onClick={() => setTab("fields")}
            className={`${tabBtn} ${tab === "fields" ? "text-brand-white border-b-2 border-brand-white" : "text-muted"}`}
          >
            FIELDS
          </button>
          <button
            onClick={() => setTab("chat")}
            className={`${tabBtn} ${tab === "chat" ? "text-brand-white border-b-2 border-brand-white" : "text-muted"}`}
          >
            SOFIA
          </button>
        </div>

        {/* Form */}
        <div
          className={`flex-1 p-8 overflow-y-auto flex flex-col gap-5 min-w-0 max-md:p-5 ${tab === "chat" ? "max-md:hidden" : ""}`}
        >
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-semibold text-brand-white m-0 tracking-[0.06em]">
              EDIT STORY {draft.index}
            </h2>
            {history.length > 0 && !isViewingHistory && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-[0.65rem] font-semibold text-muted tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-brand-white"
              >
                {showHistory ? "HIDE HISTORY" : `HISTORY (${history.length})`}
              </button>
            )}
          </div>

          {(showHistory || isViewingHistory) && (
            <HistoryTimeline
              entries={history}
              viewingIdx={viewingIdx}
              onSelect={handleViewVersion}
              onRestore={handleRestoreVersion}
              onBack={handleBackToCurrent}
            />
          )}

          <StoryFields draft={draft} onUpdate={update} disabled={isViewingHistory} />

          {marco && (marco.reason || marco.url) && (
            <div className="border-t border-border-light pt-3 flex flex-col gap-1">
              <span className="text-[0.55rem] font-semibold tracking-[0.08em] text-muted">MARCO&rsquo;S ANGLE</span>
              {marco.reason && (
                <p className="text-[0.7rem] text-brand-white/55 leading-snug m-0">{marco.reason}</p>
              )}
              {marco.url && (
                <a
                  href={marco.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.65rem] text-muted hover:text-brand-white transition-colors break-all inline-flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 4h6v6" />
                    <path d="M20 4l-9 9" />
                    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                  </svg>
                  {marco.sourceLabel || marco.url}
                </a>
              )}
            </div>
          )}

          {error && <p className="text-accent-analysis text-[0.8rem] m-0">{error}</p>}

          <div className="flex gap-2.5 mt-auto pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[5px] border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.06em] cursor-pointer"
            >
              CLOSE
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasDirtyManualEdits}
              className={`flex-[2] py-2.5 rounded-[5px] border-none text-xs font-semibold tracking-[0.06em] ${
                saving || !hasDirtyManualEdits
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-brand-white text-brand-black cursor-pointer"
              }`}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>

        {/* Chat panel */}
        {sessionId && (
          <div
            className={`w-[340px] border-l border-border-light flex flex-col max-md:w-full max-md:flex-1 max-md:border-l-0 max-md:border-t max-md:border-border-light ${tab === "fields" ? "max-md:hidden" : ""}`}
          >
            <StoryChat
              story={draft}
              date={date}
              sessionId={sessionId}
              onUpdate={handleChatUpdate}
              onReset={handleReset}
              disabled={isViewingHistory}
            />
          </div>
        )}
        </div>
        )}
      </div>

      {/* Fullscreen preview overlay */}
      {fullscreen && (
        <div
          onClick={(e) => { e.stopPropagation(); setFullscreen(false); setFullscreenStory(null); }}
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer"
        >
          <div onClick={(e) => e.stopPropagation()} className="cursor-default">
            {preview === "card" ? (
              <StoryCard story={fullscreenStory ?? draft} scale={1} />
            ) : (
              <PhonePreview story={fullscreenStory ?? draft} scale={0.85} />
            )}
          </div>
          <button
            onClick={() => { setFullscreen(false); setFullscreenStory(null); }}
            className="absolute top-6 right-6 bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors duration-150"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="20" y2="20" />
              <line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
