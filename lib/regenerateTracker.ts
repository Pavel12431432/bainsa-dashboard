import { createAgentTracker } from "./agentTracker";

/** Tracks in-flight Sofia "regenerate all stories" requests per date.
 *  Survives date navigation so the stale banner keeps spinning. */
const tracker = createAgentTracker();

export const subscribe = tracker.subscribe;
export const getSnapshot = tracker.getSnapshot;

export function markRegenerating(date: string) { tracker.markLoading(date); }
export function clearRegenerating(date: string) { tracker.clearLoading(date); }
export function isRegenerating(date: string) { return tracker.isLoading(date); }

export function markRegenerated(date: string) { tracker.markChanged(date); }
export function clearRegenerated(date: string) { tracker.clearChanged(date); }
export function isRegenerated(date: string) { return tracker.isChanged(date); }
