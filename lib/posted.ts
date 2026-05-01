import { readFile, writeFile } from "fs/promises";
import { PostRecord, PostedMap } from "@/types";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";

function postedPath(date: string): string {
  return `${requireEnv("STORIES_PATH")}/${date}.posted.json`;
}

export async function readPosted(date: string): Promise<PostedMap> {
  const path = postedPath(date);
  if (!(await fileExists(path))) return {};
  try {
    const parsed = JSON.parse(await readFile(path, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function addPostRecord(
  date: string,
  index: number,
  record: PostRecord,
): Promise<PostedMap> {
  const map = await readPosted(date);
  const existing = map[index] ?? [];
  map[index] = [...existing, record];
  await writeFile(postedPath(date), JSON.stringify(map, null, 2), "utf-8");
  return map;
}
