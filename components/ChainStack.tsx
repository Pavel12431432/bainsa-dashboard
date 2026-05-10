"use client";

import { useState, useEffect, useRef } from "react";
import { Story } from "@/types";

interface Props {
  chain: string;
  stories: Story[];
  /** Render the visual layer for one card (StoryCard + per-card overlays). */
  renderCardVisual: (story: Story, isTop: boolean) => React.ReactNode;
  /** Render the top-card action area (mobile buttons + feedback preview). */
  renderActions: (story: Story) => React.ReactNode;
  /** Open fullscreen carousel. */
  onExpand?: () => void;
}

const VISIBLE_DEPTH = 3; // top card + 2 behind

export default function ChainStack({ chain, stories, renderCardVisual, renderActions, onExpand }: Props) {
  const [topIndex, setTopIndex] = useState(0);
  const total = stories.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef(0);

  // Clamp topIndex if stories length changes (e.g., after a save)
  useEffect(() => {
    if (topIndex >= total) setTopIndex(0);
  }, [total, topIndex]);

  function cycle(direction: 1 | -1) {
    setTopIndex((p) => (p + direction + total) % total);
  }

  // Mouse wheel cycles through cards (debounced so one swipe = one cycle)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dominant = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominant) < 4) return; // ignore tiny accidental scrolls
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelAt.current < 350) return;
      lastWheelAt.current = now;
      cycle(dominant > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const topStory = stories[topIndex];

  return (
    <div className="group/chain">
      {/* Header: chain name · position counter · expand */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-brand-white/10" />
        <span className="text-[0.6rem] uppercase tracking-[0.08em] text-brand-white/60 font-semibold whitespace-nowrap">
          {chain}
        </span>
        <span className="text-[0.55rem] text-brand-white/40 font-medium tabular-nums">
          {topIndex + 1}/{total}
        </span>
        {onExpand && (
          <button
            onClick={onExpand}
            className="text-brand-white/40 hover:text-brand-white/80 transition-colors cursor-pointer p-0.5"
            aria-label="Expand chain to fullscreen"
            title="Expand"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
        <div className="h-px flex-1 bg-brand-white/10" />
      </div>

      {/* Stack — each card absolutely positioned with depth offset */}
      <div
        ref={containerRef}
        onClick={(e) => {
          // Cycle only on direct stack clicks; action buttons inside should stopPropagation.
          if ((e.target as HTMLElement).closest("[data-stack-no-cycle]")) return;
          cycle(1);
        }}
        className="relative cursor-pointer select-none"
        style={{ aspectRatio: "9/16", width: "100%", maxWidth: 405 }}
      >
        {stories.map((story, i) => {
          const offset = (i - topIndex + total) % total;
          if (offset >= VISIBLE_DEPTH) return null;
          const isTop = offset === 0;
          const tx = offset * 8;
          const ty = offset * 6;
          const sc = 1 - offset * 0.04;
          return (
            <div
              key={story.index}
              id={isTop ? `story-${story.index}` : undefined}
              className="absolute inset-0 transition-[transform,opacity,filter] duration-300 ease-out"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
                transformOrigin: "top left",
                zIndex: total - offset,
                opacity: isTop ? 1 : Math.max(0.45, 0.85 - offset * 0.18),
                pointerEvents: isTop ? "auto" : "none",
                filter: isTop ? "none" : `brightness(${0.85 - offset * 0.08})`,
              }}
            >
              {renderCardVisual(story, isTop)}
            </div>
          );
        })}
      </div>

      {/* Dots indicator */}
      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" data-stack-no-cycle>
          {stories.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setTopIndex(i); }}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === topIndex ? "w-6 bg-brand-white/70" : "w-2 bg-brand-white/25 hover:bg-brand-white/45"
              }`}
              aria-label={`Show card ${i + 1} of ${total}`}
            />
          ))}
        </div>
      )}

      {/* Top-card actions (mobile buttons + feedback preview) — outside the stack */}
      <div data-stack-no-cycle>
        {renderActions(topStory)}
      </div>
    </div>
  );
}
