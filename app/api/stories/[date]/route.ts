import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const storiesPath = process.env.STORIES_PATH ?? "";
  const filePath = `${storiesPath}/${date}.md`;

  if (!existsSync(filePath)) {
    return NextResponse.json({ stories: [], approvals: { approved: [], rejected: [] } });
  }

  const markdown = readFileSync(filePath, "utf-8");
  const stories = parseStories(markdown);
  const approvals = readApprovals(date);

  return NextResponse.json({ stories, approvals });
}
