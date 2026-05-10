"use client";

import { useState, useEffect, useRef } from "react";
import { Story } from "@/types";
import PhonePreview from "./PhonePreview";

interface Props {
  chain: string;
  stories: Story[];
  onClose: () => void;
}

const PHONE_W = 405;
const PHONE_H = 880;

export default function ChainFullscreen({ chain, stories, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(0.8);
  const total = stories.length;
  const lastWheelAt = useRef(0);
  const touchStartX = useRef<number | null>(null);

  function prev() { setIndex((i) => Math.max(0, i - 1)); }
  function next() { setIndex((i) => Math.min(total - 1, i + 1)); }

  // Fit phone to viewport (use 85% of available height)
  useEffect(() => {
    const update = () => {
      const maxH = window.innerHeight * 0.85;
      const maxW = window.innerWidth * 0.9;
      const s = Math.min(maxH / PHONE_H, maxW / PHONE_W, 1);
      setScale(s);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, onClose]);

  // Wheel scroll cycles cards (debounced)
  function onWheel(e: React.WheelEvent) {
    const dominant = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(dominant) < 4) return;
    const now = Date.now();
    if (now - lastWheelAt.current < 350) return;
    lastWheelAt.current = now;
    if (dominant > 0) next();
    else prev();
  }

  // Touch swipe (mobile / tablet)
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  }

  const phoneW = PHONE_W * scale;
  const phoneH = PHONE_H * scale;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* Header — chain name + counter + close */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 text-brand-white pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs uppercase tracking-[0.1em] font-semibold opacity-80">{chain}</span>
          <span className="text-[0.65rem] opacity-50 tabular-nums">{index + 1} / {total}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer pointer-events-auto"
          aria-label="Close fullscreen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      {/* Phone carousel — horizontal slide */}
      <div
        className="relative overflow-hidden"
        style={{ width: phoneW, height: phoneH }}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-400 ease-out"
          style={{
            width: phoneW * total,
            transform: `translateX(-${index * phoneW}px)`,
          }}
        >
          {stories.map((story) => (
            <div key={story.index} className="shrink-0" style={{ width: phoneW, height: phoneH }}>
              <PhonePreview story={story} scale={scale} />
            </div>
          ))}
        </div>
      </div>

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors text-brand-white cursor-pointer"
          aria-label="Previous story"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {index < total - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors text-brand-white cursor-pointer"
          aria-label="Next story"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Dots indicator */}
      {total > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {stories.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                i === index ? "w-8 bg-brand-white" : "w-2 bg-brand-white/40 hover:bg-brand-white/60"
              }`}
              aria-label={`Go to story ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Hint text — visible briefly */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-brand-white/30 text-[0.65rem] tracking-wider whitespace-nowrap pointer-events-none">
        ← → to navigate · ESC to close
      </div>
    </div>
  );
}
