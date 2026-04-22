import { Fixture, makeStory, emptyBundle, withSummary } from "./_helpers";

const baseAdaptive = `# ADAPTIVE.md

## Tone
- Direct and informative.

## Structure
- Always include a specific statistic or number in the body.
- Lead with the key fact in the headline.
`;

const fixture: Fixture = {
  name: "stale-rule",
  description:
    "ADAPTIVE.md has a rule 'Always include a specific statistic or number in the body.' Recent edits consistently REMOVED statistics that felt forced, and one rejection flagged 'stat feels shoehorned.' The rule has become stale.",
  expected:
    "Agent proposes softening or removing the 'always include a statistic' rule. Options: remove it entirely, or soften to 'include a specific detail (number, name, or date) when it adds substance — don't force one.' Rationale must cite the edits that removed stats and the rejection.",
  bundle: withSummary(
    emptyBundle({
      currentAdaptive: baseAdaptive,
      signals: {
        approvals: [
          {
            date: "2026-04-14",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "EU AI Act enforcement begins",
              body: "First compliance deadline is June.",
              sourceTag: "EU",
            }),
          },
        ],
        rejections: [
          {
            date: "2026-04-15",
            storyIndex: 2,
            reason: "The '43%' stat feels shoehorned. Cut it or find one that actually matters.",
            story: makeStory({
              index: 2,
              headline: "Google drops new Gemini feature",
              body: "Gemini now reads tabs, which 43% of users reportedly want.",
              sourceTag: "Google",
            }),
          },
        ],
        edits: [
          {
            date: "2026-04-10",
            storyIndex: 3,
            changedFields: ["body"],
            original: makeStory({
              index: 3,
              headline: "Anthropic opens Tokyo office",
              body: "First Asia-Pacific hub. Team of 30 by year-end. 70% focus on enterprise.",
              sourceTag: "Anthropic",
            }),
            final: makeStory({
              index: 3,
              headline: "Anthropic opens Tokyo office",
              body: "First Asia-Pacific hub. Team of 30 by year-end.",
              sourceTag: "Anthropic",
            }),
          },
          {
            date: "2026-04-12",
            storyIndex: 4,
            changedFields: ["body"],
            original: makeStory({
              index: 4,
              headline: "Mistral ships Le Chat 3",
              body: "Now free for students in EU. Used by 12% of French universities.",
              sourceTag: "Mistral",
            }),
            final: makeStory({
              index: 4,
              headline: "Mistral ships Le Chat 3",
              body: "Now free for students in EU.",
              sourceTag: "Mistral",
            }),
          },
          {
            date: "2026-04-14",
            storyIndex: 5,
            changedFields: ["body"],
            original: makeStory({
              index: 5,
              headline: "OpenAI releases voice mode to all users",
              body: "Rolled out globally today. 2.5x faster latency than previous version.",
              sourceTag: "OpenAI",
            }),
            final: makeStory({
              index: 5,
              headline: "OpenAI releases voice mode to all users",
              body: "Rolled out globally today. Noticeably faster than before.",
              sourceTag: "OpenAI",
            }),
          },
          {
            date: "2026-04-16",
            storyIndex: 2,
            changedFields: ["body"],
            original: makeStory({
              index: 2,
              headline: "xAI announces Grok-4",
              body: "Ships next month. Tops Llama 4 on 7 of 10 benchmarks.",
              sourceTag: "xAI",
            }),
            final: makeStory({
              index: 2,
              headline: "xAI announces Grok-4",
              body: "Ships next month. Beats Llama 4 on reasoning.",
              sourceTag: "xAI",
            }),
          },
        ],
        variantActivity: [],
      },
    }),
  ),
};

export default fixture;
