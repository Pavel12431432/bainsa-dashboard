import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Story } from "@/types";
import StoryContent from "@/components/StoryContent";

function sanitizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function captureCard(
  story: Story,
  html2canvas: (el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLCanvasElement>,
): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:405px;height:720px;overflow:hidden;";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(createElement(StoryContent, { story }));

  // Wait for paint and fonts
  await document.fonts.ready;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  const canvas = await html2canvas(container, {
    width: 405,
    height: 720,
    scale: 4,
    backgroundColor: "#0a0a0a",
    useCORS: true,
    logging: false,
  });

  root.unmount();
  document.body.removeChild(container);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png")
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function captureStories(
  stories: Story[],
  date: string,
  format: "zip" | "individual",
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const blobs: { blob: Blob; filename: string }[] = [];

  const html2canvas = (await import("html2canvas-pro")).default;

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    const blob = await captureCard(story, html2canvas);
    blobs.push({ blob, filename: `story-${story.index}-${sanitizeTitle(story.headline)}.png` });
    onProgress?.(i + 1, stories.length);
  }

  if (format === "individual") {
    for (const { blob, filename } of blobs) {
      downloadBlob(blob, filename);
      await new Promise((r) => setTimeout(r, 100));
    }
  } else {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const { blob, filename } of blobs) {
      zip.file(filename, blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `bainsa-stories-${date}.zip`);
  }
}
