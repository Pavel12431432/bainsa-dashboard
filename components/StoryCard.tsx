"use client";

import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  scale?: number;
}

export default function StoryCard({ story, scale = 0.72 }: Props) {
  const displayW = 405 * scale;
  const displayH = 720 * scale;

  return (
    <div
      className="relative overflow-hidden shrink-0 bg-brand-black border border-border-light"
      style={{
        width: displayW,
        maxWidth: "100%",
        height: displayH,
        borderRadius: 24 * scale,
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
