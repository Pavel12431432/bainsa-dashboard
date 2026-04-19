"use client";

import { Story } from "@/types";
import StoryCard from "./StoryCard";
import PhonePreview from "./PhonePreview";

interface Props {
  story: Story;
  preview: "card" | "phone";
  onPreviewChange: (mode: "card" | "phone") => void;
  onFullscreen: () => void;
}

export default function PreviewPanel({ story, preview, onPreviewChange, onFullscreen }: Props) {
  return (
    <div className="p-8 bg-brand-black flex flex-col items-center justify-center shrink-0 border-r border-border max-lg:hidden gap-4">
      <div className="flex items-center justify-center" style={{ width: 294, height: 521 }}>
        <div className="group/preview relative cursor-pointer" onClick={onFullscreen}>
          {preview === "card" ? (
            <StoryCard story={story} scale={0.72} />
          ) : (
            <PhonePreview story={story} scale={0.58} />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onFullscreen(); }}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 border-none cursor-pointer opacity-0 group-hover/preview:opacity-60 hover:!opacity-100 transition-opacity duration-150"
            style={{ zIndex: 30 }}
            title="Fullscreen preview"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 1 13 1 13 5" />
              <polyline points="5 13 1 13 1 9" />
              <line x1="13" y1="1" x2="8.5" y2="5.5" />
              <line x1="1" y1="13" x2="5.5" y2="8.5" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex gap-1 bg-surface rounded-lg p-1">
        <button
          onClick={() => onPreviewChange("card")}
          className={`px-3 py-1.5 rounded-md text-[0.6rem] font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
            preview === "card" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
          }`}
        >
          CARD
        </button>
        <button
          onClick={() => onPreviewChange("phone")}
          className={`px-3 py-1.5 rounded-md text-[0.6rem] font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
            preview === "phone" ? "bg-border-mid text-brand-white" : "bg-transparent text-muted hover:text-brand-white"
          }`}
        >
          PHONE
        </button>
      </div>
    </div>
  );
}
