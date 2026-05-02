#!/usr/bin/env tsx
/**
 * One-shot log pruner. Deletes all log day-files dated before --before YYYY-MM-DD.
 * Usage: npm run logs:prune -- --before 2026-01-01
 */
import { readdir, unlink } from "fs/promises";
import path from "path";

const FILE_RE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const before = arg("--before");
  if (!before || !/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    console.error("Usage: npm run logs:prune -- --before YYYY-MM-DD");
    process.exit(1);
  }

  const dir = process.env.LOGS_PATH || "./logs";
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.log(`No logs dir at ${dir} — nothing to prune.`);
    return;
  }

  let removed = 0;
  for (const f of files) {
    const m = FILE_RE.exec(f);
    if (!m) continue;
    if (m[1] < before) {
      await unlink(path.join(dir, f));
      console.log(`Removed ${f}`);
      removed++;
    }
  }
  console.log(`Pruned ${removed} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
