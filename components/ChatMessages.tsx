"use client";

import { ReactNode, useRef, useEffect } from "react";
import { ChatMessage } from "@/types";
import { autoResize, handleChatKeyDown } from "@/lib/chat";

interface Props {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder?: string;
  loadingText?: string;
  emptyState?: ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  footer?: ReactNode;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ChatMessages({
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  placeholder = "Type a message...",
  loadingText = "Thinking...",
  emptyState,
  disabled,
  disabledMessage,
  footer,
  inputRef: externalInputRef,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && !loading && emptyState}

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
            {loadingText}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border-light shrink-0">
        {disabled ? (
          <p className="text-[0.65rem] text-muted text-center m-0">
            {disabledMessage}
          </p>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { onInputChange(e.target.value); autoResize(inputRef.current); }}
              onKeyDown={(e) => handleChatKeyDown(e, onSend)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-border border border-border-mid rounded-md px-3 py-2 text-xs text-brand-white resize-none outline-none overflow-y-auto"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-md text-xs font-semibold shrink-0 bg-brand-white text-brand-black disabled:bg-border-mid disabled:text-muted disabled:cursor-not-allowed cursor-pointer"
            >
              Send
            </button>
          </div>
        )}
        {footer}
      </div>
    </>
  );
}
