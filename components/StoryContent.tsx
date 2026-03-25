"use client";

import { Story } from "@/types";

interface Props {
  story: Story;
  /** Scale factor — 1 = full 405×720, 0.5 = half size etc. */
  scale?: number;
}

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

export default function StoryContent({ story, scale = 1 }: Props) {
  const { accentColor, headline, body, sourceTag, cornerAccent } = story;

  return (
    <div
      className="story-content"
      style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}
    >
      {/* Top accent border */}
      <div style={{ height: "3px", background: accentColor, margin: "0 -28px", position: "absolute", top: 0, left: 0, right: 0 }} />

      {/* Header row */}
      <div className="flex items-center justify-between pt-3 mb-auto">
        <span
          style={{
            fontSize: "var(--text-logo)",
            fontWeight: 600,
            color: "var(--brand-white)",
            letterSpacing: "0.08em",
          }}
        >
          BAINSA
        </span>
        {cornerAccent === "+" ? (
          <PlusAccent color={accentColor} />
        ) : (
          <ChevronAccent color={accentColor} />
        )}
      </div>

      {/* Spacer — pushes headline to upper-middle */}
      <div style={{ flex: "1 0 60px" }} />

      {/* Headline */}
      <p
        style={{
          fontSize: "var(--text-headline)",
          fontWeight: 600,
          color: "var(--brand-white)",
          lineHeight: 1.15,
          margin: 0,
          textAlign: "left",
        }}
      >
        {headline}
      </p>

      {/* Body */}
      <p
        style={{
          fontSize: "var(--text-body)",
          fontWeight: 400,
          color: "var(--brand-white)",
          opacity: 0.7,
          lineHeight: 1.55,
          marginTop: "16px",
          textAlign: "left",
        }}
      >
        {body}
      </p>

      {/* Spacer — pushes source to bottom */}
      <div style={{ flex: 1 }} />

      {/* Source tag */}
      <p
        style={{
          fontSize: "var(--text-source)",
          fontWeight: 600,
          color: accentColor,
          margin: 0,
          textAlign: "left",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {cornerAccent} {sourceTag}
      </p>
    </div>
  );
}
