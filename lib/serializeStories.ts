import { readFile, writeFile } from "fs/promises";
import { Story } from "@/types";
import { requireEnv } from "@/lib/env";

export function serializeStory(story: Story): string {
  const chainBlock = story.chain && story.chainRole
    ? `**Chain:** ${story.chain}\n**Chain role:** ${story.chainRole}\n\n`
    : "";
  return `
---
## Story ${story.index}

${chainBlock}**Division:** ${story.division}
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

/**
 * Append new stories to today's markdown file with auto-assigned indexes.
 *
 * Reads the existing file (treating missing as empty), assigns sequential
 * indexes starting at max(existing) + 1 to each new story, serializes the
 * appended block, and writes it back. Returns the new stories with their
 * assigned indexes.
 */
export async function appendStories(date: string, newStories: Omit<Story, "index">[]): Promise<Story[]> {
  const path = `${requireEnv("STORIES_PATH")}/${date}.md`;
  let existing = "";
  try {
    existing = await readFile(path, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Use a heading-only regex scan (not parseStories) to find the highest
  // existing index. parseStories validates every field and would return [] on
  // a partially-corrupt file — that would silently restart numbering at 1 and
  // produce duplicate `## Story 1` blocks. Counting headings survives
  // corruption: if the file has any `## Story N` line we'll find the max.
  const headingMatches = existing.matchAll(/^##\s+Story\s+(\d+)/gm);
  const existingIndexes = Array.from(headingMatches, (m) => parseInt(m[1], 10));
  if (existing.trim() && existingIndexes.length === 0) {
    throw new Error(`Stories file ${path} has content but no parseable story headings — refusing to append`);
  }
  const startIndex = existingIndexes.length === 0 ? 1 : Math.max(...existingIndexes) + 1;

  const indexed: Story[] = newStories.map((s, i) => ({ ...s, index: startIndex + i }));
  const appendedMarkdown = serializeStories(indexed);

  const trimmedExisting = existing.replace(/\s+$/, "");
  const next = trimmedExisting
    ? `${trimmedExisting}\n\n${appendedMarkdown}\n`
    : `${appendedMarkdown}\n`;

  await writeFile(path, next, "utf-8");
  return indexed;
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
