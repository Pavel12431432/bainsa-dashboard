import { Story, ACCENT_COLORS } from "@/types";
import type { Variant, ApplyMode } from "@/lib/variants";

/** All story keys worth comparing (excludes index, title). */
export const COMPARABLE_KEYS = [
  "headline", "body", "sourceTag", "division", "accentColor",
  "cornerAccent", "layout", "contentType", "headlineSize",
  "bodyWeight", "textAlign", "cornerSize", "accentBar", "ghostAccent",
] as const satisfies readonly (keyof Story)[];

/** Fields treated as "text" for partial variant apply. contentType is here
 *  because body format depends on it (bullets use "> " prefix). */
export const TEXT_FIELDS = ["headline", "body", "contentType"] as const satisfies readonly (keyof Story)[];

export const DESIGN_FIELDS = [
  "layout", "headlineSize", "bodyWeight", "textAlign",
  "cornerSize", "accentBar", "ghostAccent", "cornerAccent",
] as const satisfies readonly (keyof Story)[];

/** All fields Sofia can vary in a variant — union of text + design. */
export const VARIANT_FIELDS = [...TEXT_FIELDS, ...DESIGN_FIELDS] as const;

/** Extract the subset of a variant to apply based on mode. */
export function variantToPatch(variant: Variant, mode: ApplyMode): Partial<Story> {
  const keys =
    mode === "all" ? [...TEXT_FIELDS, ...DESIGN_FIELDS] :
    mode === "text" ? TEXT_FIELDS :
    DESIGN_FIELDS;
  const patch: Partial<Story> = {};
  for (const k of keys) {
    (patch as Record<string, unknown>)[k] = variant[k as keyof Variant];
  }
  return patch;
}

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
