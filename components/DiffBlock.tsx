"use client";

import type { DiffLine } from "@/lib/diff";

interface Props {
  lines: DiffLine[];
  /** Container padding used to compute the -mx/-px pull for added/removed lines. */
  inset?: "x-3" | "x-4";
  className?: string;
}

const NBSP = " ";

export default function DiffBlock({ lines, inset = "x-4", className = "" }: Props) {
  const pull = inset === "x-3" ? "-mx-3 px-3" : "-mx-4 px-4";
  return (
    <div className={`text-[0.7rem] leading-relaxed font-mono ${className}`}>
      {lines.map((d, i) => {
        if (d.type === "same") {
          return (
            <div key={i} className="text-brand-white/40 whitespace-pre-wrap min-h-[1.4em]">
              {d.line || NBSP}
            </div>
          );
        }
        if (d.type === "removed") {
          return (
            <div
              key={i}
              className={`text-danger/70 line-through whitespace-pre-wrap bg-danger/5 min-h-[1.4em] ${pull}`}
            >
              {d.line || NBSP}
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`text-success/90 whitespace-pre-wrap bg-success/5 min-h-[1.4em] ${pull}`}
          >
            {d.line || NBSP}
          </div>
        );
      })}
    </div>
  );
}
