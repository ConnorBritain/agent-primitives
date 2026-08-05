#!/usr/bin/env node
/**
 * fetch-essays — vendor a public-domain essay corpus from Project Gutenberg.
 *
 *   node tests/corpus/fetch-essays.mjs              # dry run
 *   node tests/corpus/fetch-essays.mjs --write      # fetch + split + write
 *
 * Run this rarely, exactly like fetch-corpus.mjs. The essays are COMMITTED,
 * and the committed copy is what critics run against - a test that needs the
 * network is a test that gets skipped, and a skipped test is the same outcome
 * as not having one.
 *
 * ============================================================================
 * WHY THIS CORPUS EXISTS
 * ============================================================================
 *
 * The sibling `human/` directory holds Wikipedia articles. That is a real
 * corpus with real provenance, but every sample sits in one register - flat
 * encyclopedic prose written by many editors over years. The voice critic's
 * acceptance harness runs against it and the run log records the limit
 * unprompted: this is register, not authorship.
 *
 * The critics still to build - substance, adversarial-reader, fidelity - all
 * want prose that MAKES AN ARGUMENT in a recognisable individual voice, and
 * the Wikipedia corpus has neither. This directory unblocks those tests with
 * public-domain essay collections by named writers with distinctive prose:
 *
 *   Francis Bacon (1625): Bacon's Essays. 59 short essays, iconic voice,
 *     argumentative in miniature. The extreme case of "does this critic see a
 *     voice at all" - if it does not fire on Bacon vs anyone else, it never
 *     will.
 *
 *   G.K. Chesterton (1909): Tremendous Trifles. 39 medium essays, opinionated
 *     first-person voice, discursive.
 *
 * Both are public domain. See LICENSE for the rules on adding more.
 *
 * ============================================================================
 * LICENSING - read before adding a source
 * ============================================================================
 *
 * Only public-domain or CC-BY / CC0 sources. NOT contemporary journalism (with
 * the exception of specific outlets that publish under CC-BY, like eff.org),
 * NOT private writing, NOT anything scraped from a Substack or a Medium post
 * without the author's explicit permissive license.
 *
 * Fetched texts have PG's own boilerplate stripped so the vendored file does
 * NOT carry the Project Gutenberg trademark on the essay text itself. The
 * frontmatter names PG as the source; that is a factual attribution, not a
 * license claim.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "human-essays", "gutenberg");
const ATTR_PATH = join(HERE, "human-essays", "ATTRIBUTION.json");

/**
 * Each source names the Gutenberg id, a slug prefix for filenames, the
 * heading regex that finds essay boundaries in the plain-text edition, and a
 * `keep` predicate for skipping non-essay entries (prefaces, notes, indexes).
 *
 * Adding a new author means finding its heading pattern in the PG text - do
 * this by hand and verify against the essay COUNT before running --write.
 * A regex that finds 20 headings when the book has 59 essays would silently
 * concatenate them; the count check is the guard.
 */
const SOURCES = [
  {
    id: "56463",
    author: "Francis Bacon",
    author_slug: "bacon",
    title: "Bacon's Essays and Wisdom of the Ancients",
    date: "1625",
    // "I.—OF TRUTH." with the em-dash Project Gutenberg uses. The essay count
    // this must find is 58 (Bacon added one after the first edition; PG's
    // edition includes it). Captures the whole title including "OF" so the
    // frontmatter reads "Of Truth" rather than "Truth"; slugify() handles the
    // filename.
    heading: /^([IVXLC]+)\.—([^\n]+?)\.?\s*$/gm,
    expected_essays: 58,
    // Where the essays end. After LVIII the numbering restarts at I with the
    // "Wisdom of the Ancients" fragments - not the same corpus, different form,
    // and confusing to blend. Cut before them.
    stop_at: /^I\.—A FRAGMENT OF AN ESSAY/m,
    // Some entries in the ToC pattern-match but are NOT stand-alone essays we
    // want. The predicate runs against the extracted title. Return false to
    // skip.
    keep: (title) => !/^(THE PROJECT|FRAGMENT|APPENDIX)/i.test(title),
  },
  {
    id: "8092",
    author: "G. K. Chesterton",
    author_slug: "chesterton",
    title: "Tremendous Trifles",
    date: "1909",
    // "I. Tremendous Trifles" — no em dash, title-cased. Uses [ \t]+ rather
    // than \s+ so a stray "C.\n\nIt seems..." in-essay dropcap (Chesterton
    // essay XI does this once) does NOT match by crossing the paragraph break.
    heading: /^([IVXLC]+)\.[ \t]+([A-Z][^\n]{2,80})$/gm,
    expected_essays: 39,
    stop_at: null,
    keep: () => true,
  },
  {
    // Chekhov's Letters. The CORRESPONDENCE register - addressee-focused,
    // direct, informal - which is genuinely different from the essays above
    // and the encyclopedia articles in the sibling corpus. Distinct voice too:
    // an author writing TO someone in particular reads different from the
    // same author writing for an audience.
    id: "6408",
    author: "Anton Chekhov",
    author_slug: "chekhov",
    title: "Letters of Anton Chekhov to his Family and Friends",
    date: "1920",  // Garnett translation release; the letters span 1876-1904.
    // Each letter starts "TO <recipient>." on its own line. Captures the full
    // "TO ..." so the frontmatter reads "To N. A. Leikin" instead of the
    // fragment "N. A. Leikin". `number` becomes sequential (recipients
    // repeat); `title` captures the To-line, which slugifies to
    // "to-n-a-leikin" for the filename.
    heading: /^(TO [^\n]+?)\.$/gm,
    expected_essays: 154,
    // No stop marker - the whole file after the intro is letters.
    stop_at: null,
    // Letters below the calibration floor (200 words) are the bulk of the
    // material near the end. Keep only substantive ones so calibration would
    // actually include them.
    min_body_words: 200,
    numbered_filename: true,
    keep: () => true,
  },
];

async function fetchText(id) {
  const url = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

/**
 * Strip the Project Gutenberg START/END markers and everything outside them.
 * The vendored text carries no PG legal boilerplate; the frontmatter records
 * the source as a fact.
 */
function stripBoilerplate(raw) {
  const start = raw.indexOf("*** START OF");
  const end = raw.indexOf("*** END OF");
  if (start === -1 || end === -1) throw new Error("PG START/END markers missing");
  const afterStart = raw.indexOf("\n", start) + 1;
  return raw.slice(afterStart, end).trim();
}

/**
 * Find every heading in `text` and cut the body into essays. The heading regex
 * is per-source. Each essay's body is `text` from the heading up to the next
 * heading (or the stop-at line for the last one).
 *
 * WHY WE COUNT. A regex that matches too greedily (e.g. section headers inside
 * an essay) produces short essays with the real content concatenated into the
 * previous one. A regex that matches too little produces one huge essay. Both
 * are silent failures. Comparing the match count to `expected_essays` catches
 * either without needing to open the vendored files.
 */
function splitEssays(text, source) {
  const stripped = source.stop_at
    ? text.slice(0, (text.match(source.stop_at)?.index) ?? text.length)
    : text;

  const matches = [];
  let m;
  const rx = new RegExp(source.heading.source, source.heading.flags);
  let seq = 0;
  while ((m = rx.exec(stripped)) !== null) {
    seq += 1;
    // Sources with a single capture group (Chekhov: "TO <recipient>.") get a
    // sequential number and the capture becomes the title. Sources with two
    // (Bacon/Chesterton: "I.—OF TRUTH.") use the first as number and second
    // as title. The distinction lives here rather than in every source, so
    // adding a one-capture source only needs a regex and an expected count.
    const single = m[2] === undefined;
    matches.push({
      index: m.index,
      end: m.index + m[0].length,
      number: single ? String(seq) : m[1],
      title: single ? m[1].trim() : m[2].trim(),
    });
  }

  if (matches.length === 0) {
    throw new Error(`${source.author_slug}: heading regex matched nothing`);
  }
  if (matches.length !== source.expected_essays) {
    throw new Error(
      `${source.author_slug}: heading regex matched ${matches.length}, expected ${source.expected_essays}. `
      + "The regex or the corpus has changed. Fix one, do not silently accept the other.",
    );
  }

  const essays = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].end;
    const next = i + 1 < matches.length ? matches[i + 1].index : stripped.length;
    const body = stripped.slice(start, next).trim();
    if (!source.keep(matches[i].title)) continue;
    const clean = cleanBody(body);
    // `min_body_words` (per source) filters out samples too short to teach a
    // rhythm. Chekhov's letters run from telegram to essay length, and the
    // very short ones would flood the corpus with noise while carrying almost
    // no voice signal.
    if (source.min_body_words && clean.split(/\s+/).filter(Boolean).length < source.min_body_words) continue;
    essays.push({
      number: matches[i].number,
      title: titleCase(matches[i].title),
      body: clean,
    });
  }
  return essays;
}

/**
 * Best-effort textual cleanup. Strip footnote reference tags like [42] from the
 * body but leave the words intact. Strip trailing footnote blocks (a run of
 * lines beginning with "[NN]"). Preserve paragraph breaks; do NOT reflow lines,
 * since word-count-based metrics care about the actual token stream.
 */
function cleanBody(body) {
  // Trailing footnote block: consecutive lines starting with "[NN]" at the end.
  const lines = body.split("\n");
  let cutFrom = lines.length;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (/^\[\d+\]/.test(line)) { cutFrom = i; continue; }
    // Keep multi-line footnote continuations only if a footnote opener sits
    // just above them. Otherwise this is essay text and we stop cutting.
    if (cutFrom < lines.length && line.startsWith(" ")) { cutFrom = i; continue; }
    break;
  }
  const trimmed = lines.slice(0, cutFrom).join("\n").trim();
  // Inline footnote refs [42] → "": these are metadata, not prose the author
  // wrote. Leaving them in inflates word counts and gives cadence metrics an
  // odd token to trip on.
  return trimmed.replace(/\[\d+\]/g, "").trim();
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/**
 * Bacon's essay titles are ALL CAPS in the PG plain-text edition ("OF TRUTH");
 * Chesterton's are already Title Case ("Tremendous Trifles"). Normalise both
 * to Title Case so the frontmatter reads naturally regardless of source. The
 * word-list below is what convention keeps lowercase in English titles.
 */
const TITLE_LOWERS = new Set(["of", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "by", "with"]);
function titleCase(s) {
  const words = s.trim().toLowerCase().split(/\s+/);
  return words.map((w, i) => (i > 0 && TITLE_LOWERS.has(w))
    ? w
    : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

async function main() {
  const write = process.argv.includes("--write");

  const plan = [];
  for (const source of SOURCES) {
    process.stdout.write(`  fetching PG ${source.id} (${source.author})...\n`);
    const raw = await fetchText(source.id);
    const stripped = stripBoilerplate(raw);
    const essays = splitEssays(stripped, source);
    process.stdout.write(`    ${essays.length} essays\n`);
    for (const essay of essays) {
      // Chekhov's letters share recipients (many to Suvorin), so slug-alone
      // collides. `numbered_filename: true` on a source prepends the zero-
      // padded sequence number to keep filenames unique and sortable-by-order.
      // Bacon/Chesterton skip this since each title is unique.
      const slug = slugify(essay.title) || "untitled";
      const file = source.numbered_filename
        ? `${source.author_slug}-${essay.number.padStart(3, "0")}-${slug}.txt`
        : `${source.author_slug}-${slug}.txt`;
      plan.push({
        source,
        essay,
        file,
        path: join(OUT, file),
        words: wordCount(essay.body),
      });
    }
  }

  process.stdout.write(`\n  total: ${plan.length} essays\n`);
  const tooShort = plan.filter((p) => p.words < 200);
  if (tooShort.length) {
    process.stdout.write(`  ${tooShort.length} below the 200-word floor (excluded from calibration):\n`);
    for (const p of tooShort) process.stdout.write(`    ${p.file} (${p.words} words)\n`);
  }

  if (!write) {
    process.stdout.write("\n  dry run - pass --write to save\n");
    return;
  }

  if (existsSync(OUT)) {
    // Rebuild rather than merge - the fetcher is authoritative for what lives
    // here. Files added by hand would silently outlast a re-fetch and drift.
    for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
  } else {
    mkdirSync(OUT, { recursive: true });
  }

  const attribution = { license: "public domain (see LICENSE)", generated: new Date().toISOString().slice(0, 10), essays: [] };
  for (const p of plan) {
    const frontmatter = [
      "---",
      `source: Project Gutenberg ${p.source.id}`,
      `title: ${p.essay.title}`,
      `author: ${p.source.author}`,
      `date: ${p.source.date}`,
      "human_authored: true",
      "license: public-domain",
      "---",
      "",
    ].join("\n");
    writeFileSync(p.path, frontmatter + p.essay.body + "\n");
    attribution.essays.push({
      file: `gutenberg/${p.file}`,
      author: p.source.author,
      title: p.essay.title,
      source: "Project Gutenberg",
      source_id: p.source.id,
      collection: p.source.title,
      collection_date: p.source.date,
      permalink: `https://www.gutenberg.org/ebooks/${p.source.id}`,
      words: p.words,
    });
  }
  writeFileSync(ATTR_PATH, `${JSON.stringify(attribution, null, 2)}\n`);

  process.stdout.write(`\n  wrote ${plan.length} essays to ${OUT}\n`);
  process.stdout.write(`  wrote ${ATTR_PATH}\n\n`);
}

main().catch((err) => {
  process.stderr.write(`fetch-essays: ${err.message}\n`);
  process.exit(1);
});
