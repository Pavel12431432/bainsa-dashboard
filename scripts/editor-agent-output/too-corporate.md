# too-corporate

**Scenario:** Four rejections in two weeks all cite 'too corporate / sounds like a press release' tone. Three edits shortened headlines and made them punchier. Clear single-theme signal.

**Expected:** Agent clusters the 4 rejections + 3 edits into one theme (tone is too corporate). Proposes adding 1-2 bullets under ## Tone about casual/direct voice, avoiding press-release phrasing. Preserves existing bullets verbatim. Rationale cites the rejections and edits.

---

## Status: `proposal`

**Summary:** The feedback is very consistent: humans kept rejecting anything that sounded like a press release, CEO letter, or enterprise marketing copy. The strongest update is to make the tone explicitly human and non-corporate, while keeping the existing key-fact-first structure.

## Rationale

- Add a hard tone rule: avoid press-release, enterprise, and buzzword language; write like a smart student would say it. [rejection-0, rejection-1, rejection-2, rejection-3]
- Prefer plain, punchy headlines over formal corporate phrasing; edits consistently turned 'announces/comprehensive/strategic' into shorter, more direct wording. [edit-0, edit-1, edit-2]
- Keep the headline/body split minimal: the headline carries the main fact, and the body should add one concrete detail instead of restating the headline. [edit-1, approval-0]

## Diff vs current ADAPTIVE.md

```diff
  # ADAPTIVE.md
  
  ## Tone
  - Clear and informative.
  - Use precise language.
+ - Sound human, not like a press release.
+ - Avoid corporate, enterprise, and buzzword phrasing.
  
  ## Structure
  - Lead with the key fact.
  - Keep bodies tight.
+ - Use the headline for the main fact, then add one concrete detail in the body.
  
```

## Proposed ADAPTIVE.md (full)

```markdown
# ADAPTIVE.md

## Tone
- Clear and informative.
- Use precise language.
- Sound human, not like a press release.
- Avoid corporate, enterprise, and buzzword phrasing.

## Structure
- Lead with the key fact.
- Keep bodies tight.
- Use the headline for the main fact, then add one concrete detail in the body.

```
