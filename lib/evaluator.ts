import { Story, StoryScore } from "@/types";
import { chatWithAgent } from "@/lib/openclaw";
import { computeTotal } from "@/lib/scores";

export interface EvaluationContext {
  /** Other stories in the same chain (excluding the one being evaluated). Empty/absent if standalone. */
  chainSiblings?: Story[];
  /** Date of the evaluation, used for logging context. */
  date: string;
}

export function buildEvaluatorMessage(story: Story, ctx: EvaluationContext): string {
  const inChain = !!(story.chain && story.chainRole);
  const chainBlock = inChain && ctx.chainSiblings && ctx.chainSiblings.length > 0
    ? `\nChain context: this story is the **${story.chainRole}** of the chain "${story.chain}". Other stories in the same chain:\n${
        ctx.chainSiblings.map(s =>
          `  - [${s.chainRole}] "${s.headline}" — ${s.body.slice(0, 120)}${s.body.length > 120 ? "…" : ""}`
        ).join("\n")
      }`
    : `\nChain context: this is a standalone story (no chain).`;

  return `<EvaluationRequest>

Story to evaluate (#${story.index}):
Division: ${story.division}
Headline: "${story.headline}"
Body: "${story.body}"
Source: "${story.sourceTag}"
Content type: ${story.contentType}
${chainBlock}

Score this story on three dimensions, each 0-100:

1. **Brand voice** — does it sound like BAINSA writes? (restrained, student-aware, factual without hype, Bocconi-relevant).
2. **Engagement** — does it stop the scroll? (hook strength in the first 8 words, CTA clarity, novelty against recent posts).
3. **Topic coherence** — ${inChain
    ? "does this card pull its weight inside the chain? Does it complement the other stories in the chain without overlapping or contradicting them?"
    : "N/A — return null for both topicCoherence and topicCoherenceRationale since this is a standalone story."}

Return JSON only (no commentary), shaped exactly like:

\`\`\`json
{
  "brandVoice": <integer 0-100>,
  "brandVoiceRationale": "<one short sentence>",
  "engagement": <integer 0-100>,
  "engagementRationale": "<one short sentence>",
  "topicCoherence": <integer 0-100 or null>,
  "topicCoherenceRationale": "<one short sentence or null>"
}
\`\`\`

</EvaluationRequest>`;
}

export interface EvaluatorResponse {
  brandVoice: number;
  brandVoiceRationale: string;
  engagement: number;
  engagementRationale: string;
  topicCoherence: number | null;
  topicCoherenceRationale: string | null;
}

export function parseEvaluatorResponse(text: string): EvaluatorResponse {
  // Prefer fenced JSON block, fall back to the whole text.
  const block = text.match(/```json\s*([\s\S]*?)\s*```/);
  const raw = block ? block[1] : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Anna returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Anna response is not an object");
  }
  const data = parsed as Record<string, unknown>;

  function num(field: string, allowNull = false): number | null {
    const v = data[field];
    if (allowNull && v === null) return null;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Anna response missing or invalid ${field}`);
    }
    return v;
  }
  function str(field: string, allowNull = false): string | null {
    const v = data[field];
    if (allowNull && v === null) return null;
    if (typeof v !== "string") {
      throw new Error(`Anna response missing or invalid ${field}`);
    }
    return v;
  }

  return {
    brandVoice: num("brandVoice")!,
    brandVoiceRationale: str("brandVoiceRationale")!,
    engagement: num("engagement")!,
    engagementRationale: str("engagementRationale")!,
    topicCoherence: num("topicCoherence", true),
    topicCoherenceRationale: str("topicCoherenceRationale", true),
  };
}

export async function evaluateStory(story: Story, ctx: EvaluationContext): Promise<StoryScore> {
  const message = buildEvaluatorMessage(story, ctx);
  const sessionId = `anna-${ctx.date}-${story.index}-${Date.now()}`;
  const response = await chatWithAgent("anna", sessionId, message, {
    actor: "user",
    mode: "evaluate",
    date: ctx.date,
    storyIndex: story.index,
  });
  const parsed = parseEvaluatorResponse(response);
  const total = computeTotal(parsed);
  return {
    storyIndex: story.index,
    brandVoice: parsed.brandVoice,
    brandVoiceRationale: parsed.brandVoiceRationale,
    engagement: parsed.engagement,
    engagementRationale: parsed.engagementRationale,
    topicCoherence: parsed.topicCoherence,
    topicCoherenceRationale: parsed.topicCoherenceRationale,
    total,
    evaluatedAt: new Date().toISOString(),
  };
}
