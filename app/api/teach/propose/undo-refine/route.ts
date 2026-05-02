import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { readProposal, writeProposal, StoredProposal } from "@/lib/proposals";
import { appendLog } from "@/lib/logs";

/** Revert the current proposal to its pre-refine state. One level only. */
export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const current = await readProposal();
  if (!current) {
    return NextResponse.json({ error: "No pending proposal" }, { status: 404 });
  }
  if (!current.previousProposal) {
    return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
  }

  // Drop the last refineHistory entry along with the refine itself.
  const restored: StoredProposal = {
    ...current.previousProposal,
    refineHistory: (current.refineHistory ?? []).slice(0, -1),
  };
  await writeProposal(restored);
  await appendLog({
    kind: "proposal.undo-refine",
    actor: "user",
    ok: true,
    summary: "Lorenzo refine undone",
  });
  return NextResponse.json({ proposal: restored });
}
