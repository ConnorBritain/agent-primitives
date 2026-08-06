#!/usr/bin/env node
/**
 * stats — what is actually in the corpus, per author and per register.
 *
 *   node tests/corpus/stats.mjs
 *   node tests/corpus/stats.mjs --json
 *
 * WHY THIS EXISTS. Corpus figures were being hand-copied into prose - "230
 * samples across four writers", per-author word counts - and hand-copied
 * figures go stale on the next fetch without anything failing. This repo has
 * an incident log full of exactly that. Any count stated in a doc should be
 * the output of this script, quoted with the command, or phrased as a range.
 *
 * It counts what is ON DISK, not what a manifest claims. selftest.mjs already
 * fails the build when those two disagree; this script's job is to be the
 * cheap, re-runnable answer to "how much of what do we have", which is the
 * question that decides whether the next corpus addition is worth doing.
 *
 * It never fetches. The corpus is committed.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Each bucket declares whether it is single-author, because that is the fact
 * that decides what the samples may be used for. A multi-author bucket can
 * support register coverage and cannot support a voice or authorship claim,
 * however many samples it holds.
 */
const BUCKETS = [
  { dir: "human-essays/gutenberg", single_author: true, note: "Project Gutenberg, public domain" },
  { dir: "human-essays/pluralistic", single_author: true, note: "pluralistic.net, CC-BY 4.0" },
  { dir: "human-professional", single_author: false, note: "EFF Deeplinks, CC-BY 4.0" },
  { dir: "human", single_author: false, note: "Wikipedia, CC BY-SA 4.0" },
  { dir: "ai", single_author: false, note: "Wikipedia AI-writing examples, CC BY-SA 4.0" },
];

/** The floor below which calibrate.mjs will not learn a cadence from a sample. */
const SINGLE_AUTHOR_SAMPLE_FLOOR = 15;

function frontmatterField(raw, field) {
  const m = raw.match(new RegExp(`^${field}:[ \\t]*(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

function readBucket(bucket) {
  const dir = join(HERE, bucket.dir);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));
  const authors = new Map();
  for (const f of files) {
    const raw = readFileSync(join(dir, f), "utf8");
    // Unattributed samples are counted under "(unattributed)" rather than
    // dropped. A sample with no author is a provenance defect, and hiding it
    // in a total is how the defect survives.
    const author = frontmatterField(raw, "author") || "(unattributed)";
    const date = frontmatterField(raw, "date") || "";
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
    const words = body.split(/\s+/).filter(Boolean).length;
    const a = authors.get(author) ?? { author, samples: 0, words: 0, dates: new Set() };
    a.samples += 1;
    a.words += words;
    if (date) a.dates.add(date.slice(0, 4));
    authors.set(author, a);
  }
  return { ...bucket, files: files.length, authors: [...authors.values()] };
}

const buckets = BUCKETS.map(readBucket).filter(Boolean);

/**
 * The cross-author pair count is the reason "a new author beats more samples
 * of an existing one" is an argument rather than a preference: usable pairs
 * grow as n(n-1) in authors and not at all in samples per author. Only
 * single-author buckets contribute, and only authors at or above the sample
 * floor - an author with three samples cannot anchor a same-author control.
 */
const voiceAuthors = buckets
  .filter((b) => b.single_author)
  .flatMap((b) => b.authors)
  .filter((a) => a.samples >= SINGLE_AUTHOR_SAMPLE_FLOOR);
const n = voiceAuthors.length;
const pairs = n * (n - 1);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({
    buckets: buckets.map((b) => ({
      ...b,
      authors: b.authors.map((a) => ({ ...a, dates: [...a.dates].sort() })),
    })),
    voice_authors: n,
    cross_author_pairs: pairs,
  }, null, 2)}\n`);
} else {
  for (const b of buckets) {
    process.stdout.write(
      `\n${b.dir}  —  ${b.single_author ? "SINGLE-author" : "MULTI-author"}  (${b.note})\n`,
    );
    const rows = [...b.authors].sort((x, y) => y.samples - x.samples);
    if (b.single_author) {
      for (const a of rows) {
        const years = [...a.dates].sort();
        const span = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : (years[0] ?? "");
        process.stdout.write(
          `  ${a.author.padEnd(20)}${String(a.samples).padStart(5)} samples`
          + `${String(a.words).padStart(9)} words   ${span}\n`,
        );
      }
    } else {
      // Listing 27 EFF bylines would bury the only fact that matters about a
      // multi-author bucket: that no one of them is a usable voice.
      //
      // Byline-less buckets are reported as byline-less rather than collapsed
      // into "1 author". Wikipedia articles carry no `author:` field because
      // each has many editors; printing that as one author with 12 samples
      // would read as the exact opposite of the truth.
      const named = rows.filter((a) => a.author !== "(unattributed)");
      const anon = rows.find((a) => a.author === "(unattributed)");
      const max = named.length ? Math.max(...named.map((a) => a.samples)) : 0;
      const who = named.length
        ? `${named.length} named authors; largest single author: ${max} samples`
        : "no bylines (many editors per sample)";
      process.stdout.write(
        `  ${String(b.files).padStart(3)} samples,`
        + ` ${rows.reduce((s, a) => s + a.words, 0)} words; ${who}`
        + `${named.length && anon ? `; ${anon.samples} unattributed` : ""}\n`,
      );
    }
  }
  process.stdout.write(
    `\n${n} authors clear the ${SINGLE_AUTHOR_SAMPLE_FLOOR}-sample floor`
    + ` → ${pairs} ordered cross-author pairs for the voice test.\n\n`,
  );
}
