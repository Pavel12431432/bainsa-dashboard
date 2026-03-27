"use client";

import { useRef, useLayoutEffect } from "react";
import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  scale?: number; // explicit scale for editor preview; omit for auto-scaling (no CLS)
}

export default function StoryCard({ story, scale }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Auto-scale: measure container width and set transform before the browser paints.
  // Inner content starts opacity-0 (SSR-safe), then useLayoutEffect reveals it at
  // the correct scale in one frame — no visible flash or layout shift.
  useLayoutEffect(() => {
    if (scale !== undefined) return;
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    const update = () => {
      const s = Math.min(container.clientWidth / 405, 1);
      inner.style.transform = `scale(${s})`;
      inner.style.opacity = "1";
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [scale]);

  if (scale !== undefined) {
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

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-brand-black border border-border-light rounded-2xl"
      style={{
        width: "100%",
        maxWidth: 405,
        aspectRatio: "9/16",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div
        ref={innerRef}
        className="absolute top-0 left-0 opacity-0"
        style={{ width: 405, height: 720, transformOrigin: "top left" }}
      >
        <StoryContent story={story} />
      </div>
    </div>
  );
}
