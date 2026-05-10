import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { readPosted } from "@/lib/posted";
import { readMarcoStories } from "@/lib/marcoHandoff";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import { deriveStale } from "@/lib/storyHash";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;

  if (!(await fileExists(filePath))) {
    return NextResponse.json({ stories: [], approvals: { approved: [], rejected: [] }, posted: {}, marco: {}, stale: [] });
  }

  const [markdown, approvals, posted, marco] = await Promise.all([
    readFile(filePath, "utf-8"),
    readApprovals(date),
    readPosted(date),
    readMarcoStories(date),
  ]);

  const stories = parseStories(markdown);
  const stale = deriveStale(stories, approvals.approved, approvals.approvedHash);
  return NextResponse.json({ stories, approvals, posted, marco, stale });
}
