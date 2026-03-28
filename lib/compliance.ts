import { Story, ComplianceResult, ACCENT_COLORS } from "@/types";

export function checkCompliance(story: Story): ComplianceResult {
  const expectedColor = ACCENT_COLORS[story.division]?.toLowerCase();
  const colorValid = !expectedColor || story.accentColor.toLowerCase() === expectedColor;
  const headlineOk = story.headline.trim().length > 0 && story.headline.length <= 80;
  const bodyOk = story.body.trim().length > 0 && story.body.length <= 240;
  const sourcePresent = story.sourceTag.trim().length > 0;

  return {
    colorValid,
    headlineOk,
    bodyOk,
    sourcePresent,
    pass: colorValid && headlineOk && bodyOk && sourcePresent,
  };
}
