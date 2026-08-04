#!/usr/bin/env node
/**
 * calibrate — derive a profile's thresholds from its human corpus.
 *
 *   node calibrate.mjs essay                 # report what would be derived
 *   node calibrate.mjs essay --write         # write thresholds.derived.json
 *   node calibrate.mjs --all --write
 *
 * The load-bearing design decision of the profile system: thresholds are
 * MEASURED, never hand-written. A hand-set threshold is somebody's guess at what
 * normal looks like. A derived one encodes what this author's good writing in
 * this register actually looks like — which is the only baseline that can tell
 * "flat rhythm" apart from "correctly flat technical reference".
 *
 * Two refusals are built in, and both matter more than the happy path:
 *
 *   1. THIN CORPUS. Below a floor, this writes nothing and says why. Percentile
 *      bands off four samples are noise wearing a lab coat.
 *
 *   2. NO PROVENANCE, NO VOTE. Every sample must carry an explicit
 *      human-authored attestation. The slow death of this system is AI-assisted
 *      drafts leaking into the human corpus: thresholds drift toward AI norms,
 *      the scanner goes progressively blind, and nothing in the output announces
 *      it is happening. An attestation is cheap; going blind is not.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

import { maskNonProse, paragraphs, words } from "./lib/text.mjs";
import { cadenceMetrics, CALIBRATED_METRICS, percentile } from "./lib/cadence.mjs";
import { scanCatalog } from "./lib/scan.mjs";
import {
  loadProfile, profileSearchPath, findProfileDir, listProfiles, BASE_PROFILE,
} from "./lib/profile.mjs";
import { CORPUS_MINIMUM, CORPUS_THIN, corpusConfidence } from "./lib/evaluate.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_EXT = new Set([".md", ".markdown", ".txt", ".mdx"]);

const USAGE = `
calibrate — derive register thresholds from a profile's human corpus

  node calibrate.mjs <profile> [--write]
  node calibrate.mjs --all [--write]

Options
  --write               Write thresholds.derived.json. Without it, dry run.
  --profiles-dir <dir>  Search here first.
  --project <dir>       Project root. Default: cwd.
  --all                 Every discoverable profile except _base.
  --json                Machine-readable output.
  -h, --help            This text.

A sample counts toward calibration only if it carries provenance frontmatter:

  ---
  source: where it came from
  date: 2024-03-11
  human_authored: true
  ---

Samples without that attestation are listed and excluded. This is the guard
against AI-assisted drafts silently becoming the definition of "human".
`;

/**
 * Parse provenance frontmatter.
 *
 * Deliberately strict. A sample that fails any check is excluded rather than
 * downweighted, because a corpus that is 80% attested and 20% unknown is a
 * corpus nobody can reason about.
 */
export function readProvenance(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return { ok: false, reason: "no frontmatter block" };

  const block = m[1];
  const field = (name) => {
    const hit = block.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+?)\\s*$`, "m"));
    return hit ? hit[1].replace(/^["']|["']$/g, "") : null;
  };

  const attested = field("human_authored");
  if (attested === null) return { ok: false, reason: "no human_authored field" };
  if (!/^(true|yes)$/i.test(attested)) {
    return { ok: false, reason: `human_authored is "${attested}"` };
  }
  const source = field("source");
  if (!source) return { ok: false, reason: "no source field" };
  const date = field("date");
  if (!date) return { ok: false, reason: "no date field" };

  return { ok: true, source, date, body: text.slice(m[0].length) };
}

function corpusFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => TEXT_EXT.has(extname(f).toLowerCase()))
    .filter((f) => !/^readme\b/i.test(f))
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile());
}

/** Measure one corpus sample the same way tell-scan measures a draft. */
function measure(path, profile) {
  const raw = readFileSync(path, "utf8");
  const prov = readProvenance(raw);
  if (!prov.ok) return { path, excluded: prov.reason };

  const markdown = extname(path).toLowerCase() !== ".txt";
  const { text } = maskNonProse(raw, { markdown });
  const paras = paragraphs(text, { markdown });
  const wordCount = words(text).length;
  if (wordCount < 200) return { path, excluded: `too short (${wordCount} words)` };

  const cadence = cadenceMetrics(text, paras);
  const { findings } = scanCatalog(text, profile.catalog, profile.allow);

  // Two different densities, because the scanner asks two different questions.
  //
  //   entries[]  — each catalog entry's own density. This derives the PER-ENTRY
  //                ceiling that flags an individual overused word, which is the
  //                actionable unit: "you wrote 'actually' eight times".
  //   aggregate  — total density at each severity, for the summary line.
  //
  // Keeping these straight matters: an earlier draft derived one and compared
  // against the other, which made every ceiling silently too generous.
  const aggregate = { 3: 0, 2: 0, 1: 0 };
  for (const f of findings) aggregate[f.severity] = (aggregate[f.severity] || 0) + f.per_1k;

  return {
    path, source: prov.source, date: prov.date, words: wordCount, cadence,
    // Raw counts travel alongside the per-sample rate, because the corpus-wide
    // ceiling is pooled rather than averaged. See bandsFrom().
    entries: findings.map((f) => ({
      id: f.id, severity: f.severity, per_1k: f.per_1k, count: f.count,
    })),
    aggregate,
  };
}

function bandsFrom(samples) {
  const metrics = {};
  for (const { key } of CALIBRATED_METRICS) {
    const values = samples.map((s) => s.cadence[key]).filter((v) => typeof v === "number");
    if (values.length < 2) continue;
    const sorted = [...values].sort((a, b) => a - b);
    metrics[key] = {
      p10: round(percentile(sorted, 10)),
      p50: round(percentile(sorted, 50)),
      p90: round(percentile(sorted, 90)),
    };
  }

  // Per-entry ceilings, computed on the POOLED corpus rather than averaged over
  // per-sample rates.
  //
  // Averaging per-sample densities was the first implementation and it was
  // wrong in a way worth recording: density is unstable at short lengths, so a
  // single hit in a 300-word sample reads as 3.3 per 1000, and the p90 across
  // samples inherits that noise. Calibrating on a dozen short samples produced
  // a severity-1 ceiling of 4.27 — loose enough that a draft with "actually"
  // eight times passed clean. The scanner has a min-count floor for exactly
  // this reason; the calibrator needs the same defence, and pooling is it.
  //
  // Pooled: total occurrences of an entry across the whole corpus, over total
  // corpus words. Long samples pull proportionally harder, which is correct —
  // they are more evidence.
  const totalWords = samples.reduce((a, s) => a + s.words, 0) || 1;
  const pooled = new Map();
  for (const s of samples) {
    for (const e of s.entries) {
      const prev = pooled.get(e.id) || { severity: e.severity, count: 0 };
      prev.count += e.count;
      pooled.set(e.id, prev);
    }
  }

  const catalog_density = {};
  const aggregate_density = {};
  for (const [sev, label] of [[3, "high"], [2, "medium"], [1, "low"]]) {
    // Entries that never fire anywhere in the corpus are excluded rather than
    // counted as zero: including them drags the p90 to zero and produces a
    // ceiling that flags any word the corpus happens not to contain, which is
    // most words in the language.
    const rates = [...pooled.values()]
      .filter((e) => e.severity === sev)
      .map((e) => round((e.count * 1000) / totalWords))
      .sort((a, b) => a - b);
    if (rates.length) catalog_density[label] = round(percentile(rates, 90));

    const totals = samples.map((s) => s.aggregate[sev] || 0).sort((a, b) => a - b);
    aggregate_density[label] = round(percentile(totals, 90));
  }

  return { metrics, catalog_density, aggregate_density, pooled_words: totalWords };
}

const round = (n) => Math.round(n * 1000) / 1000;

function calibrate(name, searchPath, { write }) {
  const dir = findProfileDir(name, searchPath);
  if (!dir) return { profile: name, error: `profile "${name}" not found` };

  const profile = loadProfile(name, searchPath);
  const files = corpusFiles(join(dir, "corpus", "human"));
  const measured = files.map((f) => measure(f, profile));
  const usable = measured.filter((m) => !m.excluded);
  const excluded = measured.filter((m) => m.excluded);

  const confidence = corpusConfidence(usable.length);
  const result = {
    profile: name,
    dir,
    corpus_dir: join(dir, "corpus", "human"),
    files_found: files.length,
    samples_used: usable.length,
    excluded: excluded.map((e) => ({ file: e.path, reason: e.excluded })),
    confidence,
    written: false,
  };

  if (usable.length < CORPUS_THIN) {
    result.refused =
      `Refusing to derive thresholds from ${usable.length} sample(s). ` +
      `Percentile bands need at least ${CORPUS_THIN} to mean anything, and ` +
      `${CORPUS_MINIMUM} before they should be trusted. This profile will keep ` +
      `using UNCALIBRATED fallbacks, and tell-scan will say so on every run.`;
    return result;
  }

  const { metrics, catalog_density, aggregate_density, pooled_words } = bandsFrom(usable);
  const derived = {
    profile: name,
    derived_from: usable.length,
    samples: usable.length,
    corpus_words: pooled_words,
    confidence,
    // No Date.now() call is recorded here beyond the run stamp: thresholds are
    // regenerated whenever the corpus changes, and a stale stamp invites reading
    // an old file as current.
    generated: new Date().toISOString().slice(0, 10),
    // The catalog these bands were measured against. `metrics` (cadence) is pure
    // text statistics and stays valid across catalog releases; `catalog_density`
    // does NOT — it counts entries, so adding or retuning one changes what the
    // band means. Recording the version is what lets a later reader tell which
    // half of this file it may still trust.
    catalog_version: profile.catalog?.version || null,
    corpus: usable.map((s) => ({ file: s.path.split("/").pop(), words: s.words, source: s.source, date: s.date })),
    metrics,
    catalog_density,
    aggregate_density,
  };
  result.derived = derived;

  if (confidence === "thin") {
    result.warning =
      `Derived from ${usable.length} samples — above the floor but below the ` +
      `${CORPUS_MINIMUM} needed for confidence. Bands are provisional and ` +
      `tell-scan will label them thin.`;
  }

  if (write) {
    const out = join(dir, "thresholds.derived.json");
    writeFileSync(out, `${JSON.stringify(derived, null, 2)}\n`);
    result.written = out;
  }
  return result;
}

function render(r) {
  const out = [];
  out.push("");
  out.push(`profile: ${r.profile}`);
  if (r.error) {
    out.push(`  ERROR: ${r.error}`);
    return out.join("\n");
  }
  out.push(`  corpus: ${r.corpus_dir}`);
  out.push(`  files found: ${r.files_found} · usable: ${r.samples_used} · confidence: ${r.confidence}`);

  if (r.excluded.length) {
    out.push(`  EXCLUDED (${r.excluded.length}) — not counted toward calibration:`);
    for (const e of r.excluded) out.push(`    ${e.file.split("/").pop()} — ${e.reason}`);
  }
  if (r.refused) {
    out.push("");
    out.push(`  ⚠  ${wrapText(r.refused, 72, "     ")}`);
    return out.join("\n");
  }
  if (r.warning) {
    out.push("");
    out.push(`  ⚠  ${wrapText(r.warning, 72, "     ")}`);
  }

  out.push("");
  out.push("  derived bands:");
  for (const { key, label } of CALIBRATED_METRICS) {
    const b = r.derived.metrics[key];
    if (b) out.push(`    ${label.padEnd(28)} p10 ${b.p10}  p50 ${b.p50}  p90 ${b.p90}`);
  }
  out.push("  catalog density ceilings (per 1k words):");
  for (const [k, v] of Object.entries(r.derived.catalog_density)) {
    out.push(`    ${k.padEnd(28)} ${v}`);
  }
  out.push("");
  out.push(r.written ? `  wrote ${r.written}` : "  dry run — pass --write to save");
  return out.join("\n");
}

function wrapText(text, width, indent) {
  const words_ = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words_) {
    if (line.length + w.length + 1 > width) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.join(`\n${indent}`);
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { profiles: [], write: false, all: false, json: false,
                 project: process.cwd(), profilesDir: null };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--write") opts.write = true;
    else if (a === "--all") opts.all = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--project") opts.project = resolve(argv[++i]);
    else if (a === "--profiles-dir") opts.profilesDir = argv[++i];
    else if (a === "-h" || a === "--help") { process.stdout.write(USAGE); return; }
    else if (a.startsWith("-")) { process.stderr.write(`unknown option: ${a}\n`); process.exit(2); }
    else opts.profiles.push(a);
  }

  const searchPath = profileSearchPath({
    profilesDir: opts.profilesDir, projectRoot: opts.project, bundleRoot: SKILL_ROOT,
  });

  let names = opts.profiles;
  if (opts.all) names = [...listProfiles(searchPath).keys()].filter((n) => n !== BASE_PROFILE);
  if (!names.length) {
    process.stderr.write(`calibrate: name a profile, or use --all\n${USAGE}`);
    process.exit(2);
  }

  const results = names.map((n) => calibrate(n, searchPath, { write: opts.write }));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ tool: "calibrate", version: "0.1.0", results }, null, 2)}\n`);
    return;
  }
  for (const r of results) process.stdout.write(`${render(r)}\n`);
  process.stdout.write("\n");
}

main();
