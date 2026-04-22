# Editor Agent — Build Plan

Status: planning complete, not yet started. Last updated 2026-04-22.

## Goal

A new OpenClaw agent (`story-editor`) that reviews recent human feedback on Sofia's stories and proposes updates to `ADAPTIVE.md`. Human approves/rejects each proposal via the Teach page.

## Design decisions

### Signal sources (v1)
- Rejections (with feedback text)
- Edits (diff of original Sofia output vs final approved version)
- Variant apply/dislike data
- Approvals (low-signal but completes picture)
- Last 3 versions of `ADAPTIVE.md` (shows trajectory)
- **Skipped for v1**: inline Sofia chat transcripts (not currently persisted server-side; add in v2 if proposals feel thin)

### Trigger
- Manual only for v1 (button on Teach page). Cron later if trusted.

### Output behavior
- Agent **rewrites ADAPTIVE.md as a whole**, but SOUL.md instructs it to preserve existing content verbatim unless contradicted or redundant. Most diffs should be small.
- Reason: pure edit-only accumulates cruft; whole-file rewrite with strong preservation instruction gives us consolidation + small diffs.
- Proposes a diff — never writes directly. Human reviews via Teach page.
- Only touches `ADAPTIVE.md`. Never `USER.md` or `FIXED.md`.
- Can output "no changes needed" as valid response when signal is too weak.
- Flags conflicting signals to human rather than silently picking a side.

### Agent thinking style
- Cluster feedback into themes first, then derive 1 rule per theme (cleaner rationale, fewer redundant rules).
- Produces 2–4 rationale bullets + per-bullet citations (which rejections/edits drove it).

### Rolling window
- Default 14 days. User can change to 7/30 via inspector modal.

### Safety
- Human-in-the-loop via diff approval is the safety mechanism. No automated confidence thresholds.
- Version history already supports rollback; add `source: "editor-agent"` tag on entries.

## UI design

On the existing Teach Sofia page (`/teach`), the ADAPTIVE.md right column gets three states:

1. **Normal** (current behavior) — textarea, Ctrl+S save, history timeline. New "Propose updates" button top-right.
2. **Generating** — spinner + "Editor agent is reviewing recent feedback..."
3. **Proposal pending** — rationale bullets at top (with citation links), diff view below (via existing `lib/diff.ts`), ACCEPT / REJECT / EDIT buttons.

### Data inspector modal
Opened from "Propose updates" before generation, or from rationale citations after:
- Date range selector (7/14/30 days)
- Summary counts
- Tabbed list: Rejections / Edits / Chat / Variants / Approvals
- Click row → expands inline with full context
- GENERATE PROPOSAL button at bottom

### Proposal pending UI
- Rationale bullets at top, each clickable to open inspector pre-filtered to the signals that drove it
- Conflicts (if any) rendered as callout above bullets
- Diff below
- ACCEPT writes to ADAPTIVE.md + history (tagged `source: "editor-agent"`), deletes proposal sidecar
- REJECT discards proposal sidecar
- EDIT opens textarea pre-filled with proposed version

### Stale proposal banner
Shown when significant new feedback arrived since `generatedAt` (threshold: ≥5 new signals or ≥3 days elapsed) or when ADAPTIVE.md changed since proposal was based on it.

### History timeline
Small bot icon on entries with `source: "editor-agent"`.

## Build phases

### Phase 1 — Backend foundation
1. `lib/editorFeedback.ts` — `collectFeedback(windowDays)` reads STORIES_PATH, approvals sidecars, history sidecars, variants sidecars. Returns typed `FeedbackBundle` with rejections, edits (diffs), variant activity, approvals, last 3 ADAPTIVE.md versions.
2. `app/api/teach/feedback/route.ts` — `GET ?days=14` returns `FeedbackBundle`.

### Phase 2 — Editor agent
3. Write **fixtures first** — `scripts/editor-agent-fixtures/` with 5 hand-crafted `FeedbackBundle` JSONs + expected rationale (human-written):
   - `fixture-too-corporate.json` (clear tone issue)
   - `fixture-conflicting-signals.json` (flag conflict)
   - `fixture-weak-signal.json` ("no changes needed")
   - `fixture-stale-rule.json` (remove/soften existing rule)
   - `fixture-happy-path.json` (minimal diff)
4. Create OpenClaw agent `~/openclaw/workspace/story-editor/` with `SOUL.md` + `USER.md`. SOUL instructs: cluster → rationale → diff, preserve existing verbatim unless contradicted, flag conflicts, "no changes" is valid.
5. `lib/editorAgent.ts` — wraps `chatWithAgent("story-editor", ...)`. Builds prompt from `FeedbackBundle`. Parses response into `{ proposedContent, rationale: Bullet[], citations, conflicts }`. `Bullet = { text, signalRefs: string[] }`.
6. `lib/proposals.ts` — read/write `ADAPTIVE.proposal.json` sidecar: `{ proposedContent, rationale, citations, conflicts, generatedAt, basedOnAdaptiveVersion }`.
7. `scripts/testEditorAgent.ts` — runs all fixtures, dumps outputs to `scripts/editor-agent-output/<fixture>.md` for eyeballing. `git diff` shows behavioral changes across SOUL.md iterations.

### Phase 3 — Proposal API
8. `app/api/teach/propose/route.ts` — `POST` generates proposal, writes sidecar. `GET` returns current pending proposal or null. `DELETE` discards.
9. `app/api/teach/propose/accept/route.ts` — `POST` writes to ADAPTIVE.md, records history entry tagged `source: "editor-agent"`, deletes proposal sidecar.
10. Extend `lib/instructionHistory.ts` to support optional `source` field.

### Phase 4 — UI
11. `components/FeedbackInspector.tsx` — modal with date range, counts, tabs, expandable rows, GENERATE button. Reusable post-generation with pre-filter for citation click-through.
12. Extend `components/TeachEditor.tsx` with Normal / Generating / Proposal pending states + stale-proposal banner.
13. Update `components/HistoryTimeline.tsx` (or the Teach-side usage) to show bot icon for `source: "editor-agent"` entries.

### Phase 5 — Polish
14. "No changes needed" response → friendly state, auto-dismiss generating.
15. Conflict callout rendering.
16. Manual E2E: reject real stories with reasons, generate proposal, verify sanity, accept, check ADAPTIVE.md + history.

## Testing strategy

Not automated assertions — structured eyeballing across a stable fixture set.

1. **Fixtures as design targets** — write fixtures + expected rationale *before* writing SOUL.md, so prompt is designed against concrete scenarios not tuned reactively.
2. **Dry-run harness** (`npm run editor-agent:test` or similar) — runs all fixtures, dumps outputs to `scripts/editor-agent-output/`.
3. **Regression via git diff** — after SOUL.md tweaks, `git diff scripts/editor-agent-output/` shows exactly how behavior changed.
4. **Golden snapshots** — commit full expected output for 1–2 fixtures as reference.
5. **Shadow mode (optional)** — before exposing ACCEPT, log proposals nightly for a week, review passively.

**Known gap**: we can't automatically verify that accepted proposals actually make Sofia better. That's a vibes check on future story quality. A/B of ADAPTIVE.md versions is too expensive for v1.

## Open questions / deferred

- Chat transcripts as signal — deferred to v2. Would need new sidecar `{STORIES_PATH}/{date}.chats.json` written from `app/api/stories/[date]/[index]/chat/route.ts` and `app/api/agent-chat/route.ts`.
- Automated cron trigger — after manual trigger proves itself.
- Sofia-output A/B evaluation — out of scope for v1.
