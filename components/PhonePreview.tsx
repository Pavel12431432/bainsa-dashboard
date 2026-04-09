"use client";

import { Story } from "@/types";
import StoryContent from "./StoryContent";

interface Props {
  story: Story;
  scale?: number;
}

const SCREEN_W = 405;
const SCREEN_H = 880;
const STORY_TOP = 54;
const STORY_H = 720;

export default function PhonePreview({ story, scale = 1 }: Props) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}
    >
      <div
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Screen */}
        <div
          className="relative overflow-hidden border border-border-light"
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: 40,
            background: "#0b1014",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Layer 1: Story card */}
          <div
            className="absolute left-0"
            style={{ top: STORY_TOP, width: SCREEN_W, height: STORY_H }}
          >
            <StoryContent story={story} />
          </div>

          {/* Layer 2: Top chrome (real iOS status bar) */}
          <img
            src="/ig-chrome-top.png"
            alt=""
            className="absolute top-0 left-0 right-0 w-full z-20"
            draggable={false}
          />

          {/* Layer 3: Progress bar + profile row */}
          <div className="absolute left-0 right-0 z-[25]" style={{ top: STORY_TOP, padding: "6px 14px 0" }}>
            {/* Progress bar */}
            <div className="h-[2px] rounded-[1px] bg-white/30 overflow-hidden">
              <div className="h-full w-[35%] rounded-[1px] bg-white/85" />
            </div>
            {/* Profile row */}
            <div className="flex items-center gap-2 mt-2 px-0.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 shrink-0 bg-[#0b1014]">
                <img src="/bainsa-avatar.jpg" alt="BAINSA" className="w-full h-full object-cover" draggable={false} />
              </div>
              <span className="text-[13px] font-semibold text-white" style={{ fontFamily: "-apple-system, system-ui, sans-serif" }}>
                bainsa_bocconi
              </span>
              <span className="text-[13px] text-white/50" style={{ fontFamily: "-apple-system, system-ui, sans-serif" }}>
                2h
              </span>
              <div className="ml-auto flex items-center gap-4">
                <svg width="16" height="4" viewBox="0 0 16 4" fill="white" opacity={0.8}>
                  <circle cx="2" cy="2" r="1.5" />
                  <circle cx="8" cy="2" r="1.5" />
                  <circle cx="14" cy="2" r="1.5" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 14 14" stroke="white" strokeWidth="2" opacity={0.8} fill="none" strokeLinecap="round">
                  <line x1="2" y1="2" x2="12" y2="12" />
                  <line x1="12" y1="2" x2="2" y2="12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Layer 4: Bottom chrome (real iOS send message bar) */}
          <img
            src="/ig-chrome-bottom.png"
            alt=""
            className="absolute bottom-0 left-0 right-0 w-full z-20"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
