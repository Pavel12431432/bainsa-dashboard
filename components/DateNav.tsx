"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  const arrow = "bg-transparent border-none text-brand-white opacity-50 text-base cursor-pointer px-2 py-1 leading-none";

  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <button className={arrow} onClick={() => router.push(`/stories/${stepDate(date, -1)}`)}>
        ←
      </button>
      <span className="text-sm text-brand-white opacity-40 min-w-[90px] text-center">
        {date}
      </span>
      <button className={arrow} onClick={() => router.push(`/stories/${stepDate(date, 1)}`)}>
        →
      </button>
      {!isToday && (
        <button
          onClick={() => router.push(`/stories/${today}`)}
          className="bg-transparent border-none text-brand-white opacity-35 text-[0.65rem] font-semibold tracking-[0.04em] cursor-pointer px-2 py-1"
        >
          TODAY
        </button>
      )}
    </div>
  );
}
