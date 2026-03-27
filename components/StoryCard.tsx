"use client";

import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  scale?: number; // explicit scale for editor preview; omit for CSS-only (no CLS)
}

export default function StoryCard({ story, scale }: Props) {
  const fixedMode = scale !== undefined;

  return (
    <div
      className="relative overflow-hidden bg-brand-black border border-border-light rounded-2xl"
      style={{
        ...(fixedMode
          ? { width: 405 * scale, height: 720 * scale }
          : { width: "100%", aspectRatio: "9/16" }),
        containerType: "inline-size",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: 405,
          height: 720,
          transform: "scale(calc(100cqw / 405))",
          transformOrigin: "top left",
        }}
      >
        <StoryContent story={story} />
      </div>
    </div>
  );
}
