"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Story } from "@/types";
import { apiFetch } from "@/lib/fetch";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  story: Story;
  date: string;
  sessionId: string;
  onUpdate: (updates: Partial<Story>) => void;
  onReset: () => void;
  disabled?: boolean;
}

function storageKey(date: string, index: number, sessionId: string) {
  return `sofia-messages:${date}:${index}:${sessionId}`;
}

export default function StoryChat({ story, date, sessionId, onUpdate, onReset, disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  const key = storageKey(date, story.index, sessionId);

  // Load messages from localStorage on mount or session change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setMessages(stored ? JSON.parse(stored) : []);
    } catch {
      setMessages([]);
    }
    loaded.current = true;
  }, [key]);

  // Persist messages to localStorage
  const persist = useCallback(
    (msgs: Message[]) => {
      if (loaded.current) localStorage.setItem(key, JSON.stringify(msgs));
    },
    [key],
  );

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
    if (!text || loading) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const withUser = [...messages, { role: "user" as const, content: text }];
    setMessages(withUser);
    persist(withUser);
    setLoading(true);

    try {
      const res = await apiFetch(`/api/stories/${date}/${story.index}/chat`, {
        message: text,
        story,
        sessionId,
      });

      if (!res.ok) {
        const text = await res.text();
        try { throw new Error(JSON.parse(text).error); } catch { throw new Error(`Server error (${res.status})`); }
      }
      const data = await res.json();

      const withReply = [...withUser, { role: "assistant" as const, content: data.reply }];
      setMessages(withReply);
      persist(withReply);
      if (data.updates) onUpdate(data.updates);
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-light shrink-0">
        <span className="text-[0.65rem] font-semibold text-muted tracking-[0.08em]">SOFIA</span>
        {messages.length > 0 && (
          <button
            onClick={onReset}
            className="text-[0.6rem] font-semibold text-muted tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-brand-white"
          >
            RESET
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-muted text-center mt-8 leading-relaxed">
            Ask Sofia to refine this story.
            <br />
            <span className="opacity-60">e.g. &quot;make the headline punchier&quot;</span>
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
            Sofia is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border-light shrink-0">
        {disabled ? (
          <p className="text-[0.65rem] text-muted text-center m-0">
            Restore this version to continue chatting
          </p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask Sofia..."
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
        )}
      </div>
    </div>
  );
}
