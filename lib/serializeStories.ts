import { Story } from "@/types";

export function serializeStory(story: Story): string {
  return `
---
## Story ${story.index}

**Division:** ${story.division}
**Accent color:** ${story.accentColor}
**Layout:** ${story.layout}
**Content type:** ${story.contentType}
**Headline size:** ${story.headlineSize}
**Body weight:** ${story.bodyWeight}
**Text align:** ${story.textAlign}
**Corner size:** ${story.cornerSize}
**Accent bar:** ${story.accentBar}
**Ghost accent:** ${story.ghostAccent}

**Headline:** ${story.headline}
**Body:** ${story.body}
**Source tag:** ${story.sourceTag}

**Corner accent:** ${story.cornerAccent}
`.trimStart();
}

export function serializeStories(stories: Story[]): string {
  return stories.map(serializeStory).join("\n");
}

export function replaceStory(markdown: string, updated: Story): string {
  // Split on the `## Story N` heading boundary (lookahead keeps the heading
  // attached). Tolerates files with or without `---` separators — the
  // separator (if present) stays on the *previous* section, so rejoining
  // with empty string reconstructs the file faithfully.
  const sections = markdown.split(/(?=^##\s+Story\s+\d+)/m);
  const result = sections.map((section) => {
    const match = section.match(/^##\s+Story\s+(\d+)/m);
    if (!match) return section;
    if (parseInt(match[1], 10) === updated.index) {
      // Preserve any leading `---\n` (or other prefix) that came before the
      // heading on the original section, then replace the heading-onwards body.
      const headingIdx = section.indexOf(match[0]);
      const prefix = section.slice(0, headingIdx);
      const trailingNewline = section.endsWith("\n") ? "\n" : "";
      const body = serializeStory(updated).replace(/^---\n/, "").trimEnd();
      return prefix + body + trailingNewline;
    }
    return section;
  });
  return result.join("");
}
