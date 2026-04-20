import { createAgentTracker } from "./agentTracker";

const tracker = createAgentTracker({ storageKey: "sofia-updated-stories" });

const k = (date: string, index: number) => `${date}:${index}`;

export const subscribe = tracker.subscribe;
export const getSnapshot = tracker.getSnapshot;

export function markLoading(date: string, index: number) { tracker.markLoading(k(date, index)); }
export function clearLoading(date: string, index: number) { tracker.clearLoading(k(date, index)); }
export function isStoryChatLoading(date: string, index: number) { return tracker.isLoading(k(date, index)); }

export function markUpdated(date: string, index: number) { tracker.markChanged(k(date, index)); }
export function clearUpdated(date: string, index: number) { tracker.clearChanged(k(date, index)); }
export function isUpdatedUnseen(date: string, index: number) { return tracker.isChanged(k(date, index)); }
