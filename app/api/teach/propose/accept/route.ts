import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { requireFetch } from "@/lib/apiGuard";
import { readProposal, deleteProposal } from "@/lib/proposals";
import { addInstructionHistory } from "@/lib/instructionHistory";

/** Accept the currently pending proposal: write its content to ADAPTIVE.md,
 *  snapshot the previous content to history (tagged editor-agent), and
 *  remove the proposal sidecar. */
export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const proposal = await readProposal();
  if (!proposal) {
    return NextResponse.json({ error: "No pending proposal" }, { status: 404 });
  }
  if (proposal.status !== "proposal" || !proposal.proposedContent) {
    return NextResponse.json({ error: "Proposal has no content to apply" }, { status: 400 });
  }

  const base = requireEnv("SOFIA_INSTRUCTIONS_PATH");
  const path = `${base}/ADAPTIVE.md`;

  const prev = await readFile(path, "utf-8").catch(() => "");
  await writeFile(path, proposal.proposedContent, "utf-8");
  if (prev && prev !== proposal.proposedContent) {
    await addInstructionHistory(prev, "Lorenzo proposal accepted", "editor-agent");
  }

  await deleteProposal();
  return NextResponse.json({ ok: true });
}
