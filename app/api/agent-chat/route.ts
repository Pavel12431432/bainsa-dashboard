import { NextRequest, NextResponse } from "next/server";
import { chatWithAgent, AgentId } from "@/lib/openclaw";
import { requireFetch } from "@/lib/apiGuard";

export async function POST(req: NextRequest) {
  const csrf = requireFetch(req);
  if (csrf) return csrf;

  const { agent, message, sessionId, newSession } = await req.json();

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
    const finalMessage = newSession ? `/new ${message}` : message;
    const reply = await chatWithAgent(agent as AgentId, fullSessionId, finalMessage);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Agent error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
