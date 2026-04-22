import { NextRequest, NextResponse } from "next/server";
import { collectFeedback } from "@/lib/editorFeedback";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("days") ?? "14";
  const days = parseInt(raw, 10);
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return NextResponse.json({ error: "days must be 1-90" }, { status: 400 });
  }

  try {
    const bundle = await collectFeedback(days);
    return NextResponse.json(bundle);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
