import { execFile } from "child_process";
import { Story } from "@/types";

const AGENT_CLI_NAMES = { marco: "news-researcher", sofia: "story-generator" } as const;
export type AgentId = keyof typeof AGENT_CLI_NAMES;

export function buildUserMessage(story: Story, instruction: string): string {
  return `You are editing a BAINSA Instagram story card. Constraints: headline max 80 chars, body max 240 chars.
Available JSON fields: headline, body, sourceTag, division, cornerAccent, layout, contentType, headlineSize, bodyWeight, textAlign, cornerSize, accentBar, ghostAccent.
- layout: "top" | "center" | "bottom"
- contentType: "text" | "bullets" | "quote"
- headlineSize: "large" | "default" | "compact"
- bodyWeight: "regular" | "semibold"
- textAlign: "left" | "justify"
- cornerSize: "small" | "medium"
- accentBar: "bottom" | "top" | "none"
- ghostAccent: "none" | "bottom-right" | "center" | "top-left"

When modifying the story, respond with a brief explanation then a JSON code block with ONLY changed fields. If no changes needed, just respond conversationally.

Current story (#${story.index}):
Headline (${story.headline.length}/80): "${story.headline}"
Body (${story.body.length}/240): "${story.body}"
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
