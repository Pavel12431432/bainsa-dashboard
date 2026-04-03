import { Story } from "@/types";

export function serializeStory(story: Story): string {
  return `
---
## Story ${story.index}

**Division:** ${story.division}
**Accent color:** ${story.accentColor}
**Layout:** ${story.layoutTemplate}

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
  // Split on story separators, update the matching story block, rejoin
  const sections = markdown.split(/\n---\n/);
  const result = sections.map((section) => {
    const match = section.match(/^##\s+Story\s+(\d+)/m);
    if (!match) return section;
    if (parseInt(match[1], 10) === updated.index) {
      return serializeStory(updated).replace(/^---\n/, "");
    }
    return section;
  });
  return result.join("\n---\n");
}
