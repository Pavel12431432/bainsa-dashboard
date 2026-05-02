import { mkdir, readdir, readFile, appendFile } from "fs/promises";
import path from "path";
import { fileExists } from "@/lib/fs";
import { todayRome } from "@/lib/date";

export type LogKind =
  | "agent.call"
  | "ig.post"
  | "proposal.generate"
  | "proposal.accept"
  | "proposal.reject"
  | "proposal.refine"
  | "proposal.undo-refine"
  | "adaptive.save"
  | "story.approve"
  | "story.reject"
  | "story.edit"
  | "variants.generate"
  | "export"
  | "auth.login.success"
  | "auth.login.failure";

export interface LogEvent {
  ts: string;
  kind: LogKind;
  actor: "user" | "system";
  ok: boolean;
  durationMs?: number;
  summary: string;
  meta?: Record<string, unknown>;
}

export interface QueryOptions {
  kinds?: LogKind[];
  actor?: "user" | "system";
  ok?: boolean;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  /** Resume after this ISO timestamp. Stable under concurrent appends — unlike
   *  an offset, a timestamp doesn't shift when new events are written between
   *  page loads. */
  cursor?: { beforeTs: string } | null;
}

export interface QueryResult {
  events: LogEvent[];
  nextCursor: { beforeTs: string } | null;
}

const DEFAULT_LIMIT = 100;
const FILE_RE = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;

function logsDir(): string {
  return process.env.LOGS_PATH || "./logs";
}

function dayFile(date: string): string {
  return path.join(logsDir(), `${date}.jsonl`);
}


export async function appendLog(event: Omit<LogEvent, "ts">): Promise<void> {
  try {
    const dir = logsDir();
    await mkdir(dir, { recursive: true });
    const full: LogEvent = { ts: new Date().toISOString(), ...event };
    await appendFile(dayFile(todayRome()), JSON.stringify(full) + "\n", "utf-8");
  } catch (err) {
    console.error("appendLog failed:", err);
  }
}

async function listLogDates(): Promise<string[]> {
  const dir = logsDir();
  if (!(await fileExists(dir))) return [];
  const files = await readdir(dir);
  return files
    .map((f) => FILE_RE.exec(f)?.[1])
    .filter((d): d is string => !!d)
    .sort()
    .reverse();
}

async function readDayEvents(date: string): Promise<LogEvent[]> {
  const file = dayFile(date);
  if (!(await fileExists(file))) return [];
  const raw = await readFile(file, "utf-8");
  const out: LogEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as LogEvent);
    } catch {
      // skip corrupt line
    }
  }
  return out;
}

function matches(event: LogEvent, opts: QueryOptions, qLower: string | null): boolean {
  if (opts.kinds && opts.kinds.length > 0 && !opts.kinds.includes(event.kind)) return false;
  if (opts.actor && event.actor !== opts.actor) return false;
  if (typeof opts.ok === "boolean" && event.ok !== opts.ok) return false;
  if (opts.from && event.ts < opts.from) return false;
  if (opts.to && event.ts > opts.to) return false;
  if (qLower) {
    const hay = (
      event.summary +
      " " +
      event.kind +
      " " +
      (event.meta ? JSON.stringify(event.meta) : "")
    ).toLowerCase();
    if (!hay.includes(qLower)) return false;
  }
  return true;
}

export async function queryLogs(opts: QueryOptions = {}): Promise<QueryResult> {
  const limit = Math.max(1, Math.min(opts.limit ?? DEFAULT_LIMIT, 500));
  const qLower = opts.q ? opts.q.toLowerCase() : null;
  const dates = await listLogDates();
  const beforeTs = opts.cursor?.beforeTs ?? null;

  const events: LogEvent[] = [];

  for (const date of dates) {
    if (opts.from && date < opts.from.slice(0, 10)) break;
    if (opts.to && date > opts.to.slice(0, 10)) continue;

    const dayEvents = await readDayEvents(date);
    dayEvents.reverse();

    for (const event of dayEvents) {
      // Resume strictly after the previous page's last ts. Events written
      // between page loads with a larger ts are skipped on this page (they'd
      // only show up by re-fetching from the top).
      if (beforeTs && event.ts >= beforeTs) continue;
      if (!matches(event, opts, qLower)) continue;
      events.push(event);
      if (events.length >= limit) {
        return { events, nextCursor: { beforeTs: event.ts } };
      }
    }
  }

  return { events, nextCursor: null };
}
