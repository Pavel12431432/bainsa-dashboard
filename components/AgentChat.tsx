"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/fetch";
import { renderMarkdown } from "@/lib/markdown";
import SlidePanel from "./SlidePanel";


type Agent = "MARCO" | "SOFIA";

interface AgentStatus {
  ranToday: boolean;
  lastRun: string | null;
  count: number | null;
  content: string | null;
}

interface Status {
  marco: AgentStatus;
  sofia: AgentStatus;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  date: string;
  open: boolean;
  agent: Agent | null;
  outputExpanded: boolean;
  onClose: () => void;
  onSwitchAgent: (agent: Agent) => void;
}

function getSessionId(date: string, agent: string): string {
  const key = `agent-chat-session:${date}:${agent}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function messagesKey(date: string, agent: string, sessionId: string) {
  return `agent-chat:${date}:${agent}:${sessionId}`;
}

export default function AgentChat({ date, open, agent, outputExpanded, onClose, onSwitchAgent }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [expanded, setExpanded] = useState(outputExpanded);
  const [outputHeight, setOutputHeight] = useState(200);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);
  const dragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Sync expanded state when panel opens
  useEffect(() => {
    if (open) setExpanded(outputExpanded);
  }, [open, outputExpanded]);

  // Fetch agent status on open
  useEffect(() => {
    if (!open) return;
    setStatusLoading(true);
    fetch(`/api/agent-status?date=${date}`)
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .finally(() => setStatusLoading(false));
  }, [open, date]);

  // Load session and messages when agent/date changes
  useEffect(() => {
    if (!open || !agent) return;
    const agentLower = agent.toLowerCase();
    const sid = getSessionId(date, agentLower);
    setSessionId(sid);
    setLoading(false);
    try {
      const stored = localStorage.getItem(messagesKey(date, agentLower, sid));
      setMessages(stored ? JSON.parse(stored) : []);
    } catch {
      setMessages([]);
    }
    loaded.current = true;
  }, [open, agent, date]);

  const persist = useCallback(
    (msgs: Message[]) => {
      if (loaded.current && agent && sessionId) {
        localStorage.setItem(messagesKey(date, agent.toLowerCase(), sessionId), JSON.stringify(msgs));
      }
    },
    [date, agent, sessionId],
  );

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function autoResize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !agent || !sessionId) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const withUser = [...messages, { role: "user" as const, content: text }];
    setMessages(withUser);
    persist(withUser);
    setLoading(true);

    try {
      const res = await apiFetch("/api/agent-chat", {
        agent: agent.toLowerCase(),
        message: text,
        sessionId,
        newSession: messages.length === 0,
      });
      if (!res.ok) {
        const text = await res.text();
        try { throw new Error(JSON.parse(text).error); } catch { throw new Error(`Server error (${res.status})`); }
      }
      const data = await res.json();
      const reply = data.reply?.trim();
      if (!reply) throw new Error("Empty response — try again");

      const withReply = [...withUser, { role: "assistant" as const, content: reply }];
      setMessages(withReply);
      persist(withReply);

      // Refetch agent status so collapsible output updates if agent modified files
      fetch(`/api/agent-status?date=${date}`)
        .then((r) => r.json())
        .then((data) => setStatus(data));

      // Signal StoryGrid to refetch stories + stale status
      document.dispatchEvent(new CustomEvent("stories-changed"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const withError = [...withUser, { role: "assistant" as const, content: `Error: ${msg}` }];
      setMessages(withError);
      persist(withError);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    if (!agent) return;
    const agentLower = agent.toLowerCase();
    // Clear old session
    if (sessionId) {
      localStorage.removeItem(messagesKey(date, agentLower, sessionId));
    }
    // New session
    const newId = crypto.randomUUID();
    localStorage.setItem(`agent-chat-session:${date}:${agentLower}`, newId);
    setSessionId(newId);
    setMessages([]);
  }

  function onDragStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    dragging.current = true;
    dragStartHeight.current = outputHeight;
    dragStartY.current = "touches" in e ? e.touches[0].clientY : e.clientY;

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!dragging.current) return;
      const clientY = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      const delta = clientY - dragStartY.current;
      setOutputHeight(Math.max(80, Math.min(dragStartHeight.current + delta, window.innerHeight - 200)));
    }

    function onEnd() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onEnd);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const current = agent === "MARCO" ? status?.marco : status?.sofia;
  const label = agent === "MARCO" ? "articles" : "stories";

  const tabs = (
    <div className="flex gap-0.5">
      {(["MARCO", "SOFIA"] as Agent[]).map((a) => {
        const active = agent === a;
        const st = a === "MARCO" ? status?.marco : status?.sofia;
        return (
          <button
            key={a}
            onClick={() => { if (!active) onSwitchAgent(a); }}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
              active
                ? "bg-border-light text-brand-white"
                : "bg-transparent text-brand-white opacity-40 hover:opacity-70"
            }`}
          >
            {a}
            {!statusLoading && st && (
              <div
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ background: st.ranToday ? "#22c55e" : "#555" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <SlidePanel
      side="right"
      open={open}
      title={tabs}
      onClose={onClose}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Collapsible + resizable output block */}
        {current && current.ranToday && current.content && (
          <div className="shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-6 py-3 bg-[#141414] text-left border-none cursor-pointer border-b border-[#1f1f1f]"
            >
              <span className="text-[0.7rem] font-semibold text-brand-white opacity-55">
                Output · {current.count} {label}
              </span>
              <span className="text-brand-white opacity-35 text-xs">
                {expanded ? "▲" : "▼"}
              </span>
            </button>
            {expanded && (
              <>
                <div
                  className="overflow-y-auto px-6 py-4 bg-[#141414]"
                  style={{ height: outputHeight }}
                >
                  {renderMarkdown(current.content)}
                </div>
                {/* Drag handle */}
                <div
                  onMouseDown={onDragStart}
                  onTouchStart={onDragStart}
                  className="h-2 bg-[#141414] border-b border-[#1f1f1f] cursor-row-resize flex items-center justify-center shrink-0"
                >
                  <div className="w-8 h-[3px] rounded-full bg-border-mid" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && !loading && (
            <p className="text-xs text-muted text-center mt-8 leading-relaxed">
              {agent === "MARCO"
                ? "Ask Marco about today's news."
                : "Ask Sofia about the stories."}
              <br />
              <span className="opacity-60">
                {agent === "MARCO"
                  ? 'e.g. "find more AI news" or "why did you pick story 3?"'
                  : 'e.g. "make all headlines shorter" or "regenerate stories"'}
              </span>
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "self-end bg-border-light text-brand-white"
                  : "self-start bg-border text-brand-white opacity-80"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div className="self-start bg-border rounded-lg px-3 py-2 text-xs text-muted animate-pulse">
              {agent === "MARCO" ? "Marco" : "Sofia"} is thinking...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#1f1f1f] shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agent === "MARCO" ? "Marco" : "Sofia"}...`}
              rows={1}
              className="flex-1 bg-border border border-border-mid rounded-md px-3 py-2 text-xs text-brand-white resize-none outline-none overflow-y-auto"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-md text-xs font-semibold shrink-0 bg-brand-white text-brand-black disabled:bg-border-mid disabled:text-muted disabled:cursor-not-allowed cursor-pointer"
            >
              Send
            </button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="mt-2 text-[0.6rem] font-semibold text-muted tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-brand-white"
            >
              RESET CHAT
            </button>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}
