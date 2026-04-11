import { readEntries, addEntry } from "@/lib/versionHistory";
import { requireEnv } from "@/lib/env";

export interface InstructionHistoryEntry {
  content: string;
  label: string;
  timestamp: string;
}

function historyPath(): string {
  return `${requireEnv("SOFIA_INSTRUCTIONS_PATH")}/ADAPTIVE.history.json`;
}

export async function readInstructionHistory(): Promise<InstructionHistoryEntry[]> {
  return readEntries<InstructionHistoryEntry>(historyPath());
}

export async function addInstructionHistory(
  content: string,
  label: string,
): Promise<InstructionHistoryEntry[]> {
  return addEntry<InstructionHistoryEntry>(
    historyPath(),
    { content, label, timestamp: new Date().toISOString() },
  );
}
