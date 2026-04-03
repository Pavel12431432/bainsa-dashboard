"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Story, ApprovalState } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { checkCompliance } from "@/lib/compliance";
import StoryCard from "./StoryCard";
import ComplianceBadge from "./ComplianceBadge";
import StoryEditor from "./StoryEditor";
import ExportDialog from "./ExportDialog";

const STORY_FIELDS = ["headline", "body", "sourceTag", "division", "cornerAccent", "accentColor"] as const;

function storyChanged(a: Story, b: Story): string[] {
  return STORY_FIELDS.filter((f) => a[f] !== b[f]) as string[];
}

interface Props {
  date: string;
  initialStories: Story[];
  initialApprovals: ApprovalState;
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

export default function StoryGrid({ date, initialStories, initialApprovals, highlightIndex }: Props) {
  const [stories, setStories] = useState<Story[]>(initialStories);
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
  const [editing, setEditing] = useState<Story | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [stale, setStale] = useState<string | null>(null); // Marco's lastRun if stale
  const [regenerating, setRegenerating] = useState(false);

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
    setRegenerating(true);
    try {
      const sessionId = `regen-${Date.now()}`;
      await apiFetch("/api/agent-chat", {
        agent: "sofia",
        message: "/new regenerate all stories from Marco's latest handoff",
        sessionId,
        newSession: true,
      });
      // Refetch stories and stale status
      await refreshStories();
      await checkStale();
    } catch {} finally {
      setRegenerating(false);
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
      for (const newStory of fresh) {
        const old = stories.find((s) => s.index === newStory.index);
        if (!old) continue;
        const changed = storyChanged(old, newStory);
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
      if (data.approvals) setApprovals(data.approvals);
    } catch {}
  }, [date, stories]);

  useEffect(() => {
    const handler = () => { refreshStories(); checkStale(); };
    document.addEventListener("stories-changed", handler);
    return () => document.removeEventListener("stories-changed", handler);
  }, [refreshStories, checkStale]);

  async function handleApprove(index: number, action: "approve" | "reject" | "clear") {
    const res = await apiFetch(`/api/stories/${date}/${index}/approve`, { action });
    if (res.ok) {
      const data = await res.json();
      setApprovals(data.approvals);
    }
  }

  function handleSaved(updated: Story) {
    setStories((prev) => prev.map((s) => s.index === updated.index ? updated : s));
  }

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
        ) : (
          <div className="text-left text-brand-white opacity-40 py-12">
            No stories for this date — run Sofia to generate.
          </div>
        )}
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

      <div className="grid gap-8 grid-cols-4 max-lg:grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] max-sm:grid-cols-1 max-sm:max-w-[405px] max-sm:mx-auto">
        {visibleStories.map((story) => {
          const compliance = checkCompliance(story);
          const approved = approvals.approved.includes(story.index);
          const rejected = approvals.rejected.includes(story.index);

          return (
            <div key={story.index} id={`story-${story.index}`} className="group/card">
              {/* Card */}
              <div className="relative w-full">
                <StoryCard story={story} />

                {approved && (
                  <div className="absolute inset-0 rounded-2xl border border-success/30 pointer-events-none" style={{ boxShadow: "0 0 16px rgba(34,197,94,0.4), 0 0 40px rgba(34,197,94,0.15)" }} />
                )}
                {rejected && (
                  <div className="absolute inset-0 rounded-2xl border border-danger/25 bg-black/45 pointer-events-none" style={{ boxShadow: "0 0 16px rgba(239,68,68,0.35), 0 0 40px rgba(239,68,68,0.12)" }} />
                )}
                {!compliance.pass && (
                  <div className="absolute bottom-2 left-2 right-2 group-hover/card:opacity-0 transition-opacity duration-150">
                    <ComplianceBadge result={compliance} />
                  </div>
                )}

                {/* Action buttons — overlay bottom of card on hover */}
                <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl px-5 pb-5 pt-16 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 flex gap-2">
                  <button
                    onClick={() => setEditing(story)}
                    className={`${actionBtn} border border-border-mid bg-brand-black/80 text-brand-white backdrop-blur-sm`}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleApprove(story.index, approved ? "clear" : "approve")}
                    className={`${actionBtn} border backdrop-blur-sm ${
                      approved
                        ? "border-success bg-success/20 text-success"
                        : "border-border-mid bg-brand-black/80 text-brand-white"
                    }`}
                  >
                    {approved ? "✓" : "APPROVE"}
                  </button>
                  <button
                    onClick={() => handleApprove(story.index, rejected ? "clear" : "reject")}
                    className={`${actionBtn} border backdrop-blur-sm ${
                      rejected
                        ? "border-danger bg-danger/20 text-danger"
                        : "border-border-mid bg-brand-black/80 text-brand-white"
                    }`}
                  >
                    {rejected ? "✕" : "REJECT"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={() => setShowExport(true)}
          className="px-6 py-3 rounded-lg border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.06em] cursor-pointer hover:bg-border transition-colors duration-150"
        >
          {approvedStories.length > 0 ? `EXPORT (${approvedStories.length} approved)` : "EXPORT"}
        </button>
      </div>

      {showExport && (
        <ExportDialog
          stories={stories}
          approvedIndices={approvals.approved}
          date={date}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
