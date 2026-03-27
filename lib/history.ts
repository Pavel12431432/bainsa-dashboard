import { readFile, writeFile } from "fs/promises";
import { Story, HistoryEntry } from "@/types";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

const MAX_ENTRIES = 50;

function historyPath(date: string): string {
  return `${requireEnv("STORIES_PATH")}/${date}.history.json`;
}

async function readAllHistory(date: string): Promise<Record<string, HistoryEntry[]>> {
  const path = historyPath(date);
  if (!(await fileExists(path))) return {};
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}

export async function readHistory(date: string, index: number): Promise<HistoryEntry[]> {
  const all = await readAllHistory(date);
  return all[String(index)] ?? [];
}

export async function addHistory(
  date: string,
  index: number,
  story: Story,
  label: string,
): Promise<HistoryEntry[]> {
  const all = await readAllHistory(date);
  const key = String(index);
  const entries = all[key] ?? [];
  entries.push({ story, label, timestamp: new Date().toISOString() });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  all[key] = entries;
  await writeFile(historyPath(date), JSON.stringify(all, null, 2), "utf-8");
  return entries;
}
