import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { collectFeedback } from "@/lib/editorFeedback";
import { runEditorAgent } from "@/lib/editorAgent";
import { readProposal, writeProposal, deleteProposal, StoredProposal } from "@/lib/proposals";
import { computeFreshWarnings } from "@/lib/proposalWarnings";

export async function GET() {
  const proposal = await readProposal();
  return NextResponse.json({ proposal });
}

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as { days?: number; focus?: string };
  const days = typeof body.days === "number" ? body.days : 14;
  if (!Number.isFinite(days) || days < 0 || days > 90) {
    return NextResponse.json({ error: "days must be 0-90" }, { status: 400 });
  }
  const rawFocus = typeof body.focus === "string" ? body.focus.trim() : "";
  // Cap focus length to keep prompts bounded; 500 chars is plenty for an
  // operator instruction and stops a pathological paste from ballooning.
  if (rawFocus.length > 500) {
    return NextResponse.json({ error: "focus must be 500 chars or fewer" }, { status: 400 });
  }
  const focus = rawFocus || undefined;
  // days=0 means "no feedback" — only useful with a focus, otherwise Lorenzo
  // would have nothing to act on and we'd waste a model call.
  if (days === 0 && !focus) {
    return NextResponse.json(
      { error: "focus is required when days is 0 — without feedback or focus, there's nothing to propose" },
      { status: 400 },
    );
  }

  try {
    const bundle = await collectFeedback(days);
    const sessionId = `editor-agent-${Date.now()}`;
    const proposal = await runEditorAgent(bundle, sessionId, undefined, focus);

    const warnings = computeFreshWarnings(proposal, bundle.currentAdaptive);

    const stored: StoredProposal = {
      ...proposal,
      generatedAt: new Date().toISOString(),
      basedOnAdaptive: bundle.currentAdaptive,
      basedOnSummary: bundle.summary,
      windowDays: bundle.windowDays,
      ...(focus ? { operatorFocus: focus } : {}),
      ...(warnings.length ? { warnings } : {}),
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
