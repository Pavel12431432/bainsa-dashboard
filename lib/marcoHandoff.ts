import { readFile } from "fs/promises";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

export interface MarcoStory {
  url: string;
  sourceLabel: string;
  reason: string;
}

export type MarcoStoryMap = Record<number, MarcoStory>;

function handoffPath(date: string): string {
  return `${requireEnv("MARCO_HANDOFFS_PATH")}/${date}.md`;
}

const SOURCE_RE = /\*\*Source:\*\*\s*\[([^\]]+)\]\(([^)]+)\)/i;
const ANGLE_RE = /\*\*BAINSA angle:\*\*\s*([^\n]+)/i;

export function parseMarcoHandoff(markdown: string): MarcoStoryMap {
  const map: MarcoStoryMap = {};
  const sections = markdown.split(/^##\s+Story\s+(\d+)/m);
  // sections: [preamble, "1", body1, "2", body2, ...]
  for (let i = 1; i < sections.length; i += 2) {
    const index = Number(sections[i]);
    const body = sections[i + 1] ?? "";
    const sourceMatch = body.match(SOURCE_RE);
    const angleMatch = body.match(ANGLE_RE);
    if (!sourceMatch && !angleMatch) continue;
    map[index] = {
      url: sourceMatch?.[2]?.trim() ?? "",
      sourceLabel: sourceMatch?.[1]?.trim() ?? "",
      reason: angleMatch?.[1]?.trim() ?? "",
    };
  }
  return map;
}

export async function readMarcoStories(date: string): Promise<MarcoStoryMap> {
  const path = handoffPath(date);
  if (!(await fileExists(path))) return {};
  try {
    return parseMarcoHandoff(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}
