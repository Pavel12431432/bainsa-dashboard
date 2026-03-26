import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const res = NextResponse.redirect(new URL("/login", `${proto}://${host}`));
  res.cookies.delete(COOKIE_NAME);
  return res;
}
