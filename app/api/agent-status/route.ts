import { NextResponse } from "next/server";
import { existsSync, statSync, readFileSync } from "fs";

function getStatus(filePath: string, countFn: (content: string) => number) {
  if (!existsSync(filePath)) return { ranToday: false, lastRun: null, count: null, content: null };
  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf-8");
  return {
    ranToday: true,
    lastRun: stat.mtime.toISOString(),
    count: countFn(content),
    content,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const today = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const marcoPath = process.env.MARCO_HANDOFFS_PATH ?? "";
  const sofiaPath = process.env.STORIES_PATH ?? "";

  const marco = getStatus(
    `${marcoPath}/${today}.md`,
    (c) => (c.match(/^## Story \d+:/gm) ?? []).length
  );

  const sofia = getStatus(
    `${sofiaPath}/${today}.md`,
    (c) => (c.match(/^## Story \d+:/gm) ?? []).length
  );

  return NextResponse.json({ marco, sofia });
}
