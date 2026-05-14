import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { Story } from "@/types";
import { requireFetch } from "@/lib/apiGuard";
import { isValidDate, todayRome } from "@/lib/date";
import { requireEnv } from "@/lib/env";
import { fileExists } from "@/lib/fs";
import { chatWithAgent } from "@/lib/openclaw";
import { parseStories } from "@/lib/parseStories";
import { appendStories } from "@/lib/serializeStories";
import { appendLog } from "@/lib/logs";

const ALLOWED_COUNTS = new Set([1, 3, 5]);
const FOCUS_MAX = 300;

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  if (!isValidDate(date)) return new Response("Invalid date", { status: 400 });
  if (date !== todayRome()) return new Response("Can only generate stories for today", { status: 400 });

  const { count, focus, suggestChain } = await req.json().catch(() => ({}));
  if (typeof count !== "number" || !ALLOWED_COUNTS.has(count)) {
    return new Response("Invalid count", { status: 400 });
  }
  const focusText = typeof focus === "string" ? focus.slice(0, FOCUS_MAX).trim() : "";
  const suggestChainFlag = suggestChain === true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };
      const fail = (message: string) => {
        send("error", message);
        controller.close();
      };

      const start = Date.now();
      const sessionId = `generate-more-${date}-${start}`;

      try {
        if (process.env.DEMO_MODE === "true") {
          send("phase", "marco");
          await new Promise((r) => setTimeout(r, 800));
          send("phase", "sofia");
          await new Promise((r) => setTimeout(r, 800));
          const demo: Omit<Story, "index">[] = Array.from({ length: count }, (_, i) => ({
            title: "",
            division: "Culture",
            accentColor: "#fe43a7",
            headline: `Demo: appended story ${i + 1}${focusText ? ` (focus: ${focusText.slice(0, 40)})` : ""}`,
            body: "Demo mode response — set DEMO_MODE=false to call Marco and Sofia for real news.",
            sourceTag: "Demo",
            cornerAccent: ">",
            layout: "top",
            contentType: "text",
            headlineSize: "default",
            bodyWeight: "regular",
            textAlign: "left",
            cornerSize: "small",
            accentBar: "bottom",
            ghostAccent: "none",
          }));
          const appended = await appendStories(date, demo);
          await appendLog({
            kind: "story.generate-more",
            actor: "user",
            ok: true,
            durationMs: Date.now() - start,
            summary: `[demo] Generated ${appended.length} more stories`,
            meta: { date, count, focus: focusText, demo: true, appendedIndexes: appended.map((s) => s.index) },
          });
          send("done", JSON.stringify({ count: appended.length, indexes: appended.map((s) => s.index) }));
          controller.close();
          return;
        }

        const handoffPath = `${requireEnv("MARCO_HANDOFFS_PATH")}/${date}.md`;
        const handoffBefore = (await fileExists(handoffPath))
          ? await readFile(handoffPath, "utf-8")
          : "";
        const headingsBefore = extractStoryHeadings(handoffBefore);

        // PHASE 1 — Marco appends to today's handoff.
        // No locking against cron Marco (12:00 Rome) or cron Sofia (12:30 Rome).
        // Concurrent runs would race on the same handoff file. Probability is
        // tiny (user has to click within a ~minute-long window) and the worst
        // case is a messy file, not data loss. Revisit if it actually happens.
        send("phase", "marco");
        const marcoPrompt = buildMarcoPrompt(date, count, focusText, handoffBefore.length > 0);
        const marcoReply = await chatWithAgent("marco", `${sessionId}-marco`, marcoPrompt, {
          mode: "generate-more",
          date,
        });

        const handoffAfter = (await fileExists(handoffPath))
          ? await readFile(handoffPath, "utf-8")
          : "";
        const headingsAfter = extractStoryHeadings(handoffAfter);
        const newHeadings = headingsAfter.filter((h) => !headingsBefore.includes(h));

        if (handoffAfter === handoffBefore || newHeadings.length === 0) {
          await logFailure(start, date, count, focusText, "marco-no-append");
          fail(`Marco didn't add new items. He said: ${truncate(marcoReply, 300)}`);
          return;
        }

        const newSections = extractSections(handoffAfter, newHeadings);
        if (newSections.length === 0) {
          await logFailure(start, date, count, focusText, "no-new-sections");
          fail("Marco appended new headings but the sections couldn't be read.");
          return;
        }

        // PHASE 2 — Sofia writes stories for the new items only (response-only, no file write)
        send("phase", "sofia");
        const sofiaPrompt = buildSofiaPrompt(newSections, suggestChainFlag);
        const sofiaReply = await chatWithAgent("sofia", `${sessionId}-sofia`, sofiaPrompt, {
          mode: "generate-more",
          date,
        });

        let parsed: Story[];
        try {
          parsed = parseStories(sofiaReply);
        } catch {
          await logFailure(start, date, count, focusText, "sofia-parse");
          fail("Sofia's response couldn't be parsed.");
          return;
        }
        if (parsed.length === 0) {
          await logFailure(start, date, count, focusText, "sofia-empty");
          fail("Sofia returned no stories.");
          return;
        }

        const stripped: Omit<Story, "index">[] = parsed.map(({ index: _index, ...rest }) => rest);
        const appended = await appendStories(date, stripped);

        await appendLog({
          kind: "story.generate-more",
          actor: "user",
          ok: true,
          durationMs: Date.now() - start,
          summary: `Generated ${appended.length} more stories`,
          meta: { date, count, focus: focusText, suggestChain: suggestChainFlag, appendedIndexes: appended.map((s) => s.index) },
        });

        send("done", JSON.stringify({ count: appended.length, indexes: appended.map((s) => s.index) }));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        await logFailure(start, date, count, focusText, msg);
        fail(msg);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Assumes Marco only ever APPENDS to the handoff. We diff before/after by full
// heading line (number + title), so an in-place title edit on an existing story
// would look like "removed old + added new" rather than a modification — the
// edited story would be picked up as new and re-sent to Sofia. The Marco prompt
// in buildMarcoPrompt explicitly forbids overwriting; if that ever changes, the
// detection here needs to be reworked (e.g. compare by index only, or have
// Marco return new items inline in his reply).
function extractStoryHeadings(markdown: string): string[] {
  const matches = markdown.matchAll(/^##\s+Story\s+\d+:?\s*(.*)$/gm);
  return Array.from(matches, (m) => `${m[0].trim()}`);
}

function extractSections(markdown: string, headings: string[]): string[] {
  // Split on `## Story N` boundaries while keeping the heading attached
  const parts = markdown.split(/(?=^##\s+Story\s+\d+)/m);
  return parts
    .filter((p) => {
      const heading = p.match(/^##\s+Story\s+\d+:?\s*(.*)$/m)?.[0]?.trim();
      return heading != null && headings.includes(heading);
    })
    .map((p) => p.trim());
}

function buildMarcoPrompt(date: string, count: number, focus: string, handoffExists: boolean): string {
  const focusLine = focus
    ? `Focus (HARD constraint): "${focus}". Only append items that directly match this focus. Do NOT substitute related-but-different stories (e.g. if asked about a model release, don't pick a policy story about that model). If you can't find items that match exactly, append fewer than requested — even zero — and explain in your reply.`
    : "Pick whatever's freshest and most relevant under your usual rules.";
  const action = handoffExists
    ? `APPEND exactly ${count} more stories to today's handoff at handoffs/${date}.md. Do NOT overwrite existing stories — add new ones underneath. Do NOT ask whether to overwrite or append; the answer is APPEND.`
    : `Write today's handoff at handoffs/${date}.md with exactly ${count} stories.`;
  const chainGuard = handoffExists
    ? `\n\nChain lock: you may NOT modify, extend, or split any existing chain in today's handoff. Stories already marked as part of a chain are off-limits. New items you add must be either standalones or members of a NEW chain.`
    : "";
  return `${action}

${focusLine}

Critical: do NOT repeat any story already in today's handoff or any handoff in the last 7 days. Each new item must be genuinely fresh.${chainGuard}

Follow your usual handoff format and verification rules in full. Reply with a brief summary of what you added.`;
}

function buildSofiaPrompt(newSections: string[], suggestChain: boolean): string {
  const chainLine = suggestChain
    ? `\n\nIf the new stories you're adding share a topic that benefits from a chain, group them as a chain per your chain rules. Don't force a chain if the topic doesn't warrant it.`
    : "";
  return `Generate Instagram story cards for ONLY the news items below — no others. Use exactly one story per item, in the same order.

Output ONLY the markdown stories using your standard format. Do NOT save to disk. Do NOT read any handoff file. Do NOT include any commentary outside the markdown. Number them starting from 1 (## Story 1, ## Story 2, …) — the dashboard will reassign indexes when appending.${chainLine}

News items:

${newSections.join("\n\n")}`;
}

function truncate(s: string, n: number): string {
  const trimmed = s.trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}…` : trimmed;
}

async function logFailure(start: number, date: string, count: number, focus: string, reason: string) {
  await appendLog({
    kind: "story.generate-more",
    actor: "user",
    ok: false,
    durationMs: Date.now() - start,
    summary: `Generate-more failed (${reason})`,
    meta: { date, count, focus, error: reason },
  });
}
