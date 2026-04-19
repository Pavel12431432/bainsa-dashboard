import { execFile } from "child_process";
import { Story } from "@/types";
import { VARIANT_FIELDS } from "@/lib/storyUtils";
import type { NewVariant } from "@/lib/variants";

const AGENT_CLI_NAMES = { marco: "news-researcher", sofia: "story-generator" } as const;
export type AgentId = keyof typeof AGENT_CLI_NAMES;

export function buildUserMessage(story: Story, instruction: string): string {
  const bodyMax = story.contentType === "text" ? 300 : 200;
  return `You are editing a BAINSA Instagram story card. Constraints: headline max 80 chars, body max depends on content type (text: 300, bullets: 200, quote: 200).
Available JSON fields: headline, body, sourceTag, division, cornerAccent, layout, contentType, headlineSize, bodyWeight, textAlign, cornerSize, accentBar, ghostAccent.
For bullets content type: each bullet line starts with "> ", use sentence case (capitalize first word), 2-3 bullets, each 5-10 words.
- layout: "top" | "center" | "bottom"
- contentType: "text" | "bullets" | "quote"
- headlineSize: "large" | "default" | "compact"
- bodyWeight: "regular" | "semibold"
- textAlign: "left" | "justify"
- cornerSize: "small" | "medium"
- accentBar: "bottom" | "top" | "none"
- ghostAccent: "none" | "bottom-right" | "center" | "top-left"

When modifying the story, consider changing both content AND style fields to best fit the new content. For example, if rewriting the body, also consider whether a different layout, content type, headline size, or accent style would work better.

Respond with a brief explanation then a JSON code block with ONLY changed fields. If no changes needed, just respond conversationally.

Current story (#${story.index}):
Headline (${story.headline.length}/80): "${story.headline}"
Body (${story.body.length}/${bodyMax}): "${story.body}"
Source: "${story.sourceTag}"
Division: ${story.division}
Corner accent: ${story.cornerAccent}
Layout: ${story.layout}
Content type: ${story.contentType}
Headline size: ${story.headlineSize}
Body weight: ${story.bodyWeight}
Text align: ${story.textAlign}
Corner size: ${story.cornerSize}
Accent bar: ${story.accentBar}
Ghost accent: ${story.ghostAccent}

User: ${instruction}`;
}

export function chatWithAgent(
  agent: AgentId,
  sessionId: string,
  message: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      [
        "exec", "openclaw", "openclaw", "agent",
        "--agent", AGENT_CLI_NAMES[agent],
        "--session-id", sessionId,
        "--message", message,
        "--json",
        "--timeout", "120",
      ],
      { timeout: 130_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        try {
          const data = JSON.parse(stdout);
          if (data.status !== "ok") {
            return reject(new Error(data.summary ?? "Agent error"));
          }
          const text = data.result?.payloads
            ?.map((p: { text?: string }) => p.text)
            .filter(Boolean)
            .join("\n") ?? "";
          resolve(text);
        } catch {
          reject(new Error("Failed to parse agent response"));
        }
      },
    );
  });
}

export function buildVariantsMessage(story: Story, count: number): string {
  const bodyMax = story.contentType === "text" ? 300 : 200;
  return `You are generating ${count} alternative versions of a BAINSA Instagram story card.

Fixed (do NOT change): division="${story.division}", accentColor="${story.accentColor}", sourceTag="${story.sourceTag}". Keep facts accurate.

Vary both COPY (headline, body) and DESIGN (layout, content type, headline size, body weight, text align, corner size, accent bar, ghost accent, corner accent). Each variant should feel distinctly different in angle/energy/voice and visual treatment.

Field values:
- layout: "top" | "center" | "bottom"
- contentType: "text" | "bullets" | "quote"
- headlineSize: "large" | "default" | "compact"
- bodyWeight: "regular" | "semibold"
- textAlign: "left" | "justify"
- cornerSize: "small" | "medium"
- accentBar: "bottom" | "top" | "none"
- ghostAccent: "none" | "bottom-right" | "center" | "top-left"
- cornerAccent: ">" | "+"

Limits: headline max 80 chars. Body max: text=300, bullets=200, quote=200. For bullets, each bullet line starts with "> ", sentence case, 2-3 bullets, 5-10 words each.

Current story (#${story.index}):
Headline: "${story.headline}"
Body (${story.body.length}/${bodyMax}): "${story.body}"
Division: ${story.division}
Layout: ${story.layout} | Content type: ${story.contentType} | Headline size: ${story.headlineSize} | Body weight: ${story.bodyWeight} | Text align: ${story.textAlign} | Corner size: ${story.cornerSize} | Accent bar: ${story.accentBar} | Ghost accent: ${story.ghostAccent} | Corner accent: ${story.cornerAccent}

Respond with ONLY a JSON code block of this exact shape:
\`\`\`json
{ "variants": [
  { "headline": "...", "body": "...", "contentType": "...", "layout": "...", "headlineSize": "...", "bodyWeight": "...", "textAlign": "...", "cornerSize": "...", "accentBar": "...", "ghostAccent": "...", "cornerAccent": "..." }
] }
\`\`\`
Include exactly ${count} variants. No commentary outside the JSON block.`;
}

export function parseVariantsResponse(content: string): NewVariant[] {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) throw new Error("No JSON block in Sofia response");
  const parsed = JSON.parse(jsonMatch[1]);
  const list = parsed?.variants;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Response has no variants array");
  }
  return list.map((v, i) => {
    for (const k of VARIANT_FIELDS) {
      if (typeof v?.[k] !== "string") {
        throw new Error(`Variant ${i} missing field: ${k}`);
      }
    }
    const out = {} as Record<string, string>;
    for (const k of VARIANT_FIELDS) out[k] = v[k];
    return out as unknown as NewVariant;
  });
}

export function parseResponse(content: string): {
  message: string;
  updates: Record<string, string> | null;
} {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return { message: content.trim(), updates: null };

  try {
    const updates = JSON.parse(jsonMatch[1]);
    const message = content.replace(/```json[\s\S]*?```/, "").trim();
    return { message, updates };
  } catch {
    return { message: content.trim(), updates: null };
  }
}
