import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { requireFetch } from "@/lib/apiGuard";
import { parseStories } from "@/lib/parseStories";
import { readScores, writeScore } from "@/lib/scores";
import { evaluateStory } from "@/lib/evaluator";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import { appendLog } from "@/lib/logs";
import type { Story } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const scores = await readScores(date);
  return NextResponse.json({ scores });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { indices?: number[] };
  const requestedIndices = Array.isArray(body.indices)
    ? body.indices.filter((n) => Number.isInteger(n) && n > 0)
    : null;

  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;
  if (!(await fileExists(filePath))) {
    return NextResponse.json({ error: "No stories for this date" }, { status: 404 });
  }
  const markdown = await readFile(filePath, "utf-8");
  const stories = parseStories(markdown);

  const targets = requestedIndices
    ? stories.filter((s) => requestedIndices.includes(s.index))
    : stories;

  if (targets.length === 0) {
    return NextResponse.json({ error: "No matching stories" }, { status: 404 });
  }

  const chainSiblings = (story: Story): Story[] =>
    story.chain
      ? stories.filter((s) => s.chain === story.chain && s.index !== story.index)
      : [];

  const start = Date.now();
  try {
    const results = await Promise.all(
      targets.map((story) =>
        evaluateStory(story, { date, chainSiblings: chainSiblings(story) }),
      ),
    );

    for (const result of results) {
      await writeScore(date, result);
    }
    const updatedScores = await readScores(date);

    await appendLog({
      kind: "evaluator.batch",
      actor: "user",
      ok: true,
      durationMs: Date.now() - start,
      summary: `Anna evaluated ${results.length} stor${results.length === 1 ? "y" : "ies"} on ${date}`,
      meta: {
        date,
        count: results.length,
        avgTotal: Math.round(results.reduce((a, r) => a + r.total, 0) / results.length),
      },
    });

    return NextResponse.json({ scores: updatedScores, evaluated: results.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await appendLog({
      kind: "evaluator.batch",
      actor: "user",
      ok: false,
      durationMs: Date.now() - start,
      summary: `Anna batch failed for ${date}`,
      meta: { date, error: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
