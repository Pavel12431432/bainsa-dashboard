import { Story, ComplianceResult, ComplianceCheck, ACCENT_COLORS } from "@/types";

function ok(): ComplianceCheck {
  return { pass: true, detail: "" };
}

function fail(detail: string): ComplianceCheck {
  return { pass: false, detail };
}

export function checkCompliance(story: Story): ComplianceResult {
  const expectedColor = ACCENT_COLORS[story.division]?.toLowerCase();
  const colorValid = !expectedColor || story.accentColor.toLowerCase() === expectedColor
    ? ok()
    : fail(`Got ${story.accentColor.toLowerCase()}, need ${expectedColor}`);

  const headlineOk = story.headline.trim().length === 0
    ? fail("Headline is empty")
    : story.headline.length > 80
      ? fail(`Headline too long: ${story.headline.length}/80 chars`)
      : ok();

  const bodyOk = story.body.trim().length === 0
    ? fail("Body is empty")
    : story.body.length > 240
      ? fail(`Body too long: ${story.body.length}/240 chars`)
      : ok();

  const sourcePresent = story.sourceTag.trim().length > 0
    ? ok()
    : fail("Source tag is missing");

  return {
    colorValid,
    headlineOk,
    bodyOk,
    sourcePresent,
    pass: colorValid.pass && headlineOk.pass && bodyOk.pass && sourcePresent.pass,
  };
}
