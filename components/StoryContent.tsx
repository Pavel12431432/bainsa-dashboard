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

const HEADLINE_SIZE = {
  large: "2.5rem",
  default: "2rem",
  compact: "1.5rem",
} as const;

function BodyContent({ story }: { story: Story }) {
  const { body, contentType, accentColor, bodyWeight, textAlign } = story;
  const weight = bodyWeight === "semibold" ? 600 : 400;
  const align = textAlign === "justify" ? ("justify" as const) : ("left" as const);

  if (contentType === "bullets") {
    const lines = body.split(/\n/).map((l) => l.replace(/^>\s*/, "").trim()).filter(Boolean);
    return (
      <ul className="list-none p-0 mt-4 flex flex-col gap-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2.5 text-brand-white opacity-70">
            <ChevronAccent color={accentColor} />
            <span
              className="text-[length:var(--text-body)] leading-[1.55] flex-1"
              style={{ fontWeight: weight, textAlign: align }}
            >
              {line}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (contentType === "quote") {
    return (
      <div className="mt-4 flex gap-3">
        <div className="w-[3px] shrink-0 rounded-full" style={{ background: accentColor }} />
        <p
          className="text-[length:var(--text-body)] text-brand-white opacity-70 leading-[1.55] m-0 italic"
          style={{ fontWeight: weight, textAlign: align }}
        >
          {body}
        </p>
      </div>
    );
  }

  // Default: text
  return (
    <p
      className="text-[length:var(--text-body)] text-brand-white opacity-70 leading-[1.55] mt-4 m-0"
      style={{ fontWeight: weight, textAlign: align }}
    >
      {body}
    </p>
  );
}

export default function StoryContent({ story }: { story: Story }) {
  const { accentColor, headline, sourceTag, cornerAccent, layout, headlineSize } = story;

  const headlineFontSize = HEADLINE_SIZE[headlineSize] || HEADLINE_SIZE.default;

  // Layout controls flex ordering and spacing
  const isCenter = layout === "center";
  const isBottom = layout === "bottom";

  return (
    <div className="story-content">
      {/* Top accent border */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accentColor }} />

      {/* Header row — always at top */}
      <div className="flex items-center justify-between pt-3">
        <span className="story-logo text-[length:var(--text-logo)] font-semibold text-brand-white tracking-[0.08em]">
          BAINSA
        </span>
        {cornerAccent === "+" ? (
          <PlusAccent color={accentColor} />
        ) : (
          <ChevronAccent color={accentColor} />
        )}
      </div>

      {/* Top spacer — grows to push content down for center/bottom layouts */}
      <div className={isBottom ? "flex-1" : isCenter ? "flex-1" : "grow-0 shrink basis-[60px] flex-[1_0_60px]"} />

      {/* Source tag at top for bottom layout */}
      {isBottom && (
        <p
          className="text-[length:var(--text-source)] font-semibold m-0 text-left tracking-[0.04em] uppercase mb-4"
          style={{ color: accentColor }}
        >
          {cornerAccent} {sourceTag}
        </p>
      )}

      {/* Headline */}
      <p
        className="story-headline font-semibold text-brand-white leading-[1.15] m-0 text-left"
        style={{ fontSize: headlineFontSize }}
      >
        {headline}
      </p>

      {/* Body */}
      <BodyContent story={story} />

      {/* Bottom spacer — grows for center layout */}
      <div className={isCenter ? "flex-1" : isBottom ? "grow-0 shrink basis-[20px]" : "flex-1"} />

      {/* Source tag at bottom for top/center layouts */}
      {!isBottom && (
        <p
          className="text-[length:var(--text-source)] font-semibold m-0 text-left tracking-[0.04em] uppercase"
          style={{ color: accentColor }}
        >
          {cornerAccent} {sourceTag}
        </p>
      )}
    </div>
  );
}
