import { promises as fs } from "fs";
import path from "path";
import type { StoryScore, StoryScoreMap } from "@/types";
import { requireEnv } from "@/lib/env";

function scoresFilePath(date: string): string {
  const dir = requireEnv("STORIES_PATH");
  return path.join(dir, `${date}.scores.json`);
}

/** List dates that have a `{date}.scores.json` file in STORIES_PATH, oldest first. */
export async function listScoreDates(): Promise<string[]> {
  const dir = requireEnv("STORIES_PATH");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.scores\.json$/.exec(f)?.[1])
    .filter((d): d is string => !!d)
    .sort();
}

export async function readScores(date: string): Promise<StoryScoreMap> {
  try {
    const raw = await fs.readFile(scoresFilePath(date), "utf-8");
    return JSON.parse(raw) as StoryScoreMap;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

export async function writeScores(date: string, scores: StoryScoreMap): Promise<void> {
  await fs.writeFile(scoresFilePath(date), JSON.stringify(scores, null, 2), "utf-8");
}

export async function writeScore(date: string, score: StoryScore): Promise<StoryScoreMap> {
  const scores = await readScores(date);
  scores[score.storyIndex] = score;
  await writeScores(date, scores);
  return scores;
}

/**
 * Weighted total of the three scoring axes.
 *
 * Weights when topicCoherence applies (story is part of a chain):
 *   brandVoice 0.4 · engagement 0.4 · topicCoherence 0.2
 *
 * Weights when topicCoherence is null (standalone story):
 *   brandVoice 0.5 · engagement 0.5
 */
export function computeTotal(score: Pick<StoryScore, "brandVoice" | "engagement" | "topicCoherence">): number {
  if (score.topicCoherence == null) {
    return Math.round(score.brandVoice * 0.5 + score.engagement * 0.5);
  }
  return Math.round(score.brandVoice * 0.4 + score.engagement * 0.4 + score.topicCoherence * 0.2);
}
