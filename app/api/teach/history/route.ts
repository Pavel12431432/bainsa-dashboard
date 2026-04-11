import { NextRequest, NextResponse } from "next/server";
import { readInstructionHistory, addInstructionHistory } from "@/lib/instructionHistory";

export async function GET() {
  const entries = await readInstructionHistory();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content, label } = await req.json();
  if (typeof content !== "string" || typeof label !== "string") {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const entries = await addInstructionHistory(content, label);
  return NextResponse.json(entries);
}
