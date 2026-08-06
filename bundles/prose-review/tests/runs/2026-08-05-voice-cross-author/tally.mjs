#!/usr/bin/env node
/**
 * tally — the per-tier and per-cell numbers `verify-run.mjs` cannot produce.
 *
 *   node runs/2026-08-05-voice-cross-author/tally.mjs
 *
 * WHY A SECOND COUNTER. `verify-run.mjs` is the authority on this run's headline counts and
 * on the two contract counts, and it is not touched here. But its voice profile has exactly
 * two buckets, negative and positive, and this run's whole argument is that the positives
 * must NOT share a denominator: 4 of them vary the author with the register held, and 26
 * vary both. A single pooled cross-author rate would hide the one thing worth measuring.
 * So this file splits by the tier declared in MANIFEST.json — declared before dispatch, in a
 * file no critic saw — and refuses to print a pooled positive rate at all.
 *
 * It reads the WRAPPED transcripts, which is the same evidence `verify-run.mjs` reads, and it
 * re-derives the verdict from the body rather than from the wrapper, for the reason
 * run-harness.mjs gives: the wrapper is an operator's transcription.
 *
 * THE FINDINGS COUNT IS RE-DERIVED WITH A WIDER PATTERN, AND THAT IS A REPORTED DEFECT.
 * `run-harness.mjs` counts bare `**LOCATION**` markers. One transcript numbers them inline as
 * `**1. LOCATION**`, so the harness counts 0 where the transcript has 6. The published
 * RESULT line keeps the harness's number — editing a transcript so a count comes out is what
 * the harness exists to prevent — and the corrected count appears only here, labelled.
 *
 * INTERVALS. With zero errors in n trials the point estimate is 100% and means little on its
 * own. The one-sided 95% Clopper-Pearson lower bound is 0.05^(1/n), and it is printed twice:
 * once over DRAWS and once over CELLS. The draw-level bound is the flattering one and it is
 * wrong, because three draws of one cell share a prompt, a corpus and a draft and are not
 * independent trials. **The cell-level bound is the one to quote.**
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseWrapped } from "../../run-harness.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(HERE, "MANIFEST.json"), "utf8"));

const TIERS = {
  N:  "same author, held-out sample — nothing varies",
  A1: "cross-author, register + decade held (work-cohesion varies)",
  A2: "cross-author, register + cohesion held (era varies)",
  B:  "cross-author, register also varies",
};

/**
 * Verdict and findings come from the CRITIC'S BODY only, via the harness's own
 * `parseWrapped`. Splitting the operator note off matters here and is not a nicety: the notes
 * on three of these transcripts quote `**LOCATION**` while explaining a defect, and a
 * hand-rolled split counted the operator's own prose as the critic's findings. Reusing the
 * parser that produced the file is the only version of this that cannot drift.
 */
function bodyOf(text, file) {
  const p = parseWrapped(text, file);
  if (p.error) {
    process.stderr.write(`tally: ${p.error}\n`);
    process.exit(1);
  }
  return p;
}

function verdictOf(body) {
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const bare = lines[i].replace(/\*/g, "").replace(/\.$/, "").trim().toUpperCase();
    if (bare === "CLEAN" || bare === "REVISE") return bare;
    const m = bare.match(/^VERDICT\s*:\s*(CLEAN|REVISE)$/);
    if (m) return m[1];
  }
  return null;
}

/** Tolerates `**1. LOCATION**` as well as `**LOCATION**`; see the header. */
const findingsOf = (text) => (text.match(/\*\*\s*(?:\d+\.\s*)?LOCATION\s*\*\*/g) ?? []).length;

const byTranscript = new Map();
for (const c of manifest.cases) {
  for (const t of c.transcripts) byTranscript.set(t, c);
}

const rows = [];
for (const f of readdirSync(HERE).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md").sort()) {
  const name = f.replace(/\.md$/, "");
  const c = byTranscript.get(name);
  if (!c) {
    process.stderr.write(`tally: ${f} names no case in MANIFEST.json\n`);
    process.exit(1);
  }
  const p = bodyOf(readFileSync(join(HERE, f), "utf8"), f);
  rows.push({
    name, cell: c.fixture, tier: c.tier, kind: c.kind,
    corpus: c.corpus_author, draft: c.draft_author,
    verdict: verdictOf(p.body), findings: findingsOf(p.body), harnessCount: p.fields.findings,
  });
}
if (rows.length !== manifest.total_dispatches) {
  process.stderr.write(`tally: ${rows.length} transcripts, MANIFEST declares ${manifest.total_dispatches}\n`);
  process.exit(1);
}

const expected = (kind) => (kind === "negative" ? "CLEAN" : "REVISE");
const lower95 = (n) => (n > 0 ? (1 - 0.05 ** (1 / n)) : 0);
const pad = (s, n) => String(s).padEnd(n);

process.stdout.write(`\n  ${manifest.run_id} — ${rows.length} draws over ${manifest.cases.length} cells\n`);
process.stdout.write(`  critic prompt sha256 ${manifest.agent_sha256.slice(0, 12)}\n`);

// ---- per tier -------------------------------------------------------------
process.stdout.write("\n  BY TIER — these are not pooled, and pooling them is the error this run exists to avoid\n\n");
process.stdout.write(`    ${pad("tier", 5)}${pad("what it holds constant", 60)}${pad("cells", 7)}${pad("draws", 7)}as expected\n`);
for (const [t, what] of Object.entries(TIERS)) {
  const g = rows.filter((r) => r.tier === t);
  if (!g.length) continue;
  const ok = g.filter((r) => r.verdict === expected(r.kind)).length;
  const cells = new Set(g.map((r) => r.cell)).size;
  process.stdout.write(`    ${pad(t, 5)}${pad(what, 60)}${pad(cells, 7)}${pad(g.length, 7)}${ok} of ${g.length}\n`);
}

// ---- agreement across draws ----------------------------------------------
process.stdout.write("\n  REPLICATION — cells dispatched k>1 from ONE prompt file (P12: verdicts are not deterministic)\n\n");
let split = 0;
for (const c of manifest.cases.filter((c) => c.draws > 1)) {
  const g = rows.filter((r) => r.cell === c.fixture);
  const vs = g.map((r) => r.verdict);
  const unanimous = new Set(vs).size === 1;
  if (!unanimous) split += 1;
  process.stdout.write(
    `    ${pad(c.fixture, 26)}${pad(c.tier, 4)}${pad(vs.join(" "), 22)}`
    + `${unanimous ? "unanimous" : "SPLIT"}   findings ${g.map((r) => r.findings).join("/")}\n`,
  );
}
const kCells = manifest.cases.filter((c) => c.draws > 1).length;
process.stdout.write(`\n    ${kCells - split} of ${kCells} replicated cells unanimous; ${split} split\n`);
process.stdout.write(`    ${rows.filter((r) => r.tier === "B").length} tier-B draws are SINGLE DRAWS and carry no agreement figure at all\n`);

// ---- what the numbers bound ----------------------------------------------
const neg = rows.filter((r) => r.kind === "negative");
const negCells = new Set(neg.map((r) => r.cell)).size;
const negErr = neg.filter((r) => r.verdict !== "CLEAN").length;
const head = rows.filter((r) => r.tier === "A1" || r.tier === "A2");
const headCells = new Set(head.map((r) => r.cell)).size;
const headErr = head.filter((r) => r.verdict !== "REVISE").length;

process.stdout.write("\n  WHAT THIS BOUNDS — one-sided 95% Clopper-Pearson, zero errors observed\n\n");
const bound = (label, cells, draws, err) => {
  if (err) { process.stdout.write(`    ${label}: ${err} error(s); the zero-error bound below does not apply\n`); return; }
  process.stdout.write(
    `    ${label}\n`
    + `      by cell (quote this):  error rate <= ${(lower95(cells) * 100).toFixed(1)}%   (n=${cells} independent cells)\n`
    + `      by draw (do not):      error rate <= ${(lower95(draws) * 100).toFixed(1)}%   (n=${draws} draws, k of which share a prompt)\n`,
  );
};
bound("false positives — same-author drafts wrongly flagged", negCells, neg.length, negErr);
bound("false negatives — register-matched intruders missed", headCells, head.length, headErr);

// ---- findings-count defect ------------------------------------------------
const mis = rows.filter((r) => r.findings !== r.harnessCount);
process.stdout.write("\n  FINDINGS COUNT — re-derived here with a wider pattern than run-harness.mjs uses\n\n");
if (!mis.length) process.stdout.write("    no transcript disagrees with its RESULT line\n");
for (const r of mis) {
  process.stdout.write(`    ${pad(r.name, 30)}RESULT says findings=${r.harnessCount}, transcript contains ${r.findings}\n`);
}

// ---- the full matrix ------------------------------------------------------
const authors = manifest.authors.map((a) => a.id);
process.stdout.write("\n  THE MATRIX — rows are the corpus author, columns the draft's author\n");
process.stdout.write("  `.` expected CLEAN and got it; `R` expected REVISE and got it; `!` disagrees with ground truth\n\n");
process.stdout.write(`    ${pad("corpus \\ draft", 16)}${authors.map((a) => pad(a.slice(0, 6), 8)).join("")}\n`);
for (const c of authors) {
  let line = `    ${pad(c, 16)}`;
  for (const d of authors) {
    const g = rows.filter((r) => r.corpus === c && r.draft === d);
    const want = c === d ? "CLEAN" : "REVISE";
    const sym = g.every((r) => r.verdict === want) ? (want === "CLEAN" ? "." : "R") : "!";
    line += pad(`${sym}${g.length > 1 ? `x${g.length}` : ""}`, 8);
  }
  process.stdout.write(`${line}\n`);
}
process.stdout.write("\n");
