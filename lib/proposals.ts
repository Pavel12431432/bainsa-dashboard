import { readFile, writeFile, unlink } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { fileExists } from "@/lib/fs";
import type { EditorProposal } from "@/lib/editorAgent";
import type { FeedbackSummary } from "@/lib/editorFeedback";

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
}

function proposalPath(): string {
  return `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.proposal.json`;
}

export async function readProposal(): Promise<StoredProposal | null> {
  const path = proposalPath();
  if (!(await fileExists(path))) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8")) as StoredProposal;
  } catch {
    return null;
  }
}

export async function writeProposal(p: StoredProposal): Promise<void> {
  await writeFile(proposalPath(), JSON.stringify(p, null, 2), "utf-8");
}

export async function deleteProposal(): Promise<void> {
  const path = proposalPath();
  if (!(await fileExists(path))) return;
  await unlink(path);
}
