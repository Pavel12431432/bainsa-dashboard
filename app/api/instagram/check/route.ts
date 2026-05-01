import { NextResponse } from "next/server";

const GRAPH = "https://graph.facebook.com/v23.0";

interface CheckResult {
  ok: boolean;
  step: string;
  detail?: string;
  data?: unknown;
}

async function metaGet(path: string, token: string): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const url = `${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { ok: res.ok, status: res.status, json };
}

export async function GET() {
  const token = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  const publicBase = process.env.IG_PUBLIC_BASE;

  const checks: CheckResult[] = [];

  if (!token) checks.push({ ok: false, step: "IG_ACCESS_TOKEN", detail: "missing" });
  else checks.push({ ok: true, step: "IG_ACCESS_TOKEN", detail: `set (${token.length} chars)` });

  if (!igUserId) checks.push({ ok: false, step: "IG_USER_ID", detail: "missing" });
  else checks.push({ ok: true, step: "IG_USER_ID", detail: igUserId });

  if (!publicBase) checks.push({ ok: false, step: "IG_PUBLIC_BASE", detail: "missing" });
  else checks.push({ ok: true, step: "IG_PUBLIC_BASE", detail: publicBase });

  if (!token || !igUserId) {
    return NextResponse.json({ ok: false, checks });
  }

  // Token sanity: /me should return the Page (Page tokens) or User
  const me = await metaGet("me?fields=id,name", token);
  if (!me.ok) {
    checks.push({ ok: false, step: "Token validity", detail: JSON.stringify(me.json), data: me.json });
    return NextResponse.json({ ok: false, checks });
  }
  checks.push({ ok: true, step: "Token validity", detail: `Page/User: ${me.json.name ?? "?"} (${me.json.id ?? "?"})`, data: me.json });

  // IG user lookup
  const ig = await metaGet(`${igUserId}?fields=id,username,name,profile_picture_url`, token);
  if (!ig.ok) {
    checks.push({ ok: false, step: "IG_USER_ID lookup", detail: JSON.stringify(ig.json), data: ig.json });
    return NextResponse.json({ ok: false, checks });
  }
  checks.push({ ok: true, step: "IG_USER_ID lookup", detail: `@${ig.json.username ?? "?"} (${ig.json.name ?? "?"})`, data: ig.json });

  // Permissions check: try to read media count (doesn't post anything)
  const perms = await metaGet(`${igUserId}?fields=media_count`, token);
  if (!perms.ok) {
    checks.push({ ok: false, step: "Read permission", detail: JSON.stringify(perms.json), data: perms.json });
    return NextResponse.json({ ok: false, checks });
  }
  checks.push({ ok: true, step: "Read permission", detail: `media_count: ${perms.json.media_count ?? 0}`, data: perms.json });

  // Verify Page<->IG linkage: the token's Page must have IG_USER_ID linked
  if (me.json.id) {
    const link = await metaGet(`${me.json.id}?fields=instagram_business_account`, token);
    if (link.ok) {
      const linked = (link.json.instagram_business_account as { id?: string } | undefined)?.id;
      if (linked === igUserId) {
        checks.push({ ok: true, step: "Page→IG link", detail: `Page ${me.json.id} → IG ${linked}` });
      } else {
        checks.push({
          ok: false,
          step: "Page→IG link",
          detail: linked
            ? `MISMATCH: Page links to IG ${linked}, but IG_USER_ID is ${igUserId}`
            : `Page ${me.json.id} has NO Instagram account linked. Re-link in Meta Business Suite.`,
          data: link.json,
        });
      }
    }
  }

  // Granted permissions on the token
  const granted = await metaGet("me/permissions", token);
  if (granted.ok) {
    const list = Array.isArray(granted.json.data) ? granted.json.data as Array<{ permission: string; status: string }> : [];
    const ok = list.filter((p) => p.status === "granted").map((p) => p.permission);
    const missing = ["instagram_basic", "instagram_content_publish", "pages_show_list"].filter((p) => !ok.includes(p));
    checks.push({
      ok: missing.length === 0,
      step: "Token permissions",
      detail: missing.length === 0 ? `granted: ${ok.join(", ")}` : `MISSING: ${missing.join(", ")} | granted: ${ok.join(", ")}`,
      data: granted.json,
    });
  }

  return NextResponse.json({ ok: true, checks });
}
