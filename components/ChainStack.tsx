"use client";

import { useState, useEffect, useRef } from "react";
import { Story } from "@/types";

export type ChainDotState = "approved" | "stale" | "rejected" | "pending";

export interface ChainDot {
  state: ChainDotState;
  /** When true, draws a red outline ring on the dot. Overlays the state color. */
  complianceFail?: boolean;
}

interface Props {
  /** Chain name (used in aria-labels, not displayed in the grid). */
  chain: string;
  /** Stories in chain order (hook → develop → closer). */
  stories: Story[];
  /** One entry per story, same order as `stories`. */
  dotStates: ChainDot[];
  /** Render the visual layer for one card (StoryCard + per-card overlays). */
  renderCardVisual: (story: Story, isTop: boolean) => React.ReactNode;
  /** Render the top-card action area (mobile buttons + feedback preview). */
  renderActions: (topStory: Story) => React.ReactNode;
  /**
   * Open the fullscreen chain view, starting at the given story index
   * (1-based, matches `Story.index`). Phase 6 wires the real fullscreen;
   * phase 4 passes a stub.
   */
  onOpenFullscreen: (storyIndex: number) => void;
}

const VISIBLE_DEPTH = 3;             // top card + 2 behind
const EDGE_ZONE_WIDTH = 50;          // px — left/right strip for cycle
const EDGE_ZONE_BOTTOM_INSET = 80;   // px — keep clear of the action bar overlay
const ANIM_MS = 200;

// Per-state dot colors. Mirrors the per-card glow palette used in StoryGrid.
const DOT_COLOR: Record<ChainDotState, string> = {
  approved: "#22c55e",   // success
  stale:    "#f59e0b",   // amber
  rejected: "#ef4444",   // danger
  pending:  "#666666",   // muted
};

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ChainStack({
  chain,
  stories,
  dotStates,
  renderCardVisual,
  renderActions,
  onOpenFullscreen,
}: Props) {
  const [topIndex, setTopIndex] = useState(0);
  const total = stories.length;

  // Clamp topIndex if stories length changes (e.g., after a save that
  // edited chain metadata, or a regenerate)
  useEffect(() => {
    if (topIndex >= total) setTopIndex(0);
  }, [total, topIndex]);

  function cycle(direction: 1 | -1) {
    setTopIndex((p) => (p + direction + total) % total);
  }

  const topStory = stories[topIndex];

  return (
    <div className="group/chain">
      {/* Stack — each card absolutely positioned with depth offset.
          No click handler on the root: navigation is via edge chevrons
          (cycle) or middle click (open fullscreen). */}
      <div
        className="relative select-none"
        style={{ aspectRatio: "9/16", width: "100%", maxWidth: 405 }}
      >
        {/* Cards */}
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
              className="absolute inset-0"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
                transformOrigin: "top left",
                zIndex: total - offset,
                opacity: isTop ? 1 : Math.max(0.45, 0.85 - offset * 0.18),
                pointerEvents: isTop ? "auto" : "none",
                filter: isTop ? "none" : `brightness(${0.85 - offset * 0.08})`,
                transition: `transform ${ANIM_MS}ms ease, opacity ${ANIM_MS}ms ease, filter ${ANIM_MS}ms ease`,
              }}
            >
              {renderCardVisual(story, isTop)}
            </div>
          );
        })}

        {/* Hover layer — sits above cards but below the action bar overlay.
            Click in the middle opens fullscreen; left/right edges cycle.
            Pointer-events:none on the container so individual zones decide. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: total + 1 }}
        >
          {total > 1 && (
            <>
              {/* Left edge strip (prev) */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); cycle(-1); }}
                aria-label={`Previous card in chain "${chain}"`}
                data-stack-no-cycle
                className="absolute top-0 left-0 flex items-center justify-center text-brand-white opacity-0 group-hover/chain:opacity-70 hover:!opacity-100 transition-opacity duration-150 pointer-events-auto cursor-pointer"
                style={{
                  width: EDGE_ZONE_WIDTH,
                  bottom: EDGE_ZONE_BOTTOM_INSET,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                }}
              >
                <span className="rounded-full bg-black/55 backdrop-blur-sm p-1.5">
                  <ChevronLeft />
                </span>
              </button>

              {/* Right edge strip (next) */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); cycle(1); }}
                aria-label={`Next card in chain "${chain}"`}
                data-stack-no-cycle
                className="absolute top-0 right-0 flex items-center justify-center text-brand-white opacity-0 group-hover/chain:opacity-70 hover:!opacity-100 transition-opacity duration-150 pointer-events-auto cursor-pointer"
                style={{
                  width: EDGE_ZONE_WIDTH,
                  bottom: EDGE_ZONE_BOTTOM_INSET,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                }}
              >
                <span className="rounded-full bg-black/55 backdrop-blur-sm p-1.5">
                  <ChevronRight />
                </span>
              </button>
            </>
          )}

          {/* Middle zone — click anywhere not in an edge strip to open
              fullscreen. Sits *under* the action bar (which has its own
              click handlers + stopPropagation), so EDIT/APPROVE/REJECT
              still fire normally. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenFullscreen(topStory.index); }}
            aria-label={`Open chain "${chain}" in fullscreen`}
            data-stack-no-cycle
            className="absolute opacity-0 hover:opacity-100 transition-opacity duration-150 pointer-events-auto cursor-zoom-in"
            style={{
              left: total > 1 ? EDGE_ZONE_WIDTH : 0,
              right: total > 1 ? EDGE_ZONE_WIDTH : 0,
              top: 0,
              bottom: EDGE_ZONE_BOTTOM_INSET,
              background: "transparent",
              border: 0,
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Dots indicator — status-colored, click to cycle (or open fullscreen
          if dot is already on top). Renders even for single-card chains so
          the position is visible (though edge chevrons don't show). */}
      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" data-stack-no-cycle>
          {stories.map((story, i) => {
            const isActive = i === topIndex;
            const dot = dotStates[i];
            const color = DOT_COLOR[dot?.state ?? "pending"];
            const fail = !!dot?.complianceFail;
            return (
              <button
                key={story.index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isActive) onOpenFullscreen(story.index);
                  else setTopIndex(i);
                }}
                aria-label={
                  isActive
                    ? `Open card ${i + 1} of ${total} in fullscreen`
                    : `Show card ${i + 1} of ${total}`
                }
                className="rounded-full transition-all duration-200 cursor-pointer"
                style={{
                  height: 6,
                  width: isActive ? 24 : 8,
                  background: color,
                  opacity: isActive ? 1 : 0.55,
                  outline: fail ? "1.5px solid #ef4444" : "none",
                  outlineOffset: fail ? 2 : 0,
                  border: 0,
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Top-card actions (mobile buttons + feedback preview). */}
      <div data-stack-no-cycle>
        {renderActions(topStory)}
      </div>
    </div>
  );
}
