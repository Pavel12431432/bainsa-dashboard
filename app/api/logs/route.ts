import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { appendLog, queryLogs, type LogKind, type QueryOptions } from "@/lib/logs";

export const dynamic = "force-dynamic";

const ALLOWED_CLIENT_KINDS = new Set<LogKind>(["export"]);

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const opts: QueryOptions = {};

  const kindsRaw = url.searchParams.get("kinds");
  if (kindsRaw) opts.kinds = kindsRaw.split(",").filter(Boolean) as LogKind[];

  const actor = url.searchParams.get("actor");
  if (actor === "user" || actor === "system") opts.actor = actor;

  const ok = url.searchParams.get("ok");
  if (ok === "true") opts.ok = true;
  else if (ok === "false") opts.ok = false;

  const from = url.searchParams.get("from");
  if (from) opts.from = from;
  const to = url.searchParams.get("to");
  if (to) opts.to = to;

  const q = url.searchParams.get("q");
  if (q) opts.q = q;

  const limit = url.searchParams.get("limit");
  if (limit) opts.limit = parseInt(limit, 10);

  const cursorBeforeTs = url.searchParams.get("cursorBeforeTs");
  if (cursorBeforeTs) {
    opts.cursor = { beforeTs: cursorBeforeTs };
  }

  const result = await queryLogs(opts);
  return NextResponse.json(result);
}

/** Client-side log entry — used by ExportDialog (download mode only). */
export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    typeof body.kind !== "string" ||
    typeof body.summary !== "string" ||
    typeof body.ok !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!ALLOWED_CLIENT_KINDS.has(body.kind as LogKind)) {
    return NextResponse.json({ error: "Kind not allowed from client" }, { status: 400 });
  }

  await appendLog({
    kind: body.kind as LogKind,
    actor: "user",
    ok: body.ok,
    summary: body.summary,
    meta: body.meta && typeof body.meta === "object" ? body.meta : undefined,
  });

  return NextResponse.json({ ok: true });
}
