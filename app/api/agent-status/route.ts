import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { fileExists } from "@/lib/fs";
import { isValidDate, todayRome } from "@/lib/date";
import { requireEnv } from "@/lib/env";

async function getStatus(filePath: string, countFn: (content: string) => number) {
  if (!(await fileExists(filePath)))
    return { ranToday: false, lastRun: null, count: null, content: null };
  const [s, content] = await Promise.all([stat(filePath), readFile(filePath, "utf-8")]);
  return {
    ranToday: true,
    lastRun: s.mtime.toISOString(),
    count: countFn(content),
    content,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayRome();
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const marcoPath = requireEnv("MARCO_HANDOFFS_PATH");
  const sofiaPath = requireEnv("STORIES_PATH");

  const [marco, sofia] = await Promise.all([
    getStatus(`${marcoPath}/${date}.md`, (c) => (c.match(/^## Story \d+:/gm) ?? []).length),
    getStatus(`${sofiaPath}/${date}.md`, (c) => (c.match(/^## Story \d+/gm) ?? []).length),
  ]);

  return NextResponse.json({ marco, sofia });
}
