import { readFile } from "fs/promises";
import { parseStories } from "@/lib/parseStories";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";
import type { Story } from "@/types";

export interface LoadedStories {
  markdown: string;
  stories: Story[];
}

export async function loadStoriesFile(date: string): Promise<LoadedStories | null> {
  const filePath = `${requireEnv("STORIES_PATH")}/${date}.md`;
  if (!(await fileExists(filePath))) return null;
  const markdown = await readFile(filePath, "utf-8");
  return { markdown, stories: parseStories(markdown) };
}
