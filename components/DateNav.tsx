"use client";

import Link from "next/link";

interface Props {
  date: string;
  className?: string;
}

function stepDate(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DateNav({ date, className }: Props) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const isToday = date === today;

  const arrow = "bg-transparent border-none text-brand-white opacity-50 text-base cursor-pointer px-2 py-1 leading-none";

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Link href={`/stories/${stepDate(date, -1)}`} className={arrow}>
        ←
      </Link>
      <span className="text-sm text-brand-white opacity-40 min-w-[90px] text-center">
        {date}
      </span>
      <Link href={`/stories/${stepDate(date, 1)}`} className={arrow}>
        →
      </Link>
      <Link
        href={`/stories/${today}`}
        className={`bg-transparent border-none text-brand-white text-[0.65rem] font-semibold tracking-[0.04em] px-2 py-1 ${isToday ? "opacity-0 pointer-events-none" : "opacity-35 cursor-pointer"}`}
      >
        TODAY
      </Link>
    </div>
  );
}
