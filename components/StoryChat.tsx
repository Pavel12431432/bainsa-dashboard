"use client";

import { useState, useRef, useEffect } from "react";
import { Story, ChatMessage } from "@/types";
import { apiFetch } from "@/lib/fetch";
import { applyUpdates } from "@/lib/storyUtils";
import { loadMessages, saveMessages, storyChatKey } from "@/lib/chat";
import { markLoading, clearLoading, markUpdated, isStoryChatLoading, subscribe as subscribeChatTracker } from "@/lib/storyChatTracker";
import ChatMessages from "./ChatMessages";

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
          await apiFetch(`/api/stories/${currentDate}/${currentIndex}/update?source=sofia`, updated);
          document.dispatchEvent(new CustomEvent("stories-changed"));
        }
      }
      // Show "Sofia responded" pill whenever the editor isn't open to see the reply
      if (!mountedRef.current) {
        markUpdated(currentDate, currentIndex);
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
        <span className="text-[0.65rem] font-semibold text-muted tracking-[0.08em] flex items-center gap-2">
          SOFIA
          <span className={`w-[6px] h-[6px] rounded-full shrink-0 bg-success ${loading ? "animate-pulse" : ""}`} />
        </span>
        {messages.length > 0 && (
          <button
            onClick={onReset}
            className="text-[0.6rem] font-semibold text-muted tracking-[0.04em] bg-transparent border-none cursor-pointer hover:text-brand-white"
          >
            RESET
          </button>
        )}
      </div>

      <ChatMessages
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={send}
        loading={loading}
        placeholder="Ask Sofia..."
        loadingText="Sofia is thinking..."
        disabled={disabled}
        disabledMessage="Restore this version to continue chatting"
        inputRef={inputRef}
        emptyState={
          <p className="text-xs text-muted text-center mt-8 leading-relaxed">
            Ask Sofia to refine this story.
            <br />
            <span className="opacity-60">e.g. &quot;make the headline punchier&quot;</span>
          </p>
        }
      />
    </div>
  );
}
