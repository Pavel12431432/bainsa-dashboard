"use client";

import { useState } from "react";

type Agent = "MARCO" | "SOFIA";

export default function AgentDrawer() {
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);

  function trigger(a: Agent) {
    setAgent(a);
    setOpen(true);
  }

  return (
    <>
      {/* Header buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        {(["MARCO", "SOFIA"] as Agent[]).map((a) => (
          <button
            key={a}
            onClick={() => trigger(a)}
            style={{
              padding: "7px 16px", borderRadius: "5px",
              border: "1px solid #333", background: "transparent",
              color: "#f4f3f3", opacity: 0.55, fontSize: "0.75rem",
              fontWeight: 600, fontFamily: "inherit", letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
          >
            ▸ {a}
          </button>
        ))}
      </div>

      {/* Drawer overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "360px",
          background: "#111",
          borderLeft: "1px solid #1f1f1f",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s ease",
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #1f1f1f",
        }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f4f3f3", letterSpacing: "0.08em" }}>
            {agent ?? "AGENT"}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none", border: "none", color: "#f4f3f3",
              opacity: 0.4, cursor: "pointer", fontSize: "1rem",
              fontFamily: "inherit", padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer body */}
        <div style={{
          flex: 1, padding: "24px",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          gap: "8px",
        }}>
          <span style={{ fontSize: "0.75rem", color: "#f4f3f3", opacity: 0.25, textAlign: "center" }}>
            Agent triggers not yet wired up.
          </span>
          <span style={{ fontSize: "0.75rem", color: "#f4f3f3", opacity: 0.15, textAlign: "center" }}>
            Logs and chat will appear here.
          </span>
        </div>
      </div>
    </>
  );
}
