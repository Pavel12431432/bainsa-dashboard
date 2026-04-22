# weak-signal

**Scenario:** Mostly approvals, a single vague rejection, no edits. Not enough signal to justify a change.

**Expected:** Agent returns status 'no-changes' with a brief rationale explaining the signal is too weak / ambiguous. No diff. Should NOT hallucinate a rule from the lone rejection.

---

## Status: `no-changes`

**Summary:** The feedback is too weak to justify a style-guide change. Four approvals all fit the current simple structure, and the single rejection is vague without a repeatable pattern.
