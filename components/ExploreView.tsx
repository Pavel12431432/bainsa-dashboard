"use client";

import { useMemo } from "react";
import { Story } from "@/types";
import { Variant, ApplyMode } from "@/lib/variants";
import { VARIANT_FIELDS } from "@/lib/storyUtils";
import { timeAgo } from "@/lib/time";
import StoryCard from "./StoryCard";
import PreviewPanel from "./PreviewPanel";

interface Props {
  baseStory: Story;
  variants: Variant[];
  generating: boolean;
  error: string;
  onGenerate: () => void;
  onApply: (variant: Variant, mode: ApplyMode) => void;
  onDislike: (variant: Variant, disliked: boolean) => void;
  preview: "card" | "phone";
  onPreviewChange: (mode: "card" | "phone") => void;
  onFullscreen: (story: Story) => void;
}

function mergeVariantIntoStory(base: Story, v: Variant): Story {
  const out = { ...base };
  for (const k of VARIANT_FIELDS) {
    (out as Record<string, unknown>)[k] = v[k];
  }
  return out;
}

function variantMatchesStory(v: Variant, s: Story): boolean {
  return VARIANT_FIELDS.every((k) => (s as unknown as Record<string, unknown>)[k] === v[k]);
}

interface Batch {
  batchId: string;
  generatedAt: string;
  variants: Variant[];
}

function groupByBatch(list: Variant[]): Batch[] {
  const map = new Map<string, Batch>();
  for (const v of list) {
    const existing = map.get(v.batchId);
    if (existing) existing.variants.push(v);
    else map.set(v.batchId, { batchId: v.batchId, generatedAt: v.generatedAt, variants: [v] });
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

export default function ExploreView({
  baseStory, variants, generating, error, onGenerate, onApply, onDislike,
  preview, onPreviewChange, onFullscreen,
}: Props) {
  const active = useMemo(() => variants.filter((v) => !v.dislikedAt), [variants]);
  const archived = useMemo(() => variants.filter((v) => v.dislikedAt), [variants]);
  const activeBatches = useMemo(() => groupByBatch(active), [active]);

  return (
    <div className="flex flex-1 overflow-hidden max-md:flex-col">
      <PreviewPanel
        story={baseStory}
        preview={preview}
        onPreviewChange={onPreviewChange}
        onFullscreen={() => onFullscreen(baseStory)}
      />

      {/* Grid pane */}
      <div className="flex-1 p-6 overflow-y-auto max-md:p-4">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[0.7rem] text-muted tracking-[0.06em]">
            {variants.length === 0
              ? "Generate 3 alternatives from Sofia to explore variations."
              : `${active.length} active · ${archived.length} archived`}
          </div>
          <button
            onClick={onGenerate}
            disabled={generating}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[0.65rem] font-semibold tracking-[0.08em] border-none ${
              generating
                ? "bg-border-mid text-muted cursor-not-allowed"
                : "bg-brand-white text-brand-black cursor-pointer"
            }`}
          >
            {generating && <Spinner />}
            {generating ? "GENERATING..." : "GENERATE 3 NEW"}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md bg-danger/10 border border-danger/30 text-danger text-[0.7rem]">
            {error}
          </div>
        )}

        {/* Mobile baseline */}
        <div className="hidden max-lg:block mb-6">
          <div className="text-[0.6rem] text-muted tracking-[0.1em] font-semibold mb-2">CURRENT</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            <StoryCard story={baseStory} />
          </div>
        </div>

        {/* Generating skeleton — shown above existing batches */}
        {generating && (
          <div className="mb-6">
            <div className="text-[0.6rem] text-muted tracking-[0.1em] font-semibold mb-2 flex items-center gap-2">
              <Spinner /> SOFIA IS GENERATING...
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[9/16] rounded-2xl bg-surface-2 border border-border-light animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Active batches */}
        {activeBatches.map((batch) => (
          <div key={batch.batchId} className="mb-6">
            <div className="text-[0.6rem] text-muted tracking-[0.1em] font-semibold mb-2">
              GENERATED {timeAgo(batch.generatedAt).toUpperCase()}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {batch.variants.map((v) => (
                <VariantCard
                  key={v.id}
                  baseStory={baseStory}
                  variant={v}
                  onApply={onApply}
                  onDislike={onDislike}
                  onFullscreen={onFullscreen}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Archive */}
        {archived.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border-light">
            <div className="text-[0.6rem] text-muted tracking-[0.1em] font-semibold mb-3">
              ARCHIVED ({archived.length})
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 opacity-50">
              {archived.map((v) => (
                <VariantCard
                  key={v.id}
                  baseStory={baseStory}
                  variant={v}
                  onApply={onApply}
                  onDislike={onDislike}
                  onFullscreen={onFullscreen}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface CardProps {
  baseStory: Story;
  variant: Variant;
  onApply: (variant: Variant, mode: ApplyMode) => void;
  onDislike: (variant: Variant, disliked: boolean) => void;
  onFullscreen: (story: Story) => void;
}

function VariantCard({ baseStory, variant, onApply, onDislike, onFullscreen }: CardProps) {
  const merged = mergeVariantIntoStory(baseStory, variant);
  const isArchived = !!variant.dislikedAt;
  const isCurrentlyApplied = !!variant.appliedAt && variantMatchesStory(variant, baseStory);

  return (
    <div className="relative flex flex-col gap-2">
      <div className="relative group/variant cursor-pointer" onClick={() => onFullscreen(merged)}>
        <StoryCard story={merged} />
        <button
          onClick={(e) => { e.stopPropagation(); onFullscreen(merged); }}
          className="absolute bottom-1.5 right-1.5 p-1.5 rounded-md bg-black/50 border-none cursor-pointer opacity-0 group-hover/variant:opacity-60 hover:!opacity-100 transition-opacity duration-150"
          title="Fullscreen preview"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 1 13 1 13 5" />
            <polyline points="5 13 1 13 1 9" />
            <line x1="13" y1="1" x2="8.5" y2="5.5" />
            <line x1="1" y1="13" x2="5.5" y2="8.5" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDislike(variant, !isArchived); }}
          title={isArchived ? "Restore from archive" : "Archive"}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 border-none cursor-pointer flex items-center justify-center text-muted hover:text-brand-white text-[0.75rem] transition-colors"
        >
          {isArchived ? "↺" : "✕"}
        </button>
        {isCurrentlyApplied && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm bg-success/90 text-brand-black text-[0.55rem] font-semibold tracking-[0.04em]">
            APPLIED
          </div>
        )}
      </div>

      <button
        onClick={() => onApply(variant, "all")}
        className="py-1.5 rounded-md bg-border-mid hover:bg-brand-white hover:text-brand-black text-brand-white text-[0.65rem] font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors"
      >
        APPLY
      </button>
      <div className="flex gap-2 text-[0.55rem] text-muted tracking-[0.06em]">
        <button
          onClick={() => onApply(variant, "text")}
          className="bg-transparent border-none text-muted hover:text-brand-white cursor-pointer p-0"
        >
          text only
        </button>
        <span className="opacity-40">·</span>
        <button
          onClick={() => onApply(variant, "design")}
          className="bg-transparent border-none text-muted hover:text-brand-white cursor-pointer p-0"
        >
          design only
        </button>
      </div>
    </div>
  );
}
