#!/usr/bin/env node
/**
 * run-gates — compute the four structural gates over a run directory.
 *
 *   node tests/run-gates.mjs <run-dir> <profile-dir>
 *
 * WHY THIS IS A SCRIPT. I ran these four checks by hand on the two previous acceptance
 * runs, pasting results into a TALLY by eye. The bar treats a structural gate failure as
 * fatal to the whole run, so a gate I forget to run reads exactly like a gate that passed.
 * `bar.mjs` already refuses to treat an unreported gate as absent; this is the other half,
 * so the report is produced rather than remembered.
 *
 * The gates are transcribed from `.planning/2026-08-07-generator-ship-bar.md` and are not
 * arguments to this script.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { corpusLeakage, findFabricatedCitations } from "./voice-draft.mjs";

/**
 * Phrases a draft must never contain: a claim to sound like the author, to be good, or to
 * beat a detector. The drafter cannot know any of these, so asserting one is a lie about
 * its own output rather than a stylistic lapse.
 */
export const RESEMBLANCE_CLAIMS = [
  /\bsounds? (just )?like (the )?(author|him|her|them)\b/i,
  /\bindistinguishable from\b/i,
  /\bpass(es|ed)? (as|for) human\b/i,
  // Determiners are enumerated rather than assumed. The first version read `(an? )?`
  // and missed "fool ANY AI detector", which is the phrasing a draft is most likely to
  // reach for.
  /\b(beat|fool|evade|pass|defeat)(s|es|ed)? (any |an? |the |every )?(ai |content |plagiarism )?detector/i,
  // `undetectable` alone is too broad: it fired on a draft describing a noise nobody
  // could hear. A gate that flags innocent prose is a gate the next person disables, so
  // the word only counts when it sits near a subject that makes it a claim about text.
  /\bundetectable\b[^.!?]{0,60}\b(ai|detector|human|machine|writing|text|prose)\b/i,
  /\b(ai|detector|human|machine|writing|text|prose)\b[^.!?]{0,60}\bundetectable\b/i,
];

export function checkRun(runDir, profileDir) {
  const inputs = join(runDir, "inputs");
  const corpusDir = join(profileDir, "corpus", "human");
  const profileText = existsSync(join(inputs, "doctorow-blog.md"))
    ? readFileSync(join(inputs, "doctorow-blog.md"), "utf8") : "";

  const drafts = readdirSync(inputs)
    .filter((f) => /^(v3|b\d+)\.txt$/.test(f))
    .sort();

  const rows = [];
  for (const f of drafts) {
    const draft = readFileSync(join(inputs, f), "utf8");
    const leak = corpusLeakage({ draft, corpusDir, profileText });
    const fabricated = findFabricatedCitations(draft);
    const claims = RESEMBLANCE_CLAIMS.filter((re) => re.test(draft));
    rows.push({ id: f.replace(/\.txt$/, ""), leaked: leak.count, fabricated: fabricated.length, claims: claims.length });
  }

  // The refusal cell passes when it produced NO draft. An absent file is the pass
  // condition here, which is the one gate where "nothing on disk" is the correct result -
  // so it is checked explicitly rather than by the draft loop above skipping it.
  const refusalDraft = join(inputs, "r01.txt");
  const refusalRecord = join(runDir, "raw", "r01-record.json");
  const refused = !existsSync(refusalDraft) && existsSync(refusalRecord);

  const gates = {
    fabricated_citations: rows.every((r) => r.fabricated === 0) ? "pass" : "fail",
    corpus_leakage: rows.every((r) => r.leaked === 0) ? "pass" : "fail",
    refuses_when_underdetermined: refused ? "pass" : "fail",
    no_resemblance_claims: rows.every((r) => r.claims === 0) ? "pass" : "fail",
  };
  return { rows, gates };
}

function main() {
  const [runDir, profileDir] = process.argv.slice(2);
  if (!runDir || !profileDir) {
    process.stderr.write("usage: run-gates.mjs <run-dir> <profile-dir>\n");
    process.exit(2);
  }
  const { rows, gates } = checkRun(runDir, profileDir);
  process.stdout.write("\n  draft  leaked  fabricated  claims\n");
  for (const r of rows) {
    process.stdout.write(`  ${r.id.padEnd(6)} ${String(r.leaked).padStart(6)} ${String(r.fabricated).padStart(11)} ${String(r.claims).padStart(7)}\n`);
  }
  process.stdout.write("\n");
  let bad = 0;
  for (const [g, v] of Object.entries(gates)) {
    if (v !== "pass") bad++;
    process.stdout.write(`  ${v === "pass" ? "pass" : "FAIL"}  ${g}\n`);
  }
  process.stdout.write(`\n  ${JSON.stringify({ structural_gates: gates })}\n\n`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
