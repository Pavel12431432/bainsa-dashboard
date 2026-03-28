import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { requireEnv } from "@/lib/env";

const DATE_RE = /^\d{4}-\d{2}-\d{2}\.md$/;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const storiesPath = requireEnv("STORIES_PATH");
  const files = await readdir(storiesPath);
  const storyFiles = files
    .filter((f) => DATE_RE.test(f))
    .sort()
    .reverse(); // newest first

  const results: { date: string; index: number; title: string; headline: string }[] = [];

  for (const file of storyFiles) {
    if (results.length >= 20) break;
    const date = file.replace(".md", "");
    const md = await readFile(`${storiesPath}/${file}`, "utf-8");
    const stories = parseStories(md);

    for (const story of stories) {
      if (results.length >= 20) break;
      const haystack = `${story.title} ${story.headline} ${story.body} ${story.sourceTag}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({ date, index: story.index, title: story.title, headline: story.headline });
      }
    }
  }

  return NextResponse.json({ results });
}
