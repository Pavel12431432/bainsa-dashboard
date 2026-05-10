import { readFile, writeFile } from "fs/promises";
import { ApprovalState, Story } from "@/types";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";
import { hashStory } from "@/lib/storyHash";

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
  action: "approve" | "reject" | "clear",
  options: { feedback?: string; story?: Story } = {}
): Promise<ApprovalState> {
  const { feedback, story } = options;
  const state = await readApprovals(date);
  state.approved = state.approved.filter((i) => i !== index);
  state.rejected = state.rejected.filter((i) => i !== index);
  state.feedback ??= {};
  state.approvedHash ??= {};
  if (action === "approve" || action === "clear") {
    delete state.feedback[index];
  }
  if (action !== "approve") {
    delete state.approvedHash[index];
  }
  if (action === "reject") {
    state.rejected.push(index);
    if (feedback) {
      state.feedback[index] = feedback;
    } else {
      delete state.feedback[index];
    }
  }
  if (action === "approve") {
    state.approved.push(index);
    if (story) state.approvedHash[index] = hashStory(story);
  }
  if (Object.keys(state.feedback).length === 0) delete state.feedback;
  if (Object.keys(state.approvedHash).length === 0) delete state.approvedHash;
  await writeApprovals(date, state);
  return state;
}
