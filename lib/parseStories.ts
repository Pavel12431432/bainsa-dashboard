import { Story, Layout, ContentType, HeadlineSize, BodyWeight, TextAlign } from "@/types";

function extractField(block: string, key: string): string {
  const re = new RegExp(`\\*\\*${key}:\\*\\*[ \\t]*(.+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function parseLayout(val: string): Layout {
  const v = val.toLowerCase();
  if (v === "center" || v === "bottom") return v;
  return "top";
}

function parseContentType(val: string): ContentType {
  const v = val.toLowerCase();
  if (v === "bullets" || v === "quote") return v;
  return "text";
}

function parseHeadlineSize(val: string): HeadlineSize {
  const v = val.toLowerCase();
  if (v === "large" || v === "compact") return v;
  return "default";
}

function parseBodyWeight(val: string): BodyWeight {
  return val.toLowerCase() === "semibold" ? "semibold" : "regular";
}

function parseTextAlign(val: string): TextAlign {
  return val.toLowerCase() === "justify" ? "justify" : "left";
}

export function parseStories(markdown: string): Story[] {
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
          layout: parseLayout(data.layout ?? data.layoutTemplate ?? ""),
          contentType: parseContentType(data.contentType ?? ""),
          headlineSize: parseHeadlineSize(data.headlineSize ?? ""),
          bodyWeight: parseBodyWeight(data.bodyWeight ?? ""),
          textAlign: parseTextAlign(data.textAlign ?? ""),
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

    // Regex parser — new fields fall back to defaults when missing (backward compat)
    stories.push({
      index,
      title,
      division: extractField(section, "Division") || "Analysis",
      accentColor: extractField(section, "Accent color") || "#fe6203",
      layout: parseLayout(extractField(section, "Layout")),
      contentType: parseContentType(extractField(section, "Content type")),
      headlineSize: parseHeadlineSize(extractField(section, "Headline size")),
      bodyWeight: parseBodyWeight(extractField(section, "Body weight")),
      textAlign: parseTextAlign(extractField(section, "Text align")),
      headline: extractField(section, "Headline"),
      body: extractField(section, "Body"),
      sourceTag: extractField(section, "Source tag"),
      cornerAccent: extractField(section, "Corner accent") === "+" ? "+" : ">",
    });
  }

  return stories;
}
