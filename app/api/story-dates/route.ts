import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { requireEnv } from "@/lib/env";

const DATE_RE = /^\d{4}-\d{2}-\d{2}\.md$/;

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? "");
  const month = parseInt(req.nextUrl.searchParams.get("month") ?? "");

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const storiesPath = requireEnv("STORIES_PATH");
  const files = await readdir(storiesPath);
  const prefix = `${year}-${month.toString().padStart(2, "0")}-`;

  const days = files
    .filter((f) => DATE_RE.test(f) && f.startsWith(prefix))
    .map((f) => parseInt(f.slice(8, 10)));

  return NextResponse.json({ days });
}
