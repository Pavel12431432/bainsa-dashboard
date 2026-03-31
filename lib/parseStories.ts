import { Story } from "@/types";

function extractField(block: string, key: string): string {
  const re = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

export function parseStories(markdown: string): Story[] {
  // Try JSON block format first (future Sofia output)
  const stories: Story[] = [];

  // Split on story section separators (--- lines)
  const sections = markdown.split(/\n---\n/);

  for (const section of sections) {
    const titleMatch = section.match(/^##\s+Story\s+(\d+)(?::\s+(.+))?/m);
    if (!titleMatch) continue;

    const index = parseInt(titleMatch[1], 10);
    const title = titleMatch[2]?.trim() ?? "";

    // Check for embedded JSON block
    const jsonMatch = section.match(/```json\s*([\s\S]+?)\s*```/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        stories.push({
          index,
          title,
          division: data.division ?? "Analysis",
          accentColor: data.accentColor ?? "#fe6203",
          layoutTemplate: data.layoutTemplate ?? "headline-top-body-source",
          headline: data.headline ?? "",
          body: data.body ?? "",
          sourceTag: data.sourceTag ?? "",
          cornerAccent: data.cornerAccent === "+" ? "+" : ">",
        });
        continue;
      } catch {
        // fall through to regex parser
      }
    }

    // Regex parser for current Sofia output format
    stories.push({
      index,
      title,
      division: extractField(section, "Division") || "Analysis",
      accentColor: extractField(section, "Accent color") || "#fe6203",
      layoutTemplate: extractField(section, "Layout") || "headline-top-body-source",
      headline: extractField(section, "Headline"),
      body: extractField(section, "Body"),
      sourceTag: extractField(section, "Source tag"),
      cornerAccent: extractField(section, "Corner accent") === "+" ? "+" : ">",
    });
  }

  return stories;
}
