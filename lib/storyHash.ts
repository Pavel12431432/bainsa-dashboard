import { createHash } from "crypto";
import { Story } from "@/types";
import { COMPARABLE_KEYS } from "@/lib/storyUtils";

export function hashStory(story: Story): string {
  const picked: Record<string, unknown> = {};
  for (const k of COMPARABLE_KEYS) picked[k] = story[k];
  return createHash("sha256").update(JSON.stringify(picked)).digest("hex");
}

export function deriveStale(
  stories: Story[],
  approved: number[],
  approvedHash: Record<number, string> | undefined
): number[] {
  if (!approvedHash) return [];
  const stale: number[] = [];
  for (const s of stories) {
    if (!approved.includes(s.index)) continue;
    const recorded = approvedHash[s.index];
    if (!recorded) continue;
    if (recorded !== hashStory(s)) stale.push(s.index);
  }
  return stale;
}
