import { readFile, writeFile } from "fs/promises";
import { ApprovalState } from "@/types";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

function approvalPath(date: string): string {
  return `${requireEnv("APPROVALS_PATH")}/${date}.approved.json`;
}

export async function readApprovals(date: string): Promise<ApprovalState> {
  const path = approvalPath(date);
  if (!(await fileExists(path))) return { approved: [], rejected: [] };
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return { approved: [], rejected: [] };
  }
}

export async function writeApprovals(date: string, state: ApprovalState): Promise<void> {
  const path = approvalPath(date);
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}

export async function setApproval(
  date: string,
  index: number,
  action: "approve" | "reject" | "clear"
): Promise<ApprovalState> {
  const state = await readApprovals(date);
  state.approved = state.approved.filter((i) => i !== index);
  state.rejected = state.rejected.filter((i) => i !== index);
  if (action === "approve") state.approved.push(index);
  if (action === "reject") state.rejected.push(index);
  await writeApprovals(date, state);
  return state;
}
