import { NextRequest, NextResponse } from "next/server";
import { setApproval } from "@/lib/approvals";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> }
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const { action, feedback } = await req.json();
  const state = await setApproval(date, parseInt(index, 10), action, feedback);
  return NextResponse.json({ ok: true, approvals: state });
}
