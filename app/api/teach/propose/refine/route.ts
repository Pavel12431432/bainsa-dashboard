import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { collectFeedback } from "@/lib/editorFeedback";
import { runEditorAgent } from "@/lib/editorAgent";
import { readProposal, writeProposal, StoredProposal } from "@/lib/proposals";
import { computeRefineWarnings } from "@/lib/proposalWarnings";
import { appendLog } from "@/lib/logs";

/** Refine the currently-pending proposal with a free-text nudge. Requires
 *  a pending proposal on disk — if there isn't one we return 400 rather than
 *  silently falling through to a fresh generate. */
export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as { nudge?: string };
  const nudge = typeof body.nudge === "string" ? body.nudge.trim() : "";
  if (!nudge) {
    return NextResponse.json({ error: "nudge is required" }, { status: 400 });
  }

  const previous = await readProposal();
  if (!previous) {
    return NextResponse.json(
      { error: "No pending proposal to refine. Generate a proposal first." },
      { status: 400 },
    );
  }

  try {
    const bundle = await collectFeedback(previous.windowDays);
    const sessionId = `editor-agent-${Date.now()}`;
    const refined = await runEditorAgent(bundle, sessionId, {
      previousProposal: previous,
      nudge,
    });

    const warnings = computeRefineWarnings(refined, previous);
    const refinedAt = new Date().toISOString();
    const turn = { nudge, refinedAt };

    // Strip the previous's own `previousProposal` so undo only goes back one
    // step — keeps the sidecar flat and bounded in size.
    const { previousProposal: _prev, ...previousFlat } = previous;

    const stored: StoredProposal = {
      ...refined,
      generatedAt: refinedAt,
      basedOnAdaptive: bundle.currentAdaptive,
      basedOnSummary: bundle.summary,
      windowDays: bundle.windowDays,
      refineHistory: [...(previous.refineHistory ?? []), turn],
      previousProposal: previousFlat,
      // Carry operatorFocus forward — if the fresh generation had a focus,
      // the breadcrumb should still show it after refines.
      ...(previous.operatorFocus ? { operatorFocus: previous.operatorFocus } : {}),
      ...(warnings.length ? { warnings } : {}),
    };
    await writeProposal(stored);

    await appendLog({
      kind: "proposal.refine",
      actor: "user",
      ok: true,
      summary: `Lorenzo proposal refined (${refined.status})`,
      meta: {
        status: refined.status,
        nudgeLength: nudge.length,
        refineDepth: stored.refineHistory?.length ?? 0,
        warningCount: warnings.length,
      },
    });

    return NextResponse.json({ proposal: stored });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
