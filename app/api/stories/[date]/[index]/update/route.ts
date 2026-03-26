import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { replaceStory } from "@/lib/serializeStories";
import { fileExists } from "@/lib/fs";
import { Story } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INDEX_RE = /^\d+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> }
) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { date, index } = await params;

  if (!DATE_RE.test(date) || !INDEX_RE.test(index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const storiesPath = process.env.STORIES_PATH ?? "";
  const filePath = `${storiesPath}/${date}.md`;

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
