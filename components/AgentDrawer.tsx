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

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    // h1
    if (line.startsWith("# ")) return (
      <p key={i} style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f4f3f3", margin: "16px 0 6px" }}>
        {line.slice(2)}
      </p>
    );
    // h2
    if (line.startsWith("## ")) return (
      <p key={i} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f4f3f3", margin: "14px 0 4px", opacity: 0.9 }}>
        {line.slice(3)}
      </p>
    );
    // h3
    if (line.startsWith("### ")) return (
      <p key={i} style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f4f3f3", margin: "10px 0 2px", opacity: 0.7 }}>
        {line.slice(4)}
      </p>
    );
    // horizontal rule
    if (line.startsWith("---")) return (
      <hr key={i} style={{ border: "none", borderTop: "1px solid #1f1f1f", margin: "10px 0" }} />
    );
    // blank line
    if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
    // bold key: value lines
    const boldLine = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`);
    return (
      <p
        key={i}
        style={{ fontSize: "0.7rem", color: "#f4f3f3", opacity: 0.55, margin: "2px 0", lineHeight: 1.6 }}
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
  }, [open]);

  const current = agent === "MARCO" ? status?.marco : status?.sofia;
  const label = agent === "MARCO" ? "articles" : "stories";

  return (
    <>
      {/* Header buttons */}
      <div className={className} style={{ display: "flex", gap: "10px" }}>
        {(["MARCO", "SOFIA"] as Agent[]).map((a) => (
          <button
            key={a}
            onClick={() => trigger(a)}
            style={{
              padding: "7px 16px", borderRadius: "5px",
              border: "1px solid #333", background: "transparent",
              color: "#f4f3f3", opacity: 0.55, fontSize: "0.75rem",
              fontWeight: 600, fontFamily: "inherit", letterSpacing: "0.04em",
              cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
          >
            ▸ {a}
          </button>
        ))}
      </div>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)",
        background: "#111", borderLeft: "1px solid #1f1f1f",
        zIndex: 50, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.22s ease",
      }}>
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #1f1f1f",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f4f3f3", letterSpacing: "0.08em" }}>
              {agent ?? "AGENT"}
            </span>
            {!loading && current && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: current.ranToday ? "#22c55e" : "#555",
                }} />
                <span style={{ fontSize: "0.65rem", color: "#f4f3f3", opacity: 0.35 }}>
                  {current.ranToday
                    ? `${current.count} ${label} · ${formatTime(current.lastRun!)}`
                    : "not run today"}
                </span>
              </div>
            )}
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: "none", border: "none", color: "#f4f3f3",
            opacity: 0.4, cursor: "pointer", fontSize: "1rem",
            fontFamily: "inherit", padding: "4px",
          }}>✕</button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <p style={{ fontSize: "0.75rem", color: "#f4f3f3", opacity: 0.25 }}>Loading...</p>
          )}

          {!loading && current && !current.ranToday && (
            <p style={{ fontSize: "0.75rem", color: "#f4f3f3", opacity: 0.2 }}>
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
