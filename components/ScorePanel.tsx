"use client";

import { useState } from "react";
import type { StoryScore } from "@/types";

interface Props {
  score: StoryScore;
}

function scoreColor(value: number): string {
  if (value >= 80) return "#22c55e";  // success green
  if (value >= 60) return "#eab308";  // amber
  return "#ef4444";                   // danger red
}

function chipStyle(value: number | null): React.CSSProperties {
  if (value === null) {
    return {
      background: "transparent",
      borderColor: "var(--color-border-input)",
      color: "var(--color-muted)",
      opacity: 0.5,
    };
  }
  const c = scoreColor(value);
  return {
    background: `${c}1A`,        // ~10% alpha
    borderColor: `${c}4D`,       // ~30% alpha
    color: c,
  };
}

export default function ScorePanel({ score }: Props) {
  const [expanded, setExpanded] = useState(false);

  const chips: Array<{ label: string; value: number | null; rationale: string | null }> = [
    { label: "BRAND", value: score.brandVoice, rationale: score.brandVoiceRationale },
    { label: "HOOK", value: score.engagement, rationale: score.engagementRationale },
    { label: "TOPIC", value: score.topicCoherence, rationale: score.topicCoherenceRationale },
  ];

  const totalColor = scoreColor(score.total);

  return (
    <div className="mt-2 px-1">
      {/* Collapsed bar — always visible, click to toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full group flex items-center gap-2 cursor-pointer py-1"
        aria-label={expanded ? "Collapse Anna's evaluation" : "Expand Anna's evaluation"}
        aria-expanded={expanded}
      >
        <span className="text-[0.5rem] uppercase tracking-[0.12em] font-semibold text-brand-white/30 group-hover:text-brand-white/55 transition-colors">
          ANNA
        </span>
        <div className="flex-1 h-[3px] rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, score.total))}%`,
              background: totalColor,
              boxShadow: `0 0 6px ${totalColor}55`,
            }}
          />
        </div>
        <span
          className="text-[0.7rem] font-bold tabular-nums leading-none"
          style={{ color: totalColor }}
        >
          {score.total}
        </span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 8 8"
          className={`text-brand-white/30 group-hover:text-brand-white/60 transition-all duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded body — smooth reveal via grid-template-rows */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-2 space-y-2">
            {/* Three chips */}
            <div className="flex items-stretch gap-1.5">
              {chips.map((chip) => (
                <div
                  key={chip.label}
                  className="flex-1 flex flex-col items-center justify-center py-1 rounded-[4px] border text-[0.55rem] font-semibold tracking-[0.06em]"
                  style={chipStyle(chip.value)}
                >
                  <span className="opacity-70">{chip.label}</span>
                  <span className="text-[0.85rem] tabular-nums leading-tight mt-0.5">
                    {chip.value === null ? "—" : chip.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Rationales */}
            <div className="space-y-1 text-[0.6rem] leading-snug text-brand-white/60 px-0.5">
              {chips
                .filter((c) => c.rationale)
                .map((c) => (
                  <p key={c.label}>
                    <span className="font-semibold opacity-80">{c.label}:</span>{" "}
                    {c.rationale}
                  </p>
                ))}
              <p className="opacity-30 pt-0.5 text-[0.55rem]">
                evaluated {new Date(score.evaluatedAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
