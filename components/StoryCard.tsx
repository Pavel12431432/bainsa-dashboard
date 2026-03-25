"use client";

import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  /** Display scale — 1 = full 405×720. Default 0.5 for grid view. */
  scale?: number;
}

export default function StoryCard({ story, scale = 0.72 }: Props) {
  const displayW = 405 * scale;
  const displayH = 720 * scale;

  return (
    <div
      style={{
        width: displayW,
        height: displayH,
        position: "relative",
        borderRadius: 24 * scale,
        overflow: "hidden",
        flexShrink: 0,
        background: "#0a0a0a",
        border: "1px solid #222",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Scale wrapper: render at full size then scale down */}
      <div
        style={{
          width: 405,
          height: 720,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <StoryContent story={story} />
      </div>
    </div>
  );
}
