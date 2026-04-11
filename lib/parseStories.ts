import { Story, Layout, ContentType, HeadlineSize, BodyWeight, TextAlign, CornerSize, AccentBar, GhostAccent } from "@/types";

function extractField(block: string, key: string): string {
  const re = new RegExp(`\\*\\*${key}:\\*\\*[ \\t]*(.+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

/** Extract body field, capturing continuation lines that start with > (bullet lines). */
function extractBody(block: string): string {
  const re = /\*\*Body:\*\*[ \t]*(.*)/i;
  const m = block.match(re);
  if (!m) return "";

  const firstLine = m[1].trim();
  // Find where the match ends in the block and look for continuation lines
  const matchEnd = block.indexOf(m[0]) + m[0].length;
  const rest = block.slice(matchEnd);
  const lines = rest.split("\n");
  const continuations: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Continuation lines start with > (bullet points)
    if (trimmed.startsWith(">")) {
      continuations.push(trimmed);
    } else if (trimmed === "") {
      // Skip blank lines between bullets
      continue;
    } else {
      // Hit another field or non-bullet content
      break;
    }
  }

  if (continuations.length > 0) {
    return [firstLine, ...continuations].join("\n");
  }
  return firstLine;
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

function parseCornerSize(val: string): CornerSize {
  return val.toLowerCase() === "medium" ? "medium" : "small";
}

function parseAccentBar(val: string): AccentBar {
  const v = val.toLowerCase();
  if (v === "top" || v === "none") return v;
  return "bottom";
}

function parseGhostAccent(val: string): GhostAccent {
  const v = val.toLowerCase().replace(/\s+/g, "-");
  if (v === "bottom-right" || v === "center" || v === "top-left") return v;
  return "none";
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
          cornerSize: parseCornerSize(data.cornerSize ?? ""),
          accentBar: parseAccentBar(data.accentBar ?? ""),
          ghostAccent: parseGhostAccent(data.ghostAccent ?? ""),
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
      cornerSize: parseCornerSize(extractField(section, "Corner size")),
      accentBar: parseAccentBar(extractField(section, "Accent bar")),
      ghostAccent: parseGhostAccent(extractField(section, "Ghost accent")),
      headline: extractField(section, "Headline"),
      body: extractBody(section),
      sourceTag: extractField(section, "Source tag"),
      cornerAccent: extractField(section, "Corner accent") === "+" ? "+" : ">",
    });
  }

  return stories;
}
