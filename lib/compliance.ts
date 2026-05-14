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

  let chainAccentConsistent: ComplianceCheck = ok();
  if (story.chain && chainSiblings && chainSiblings.length >= 2) {
    const colors = new Set(chainSiblings.map((s) => s.accentColor.toLowerCase()));
    if (colors.size > 1) {
      chainAccentConsistent = fail(`Chain "${story.chain}" mixes ${colors.size} accent colors`);
    }
  }

  return {
    colorValid,
    headlineOk,
    bodyOk,
    sourcePresent,
    chainAccentConsistent,
    pass: colorValid.pass && headlineOk.pass && bodyOk.pass && sourcePresent.pass && chainAccentConsistent.pass,
  };
}
