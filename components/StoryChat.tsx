"use client";

import { useState, useRef, useEffect } from "react";
import { Story, ChatMessage } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { applyUpdates } from "@/lib/storyUtils";
import { autoResize, handleChatKeyDown, loadMessages, saveMessages, storyChatKey } from "@/lib/chat";
import { markLoading, clearLoading, markUpdated, isStoryChatLoading, subscribe as subscribeChatTracker } from "@/lib/storyChatTracker";

interface Props {
  story: Story;
  date: string;
  sessionId: string;
  onUpdate: (updates: Partial<Story>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function StoryChat({ story, date, sessionId, onUpdate, onReset, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(() => isStoryChatLoading(date, story.index));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);

  const key = storyChatKey(date, story.index, sessionId);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load messages from localStorage on mount or session change
  useEffect(() => {
    setMessages(loadMessages(key));
    setLoading(isStoryChatLoading(date, story.index));
  }, [key, date, story.index]);

  // Subscribe to tracker so loading clears if the old instance's request finishes
  useEffect(() => {
    return subscribeChatTracker(() => {
      const nowLoading = isStoryChatLoading(date, story.index);
      setLoading(nowLoading);
      // When a background request finishes, reload messages (reply was saved to localStorage)
      if (!nowLoading) {
        setMessages(loadMessages(key));
      }
    });
  }, [date, story.index, key]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    // Capture at call time so the request completes even if the editor closes
    const currentDate = date;
    const currentIndex = story.index;
    const currentStory = { ...story };
    const currentSessionId = sessionId;
    const currentKey = key;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const withUser = [...messages, { role: "user" as const, content: text }];
    setMessages(withUser);
    saveMessages(currentKey, withUser);
    setLoading(true);
    markLoading(currentDate, currentIndex);

    try {
      const res = await apiFetch(`/api/stories/${currentDate}/${currentIndex}/chat`, {
        message: text,
        story: currentStory,
        sessionId: currentSessionId,
      });

      if (!res.ok) {
        const body = await res.text();
        try { throw new Error(JSON.parse(body).error); } catch { throw new Error(`Server error (${res.status})`); }
      }
      const data = await res.json();

      const withReply = [...withUser, { role: "assistant" as const, content: data.reply }];
      saveMessages(currentKey, withReply);
      // Always update state — React 19 silently ignores if unmounted
      setMessages(withReply);

      if (data.updates) {
        if (mountedRef.current) {
          onUpdate(data.updates);
        } else {
          // Editor was closed — auto-save the updates directly
          const updated = applyUpdates(currentStory, data.updates);
          await apiFetch(`/api/stories/${currentDate}/${currentIndex}/update`, updated);
          markUpdated(currentDate, currentIndex);
          document.dispatchEvent(new CustomEvent("stories-changed"));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      const withError = [...withUser, { role: "assistant" as const, content: `Error: ${msg}` }];
      saveMessages(currentKey, withError);
      setMessages(withError);
    } finally {
      clearLoading(currentDate, currentIndex);
      setLoading(false);
      if (mountedRef.current) {
        inputRef.current?.focus();
      }
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
              onChange={(e) => { setInput(e.target.value); autoResize(inputRef.current); }}
              onKeyDown={(e) => handleChatKeyDown(e, send)}
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
