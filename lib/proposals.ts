import { readFile, writeFile, unlink } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { fileExists } from "@/lib/fs";
import type { EditorProposal } from "@/lib/editorAgent";
import type { FeedbackSummary } from "@/lib/editorFeedback";

function adaptivePath(): string {
  return `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.md`;
}

export type ProposalWarning =
  | "significant-shrinkage"
  | "unchanged-from-previous";

export interface RefineTurn {
  nudge: string;
  refinedAt: string;
}

export interface StoredProposal extends EditorProposal {
  generatedAt: string;
  /** Hash-like marker of the ADAPTIVE.md this proposal was built against,
   *  used to detect "stale vs current" when ADAPTIVE.md changes out from
   *  under the proposal. We just store the full content the agent saw. */
  basedOnAdaptive: string;
  /** Summary of the feedback bundle used to generate this proposal.
   *  Lets us compute "significant new feedback since generatedAt" later. */
  basedOnSummary: FeedbackSummary;
  windowDays: number;
  /** Server-detected notices the UI surfaces (e.g. "Lorenzo shrank the file
   *  by 60% — review carefully"). Undefined = no warnings. */
  warnings?: ProposalWarning[];
  /** One entry per nudge the operator has asked Lorenzo to apply, in order.
   *  Used for the breadcrumb under the proposal header. */
  refineHistory?: RefineTurn[];
  /** The single prior proposal (pre-refine). Present only when the current
   *  proposal is the result of a refine. Enables one-shot UNDO REFINE — we
   *  deliberately only keep one level to avoid unbounded recursion. */
  previousProposal?: Omit<StoredProposal, "previousProposal">;
  /** Free-text instruction the operator typed before generating. Lets the
   *  proposal panel show a breadcrumb of what was asked for. Fresh
   *  generations only — refines use refineHistory.nudge instead. */
  operatorFocus?: string;
}

function proposalPath(): string {
  return `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.proposal.json`;
}

export async function readProposal(): Promise<StoredProposal | null> {
  const path = proposalPath();
  if (!(await fileExists(path))) return null;
  let stored: StoredProposal;
  try {
    stored = JSON.parse(await readFile(path, "utf-8")) as StoredProposal;
  } catch {
    return null;
  }

  // Self-heal: if the proposal's content already matches live ADAPTIVE.md,
  // it was accepted but the sidecar survived (e.g. delete failed mid-accept).
  // Clean it up silently and report no pending proposal.
  if (stored.status === "proposal" && stored.proposedContent) {
    const current = await readFile(adaptivePath(), "utf-8").catch(() => null);
    if (current !== null && current === stored.proposedContent) {
      await unlink(path).catch(() => {});
      return null;
    }
  }

  return stored;
}

export async function writeProposal(p: StoredProposal): Promise<void> {
  await writeFile(proposalPath(), JSON.stringify(p, null, 2), "utf-8");
}

export async function deleteProposal(): Promise<void> {
  const path = proposalPath();
  if (!(await fileExists(path))) return;
  await unlink(path);
}
