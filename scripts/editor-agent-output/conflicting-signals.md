# conflicting-signals

**Scenario:** Two rejections complain headlines are 'too short / no context', two other rejections plus edits say headlines are 'too long / cut fluff'. Direct contradiction.

**Expected:** Agent detects the conflict. Should NOT silently pick a side. Either: (a) flag as conflict in output and propose no length rule change, or (b) propose a nuanced rule (e.g. 'length should match the news — big news deserves more context') while flagging the disagreement. Rationale must mention the conflict.

---

## Status: `proposal`

**Summary:** The feedback points in two directions at once: some stories were rejected for being too short and lacking context, while others were rejected for being wordy and slow to get to the point. The update should keep the copy compact, but require enough setup to explain why the news matters.

## Conflicts flagged

- Some feedback says the copy is too short and lacks context, while other feedback says it is too long and wordy. The rule needs to balance brevity with enough setup. [rejection-0, rejection-1, rejection-2, rejection-3]

## Rationale

- Replace the blunt length rule with a balance rule: keep copy tight, but don't make headlines so short that readers lose the context. [rejection-0, rejection-1]
- Favor headlines that get to the point quickly, then use the body for one concrete detail instead of extra scene-setting or filler. [rejection-2, rejection-3, edit-0]
- Preserve the existing clear/informative tone, but make the body do real explanatory work when the headline is minimal. [rejection-0, edit-0]

## Diff vs current ADAPTIVE.md

```diff
  # ADAPTIVE.md
  
  ## Tone
  - Clear and informative.
  
  ## Length
- - Keep headlines under 80 characters.
- - Keep bodies brief.
+ - Keep copy tight, but don't make headlines so short that readers lose the context.
+ - Get to the point fast; avoid filler, scene-setting, or extra setup.
+ - Use the body for one concrete detail that adds context or explains why it matters.
  
```

## Proposed ADAPTIVE.md (full)

```markdown
# ADAPTIVE.md

## Tone
- Clear and informative.

## Length
- Keep copy tight, but don't make headlines so short that readers lose the context.
- Get to the point fast; avoid filler, scene-setting, or extra setup.
- Use the body for one concrete detail that adds context or explains why it matters.

```
