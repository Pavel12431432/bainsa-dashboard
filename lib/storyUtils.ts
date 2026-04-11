import { Story, ACCENT_COLORS } from "@/types";

/** All story keys worth comparing (excludes index, title). */
export const COMPARABLE_KEYS = [
  "headline", "body", "sourceTag", "division", "accentColor",
  "cornerAccent", "layout", "contentType", "headlineSize",
  "bodyWeight", "textAlign", "cornerSize", "accentBar", "ghostAccent",
] as const satisfies readonly (keyof Story)[];

export const FIELD_LABELS: Record<string, string> = {
  headline: "headline",
  body: "body",
  sourceTag: "source tag",
  division: "division",
  accentColor: "accent color",
  cornerAccent: "corner accent",
  layout: "layout",
  contentType: "content type",
  headlineSize: "headline size",
  bodyWeight: "body weight",
  textAlign: "text align",
  cornerSize: "corner size",
  accentBar: "accent bar",
  ghostAccent: "ghost accent",
};

/** Return the keys that differ between two stories. */
export function diffFields(a: Story, b: Story): string[] {
  return COMPARABLE_KEYS.filter((k) => a[k] !== b[k]);
}

/** True if two stories are identical on all comparable keys. */
export function storyEqual(a: Story, b: Story): boolean {
  return COMPARABLE_KEYS.every((k) => a[k] === b[k]);
}

/** Apply partial updates to a story, auto-fixing accent color on division change. */
export function applyUpdates(prev: Story, updates: Partial<Story>): Story {
  const next = { ...prev };
  for (const [key, value] of Object.entries(updates)) {
    if (key in prev && typeof value === "string") {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  if (updates.division && ACCENT_COLORS[updates.division]) {
    next.accentColor = ACCENT_COLORS[updates.division];
  }
  return next;
}
