import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { replaceStory } from "@/lib/serializeStories";
import { fileExists } from "@/lib/fs";
import { Story } from "@/types";
import { requireEnv } from "@/lib/env";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";

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

  const updates: Partial<Story> = await req.json();
  const markdown = await readFile(filePath, "utf-8");

  const updated = replaceStory(markdown, {
    ...updates,
    index: parseInt(index, 10),
  } as Story);

  await writeFile(filePath, updated, "utf-8");
  return NextResponse.json({ ok: true });
}
