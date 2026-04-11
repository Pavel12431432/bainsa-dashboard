import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { addInstructionHistory } from "@/lib/instructionHistory";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content, label } = await req.json();
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  const base = requireEnv("SOFIA_INSTRUCTIONS_PATH");
  // Snapshot current content before overwriting
  const prev = await readFile(`${base}/ADAPTIVE.md`, "utf-8").catch(() => "");
  await writeFile(`${base}/ADAPTIVE.md`, content, "utf-8");
  // Record history: save the previous version so we can restore it
  if (prev && prev !== content) {
    await addInstructionHistory(prev, label || "Manual edit");
  }
  return NextResponse.json({ ok: true });
}
