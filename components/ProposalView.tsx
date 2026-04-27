"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { diffLines } from "@/lib/diff";
import { timeAgo } from "@/lib/time";
import type { StoredProposal } from "@/lib/proposals";
import DiffBlock from "./DiffBlock";

interface Props {
  proposal: StoredProposal;
  /** Current on-disk ADAPTIVE.md — used to detect stale proposal. */
  currentAdaptive: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
  onRefine: (nudge: string) => void;
  onUndoRefine: () => void;
  onInspect: (refs: string[]) => void;
  busy?: boolean;
}

const WARNING_COPY: Record<NonNullable<StoredProposal["warnings"]>[number], string> = {
  "significant-shrinkage":
    "Lorenzo shrank ADAPTIVE.md significantly — review carefully before accepting, this often means content was dropped.",
  "unchanged-from-previous":
    "Lorenzo left the proposed content unchanged from before. Check the summary — he likely decided your nudge was already captured.",
};

export default function ProposalView({
  proposal,
  currentAdaptive,
  onAccept,
  onReject,
  onEdit,
  onRefine,
  onUndoRefine,
  onInspect,
  busy,
}: Props) {
  const isStale = proposal.basedOnAdaptive !== currentAdaptive;
  const canApply = proposal.status === "proposal" && !!proposal.proposedContent;
  const [refineOpen, setRefineOpen] = useState(false);
  const [nudge, setNudge] = useState("");
  const refineRef = useRef<HTMLDivElement>(null);
  const nudgeInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When refine opens, scroll the form into view (it lives below the diff,
  // which can be long) and focus the textarea so the user can type immediately.
  useEffect(() => {
    if (!refineOpen) return;
    refineRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    nudgeInputRef.current?.focus();
  }, [refineOpen]);

  // When the proposal changes (fresh generate OR refine response), scroll
  // the panel back to the top so the user sees the summary first. Especially
  // important on refine when the diff can be nearly identical — the summary
  // is where Lorenzo explains what he did or didn't change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [proposal.generatedAt]);

  function submitNudge() {
    const trimmed = nudge.trim();
    if (!trimmed) return;
    onRefine(trimmed);
    setNudge("");
    setRefineOpen(false);
  }

  const diff = useMemo(() => {
    if (!canApply || !proposal.proposedContent) return null;
    return diffLines(currentAdaptive, proposal.proposedContent);
  }, [canApply, proposal.proposedContent, currentAdaptive]);

  return (
    <div
      ref={scrollRef}
      className="w-full flex-1 min-h-0 overflow-y-auto rounded-lg border border-border-mid bg-surface"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-mid flex items-center gap-3 flex-wrap">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-accent-culture">
          Lorenzo&apos;s proposal
        </span>
        <span className="text-[0.6rem] text-muted">
          {timeAgo(proposal.generatedAt)} · {proposal.windowDays}d window · {proposal.basedOnSummary.rejections}R / {proposal.basedOnSummary.edits}E / {proposal.basedOnSummary.approvals}A
        </span>
        {proposal.status === "no-changes" && (
          <span className="text-[0.6rem] font-semibold text-muted ml-auto">NO CHANGES PROPOSED</span>
        )}
      </div>

      {/* Refine breadcrumb */}
      {proposal.refineHistory && proposal.refineHistory.length > 0 && (
        <div className="px-4 py-2 border-b border-border-mid bg-surface-2/40 flex items-start gap-2">
          <span className="text-[0.55rem] uppercase tracking-[0.08em] text-muted font-semibold shrink-0 mt-[2px]">
            Refined {proposal.refineHistory.length}×
          </span>
          <span className="text-[0.65rem] text-brand-white/60 flex-1 leading-relaxed">
            {proposal.refineHistory
              .map((t) => `"${t.nudge}"`)
              .join(" → ")}
          </span>
          {proposal.previousProposal && (
            <button
              onClick={onUndoRefine}
              disabled={busy}
              className="text-[0.6rem] font-semibold text-muted hover:text-brand-white bg-transparent border border-border-mid rounded px-2 py-0.5 cursor-pointer shrink-0 disabled:opacity-50"
              title="Revert to the proposal before the last refine"
            >
              UNDO
            </button>
          )}
        </div>
      )}

      {/* Warnings */}
      {proposal.warnings && proposal.warnings.length > 0 && (
        <div className="mx-4 my-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 flex flex-col gap-1.5">
          {proposal.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 text-[0.7rem] text-amber-200/90 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span className="flex-1">{WARNING_COPY[w]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stale banner (only meaningful when there's a diff to look at) */}
      {isStale && canApply && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-[0.65rem] text-amber-300">
          ADAPTIVE.md has changed since this proposal was generated. The diff below compares the
          proposal to the current file — review carefully or discard and regenerate.
        </div>
      )}

      {/* No-changes centered message */}
      {proposal.status === "no-changes" && (() => {
        const isRefine = (proposal.refineHistory?.length ?? 0) > 0;
        return (
          <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-10">
            <div className="text-[0.75rem] font-semibold text-brand-white/80">
              {isRefine
                ? "Lorenzo didn't change the proposal"
                : "Lorenzo is leaving things alone"}
            </div>
            {proposal.summary && (
              <p className="text-[0.7rem] text-brand-white/60 leading-relaxed max-w-md m-0">
                {proposal.summary}
              </p>
            )}
            <p className="text-[0.65rem] text-muted m-0">
              {isRefine
                ? "Your nudge didn't move him. Use UNDO above to get the previous proposal back, or dismiss."
                : "Come back after more feedback accumulates, or dismiss to remove this notice."}
            </p>
          </div>
        );
      })()}

      {/* Summary (only when there's a proposal to explain) */}
      {proposal.status === "proposal" && proposal.summary && (
        <div className="px-4 py-3 border-b border-border-mid">
          <p className="text-[0.75rem] text-brand-white/80 leading-relaxed m-0">{proposal.summary}</p>
        </div>
      )}

      {/* Conflicts */}
      {proposal.conflicts.length > 0 && (
        <div className="mx-4 my-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-[0.6rem] uppercase tracking-[0.08em] text-amber-300 font-semibold">
              Conflicting signals — review before accepting
            </span>
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {proposal.conflicts.map((c, i) => (
              <li key={i} className="text-[0.7rem] text-brand-white/85 leading-relaxed">
                <span>{c.description} </span>
                {c.signalRefs.length > 0 && (
                  <button
                    onClick={() => onInspect(c.signalRefs)}
                    className="text-[0.6rem] text-accent-culture hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    [{c.signalRefs.join(", ")}]
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale */}
      {proposal.rationale.length > 0 && (
        <div className="px-4 py-3 border-b border-border-mid">
          <div className="text-[0.6rem] uppercase tracking-[0.08em] text-muted font-semibold mb-2">
            Rationale
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {proposal.rationale.map((r, i) => (
              <li key={i} className="text-[0.75rem] text-brand-white/80 leading-relaxed flex gap-2">
                <span className="text-muted shrink-0">•</span>
                <span className="flex-1">
                  {r.text}{" "}
                  {r.signalRefs.length > 0 && (
                    <button
                      onClick={() => onInspect(r.signalRefs)}
                      className="text-[0.6rem] text-accent-culture hover:underline cursor-pointer bg-transparent border-none p-0"
                    >
                      [{r.signalRefs.join(", ")}]
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Diff */}
      {diff && (
        <div className="px-4 py-3">
          <div className="text-[0.6rem] uppercase tracking-[0.08em] text-muted font-semibold mb-2">
            Proposed changes
          </div>
          <DiffBlock
            lines={diff}
            inset="x-3"
            className="rounded border border-border-mid bg-surface-2 p-3"
          />
        </div>
      )}

      {/* Refine form */}
      {canApply && refineOpen && (
        <div ref={refineRef} className="px-4 py-3 border-t border-border-mid bg-surface-2/50">
          <div className="text-[0.6rem] uppercase tracking-[0.08em] text-muted font-semibold mb-2">
            Ask Lorenzo to refine
          </div>
          <textarea
            ref={nudgeInputRef}
            value={nudge}
            onChange={(e) => setNudge(e.target.value)}
            placeholder="e.g. &quot;don't remove the statistic rule — soften it instead&quot;"
            spellCheck={false}
            rows={2}
            className="w-full rounded-md border border-border-mid bg-surface text-[0.75rem] text-brand-white/85 p-2.5 resize-none focus:outline-none focus:border-brand-white/40 placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitNudge();
              }
            }}
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setRefineOpen(false);
                setNudge("");
              }}
              disabled={busy}
              className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-3 py-1.5 cursor-pointer hover:text-brand-white disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={submitNudge}
              disabled={busy || !nudge.trim()}
              className={`text-[0.65rem] font-semibold tracking-[0.04em] rounded px-4 py-1.5 transition-all ${
                busy || !nudge.trim()
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-brand-white text-brand-black cursor-pointer"
              }`}
            >
              REFINE
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border-mid flex items-center justify-end gap-2 sticky bottom-0 bg-surface">
        <button
          onClick={onReject}
          disabled={busy}
          className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-3 py-1.5 cursor-pointer hover:text-danger hover:border-danger/40 disabled:opacity-50"
        >
          {canApply ? "REJECT" : "DISMISS"}
        </button>
        {canApply && (
          <>
            <button
              onClick={() => setRefineOpen((v) => !v)}
              disabled={busy}
              className={`text-[0.65rem] font-semibold bg-transparent border rounded px-3 py-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
                refineOpen
                  ? "border-brand-white/40 text-brand-white"
                  : "border-border-mid text-muted hover:text-brand-white"
              }`}
            >
              REFINE
            </button>
            <button
              onClick={onEdit}
              disabled={busy}
              className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-3 py-1.5 cursor-pointer hover:text-brand-white disabled:opacity-50"
            >
              EDIT FIRST
            </button>
            <button
              onClick={onAccept}
              disabled={busy}
              className={`text-[0.65rem] font-semibold tracking-[0.04em] rounded px-4 py-1.5 transition-all ${
                busy
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-success text-brand-black cursor-pointer hover:bg-success/90"
              }`}
            >
              {busy ? "APPLYING..." : "ACCEPT"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
