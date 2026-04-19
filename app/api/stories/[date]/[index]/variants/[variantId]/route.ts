import { NextRequest, NextResponse } from "next/server";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";
import { updateVariant, ApplyMode } from "@/lib/variants";

type Action = "apply" | "dislike" | "undislike";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string; variantId: string }> },
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index, variantId } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const body = (await req.json()) as { action: Action; mode?: ApplyMode };
  const now = new Date().toISOString();

  let patch: Parameters<typeof updateVariant>[3];
  if (body.action === "apply") {
    if (!body.mode) return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    patch = { appliedAt: now, appliedMode: body.mode };
  } else if (body.action === "dislike") {
    patch = { dislikedAt: now };
  } else if (body.action === "undislike") {
    patch = { dislikedAt: undefined };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const variants = await updateVariant(date, parseInt(index, 10), variantId, patch);
  return NextResponse.json({ variants });
}
