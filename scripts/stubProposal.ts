/**
 * Write a canned proposal sidecar to SOFIA_INSTRUCTIONS_PATH so the
 * Teach page renders the proposal UI instantly — no Lorenzo call.
 *
 * Usage:
 *   npm run stub-proposal proposal
 *   npm run stub-proposal conflict
 *   npm run stub-proposal no-changes
 *   npm run stub-proposal stale      (proposal but basedOnAdaptive mismatches live)
 *
 * After running, reload /teach. Click REJECT/DISMISS on the proposal to
 * clear, or re-run this script to overwrite.
 *
 * Reads SOFIA_INSTRUCTIONS_PATH from .env.local.
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { StoredProposal } from "../lib/proposals";

function loadEnv() {
  // Minimal .env.local loader — no dependency on Next.js runtime.
  const path = join(process.cwd(), ".env.local");
  return readFile(path, "utf-8")
    .then((s) => {
      for (const line of s.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    })
    .catch(() => {});
}

type Scenario = "proposal" | "conflict" | "no-changes" | "stale" | "shrinkage" | "refined";

function build(scenario: Scenario, currentAdaptive: string): StoredProposal {
  const now = new Date().toISOString();
  const baseSummary = {
    approvals: 12,
    rejections: 4,
    edits: 3,
    variantsApplied: 2,
    variantsDisliked: 1,
    datesCovered: 7,
  };

  const proposedContent = `# ADAPTIVE.md

## Tone
- Direct and informative. Avoid corporate-speak.
- Write like a smart friend explaining the news, not a press release.
- Cut buzzwords ("leverage", "synergy", "facilitate") on sight.

## Structure
- Lead with the key fact in the headline.
- Body adds one specific detail the headline couldn't fit.
- Source tag is the org or site that broke the news.
`;

  if (scenario === "no-changes") {
    return {
      status: "no-changes",
      summary: "Stub: signal is too weak to justify a change. Four approvals, one vague rejection, and no clear pattern across edits.",
      rationale: [],
      conflicts: [],
      proposedContent: null,
      generatedAt: now,
      basedOnAdaptive: currentAdaptive,
      basedOnSummary: baseSummary,
      windowDays: 14,
    };
  }

  if (scenario === "conflict") {
    return {
      status: "proposal",
      summary: "Stub: rejections disagree about length — some say too short, others too long. Proposing a nuanced length rule while flagging the contradiction.",
      rationale: [
        {
          text: "Replace the blunt length rule with a balance rule: keep copy tight, but give readers enough context to know why the news matters.",
          signalRefs: ["rejection-0", "rejection-1"],
        },
        {
          text: "Favor headlines that get to the point quickly, then use the body for one concrete detail instead of extra scene-setting.",
          signalRefs: ["rejection-2", "rejection-3", "edit-0"],
        },
      ],
      conflicts: [
        {
          description: "Two rejections complain copy is too short and lacks context; two others complain it's too long and wordy. The new rule tries to thread both — review carefully.",
          signalRefs: ["rejection-0", "rejection-1", "rejection-2", "rejection-3"],
        },
      ],
      proposedContent,
      generatedAt: now,
      basedOnAdaptive: currentAdaptive,
      basedOnSummary: baseSummary,
      windowDays: 14,
    };
  }

  if (scenario === "shrinkage") {
    return {
      status: "proposal",
      summary: "Stub: proposedContent is deliberately much smaller than the current ADAPTIVE.md to trigger the significant-shrinkage warning.",
      rationale: [
        {
          text: "Consolidate the tone section to a single punchy rule.",
          signalRefs: ["rejection-0"],
        },
      ],
      conflicts: [],
      proposedContent: "# ADAPTIVE.md\n\n## Tone\n- Sound human.\n",
      generatedAt: now,
      basedOnAdaptive: currentAdaptive,
      basedOnSummary: baseSummary,
      windowDays: 14,
      warnings: ["significant-shrinkage"],
    };
  }

  if (scenario === "refined") {
    return {
      status: "proposal",
      summary: "Stub: a proposal that has been refined twice, to test the breadcrumb + UNDO REFINE button.",
      rationale: [
        {
          text: "Add tone rules and a punchiness constraint on headlines.",
          signalRefs: ["rejection-0", "rejection-1"],
        },
      ],
      conflicts: [],
      proposedContent,
      generatedAt: now,
      basedOnAdaptive: currentAdaptive,
      basedOnSummary: baseSummary,
      windowDays: 14,
      refineHistory: [
        { nudge: "make it sound more student-y", refinedAt: now },
        { nudge: "also mention punchiness", refinedAt: now },
      ],
      previousProposal: {
        status: "proposal",
        summary: "Stub: the proposal as it was before the last refine — used to test UNDO REFINE.",
        rationale: [
          { text: "Add tone rules only.", signalRefs: ["rejection-0"] },
        ],
        conflicts: [],
        proposedContent: proposedContent.replace(
          /- Cut buzzwords[^\n]*\n/,
          "",
        ),
        generatedAt: now,
        basedOnAdaptive: currentAdaptive,
        basedOnSummary: baseSummary,
        windowDays: 14,
      },
    };
  }

  if (scenario === "stale") {
    return {
      status: "proposal",
      summary: "Stub: this proposal was generated against an older ADAPTIVE.md; the stale banner should appear.",
      rationale: [
        {
          text: "Add a tone rule about sounding human, not corporate.",
          signalRefs: ["rejection-0", "rejection-1", "rejection-2"],
        },
      ],
      conflicts: [],
      proposedContent,
      generatedAt: now,
      basedOnAdaptive: "# ADAPTIVE.md\n\nThis is deliberately different from the live file to trigger the stale banner.\n",
      basedOnSummary: baseSummary,
      windowDays: 14,
    };
  }

  // default — plain proposal
  return {
    status: "proposal",
    summary: "Stub: clear pattern — four rejections all cite 'too corporate / sounds like a press release.' Edits shortened headlines and cut buzzwords. Proposing explicit tone guidance.",
    rationale: [
      {
        text: "Add a hard tone rule: avoid press-release, enterprise, and buzzword language; write like a smart student would say it.",
        signalRefs: ["rejection-0", "rejection-1", "rejection-2", "rejection-3"],
      },
      {
        text: "Prefer plain, punchy headlines over formal corporate phrasing; edits consistently turned 'announces / comprehensive / strategic' into shorter, more direct wording.",
        signalRefs: ["edit-0", "edit-1", "edit-2"],
      },
    ],
    conflicts: [],
    proposedContent,
    generatedAt: now,
    basedOnAdaptive: currentAdaptive,
    basedOnSummary: baseSummary,
    windowDays: 14,
  };
}

async function main() {
  await loadEnv();
  const base = process.env.SOFIA_INSTRUCTIONS_PATH;
  if (!base) {
    console.error("SOFIA_INSTRUCTIONS_PATH is not set (check .env.local)");
    process.exit(1);
  }

  const arg = (process.argv[2] ?? "proposal") as Scenario;
  const known: Scenario[] = ["proposal", "conflict", "no-changes", "stale", "shrinkage", "refined"];
  if (!known.includes(arg)) {
    console.error(`Unknown scenario: ${arg}`);
    console.error(`Available: ${known.join(", ")}`);
    process.exit(1);
  }

  const adaptive = await readFile(`${base}/ADAPTIVE.md`, "utf-8").catch(() => "");
  const proposal = build(arg, adaptive);
  await writeFile(`${base}/ADAPTIVE.proposal.json`, JSON.stringify(proposal, null, 2), "utf-8");
  console.log(`Wrote ${arg} proposal to ${base}/ADAPTIVE.proposal.json`);
  console.log("Reload /teach to see it. REJECT/DISMISS in the UI (or re-run this script) to overwrite.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
