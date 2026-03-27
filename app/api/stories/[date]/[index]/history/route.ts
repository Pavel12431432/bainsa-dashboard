import { NextRequest, NextResponse } from "next/server";
import { isValidDate } from "@/lib/date";
import { readHistory, addHistory } from "@/lib/history";
import { Story } from "@/types";

const INDEX_RE = /^\d+$/;

type Params = { params: Promise<{ date: string; index: string }> };

function validate(date: string, index: string): boolean {
  return isValidDate(date) && INDEX_RE.test(index);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { date, index } = await params;
  if (!validate(date, index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  const entries = await readHistory(date, parseInt(index, 10));
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Params) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { date, index } = await params;
  if (!validate(date, index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { story, label } = (await req.json()) as { story: Story; label: string };
  if (!label) {
    return NextResponse.json({ error: "Missing label" }, { status: 400 });
  }

  const entries = await addHistory(date, parseInt(index, 10), story, label);
  return NextResponse.json(entries);
}
