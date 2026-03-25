import { NextRequest, NextResponse } from "next/server";
import { createToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { checkRateLimit, recordFailure, clearAttempts } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts", retryAfter: rate.retryAfter },
      { status: 429 }
    );
  }

  const { password } = await req.json();
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    recordFailure(ip);
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  clearAttempts(ip);
  const token = createToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SECURE_COOKIES === "true",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
