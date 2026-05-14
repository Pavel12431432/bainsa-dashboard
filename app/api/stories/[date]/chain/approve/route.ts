import { NextRequest, NextResponse } from "next/server";
import { setApproval, readApprovals } from "@/lib/approvals";
import { requireFetch } from "@/lib/apiGuard";
import { appendLog } from "@/lib/logs";
import { loadStoriesFile } from "@/lib/storyRead";
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

  const loaded = await loadStoriesFile(date);
  if (!loaded) {
    return NextResponse.json({ error: "No stories for this date" }, { status: 404 });
  }

  // Skip indexes that are already approved — preserves their existing
  // approvedHash so a re-approve doesn't reset staleness tracking.
  const current = await readApprovals(date);
  const alreadyApproved = new Set(current.approved);
  const toApprove = requested.filter((i) => !alreadyApproved.has(i));

  let state = current;
  for (const index of toApprove) {
    const story = loaded.stories.find((s) => s.index === index);
    if (!story) continue;
    state = await setApproval(date, index, "approve", { story });
  }

  await appendLog({
    kind: "story.chain-approve",
    actor: "user",
    ok: true,
    summary: `Chain-approved ${toApprove.length} of ${requested.length} stories on ${date}`,
    meta: { date, requested, approved: toApprove, skipped: requested.filter((i) => alreadyApproved.has(i)) },
  });

  return NextResponse.json({ ok: true, approvals: state, approved: toApprove });
}
