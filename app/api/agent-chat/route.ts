import { NextRequest, NextResponse } from "next/server";
import { chatWithAgent, AgentId } from "@/lib/openclaw";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-requested-with") !== "fetch") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { agent, message, sessionId } = await req.json();

  if (!agent || !["marco", "sofia"].includes(agent)) {
    return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const fullSessionId = `agent-chat-${agent}-${sessionId}`;

  try {
    const reply = await chatWithAgent(agent as AgentId, fullSessionId, message);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
