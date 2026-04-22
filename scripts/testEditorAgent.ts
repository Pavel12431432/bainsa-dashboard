/**
 * Dry-run harness for Lorenzo (the editor agent).
 *
 * Feeds each fixture in `scripts/editor-agent-fixtures/` to Lorenzo via the
 * OpenClaw CLI (or DEMO_MODE stub) and writes the response to
 * `scripts/editor-agent-output/<name>.md` for eyeballing.
 *
 * Run: `npx tsx scripts/testEditorAgent.ts`
 * Run one: `npx tsx scripts/testEditorAgent.ts too-corporate`
 *
 * Review outputs with `git diff scripts/editor-agent-output/` after each
 * SOUL.md tweak.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { fixtures } from "./editor-agent-fixtures";
import { runEditorAgent, type EditorProposal } from "../lib/editorAgent";
import { diffLines } from "../lib/diff";
import type { Fixture } from "./editor-agent-fixtures/_helpers";

const OUTPUT_DIR = join(process.cwd(), "scripts", "editor-agent-output");

function formatDiff(before: string, after: string): string {
  const parts = diffLines(before, after);
  return parts
    .map((p) => {
      if (p.type === "added") return `+ ${p.line}`;
      if (p.type === "removed") return `- ${p.line}`;
      return `  ${p.line}`;
    })
    .join("\n");
}

function renderReport(fixture: Fixture, proposal: EditorProposal): string {
  const lines: string[] = [];
  lines.push(`# ${fixture.name}`);
  lines.push("");
  lines.push(`**Scenario:** ${fixture.description}`);
  lines.push("");
  lines.push(`**Expected:** ${fixture.expected}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`## Status: \`${proposal.status}\``);
  lines.push("");
  lines.push(`**Summary:** ${proposal.summary || "(none)"}`);
  lines.push("");

  if (proposal.conflicts.length) {
    lines.push("## Conflicts flagged");
    lines.push("");
    for (const c of proposal.conflicts) {
      lines.push(`- ${c.description} [${c.signalRefs.join(", ")}]`);
    }
    lines.push("");
  }

  if (proposal.rationale.length) {
    lines.push("## Rationale");
    lines.push("");
    for (const r of proposal.rationale) {
      lines.push(`- ${r.text} [${r.signalRefs.join(", ")}]`);
    }
    lines.push("");
  }

  if (proposal.status === "proposal" && proposal.proposedContent) {
    lines.push("## Diff vs current ADAPTIVE.md");
    lines.push("");
    lines.push("```diff");
    lines.push(formatDiff(fixture.bundle.currentAdaptive, proposal.proposedContent));
    lines.push("```");
    lines.push("");
    lines.push("## Proposed ADAPTIVE.md (full)");
    lines.push("");
    lines.push("```markdown");
    lines.push(proposal.proposedContent);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function renderError(fixture: Fixture, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return [
    `# ${fixture.name}`,
    "",
    `**Scenario:** ${fixture.description}`,
    "",
    `**Expected:** ${fixture.expected}`,
    "",
    "---",
    "",
    "## ERROR",
    "",
    "```",
    msg,
    "```",
    "",
  ].join("\n");
}

async function runOne(fixture: Fixture): Promise<void> {
  const sessionId = `editor-agent-test-${fixture.name}-${Date.now()}`;
  process.stdout.write(`→ ${fixture.name} ... `);
  let report: string;
  try {
    const proposal = await runEditorAgent(fixture.bundle, sessionId);
    report = renderReport(fixture, proposal);
    console.log(`${proposal.status}`);
  } catch (err) {
    report = renderError(fixture, err);
    console.log("ERROR");
    console.log(`  ${err instanceof Error ? err.message : String(err)}`);
  }
  await writeFile(join(OUTPUT_DIR, `${fixture.name}.md`), report, "utf-8");
}

async function main(): Promise<void> {
  const filter = process.argv[2];
  const selected = filter
    ? fixtures.filter((f) => f.name === filter)
    : fixtures;

  if (!selected.length) {
    console.error(
      `No fixtures matched "${filter}". Available: ${fixtures.map((f) => f.name).join(", ")}`,
    );
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const f of selected) {
    await runOne(f);
  }

  console.log(`\nOutputs written to ${OUTPUT_DIR}`);
  console.log(`Review with: git diff ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
