"use client";

import { useMemo } from "react";
import { diffLines } from "@/lib/diff";
import { timeAgo } from "@/lib/time";
import type { StoredProposal } from "@/lib/proposals";

interface Props {
  proposal: StoredProposal;
  /** Current on-disk ADAPTIVE.md — used to detect stale proposal. */
  currentAdaptive: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
  onInspect: (refs: string[]) => void;
  busy?: boolean;
}

export default function ProposalView({
  proposal,
  currentAdaptive,
  onAccept,
  onReject,
  onEdit,
  onInspect,
  busy,
}: Props) {
  const isStale = proposal.basedOnAdaptive !== currentAdaptive;
  const canApply = proposal.status === "proposal" && !!proposal.proposedContent;

  const diff = useMemo(() => {
    if (!canApply || !proposal.proposedContent) return null;
    return diffLines(currentAdaptive, proposal.proposedContent);
  }, [canApply, proposal.proposedContent, currentAdaptive]);

  return (
    <div className="w-full flex-1 min-h-0 overflow-y-auto rounded-lg border border-border-mid bg-surface">
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

      {/* Stale banner (only meaningful when there's a diff to look at) */}
      {isStale && canApply && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-[0.65rem] text-amber-300">
          ADAPTIVE.md has changed since this proposal was generated. The diff below compares the
          proposal to the current file — review carefully or discard and regenerate.
        </div>
      )}

      {/* No-changes centered message */}
      {proposal.status === "no-changes" && (
        <div className="flex flex-col items-center justify-center text-center gap-3 px-6 py-10">
          <div className="text-[0.75rem] font-semibold text-brand-white/80">
            Lorenzo is leaving things alone
          </div>
          {proposal.summary && (
            <p className="text-[0.7rem] text-brand-white/60 leading-relaxed max-w-md m-0">
              {proposal.summary}
            </p>
          )}
          <p className="text-[0.65rem] text-muted m-0">
            Come back after more feedback accumulates, or dismiss to remove this notice.
          </p>
        </div>
      )}

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
          <div className="rounded border border-border-mid bg-surface-2 p-3 text-[0.7rem] leading-relaxed font-mono">
            {diff.map((d, i) => {
              if (d.type === "same") {
                return (
                  <div key={i} className="text-brand-white/40 whitespace-pre-wrap min-h-[1.4em]">
                    {d.line || " "}
                  </div>
                );
              }
              if (d.type === "removed") {
                return (
                  <div
                    key={i}
                    className="text-danger/70 line-through whitespace-pre-wrap bg-danger/5 -mx-3 px-3 min-h-[1.4em]"
                  >
                    {d.line || " "}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className="text-success/90 whitespace-pre-wrap bg-success/5 -mx-3 px-3 min-h-[1.4em]"
                >
                  {d.line || " "}
                </div>
              );
            })}
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
