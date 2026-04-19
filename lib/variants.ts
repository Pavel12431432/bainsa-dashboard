import { readFile, writeFile } from "fs/promises";
import { fileExists } from "@/lib/fs";
import { requireEnv } from "@/lib/env";
import {
  Layout,
  ContentType,
  HeadlineSize,
  BodyWeight,
  TextAlign,
  CornerSize,
  AccentBar,
  GhostAccent,
} from "@/types";

export type ApplyMode = "all" | "text" | "design";

export interface Variant {
  id: string;
  batchId: string;
  generatedAt: string;
  appliedAt?: string;
  appliedMode?: ApplyMode;
  dislikedAt?: string;

  headline: string;
  body: string;
  contentType: ContentType;
  layout: Layout;
  headlineSize: HeadlineSize;
  bodyWeight: BodyWeight;
  textAlign: TextAlign;
  cornerSize: CornerSize;
  accentBar: AccentBar;
  ghostAccent: GhostAccent;
  cornerAccent: ">" | "+";
}

export type NewVariant = Omit<Variant, "id" | "batchId" | "generatedAt" | "appliedAt" | "appliedMode" | "dislikedAt">;

function variantsPath(date: string): string {
  return `${requireEnv("STORIES_PATH")}/${date}.variants.json`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type VariantsFile = Record<string, Variant[]>;

async function readFileAll(date: string): Promise<VariantsFile> {
  const path = variantsPath(date);
  if (!(await fileExists(path))) return {};
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
}

async function writeFileAll(date: string, all: VariantsFile): Promise<void> {
  await writeFile(variantsPath(date), JSON.stringify(all, null, 2), "utf-8");
}

export async function readVariants(date: string, index: number): Promise<Variant[]> {
  const all = await readFileAll(date);
  return all[String(index)] ?? [];
}

export async function addVariants(
  date: string,
  index: number,
  newOnes: NewVariant[],
): Promise<Variant[]> {
  const all = await readFileAll(date);
  const key = String(index);
  const list = all[key] ?? [];
  const batchId = randomId();
  const generatedAt = new Date().toISOString();
  for (const v of newOnes) {
    list.push({ ...v, id: randomId(), batchId, generatedAt });
  }
  all[key] = list;
  await writeFileAll(date, all);
  return list;
}

export async function updateVariant(
  date: string,
  index: number,
  variantId: string,
  patch: Partial<Pick<Variant, "appliedAt" | "appliedMode" | "dislikedAt">>,
): Promise<Variant[]> {
  const all = await readFileAll(date);
  const key = String(index);
  const list = all[key] ?? [];
  const idx = list.findIndex((v) => v.id === variantId);
  if (idx === -1) return list;
  const next = { ...list[idx], ...patch };
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (patch[k] === undefined) delete next[k];
  }
  list[idx] = next;
  all[key] = list;
  await writeFileAll(date, all);
  return list;
}
