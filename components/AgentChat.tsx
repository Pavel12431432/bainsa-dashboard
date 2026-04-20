"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { ChatMessage } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { loadMessages, saveMessages, agentChatKey, agentChatSessionKey } from "@/lib/chat";
import { renderMarkdown } from "@/lib/markdown";
import {
  markLoading,
  clearLoading,
  isAgentLoading,
  markUnread,
  setActiveView,
  isActiveView,
  subscribe as subscribeAgentChat,
  getSnapshot as getAgentChatSnapshot,
} from "@/lib/agentChatTracker";
import SlidePanel from "./SlidePanel";
import ChatMessages from "./ChatMessages";

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

interface Props {
  date: string;
  open: boolean;
  agent: Agent | null;
  outputExpanded: boolean;
  onClose: () => void;
  onSwitchAgent: (agent: Agent) => void;
}

function getSessionId(date: string, agent: string): string {
  const key = agentChatSessionKey(date, agent);
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function AgentChat({ date, open, agent, outputExpanded, onClose, onSwitchAgent }: Props) {
  useSyncExternalStore(subscribeAgentChat, getAgentChatSnapshot, () => 0);
  const [status, setStatus] = useState<Status | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [expanded, setExpanded] = useState(outputExpanded);
  const [outputHeight, setOutputHeight] = useState(200);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isLoading = agent && date ? isAgentLoading(date, agent) : false;
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
    setMessages(loadMessages(agentChatKey(date, agentLower, sid)));
    loaded.current = true;
  }, [open, agent, date]);

  function persistMessages(msgs: ChatMessage[], forAgent?: string, forSessionId?: string, forDate?: string) {
    const a = forAgent ?? agent?.toLowerCase();
    const sid = forSessionId ?? sessionId;
    const d = forDate ?? date;
    if (loaded.current && a && sid) {
      saveMessages(agentChatKey(d, a, sid), msgs);
    }
  }

  // Auto-scroll — instant on agent switch, smooth during conversation
  const switching = useRef(false);
  useEffect(() => { switching.current = true; }, [agent]);

  // Track active view so completions know whether to raise unread flag
  useEffect(() => {
    if (open && agent && date) {
      setActiveView({ date, agent: agent.toLowerCase() });
      return () => setActiveView(null);
    }
  }, [open, agent, date]);

  async function send() {
    const text = input.trim();
    if (!text || isLoading || !agent || !sessionId) return;

    // Capture at call time so closure works even if drawer closes mid-request
    const currentAgent = agent;
    const currentAgentLower = agent.toLowerCase();
    const currentSessionId = sessionId;
    const currentDate = date;
    const isNewSession = messages.length === 0;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const withUser = [...messages, { role: "user" as const, content: text }];
    setMessages(withUser);
    persistMessages(withUser, currentAgentLower, currentSessionId, currentDate);
    markLoading(currentDate, currentAgent);

    try {
      // Include date context so the agent knows which date we're viewing
      const contextMessage = `[Viewing stories for ${currentDate}]\n\n${text}`;
      const res = await apiFetch("/api/agent-chat", {
        agent: currentAgentLower,
        message: contextMessage,
        sessionId: currentSessionId,
        newSession: isNewSession,
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
      persistMessages(withReply, currentAgentLower, currentSessionId, currentDate);

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
      persistMessages(withError, currentAgentLower, currentSessionId, currentDate);
    } finally {
      clearLoading(currentDate, currentAgent);
      if (!isActiveView(currentDate, currentAgent)) {
        markUnread(currentDate, currentAgent);
      }
      inputRef.current?.focus();
    }
  }

  function reset() {
    if (!agent) return;
    const agentLower = agent.toLowerCase();
    if (sessionId) {
      localStorage.removeItem(agentChatKey(date, agentLower, sessionId));
    }
    const newId = crypto.randomUUID();
    localStorage.setItem(agentChatSessionKey(date, agentLower), newId);
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
                className={`w-[5px] h-[5px] rounded-full shrink-0 ${date && isAgentLoading(date, a) ? "animate-pulse" : ""}`}
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
              className="w-full flex items-center justify-between px-6 py-3 bg-surface-2 text-left border-none cursor-pointer border-b border-border-panel"
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
                  className="overflow-y-auto px-6 py-4 bg-surface-2"
                  style={{ height: outputHeight }}
                >
                  {renderMarkdown(current.content)}
                </div>
                {/* Drag handle */}
                <div
                  onMouseDown={onDragStart}
                  onTouchStart={onDragStart}
                  className="h-2 bg-surface-2 border-b border-border-panel cursor-row-resize flex items-center justify-center shrink-0"
                >
                  <div className="w-8 h-[3px] rounded-full bg-border-mid" />
                </div>
              </>
            )}
          </div>
        )}

        <ChatMessages
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={send}
          loading={isLoading}
          placeholder={`Ask ${agent === "MARCO" ? "Marco" : "Sofia"}...`}
          loadingText={`${agent === "MARCO" ? "Marco" : "Sofia"} is thinking...`}
          inputRef={inputRef}
          emptyState={
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
          }
          footer={
            messages.length > 0 ? (
              <button
                onClick={reset}
                className="mt-2 text-[0.6rem] font-semibold text-muted tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-brand-white"
              >
                RESET CHAT
              </button>
            ) : undefined
          }
        />
      </div>
    </SlidePanel>
  );
}
