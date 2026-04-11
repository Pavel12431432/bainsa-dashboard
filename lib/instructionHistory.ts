import { readFile, writeFile } from "fs/promises";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

const MAX_ENTRIES = 50;

export interface InstructionHistoryEntry {
  content: string;
  label: string;
  timestamp: string;
}

function historyPath(): string {
  return `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.history.json`;
}

export async function readInstructionHistory(): Promise<InstructionHistoryEntry[]> {
  const path = historyPath();
  if (!(await fileExists(path))) return [];
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return [];
  }
}

export async function addInstructionHistory(
  content: string,
  label: string,
): Promise<InstructionHistoryEntry[]> {
  const entries = await readInstructionHistory();
  entries.push({ content, label, timestamp: new Date().toISOString() });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  await writeFile(historyPath(), JSON.stringify(entries, null, 2), "utf-8");
  return entries;
}
