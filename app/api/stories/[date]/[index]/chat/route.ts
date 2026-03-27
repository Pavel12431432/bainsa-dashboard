import { NextRequest, NextResponse } from "next/server";
import { isValidDate } from "@/lib/date";
import { chatWithSofia, buildUserMessage, parseResponse } from "@/lib/openclaw";
import { Story } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string; index: string }> },
) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { date, index } = await params;
  if (!isValidDate(date) || !/^\d+$/.test(index)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { message, story, sessionId } = (await req.json()) as {
    message: string;
    story: Story;
    sessionId: string;
  };

  if (!message?.trim() || !sessionId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const fullSessionId = `dashboard-${date}-${index}-${sessionId}`;
  const userMessage = buildUserMessage(story, message);

  try {
    const content = await chatWithSofia(userMessage, fullSessionId);
    const { message: reply, updates } = parseResponse(content);
    return NextResponse.json({ reply, updates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
