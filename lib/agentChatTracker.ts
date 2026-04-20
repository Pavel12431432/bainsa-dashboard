import { createAgentTracker } from "./agentTracker";

/** Tracks in-flight Marco/Sofia drawer chat requests per (date, agent).
 *  Survives React unmounts so switching date doesn't drop the loading
 *  indicator. Unread flag persisted to localStorage. */
const tracker = createAgentTracker({ storageKey: "agent-chat-unread" });

const k = (date: string, agent: string) => `${date}:${agent.toLowerCase()}`;

export const subscribe = tracker.subscribe;
export const getSnapshot = tracker.getSnapshot;

export function markLoading(date: string, agent: string) { tracker.markLoading(k(date, agent)); }
export function clearLoading(date: string, agent: string) { tracker.clearLoading(k(date, agent)); }
export function isAgentLoading(date: string, agent: string) { return tracker.isLoading(k(date, agent)); }

export function markUnread(date: string, agent: string) { tracker.markChanged(k(date, agent)); }
export function clearUnread(date: string, agent: string) { tracker.clearChanged(k(date, agent)); }
export function isAgentUnread(date: string, agent: string) { return tracker.isChanged(k(date, agent)); }

/** The currently-mounted AgentChat's active view, used by send() to decide
 *  whether completion should raise the unread flag. */
let activeView: { date: string; agent: string } | null = null;
export function setActiveView(view: { date: string; agent: string } | null) {
  activeView = view;
}
export function isActiveView(date: string, agent: string): boolean {
  return !!activeView && activeView.date === date && activeView.agent === agent.toLowerCase();
}
