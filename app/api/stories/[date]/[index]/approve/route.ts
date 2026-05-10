import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { setApproval } from "@/lib/approvals";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";
import { appendLog, type LogKind } from "@/lib/logs";
import { parseStories } from "@/lib/parseStories";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> }
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const { action, feedback } = await req.json();
  const idxNum = parseInt(index, 10);

  let story;
  if (action === "approve") {
    const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;
    if (await fileExists(filePath)) {
      const stories = parseStories(await readFile(filePath, "utf-8"));
      story = stories.find((s) => s.index === idxNum);
    }
  }

  const state = await setApproval(date, idxNum, action, { feedback, story });
  const kind: LogKind | null =
    action === "approve" ? "story.approve" : action === "reject" ? "story.reject" : null;
  if (kind) {
    await appendLog({
      kind,
      actor: "user",
      ok: true,
      summary: `${action === "approve" ? "Approved" : "Rejected"} story #${idxNum} on ${date}`,
      meta: {
        date,
        storyIndex: idxNum,
        feedbackLength: typeof feedback === "string" ? feedback.length : 0,
      },
    });
  }
  return NextResponse.json({ ok: true, approvals: state });
}
