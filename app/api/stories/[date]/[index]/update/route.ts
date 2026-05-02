import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { replaceStory } from "@/lib/serializeStories";
import { parseStories } from "@/lib/parseStories";
import { fileExists } from "@/lib/fs";
import { Story } from "@/types";
import { requireEnv } from "@/lib/env";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";
import { appendLog } from "@/lib/logs";
import { diffFields } from "@/lib/storyUtils";

const SOURCES = new Set(["manual", "sofia", "variant"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> }
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;

  if (!(await fileExists(filePath))) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const sourceParam = req.nextUrl.searchParams.get("source") ?? "manual";
  const source = SOURCES.has(sourceParam) ? (sourceParam as "manual" | "sofia" | "variant") : "manual";

  const updates: Partial<Story> = await req.json();
  const idxNum = parseInt(index, 10);
  const markdown = await readFile(filePath, "utf-8");

  const before = parseStories(markdown).find((s) => s.index === idxNum);
  const after = { ...updates, index: idxNum } as Story;
  const updated = replaceStory(markdown, after);

  await writeFile(filePath, updated, "utf-8");

  const changedFields = before ? diffFields(before, after) : [];
  await appendLog({
    kind: "story.edit",
    actor: source === "sofia" ? "system" : "user",
    ok: true,
    summary: `Edited story #${idxNum} on ${date} (${source})`,
    meta: { date, storyIndex: idxNum, source, changedFields },
  });

  return NextResponse.json({ ok: true });
}
