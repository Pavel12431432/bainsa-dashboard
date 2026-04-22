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

      {/* Stale banner */}
      {isStale && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-[0.65rem] text-amber-300">
          ADAPTIVE.md has changed since this proposal was generated. The diff below compares the
          proposal to the current file — review carefully or discard and regenerate.
        </div>
      )}

      {/* Summary */}
      {proposal.summary && (
        <div className="px-4 py-3 border-b border-border-mid">
          <p className="text-[0.75rem] text-brand-white/80 leading-relaxed m-0">{proposal.summary}</p>
        </div>
      )}

      {/* Conflicts */}
      {proposal.conflicts.length > 0 && (
        <div className="px-4 py-3 border-b border-border-mid">
          <div className="text-[0.6rem] uppercase tracking-[0.08em] text-amber-400 font-semibold mb-2">
            Conflicts flagged
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {proposal.conflicts.map((c, i) => (
              <li key={i} className="text-[0.7rem] text-brand-white/80 leading-relaxed">
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
          REJECT
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
