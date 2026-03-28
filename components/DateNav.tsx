"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { todayRome } from "@/lib/date";

interface Props {
  date: string;
  className?: string;
}

function stepDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function DateNav({ date, className }: Props) {
  const today = todayRome();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open) {
      const [y, m] = date.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setOpen(!open);
  }

  // Close when date changes (arrow navigation)
  useEffect(() => { setOpen(false); }, [date]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Build month grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const offset = (firstDay + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function stepMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewYear(y);
    setViewMonth(m);
  }

  const arrow = "bg-transparent border-none text-brand-white opacity-50 text-base cursor-pointer px-2 py-1 leading-none";

  return (
    <div ref={ref} className={`flex items-center gap-1 relative ${className ?? ""}`}>
      <Link href={`/stories/${stepDate(date, -1)}`} className={arrow} prefetch>
        ←
      </Link>
      <button
        onClick={toggle}
        className="text-sm text-brand-white opacity-40 hover:opacity-60 min-w-[90px] text-center bg-transparent border-none cursor-pointer transition-opacity duration-150"
      >
        {date}
      </button>
      <Link href={`/stories/${stepDate(date, 1)}`} className={arrow} prefetch>
        →
      </Link>

      {open && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface border border-border-mid rounded-lg p-3 z-50 w-[260px] shadow-lg max-sm:fixed max-sm:left-1/2 max-sm:top-14 max-sm:-translate-x-1/2">
          {/* Month header */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => stepMonth(-1)} className="bg-transparent border-none text-brand-white opacity-50 hover:opacity-80 cursor-pointer text-sm px-1">←</button>
            <span className="text-xs font-semibold text-brand-white opacity-60">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="bg-transparent border-none text-brand-white opacity-50 hover:opacity-80 cursor-pointer text-sm px-1">→</button>
          </div>

          {/* Today button */}
          <Link
            href={`/stories/${today}`}
            onClick={() => setOpen(false)}
            className="block text-center text-[0.65rem] font-semibold tracking-[0.04em] text-brand-white opacity-40 hover:opacity-70 bg-border rounded py-1 mb-2 no-underline transition-opacity duration-150"
          >
            TODAY
          </Link>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAYS.map((d) => (
              <span key={d} className="text-[0.6rem] text-brand-white opacity-25 text-center font-semibold">{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = iso === date;
              const isToday = iso === today;

              return (
                <Link
                  key={day}
                  href={`/stories/${iso}`}
                  onClick={() => setOpen(false)}
                  prefetch={false}
                  className={`text-[0.7rem] text-center py-1.5 rounded no-underline transition-colors duration-100 ${
                    isSelected
                      ? "bg-accent-analysis text-brand-white font-semibold"
                      : isToday
                        ? "text-accent-analysis opacity-80 hover:bg-border-light"
                        : "text-brand-white opacity-50 hover:bg-border-light hover:opacity-70"
                  }`}
                >
                  {day}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
