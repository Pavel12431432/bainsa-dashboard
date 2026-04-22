import { readEntries, addEntry } from "@/lib/versionHistory";
import { requireEnv } from "@/lib/env";

export interface InstructionHistoryEntry {
  content: string;
  label: string;
  timestamp: string;
  /** Who produced this version. Absent on older entries (treat as "human"). */
  source?: "human" | "editor-agent";
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
  source: "human" | "editor-agent" = "human",
): Promise<InstructionHistoryEntry[]> {
  return addEntry<InstructionHistoryEntry>(
    historyPath(),
    { content, label, timestamp: new Date().toISOString(), source },
  );
}
