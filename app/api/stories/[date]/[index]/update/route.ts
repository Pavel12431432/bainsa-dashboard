import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { replaceStory } from "@/lib/serializeStories";
import { Story } from "@/types";
import { requireEnv } from "@/lib/env";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";
import { appendLog } from "@/lib/logs";
import { diffFields } from "@/lib/storyUtils";
import { loadStoriesFile } from "@/lib/storyRead";

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

  const loaded = await loadStoriesFile(date);
  if (!loaded) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const sourceParam = req.nextUrl.searchParams.get("source") ?? "manual";
  const source = SOURCES.has(sourceParam) ? (sourceParam as "manual" | "sofia" | "variant") : "manual";

  const updates: Partial<Story> = await req.json();
  const idxNum = parseInt(index, 10);

  const before = loaded.stories.find((s) => s.index === idxNum);
  const after = { ...updates, index: idxNum } as Story;
  const updated = replaceStory(loaded.markdown, after);

  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;
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
