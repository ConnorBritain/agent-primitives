#!/usr/bin/env node
/**
 * FU-6 — is the Chekhov ellipsis the author's or the edition's?
 *
 * PI-02 S1 named "ellipses, exclamations, direct-address questions" as the dialogic
 * register a vanilla-AI Chekhov pastiche was missing. S2's voice profile then recorded
 * the trailing four-dot ellipsis at 9/10 support as "the workhorse punctuation, marking
 * a thought dropped rather than finished" — an instruction a drafter would follow.
 *
 * But the corpus is Constance Garnett's 1920 selection, and her Translator's Note says
 * she chose "these letters AND PASSAGES FROM LETTERS". The edition is abridged, it marks
 * its cuts with dots, and it never states the convention. So the same glyph is doing two
 * jobs and the profile cannot tell them apart.
 *
 * This script separates them the only way the text allows: by POSITION. An ellipsis that
 * opens or closes a paragraph is a cut — nobody trails off into a paragraph break and
 * then resumes. An ellipsis sitting mid-sentence between two lowercase words is the
 * author: "Rain, cold, mud ... brrr!" is a pause, and there is nothing there to excise.
 *
 * Run: node bundles/prose-review/tests/ellipsis-provenance.mjs
 * Exits non-zero only on a harness problem, never on a finding. This measures; it does
 * not gate.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUTENBERG = resolve(HERE, "..", "..", "prose-tell-scan", "tests", "corpus", "human-essays", "gutenberg");

/** The ten letters the S2 voice profile was rendered from. */
export const FIXTURE_LETTERS = [
  "chekhov-001-to-his-brother-mihail", "chekhov-017-to-a-n-pleshtcheyev",
  "chekhov-031-to-his-sister", "chekhov-043-to-a-s-suvorin",
  "chekhov-056-to-his-sister", "chekhov-073-to-e-m-s",
  "chekhov-087-to-madame-avilov", "chekhov-115-to-i-i-orlov",
  "chekhov-132-to-o-l-knipper", "chekhov-154-to-his-sister",
];

const ELLIPSIS = /\.\.\.\.?/g;
const stripFrontmatter = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, "");

/**
 * Where an ellipsis sits, and what that implies about who put it there.
 *
 * `boundary` marks the classes that cannot be an authorial pause: a pause does not
 * straddle a paragraph break. `authorial` marks the one class that cannot be a cut:
 * mid-sentence between lowercase words, where there is no removable unit.
 * `indeterminate` is the honest bucket, and it is the largest one.
 */
export const CLASSES = {
  "opens-letter": { boundary: true, note: "text removed before the letter begins" },
  "closes-letter": { boundary: true, note: "text removed after the letter ends" },
  "opens-paragraph": { boundary: true, note: "paragraph begins mid-flow" },
  "closes-paragraph": { boundary: true, note: "paragraph truncated" },
  "mid-sentence": { authorial: true, note: "lowercase either side — a pause, not a cut" },
  "between-sentences": { indeterminate: true, note: "same glyph, either job, undecidable here" },
};

export function classifyLetter(text) {
  const body = stripFrontmatter(text).trim();
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  const hits = [];

  paragraphs.forEach((paragraph, index) => {
    const line = paragraph.split(/\s+/).join(" ").trim();
    for (const match of line.matchAll(ELLIPSIS)) {
      const before = line.slice(0, match.index).trim();
      const after = line.slice(match.index + match[0].length).trim();
      const first = index === 0;
      const last = index === paragraphs.length - 1;

      let cls;
      if (!before) cls = first ? "opens-letter" : "opens-paragraph";
      else if (!after) cls = last ? "closes-letter" : "closes-paragraph";
      else if (/^[a-z]/.test(after)) cls = "mid-sentence";
      else cls = "between-sentences";

      hits.push({ cls, glyph: match[0], before: before.slice(-60), after: after.slice(0, 60) });
    }
  });

  return { words: body.split(/\s+/).filter(Boolean).length, hits };
}

export function measure(letters) {
  const tally = Object.fromEntries(Object.keys(CLASSES).map((k) => [k, 0]));
  let words = 0;
  const examples = {};
  for (const name of letters) {
    const path = join(GUTENBERG, `${name}.txt`);
    if (!existsSync(path)) continue;
    const { words: w, hits } = classifyLetter(readFileSync(path, "utf8"));
    words += w;
    for (const h of hits) {
      tally[h.cls] += 1;
      if (!examples[h.cls]) examples[h.cls] = { ...h, letter: name };
    }
  }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const boundary = Object.entries(tally).filter(([k]) => CLASSES[k].boundary).reduce((a, [, v]) => a + v, 0);
  return { words, total, tally, boundary, authorial: tally["mid-sentence"], indeterminate: tally["between-sentences"], examples };
}

function per1k(n, words) { return words ? (n * 1000) / words : 0; }

function report(label, letters) {
  const m = measure(letters);
  process.stdout.write(`\n${label} — ${letters.length} letters, ${m.words.toLocaleString()} words, ${m.total} ellipses (${per1k(m.total, m.words).toFixed(2)}/1k)\n`);
  for (const [cls, n] of Object.entries(m.tally)) {
    const pct = m.total ? ((n * 100) / m.total).toFixed(1) : "0.0";
    process.stdout.write(`  ${cls.padEnd(19)} ${String(n).padStart(4)}  ${pct.padStart(5)}%   ${CLASSES[cls].note}\n`);
  }
  process.stdout.write(`  ${"".padEnd(19)} ----\n`);
  process.stdout.write(`  ${"CUT (boundary)".padEnd(19)} ${String(m.boundary).padStart(4)}  ${((m.boundary * 100) / m.total).toFixed(1).padStart(5)}%\n`);
  process.stdout.write(`  ${"AUTHOR (mid-sent)".padEnd(19)} ${String(m.authorial).padStart(4)}  ${((m.authorial * 100) / m.total).toFixed(1).padStart(5)}%\n`);
  process.stdout.write(`  ${"UNDECIDABLE".padEnd(19)} ${String(m.indeterminate).padStart(4)}  ${((m.indeterminate * 100) / m.total).toFixed(1).padStart(5)}%\n`);
  process.stdout.write(`\n  Defensible authorial rate: ${per1k(m.authorial, m.words).toFixed(2)}/1k (lower bound)`
    + ` .. ${per1k(m.authorial + m.indeterminate, m.words).toFixed(2)}/1k (upper, crediting every undecidable case)\n`);
  process.stdout.write(`  Naive reading of the raw text: ${per1k(m.total, m.words).toFixed(2)}/1k\n`);
  return m;
}

function crossAuthor() {
  process.stdout.write("\nEllipsis density by author, same corpus — is Chekhov unusual?\n");
  const byAuthor = {};
  for (const f of readdirSync(GUTENBERG).filter((f) => f.endsWith(".txt"))) {
    (byAuthor[f.split("-")[0]] ??= []).push(f);
  }
  for (const [author, files] of Object.entries(byAuthor).sort()) {
    let words = 0; let n = 0;
    for (const f of files) {
      const body = stripFrontmatter(readFileSync(join(GUTENBERG, f), "utf8"));
      words += body.split(/\s+/).filter(Boolean).length;
      n += (body.match(ELLIPSIS) ?? []).length;
    }
    process.stdout.write(`  ${author.padEnd(12)} ${String(files.length).padStart(4)} files  ${String(words).padStart(7)} words  ${String(n).padStart(4)} ellipses  ${per1k(n, words).toFixed(2)}/1k\n`);
  }
  process.stdout.write("  NOTE: Chekhov is the only CORRESPONDENCE here, and the only abridged\n"
    + "  selection. Genre and edition are confounded with author; this table shows\n"
    + "  Chekhov is an outlier, not why.\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(GUTENBERG)) {
    process.stderr.write(`corpus not found at ${GUTENBERG}\n`);
    process.exit(2);
  }
  const all = readdirSync(GUTENBERG).filter((f) => /^chekhov-.*\.txt$/.test(f)).map((f) => f.slice(0, -4)).sort();
  report("ALL CHEKHOV IN CORPUS", all);
  const m = report("THE 10 S2 FIXTURE LETTERS", FIXTURE_LETTERS);
  crossAuthor();
  process.stdout.write("\nOne example of each class, from the fixture letters:\n");
  for (const [cls, ex] of Object.entries(m.examples)) {
    process.stdout.write(`  [${cls}] ${ex.letter}\n      …${ex.before} <<${ex.glyph}>> ${ex.after}…\n`);
  }
  process.stdout.write("\nFinding: bundles/prose-review/tests/runs/2026-08-07-fu6-chekhov-ellipsis.md\n");
}
