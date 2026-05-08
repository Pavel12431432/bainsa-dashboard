import { mkdir, readdir, readFile, appendFile, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { fileExists } from "@/lib/fs";
import type { LogEvent } from "@/lib/logs";

interface CronJob {
  id: string;
  agentId: string;
  name: string;
}

interface CronRunRecord {
  ts: number;
  jobId: string;
  action: string;
  status: "ok" | "error" | string;
  summary?: string;
  durationMs?: number;
  sessionId?: string;
  model?: string;
  provider?: string;
  usage?: Record<string, unknown>;
  error?: string;
}

type ImportState = Record<string, number>;

const AGENT_LABELS: Record<string, string> = {
  "news-researcher": "marco",
  "story-generator": "sofia",
  "story-editor": "lorenzo",
};

const TRACKED_AGENT_IDS = new Set(Object.keys(AGENT_LABELS));

function logsDir(): string {
  return process.env.LOGS_PATH || "./logs";
}

function cronRunsDir(): string {
  return process.env.OPENCLAW_CRON_RUNS_PATH || path.join(os.homedir(), "openclaw/config/cron/runs");
}

function cronJobsFile(): string {
  return process.env.OPENCLAW_CRON_JOBS_PATH || path.join(os.homedir(), "openclaw/config/cron/jobs.json");
}

function stateFile(): string {
  return path.join(logsDir(), ".cron-import-state.json");
}

function romeDate(tsMs: number): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(tsMs));
}

async function readState(): Promise<ImportState> {
  const file = stateFile();
  if (!(await fileExists(file))) return {};
  try {
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ImportState) : {};
  } catch {
    return {};
  }
}

async function writeState(state: ImportState): Promise<void> {
  await mkdir(logsDir(), { recursive: true });
  await writeFile(stateFile(), JSON.stringify(state, null, 2), "utf-8");
}

async function readJobs(): Promise<Map<string, CronJob>> {
  const file = cronJobsFile();
  if (!(await fileExists(file))) return new Map();
  try {
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    const jobs = Array.isArray(parsed?.jobs) ? (parsed.jobs as CronJob[]) : [];
    return new Map(jobs.map((j) => [j.id, j]));
  } catch {
    return new Map();
  }
}

async function readRuns(jobId: string): Promise<CronRunRecord[]> {
  const file = path.join(cronRunsDir(), `${jobId}.jsonl`);
  if (!(await fileExists(file))) return [];
  const raw = await readFile(file, "utf-8");
  const out: CronRunRecord[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as CronRunRecord);
    } catch {
      // skip corrupt
    }
  }
  return out;
}

function recordToEvent(record: CronRunRecord, job: CronJob | undefined): LogEvent {
  const agentLabel = job ? AGENT_LABELS[job.agentId] ?? job.agentId : "unknown";
  const ok = record.status === "ok";
  const meta: Record<string, unknown> = {
    agent: agentLabel,
    agentId: job?.agentId,
    jobId: record.jobId,
    jobName: job?.name,
    sessionId: record.sessionId,
    mode: "cron",
    source: "openclaw-cron",
  };
  if (record.model) meta.model = record.model;
  if (record.provider) meta.provider = record.provider;
  if (record.usage) meta.usage = record.usage;
  if (!ok && record.error) meta.error = record.error;
  if (record.summary) meta.summaryPreview = record.summary.slice(0, 400);

  const summary = ok
    ? `${agentLabel} cron run (${job?.name ?? record.jobId})`
    : `${agentLabel} cron run failed (${job?.name ?? record.jobId})`;

  return {
    ts: new Date(record.ts).toISOString(),
    kind: "agent.call",
    actor: "system",
    ok,
    durationMs: record.durationMs,
    summary,
    meta,
  };
}

let importing = false;
let lastImportAt = 0;
const IMPORT_THROTTLE_MS = 30_000;

/** Idempotently pulls finished OpenClaw cron runs into the dashboard log files.
 *  Throttled: skips if another import ran within the last 30s. Errors are
 *  swallowed — logging never breaks user flows. */
export async function importCronRuns(): Promise<void> {
  if (importing) return;
  if (Date.now() - lastImportAt < IMPORT_THROTTLE_MS) return;
  importing = true;
  try {
    const runsDir = cronRunsDir();
    if (!(await fileExists(runsDir))) return;
    const jobs = await readJobs();
    const state = await readState();
    const dir = logsDir();
    await mkdir(dir, { recursive: true });

    const files = await readdir(runsDir);
    let stateChanged = false;

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const jobId = file.slice(0, -".jsonl".length);
      const job = jobs.get(jobId);
      if (!job || !TRACKED_AGENT_IDS.has(job.agentId)) continue;
      const lastTs = state[jobId] ?? 0;
      const records = await readRuns(jobId);
      const newRecords = records.filter(
        (r) => r.action === "finished" && typeof r.ts === "number" && r.ts > lastTs,
      );
      if (newRecords.length === 0) continue;

      // Group by Rome day so we append to the correct day file.
      const byDay = new Map<string, string[]>();
      let maxTs = lastTs;
      for (const record of newRecords) {
        const event = recordToEvent(record, job);
        const day = romeDate(record.ts);
        const lines = byDay.get(day) ?? [];
        lines.push(JSON.stringify(event));
        byDay.set(day, lines);
        if (record.ts > maxTs) maxTs = record.ts;
      }

      for (const [day, lines] of byDay) {
        await appendFile(path.join(dir, `${day}.jsonl`), lines.join("\n") + "\n", "utf-8");
      }
      state[jobId] = maxTs;
      stateChanged = true;
    }

    if (stateChanged) await writeState(state);
    lastImportAt = Date.now();
  } catch (err) {
    console.error("importCronRuns failed:", err);
  } finally {
    importing = false;
  }
}
