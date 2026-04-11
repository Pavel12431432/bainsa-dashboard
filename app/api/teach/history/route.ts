import { NextRequest, NextResponse } from "next/server";
import { readInstructionHistory, addInstructionHistory } from "@/lib/instructionHistory";
import { requireFetch } from "@/lib/apiGuard";

export async function GET() {
  const entries = await readInstructionHistory();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { content, label } = await req.json();
  if (typeof content !== "string" || typeof label !== "string") {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const entries = await addInstructionHistory(content, label);
  return NextResponse.json(entries);
}
