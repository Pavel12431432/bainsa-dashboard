import { Fixture, makeStory, emptyBundle, withSummary } from "./_helpers";

const baseAdaptive = `# ADAPTIVE.md

## Tone
- Clear and informative.
- Use precise language.

## Structure
- Lead with the key fact.
- Keep bodies tight.
`;

const fixture: Fixture = {
  name: "too-corporate",
  description:
    "Four rejections in two weeks all cite 'too corporate / sounds like a press release' tone. Three edits shortened headlines and made them punchier. Clear single-theme signal.",
  expected:
    "Agent clusters the 4 rejections + 3 edits into one theme (tone is too corporate). Proposes adding 1-2 bullets under ## Tone about casual/direct voice, avoiding press-release phrasing. Preserves existing bullets verbatim. Rationale cites the rejections and edits.",
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
              body: "Weights are out today, benchmarks look strong.",
              sourceTag: "OpenAI",
            }),
          },
        ],
        rejections: [
          {
            date: "2026-04-10",
            storyIndex: 2,
            reason: "Sounds like a press release. Too corporate, nobody talks like this.",
            story: makeStory({
              index: 2,
              headline: "Anthropic announces strategic partnership with enterprise clients",
              body: "The company today unveiled a comprehensive framework for deploying AI solutions across enterprise environments.",
              sourceTag: "Anthropic",
            }),
          },
          {
            date: "2026-04-12",
            storyIndex: 3,
            reason: "Too corporate. Make it sound human.",
            story: makeStory({
              index: 3,
              headline: "Meta unveils comprehensive AI safety framework for enterprise deployments",
              body: "Meta has announced a robust, enterprise-grade safety framework designed to facilitate responsible AI adoption.",
              sourceTag: "Meta",
            }),
          },
          {
            date: "2026-04-16",
            storyIndex: 1,
            reason: "Reads like a CEO letter. We're a student org, not IBM.",
            story: makeStory({
              index: 1,
              headline: "Google leverages synergistic AI capabilities to empower developers",
              body: "Google today announced it will leverage its synergistic AI capabilities to empower developers worldwide.",
              sourceTag: "Google",
            }),
          },
          {
            date: "2026-04-18",
            storyIndex: 4,
            reason: "'Facilitate innovation' — who speaks like this? Rewrite.",
            story: makeStory({
              index: 4,
              headline: "New EU regulation set to facilitate innovation in AI sector",
              body: "The European Commission today outlined measures designed to facilitate responsible innovation.",
              sourceTag: "EU Commission",
            }),
          },
        ],
        edits: [
          {
            date: "2026-04-11",
            storyIndex: 5,
            changedFields: ["headline"],
            original: makeStory({
              index: 5,
              headline: "Microsoft announces comprehensive investment in AI infrastructure",
              body: "Microsoft is committing $10B to AI datacenters.",
              sourceTag: "Microsoft",
            }),
            final: makeStory({
              index: 5,
              headline: "Microsoft drops $10B on AI datacenters",
              body: "Microsoft is committing $10B to AI datacenters.",
              sourceTag: "Microsoft",
            }),
          },
          {
            date: "2026-04-14",
            storyIndex: 2,
            changedFields: ["headline", "body"],
            original: makeStory({
              index: 2,
              headline: "DeepMind unveils revolutionary new architecture for language models",
              body: "DeepMind has introduced a groundbreaking new architecture that promises to revolutionize the field.",
              sourceTag: "DeepMind",
            }),
            final: makeStory({
              index: 2,
              headline: "DeepMind's new LM architecture actually works",
              body: "Beats transformers on 4 of 5 benchmarks. Open-sourced today.",
              sourceTag: "DeepMind",
            }),
          },
          {
            date: "2026-04-17",
            storyIndex: 3,
            changedFields: ["headline"],
            original: makeStory({
              index: 3,
              headline: "xAI announces strategic initiative to advance model capabilities",
              body: "Grok-4 ships next month.",
              sourceTag: "xAI",
            }),
            final: makeStory({
              index: 3,
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
