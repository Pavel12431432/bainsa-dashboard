export interface Story {
  index: number;           // 1-based
  title: string;           // from "## Story N: Title"
  division: "Analysis" | "Projects" | "Culture" | string;
  accentColor: string;     // hex e.g. "#fe6203"
  layoutTemplate: string;
  headline: string;
  body: string;
  sourceTag: string;
  cornerAccent: ">" | "+";
}

export interface ApprovalState {
  approved: number[];   // 1-based story indices
  rejected: number[];
}

export interface ComplianceCheck {
  pass: boolean;
  detail: string;        // human-readable explanation when failing
}

export interface ComplianceResult {
  colorValid: ComplianceCheck;
  headlineOk: ComplianceCheck;
  bodyOk: ComplianceCheck;
  sourcePresent: ComplianceCheck;
  pass: boolean;         // all checks pass
}

export const ACCENT_COLORS: Record<string, string> = {
  Analysis: "#fe6203",
  Projects: "#2c40e8",
  Culture:  "#fe43a7",
};

export interface HistoryEntry {
  story: Story;
  label: string;
  timestamp: string;
}
