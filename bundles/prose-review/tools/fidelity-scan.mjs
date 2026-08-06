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
 * WHAT IT CANNOT SEE, which is a different statement and the more dangerous one.
 * Single-word named entities, word-form numbers ("thirteen", "a dozen"), and
 * every fact carried by phrasing rather than by a token - hedges, scope limits,
 * polarity - are outside extraction entirely. A FAITHFUL verdict is therefore a
 * statement about the atoms listed, never about the revision. `coverageNote`
 * prints this on every pair for exactly that reason: the report used to close
 * by pronouncing heading changes informational on documents that contain no
 * headings, which is a clean bill of health for a check that never ran.
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
 *
 * A QUOTE MAY SPAN A LINE BREAK, and this is not a detail. Every corpus file
 * here is hard-wrapped, so on the Bacon essay the newline-free version saw 4
 * of 10 quoted spans - the tool reported "quotes preserved" over six it had
 * never looked at. What a quote may NOT span is a blank line: a paragraph
 * break inside a quotation means an unclosed quote somewhere, and letting the
 * match run past it turns one stray delimiter into a page-long "quote".
 *
 * OPENERS AND CLOSERS ARE PAIRED. An earlier version accepted either curly
 * closer for either curly opener. That was harmless only while quotes could
 * not cross a newline: U+2019 is also the apostrophe, so a multi-line
 * "..." quote containing "finger's end" would have been truncated at the
 * apostrophe and stored as a mangled atom that no revision could match.
 */
const NO_BLANK_LINE = String.raw`\n(?![ \t]*\n)`;
const STRAIGHT_QUOTE = new RegExp(String.raw`"((?:[^"\n]|${NO_BLANK_LINE}){6,}?)"`, "g");
const CURLY_QUOTE = new RegExp(
  String.raw`\u201C((?:[^\u201D\n]|${NO_BLANK_LINE}){6,}?)\u201D` +
  String.raw`|\u2018((?:[^\u2019\n]|${NO_BLANK_LINE}){6,}?)\u2019`,
  "g",
);

/**
 * Proper-noun run: two or more capitalised words, INCLUDING those at sentence
 * start (a proper noun in that position is still a proper noun). Filter later
 * for sentence-initial single-word matches that are just "The" or "A".
 *
 * Deliberately conservative on single names - one-word proper nouns are hard
 * to distinguish from sentence starts without POS tagging, and a false-positive
 * PropN tag on every "The" would drown the real signal. That reasoning was
 * tested rather than trusted; see SINGLE-WORD ENTITIES below.
 *
 * LETTERS ARE UNICODE, not `[A-Z][a-z]+`. "Augustus C\u00E6sar" was never extracted
 * at all under the ASCII form - not truncated to "Augustus", not flagged,
 * simply absent - so a revision could drop it and the scan would report every
 * atom present. Any corpus with a diacritic in a name had a hole in it the
 * report did not mention.
 */
const CAP_WORD = String.raw`\p{Lu}\p{Ll}+`;
/**
 * `\b` is ASCII even under the `u` flag - `\w` is `[A-Za-z0-9_]` - so `\b\p{Lu}`
 * finds no boundary before "Émile" and the whole Unicode fix would have been
 * dead on arrival, in the silent direction: fewer atoms, no error. The word
 * edges are therefore spelled out.
 */
const EDGE_L = String.raw`(?<![\p{L}\p{N}_])`;
const EDGE_R = String.raw`(?![\p{L}\p{N}_])`;
const PROPER_NOUN_RUN = new RegExp(
  `${EDGE_L}${CAP_WORD}(?:[ \\t]+(?:of|the|de|van|von|and|for)[ \\t]+|[ \\t]+)${CAP_WORD}(?:[ \\t]+${CAP_WORD})*${EDGE_R}`,
  "gu",
);

/**
 * SINGLE-WORD ENTITIES: a documented limit, kept after measuring it, and the
 * original argument for keeping it turned out to be the wrong argument.
 *
 * `PROPER_NOUN_RUN` needs two capitalised words, so *Suvorin*, *Levitan*,
 * *Fourmis* and *Salon* are invisible to it. The comment above defended that
 * by saying the alternative "would tag every 'The'". That is NOT what happens -
 * a function-word stoplist excludes "The" trivially - so the claim was measured
 * instead of inherited.
 *
 * THE REASON TO DECLINE IS THE CONTRACT, not noise volume and not damage to any
 * verdict. `prose-fidelity-critic` is told the scan is authoritative on
 * presence, and that it may not fold a disputed atom into a finding - it must
 * file the atom under *Scanner defects*. A candidate list that is roughly half
 * ordinary capitalised English does not cost the critic a little precision; it
 * makes the authority claim false, and pushes work into `contradicts_scan`, the
 * count that blocks the primitive when non-zero.
 *
 * THE NUMBERS BEHIND "ROUGHLY HALF" ARE NOT REPEATED HERE, and that is
 * deliberate: a measurement restated in three files is a measurement that drifts
 * in two of them. They live in one place, as executable assertions -
 * `tests/single-word-survey.mjs` enumerates and `tests/selftest.mjs` asserts.
 * Re-run the suite to see them; overturn this decision by changing them.
 *
 * The tool therefore does NOT extract single-word entities, and `coverageNote`
 * SAYS SO on every pair - because the harm this gap actually did was not a
 * missed atom, it was a critic reading "atoms checked, none missing" as
 * coverage.
 */

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
  for (const m of body.matchAll(STRAIGHT_QUOTE)) pushQuote(atoms, m[1]);
  // Two alternations (curly-double, curly-single) means one group is undefined.
  for (const m of body.matchAll(CURLY_QUOTE)) pushQuote(atoms, m[1] ?? m[2]);
  for (const m of body.matchAll(PROPER_NOUN_RUN)) {
    atoms.push({ kind: "proper-noun", source: m[0] });
  }
  for (const m of body.matchAll(HEADING)) {
    atoms.push({ kind: "heading", source: m[1].trim() });
  }

  return dedupe(atoms);
}

/**
 * A quote atom's source is stored whitespace-normalised, because a hard-wrapped
 * quotation and the same quotation re-wrapped are the same quotation. Storing
 * the raw span would make the atom's identity - and so the dedupe key, and so
 * the count the report prints - a function of the original's line width.
 */
function pushQuote(atoms, inner) {
  const source = normaliseQuote(inner ?? "");
  if (source.split(/\s+/).length >= 3) atoms.push({ kind: "quote", source });
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
 * "1234". Every other kind is matched with whitespace collapsed, on BOTH sides.
 *
 * WHY NOT LITERALLY. Proper-noun runs and headings used to be matched with a
 * raw `includes`, which made the false-positive rate a function of line width:
 * `n-beauty-modernised` was flagged for dropping "Edward the Fourth" when the
 * revision says exactly that, wrapped after "Edward the".
 * A tool whose findings change when a file is re-wrapped is a tool a reviewer
 * learns to discount, which costs more than the atoms it catches.
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
    } else {
      // Quotes, proper-noun runs and headings: whitespace-insensitive match.
      present = revNormalised.includes(normaliseQuote(a.source));
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
    out.push(`  ${scan.atoms.length} atoms checked, none material-missing.`);
  } else {
    out.push("  MATERIAL-LOSS means the revision dropped a checkable fact from the original.");
    out.push("  Some of these are intentional (a rewrite may consolidate). The critic that");
    out.push("  reads this deciding which - not the scanner.");
  }
  out.push("");
  out.push(...coverageNote(scan));
  out.push("");
  return out.join("\n");
}

/**
 * WHAT THE SCAN DID NOT LOOK AT, printed on every pair.
 *
 * This block exists because of a specific defect, and the defect was not a
 * missed atom. The report used to close with "Heading changes are
 * informational" on pairs that contain no headings at all - asserting a clean
 * result for a category it had never examined. Two critics caught it
 * independently on one run. It is the same shape as a silently skipped test:
 * indistinguishable, from the outside, from a check that ran and passed.
 *
 * So the rule here is that the report may only make a claim about a category
 * it actually inspected, and must name the categories it cannot inspect at
 * all. A critic reading "none material-missing" as "nothing was lost" is
 * reading a coverage statement the tool is not entitled to make.
 */
function coverageNote(scan) {
  const headings = scan.atoms.filter((a) => a.kind === "heading").length;
  return [
    "  coverage, and the verdict above means nothing without it:",
    headings
      ? `    headings: ${headings} checked. A heading change is informational and never MATERIAL-LOSS.`
      : "    headings: the original has none, so none were checked and nothing is claimed about them.",
    "    NOT extracted, on any pair: single-word named entities (a lone surname or",
    "    place name), word-form numbers (a dozen, half again), and any fact carried",
    "    by phrasing rather than by a token - a hedge, a scope limit, a polarity.",
    "    These are CATEGORIES, not observations about this pair. Their absence from",
    "    this report is not evidence.",
  ];
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
