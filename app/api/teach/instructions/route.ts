import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { requireEnv } from "@/lib/env";

export async function GET() {
  const base = requireEnv("SOFIA_INSTRUCTIONS_PATH");
  const [fixed, adaptive] = await Promise.all([
    readFile(`${base}/FIXED.md`, "utf-8"),
    readFile(`${base}/ADAPTIVE.md`, "utf-8"),
  ]);
  return NextResponse.json({ fixed, adaptive });
}
