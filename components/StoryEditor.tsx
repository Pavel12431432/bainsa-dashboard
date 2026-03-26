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
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border-light rounded-xl flex w-full max-w-[900px] max-h-[90vh] overflow-hidden max-md:flex-col"
      >
        {/* Preview */}
        <div className="p-8 bg-brand-black flex flex-col items-center justify-center shrink-0 border-r border-border max-md:hidden">
          <StoryCard story={draft} scale={0.72} />
        </div>

        {/* Form */}
        <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-5 max-md:p-5">
          <div className="flex justify-between items-start">
            <h2 className="text-sm font-semibold text-brand-white m-0 tracking-[0.06em]">
              EDIT STORY {draft.index}
            </h2>
            <button onClick={onClose} className="bg-transparent border-none text-muted cursor-pointer text-xl leading-none p-0">
              ✕
            </button>
          </div>

          <Field label="HEADLINE">
            <textarea
              value={draft.headline}
              onChange={(e) => update("headline", e.target.value)}
              rows={2}
              className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm leading-normal resize-y outline-none"
            />
            <CharCount value={draft.headline} max={80} />
          </Field>

          <Field label="BODY">
            <textarea
              value={draft.body}
              onChange={(e) => update("body", e.target.value)}
              rows={4}
              className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm leading-normal resize-y outline-none"
            />
            <CharCount value={draft.body} max={240} />
          </Field>

          <Field label="SOURCE TAG">
            <input
              type="text"
              value={draft.sourceTag}
              onChange={(e) => update("sourceTag", e.target.value)}
              className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full"
            />
          </Field>

          <div className="flex gap-4">
            <Field label="DIVISION" className="flex-1">
              <select
                value={draft.division}
                onChange={(e) => update("division", e.target.value)}
                className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full"
              >
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="CORNER ACCENT" className="flex-1">
              <select
                value={draft.cornerAccent}
                onChange={(e) => update("cornerAccent", e.target.value as ">" | "+")}
                className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full"
              >
                <option value=">">› Chevron</option>
                <option value="+">+ Plus</option>
              </select>
            </Field>
          </div>

          {error && (
            <p className="text-accent-analysis text-[0.8rem] m-0">{error}</p>
          )}

          <div className="flex gap-2.5 mt-auto pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[5px] border border-border-mid bg-transparent text-brand-white text-xs font-semibold tracking-[0.06em] cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-[2] py-2.5 rounded-[5px] border-none text-xs font-semibold tracking-[0.06em] ${
                saving
                  ? "bg-border-mid text-muted cursor-not-allowed"
                  : "bg-brand-white text-brand-black cursor-pointer"
              }`}
            >
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-[0.65rem] font-semibold text-muted tracking-[0.08em]">
        {label}
      </label>
      {children}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={`text-[0.65rem] text-right ${over ? "text-accent-analysis" : "text-[#555]"}`}>
      {value.length}/{max}
    </span>
  );
}
