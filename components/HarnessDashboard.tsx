"use client";

import Link from "next/link";
import type { ScoredStory } from "@/app/harness/page";

interface Props {
  entries: ScoredStory[];
  dates: string[];
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function scoreColor(value: number): string {
  if (value >= 80) return "#22c55e";
  if (value >= 60) return "#eab308";
  return "#ef4444";
}

export default function HarnessDashboard({ entries, dates }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold text-brand-white m-0">Evaluation Harness</h1>
        <p className="text-sm text-brand-white opacity-50 mt-6">No evaluations yet.</p>
        <p className="text-xs text-brand-white opacity-30 mt-2">
          Open a date with stories and click RE-EVALUATE to score them.
        </p>
      </div>
    );
  }

  const total = entries.length;
  const avgBrand = avg(entries.map((e) => e.score.brandVoice));
  const avgHook = avg(entries.map((e) => e.score.engagement));
  const tcEntries = entries.filter((e) => e.score.topicCoherence != null);
  const avgTopic = avg(tcEntries.map((e) => e.score.topicCoherence!));

  const perDate = dates
    .map((d) => {
      const dayEntries = entries.filter((e) => e.date === d);
      return {
        date: d,
        avg: avg(dayEntries.map((e) => e.score.total)),
        count: dayEntries.length,
      };
    })
    .filter((d) => d.count > 0);

  const high = entries.filter((e) => e.score.total >= 80).length;
  const mid = entries.filter((e) => e.score.total >= 60 && e.score.total < 80).length;
  const low = entries.filter((e) => e.score.total < 60).length;

  const lowest = [...entries].sort((a, b) => a.score.total - b.score.total).slice(0, 5);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-brand-white m-0">Evaluation Harness</h1>
        <p className="text-[0.8rem] text-brand-white opacity-35 mt-1">
          Anna evaluated {total} stor{total === 1 ? "y" : "ies"} across {dates.length}{" "}
          {dates.length === 1 ? "day" : "days"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3">
        <StatCard label="STORIES SCORED" value={String(total)} />
        <StatCard label="AVG BRAND" value={String(avgBrand)} color={scoreColor(avgBrand)} />
        <StatCard label="AVG HOOK" value={String(avgHook)} color={scoreColor(avgHook)} />
        <StatCard
          label="AVG TOPIC"
          value={tcEntries.length > 0 ? String(avgTopic) : "—"}
          color={tcEntries.length > 0 ? scoreColor(avgTopic) : undefined}
          sublabel={tcEntries.length > 0 ? `${tcEntries.length} chained` : "no chained stories"}
        />
      </div>

      {/* Average over time */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-white/70 mb-4">
          Average total over time
        </h2>
        <BarChart data={perDate} />
      </section>

      {/* Distribution */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-white/70 mb-4">
          Score distribution
        </h2>
        <div className="space-y-2 rounded-lg border border-border bg-surface p-5">
          <DistRow label="HIGH (≥80)" count={high} total={total} color="#22c55e" />
          <DistRow label="MID (60–79)" count={mid} total={total} color="#eab308" />
          <DistRow label="LOW (<60)" count={low} total={total} color="#ef4444" />
        </div>
      </section>

      {/* Lowest scoring */}
      <section>
        <h2 className="text-xs font-semibold tracking-[0.06em] uppercase text-brand-white/70 mb-4">
          Lowest scoring (top {lowest.length})
        </h2>
        <div className="space-y-1.5">
          {lowest.map((e) => (
            <Link
              key={`${e.date}-${e.storyIndex}`}
              href={`/stories/${e.date}?highlight=${e.storyIndex}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded border border-border bg-surface hover:bg-surface-2 transition-colors duration-150 text-brand-white"
            >
              <span className="text-[0.55rem] font-semibold tracking-[0.06em] opacity-50 tabular-nums w-20 shrink-0">
                {e.date}
              </span>
              <span className="text-xs flex-1 truncate opacity-80">{e.headline}</span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: scoreColor(e.score.total) }}
              >
                {e.score.total}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-[0.6rem] text-brand-white/30 text-center pt-4">
        Click any story above to jump back to its day and see the full evaluation.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color?: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[0.55rem] font-semibold tracking-[0.08em] opacity-50 uppercase text-brand-white">
        {label}
      </div>
      <div
        className="text-2xl font-bold tabular-nums mt-2"
        style={{ color: color ?? "var(--brand-white, #f4f3f3)" }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[0.55rem] opacity-30 mt-1 text-brand-white">{sublabel}</div>
      )}
    </div>
  );
}

function DistRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.6rem] font-semibold tracking-[0.06em] w-24 shrink-0 opacity-60 text-brand-white">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums w-8 text-right"
        style={{ color }}
      >
        {count}
      </span>
    </div>
  );
}

function BarChart({ data }: { data: Array<{ date: string; avg: number; count: number }> }) {
  const W = 600;
  const H = 200;
  const pad = { top: 24, bottom: 36, left: 24, right: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const barW =
    data.length > 0 ? Math.min(80, (innerW / data.length) * 0.7) : 0;
  const gap = data.length > 0 ? (innerW - barW * data.length) / (data.length + 1) : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: "block" }}>
        {/* Y grid */}
        {[0, 50, 100].map((v) => {
          const y = pad.top + innerH * (1 - v / 100);
          return (
            <g key={v}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2 4"
              />
              <text x={pad.left - 6} y={y + 3} fontSize="9" fill="rgba(255,255,255,0.3)" textAnchor="end">
                {v}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.left + gap + i * (barW + gap);
          const h = innerH * (d.avg / 100);
          const y = pad.top + innerH - h;
          const c = scoreColor(d.avg);
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={h} fill={c} opacity={0.85} rx={2} />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fill={c}
                fontWeight="700"
              >
                {d.avg}
              </text>
              <text
                x={x + barW / 2}
                y={H - pad.bottom + 14}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(255,255,255,0.5)"
                fontFamily="ui-monospace, monospace"
              >
                {d.date.slice(5)}
              </text>
              <text
                x={x + barW / 2}
                y={H - pad.bottom + 26}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(255,255,255,0.25)"
              >
                {d.count} stor{d.count === 1 ? "y" : "ies"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
