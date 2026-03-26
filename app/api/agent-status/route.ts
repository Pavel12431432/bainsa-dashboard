import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { fileExists } from "@/lib/fs";

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
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const marcoPath = process.env.MARCO_HANDOFFS_PATH ?? "";
  const sofiaPath = process.env.STORIES_PATH ?? "";

  const [marco, sofia] = await Promise.all([
    getStatus(`${marcoPath}/${date}.md`, (c) => (c.match(/^## Story \d+:/gm) ?? []).length),
    getStatus(`${sofiaPath}/${date}.md`, (c) => (c.match(/^## Story \d+:/gm) ?? []).length),
  ]);

  return NextResponse.json({ marco, sofia });
}
