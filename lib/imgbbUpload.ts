import { requireEnv } from "@/lib/env";

const IMGBB_API = "https://api.imgbb.com/1/upload";

interface ImgbbResponse {
  data?: { url?: string };
  success?: boolean;
  error?: { message?: string };
}

export async function uploadToImgbb(bytes: Buffer, expirationSeconds = 3600): Promise<string> {
  const apiKey = requireEnv("IMGBB_API_KEY");
  const url = `${IMGBB_API}?key=${encodeURIComponent(apiKey)}&expiration=${expirationSeconds}`;

  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const form = new FormData();
    form.append("image", bytes.toString("base64"));

    const res = await fetch(url, { method: "POST", body: form });
    const text = await res.text();
    let json: ImgbbResponse = {};
    try { json = JSON.parse(text); } catch { /* ignore */ }

    if (res.ok && json.success && json.data?.url) return json.data.url;

    lastErr = `attempt ${attempt}: HTTP ${res.status}, ${json.error?.message ?? text.slice(0, 200)}`;
    console.warn(`[imgbb] ${lastErr}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`ImgBB upload failed after 3 attempts. ${lastErr}`);
}
