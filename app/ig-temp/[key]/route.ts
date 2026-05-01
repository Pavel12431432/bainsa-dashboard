import { NextRequest, NextResponse } from "next/server";
import { readImage } from "@/lib/igTempStore";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const bytes = await readImage(key);
  if (!bytes) return new NextResponse("Not found", { status: 404 });
  const ext = key.endsWith(".png") ? "png" : "jpeg";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": `image/${ext}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=600",
    },
  });
}

export async function HEAD(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const bytes = await readImage(key);
  if (!bytes) return new NextResponse(null, { status: 404 });
  const ext = key.endsWith(".png") ? "png" : "jpeg";
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": `image/${ext}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=600",
    },
  });
}
