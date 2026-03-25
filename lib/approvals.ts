import { readFileSync, writeFileSync, existsSync } from "fs";
import { ApprovalState } from "@/types";

function approvalPath(storiesPath: string, date: string): string {
  return `${storiesPath}/${date}.approved.json`;
}

export function readApprovals(date: string): ApprovalState {
  const storiesPath = process.env.APPROVALS_PATH ?? "";
  const path = approvalPath(storiesPath, date);
  if (!existsSync(path)) return { approved: [], rejected: [] };
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { approved: [], rejected: [] };
  }
}

export function writeApprovals(date: string, state: ApprovalState): void {
  const storiesPath = process.env.APPROVALS_PATH ?? "";
  const path = approvalPath(storiesPath, date);
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}

export function setApproval(
  date: string,
  index: number,
  action: "approve" | "reject" | "clear"
): ApprovalState {
  const state = readApprovals(date);
  state.approved = state.approved.filter((i) => i !== index);
  state.rejected = state.rejected.filter((i) => i !== index);
  if (action === "approve") state.approved.push(index);
  if (action === "reject") state.rejected.push(index);
  writeApprovals(date, state);
  return state;
}
