import { readFile } from "fs/promises";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";
import { parseStories } from "@/lib/parseStories";
import { listScoreDates, readScores } from "@/lib/scores";
import HeaderShell from "@/components/HeaderShell";
import HarnessDashboard from "@/components/HarnessDashboard";
import type { StoryScore } from "@/types";

export const dynamic = "force-dynamic";

export interface ScoredStory {
  date: string;
  storyIndex: number;
  headline: string;
  score: StoryScore;
}

export default async function HarnessPage() {
  const dates = await listScoreDates();
  const dir = requireEnv("STORIES_PATH");

  const allEntries: ScoredStory[] = [];
  for (const date of dates) {
    const scores = await readScores(date);
    const storyFile = `${dir}/${date}.md`;
    let stories: ReturnType<typeof parseStories> = [];
    if (await fileExists(storyFile)) {
      const md = await readFile(storyFile, "utf-8");
      stories = parseStories(md);
    }
    for (const score of Object.values(scores)) {
      const story = stories.find((s) => s.index === score.storyIndex);
      allEntries.push({
        date,
        storyIndex: score.storyIndex,
        headline: story?.headline ?? `Story ${score.storyIndex}`,
        score,
      });
    }
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <HeaderShell />
      <main className="p-5 max-w-5xl mx-auto">
        <HarnessDashboard entries={allEntries} dates={dates} />
      </main>
    </div>
  );
}
