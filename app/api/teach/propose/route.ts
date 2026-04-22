import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { collectFeedback } from "@/lib/editorFeedback";
import { runEditorAgent } from "@/lib/editorAgent";
import { readProposal, writeProposal, deleteProposal, StoredProposal } from "@/lib/proposals";

export async function GET() {
  const proposal = await readProposal();
  return NextResponse.json({ proposal });
}

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as { days?: number };
  const days = typeof body.days === "number" ? body.days : 14;
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: "days must be 1-90" }, { status: 400 });
  }

  try {
    const bundle = await collectFeedback(days);
    const sessionId = `editor-agent-${Date.now()}`;
    const proposal = await runEditorAgent(bundle, sessionId);

    const stored: StoredProposal = {
      ...proposal,
      generatedAt: new Date().toISOString(),
      basedOnAdaptive: bundle.currentAdaptive,
      basedOnSummary: bundle.summary,
      windowDays: bundle.windowDays,
    };
    await writeProposal(stored);

    return NextResponse.json({ proposal: stored });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;
  await deleteProposal();
  return NextResponse.json({ ok: true });
}
