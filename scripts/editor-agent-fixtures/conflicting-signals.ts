import { Fixture, makeStory, emptyBundle, withSummary } from "./_helpers";

const baseAdaptive = `# ADAPTIVE.md

## Tone
- Clear and informative.

## Length
- Keep headlines under 80 characters.
- Keep bodies brief.
`;

const fixture: Fixture = {
  name: "conflicting-signals",
  description:
    "Two rejections complain headlines are 'too short / no context', two other rejections plus edits say headlines are 'too long / cut fluff'. Direct contradiction.",
  expected:
    "Agent detects the conflict. Should NOT silently pick a side. Either: (a) flag as conflict in output and propose no length rule change, or (b) propose a nuanced rule (e.g. 'length should match the news — big news deserves more context') while flagging the disagreement. Rationale must mention the conflict.",
  bundle: withSummary(
    emptyBundle({
      currentAdaptive: baseAdaptive,
      signals: {
        approvals: [],
        rejections: [
          {
            date: "2026-04-10",
            storyIndex: 1,
            reason: "Way too short. No context — readers have no idea why this matters.",
            story: makeStory({
              index: 1,
              headline: "Anthropic hires",
              body: "New team forming.",
              sourceTag: "Anthropic",
            }),
          },
          {
            date: "2026-04-13",
            storyIndex: 2,
            reason: "Too short, needs more setup. What's the news?",
            story: makeStory({
              index: 2,
              headline: "Meta cuts costs",
              body: "Layoffs announced.",
              sourceTag: "Meta",
            }),
          },
          {
            date: "2026-04-15",
            storyIndex: 3,
            reason: "Too long. Cut the fluff, get to the point in the first 10 words.",
            story: makeStory({
              index: 3,
              headline: "In a move that many analysts are calling historic, OpenAI today announced new model",
              body: "The announcement came during a press conference earlier this morning, following weeks of speculation from industry watchers.",
              sourceTag: "OpenAI",
            }),
          },
          {
            date: "2026-04-17",
            storyIndex: 4,
            reason: "Too wordy. Trim it.",
            story: makeStory({
              index: 4,
              headline: "Google DeepMind has once again pushed the boundaries of what is possible",
              body: "In a blog post published today, the company outlined details.",
              sourceTag: "Google DeepMind",
            }),
          },
        ],
        edits: [
          {
            date: "2026-04-16",
            storyIndex: 5,
            changedFields: ["headline"],
            original: makeStory({
              index: 5,
              headline: "In what many are calling a breakthrough moment for the industry, xAI today unveiled Grok-4",
              body: "Grok-4 ships next month.",
              sourceTag: "xAI",
            }),
            final: makeStory({
              index: 5,
              headline: "Grok-4 ships next month",
              body: "Grok-4 ships next month.",
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
