"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedbackBundle } from "@/lib/editorFeedback";

type TabKey = "rejections" | "edits" | "variants" | "approvals";

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerate: (days: number) => void;
  generating: boolean;
  /** When provided, the inspector is in "review mode" (after generation):
   *  highlights these signal refs and pre-selects the matching tab. */
  highlightRefs?: string[];
  /** When provided, hides the GENERATE button (review-only mode). */
  reviewOnly?: boolean;
}

const WINDOW_OPTIONS = [7, 14, 30] as const;

function tabForRef(ref: string): TabKey | null {
  if (ref.startsWith("rejection-")) return "rejections";
  if (ref.startsWith("edit-")) return "edits";
  if (ref.startsWith("variant-")) return "variants";
  if (ref.startsWith("approval-")) return "approvals";
  return null;
}

function refIndex(ref: string): number {
  const m = ref.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : -1;
}

export default function FeedbackInspector({
  open,
  onClose,
  onGenerate,
  generating,
  highlightRefs,
  reviewOnly,
}: Props) {
  const [days, setDays] = useState<number>(14);
  const [bundle, setBundle] = useState<FeedbackBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("rejections");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // When opened with highlights, jump to the right tab.
  useEffect(() => {
    if (!open || !highlightRefs?.length) return;
    const first = highlightRefs.find((r) => tabForRef(r));
    if (!first) return;
    const tab = tabForRef(first);
    if (tab) setActiveTab(tab);
  }, [open, highlightRefs]);

  // Auto-expand highlighted entries.
  useEffect(() => {
    if (!highlightRefs?.length) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const ref of highlightRefs) next[ref] = true;
      return next;
    });
  }, [highlightRefs]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teach/feedback?days=${days}`);
        if (res.ok && !cancelled) {
          setBundle(await res.json());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, days]);

  const highlightSet = useMemo(() => new Set(highlightRefs ?? []), [highlightRefs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-mid rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-mid shrink-0">
          <div>
            <h2 className="text-[0.95rem] font-semibold text-brand-white m-0">
              {reviewOnly ? "Feedback inspector" : "Review feedback before generating"}
            </h2>
            <p className="text-[0.65rem] text-muted m-0 mt-1">
              {bundle
                ? `${bundle.dateRange.from} → ${bundle.dateRange.to} · ${bundle.summary.datesCovered} day${bundle.summary.datesCovered === 1 ? "" : "s"} with stories`
                : "Loading..."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-brand-white bg-transparent border-none cursor-pointer text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Window selector + summary */}
        <div className="px-5 py-3 border-b border-border-mid shrink-0 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-muted">
              Window
            </span>
            <div className="flex gap-1">
              {WINDOW_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setDays(n)}
                  disabled={reviewOnly}
                  className={`text-[0.65rem] font-semibold px-2 py-1 rounded border transition-colors ${
                    days === n
                      ? "bg-brand-white text-brand-black border-brand-white"
                      : "bg-transparent text-muted border-border-mid hover:text-brand-white"
                  } ${reviewOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {n}d
                </button>
              ))}
            </div>
          </div>
          {bundle && (
            <div className="flex gap-3 text-[0.7rem] text-brand-white/80">
              <SummaryPill label="approvals" value={bundle.summary.approvals} />
              <SummaryPill label="rejections" value={bundle.summary.rejections} tone="danger" />
              <SummaryPill label="edits" value={bundle.summary.edits} tone="amber" />
              <SummaryPill label="variants applied" value={bundle.summary.variantsApplied} />
              <SummaryPill label="variants disliked" value={bundle.summary.variantsDisliked} tone="danger" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-border-mid shrink-0">
          {(["rejections", "edits", "variants", "approvals"] as TabKey[]).map((tab) => {
            const count = bundle
              ? tab === "rejections"
                ? bundle.signals.rejections.length
                : tab === "edits"
                  ? bundle.signals.edits.length
                  : tab === "variants"
                    ? bundle.signals.variantActivity.length
                    : bundle.signals.approvals.length
              : 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[0.65rem] font-semibold uppercase tracking-[0.08em] px-3 py-2 border-b-2 -mb-px transition-colors cursor-pointer bg-transparent ${
                  activeTab === tab
                    ? "border-brand-white text-brand-white"
                    : "border-transparent text-muted hover:text-brand-white"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loading && !bundle && (
            <p className="text-[0.75rem] text-muted">Loading feedback...</p>
          )}
          {bundle && (
            <InspectorList
              bundle={bundle}
              tab={activeTab}
              expanded={expanded}
              setExpanded={setExpanded}
              highlightSet={highlightSet}
            />
          )}
        </div>

        {/* Footer */}
        {!reviewOnly && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-mid shrink-0">
            <button
              onClick={onClose}
              disabled={generating}
              className="text-[0.7rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-3 py-1.5 cursor-pointer hover:text-brand-white disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={() => onGenerate(days)}
              disabled={generating || !bundle}
              className={`text-[0.7rem] font-semibold tracking-[0.04em] rounded px-4 py-1.5 transition-all ${
                generating || !bundle
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-brand-white text-brand-black cursor-pointer"
              }`}
            >
              {generating ? "LORENZO IS THINKING..." : "GENERATE PROPOSAL"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "amber";
}) {
  const toneCls =
    tone === "danger" ? "text-danger" : tone === "amber" ? "text-amber-400" : "text-brand-white";
  return (
    <span className="flex items-center gap-1">
      <span className={`font-semibold ${toneCls}`}>{value}</span>
      <span className="text-muted text-[0.65rem]">{label}</span>
    </span>
  );
}

function InspectorList({
  bundle,
  tab,
  expanded,
  setExpanded,
  highlightSet,
}: {
  bundle: FeedbackBundle;
  tab: TabKey;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  highlightSet: Set<string>;
}) {
  const toggle = (ref: string) =>
    setExpanded((prev) => ({ ...prev, [ref]: !prev[ref] }));

  const items = (() => {
    if (tab === "rejections") {
      return bundle.signals.rejections.map((s, i) => ({
        ref: `rejection-${i}`,
        summary: `${s.date} · Story ${s.storyIndex} · ${s.story.division}`,
        title: s.story.headline || "(no headline)",
        detail: (
          <div className="space-y-2">
            <DetailRow label="Reason" value={s.reason || "(no reason given)"} tone="danger" />
            <DetailRow label="Headline" value={s.story.headline} />
            <DetailRow label="Body" value={s.story.body} />
            <DetailRow label="Source" value={s.story.sourceTag} />
          </div>
        ),
      }));
    }
    if (tab === "edits") {
      return bundle.signals.edits.map((s, i) => ({
        ref: `edit-${i}`,
        summary: `${s.date} · Story ${s.storyIndex} · changed: ${s.changedFields.join(", ")}`,
        title: s.final.headline || s.original.headline || "(no headline)",
        detail: (
          <div className="space-y-3">
            {s.original.headline !== s.final.headline && (
              <DiffPair label="Headline" before={s.original.headline} after={s.final.headline} />
            )}
            {s.original.body !== s.final.body && (
              <DiffPair label="Body" before={s.original.body} after={s.final.body} />
            )}
            {s.original.sourceTag !== s.final.sourceTag && (
              <DiffPair label="Source" before={s.original.sourceTag} after={s.final.sourceTag} />
            )}
            {s.changedFields
              .filter((f) => !["headline", "body", "sourceTag"].includes(f))
              .map((f) => {
                type K = keyof typeof s.original;
                return (
                  <DiffPair
                    key={f}
                    label={f}
                    before={String(s.original[f as K] ?? "")}
                    after={String(s.final[f as K] ?? "")}
                  />
                );
              })}
          </div>
        ),
      }));
    }
    if (tab === "variants") {
      return bundle.signals.variantActivity.map((s, i) => ({
        ref: `variant-${i}`,
        summary: `${s.date} · Story ${s.storyIndex} · ${s.applied.length} applied, ${s.disliked.length} disliked`,
        title: `${s.applied.length + s.disliked.length} variant${s.applied.length + s.disliked.length === 1 ? "" : "s"}`,
        detail: (
          <div className="space-y-2">
            {s.applied.map((v) => (
              <div key={v.id} className="text-[0.7rem]">
                <span className="text-success font-semibold">applied ({v.appliedMode}):</span>{" "}
                <span className="text-brand-white/70">{v.headline}</span>
              </div>
            ))}
            {s.disliked.map((v) => (
              <div key={v.id} className="text-[0.7rem]">
                <span className="text-danger font-semibold">disliked:</span>{" "}
                <span className="text-brand-white/70">{v.headline}</span>
              </div>
            ))}
          </div>
        ),
      }));
    }
    // approvals
    return bundle.signals.approvals.map((s, i) => ({
      ref: `approval-${i}`,
      summary: `${s.date} · Story ${s.storyIndex} · ${s.story.division}`,
      title: s.story.headline || "(no headline)",
      detail: (
        <div className="space-y-2">
          <DetailRow label="Body" value={s.story.body} />
          <DetailRow label="Source" value={s.story.sourceTag} />
        </div>
      ),
    }));
  })();

  if (!items.length) {
    return <p className="text-[0.75rem] text-muted">No {tab} in this window.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isOpen = expanded[item.ref];
        const isHighlighted = highlightSet.has(item.ref);
        return (
          <div
            key={item.ref}
            className={`rounded-lg border transition-colors ${
              isHighlighted ? "border-accent-culture/60 bg-accent-culture/5" : "border-border-mid bg-surface-2"
            }`}
          >
            <button
              onClick={() => toggle(item.ref)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left bg-transparent border-none cursor-pointer hover:bg-border-light"
            >
              <span className="text-[0.55rem] font-mono text-muted shrink-0 w-[70px]">
                {item.ref}
              </span>
              <span className="text-[0.7rem] text-brand-white/80 truncate flex-1">
                {item.title}
              </span>
              <span className="text-[0.6rem] text-muted shrink-0">{item.summary}</span>
              <span className="text-muted text-[0.7rem]">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-border-mid">{item.detail}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="text-[0.7rem] leading-relaxed">
      <div className="text-[0.55rem] uppercase tracking-[0.08em] text-muted mb-0.5">{label}</div>
      <div
        className={`whitespace-pre-wrap break-words ${
          tone === "danger" ? "text-danger/90" : "text-brand-white/80"
        }`}
      >
        {value || <span className="text-muted italic">(empty)</span>}
      </div>
    </div>
  );
}

function DiffPair({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="text-[0.7rem] leading-relaxed">
      <div className="text-[0.55rem] uppercase tracking-[0.08em] text-muted mb-0.5">{label}</div>
      <div className="text-danger/70 line-through whitespace-pre-wrap break-words">
        {before || <span className="italic text-muted">(empty)</span>}
      </div>
      <div className="text-success/90 whitespace-pre-wrap break-words">
        {after || <span className="italic text-muted">(empty)</span>}
      </div>
    </div>
  );
}
