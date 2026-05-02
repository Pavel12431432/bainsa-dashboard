import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";
import { chatWithAgent, buildVariantsMessage, parseVariantsResponse } from "@/lib/openclaw";
import { readVariants, addVariants } from "@/lib/variants";
import { appendLog } from "@/lib/logs";

const BATCH_SIZE = 3;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> },
) {
  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;
  const variants = await readVariants(date, parseInt(index, 10));
  return NextResponse.json({ variants });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> },
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const idxNum = parseInt(index, 10);
  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;
  if (!(await fileExists(filePath))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const markdown = await readFile(filePath, "utf-8");
  const stories = parseStories(markdown);
  const story = stories.find((s) => s.index === idxNum);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const sessionId = `dashboard-${date}-${index}-variants`;
  const userMessage = buildVariantsMessage(story, BATCH_SIZE);

  try {
    const content = await chatWithAgent("sofia", sessionId, userMessage, {
      mode: "variants",
      date,
      storyIndex: idxNum,
    });
    const parsed = parseVariantsResponse(content);
    const variants = await addVariants(date, idxNum, parsed.slice(0, BATCH_SIZE));
    await appendLog({
      kind: "variants.generate",
      actor: "user",
      ok: true,
      summary: `Generated ${parsed.length} variants for story #${idxNum} on ${date}`,
      meta: { date, storyIndex: idxNum, count: parsed.length },
    });
    return NextResponse.json({ variants });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
