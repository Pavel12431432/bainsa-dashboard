import { Story, ComplianceResult, ComplianceCheck, ACCENT_COLORS, ContentType } from "@/types";

const BODY_MAX: Record<ContentType, number> = {
  text: 300,
  bullets: 200,
  quote: 200,
};

function ok(): ComplianceCheck {
  return { pass: true, detail: "" };
}

function fail(detail: string): ComplianceCheck {
  return { pass: false, detail };
}

export function bodyMaxChars(contentType: ContentType): number {
  return BODY_MAX[contentType] ?? BODY_MAX.text;
}

// `chainSiblings`, when provided, is the list of all stories sharing this
// story's `chain` (including the story itself). Caller filters it; we just
// compare accent colors across the set. Omit it for standalones or when chain
// context isn't in scope (the check passes silently in that case).
export function checkCompliance(story: Story, chainSiblings?: Story[]): ComplianceResult {
  const expectedColor = ACCENT_COLORS[story.division]?.toLowerCase();
  const colorValid = !expectedColor || story.accentColor.toLowerCase() === expectedColor
    ? ok()
    : fail(`Got ${story.accentColor.toLowerCase()}, need ${expectedColor}`);

  const headlineOk = story.headline.trim().length === 0
    ? fail("Headline is empty")
    : story.headline.length > 80
      ? fail(`Headline too long: ${story.headline.length}/80 chars`)
      : ok();

  const max = bodyMaxChars(story.contentType);
  const bodyOk = story.body.trim().length === 0
    ? fail("Body is empty")
    : story.body.length > max
      ? fail(`Body too long: ${story.body.length}/${max} chars`)
      : ok();

  const sourcePresent = story.sourceTag.trim().length > 0
    ? ok()
    : fail("Source tag is missing");

  // Chain identity markers (accent color + corner accent) should be uniform
  // across all members of a chain. Variation in headlineSize / layout / etc.
  // is deliberate per-role styling and not checked here.
  let chainConsistency: ComplianceCheck = ok();
  if (story.chain && chainSiblings && chainSiblings.length >= 2) {
    const colors = new Set(chainSiblings.map((s) => s.accentColor.toLowerCase()));
    const corners = new Set(chainSiblings.map((s) => s.cornerAccent));
    const mismatches: string[] = [];
    if (colors.size > 1) mismatches.push("accent colors");
    if (corners.size > 1) mismatches.push("corner accents");
    if (mismatches.length > 0) {
      chainConsistency = fail(`Chain "${story.chain}" mixes ${mismatches.join(" and ")}`);
    }
  }

  return {
    colorValid,
    headlineOk,
    bodyOk,
    sourcePresent,
    chainConsistency,
    pass: colorValid.pass && headlineOk.pass && bodyOk.pass && sourcePresent.pass && chainConsistency.pass,
  };
}
