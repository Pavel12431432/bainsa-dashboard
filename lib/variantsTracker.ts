import { createAgentTracker } from "./agentTracker";

/** Tracks in-flight Sofia variant generation per (date, story index). */
const tracker = createAgentTracker({ storageKey: "variants-ready-stories" });

const k = (date: string, index: number) => `${date}:${index}`;

export const subscribe = tracker.subscribe;
export const getSnapshot = tracker.getSnapshot;

export function markGenerating(date: string, index: number) { tracker.markLoading(k(date, index)); }
export function clearGenerating(date: string, index: number) { tracker.clearLoading(k(date, index)); }
export function isGenerating(date: string, index: number) { return tracker.isLoading(k(date, index)); }

export function markReady(date: string, index: number) { tracker.markChanged(k(date, index)); }
export function clearReady(date: string, index: number) { tracker.clearChanged(k(date, index)); }
export function isReady(date: string, index: number) { return tracker.isChanged(k(date, index)); }
