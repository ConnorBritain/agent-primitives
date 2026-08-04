#!/usr/bin/env node
/**
 * genre-check — what the acceptance corpus can and cannot exercise.
 *
 *   node tests/genre-check.mjs
 *
 * This exists because DESIGN.md cites specific per-1000-word figures to justify
 * blocking two critics, and a figure nobody can re-derive is a figure nobody can
 * challenge. Every other quantitative claim in this project is backed by a script;
 * these were not, until this file.
 *
 * WHAT IT ANSWERS. Two critics — prose-substance-critic and
 * prose-adversarial-reader — judge argument. The corpus is encyclopedia prose.
 * If the human half contains no arguments, then "this claim is unsupported" and
 * "what is the strongest objection to this thesis" are questions about something
 * that is not there, and neither critic can be measured on it.
 *
 * AND IT NAMES A TRAP. First person runs far higher in the AI half, which looks
 * like a signal. It is almost certainly genre: that half includes talk-page
 * comments and drafts, which are first-person by construction, while the human
 * half is pure article namespace. The script prints both so the confound stays
 * visible rather than becoming a discovery.
 *
 * These are crude lexical proxies, not measurements of argument. They are enough
 * to establish absence, which is all the claim needs.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, "..", "..", "prose-tell-scan", "tests", "corpus");

const PROBES = {
  "argumentative moves": /\b(?:argues?|contends?|claims? that|suggests? that|it follows|therefore|however|nevertheless|by contrast)\b/gi,
  "first person": /\b(?:I|we|our|my)\b/g,
  "thesis statements": /\b(?:this (?:essay|piece|article|post) (?:argues|shows|claims)|the case for|why .{0,25} matters|my argument is)\b/gi,
};

function measure(dir) {
  const files = readdirSync(join(CORPUS, dir)).filter((f) => f.endsWith(".txt"));
  const totals = Object.fromEntries(Object.keys(PROBES).map((k) => [k, 0]));
  let words = 0;
  for (const f of files) {
    // Strip provenance frontmatter: it is metadata, not prose.
    const raw = readFileSync(join(CORPUS, dir, f), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
    words += raw.split(/\s+/).filter(Boolean).length;
    for (const [k, re] of Object.entries(PROBES)) {
      totals[k] += (raw.match(re) ?? []).length;
    }
  }
  return { n: files.length, words, totals };
}

const human = measure("human");
const ai = measure("ai");
const per1k = (t, w) => Math.round((1000 * t) / w * 100) / 100;

process.stdout.write("\nper 1000 words\n\n");
process.stdout.write(`  ${"".padEnd(22)}${"human".padStart(8)}${"AI".padStart(10)}\n`);
for (const k of Object.keys(PROBES)) {
  const h = per1k(human.totals[k], human.words);
  const a = per1k(ai.totals[k], ai.words);
  process.stdout.write(`  ${k.padEnd(22)}${String(h).padStart(8)}${String(a).padStart(10)}\n`);
}
process.stdout.write(`\n  corpora: human n=${human.n} (${human.words} words), AI n=${ai.n} (${ai.words} words)\n`);

const thesis = per1k(human.totals["thesis statements"], human.words);
process.stdout.write(
  thesis === 0
    ? "\n  ZERO thesis markers in the human corpus. The argument critics cannot be\n"
      + "  measured on it — the thing they look for is not present to be found.\n"
    : `\n  ${thesis}/1k thesis markers in the human corpus.\n`,
);

const fpRatio = per1k(ai.totals["first person"], ai.words)
  / (per1k(human.totals["first person"], human.words) || 1);
process.stdout.write(
  `\n  First person runs ${Math.round(fpRatio * 10) / 10}x higher in the AI half. Do not read this as a\n`
  + "  signal: that half includes talk-page comments and drafts, which are\n"
  + "  first-person by genre, while the human half is pure article namespace.\n"
  + "  A corpus artifact, not a discovery.\n\n",
);
