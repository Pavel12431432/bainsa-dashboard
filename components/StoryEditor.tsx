"use client";

import { useState } from "react";
import { Story } from "@/types";
import { ACCENT_COLORS } from "@/types";
import StoryCard from "./StoryCard";

interface Props {
  story: Story;
  date: string;
  onClose: () => void;
  onSaved: (updated: Story) => void;
}

const DIVISIONS = ["Analysis", "Projects", "Culture"] as const;

export default function StoryEditor({ story, date, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Story>({ ...story });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof Story, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-sync accent color when division changes
      if (field === "division" && ACCENT_COLORS[value]) {
        next.accentColor = ACCENT_COLORS[value];
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/stories/${date}/${draft.index}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(draft);
      onClose();
    } catch {
      setError("Save failed — try again.");
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Modal panel — stop click propagation so backdrop doesn't close it */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          border: "1px solid #222",
          borderRadius: "12px",
          display: "flex",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Left: live preview */}
        <div
          style={{
            padding: "32px",
            background: "#0d0d0d",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid #1a1a1a",
            flexShrink: 0,
          }}
        >
          <StoryCard story={draft} scale={0.72} />
        </div>

        {/* Right: edit form */}
        <div
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f4f3f3", margin: 0, letterSpacing: "0.06em" }}>
              EDIT STORY {draft.index}
            </h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1, padding: 0 }}>
              ✕
            </button>
          </div>

          <Field label="HEADLINE">
            <textarea
              value={draft.headline}
              onChange={(e) => update("headline", e.target.value)}
              rows={2}
              style={textareaStyle}
            />
            <CharCount value={draft.headline} max={80} />
          </Field>

          <Field label="BODY">
            <textarea
              value={draft.body}
              onChange={(e) => update("body", e.target.value)}
              rows={4}
              style={textareaStyle}
            />
            <CharCount value={draft.body} max={240} />
          </Field>

          <Field label="SOURCE TAG">
            <input
              type="text"
              value={draft.sourceTag}
              onChange={(e) => update("sourceTag", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "flex", gap: "16px" }}>
            <Field label="DIVISION" style={{ flex: 1 }}>
              <select
                value={draft.division}
                onChange={(e) => update("division", e.target.value)}
                style={inputStyle}
              >
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="CORNER ACCENT" style={{ flex: 1 }}>
              <select
                value={draft.cornerAccent}
                onChange={(e) => update("cornerAccent", e.target.value as ">" | "+")}
                style={inputStyle}
              >
                <option value=">">› Chevron</option>
                <option value="+">+ Plus</option>
              </select>
            </Field>
          </div>

          {error && (
            <p style={{ color: "#fe6203", fontSize: "0.8rem", margin: 0 }}>{error}</p>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "auto", paddingTop: "8px" }}>
            <button onClick={onClose} style={secondaryBtnStyle}>
              CANCEL
            </button>
            <button onClick={handleSave} disabled={saving} style={primaryBtnStyle(saving)}>
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "#666", letterSpacing: "0.08em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span style={{ fontSize: "0.65rem", color: over ? "#fe6203" : "#555", textAlign: "right" }}>
      {value.length}/{max}
    </span>
  );
}

const textareaStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "5px",
  padding: "10px 12px",
  color: "#f4f3f3",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  lineHeight: 1.5,
  resize: "vertical",
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "5px",
  padding: "10px 12px",
  color: "#f4f3f3",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #333",
  background: "transparent",
  color: "#f4f3f3",
  fontSize: "0.75rem",
  fontWeight: 600,
  fontFamily: "inherit",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 2,
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    background: disabled ? "#333" : "#f4f3f3",
    color: disabled ? "#666" : "#0a0a0a",
    fontSize: "0.75rem",
    fontWeight: 600,
    fontFamily: "inherit",
    letterSpacing: "0.06em",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
