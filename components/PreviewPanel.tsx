"use client";

import { Story } from "@/types";
import StoryCard from "./StoryCard";
import PhonePreview from "./PhonePreview";

interface ChainNav {
  /** 1-based position within the chain. */
  position: number;
  /** Total cards in the chain. */
  total: number;
  /** Chain name — surfaced under the preview as a status label. The card
      itself is the affordance for opening the chain fullscreen (the editor
      wires its onFullscreen callback). */
  chain: string;
  /** Role of the current card. */
  role: "hook" | "develop" | "closer";
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

interface Props {
  story: Story;
  preview: "card" | "phone";
  onPreviewChange: (mode: "card" | "phone") => void;
  onFullscreen: () => void;
  /** Present when the story being edited belongs to a chain. Renders prev/next
      chevrons flanking the preview and a status breadcrumb below it. */
  chainNav?: ChainNav;
}

function ChevronButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`p-2 rounded-full border border-border-mid bg-surface-2 text-brand-white transition-colors duration-150 ${
        disabled
          ? "opacity-25 cursor-not-allowed"
          : "opacity-70 hover:opacity-100 hover:bg-border cursor-pointer"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {direction === "prev" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

export default function PreviewPanel({ story, preview, onPreviewChange, onFullscreen, chainNav }: Props) {
  return (
    <div className="p-8 bg-brand-black flex flex-col items-center justify-center shrink-0 border-r border-border max-lg:hidden gap-4">
      <div className="flex items-center gap-3">
        {chainNav && (
          <ChevronButton
            direction="prev"
            disabled={!!chainNav.prevDisabled}
            onClick={chainNav.onPrev}
            ariaLabel="Previous card in chain"
          />
        )}
        <div className="flex items-center justify-center" style={{ width: 294, height: 521 }}>
          <div className="group/preview relative cursor-pointer" onClick={onFullscreen}>
            {preview === "card" ? (
              <StoryCard
                story={story}
                scale={0.72}
                chainPosition={chainNav?.position}
                chainTotal={chainNav?.total}
              />
            ) : (
              <PhonePreview
                story={story}
                scale={0.58}
                chainPosition={chainNav?.position}
                chainTotal={chainNav?.total}
              />
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
        {chainNav && (
          <ChevronButton
            direction="next"
            disabled={!!chainNav.nextDisabled}
            onClick={chainNav.onNext}
            ariaLabel="Next card in chain"
          />
        )}
      </div>

      {chainNav && (
        <div className="flex items-baseline gap-2 text-[0.6rem] tracking-[0.08em] uppercase">
          <span className="text-brand-white opacity-80 font-semibold">{chainNav.chain}</span>
          <span className="text-muted">·</span>
          <span className="text-muted tabular-nums">Card {chainNav.position} of {chainNav.total}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{chainNav.role}</span>
        </div>
      )}

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
