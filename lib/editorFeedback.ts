import { readFile, readdir } from "fs/promises";
import { requireEnv } from "@/lib/env";
import { fileExists } from "@/lib/fs";
import { parseStories } from "@/lib/parseStories";
import { readApprovals } from "@/lib/approvals";
import { readHistory } from "@/lib/history";
import { readVariants, Variant } from "@/lib/variants";
import { readInstructionHistory, InstructionHistoryEntry } from "@/lib/instructionHistory";
import { diffFields } from "@/lib/storyUtils";
import { Story } from "@/types";

const DATE_RE = /^(\d{4}-\d{2}-\d{2})\.md$/;

export interface RejectionSignal {
  date: string;
  storyIndex: number;
  story: Story;
  reason: string;
}

export interface EditSignal {
  date: string;
  storyIndex: number;
  original: Story;
  final: Story;
  changedFields: string[];
}

export interface VariantActivitySignal {
  date: string;
  storyIndex: number;
  applied: Variant[];
  disliked: Variant[];
}

export interface ApprovalSignal {
  date: string;
  storyIndex: number;
  story: Story;
}

export interface FeedbackSummary {
  approvals: number;
  rejections: number;
  edits: number;
  variantsApplied: number;
  variantsDisliked: number;
  datesCovered: number;
}

export interface FeedbackBundle {
  windowDays: number;
  dateRange: { from: string; to: string };
  summary: FeedbackSummary;
  signals: {
    rejections: RejectionSignal[];
    edits: EditSignal[];
    variantActivity: VariantActivitySignal[];
    approvals: ApprovalSignal[];
  };
  currentAdaptive: string;
  adaptiveHistory: InstructionHistoryEntry[]; // last 3 versions, newest first
}

function daysAgo(today: Date, n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function listStoryDatesInWindow(from: string, to: string): Promise<string[]> {
  const storiesPath = requireEnv("STORIES_PATH");
  const files = await readdir(storiesPath);
  const dates: string[] = [];
  for (const f of files) {
    const m = f.match(DATE_RE);
    if (!m) continue;
    const d = m[1];
    if (d >= from && d <= to) dates.push(d);
  }
  dates.sort();
  return dates;
}

async function readStoriesForDate(date: string): Promise<Story[]> {
  const path = `${requireEnv("STORIES_PATH")}/${date}.md`;
  if (!(await fileExists(path))) return [];
  const md = await readFile(path, "utf-8");
  return parseStories(md);
}

async function readCurrentAdaptive(): Promise<string> {
  const path = `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.md`;
  if (!(await fileExists(path))) return "";
  return readFile(path, "utf-8");
}

/** Collect human-feedback signals on Sofia's stories over a rolling window.
 *  Filters by story date (the date of the story file), not activity timestamp —
 *  simpler and matches "recent Sofia output." */
export async function collectFeedback(windowDays: number): Promise<FeedbackBundle> {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = daysAgo(today, windowDays - 1);

  const dates = await listStoryDatesInWindow(from, to);

  const rejections: RejectionSignal[] = [];
  const edits: EditSignal[] = [];
  const variantActivity: VariantActivitySignal[] = [];
  const approvals: ApprovalSignal[] = [];

  for (const date of dates) {
    const stories = await readStoriesForDate(date);
    if (!stories.length) continue;
    const byIndex = new Map(stories.map((s) => [s.index, s]));

    const approvalState = await readApprovals(date);

    for (const idx of approvalState.rejected) {
      const story = byIndex.get(idx);
      if (!story) continue;
      const reason = approvalState.feedback?.[idx] ?? "";
      rejections.push({ date, storyIndex: idx, story, reason });
    }
    for (const idx of approvalState.approved) {
      const story = byIndex.get(idx);
      if (!story) continue;
      approvals.push({ date, storyIndex: idx, story });
    }

    for (const story of stories) {
      const hist = await readHistory(date, story.index);
      if (hist.length < 2) continue;
      const original = hist[0].story;
      const final = hist[hist.length - 1].story;
      const changed = diffFields(original, final);
      if (!changed.length) continue;
      edits.push({
        date,
        storyIndex: story.index,
        original,
        final,
        changedFields: changed,
      });
    }

    for (const story of stories) {
      const variants = await readVariants(date, story.index);
      const applied = variants.filter((v) => v.appliedAt);
      const disliked = variants.filter((v) => v.dislikedAt);
      if (!applied.length && !disliked.length) continue;
      variantActivity.push({ date, storyIndex: story.index, applied, disliked });
    }
  }

  const instructionHistory = await readInstructionHistory();
  const adaptiveHistory = [...instructionHistory].reverse().slice(0, 3);

  const summary: FeedbackSummary = {
    approvals: approvals.length,
    rejections: rejections.length,
    edits: edits.length,
    variantsApplied: variantActivity.reduce((n, v) => n + v.applied.length, 0),
    variantsDisliked: variantActivity.reduce((n, v) => n + v.disliked.length, 0),
    datesCovered: dates.length,
  };

  return {
    windowDays,
    dateRange: { from, to },
    summary,
    signals: { rejections, edits, variantActivity, approvals },
    currentAdaptive: await readCurrentAdaptive(),
    adaptiveHistory,
  };
}
