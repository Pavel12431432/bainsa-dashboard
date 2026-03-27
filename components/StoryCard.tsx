"use client";

import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  scale?: number; // explicit scale for editor preview; omit for CSS-only (no CLS)
}

export default function StoryCard({ story, scale }: Props) {
  if (scale !== undefined) {
    // Fixed mode: explicit pixel dimensions, used in editor preview (no CLS concern)
    return (
      <div
        className="relative overflow-hidden shrink-0 bg-brand-black border border-border-light rounded-2xl"
        style={{
          width: 405 * scale,
          height: 720 * scale,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="absolute top-0 left-0"
          style={{ width: 405, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <StoryContent story={story} />
        </div>
      </div>
    );
  }

  // CSS-only mode: card fills its grid column (capped at 405px), no JS, no CLS.
  // Scaling uses the trig identity: tan(atan2(100cqw, 405px)) produces a
  // dimensionless ratio (container width / 405), which scale() accepts.
  return (
    <div
      className="story-card-auto relative overflow-hidden bg-brand-black border border-border-light rounded-2xl"
      style={{
        width: "100%",
        maxWidth: 405,
        aspectRatio: "9/16",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="story-card-auto-inner absolute top-0 left-0"
        style={{ width: 405, height: 720, transformOrigin: "top left" }}
      >
        <StoryContent story={story} />
      </div>
    </div>
  );
}
