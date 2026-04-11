"use client";

import { HistoryEntry } from "@/types";

interface Props {
  entries: HistoryEntry[];
  viewingIdx: number | null;
  onSelect: (idx: number) => void;
  onRestore: () => void;
  onBack: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function VersionTimeline({ entries, viewingIdx, onSelect, onRestore, onBack }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col border border-border-mid rounded-lg">
      {/* Viewing banner */}
      {viewingIdx !== null && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-border-light">
          <p className="text-[0.7rem] text-brand-white opacity-70 m-0">
            Viewing: {entries[viewingIdx].label}
          </p>
          <div className="flex gap-2 shrink-0">
            {viewingIdx < entries.length - 1 && (
              <button
                onClick={onRestore}
                className="text-[0.65rem] font-semibold text-success bg-transparent border border-success/30 rounded px-2.5 py-1 cursor-pointer hover:bg-success/10"
              >
                RESTORE
              </button>
            )}
            <button
              onClick={onBack}
              className="text-[0.65rem] font-semibold text-muted bg-transparent border border-border-mid rounded px-2.5 py-1 cursor-pointer hover:text-brand-white"
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* Entry list — newest first */}
      <div className="max-h-40 overflow-y-auto">
        {[...entries].reverse().map((entry, ri) => {
          const idx = entries.length - 1 - ri;
          const isActive = viewingIdx === idx;
          const isCurrent = viewingIdx === null && idx === entries.length - 1;

          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              className={`w-full flex items-center gap-3 px-3.5 py-2 text-left bg-transparent border-none cursor-pointer hover:bg-border-light ${
                isActive ? "bg-border-light" : ""
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? "bg-brand-white" : isCurrent ? "bg-success" : "bg-border-mid"
                }`}
              />
              <span className="text-[0.7rem] text-brand-white opacity-80 truncate flex-1">
                {entry.label}
              </span>
              <span className="text-[0.6rem] text-muted shrink-0">
                {timeAgo(entry.timestamp)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
