import { Story, HistoryEntry } from "@/types";
import { readKeyedEntries, addKeyedEntry } from "@/lib/versionHistory";
import { requireEnv } from "@/lib/env";

/** Defaults for fields added after existing history was written.
 *  Update this object when adding new Story fields. */
const STORY_DEFAULTS: Partial<Story> = {
  layout: "top",
  contentType: "text",
  headlineSize: "default",
  bodyWeight: "regular",
  textAlign: "left",
  cornerSize: "small",
  accentBar: "bottom",
  ghostAccent: "none",
};

function migrateStory(s: Story): Story {
  return { ...STORY_DEFAULTS, ...s };
}

function historyPath(date: string): string {
  return `${requireEnv("STORIES_PATH")}/${date}.history.json`;
}

export async function readHistory(date: string, index: number): Promise<HistoryEntry[]> {
  const entries = await readKeyedEntries<HistoryEntry>(historyPath(date), String(index));
  return entries.map((e) => ({ ...e, story: migrateStory(e.story) }));
}

export async function addHistory(
  date: string,
  index: number,
  story: Story,
  label: string,
): Promise<HistoryEntry[]> {
  return addKeyedEntry<HistoryEntry>(
    historyPath(date),
    String(index),
    { story, label, timestamp: new Date().toISOString() },
  );
}
