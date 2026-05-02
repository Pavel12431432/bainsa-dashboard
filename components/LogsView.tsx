"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LogEvent, LogKind } from "@/lib/logs";
import { timeAgo } from "@/lib/time";

interface Cursor {
  beforeTs: string;
}

interface Props {
  initialEvents: LogEvent[];
  initialCursor: Cursor | null;
}

type Category = "all" | "agents" | "stories" | "teach" | "instagram" | "auth" | "exports";
type DatePreset = "all" | "today" | "7d" | "30d";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "agents", label: "Agents" },
  { value: "stories", label: "Stories" },
  { value: "teach", label: "Teach" },
  { value: "instagram", label: "Instagram" },
  { value: "auth", label: "Auth" },
  { value: "exports", label: "Exports" },
];

const CATEGORY_KINDS: Record<Category, LogKind[]> = {
  all: [],
  agents: ["agent.call"],
  stories: ["story.approve", "story.reject", "story.edit", "variants.generate"],
  teach: [
    "proposal.generate",
    "proposal.accept",
    "proposal.reject",
    "proposal.refine",
    "proposal.undo-refine",
    "adaptive.save",
  ],
  instagram: ["ig.post"],
  auth: ["auth.login.success", "auth.login.failure"],
  exports: ["export"],
};

const KIND_COLORS: Record<LogKind, string> = {
  "agent.call": "text-accent-projects",
  "ig.post": "text-accent-culture",
  "proposal.generate": "text-accent-analysis",
  "proposal.accept": "text-success",
  "proposal.reject": "text-muted",
  "proposal.refine": "text-accent-analysis",
  "proposal.undo-refine": "text-muted",
  "adaptive.save": "text-accent-analysis",
  "story.approve": "text-success",
  "story.reject": "text-danger",
  "story.edit": "text-brand-white",
  "variants.generate": "text-accent-projects",
  "export": "text-brand-white",
  "auth.login.success": "text-muted",
  "auth.login.failure": "text-danger",
};

function presetFromIso(preset: DatePreset): string | undefined {
  if (preset === "all") return undefined;
  const now = new Date();
  if (preset === "today") {
    now.setUTCHours(0, 0, 0, 0);
    return now.toISOString();
  }
  const days = preset === "7d" ? 7 : 30;
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function buildQuery(params: {
  category: Category;
  errorsOnly: boolean;
  q: string;
  preset: DatePreset;
  cursor?: Cursor | null;
}): string {
  const sp = new URLSearchParams();
  const kinds = CATEGORY_KINDS[params.category];
  if (kinds.length > 0) sp.set("kinds", kinds.join(","));
  if (params.errorsOnly) sp.set("ok", "false");
  if (params.q.trim()) sp.set("q", params.q.trim());
  const fromIso = presetFromIso(params.preset);
  if (fromIso) sp.set("from", fromIso);
  if (params.cursor) {
    sp.set("cursorBeforeTs", params.cursor.beforeTs);
  }
  return sp.toString();
}

export default function LogsView({ initialEvents, initialCursor }: Props) {
  const [events, setEvents] = useState<LogEvent[]>(initialEvents);
  const [cursor, setCursor] = useState<Cursor | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [category, setCategory] = useState<Category>("all");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [preset, setPreset] = useState<DatePreset>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const filterKey = useMemo(
    () => JSON.stringify({ category, errorsOnly, q: debouncedQ, preset }),
    [category, errorsOnly, debouncedQ, preset],
  );

  const isPristine =
    category === "all" && !errorsOnly && debouncedQ === "" && preset === "all";

  useEffect(() => {
    if (isPristine && events === initialEvents) return;
    let cancelled = false;
    setLoading(true);
    setExpanded(new Set());
    const qs = buildQuery({ category, errorsOnly, q: debouncedQ, preset });
    fetch(`/api/logs?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
        setCursor(data.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const qs = buildQuery({ category, errorsOnly, q: debouncedQ, preset, cursor });
      const res = await fetch(`/api/logs?${qs}`);
      const data = await res.json();
      setEvents((prev) => [...prev, ...(data.events ?? [])]);
      setCursor(data.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function clearFilters() {
    setCategory("all");
    setErrorsOnly(false);
    setQ("");
    setPreset("all");
  }

  const hasFilters = !isPristine;

  return (
    <div className="h-full flex flex-col gap-3 max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search logs..."
          className="flex-1 min-w-48 bg-border border border-border-mid rounded-md px-3 py-2 text-sm text-brand-white outline-none"
        />

        <CategoryDropdown value={category} onChange={setCategory} />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-[0.65rem] font-semibold tracking-[0.06em] text-brand-white opacity-55 hover:opacity-90 bg-transparent border border-border-mid rounded-md cursor-pointer"
          >
            CLEAR
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 items-center">
          {(["all", "today", "7d", "30d"] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 text-[0.65rem] font-semibold tracking-[0.06em] uppercase rounded-md cursor-pointer transition-colors duration-100 border ${
                preset === p
                  ? "bg-border-mid border-border-mid text-brand-white"
                  : "bg-transparent border-border-mid text-brand-white opacity-45 hover:opacity-80"
              }`}
            >
              {p === "all" ? "All time" : p === "today" ? "Today" : p === "7d" ? "Last 7d" : "Last 30d"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
          <span
            className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center ${
              errorsOnly ? "bg-border-mid border-border-mid" : "bg-transparent border-[#444]"
            }`}
          >
            {errorsOnly && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(e) => setErrorsOnly(e.target.checked)}
            className="sr-only"
          />
          <span className="text-[0.65rem] font-semibold tracking-[0.06em] uppercase text-brand-white opacity-60 group-hover:opacity-90">
            Errors only
          </span>
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-border-panel rounded-md">
        {events.length === 0 && !loading && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            {hasFilters ? "No matching logs." : "No logs yet."}
          </p>
        )}
        {events.map((e, i) => {
          const isExpanded = expanded.has(i);
          return (
            <div key={`${e.ts}-${i}`} className="border-b border-border-panel last:border-b-0">
              <button
                onClick={() => toggleExpand(i)}
                className="w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors duration-100 bg-transparent border-none cursor-pointer flex gap-3 items-baseline"
              >
                <span className="text-[0.65rem] text-muted tabular-nums w-16 shrink-0">
                  {timeAgo(e.ts)}
                </span>
                <span className={`text-[0.65rem] font-semibold tracking-[0.06em] uppercase w-32 shrink-0 ${KIND_COLORS[e.kind] ?? "text-brand-white"}`}>
                  {e.kind}
                </span>
                <span className="flex-1 text-xs text-brand-white opacity-85 truncate">
                  {e.summary}
                </span>
                {!e.ok && (
                  <span className="text-[0.6rem] font-semibold text-danger uppercase">ERR</span>
                )}
                {e.actor === "system" && (
                  <span className="text-[0.6rem] font-semibold text-muted uppercase">SYS</span>
                )}
                {typeof e.durationMs === "number" && (
                  <span className="text-[0.6rem] text-muted tabular-nums w-14 text-right">
                    {e.durationMs}ms
                  </span>
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 -mt-1 ml-[4.75rem] mr-2">
                  <div className="text-[0.65rem] text-muted mb-1.5">
                    {new Date(e.ts).toLocaleString()}
                  </div>
                  {e.meta && (
                    <pre className="text-[0.7rem] text-brand-white opacity-70 bg-surface-2 border border-border-panel rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(e.meta, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {cursor && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full px-4 py-3 text-xs font-semibold text-brand-white opacity-55 hover:opacity-90 bg-transparent border-none cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            {loading ? "LOADING..." : "LOAD MORE"}
          </button>
        )}
        {loading && events.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted animate-pulse">Loading...</p>
        )}
      </div>
    </div>
  );
}

function CategoryDropdown({
  value,
  onChange,
}: {
  value: Category;
  onChange: (v: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = CATEGORY_OPTIONS.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-[0.7rem] font-semibold tracking-[0.04em] uppercase text-brand-white opacity-70 hover:opacity-100 bg-border border border-border-mid rounded-md cursor-pointer min-w-40"
      >
        <span className="flex-1 text-left">{current.label}</span>
        <span className="opacity-50 text-xs leading-none">▾</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-surface border border-border-mid rounded-md py-1 z-20 min-w-40 shadow-lg">
          {CATEGORY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-[0.7rem] font-semibold tracking-[0.04em] uppercase bg-transparent border-none cursor-pointer hover:bg-border-light ${
                o.value === value
                  ? "text-brand-white opacity-100"
                  : "text-brand-white opacity-55 hover:opacity-90"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
