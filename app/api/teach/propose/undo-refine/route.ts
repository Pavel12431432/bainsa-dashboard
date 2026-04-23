import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { readProposal, writeProposal, StoredProposal } from "@/lib/proposals";

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
  return NextResponse.json({ proposal: restored });
}
