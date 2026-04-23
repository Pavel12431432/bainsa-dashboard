import type { ProposalWarning, StoredProposal } from "@/lib/proposals";
import type { EditorProposal } from "@/lib/editorAgent";

/** Fraction below which we flag a proposal for significant shrinkage.
 *  Raised on real-world incidents where Lorenzo compressed a ~6KB file
 *  down to ~300B. */
const SHRINKAGE_THRESHOLD = 0.5;

/** Compute warnings for a fresh (non-refine) generation. */
export function computeFreshWarnings(
  proposal: EditorProposal,
  currentAdaptive: string,
): ProposalWarning[] {
  const warnings: ProposalWarning[] = [];
  if (
    proposal.status === "proposal" &&
    proposal.proposedContent &&
    currentAdaptive.length > 0 &&
    proposal.proposedContent.length < currentAdaptive.length * SHRINKAGE_THRESHOLD
  ) {
    warnings.push("significant-shrinkage");
  }
  return warnings;
}

/** Compute warnings for a refine. Includes shrinkage check against the
 *  previous proposal's content, and an "unchanged" flag for no-op refines. */
export function computeRefineWarnings(
  proposal: EditorProposal,
  previous: StoredProposal,
): ProposalWarning[] {
  const warnings: ProposalWarning[] = [];
  if (!proposal.proposedContent) return warnings;
  const prevContent = previous.proposedContent ?? "";

  if (proposal.proposedContent === prevContent) {
    warnings.push("unchanged-from-previous");
  }
  if (
    prevContent.length > 0 &&
    proposal.proposedContent.length < prevContent.length * SHRINKAGE_THRESHOLD
  ) {
    warnings.push("significant-shrinkage");
  }
  return warnings;
}
