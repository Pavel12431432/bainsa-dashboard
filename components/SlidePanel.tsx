"use client";

import { ReactNode } from "react";

interface Props {
  side: "left" | "right";
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  width?: string;
  children: ReactNode;
}

export default function SlidePanel({ side, open, title, onClose, width, children }: Props) {
  const w = width ?? (side === "left" ? "min(300px,85vw)" : "min(400px,100vw)");
  const translate = side === "left"
    ? (open ? "translateX(0)" : "translateX(-100%)")
    : (open ? "translateX(0)" : "translateX(100%)");
  const border = side === "left" ? "border-r" : "border-l";
  const position = side === "left" ? "left-0" : "right-0";

  return (
    <div
      className={`fixed top-0 ${position} bottom-0 bg-surface ${border} border-[#1f1f1f] z-50 flex flex-col transition-transform duration-[220ms] ease-out`}
      style={{ width: w, transform: translate }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f] shrink-0">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-white tracking-[0.08em]">
          {title}
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border-none text-brand-white opacity-40 cursor-pointer text-base p-1"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
