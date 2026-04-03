"use client";

import { Story } from "@/types";
import { checkCompliance } from "@/lib/compliance";

const DIVISIONS = ["Analysis", "Projects", "Culture"] as const;

interface Props {
  draft: Story;
  onUpdate: (field: keyof Story, value: string) => void;
  disabled?: boolean;
}

export default function StoryFields({ draft, onUpdate, disabled }: Props) {
  const compliance = checkCompliance(draft);

  return (
    <>
      <Field label="HEADLINE" warning={compliance.headlineOk.pass ? undefined : compliance.headlineOk.detail}>
        <textarea
          value={draft.headline}
          onChange={(e) => onUpdate("headline", e.target.value)}
          rows={2}
          disabled={disabled}
          className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm leading-normal resize-y outline-none disabled:opacity-50"
        />
        <CharCount value={draft.headline} max={80} />
      </Field>

      <Field label="BODY" warning={compliance.bodyOk.pass ? undefined : compliance.bodyOk.detail}>
        <textarea
          value={draft.body}
          onChange={(e) => onUpdate("body", e.target.value)}
          rows={4}
          disabled={disabled}
          className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm leading-normal resize-y outline-none disabled:opacity-50"
        />
        <CharCount value={draft.body} max={240} />
      </Field>

      <Field label="SOURCE TAG" warning={compliance.sourcePresent.pass ? undefined : compliance.sourcePresent.detail}>
        <input
          type="text"
          value={draft.sourceTag}
          onChange={(e) => onUpdate("sourceTag", e.target.value)}
          disabled={disabled}
          className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full disabled:opacity-50"
        />
      </Field>

      <div className="flex gap-4">
        <Field label="DIVISION" className="flex-1">
          <select
            value={draft.division}
            onChange={(e) => onUpdate("division", e.target.value)}
            disabled={disabled}
            className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full disabled:opacity-50"
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="CORNER ACCENT" className="flex-1">
          <select
            value={draft.cornerAccent}
            onChange={(e) => onUpdate("cornerAccent", e.target.value as ">" | "+")}
            disabled={disabled}
            className="bg-border border border-[#2a2a2a] rounded-[5px] px-3 py-2.5 text-brand-white text-sm outline-none w-full disabled:opacity-50"
          >
            <option value=">">&rsaquo; Chevron</option>
            <option value="+">+ Plus</option>
          </select>
        </Field>
      </div>

      {!compliance.colorValid.pass && (
        <p className="text-[0.6rem] font-semibold text-danger -mt-2 m-0">
          {compliance.colorValid.detail}
        </p>
      )}
    </>
  );
}

function Field({
  label,
  children,
  className,
  warning,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  warning?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <label className="text-[0.65rem] font-semibold text-muted tracking-[0.08em]">{label}</label>
        {warning && (
          <span className="text-[0.6rem] font-semibold text-danger">
            {warning}
          </span>
        )}
      </div>
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
