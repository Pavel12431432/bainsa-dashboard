import { NextRequest, NextResponse } from "next/server";
import { chatWithAgent, buildUserMessage, parseResponse } from "@/lib/openclaw";
import { Story } from "@/types";
import { requireFetch, validateStoryParams } from "@/lib/apiGuard";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> },
) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { date, index } = await params;
  const invalid = validateStoryParams(date, index);
  if (invalid) return invalid;

  const { message, story, sessionId, chainSiblings } = (await req.json()) as {
    message: string;
    story: Story;
    sessionId: string;
    chainSiblings?: Story[];
  };

  if (!message?.trim() || !sessionId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const fullSessionId = `dashboard-${date}-${index}-${sessionId}`;
  const userMessage = buildUserMessage(story, message, chainSiblings);

  try {
    const content = await chatWithAgent("sofia", fullSessionId, userMessage, {
      mode: "story-edit",
      date,
      storyIndex: parseInt(index, 10),
    });
    const { message: reply, updates } = parseResponse(content);
    return NextResponse.json({ reply, updates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
