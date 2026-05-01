import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { requireEnv } from "@/lib/env";
import { saveImage, scheduleDelete, deleteImage } from "@/lib/igTempStore";
import { publishStory } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  const guard = requireFetch(req);
  if (guard) return guard;

  let publicBase: string;
  try {
    requireEnv("IG_ACCESS_TOKEN");
    requireEnv("IG_USER_ID");
    publicBase = requireEnv("IG_PUBLIC_BASE").replace(/\/$/, "");
  } catch {
    return NextResponse.json(
      { error: "Instagram publishing is not configured. Set IG_ACCESS_TOKEN, IG_USER_ID, IG_PUBLIC_BASE." },
      { status: 503 },
    );
  }

  const arrayBuf = await req.arrayBuffer();
  if (!arrayBuf.byteLength) {
    return NextResponse.json({ error: "Empty image body" }, { status: 400 });
  }
  const bytes = Buffer.from(arrayBuf);

  let imageUrl: string;
  let storedKey: string;
  try {
    const saved = await saveImage(bytes, "jpg");
    storedKey = saved.key;
    imageUrl = `${publicBase}/ig-temp/${saved.key}`;
    console.log(`[ig-publish] saved ${imageUrl} (${bytes.length} bytes)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-publish] save failed: ${message}`);
    return NextResponse.json({ error: `Image save failed: ${message}` }, { status: 500 });
  }

  try {
    const result = await publishStory(imageUrl);
    console.log(`[ig-publish] success, mediaId=${result.mediaId}`);
    scheduleDelete(storedKey);
    return NextResponse.json({ mediaId: result.mediaId, containerId: result.containerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-publish] failed: ${message}`);
    deleteImage(storedKey).catch(() => {});
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
