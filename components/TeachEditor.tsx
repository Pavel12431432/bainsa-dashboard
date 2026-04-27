"use client";

import { useState, useRef, useMemo } from "react";
import { apiFetch } from "@/lib/fetch";
import { diffLines } from "@/lib/diff";
import type { StoredProposal } from "@/lib/proposals";
import HistoryTimeline from "./HistoryTimeline";
import FeedbackInspector from "./FeedbackInspector";
import ProposalView from "./ProposalView";
import DiffBlock from "./DiffBlock";

interface HistoryEntry {
  content: string;
  label: string;
  timestamp: string;
  source?: "human" | "editor-agent";
}

interface Props {
  fixed: string;
  adaptive: string;
  initialHistory: HistoryEntry[];
  initialProposal: StoredProposal | null;
}

type Mode = "normal" | "generating" | "proposal";

export default function TeachEditor({ fixed, adaptive, initialHistory, initialProposal }: Props) {
  const [content, setContent] = useState(adaptive);
  const [savedContent, setSavedContent] = useState(adaptive);
  const [saving, setSaving] = useState(false);
  const [fixedCollapsed, setFixedCollapsed] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [viewingIdx, setViewingIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Proposal state
  const [mode, setMode] = useState<Mode>(initialProposal ? "proposal" : "normal");
  const [proposal, setProposal] = useState<StoredProposal | null>(initialProposal);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorReviewOnly, setInspectorReviewOnly] = useState(false);
  const [inspectorHighlight, setInspectorHighlight] = useState<string[]>([]);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set when the user hit EDIT FIRST on a proposal — the next save should
   *  be labeled "Edited Lorenzo proposal" rather than generic "Manual edit". */
  const [pendingSaveLabel, setPendingSaveLabel] = useState<string | null>(null);

  const isDirty = content !== savedContent;

  async function refreshHistory() {
    const res = await fetch("/api/teach/history");
    if (res.ok) setHistory(await res.json());
  }

  async function save(text?: string, label?: string) {
    const toSave = text ?? content;
    const finalLabel = label ?? pendingSaveLabel ?? undefined;
    setSaving(true);
    try {
      const res = await apiFetch("/api/teach/save", { content: toSave, label: finalLabel });
      if (res.ok) {
        setSavedContent(toSave);
        setPendingSaveLabel(null);
        await refreshHistory();
      }
    } finally {
      setSaving(false);
    }
  }

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
    await save(restored, "Restored version");
  }

  // Proposal actions
  function openInspector() {
    setInspectorReviewOnly(false);
    setInspectorHighlight([]);
    setInspectorOpen(true);
  }

  async function generateProposal(days: number) {
    setError(null);
    setMode("generating");
    setInspectorOpen(false);
    setPendingSaveLabel(null);
    try {
      const res = await apiFetch("/api/teach/propose", { days });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Proposal failed: ${err.error || res.statusText}`);
        setMode("normal");
        return;
      }
      const data = (await res.json()) as { proposal: StoredProposal };
      setProposal(data.proposal);
      setMode("proposal");
    } catch (err) {
      setError(`Proposal failed: ${err instanceof Error ? err.message : String(err)}`);
      setMode("normal");
    }
  }

  async function refineProposal(nudge: string) {
    if (!proposal) return;
    setError(null);
    setMode("generating");
    try {
      const res = await apiFetch("/api/teach/propose/refine", { nudge });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Refine failed: ${err.error || res.statusText}`);
        setMode("proposal");
        return;
      }
      const data = (await res.json()) as { proposal: StoredProposal };
      setProposal(data.proposal);
      setMode("proposal");
    } catch (err) {
      setError(`Refine failed: ${err instanceof Error ? err.message : String(err)}`);
      setMode("proposal");
    }
  }

  async function undoRefine() {
    if (!proposal?.previousProposal) return;
    setError(null);
    setProposalBusy(true);
    try {
      const res = await apiFetch("/api/teach/propose/undo-refine", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Undo failed: ${err.error || res.statusText}`);
        return;
      }
      const data = (await res.json()) as { proposal: StoredProposal };
      setProposal(data.proposal);
    } finally {
      setProposalBusy(false);
    }
  }

  async function acceptProposal() {
    if (!proposal) return;
    setError(null);
    setProposalBusy(true);
    try {
      const res = await apiFetch("/api/teach/propose/accept", {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Accept failed: ${err.error || res.statusText}`);
        return;
      }
      // Update local state to reflect the accepted content
      if (proposal.proposedContent) {
        setContent(proposal.proposedContent);
        setSavedContent(proposal.proposedContent);
      }
      setProposal(null);
      setMode("normal");
      setPendingSaveLabel(null);
      await refreshHistory();
    } finally {
      setProposalBusy(false);
    }
  }

  async function rejectProposal() {
    setError(null);
    setProposalBusy(true);
    try {
      const res = await fetch("/api/teach/propose", {
        method: "DELETE",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Dismiss failed: ${err.error || res.statusText}`);
        return;
      }
      setProposal(null);
      setMode("normal");
      setPendingSaveLabel(null);
    } finally {
      setProposalBusy(false);
    }
  }

  async function editProposal() {
    if (!proposal?.proposedContent) return;
    // Drop into normal edit mode, pre-filled with the proposed content.
    // Also discard the sidecar — once the user edits, the proposal is consumed.
    setError(null);
    setProposalBusy(true);
    try {
      const res = await fetch("/api/teach/propose", {
        method: "DELETE",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(`Could not consume proposal: ${err.error || res.statusText}`);
        return;
      }
      setContent(proposal.proposedContent);
      setProposal(null);
      setMode("normal");
      // Flag the next save so its history entry reads "Edited Lorenzo proposal"
      // rather than the generic "Manual edit".
      setPendingSaveLabel("Edited Lorenzo proposal");
      // Do NOT save yet — let the user tweak and hit SAVE themselves.
    } finally {
      setProposalBusy(false);
    }
  }

  function openInspectorForRefs(refs: string[]) {
    setInspectorReviewOnly(true);
    setInspectorHighlight(refs);
    setInspectorOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-100px)]">
      {/* Page title */}
      <div className="shrink-0">
        <h1 className="text-xl font-semibold text-brand-white m-0">Teach Sofia</h1>
        <p className="text-[0.8rem] text-brand-white opacity-35 mt-1">
          Edit Sofia&apos;s style guide directly, or let Lorenzo — her editor — review recent feedback and propose updates.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 flex items-start gap-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
          <p className="flex-1 m-0 text-[0.75rem] text-danger/90 leading-relaxed">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[0.7rem] text-danger/70 hover:text-danger bg-transparent border-none cursor-pointer leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-0 flex-1 min-h-0 max-lg:flex-col max-lg:gap-6">
        {/* Left column — FIXED.md (read-only) */}
        <div className={`shrink-0 flex flex-col transition-all duration-200 max-lg:w-full ${fixedCollapsed ? "w-10" : "w-[420px]"}`}>
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

        {/* Right column — ADAPTIVE.md */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Header row */}
          <div className="flex items-center justify-between h-[34px] mb-3 shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[0.65rem] font-semibold text-brand-white opacity-25 tracking-[0.08em] uppercase">
                Adaptive Instructions
              </span>
              {viewingIdx !== null && (
                <span className="text-[0.55rem] font-semibold text-accent-culture/70 tracking-[0.04em]">
                  viewing history
                </span>
              )}
              {viewingIdx === null && mode === "normal" && isDirty && (
                <span className="text-[0.55rem] font-semibold text-amber-400/70 tracking-[0.04em]">
                  unsaved changes
                </span>
              )}
              {mode === "generating" && (
                <span className="text-[0.55rem] font-semibold text-accent-culture/70 tracking-[0.04em]">
                  lorenzo is reviewing...
                </span>
              )}
              {mode === "proposal" && (
                <span className="text-[0.55rem] font-semibold text-accent-culture/70 tracking-[0.04em]">
                  proposal pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {mode === "normal" && viewingIdx === null && (
                <button
                  onClick={openInspector}
                  className="px-3 py-1.5 rounded-[5px] text-[0.65rem] font-semibold tracking-[0.04em] border border-border-mid text-brand-white/80 bg-transparent cursor-pointer hover:text-brand-white hover:border-brand-white/40 transition-colors"
                  title="Review recent feedback and generate a proposal"
                >
                  PROPOSE UPDATES
                </button>
              )}
              {mode === "normal" && (
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
              )}
            </div>
          </div>

          {/* Main panel — switches by mode */}
          {mode === "generating" ? (
            <GeneratingPanel refining={proposal !== null} />
          ) : mode === "proposal" && proposal ? (
            <ProposalView
              proposal={proposal}
              currentAdaptive={savedContent}
              onAccept={acceptProposal}
              onReject={rejectProposal}
              onEdit={editProposal}
              onRefine={refineProposal}
              onUndoRefine={undoRefine}
              onInspect={openInspectorForRefs}
              busy={proposalBusy}
            />
          ) : viewingIdx !== null && diff ? (
            <DiffBlock
              lines={diff}
              inset="x-4"
              className="w-full flex-1 min-h-0 rounded-lg border border-border-mid bg-surface p-4 overflow-y-auto"
            />
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

      <FeedbackInspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onGenerate={generateProposal}
        generating={mode === "generating"}
        highlightRefs={inspectorHighlight}
        reviewOnly={inspectorReviewOnly}
      />
    </div>
  );
}

function GeneratingPanel({ refining }: { refining: boolean }) {
  return (
    <div className="w-full flex-1 min-h-0 rounded-lg border border-border-mid bg-surface flex flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-accent-culture animate-pulse" />
        <span className="text-[0.85rem] text-brand-white/80 font-semibold">
          {refining ? "Lorenzo is refining the proposal..." : "Lorenzo is reviewing recent feedback..."}
        </span>
      </div>
      <p className="text-[0.7rem] text-muted max-w-md text-center leading-relaxed m-0">
        {refining
          ? "He's applying your nudge while keeping the rest of the proposal intact. Usually ~30 seconds."
          : "This usually takes 30–60 seconds. He's clustering the feedback into themes, checking for conflicts, and drafting a proposal."}
      </p>
    </div>
  );
}
