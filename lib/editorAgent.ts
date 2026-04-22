import { chatWithAgent } from "@/lib/openclaw";
import type { FeedbackBundle } from "@/lib/editorFeedback";

export interface RationaleBullet {
  text: string;
  signalRefs: string[];
}

export interface Conflict {
  description: string;
  signalRefs: string[];
}

export interface EditorProposal {
  status: "proposal" | "no-changes";
  summary: string;
  rationale: RationaleBullet[];
  conflicts: Conflict[];
  /** Full ADAPTIVE.md content; null when status is "no-changes". */
  proposedContent: string | null;
}

/** Build the single message we send to Lorenzo.
 *  Wraps the FeedbackBundle in a tagged block and nothing else — the agent's
 *  SOUL.md describes how to interpret it. */
export function buildProposalPrompt(bundle: FeedbackBundle): string {
  return [
    "Review the human feedback bundle below and respond with a JSON proposal as described in your SOUL.md.",
    "",
    "<FeedbackBundle>",
    JSON.stringify(bundle, null, 2),
    "</FeedbackBundle>",
  ].join("\n");
}

/** Extract the first `{...}` JSON block from the agent's response.
 *  Tolerates ```json fences and stray preamble. */
function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in agent response");
  }
  return raw.slice(start, end + 1);
}

export function parseProposal(raw: string): EditorProposal {
  const jsonText = extractJsonBlock(raw);
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Agent response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Agent response is not an object");
  }
  const obj = data as Record<string, unknown>;

  const status = obj.status;
  if (status !== "proposal" && status !== "no-changes") {
    throw new Error(`Invalid status: ${JSON.stringify(status)}`);
  }

  const summary = typeof obj.summary === "string" ? obj.summary : "";

  const rationale = Array.isArray(obj.rationale)
    ? obj.rationale.map((r: unknown): RationaleBullet => {
        const x = (r ?? {}) as Record<string, unknown>;
        return {
          text: typeof x.text === "string" ? x.text : "",
          signalRefs: Array.isArray(x.signalRefs)
            ? x.signalRefs.filter((s): s is string => typeof s === "string")
            : [],
        };
      })
    : [];

  const conflicts = Array.isArray(obj.conflicts)
    ? obj.conflicts.map((c: unknown): Conflict => {
        const x = (c ?? {}) as Record<string, unknown>;
        return {
          description: typeof x.description === "string" ? x.description : "",
          signalRefs: Array.isArray(x.signalRefs)
            ? x.signalRefs.filter((s): s is string => typeof s === "string")
            : [],
        };
      })
    : [];

  const proposedContent =
    typeof obj.proposedContent === "string" ? obj.proposedContent : null;

  if (status === "proposal" && !proposedContent) {
    throw new Error("status is 'proposal' but proposedContent is missing");
  }
  if (status === "no-changes" && proposedContent) {
    throw new Error("status is 'no-changes' but proposedContent is present");
  }

  return { status, summary, rationale, conflicts, proposedContent };
}

export async function runEditorAgent(
  bundle: FeedbackBundle,
  sessionId: string,
): Promise<EditorProposal> {
  const prompt = buildProposalPrompt(bundle);
  const raw = await chatWithAgent("lorenzo", sessionId, prompt);
  return parseProposal(raw);
}
