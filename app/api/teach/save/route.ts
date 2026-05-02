import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { addInstructionHistory } from "@/lib/instructionHistory";
import { requireFetch } from "@/lib/apiGuard";
import { appendLog } from "@/lib/logs";

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

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
  await appendLog({
    kind: "adaptive.save",
    actor: "user",
    ok: true,
    summary: `ADAPTIVE.md saved (${label || "Manual edit"})`,
    meta: {
      label: label || "Manual edit",
      lengthDelta: content.length - prev.length,
      newLength: content.length,
    },
  });
  return NextResponse.json({ ok: true });
}
