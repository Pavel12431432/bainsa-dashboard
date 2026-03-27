"use client";

import { useState, useEffect } from "react";

type Agent = "MARCO" | "SOFIA";

interface AgentStatus {
  ranToday: boolean;
  lastRun: string | null;
  count: number | null;
  content: string | null;
}

interface Status {
  marco: AgentStatus;
  sofia: AgentStatus;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function linkSources(lines: string[]): string[] {
  // Merge **Source:** + **Link:** pairs: make the source name a clickable link, drop the Link line.
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const srcMatch = lines[i].match(/^\*\*Source:\*\*\s*(.+)/);
    if (srcMatch) {
      // Look ahead for a **Link:** line (possibly after a blank line)
      const next = lines[i + 1]?.trim() === "" ? lines[i + 2] : lines[i + 1];
      const linkMatch = next?.match(/^\*\*Link:\*\*\s*(https?:\/\/\S+)/);
      if (linkMatch) {
        const url = linkMatch[1];
        const name = srcMatch[1];
        out.push(`**Source:** <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-80 hover:opacity-100">${name}</a>`);
        // Skip the Link line (and blank line between if present)
        i += lines[i + 1]?.trim() === "" ? 2 : 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}

function renderMarkdown(text: string) {
  const lines = linkSources(text.split("\n"));
  return lines.map((line, i) => {
    if (line.startsWith("# "))
      return <p key={i} className="text-[0.8rem] font-bold text-brand-white mt-4 mb-1.5">{line.slice(2)}</p>;
    if (line.startsWith("## "))
      return <p key={i} className="text-xs font-bold text-brand-white opacity-90 mt-3.5 mb-1">{line.slice(3)}</p>;
    if (line.startsWith("### "))
      return <p key={i} className="text-[0.7rem] font-bold text-brand-white opacity-70 mt-2.5 mb-0.5">{line.slice(4)}</p>;
    if (line.startsWith("---"))
      return <hr key={i} className="border-none border-t border-[#1f1f1f] my-2.5" />;
    if (line.trim() === "")
      return <div key={i} className="h-1.5" />;
    const boldLine = line
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-80 hover:opacity-100">${text}</a>`)
      .replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`);
    return (
      <p
        key={i}
        className="text-[0.7rem] text-brand-white opacity-55 my-0.5 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: boldLine }}
      />
    );
  });
}

export default function AgentDrawer({ date, className }: { date: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  function trigger(a: Agent) {
    setAgent(a);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/agent-status?date=${date}`)
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .finally(() => setLoading(false));
  }, [open, date]);

  const current = agent === "MARCO" ? status?.marco : status?.sofia;
  const label = agent === "MARCO" ? "articles" : "stories";

  return (
    <>
      {/* Header buttons */}
      <div className={`flex gap-2.5 ${className ?? ""}`}>
        {(["MARCO", "SOFIA"] as Agent[]).map((a) => (
          <button
            key={a}
            onClick={() => trigger(a)}
            className="px-4 py-[7px] rounded-[5px] border border-border-mid bg-transparent text-brand-white opacity-55 text-xs font-semibold tracking-[0.04em] cursor-pointer transition-opacity duration-150 hover:opacity-90"
          >
            ▸ {a}
          </button>
        ))}
      </div>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[min(400px,100vw)] bg-surface border-l border-[#1f1f1f] z-50 flex flex-col transition-transform duration-[220ms] ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-brand-white tracking-[0.08em]">
              {agent ?? "AGENT"}
            </span>
            {!loading && current && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: current.ranToday ? "#22c55e" : "#555" }}
                />
                <span className="text-[0.65rem] text-brand-white opacity-35">
                  {current.ranToday
                    ? `${current.count} ${label} · ${formatTime(current.lastRun!)}`
                    : "not run today"}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="bg-transparent border-none text-brand-white opacity-40 cursor-pointer text-base p-1"
          >
            ✕
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <p className="text-xs text-brand-white opacity-25">Loading...</p>
          )}

          {!loading && current && !current.ranToday && (
            <p className="text-xs text-brand-white opacity-20">
              {agent === "MARCO"
                ? "No news handoff found for today."
                : "No stories found for today. Run Marco first."}
            </p>
          )}

          {!loading && current?.content && renderMarkdown(current.content)}
        </div>
      </div>
    </>
  );
}
