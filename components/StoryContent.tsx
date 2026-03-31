"use client";

import { Story } from "@/types";

function ChevronAccent({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 4L20 14L8 24" stroke={color} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function PlusAccent({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3V25M3 14H25" stroke={color} strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}

export default function StoryContent({ story }: { story: Story }) {
  const { accentColor, headline, body, sourceTag, cornerAccent } = story;

  return (
    <div className="story-content">
      {/* Top accent border */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />

      {/* Header row */}
      <div className="flex items-center justify-between pt-3 mb-auto">
        <span className="story-logo text-[length:var(--text-logo)] font-semibold text-brand-white tracking-[0.08em]">
          BAINSA
        </span>
        {cornerAccent === "+" ? (
          <PlusAccent color={accentColor} />
        ) : (
          <ChevronAccent color={accentColor} />
        )}
      </div>

      {/* Spacer */}
      <div className="grow-0 shrink basis-[60px] flex-[1_0_60px]" />

      {/* Headline */}
      <p className="story-headline text-[length:var(--text-headline)] font-semibold text-brand-white leading-[1.15] m-0 text-left">
        {headline}
      </p>

      {/* Body */}
      <p className="text-[length:var(--text-body)] text-brand-white opacity-70 leading-[1.55] mt-4 text-left">
        {body}
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Source tag */}
      <p
        className="text-[length:var(--text-source)] font-semibold m-0 text-left tracking-[0.04em] uppercase"
        style={{ color: accentColor }}
      >
        {cornerAccent} {sourceTag}
      </p>
    </div>
  );
}
