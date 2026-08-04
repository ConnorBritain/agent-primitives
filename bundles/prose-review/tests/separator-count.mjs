#!/usr/bin/env node
/**
 * separator-count — re-derives the bio-list separator figures.
 *
 *   node tests/separator-count.mjs
 *
 * WHY THIS FILE EXISTS. The 2026-08-04 harness run published "kenyatta 37/2,
 * ahmadu-bello 0/77, lagos 0/93" as the spot-check backing a critic finding.
 * Those numbers came from a shell command typed once and never saved. A reviewer
 * trying to reproduce them got 20-49 and 0-19 depending on where they drew the
 * section boundary — the qualitative claim held, the exact figures did not.
 *
 * That is the seventh time in this project a number reached a document before a
 * method existed to re-derive it, and it is the same shape every time: the
 * arithmetic was fine, the SETUP was unstated. An unstated setup produces a
 * plausible number that survives review until somebody independently re-derives
 * it. See CALIBRATION.md.
 *
 * WHAT COUNTS, stated so it can be disagreed with. A bio-list entry is a line
 * beginning with a capitalised name followed by a separator and a description.
 * Only ` - ` and `, ` are counted. Prose sentences are excluded by requiring the
 * line to be short enough not to be one and to lack terminal punctuation.
 *
 * The scope is arguable. That is the point: it is written down, so a
 * disagreement is about the definition rather than about whose grep was right.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, "..", "..", "prose-tell-scan", "tests", "corpus", "human");

// A name: 1-4 capitalised words, allowing internal apostrophes and hyphens.
const NAME = String.raw`[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){0,3}`;
const DASH = new RegExp(String.raw`^${NAME}\s+[-–—]\s+\S`, "u");
const COMMA = new RegExp(String.raw`^${NAME},\s+\S`, "u");

// A list entry, not a sentence: short, and not ending in a full stop.
const isEntry = (l) => l.length <= 160 && !/[.!?]$/.test(l.trim());

function count(file) {
  const raw = readFileSync(join(CORPUS, file), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
  let dash = 0;
  let comma = 0;
  for (const line of raw.split("\n")) {
    const l = line.trim();
    if (!l || !isEntry(l)) continue;
    if (DASH.test(l)) dash += 1;
    else if (COMMA.test(l)) comma += 1;
  }
  return { dash, comma };
}

let files;
try {
  files = readdirSync(CORPUS).filter((f) => f.endsWith(".txt")).sort();
} catch {
  process.stderr.write(`\n  no corpus at ${CORPUS}\n  Run from a full checkout.\n\n`);
  process.exit(1);
}

process.stdout.write("\nbio-list entries by separator\n\n");
process.stdout.write(`  ${"document".padEnd(34)}${"dash".padStart(6)}${"comma".padStart(8)}\n`);
const rows = files.map((f) => ({ f, ...count(f) }));
for (const { f, dash, comma } of rows) {
  process.stdout.write(`  ${f.replace(/\.txt$/, "").padEnd(34)}${String(dash).padStart(6)}${String(comma).padStart(8)}\n`);
}

const dashy = rows.filter((r) => r.dash > r.comma);
process.stdout.write(
  `\n  ${dashy.length} of ${rows.length} documents are dash-dominant`
  + (dashy.length ? `: ${dashy.map((r) => r.f.replace(/\.txt$/, "")).join(", ")}` : "")
  + "\n\n  The finding this backs was that one document separates bio-list entries\n"
  + "  differently from the rest. That difference is real and is not about voice:\n"
  + "  a separator changes with a template or an editor. See DESIGN.md.\n\n",
);
