import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { readPosted } from "@/lib/posted";
import { readMarcoStories } from "@/lib/marcoHandoff";
import { fileExists } from "@/lib/fs";
import { isValidDate } from "@/lib/date";
import { requireEnv } from "@/lib/env";

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
    return NextResponse.json({ stories: [], approvals: { approved: [], rejected: [] }, posted: {}, marco: {} });
  }

  const [markdown, approvals, posted, marco] = await Promise.all([
    readFile(filePath, "utf-8"),
    readApprovals(date),
    readPosted(date),
    readMarcoStories(date),
  ]);

  return NextResponse.json({ stories: parseStories(markdown), approvals, posted, marco });
}
