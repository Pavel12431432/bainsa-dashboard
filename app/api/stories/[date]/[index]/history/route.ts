import { NextRequest, NextResponse } from "next/server";
import { readHistory, addHistory } from "@/lib/history";
import { Story } from "@/types";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";

type Params = { params: Promise<{ date: string; index: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const entries = await readHistory(date, parseInt(index, 10));
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Params) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const { story, label } = (await req.json()) as { story: Story; label: string };
  if (!label) {
    return NextResponse.json({ error: "Missing label" }, { status: 400 });
  }

  const entries = await addHistory(date, parseInt(index, 10), story, label);
  return NextResponse.json(entries);
}
