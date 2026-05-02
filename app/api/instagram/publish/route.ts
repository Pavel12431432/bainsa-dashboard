import { NextRequest, NextResponse } from "next/server";
import { requireFetch } from "@/lib/apiGuard";
import { requireEnv } from "@/lib/env";
import { saveImage, scheduleDelete, deleteImage } from "@/lib/igTempStore";
import { publishStory } from "@/lib/instagram";
import { addPostRecord } from "@/lib/posted";
import { isValidDate } from "@/lib/date";
import { appendLog } from "@/lib/logs";

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

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const indexRaw = url.searchParams.get("index");
  const storyIndex = indexRaw ? Number(indexRaw) : NaN;
  const trackPost = !!(date && isValidDate(date) && Number.isInteger(storyIndex) && storyIndex > 0);

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

  const start = Date.now();
  try {
    const result = await publishStory(imageUrl);
    console.log(`[ig-publish] success, mediaId=${result.mediaId}`);
    scheduleDelete(storedKey);
    if (trackPost) {
      try {
        await addPostRecord(date!, storyIndex, {
          postedAt: new Date().toISOString(),
          mediaId: result.mediaId,
          containerId: result.containerId,
        });
      } catch (err) {
        console.error(`[ig-publish] failed to record post: ${err instanceof Error ? err.message : err}`);
      }
    }
    await appendLog({
      kind: "ig.post",
      actor: "user",
      ok: true,
      durationMs: Date.now() - start,
      summary: trackPost
        ? `Posted story #${storyIndex} on ${date} to Instagram`
        : `Posted untracked image to Instagram`,
      meta: {
        date,
        storyIndex: trackPost ? storyIndex : undefined,
        mediaId: result.mediaId,
        containerId: result.containerId,
      },
    });
    return NextResponse.json({ mediaId: result.mediaId, containerId: result.containerId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[ig-publish] failed: ${message}`);
    deleteImage(storedKey).catch(() => {});
    await appendLog({
      kind: "ig.post",
      actor: "user",
      ok: false,
      durationMs: Date.now() - start,
      summary: trackPost
        ? `Failed to post story #${storyIndex} on ${date}`
        : `Failed to post image to Instagram`,
      meta: {
        date,
        storyIndex: trackPost ? storyIndex : undefined,
        error: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
