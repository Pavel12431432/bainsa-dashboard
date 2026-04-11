import { readFile, writeFile } from "fs/promises";
import { fileExists } from "@/lib/fs";

const DEFAULT_MAX = 50;

/** Read a JSON array of entries from a file. Returns [] if missing or corrupt. */
export async function readEntries<T>(path: string): Promise<T[]> {
  if (!(await fileExists(path))) return [];
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return [];
  }
}

/** Append an entry to a JSON array file, capped at maxEntries. */
export async function addEntry<T>(
  path: string,
  entry: T,
  maxEntries = DEFAULT_MAX,
): Promise<T[]> {
  const entries = await readEntries<T>(path);
  entries.push(entry);
  if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
  await writeFile(path, JSON.stringify(entries, null, 2), "utf-8");
  return entries;
}

/** Read a keyed record of entry arrays (e.g. story index -> history). */
export async function readKeyedEntries<T>(path: string, key: string): Promise<T[]> {
  if (!(await fileExists(path))) return [];
  try {
    const all: Record<string, T[]> = JSON.parse(await readFile(path, "utf-8"));
    return all[key] ?? [];
  } catch {
    return [];
  }
}

/** Append an entry under a key in a keyed record file. */
export async function addKeyedEntry<T>(
  path: string,
  key: string,
  entry: T,
  maxEntries = DEFAULT_MAX,
): Promise<T[]> {
  let all: Record<string, T[]> = {};
  if (await fileExists(path)) {
    try { all = JSON.parse(await readFile(path, "utf-8")); } catch { /* empty */ }
  }
  const entries = all[key] ?? [];
  entries.push(entry);
  if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
  all[key] = entries;
  await writeFile(path, JSON.stringify(all, null, 2), "utf-8");
  return entries;
}
