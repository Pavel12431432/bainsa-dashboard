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

export interface RefineContext {
  previousProposal: EditorProposal;
  nudge: string;
}

/** Build the single message we send to Lorenzo.
 *  Wraps the FeedbackBundle in a tagged block and nothing else — the agent's
 *  SOUL.md describes how to interpret it.
 *  When `refine` is provided, appends PreviousProposal + Nudge blocks and a
 *  refine-mode instruction. */
export function buildProposalPrompt(bundle: FeedbackBundle, refine?: RefineContext): string {
  const lines: string[] = [];
  if (refine) {
    lines.push("Refine your previous proposal according to the operator's nudge. See 'Refine mode' in your SOUL.md.");
  } else {
    lines.push("Review the human feedback bundle below and respond with a JSON proposal as described in your SOUL.md.");
  }
  lines.push("");
  lines.push("<FeedbackBundle>");
  lines.push(JSON.stringify(bundle, null, 2));
  lines.push("</FeedbackBundle>");

  if (refine) {
    lines.push("");
    lines.push("<PreviousProposal>");
    lines.push(JSON.stringify(refine.previousProposal, null, 2));
    lines.push("</PreviousProposal>");
    lines.push("");
    lines.push("<Nudge>");
    lines.push(refine.nudge);
    lines.push("</Nudge>");
  }

  return lines.join("\n");
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
  refine?: RefineContext,
): Promise<EditorProposal> {
  const prompt = buildProposalPrompt(bundle, refine);
  const raw = await chatWithAgent("lorenzo", sessionId, prompt);
  return parseProposal(raw);
}
