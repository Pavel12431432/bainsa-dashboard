import { NextRequest, NextResponse } from "next/server";
import { setApproval } from "@/lib/approvals";
import { requireFetch } from "@/lib/apiGuard";
import { appendLog } from "@/lib/logs";
import { isValidDate } from "@/lib/date";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { indexes?: number[] };
  const requested = Array.isArray(body.indexes)
    ? body.indexes.filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (requested.length === 0) {
    return NextResponse.json({ error: "No indexes provided" }, { status: 400 });
  }

  // Reject unconditionally — overrides any prior approval/clear state.
  // No confirmation modal upstream; users can re-approve and the audit
  // log records every batch.
  let state = await setApproval(date, requested[0], "reject");
  for (const index of requested.slice(1)) {
    state = await setApproval(date, index, "reject");
  }

  await appendLog({
    kind: "story.chain-reject",
    actor: "user",
    ok: true,
    summary: `Chain-rejected ${requested.length} stories on ${date}`,
    meta: { date, indexes: requested },
  });

  return NextResponse.json({ ok: true, approvals: state, rejected: requested });
}
