"use client";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const key = (src: string, color: string) => `${src}|${color.toLowerCase()}`;

export function getTintedDataUrlSync(src: string, color: string): string | undefined {
  return cache.get(key(src, color));
}

export function tintedDataUrl(src: string, color: string): Promise<string> {
  const k = key(src, color);
  const existing = inflight.get(k);
  if (existing) return existing;
  const p = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      cache.set(k, url);
      resolve(url);
    };
    img.onerror = () => reject(new Error(`tintedDataUrl: failed to load ${src}`));
    img.src = src;
  });
  inflight.set(k, p);
  return p;
}

export async function preloadTintedAccents(colors: string[]): Promise<void> {
  const srcs = ["/accent-chevron-2.png", "/accent-plus-2.png"];
  const unique = Array.from(new Set(colors.map((c) => c.toLowerCase())));
  await Promise.all(unique.flatMap((c) => srcs.map((s) => tintedDataUrl(s, c))));
}
