"use client";

import { useState } from "react";
import { Story } from "@/types";
import { captureStories } from "@/lib/exportCards";

interface Props {
  stories: Story[];
  approvedIndices?: number[];
  date: string;
  onClose: () => void;
}

export default function ExportDialog({ stories, approvedIndices = [], date, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(() => {
    // Pre-select approved stories if any, otherwise select all
    if (approvedIndices.length > 0) return new Set(approvedIndices);
    return new Set(stories.map((s) => s.index));
  });
  const [format, setFormat] = useState<"zip" | "individual">("zip");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(stories.map((s) => s.index))); }
  function deselectAll() { setSelected(new Set()); }

  async function handleExport() {
    const toExport = stories.filter((s) => selected.has(s.index));
    if (toExport.length === 0) return;

    setExporting(true);
    setProgress({ current: 0, total: toExport.length });

    try {
      await captureStories(toExport, date, format, (current, total) => {
        setProgress({ current, total });
      });
    } finally {
      setExporting(false);
      onClose();
    }
  }

  const tabBtn = (active: boolean) =>
    `flex-1 py-1.5 text-[0.7rem] font-semibold tracking-[0.04em] rounded border cursor-pointer transition-colors duration-150 ${
      active
        ? "border-brand-white bg-brand-white text-brand-black"
        : "border-border-mid bg-transparent text-brand-white opacity-40 hover:opacity-70"
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] bg-surface border border-border-mid rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <span className="text-xs font-semibold text-brand-white tracking-[0.08em]">EXPORT STORIES</span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-brand-white opacity-40 hover:opacity-80 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Story list */}
        <div className="px-6 pt-4 pb-2 max-h-[50vh] overflow-y-auto">
          {stories.map((story) => (
            <label
              key={story.index}
              className="flex items-center gap-3 py-2.5 cursor-pointer group"
            >
              <span
                onClick={() => toggle(story.index)}
                className={`w-3.5 h-3.5 rounded-sm border shrink-0 cursor-pointer flex items-center justify-center ${
                  selected.has(story.index)
                    ? "bg-border-mid border-border-mid"
                    : "bg-transparent border-[#444]"
                }`}
              >
                {selected.has(story.index) && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </span>
              <span className="flex-1 text-[0.8rem] text-brand-white opacity-60 group-hover:opacity-90 transition-opacity leading-tight">
                {story.index}. {story.headline}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: story.accentColor }}
              />
            </label>
          ))}
        </div>

        {/* Quick selection */}
        <div className="px-6 pb-3 flex gap-3">
          <button onClick={selectAll} className="bg-transparent border-none text-[0.65rem] text-brand-white opacity-35 hover:opacity-60 cursor-pointer p-0">
            Select all
          </button>
          <button onClick={deselectAll} className="bg-transparent border-none text-[0.65rem] text-brand-white opacity-35 hover:opacity-60 cursor-pointer p-0">
            Clear
          </button>
          {approvedIndices.length > 0 && (
            <button
              onClick={() => setSelected(new Set(approvedIndices))}
              className="bg-transparent border-none text-[0.65rem] text-success/70 hover:text-success cursor-pointer p-0"
            >
              Approved only
            </button>
          )}
        </div>

        {/* Format toggle */}
        <div className="px-6 pb-4">
          <p className="text-[0.65rem] text-brand-white opacity-35 mb-2 font-semibold tracking-[0.04em]">FORMAT</p>
          <div className="flex gap-2">
            <button onClick={() => setFormat("zip")} className={tabBtn(format === "zip")}>ZIP</button>
            <button onClick={() => setFormat("individual")} className={tabBtn(format === "individual")}>INDIVIDUAL</button>
          </div>
        </div>

        {/* Progress bar */}
        {exporting && (
          <div className="px-6 pb-4">
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-white transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[0.65rem] text-brand-white opacity-35 mt-1.5">
              Exporting {progress.current} of {progress.total}...
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 py-2.5 rounded-lg border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.04em] cursor-pointer opacity-50 hover:opacity-80 transition-opacity disabled:opacity-25"
          >
            CANCEL
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            className="flex-1 py-2.5 rounded-lg bg-brand-white text-brand-black text-xs font-semibold tracking-[0.04em] border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {exporting ? "EXPORTING..." : `EXPORT (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
