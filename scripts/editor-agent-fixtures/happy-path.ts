import { Fixture, makeStory, emptyBundle, withSummary } from "./_helpers";

const baseAdaptive = `# ADAPTIVE.md

## Tone
- Direct and informative. Avoid corporate-speak.
- Write like a smart friend explaining the news, not a press release.

## Structure
- Lead with the key fact in the headline.
- Body adds one specific detail the headline couldn't fit.
- Source tag is the org or site that broke the news.
`;

const fixture: Fixture = {
  name: "happy-path",
  description:
    "Mostly approvals, one minor typo fix edit. Sofia is doing well — no meaningful pattern to learn from.",
  expected:
    "Agent returns status 'no-changes' (preferred) OR a minimal diff (e.g. tiny wording tweak). Should NOT invent rules. A large rewrite here is a bug.",
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
              headline: "OpenAI drops GPT-5.5",
              body: "Available today on Pro and API. Cheaper than GPT-5.",
              sourceTag: "OpenAI",
            }),
          },
          {
            date: "2026-04-14",
            storyIndex: 2,
            story: makeStory({
              index: 2,
              headline: "Anthropic opens Tokyo office",
              body: "First Asia-Pacific hub. Team of 30 by year-end.",
              sourceTag: "Anthropic",
            }),
          },
          {
            date: "2026-04-15",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "Mistral ships Le Chat 3",
              body: "Free for EU students starting Monday.",
              sourceTag: "Mistral",
            }),
          },
          {
            date: "2026-04-15",
            storyIndex: 2,
            story: makeStory({
              index: 2,
              headline: "EU AI Act enforcement begins",
              body: "First compliance deadline is June.",
              sourceTag: "EU",
            }),
          },
          {
            date: "2026-04-16",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "Groq hits 1000 tokens per second",
              body: "New inference record on Llama 4.",
              sourceTag: "Groq",
            }),
          },
          {
            date: "2026-04-17",
            storyIndex: 1,
            story: makeStory({
              index: 1,
              headline: "Perplexity launches finance tab",
              body: "Real-time market data, earnings summaries, analyst-style writeups.",
              sourceTag: "Perplexity",
            }),
          },
          {
            date: "2026-04-18",
            storyIndex: 2,
            story: makeStory({
              index: 2,
              headline: "Meta open-sources SAM 3",
              body: "New segmentation model, Apache 2.0 license.",
              sourceTag: "Meta",
            }),
          },
        ],
        rejections: [],
        edits: [
          {
            date: "2026-04-16",
            storyIndex: 2,
            changedFields: ["body"],
            original: makeStory({
              index: 2,
              headline: "Nvidia hits $4T market cap",
              body: "Frist public company to cross the mark.",
              sourceTag: "Nvidia",
            }),
            final: makeStory({
              index: 2,
              headline: "Nvidia hits $4T market cap",
              body: "First public company to cross the mark.",
              sourceTag: "Nvidia",
            }),
          },
        ],
        variantActivity: [],
      },
    }),
  ),
};

export default fixture;
