"use client";

import { useState, useEffect } from "react";
import SlidePanel from "./SlidePanel";

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

interface Props {
  date: string;
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function linkSources(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const srcMatch = lines[i].match(/^\*\*Source:\*\*\s*(.+)/);
    if (srcMatch) {
      const next = lines[i + 1]?.trim() === "" ? lines[i + 2] : lines[i + 1];
      const linkMatch = next?.match(/^\*\*Link:\*\*\s*(https?:\/\/\S+)/);
      if (linkMatch) {
        const url = linkMatch[1];
        const name = srcMatch[1];
        out.push(`**Source:** <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline opacity-80 hover:opacity-100">${name}</a>`);
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

export default function AgentDrawer({ date, open, agent, onClose }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

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

  const title = (
    <>
      {agent ?? "AGENT"}
      {!loading && current && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-[5px] h-[5px] rounded-full"
            style={{ background: current.ranToday ? "#22c55e" : "#555" }}
          />
          <span className="text-[0.65rem] text-brand-white opacity-35 font-semibold">
            {current.ranToday
              ? `${current.count} ${label} · ${formatTime(current.lastRun!)}`
              : "not run today"}
          </span>
        </div>
      )}
    </>
  );

  return (
    <SlidePanel side="right" open={open} title={title} onClose={onClose}>
      <div className="px-6 py-5">
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
    </SlidePanel>
  );
}
