import { NextRequest, NextResponse } from "next/server";
import { isValidDate } from "@/lib/date";

const INDEX_RE = /^\d+$/;

/** CSRF check — returns an error response if the request wasn't made via fetch, else null. */
export function requireFetch(req: NextRequest): NextResponse | null {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Validates story route params. Returns an error response if invalid, else null. */
export function validateStoryParams(date: string, index: string): NextResponse | null {
  if (!isValidDate(date) || !INDEX_RE.test(index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  return null;
}
