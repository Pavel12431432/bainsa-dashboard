import { Fixture, makeStory, emptyBundle, withSummary } from "./_helpers";

const baseAdaptive = `# ADAPTIVE.md

## Tone
- Direct and informative. Avoid corporate-speak.

## Structure
- Lead with the key fact in the headline.
- Body adds one specific detail (number, name, or date) the headline couldn't fit.
`;

const fixture: Fixture = {
  name: "weak-signal",
  description:
    "Mostly approvals, a single vague rejection, no edits. Not enough signal to justify a change.",
  expected:
    "Agent returns status 'no-changes' with a brief rationale explaining the signal is too weak / ambiguous. No diff. Should NOT hallucinate a rule from the lone rejection.",
  bundle: withSummary(
    emptyBundle({
      currentAdaptive: baseAdaptive,
      signals: {
        approvals: [
          {
            date: "2026-04-15",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "OpenAI drops new open-weight model",
              body: "Weights out today, benchmarks beat Llama 4 on reasoning.",
              sourceTag: "OpenAI",
            }),
          },
          {
            date: "2026-04-15",
            storyIndex: 2,
            story: makeStory({
              index: 2,
              headline: "Anthropic opens Tokyo office",
              body: "First Asia-Pacific hub. Team of 30 by year-end.",
              sourceTag: "Anthropic",
            }),
          },
          {
            date: "2026-04-16",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "Mistral ships Le Chat 3",
              body: "Now free for students in EU.",
              sourceTag: "Mistral",
            }),
          },
          {
            date: "2026-04-17",
            storyIndex: 2,
            story: makeStory({
              index: 2,
              headline: "EU AI Act enforcement kicks in",
              body: "First fines expected within 3 months.",
              sourceTag: "EU",
            }),
          },
        ],
        rejections: [
          {
            date: "2026-04-18",
            storyIndex: 3,
            reason: "eh, not really feeling it",
            story: makeStory({
              index: 3,
              headline: "Groq hits 1000 tokens per second",
              body: "New inference record on Llama 4.",
              sourceTag: "Groq",
            }),
          },
        ],
        edits: [],
        variantActivity: [],
      },
    }),
  ),
};

export default fixture;
