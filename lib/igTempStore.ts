import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import os from "os";

const DIR = process.env.IG_TEMP_PATH || path.join(os.tmpdir(), "bainsa-ig-temp");

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true });
}

export interface SavedImage {
  key: string;
  filePath: string;
}

export async function saveImage(bytes: Buffer, ext = "jpg"): Promise<SavedImage> {
  await ensureDir();
  const key = `${randomBytes(16).toString("hex")}.${ext}`;
  const filePath = path.join(DIR, key);
  await fs.writeFile(filePath, bytes);
  return { key, filePath };
}

export async function readImage(key: string): Promise<Buffer | null> {
  if (!/^[a-f0-9]{32}\.(jpg|png)$/.test(key)) return null;
  try {
    return await fs.readFile(path.join(DIR, key));
  } catch {
    return null;
  }
}

export async function deleteImage(key: string): Promise<void> {
  if (!/^[a-f0-9]{32}\.(jpg|png)$/.test(key)) return;
  await fs.unlink(path.join(DIR, key)).catch(() => {});
}

export function scheduleDelete(key: string, delayMs = 10 * 60 * 1000): void {
  setTimeout(() => {
    deleteImage(key).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[ig-temp] scheduled delete failed for ${key}: ${message}`);
    });
  }, delayMs).unref?.();
}
