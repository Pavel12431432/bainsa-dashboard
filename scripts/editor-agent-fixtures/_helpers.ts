import { Story } from "@/types";
import type { FeedbackBundle } from "@/lib/editorFeedback";

/** Build a Story with sensible defaults; override any fields. */
export function makeStory(overrides: Partial<Story> & { index: number }): Story {
  return {
    title: "",
    division: "Culture",
    accentColor: "#fe43a7",
    layout: "top",
    contentType: "text",
    headlineSize: "default",
    bodyWeight: "regular",
    textAlign: "left",
    cornerSize: "small",
    accentBar: "bottom",
    ghostAccent: "none",
    headline: "",
    body: "",
    sourceTag: "",
    cornerAccent: ">",
    ...overrides,
  };
}

export interface Fixture {
  name: string;
  description: string;
  /** Human-written expectation of what a sane editor agent should produce. */
  expected: string;
  bundle: FeedbackBundle;
}

export function emptyBundle(overrides: Partial<FeedbackBundle> = {}): FeedbackBundle {
  return {
    windowDays: 14,
    dateRange: { from: "2026-04-08", to: "2026-04-22" },
    summary: {
      approvals: 0,
      rejections: 0,
      edits: 0,
      variantsApplied: 0,
      variantsDisliked: 0,
      datesCovered: 0,
    },
    signals: { rejections: [], edits: [], variantActivity: [], approvals: [] },
    currentAdaptive: "",
    adaptiveHistory: [],
    ...overrides,
  };
}

/** Recompute summary counts from signals — convenient in fixture files. */
export function withSummary(b: FeedbackBundle): FeedbackBundle {
  return {
    ...b,
    summary: {
      approvals: b.signals.approvals.length,
      rejections: b.signals.rejections.length,
      edits: b.signals.edits.length,
      variantsApplied: b.signals.variantActivity.reduce((n, v) => n + v.applied.length, 0),
      variantsDisliked: b.signals.variantActivity.reduce((n, v) => n + v.disliked.length, 0),
      datesCovered: new Set([
        ...b.signals.approvals.map((s) => s.date),
        ...b.signals.rejections.map((s) => s.date),
        ...b.signals.edits.map((s) => s.date),
        ...b.signals.variantActivity.map((s) => s.date),
      ]).size,
    },
  };
}
