import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { fileExists } from "@/lib/fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const storiesPath = process.env.STORIES_PATH ?? "";
  const filePath = `${storiesPath}/${date}.md`;

  if (!(await fileExists(filePath))) {
    return NextResponse.json({ stories: [], approvals: { approved: [], rejected: [] } });
  }

  const [markdown, approvals] = await Promise.all([
    readFile(filePath, "utf-8"),
    readApprovals(date),
  ]);

  return NextResponse.json({ stories: parseStories(markdown), approvals });
}
