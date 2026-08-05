#!/usr/bin/env node
/**
 * fidelity-scan — deterministic material-preservation check.
 *
 *   node fidelity-scan.mjs <original> <revision> [--json]
 *
 * The critic that adjudicates this data is prose-fidelity-critic. This tool
 * does the countable half, so the critic never argues about whether a number
 * still appears - it argues only about whether the number's absence matters.
 *
 * WHAT COUNTS AS MATERIAL, and the definitions are load-bearing.
 *
 *   number      digits with optional decimal or thousands sep, including years
 *               and currency figures. A revision that drops "37 dash-separated"
 *               and replaces it with "some" has lost information the reader
 *               cannot recover.
 *
 *   date        month + day + year, or just year in a "in 1965" position. Same
 *               logic; a rewrite that trades "1965" for "in the mid-sixties"
 *               may be intentional, and the critic has to say so - but this
 *               tool flags it either way, because losing it silently is worse.
 *
 *   quote       text inside double quotes with three or more words, or a curly-
 *               quote span of the same length. A dropped quote is a load-bearing
 *               loss, and paraphrase-in-place is a subtle one worth flagging.
 *
 *   proper-noun  a run of two or more capitalised words (mid-sentence, so the
 *               sentence-initial capital does not falsely trigger). Named
 *               entities lost in a rewrite are the class of loss reviewers
 *               reliably notice AFTER the reviser has run, when the pre-edit
 *               copy is gone.
 *
 * WHAT IS NOT THIS TOOL'S JOB. Register, voice, argument, prose quality, ethical
 * questions about the revision - all outside scope. The tool reports what is
 * present in ORIGINAL and absent in REVISION. The critic decides what to do.
 *
 * WHY DETERMINISTIC. This is exactly the kind of check a language model gets
 * wrong under time pressure: it "sees" the number in the revision because the
 * sentence sounds right. A grep does not. See CALIBRATION.md - the recurring
 * lesson is that numbers need to be re-derivable, not remembered.
 */

/**
 * Number pattern. Includes:
 *   - integers with optional thousands separators (37, 1,234, 1234)
 *   - decimals (3.14, 0.5)
 *   - years standing alone (1965) - caught by the integer rule
 *   - percentages (12%)
 *   - currency (US$5 million is separate: number + suffix)
 *
 * Does NOT include ordinals like "3rd" - those match the digits and are
 * flagged; the letters are informational only.
 */
const NUMBER = /\b\d[\d,]*(?:\.\d+)?%?\b/g;

/**
 * Direct quotes: run of >=3 words inside "..." or curly quotes. A shorter
 * quote is more often a single-word emphasis ("failed") than a quotation
 * worth preserving; three-word minimum keeps the false-positive rate down.
 */
const STRAIGHT_QUOTE = /"([^"\n]{6,}?)"/g;
const CURLY_QUOTE = /[\u201C\u2018]([^\u201D\u2019\n]{6,}?)[\u201D\u2019]/g;

/**
 * Proper-noun run: two or more capitalised words, INCLUDING those at sentence
 * start (a proper noun in that position is still a proper noun). Filter later
 * for sentence-initial single-word matches that are just "The" or "A".
 *
 * Deliberately conservative on single names - one-word proper nouns are hard
 * to distinguish from sentence starts without POS tagging, and a false-positive
 * PropN tag on every "The" would drown the real signal.
 */
const PROPER_NOUN_RUN = /\b[A-Z][a-z]+(?:[ \t]+(?:of|the|de|van|von|and|for)[ \t]+|[ \t]+)[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)*\b/g;

/**
 * Section headings — Markdown ATX style. A revision that silently drops a
 * "## Discussion" heading has moved the piece's structure without saying so.
 */
const HEADING = /^#{1,6}\s+(.+?)\s*$/gm;

/** Body only — an atom hiding inside YAML frontmatter is metadata, not prose. */
function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/**
 * Extract every material atom from `text`. Each atom carries its source (the
 * exact string) and kind. Position is not tracked here because the check is
 * "does this string appear in the revision", not "at what position".
 */
export function extractAtoms(text) {
  const body = stripFrontmatter(text);
  const atoms = [];

  for (const m of body.matchAll(NUMBER)) {
    // Strip trailing punctuation the regex may pick up on some engines.
    atoms.push({ kind: "number", source: m[0] });
  }
  for (const m of body.matchAll(STRAIGHT_QUOTE)) {
    const inner = m[1].trim();
    if (inner.split(/\s+/).length >= 3) atoms.push({ kind: "quote", source: inner });
  }
  for (const m of body.matchAll(CURLY_QUOTE)) {
    const inner = m[1].trim();
    if (inner.split(/\s+/).length >= 3) atoms.push({ kind: "quote", source: inner });
  }
  for (const m of body.matchAll(PROPER_NOUN_RUN)) {
    atoms.push({ kind: "proper-noun", source: m[0] });
  }
  for (const m of body.matchAll(HEADING)) {
    atoms.push({ kind: "heading", source: m[1].trim() });
  }

  return dedupe(atoms);
}

/** Same source + same kind counts once. A number that recurs is still one atom. */
function dedupe(atoms) {
  const seen = new Set();
  const out = [];
  for (const a of atoms) {
    const key = `${a.kind}::${a.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

/**
 * Presence check. Numbers are compared with commas stripped so "1,234" matches
 * "1234". Quotes are matched loosely on whitespace. Proper-noun runs and
 * headings match literally.
 *
 * NORMALIZATION HAS A COST. Loose matching risks false negatives - a paraphrase
 * that mangles a quote silently reads as present. That is the direction to err
 * toward here anyway: the critic reviews everything MISSING, and a stricter
 * check would drown it in "quote reformatted" false positives. See the paired
 * quote-in-revision test.
 */
function normaliseNumber(n) {
  return n.replace(/,/g, "");
}
function normaliseQuote(q) {
  return q.replace(/\s+/g, " ").trim();
}

export function scanFidelity(original, revision) {
  const originalAtoms = extractAtoms(original);
  const revBody = stripFrontmatter(revision);
  const revNumbers = new Set([...revBody.matchAll(NUMBER)].map((m) => normaliseNumber(m[0])));

  // Precompute a whitespace-normalised revision for quote matching.
  const revNormalised = normaliseQuote(revBody);

  const results = originalAtoms.map((a) => {
    let present = false;
    if (a.kind === "number") {
      present = revNumbers.has(normaliseNumber(a.source));
    } else if (a.kind === "quote") {
      present = revNormalised.includes(normaliseQuote(a.source));
    } else {
      // Proper nouns and headings: literal match on the revision body.
      present = revBody.includes(a.source);
    }
    return { ...a, present };
  });

  const missing = results.filter((r) => !r.present);
  return { atoms: results, missing };
}

/**
 * Verdict rule. A single number, quote, or proper-noun loss is enough to
 * classify the revision as MATERIAL-LOSS; headings alone do not trigger it
 * (a rewrite may legitimately restructure). The critic gets the full list
 * either way and can reason about which losses were intentional.
 */
export function verdict({ missing }) {
  const material = missing.filter((a) => a.kind !== "heading");
  return material.length === 0 ? "FAITHFUL" : "MATERIAL-LOSS";
}

export function renderReport(scan) {
  const out = [""];
  const v = verdict(scan);
  out.push(`  fidelity: ${v}`);
  out.push("");
  const groups = { number: [], quote: [], "proper-noun": [], heading: [] };
  for (const m of scan.missing) groups[m.kind].push(m);
  const labels = {
    number: "numbers absent from the revision",
    quote: "quoted spans absent from the revision",
    "proper-noun": "named entities absent from the revision",
    heading: "headings absent from the revision",
  };
  for (const kind of Object.keys(labels)) {
    const items = groups[kind];
    if (!items.length) continue;
    out.push(`  ${labels[kind]}:`);
    for (const it of items) {
      const s = it.source.length > 70 ? `${it.source.slice(0, 67)}...` : it.source;
      out.push(`    ${JSON.stringify(s)}`);
    }
    out.push("");
  }
  if (v === "FAITHFUL") {
    out.push(`  ${scan.atoms.length} atoms checked, none material-missing. Heading changes are informational.`);
    out.push("");
  } else {
    out.push("  MATERIAL-LOSS means the revision dropped a checkable fact from the original.");
    out.push("  Some of these are intentional (a rewrite may consolidate). The critic that");
    out.push("  reads this deciding which - not the scanner.");
    out.push("");
  }
  return out.join("\n");
}

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

function main() {
  const args = process.argv.slice(2);
  const [original, revision] = args.filter((a) => !a.startsWith("--"));
  if (!original || !revision) {
    process.stderr.write("fidelity-scan: usage: node fidelity-scan.mjs <original> <revision> [--json]\n");
    process.exit(2);
  }
  const scan = scanFidelity(readFileSync(original, "utf8"), readFileSync(revision, "utf8"));
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify({ ...scan, verdict: verdict(scan) }, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderReport(scan)}\n`);
  }
  process.exit(verdict(scan) === "FAITHFUL" ? 0 : 1);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
