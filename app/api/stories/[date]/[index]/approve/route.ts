import { NextRequest, NextResponse } from "next/server";
import { setApproval } from "@/lib/approvals";
import { isValidDate } from "@/lib/date";

const INDEX_RE = /^\d+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> }
) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { date, index } = await params;

  if (!isValidDate(date) || !INDEX_RE.test(index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { action } = await req.json();
  const state = await setApproval(date, parseInt(index, 10), action);
  return NextResponse.json({ ok: true, approvals: state });
}
