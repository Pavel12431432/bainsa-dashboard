# stale-rule

**Scenario:** ADAPTIVE.md has a rule 'Always include a specific statistic or number in the body.' Recent edits consistently REMOVED statistics that felt forced, and one rejection flagged 'stat feels shoehorned.' The rule has become stale.

**Expected:** Agent proposes softening or removing the 'always include a statistic' rule. Options: remove it entirely, or soften to 'include a specific detail (number, name, or date) when it adds substance — don't force one.' Rationale must cite the edits that removed stats and the rejection.

---

## Status: `proposal`

**Summary:** The strongest pattern is that forced stats are getting stripped out or rejected when they feel unnecessary or shoehorned. The style guide should stop requiring a number every time and instead treat stats as optional when they genuinely add value.

## Rationale

- Remove the hard requirement to always include a statistic or number in the body; multiple edits deleted weak stats and one rejection called out a shoehorned percentage. [rejection-0, edit-0, edit-1, edit-2]
- Keep the key-fact-first structure, but let the body use a concrete detail only when it actually clarifies the story. [approval-0, edit-3]

## Diff vs current ADAPTIVE.md

```diff
  # ADAPTIVE.md
  
  ## Tone
  - Direct and informative.
  
  ## Structure
- - Always include a specific statistic or number in the body.
  - Lead with the key fact in the headline.
+ - Use the body for one concrete detail when it adds real context.
+ - Don't force a statistic or number if it feels shoehorned.
  
```

## Proposed ADAPTIVE.md (full)

```markdown
# ADAPTIVE.md

## Tone
- Direct and informative.

## Structure
- Lead with the key fact in the headline.
- Use the body for one concrete detail when it adds real context.
- Don't force a statistic or number if it feels shoehorned.

```
