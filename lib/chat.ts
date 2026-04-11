import { ChatMessage } from "@/types";

/** Auto-resize a textarea to fit content, capped at maxHeight. */
export function autoResize(el: HTMLTextAreaElement | null, maxHeight = 120) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
}

/** Send on Enter (without Shift). */
export function handleChatKeyDown(
  e: React.KeyboardEvent,
  send: () => void,
) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

/** Read messages from localStorage. */
export function loadMessages(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Write messages to localStorage. */
export function saveMessages(key: string, msgs: ChatMessage[]) {
  localStorage.setItem(key, JSON.stringify(msgs));
}

// --- localStorage key helpers ---

export function storyChatKey(date: string, index: number, sessionId: string) {
  return `sofia-messages:${date}:${index}:${sessionId}`;
}

export function storyChatSessionKey(date: string, index: number) {
  return `sofia-session:${date}:${index}`;
}

export function agentChatKey(date: string, agent: string, sessionId: string) {
  return `agent-chat:${date}:${agent}:${sessionId}`;
}

export function agentChatSessionKey(date: string, agent: string) {
  return `agent-chat-session:${date}:${agent}`;
}
