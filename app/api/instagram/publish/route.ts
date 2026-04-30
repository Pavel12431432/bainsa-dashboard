import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { requireEnv } from "@/lib/env";
import { uploadToImgbb } from "@/lib/imgbbUpload";
import { publishStory } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  const guard = requireFetch(req);
  if (guard) return guard;

  try {
    requireEnv("IG_ACCESS_TOKEN");
    requireEnv("IG_USER_ID");
    requireEnv("IMGBB_API_KEY");
  } catch {
    return NextResponse.json(
      { error: "Instagram publishing is not configured. Set IG_ACCESS_TOKEN, IG_USER_ID, and IMGBB_API_KEY." },
      { status: 503 },
    );
  }

  const arrayBuf = await req.arrayBuffer();
  if (!arrayBuf.byteLength) {
    return NextResponse.json({ error: "Empty image body" }, { status: 400 });
  }
  const bytes = Buffer.from(arrayBuf);

  let imageUrl: string;
  try {
    imageUrl = await uploadToImgbb(bytes);
    console.log(`[ig-publish] uploaded to ${imageUrl} (${bytes.length} bytes)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-publish] imgbb upload failed: ${message}`);
    return NextResponse.json({ error: `Image host upload failed: ${message}` }, { status: 502 });
  }

  try {
    const result = await publishStory(imageUrl);
    console.log(`[ig-publish] success, mediaId=${result.mediaId}`);
    return NextResponse.json({ mediaId: result.mediaId, containerId: result.containerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-publish] failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
