"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { Story, ApprovalState, PostedMap } from "@/types";
import type { MarcoStoryMap } from "@/lib/marcoHandoff";
import { apiFetch } from "@/lib/fetch";
import { checkCompliance } from "@/lib/compliance";
import { diffFields } from "@/lib/storyUtils";
import { isStoryChatLoading, isUpdatedUnseen, clearUpdated, subscribe as subscribeChatTracker, getSnapshot as getChatTrackerSnapshot } from "@/lib/storyChatTracker";
import { markRegenerating, clearRegenerating, isRegenerating, markRegenerated, clearRegenerated, isRegenerated, subscribe as subscribeRegen, getSnapshot as getRegenSnapshot } from "@/lib/regenerateTracker";
import { isGenerating as isVariantsGenerating, isReady as isVariantsReady, clearReady as clearVariantsReady, subscribe as subscribeVariants, getSnapshot as getVariantsSnapshot } from "@/lib/variantsTracker";
import {
  subscribe as subscribeGenerateMore,
  getSnapshot as getGenerateMoreSnapshot,
  isGenerateMoreRunning,
  getGenerateMorePhase,
  getGenerateMoreError,
} from "@/lib/generateMoreTracker";
import StoryCard from "./StoryCard";
import ComplianceBadge from "./ComplianceBadge";
import StoryEditor from "./StoryEditor";
import ExportDialog from "./ExportDialog";
import GenerateMoreDialog from "./GenerateMoreDialog";
import ChainStack, { type ChainDot, type ChainDotState } from "./ChainStack";
import ChainFullscreen from "./ChainFullscreen";
import { todayRome } from "@/lib/date";

// A render group is either a single story or a contiguous run of same-chain stories.
type RenderGroup =
  | { kind: "single"; story: Story }
  | { kind: "chain"; chain: string; stories: Story[] };


interface Props {
  date: string;
  initialStories: Story[];
  initialApprovals: ApprovalState;
  initialPosted?: PostedMap;
  initialMarco?: MarcoStoryMap;
  initialStale?: number[];
  highlightIndex?: number;
}

const actionBtn = "flex-1 py-[7px] rounded-[5px] text-xs font-semibold tracking-[0.04em] cursor-pointer";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

type Division = "All" | "Projects" | "Analysis" | "Culture";
const DIVISIONS: Division[] = ["All", "Projects", "Culture", "Analysis"];
const DIVISION_COLORS: Record<Division, string> = {
  All: "",
  Projects: "#2c40e8",
  Culture: "#fe43a7",
  Analysis: "#fe6203",
};

export default function StoryGrid({ date, initialStories, initialApprovals, initialPosted = {}, initialMarco = {}, initialStale = [], highlightIndex }: Props) {
  const [stories, setStories] = useState<Story[]>(initialStories);
  const storiesRef = useRef(stories);
  storiesRef.current = stories;
  const [divisionFilter, setDivisionFilter] = useState<Division>("All");
  const highlightDone = useRef(false);

  useEffect(() => {
    if (highlightIndex == null || highlightDone.current) return;
    highlightDone.current = true;
    // Small delay to let the page render
    setTimeout(() => {
      const el = document.getElementById(`story-${highlightIndex}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-pulse");
      setTimeout(() => el.classList.remove("highlight-pulse"), 2000);
    }, 300);
  }, [highlightIndex]);
  const [approvals, setApprovals] = useState<ApprovalState>(initialApprovals);
  const [posted, setPosted] = useState<PostedMap>(initialPosted);
  const [marco, setMarco] = useState<MarcoStoryMap>(initialMarco);
  const [approvalStale, setApprovalStale] = useState<number[]>(initialStale);
  const [editing, setEditing] = useState<Story | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showGenerateMore, setShowGenerateMore] = useState(false);
  const [fullscreenChain, setFullscreenChain] = useState<
    | { chain: string; stories: Story[]; initialIndex: number }
    | null
  >(null);
  const isToday = date === todayRome();
  const [toast, setToastState] = useState<{ message: string; kind: "success" | "neutral" | "danger" } | null>(null);
  const setToast = useCallback((message: string, kind: "success" | "neutral" | "danger" = "success") => {
    setToastState(message ? { message, kind } : null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToastState(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  const [stale, setStale] = useState<string | null>(null); // Marco's lastRun if stale
  useSyncExternalStore(subscribeRegen, getRegenSnapshot);
  const regenerating = isRegenerating(date);
  const [rejectingIndex, setRejectingIndex] = useState<number | null>(null);
  const feedbackRef = useRef<HTMLTextAreaElement | null>(null);
  const setFeedbackRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el && el.offsetParent !== null) feedbackRef.current = el;
  }, []);

  // Re-render when story chat loading/updated state changes
  useSyncExternalStore(subscribeChatTracker, getChatTrackerSnapshot);
  // Re-render when variant generation state changes
  useSyncExternalStore(subscribeVariants, getVariantsSnapshot);
  // Re-render when generate-more state changes
  useSyncExternalStore(subscribeGenerateMore, getGenerateMoreSnapshot);

  const generateMoreRunning = isGenerateMoreRunning(date);
  const generateMorePhase = getGenerateMorePhase(date);
  const generateMoreError = getGenerateMoreError(date);
  const wasRunningRef = useRef(generateMoreRunning);

  // Toast on successful generate-more completion (modal auto-closes on success,
  // so this fires whether the user was watching the dialog or not).
  useEffect(() => {
    if (wasRunningRef.current && !generateMoreRunning && !generateMoreError) {
      setToast("New stories added");
    }
    wasRunningRef.current = generateMoreRunning;
  }, [generateMoreRunning, generateMoreError]);

  // Check if stories are stale (Marco updated after Sofia)
  const checkStale = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-status?date=${date}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.marco?.lastRun && data.sofia?.lastRun) {
        if (new Date(data.marco.lastRun) > new Date(data.sofia.lastRun)) {
          setStale(data.marco.lastRun);
        } else {
          setStale(null);
        }
      } else if (data.marco?.lastRun && !data.sofia?.ranToday) {
        setStale(data.marco.lastRun);
      }
    } catch {}
  }, [date]);

  useEffect(() => { checkStale(); }, [checkStale]);

  async function regenerate() {
    const d = date;
    markRegenerating(d);
    try {
      const sessionId = `regen-${Date.now()}`;
      await apiFetch("/api/agent-chat", {
        agent: "sofia",
        message: `Marco updated handoffs/${date}.md. Reconcile stories/${date}.md with it: read both files, match each existing story to a Marco item, keep stories whose source is unchanged EXACTLY as-is, add new stories only for Marco items that have no matching story yet, and update only stories whose source material actually changed. Do not rewrite stories that don't need to change. Do not ask for confirmation.`,
        sessionId,
        newSession: true,
        mode: "regenerate",
      });
      markRegenerated(d);
      document.dispatchEvent(new CustomEvent("stories-changed"));
    } catch {} finally {
      clearRegenerating(d);
    }
  }

  // Re-fetch stories when Sofia edits files via agent chat
  const refreshStories = useCallback(async () => {
    // Small delay to let Sofia's file writes flush
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`/api/stories/${date}`);
      if (!res.ok) return;
      const data = await res.json();
      const fresh: Story[] = data.stories;
      if (!fresh.length) return;

      // Diff and record history for changed stories
      const prev = storiesRef.current;
      for (const newStory of fresh) {
        const old = prev.find((s) => s.index === newStory.index);
        if (!old) continue;
        const changed = diffFields(old, newStory);
        if (changed.length === 0) continue;

        // Record original if no history exists yet
        const histUrl = `/api/stories/${date}/${newStory.index}/history`;
        const histRes = await fetch(histUrl);
        if (histRes.ok) {
          const entries = await histRes.json();
          if (entries.length === 0) {
            await apiFetch(histUrl, { story: old, label: "Original" });
          }
        }
        // Record the Sofia chat edit
        const label = `Sofia (chat): ${changed.join(", ")}`;
        await apiFetch(histUrl, { story: newStory, label });
      }

      setStories(fresh);
      // If the editor is open, update its story so it sees background changes
      setEditing((prev) => {
        if (!prev) return null;
        return fresh.find((s) => s.index === prev.index) ?? prev;
      });
      if (data.approvals) setApprovals(data.approvals);
      if (data.posted) setPosted(data.posted);
      if (data.marco) setMarco(data.marco);
      if (Array.isArray(data.stale)) setApprovalStale(data.stale);
    } catch {}
  }, [date]);

  const refreshPosted = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${date}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.posted) setPosted(data.posted);
    } catch {}
  }, [date]);

  // After regen completes, the file on disk is newer than the cached RSC payload.
  // If the grid mounts (or is still mounted) while the flag is set, pull fresh from the API.
  useEffect(() => {
    if (isRegenerated(date)) {
      refreshStories();
      checkStale();
      clearRegenerated(date);
    }
  }, [date, refreshStories, checkStale]);

  useEffect(() => {
    const handler = () => { refreshStories(); checkStale(); };
    document.addEventListener("stories-changed", handler);
    return () => document.removeEventListener("stories-changed", handler);
  }, [refreshStories, checkStale]);

  async function handleApprove(index: number, action: "approve" | "reject" | "clear", feedback?: string) {
    const res = await apiFetch(`/api/stories/${date}/${index}/approve`, { action, feedback });
    if (res.ok) {
      const data = await res.json();
      setApprovals(data.approvals);
      // Any approve/reject/clear action resolves staleness for this index.
      setApprovalStale((prev) => prev.filter((i) => i !== index));
    }
  }

  function startReject(index: number) {
    setRejectingIndex(index);
    // Focus textarea after render
    setTimeout(() => feedbackRef.current?.focus(), 50);
  }

  function submitReject(index: number) {
    const text = feedbackRef.current?.value.trim();
    handleApprove(index, "reject", text || undefined);
    setRejectingIndex(null);
  }

  function skipReject(index: number) {
    handleApprove(index, "reject");
    setRejectingIndex(null);
  }

  function handleSaved(updated: Story) {
    setStories((prev) => prev.map((s) => s.index === updated.index ? updated : s));
    // Server reconciles on next fetch; a no-op edit briefly mis-flags as stale.
    if (approvals.approved.includes(updated.index)) {
      setApprovalStale((prev) => prev.includes(updated.index) ? prev : [...prev, updated.index]);
    }
  }

  const generateMoreTile = generateMoreRunning ? (
    <button
      type="button"
      onClick={() => setShowGenerateMore(true)}
      className="aspect-[9/16] w-full rounded-2xl border-2 border-dashed border-border-mid bg-transparent flex flex-col items-center justify-center gap-5 px-6 text-brand-white cursor-pointer"
    >
      <svg className="animate-spin h-10 w-10 text-brand-white opacity-70" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-sm font-semibold tracking-[0.06em]">
          {generateMorePhase === "marco" ? "MARCO RESEARCHING" : "SOFIA WRITING"}
        </span>
        <span className="text-[0.7rem] tracking-wide opacity-60 text-center leading-snug">Click to view progress</span>
      </div>
    </button>
  ) : generateMoreError ? (
    <button
      type="button"
      onClick={() => setShowGenerateMore(true)}
      className="group/add aspect-[9/16] w-full rounded-2xl border-2 border-dashed border-danger/40 bg-danger/5 flex flex-col items-center justify-center gap-5 px-6 text-danger hover:bg-danger/10 transition-colors duration-150 cursor-pointer"
    >
      <span className="text-6xl font-extralight leading-none">!</span>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-sm font-semibold tracking-[0.06em]">GENERATION FAILED</span>
        <span className="text-[0.7rem] tracking-wide opacity-70 text-center leading-snug">Click to retry</span>
      </div>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setShowGenerateMore(true)}
      className="group/add aspect-[9/16] w-full rounded-2xl border-2 border-dashed border-border-mid bg-transparent flex flex-col items-center justify-center gap-5 px-6 text-muted hover:border-brand-white hover:text-brand-white transition-colors duration-150 cursor-pointer"
    >
      <span className="text-6xl font-extralight leading-none">+</span>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-sm font-semibold tracking-[0.06em]">GENERATE MORE</span>
        <span className="text-[0.7rem] tracking-wide opacity-70 text-center leading-snug">Ask Sofia for another batch of stories</span>
      </div>
    </button>
  );

  if (stories.length === 0) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-brand-white m-0">Stories</h1>
          <p className="text-[0.8rem] text-brand-white opacity-35 mt-1">0 stories</p>
        </div>
        {stale ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/25 bg-amber-500/5">
            <span className="text-xs text-amber-400">
              Marco has research ready — generate stories from his handoff
            </span>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="ml-auto px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 cursor-pointer hover:bg-amber-500/25 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {regenerating && <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 inline" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              {regenerating ? "Generating" : "Generate"}
            </button>
          </div>
        ) : isToday ? (
          <div className="mt-4 max-w-[300px]">
            {generateMoreTile}
          </div>
        ) : date > todayRome() ? (
          <div className="text-left text-brand-white opacity-40 py-12">
            No stories yet — Sofia hasn't figured out how to predict the future.
          </div>
        ) : (
          <div className="text-left text-brand-white opacity-40 py-12">
            No stories for this date — Sofia must&apos;ve taken the day off.
          </div>
        )}
        {showGenerateMore && <GenerateMoreDialog date={date} onClose={() => setShowGenerateMore(false)} />}
      </>
    );
  }

  const approvedStories = stories.filter((s) => approvals.approved.includes(s.index));
  const visibleStories = divisionFilter === "All"
    ? stories
    : stories.filter((s) => s.division === divisionFilter);

  // Count stories per division for the filter pills
  const divisionCounts: Record<Division, number> = {
    All: stories.length,
    Projects: stories.filter((s) => s.division === "Projects").length,
    Culture: stories.filter((s) => s.division === "Culture").length,
    Analysis: stories.filter((s) => s.division === "Analysis").length,
  };

  return (
    <>
      {editing && (
        <StoryEditor
          story={editing}
          date={date}
          marco={marco[editing.index]}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="mb-8 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-white m-0">Stories</h1>
          <p className="text-[0.8rem] text-brand-white opacity-35 mt-1">
            {stories.length} {stories.length === 1 ? "story" : "stories"} ·{" "}
            {approvals.approved.length} approved · {approvals.rejected.length} rejected
          </p>
        </div>

        {/* Division filter */}
        {stories.length > 0 && (
          <div className="flex gap-1.5">
            {DIVISIONS.map((d) => {
              const active = divisionFilter === d;
              const count = divisionCounts[d];
              if (d !== "All" && count === 0) return null;
              const color = DIVISION_COLORS[d];
              return (
                <button
                  key={d}
                  onClick={() => setDivisionFilter(active ? "All" : d)}
                  className="px-3 py-1.5 rounded-full text-[0.65rem] font-semibold tracking-[0.04em] border cursor-pointer transition-all duration-150"
                  style={{
                    background: active && color ? `${color}15` : "transparent",
                    borderColor: active && color ? `${color}40` : active ? "var(--color-border-mid)" : "var(--color-border)",
                    color: active && color ? color : active ? "var(--brand-white)" : "var(--color-muted)",
                  }}
                >
                  {d === "All" ? "All" : d}
                  {d !== "All" && (
                    <span className="ml-1.5 opacity-50">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {stale && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/25 bg-amber-500/5">
          <span className="text-xs text-amber-400">
            Marco updated research at {formatTime(stale)} — stories may be outdated
          </span>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="ml-auto px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400 cursor-pointer hover:bg-amber-500/25 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {regenerating && <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 inline" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {regenerating ? "Regenerating" : "Regenerate"}
          </button>
        </div>
      )}

      {(() => {
        // Group consecutive same-chain stories together; standalones stay isolated.
        const groups: RenderGroup[] = [];
        for (const story of visibleStories) {
          if (story.chain) {
            const last = groups[groups.length - 1];
            if (last && last.kind === "chain" && last.chain === story.chain) {
              last.stories.push(story);
              continue;
            }
            groups.push({ kind: "chain", chain: story.chain, stories: [story] });
          } else {
            groups.push({ kind: "single", story });
          }
        }

        const deriveDotState = (story: Story): ChainDot => {
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);
          const isStale = approved && approvalStale.includes(story.index);
          const compliance = checkCompliance(story);
          let state: ChainDotState;
          if (rejected) state = "rejected";
          else if (isStale) state = "stale";
          else if (approved) state = "approved";
          else state = "pending";
          return { state, complianceFail: !compliance.pass };
        };

        // Per-card visual: StoryCard + glows/pills/source link/desktop action bar.
        // Used by both standalone and ChainStack render paths. All overlays
        // (glows, pills, action bar) gate on `isTop` so back-cards in a chain
        // stack stay clean; isTop defaults to true for standalones.
        const cardVisual = (
          story: Story,
          opts?: { isTop?: boolean; chainPosition?: number; chainTotal?: number },
        ) => {
          const isTop = opts?.isTop ?? true;
          const compliance = checkCompliance(story);
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);
          const isStale = approved && approvalStale.includes(story.index);
          const approveActive = approved && !isStale;
          const approveLabel = approveActive ? "✓" : isStale ? "RE-APPROVE" : "APPROVE";
          const approveAction: "approve" | "clear" = approveActive ? "clear" : "approve";
          const chatThinking = isStoryChatLoading(date, story.index);
          const variantsGenerating = isVariantsGenerating(date, story.index);
          const variantsReady = !variantsGenerating && isVariantsReady(date, story.index);
          const chatUpdated = !chatThinking && isUpdatedUnseen(date, story.index);
          const marcoEntry = marco[story.index];

          return (
            <>
              <StoryCard
                story={story}
                chainPosition={opts?.chainPosition}
                chainTotal={opts?.chainTotal}
              />

              {isTop && (
                <>
                  {approved && !isStale && (
                    <div className="absolute inset-0 rounded-2xl border border-success/30 pointer-events-none" style={{ boxShadow: "0 0 16px rgba(34,197,94,0.4), 0 0 40px rgba(34,197,94,0.15)" }} />
                  )}
                  {isStale && (
                    <div className="absolute inset-0 rounded-2xl border border-amber-500/40 pointer-events-none" style={{ boxShadow: "0 0 16px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)" }} />
                  )}
                  {(rejected || rejectingIndex === story.index) && (
                    <div className="absolute inset-0 rounded-2xl border border-danger/25 bg-black/45 pointer-events-none" style={{ boxShadow: "0 0 16px rgba(239,68,68,0.35), 0 0 40px rgba(239,68,68,0.12)" }} />
                  )}
                  {chatThinking && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 backdrop-blur-sm z-10">
                      <svg className="animate-spin h-3 w-3 text-brand-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[0.6rem] font-semibold text-brand-white opacity-70">Sofia</span>
                    </div>
                  )}
                  {variantsGenerating && !chatThinking && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 backdrop-blur-sm z-10">
                      <svg className="animate-spin h-3 w-3 text-brand-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[0.6rem] font-semibold text-brand-white opacity-70">Variants</span>
                    </div>
                  )}
                  {chatUpdated && (
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 backdrop-blur-sm z-10 animate-[fadeOut_0.5s_ease_3s_forwards]"
                      onAnimationEnd={() => clearUpdated(date, story.index)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
                      <span className="text-[0.6rem] font-semibold text-brand-white opacity-70">Sofia responded</span>
                    </div>
                  )}
                  {variantsReady && !chatThinking && !chatUpdated && (
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 backdrop-blur-sm z-10 animate-[fadeOut_0.5s_ease_3s_forwards]"
                      onAnimationEnd={() => clearVariantsReady(date, story.index)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
                      <span className="text-[0.6rem] font-semibold text-brand-white opacity-70">Variants ready</span>
                    </div>
                  )}
                  {isStale && !chatThinking && !variantsGenerating && !chatUpdated && !variantsReady && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 backdrop-blur-sm z-10">
                      <span className="text-[0.6rem] font-semibold tracking-[0.06em] text-amber-400">EDITED</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(story.index, "clear"); }}
                        title="Clear approval"
                        className="ml-1 w-4 h-4 flex items-center justify-center rounded-sm bg-transparent border-none text-amber-400 opacity-70 hover:opacity-100 hover:bg-amber-500/20 cursor-pointer text-[0.7rem] leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {!compliance.pass && (
                    <div className="absolute bottom-2 left-2 right-2 group-hover/card:opacity-0 transition-opacity duration-150">
                      <ComplianceBadge result={compliance} />
                    </div>
                  )}

                  {/* Source link chip — top-right, hover-revealed (desktop only) */}
                  {marcoEntry?.url && (
                    <a
                      href={marcoEntry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/src hidden sm:flex absolute top-3 right-3 z-20 items-center justify-center w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm border border-border-mid text-brand-white opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 hover:bg-black/90 hover:border-border-light"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 4h6v6" />
                        <path d="M20 4l-9 9" />
                        <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                      </svg>
                      <span className="absolute top-full right-0 mt-1.5 px-2 py-1 rounded bg-border border border-border-mid text-[0.6rem] text-brand-white font-normal tracking-normal whitespace-nowrap opacity-0 group-hover/src:opacity-100 transition-opacity pointer-events-none z-50">
                        {marcoEntry.sourceLabel || "View source"}
                      </span>
                    </a>
                  )}

                  {/* Action buttons — overlay bottom of card on hover (desktop only).
                      Buttons stopPropagation so they don't trigger ChainStack's
                      edge/middle handlers when this card is the top of a chain. */}
                  <div
                    data-stack-no-cycle
                    className={`hidden sm:flex absolute bottom-0 left-0 right-0 rounded-b-2xl px-5 pb-5 pt-16 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-150 gap-2 z-30 ${
                      rejectingIndex === story.index ? "opacity-100 flex-col" : "opacity-0 group-hover/card:opacity-100"
                    }`}
                  >
                    {rejectingIndex === story.index ? (
                      <>
                        <textarea
                          ref={setFeedbackRef}
                          rows={2}
                          placeholder="What's wrong with this story?"
                          className="w-full rounded-[5px] border border-border-mid bg-brand-black/80 text-brand-white text-xs px-3 py-2 resize-none placeholder:text-muted backdrop-blur-sm focus:outline-none focus:border-danger/50"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReject(story.index); }
                            if (e.key === "Escape") setRejectingIndex(null);
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); skipReject(story.index); }}
                            className={`${actionBtn} border border-border-mid bg-brand-black/80 text-muted backdrop-blur-sm`}
                          >
                            SKIP
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); submitReject(story.index); }}
                            className={`${actionBtn} border border-danger/40 bg-danger/15 text-danger backdrop-blur-sm`}
                          >
                            SUBMIT
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(story); }}
                          className={`${actionBtn} border border-border-mid bg-brand-black/80 text-brand-white backdrop-blur-sm`}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(story.index, approveAction); }}
                          className={`${actionBtn} border backdrop-blur-sm ${
                            approveActive
                              ? "border-success bg-success/20 text-success"
                              : "border-border-mid bg-brand-black/80 text-brand-white"
                          }`}
                        >
                          {approveLabel}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); rejected ? handleApprove(story.index, "clear") : startReject(story.index); }}
                          className={`${actionBtn} border backdrop-blur-sm ${
                            rejected
                              ? "border-danger bg-danger/20 text-danger"
                              : "border-border-mid bg-brand-black/80 text-brand-white"
                          }`}
                        >
                          {rejected ? "✕" : "REJECT"}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          );
        };

        // Per-card actions: mobile button bar + mobile source link + rejected
        // feedback preview. Lives BELOW the card. Same for standalones and
        // chain top cards.
        const cardActions = (story: Story) => {
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);
          const isStale = approved && approvalStale.includes(story.index);
          const approveActive = approved && !isStale;
          const approveLabel = approveActive ? "✓" : isStale ? "RE-APPROVE" : "APPROVE";
          const approveAction: "approve" | "clear" = approveActive ? "clear" : "approve";
          const marcoEntry = marco[story.index];

          return (
            <>
              {/* Action buttons — below card (mobile only) */}
              <div className="flex sm:hidden flex-col gap-2 mt-2">
                {rejectingIndex === story.index ? (
                  <>
                    <textarea
                      ref={setFeedbackRef}
                      rows={2}
                      placeholder="What's wrong with this story?"
                      className="w-full rounded-[5px] border border-border-mid bg-brand-black text-brand-white text-xs px-3 py-2 resize-none placeholder:text-muted focus:outline-none focus:border-danger/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReject(story.index); }
                        if (e.key === "Escape") setRejectingIndex(null);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => skipReject(story.index)}
                        className={`${actionBtn} border border-border-mid bg-brand-black text-muted`}
                      >
                        SKIP
                      </button>
                      <button
                        onClick={() => submitReject(story.index)}
                        className={`${actionBtn} border border-danger/40 bg-danger/15 text-danger`}
                      >
                        SUBMIT
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(story)}
                      className={`${actionBtn} border border-border-mid bg-brand-black text-brand-white`}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleApprove(story.index, approveAction)}
                      className={`${actionBtn} border ${
                        approveActive
                          ? "border-success bg-success/20 text-success"
                          : "border-border-mid bg-brand-black text-brand-white"
                      }`}
                    >
                      {approveLabel}
                    </button>
                    <button
                      onClick={() => rejected ? handleApprove(story.index, "clear") : startReject(story.index)}
                      className={`${actionBtn} border ${
                        rejected
                          ? "border-danger bg-danger/20 text-danger"
                          : "border-border-mid bg-brand-black text-brand-white"
                      }`}
                    >
                      {rejected ? "✕" : "REJECT"}
                    </button>
                  </div>
                )}
              </div>

              {/* Source link — mobile only */}
              {marcoEntry?.url && (
                <a
                  href={marcoEntry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:hidden mt-2 flex items-center justify-center gap-1.5 py-2 rounded-[5px] border border-border-mid bg-brand-black text-muted text-[0.65rem] font-semibold tracking-[0.06em]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 4h6v6" />
                    <path d="M20 4l-9 9" />
                    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                  </svg>
                  VIEW SOURCE
                </a>
              )}

              {/* Feedback preview for rejected cards */}
              {rejected && approvals.feedback?.[story.index] && rejectingIndex !== story.index && (
                <p className="mt-2 text-xs text-danger/70 leading-snug line-clamp-2 px-1">
                  {approvals.feedback[story.index]}
                </p>
              )}
            </>
          );
        };

        return (
          <div className="grid gap-8 grid-cols-4 max-lg:grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] max-sm:grid-cols-1 max-sm:max-w-[405px] max-sm:mx-auto">
            {groups.map((g) => {
              if (g.kind === "single") {
                return (
                  <div key={g.story.index} id={`story-${g.story.index}`} className="group/card">
                    <div className="relative w-full">{cardVisual(g.story)}</div>
                    {cardActions(g.story)}
                  </div>
                );
              }
              // chain group — render via ChainStack
              const dotStates = g.stories.map(deriveDotState);
              const total = g.stories.length;
              return (
                <ChainStack
                  key={`chain-${g.chain}-${g.stories[0].index}`}
                  chain={g.chain}
                  stories={g.stories}
                  dotStates={dotStates}
                  renderCardVisual={(s, isTop) => {
                    const position = g.stories.findIndex((x) => x.index === s.index) + 1;
                    return (
                      <div className="group/card relative w-full">
                        {cardVisual(s, { isTop, chainPosition: position, chainTotal: total })}
                      </div>
                    );
                  }}
                  renderActions={(s) => cardActions(s)}
                  onOpenFullscreen={(idx) =>
                    setFullscreenChain({ chain: g.chain, stories: g.stories, initialIndex: idx })
                  }
                />
              );
            })}

            {isToday && generateMoreTile}
          </div>
        );
      })()}

      <div className="mt-10 flex justify-center">
        <button
          onClick={() => setShowExport(true)}
          className="px-6 py-3 rounded-lg border border-brand-white bg-brand-white text-brand-black text-xs font-semibold tracking-[0.06em] cursor-pointer hover:bg-brand-white/90 transition-colors duration-150"
        >
          {approvedStories.length > 0 ? `EXPORT (${approvedStories.length} approved)` : "EXPORT"}
        </button>
      </div>

      {showGenerateMore && <GenerateMoreDialog date={date} onClose={() => setShowGenerateMore(false)} />}

      {fullscreenChain && (
        <ChainFullscreen
          chain={fullscreenChain.chain}
          stories={fullscreenChain.stories}
          initialIndex={fullscreenChain.initialIndex}
          onClose={() => setFullscreenChain(null)}
          onApproveAll={async () => {
            const indexes = fullscreenChain.stories.map((s) => s.index);
            const res = await apiFetch(`/api/stories/${date}/chain/approve`, { indexes });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to approve chain");
            if (data.approvals) setApprovals(data.approvals);
            setToast(`Approved chain "${fullscreenChain.chain}"`);
            // ChainFullscreen owns the close timing so its exit animation
            // can play before unmount.
          }}
          onRejectAll={async () => {
            const indexes = fullscreenChain.stories.map((s) => s.index);
            const res = await apiFetch(`/api/stories/${date}/chain/reject`, { indexes });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to reject chain");
            if (data.approvals) setApprovals(data.approvals);
            setToast(`Rejected chain "${fullscreenChain.chain}"`, "neutral");
          }}
        />
      )}

      {showExport && (
        <ExportDialog
          stories={stories}
          approvedIndices={approvals.approved}
          stale={approvalStale}
          posted={posted}
          date={date}
          onClose={() => setShowExport(false)}
          onSuccess={(message) => { setToast(message); refreshPosted(); }}
          onPosted={(index, record) => setPosted((prev) => ({ ...prev, [index]: [...(prev[index] ?? []), record] }))}
        />
      )}

      {toast && (
        <div className={`toast-in fixed bottom-6 inset-x-0 mx-auto w-fit z-[200] px-4 py-3 rounded-lg border bg-surface-2/95 backdrop-blur shadow-lg flex items-center gap-2 ${
          toast.kind === "danger" ? "border-danger/40" : toast.kind === "neutral" ? "border-border-mid" : "border-success/40"
        }`}>
          {toast.kind === "danger" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <line x1="3" y1="3" x2="11" y2="11" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <line x1="11" y1="3" x2="3" y2="11" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : toast.kind === "success" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
              <path d="M3 7l3 3 5-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          <p className="text-[0.75rem] text-brand-white leading-snug">{toast.message}</p>
        </div>
      )}
    </>
  );
}
