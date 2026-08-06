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

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

import { maskNonProse, normaliseApostrophes, paragraphs, words } from "./lib/text.mjs";
import { cadenceMetrics, CALIBRATED_METRICS, percentile } from "./lib/cadence.mjs";
import { scanCatalog } from "./lib/scan.mjs";
import {
  loadProfile, profileSearchPath, findProfileDir, listProfiles, BASE_PROFILE,
} from "./lib/profile.mjs";
import { CORPUS_MINIMUM, CORPUS_THIN, corpusConfidence } from "./lib/evaluate.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/**
 * Exported for the same reason as MIN_SAMPLE_WORDS: prose-author ports the file
 * walk and needs something to be pinned against. A corpus sample this set
 * accepts and the port does not is a file calibration measures and drafting
 * never sees - the two disagreeing about what the corpus contains.
 */
export const TEXT_EXT = new Set([".md", ".markdown", ".txt", ".mdx"]);

/**
 * Below this, a sample is too short to say anything about a rhythm.
 *
 * Exported because prose-author PORTS this rule rather than importing it (a hard
 * cross-bundle import would make that bundle unloadable without this one), and a
 * port needs something to be pinned against. Its contract test asserts parity
 * with this constant, so changing it here fails there.
 */
export const MIN_SAMPLE_WORDS = 200;

/**
 * Approved-corpus cap defaults, exported for the same reason as MIN_SAMPLE_WORDS
 * and enforced identically in both bundles.
 *
 * `DEFAULT_CAP` is the fraction of the blended pool that approved samples may
 * occupy before their weights get scaled down. `CAP_CLAMP` is the hard ceiling
 * on any requested cap - a corpus where the model is the majority voice is not
 * a setting anyone means to choose, so it cannot be expressed. Config file
 * cannot argue with a number in the source.
 */
export const DEFAULT_CAP = 0.2;
export const CAP_CLAMP = 0.5;

const USAGE = `
calibrate — derive register thresholds from a profile's human corpus

  node calibrate.mjs <profile> [--write]
  node calibrate.mjs --all [--write]

Options
  --write               Write thresholds.derived.json. Without it, dry run.
  --group <name>        Calibrate only one named group within the register.
                        Groups are subdirectories of corpus/human/ - a voice the
                        author names, such as newsletter or longform. Without
                        this, every group and every ungrouped sample is pooled.
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

/**
 * Corpus files, and the named groups they may sit in.
 *
 * A subdirectory of `corpus/human/` is a GROUP: a voice the author names, inside
 * a register. `newsletter/`, `longform/`, `talks/`. Files sitting directly in
 * `corpus/human/` are ungrouped and belong to the register as a whole.
 *
 * Why groups exist at all: a register is chosen by the tool from a path rule or
 * frontmatter, and it governs thresholds. A group is chosen by the AUTHOR,
 * because "essay" is often several voices wearing one label, and only they know
 * where the seams are. Date is one way to cut a corpus and usually not the
 * interesting one — "the newsletter voice" is a distinction a timestamp cannot
 * express.
 *
 * One level deep, deliberately. Nested groups invite a taxonomy, and a taxonomy
 * invites maintaining it.
 */
export function corpusFiles(dir, { group = null } = {}) {
  if (!existsSync(dir)) return [];
  const textIn = (d, groupName) => readdirSync(d)
    .filter((f) => TEXT_EXT.has(extname(f).toLowerCase()))
    .filter((f) => !/^readme\b/i.test(f))
    .map((f) => ({ path: join(d, f), group: groupName }))
    .filter((e) => statSync(e.path).isFile());

  if (group) {
    const sub = join(dir, group);
    return existsSync(sub) ? textIn(sub, group) : [];
  }
  const subdirs = readdirSync(dir)
    .map((f) => ({ name: f, full: join(dir, f) }))
    .filter((e) => statSync(e.full).isDirectory() && !e.name.startsWith("."));
  return [...textIn(dir, null), ...subdirs.flatMap((d) => textIn(d.full, d.name))];
}

/** Group names present in a register's corpus. */
export function corpusGroups(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith(".") && statSync(join(dir, f)).isDirectory())
    .filter((g) => corpusFiles(dir, { group: g }).length > 0)
    .sort();
}

/**
 * Read `edit_fraction` from a frontmatter block. Returns null for anything the
 * value cannot honestly be trusted to describe: no block, no field, unparseable
 * number, out of [0,1]. Called by measureApproved BEFORE any counting so a
 * malformed sample never enters the pool with weight 1 by default.
 *
 * The strict reading is deliberate. PROFILES.md rule 1 says the number is
 * COMPUTED by ingest, never written by hand - so a missing or malformed value is
 * evidence something bypassed ingest, and that sample is not evidence about a
 * person. Exclude rather than salvage.
 */
export function readEditFraction(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return null;
  const hit = m[1].match(/^\s*edit_fraction\s*:\s*([0-9.]+)\s*$/m);
  if (!hit) return null;
  const n = Number.parseFloat(hit[1]);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return n;
}

/**
 * Measure one corpus sample the same way tell-scan measures a draft.
 *
 * `checkProvenance` defaults true because the human corpus MUST attest -
 * missing the check is how AI-assisted drafts silently become the definition of
 * "human". Approved samples require a DIFFERENT frontmatter (human_authored:
 * false + edit_fraction), so the caller checks that separately and passes false
 * here to skip the human-attestation gate.
 */
function measure(path, profile, { checkProvenance = true } = {}) {
  const raw = readFileSync(path, "utf8");
  let prov = { source: null, date: null };
  if (checkProvenance) {
    const p = readProvenance(raw);
    if (!p.ok) return { path, excluded: p.reason };
    prov = p;
  }

  const markdown = extname(path).toLowerCase() !== ".txt";
  const { text } = maskNonProse(raw, { markdown });
  const paras = paragraphs(text, { markdown });
  const wordCount = words(text).length;
  if (wordCount < MIN_SAMPLE_WORDS) return { path, excluded: `too short (${wordCount} words)` };

  const cadence = cadenceMetrics(text, paras);
  // Fold apostrophes exactly as tell-scan does. If calibration measured the
  // unfolded form, a corpus written with curly apostrophes would yield lower
  // densities than the scans it is meant to be the baseline for, and every
  // affected entry would sit under a ceiling derived from a different rule.
  const { findings } = scanCatalog(normaliseApostrophes(text), profile.catalog, profile.allow);

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

/**
 * Read the approved corpus if there is one, and if the human corpus is large
 * enough to bootstrap it.
 *
 * RULE 4 (PROFILES.md, absolute): below CORPUS_MINIMUM human samples, approved
 * contributes ZERO no matter how many there are. The cold-start path this
 * blocks is: fill approved/ with model output, calibrate against model norms on
 * day one, never notice.
 *
 * SAMPLES WITHOUT `edit_fraction` ARE EXCLUDED, not defaulted. A missing number
 * where the schema demands a computed one is evidence something bypassed
 * ingest; giving that sample weight 1 or weight 0.5 would be inventing data.
 *
 * Return shape mirrors human samples so bandsFrom can process both uniformly,
 * plus `edit_fraction` on each entry for weighting.
 */
function readApproved(dir, profile, humanCount) {
  const out = { samples: [], excluded: [], suppressed: false };
  const approvedDir = join(dir, "corpus", "approved");
  if (!existsSync(approvedDir)) return out;

  if (humanCount < CORPUS_MINIMUM) {
    // The suppression itself is loud: the caller reports it. Silence here would
    // let a user fill approved/ during cold start and never see why nothing
    // changed.
    out.suppressed = true;
    out.reason = `human corpus has ${humanCount} samples; ${CORPUS_MINIMUM} needed before approved/ counts`;
    return out;
  }

  for (const entry of corpusFiles(approvedDir)) {
    const raw = readFileSync(entry.path, "utf8");
    const ef = readEditFraction(raw);
    if (ef === null) {
      out.excluded.push({ path: entry.path, reason: "missing or malformed edit_fraction" });
      continue;
    }
    // Provenance was checked above (edit_fraction present + in range). Skip the
    // human-attestation gate: approved samples are human_authored: false by
    // definition, and the strict check would exclude every one of them.
    const m = measure(entry.path, profile, { checkProvenance: false });
    if (m.excluded) { out.excluded.push({ path: entry.path, reason: m.excluded }); continue; }
    out.samples.push({ ...m, group: entry.group, edit_fraction: ef });
  }
  return out;
}

/**
 * Apply the aggregate cap and return per-sample applied weights.
 *
 * Raw weight per sample is edit_fraction (rule 2, PROFILES.md). We measure
 * INFLUENCE as weighted word share of the blended pool, and the cap constrains
 * that share:
 *
 *   Σ(w × words) / (human_words + Σ(w × words))  ≤  cap
 *
 * If the raw weights already satisfy that, they pass through unchanged. If not,
 * every approved weight scales down by a single common factor:
 *
 *   scale = cap × human_words / ( (1 - cap) × Σ(ef × words) )
 *
 * derived by setting the inequality to equality and solving. A single common
 * factor rather than per-sample tuning: rule 2 asks for proportional scaling,
 * not for redistributing influence among approved samples.
 */
function capApproved({ samples, humanWords, cap }) {
  const capped = Math.min(Math.max(cap, 0), CAP_CLAMP - Number.EPSILON);
  const raw = samples.reduce((a, s) => a + s.edit_fraction * s.words, 0);
  if (raw === 0 || humanWords === 0) {
    return { scale: 1, cap_applied: capped, capped: false, share: 0 };
  }
  // Solve inequality raw × scale / (H + raw × scale) ≤ cap. Threshold scale.
  const maxScale = (capped * humanWords) / ((1 - capped) * raw);
  const scale = Math.min(1, maxScale);
  const applied = raw * scale;
  return {
    scale,
    cap_applied: capped,
    capped: scale < 1,
    share: applied / (humanWords + applied),
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

  // PER-ENTRY RATES, retained rather than discarded.
  //
  // `pooled` is computed above and was collapsed into severity-band ceilings,
  // throwing away the one number an author most wants: how often THEY use a
  // given construction. Keeping it costs nothing and is what lets a report say
  // "you use `underscore` 0.2x/1k; this draft is 1.4x/1k" instead of comparing
  // a draft against a ceiling derived from a severity class.
  //
  // Entries the corpus never contains are absent rather than zero. A zero here
  // would read as "this author never does this", which is a claim about the
  // author; absence reads as "the corpus does not say", which is the truth.
  const entry_rates = {};
  for (const [id, e] of pooled) {
    entry_rates[id] = {
      per_1k: round((1000 * e.count) / totalWords),
      count: e.count,
      severity: e.severity,
      in_samples: samples.filter((s) => s.entries.some((x) => x.id === id)).length,
    };
  }

  return { metrics, catalog_density, aggregate_density, entry_rates, pooled_words: totalWords };
}

/**
 * Catalog density on the BLENDED pool (rule 3: cadence bands are human-only, no
 * exception).
 *
 * Each approved sample contributes `applied_weight × count` to entry counts and
 * `applied_weight × words` to total words. That is linear scaling of both sides
 * of the per-1k rate, giving each sample less influence on the pooled ceiling
 * than a human sample of the same length - which is what "one you rewrote two
 * thirds of contributes about two thirds of a human sample" means.
 *
 * WHY THE CADENCE FIREWALL. A generation's rhythm was right when it matched the
 * human corpus that set the band. Including it lets a good generation confirm
 * the ceiling that judged it good, tightening the band around a self-referential
 * fixed point. The catalog side does not have this problem in the same shape -
 * a construction is either present or absent, and blending changes rates not
 * variance.
 */
function blendedDensity(humanSamples, approved, weights) {
  const humanWords = humanSamples.reduce((a, s) => a + s.words, 0);
  const approvedWords = approved.reduce((a, s) => a + s.edit_fraction * weights.scale * s.words, 0);
  const totalWords = humanWords + approvedWords || 1;

  const pooled = new Map();
  for (const s of humanSamples) {
    for (const e of s.entries) {
      const prev = pooled.get(e.id) || { severity: e.severity, count: 0 };
      prev.count += e.count;
      pooled.set(e.id, prev);
    }
  }
  for (const s of approved) {
    const w = s.edit_fraction * weights.scale;
    for (const e of s.entries) {
      const prev = pooled.get(e.id) || { severity: e.severity, count: 0 };
      prev.count += w * e.count;
      pooled.set(e.id, prev);
    }
  }

  const density = {};
  for (const [sev, label] of [[3, "high"], [2, "medium"], [1, "low"]]) {
    const rates = [...pooled.values()]
      .filter((e) => e.severity === sev)
      .map((e) => round((e.count * 1000) / totalWords))
      .sort((a, b) => a - b);
    if (rates.length) density[label] = round(percentile(rates, 90));
  }
  return { density, blended_words: totalWords };
}

/**
 * A blended ceiling that narrows the human one meaningfully is a warning, not
 * a footnote (PROFILES.md rule 5). "Meaningfully" is 20% - loose enough to
 * ignore rounding, tight enough that a real narrowing shows up before the
 * bands start passing prose the human corpus would have caught.
 *
 * The direction that matters is narrowing, not widening: widening bands are
 * more permissive and cannot mask a real problem. Narrowing bands can.
 */
function narrowingWarning(human, blended) {
  const changes = [];
  for (const label of ["high", "medium", "low"]) {
    const h = human[label];
    const b = blended[label];
    if (typeof h !== "number" || typeof b !== "number" || h === 0) continue;
    if (b < 0.8 * h) {
      changes.push(`${label} ${h} -> ${b} (${Math.round(100 * (1 - b / h))}% tighter)`);
    }
  }
  if (!changes.length) return null;
  return `blending approved/ narrowed catalog-density ceilings: ${changes.join("; ")}. `
    + "This is the shape of voice collapse. Check whether the approved samples are near-verbatim generations rather than genuinely edited ones - if they are, they belong out of the pool, not weighted down.";
}

/**
 * Is this corpus one voice or several?
 *
 * A corpus that mixes two voices produces bands describing neither — wide enough
 * that every draft falls "within range", so the tool goes quiet and looks like it
 * is working. Silent uselessness is the worst outcome available here, because
 * nothing in the output announces it.
 *
 * This does not resolve the split. It reports it and asks, because the author
 * knows which voice they meant and the tool cannot. Where the author has already
 * named groups, it also says whether the measured clusters AGREE with that
 * naming — clusters that cut across the author's own folders are the interesting
 * case, and the one worth a sentence.
 *
 * Method: one-dimensional two-means on the metric with the clearest separation.
 * Deliberately crude. Anything more would invite treating the output as a
 * finding rather than a prompt.
 */
function detectClusters(samples, metricKey = "mean_len") {
  const pts = samples
    .map((s) => ({ v: s.cadence[metricKey], group: s.group, file: s.path.split("/").pop() }))
    .filter((p) => typeof p.v === "number")
    .sort((a, b) => a.v - b.v);
  if (pts.length < 6) return null;

  // Best split: the one minimising total within-cluster spread.
  let best = null;
  for (let i = 1; i < pts.length; i += 1) {
    const lo = pts.slice(0, i).map((p) => p.v);
    const hi = pts.slice(i).map((p) => p.v);
    if (lo.length < 2 || hi.length < 2) continue;
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const ss = (a) => { const m = mean(a); return a.reduce((x, y) => x + (y - m) ** 2, 0); };
    const total = ss(lo) + ss(hi);
    if (!best || total < best.total) {
      best = { total, i, loMean: round(mean(lo)), hiMean: round(mean(hi)), lo: pts.slice(0, i), hi: pts.slice(i) };
    }
  }
  if (!best) return null;

  // SEPARATION IS A GAP, NOT A DIFFERENCE OF MEANS.
  //
  // The first version of this compared cluster means against the total spread,
  // and flagged a single-voice corpus. It had to: split any sorted data near the
  // middle and the two means sit far apart as a fraction of the range —
  // uniformly distributed values score 0.5 by construction. It was measuring
  // "was this split in the middle", not "are there two groups".
  //
  // What distinguishes two voices from one wide one is a VOID between them. So:
  // the distance from the top of the lower cluster to the bottom of the upper,
  // measured in within-cluster standard deviations. Contiguous data has no gap
  // however far apart its means are.
  const loVals = best.lo.map((p) => p.v);
  const hiVals = best.hi.map((p) => p.v);
  const gap = Math.min(...hiVals) - Math.max(...loVals);
  const overallMean = pts.reduce((a, p) => a + p.v, 0) / pts.length || 1;
  // Distance between the clusters as a fraction of typical value. This is the
  // measure that answers the question actually being asked — are these two
  // different voices — rather than a measure of how cleanly they separate.
  const separation = round(gap / overallMean);

  // Both conditions, and each rules out a different wrong answer.
  //
  // A real void (gap > 0) rules out one wide cluster split down the middle. The
  // first version of this used difference-of-means over total spread, which
  // flags uniformly distributed values by construction: split any sorted data
  // near the middle and the two means sit half a range apart.
  //
  // And the void has to MATTER. Sentence-length means of 574 and 588 are
  // perfectly separated and are obviously one voice. Without this second test
  // the check reports a 2% difference with the same confidence as a 5x one.
  if (gap <= 0 || separation < 0.15) return null;

  const groupsOf = (side) => [...new Set(side.map((p) => p.group ?? "(ungrouped)"))].sort();
  const loGroups = groupsOf(best.lo);
  const hiGroups = groupsOf(best.hi);
  const aligned = loGroups.length === 1 && hiGroups.length === 1 && loGroups[0] !== hiGroups[0];

  return {
    metric: metricKey,
    separation: round(separation),
    clusters: [
      { n: best.lo.length, mean: best.loMean, groups: loGroups },
      { n: best.hi.length, mean: best.hiMean, groups: hiGroups },
    ],
    aligned_with_named_groups: aligned,
    note: aligned
      ? "The two clusters match the author's own groups. Calibrate each with --group; "
        + "pooling them produces bands that describe neither."
      : "The corpus splits into two clusters that do NOT follow the named groups (or none "
        + "are named). Whichever voice a draft is meant to be in, pooled bands will be too "
        + "wide to say anything about it. Consider naming groups that match how you actually write.",
  };
}

const round = (n) => Math.round(n * 1000) / 1000;

function calibrate(name, searchPath, { write, group = null, cap = DEFAULT_CAP }) {
  const dir = findProfileDir(name, searchPath);
  if (!dir) return { profile: name, error: `profile "${name}" not found` };

  const profile = loadProfile(name, searchPath);
  const humanDir = join(dir, "corpus", "human");
  const files = corpusFiles(humanDir, { group });
  const measured = files.map((f) => ({ ...measure(f.path, profile), group: f.group }));
  const usable = measured.filter((m) => !m.excluded);
  const excluded = measured.filter((m) => m.excluded);

  const confidence = corpusConfidence(usable.length);
  const result = {
    profile: name,
    dir,
    corpus_dir: humanDir,
    group,
    groups_available: corpusGroups(humanDir),
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

  const { metrics, catalog_density, aggregate_density, entry_rates, pooled_words } = bandsFrom(usable);
  // Only meaningful when pooling. Asking whether ONE named group is internally
  // multimodal is a different and much weaker question.
  result.clusters = group ? null : detectClusters(usable);

  // BLENDED PASS. Approved samples participate only when there is enough human
  // corpus to bootstrap them, only in catalog density (never cadence), and only
  // under the aggregate cap. Both bands ship - user reads both, always.
  const approved = group ? { samples: [], excluded: [], suppressed: false } : readApproved(dir, profile, usable.length);
  const weights = capApproved({ samples: approved.samples, humanWords: pooled_words, cap });
  const blend = approved.samples.length > 0
    ? blendedDensity(usable, approved.samples, weights)
    : null;
  const blendedWarning = blend ? narrowingWarning(catalog_density, blend.density) : null;
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
    // Human-only and blended reported SIDE BY SIDE. A consumer picks which one
    // to use with eyes open, and drift between them is visible.
    catalog_density_blended: blend ? blend.density : null,
    aggregate_density,
    entry_rates,
    // The approved half, recorded for auditability. `raw_weighted_words` is
    // Σ(ef × words) before capping; `applied_weighted_words` after. Their ratio
    // is the scale. Reader can reproduce every number in `catalog_density_blended`
    // from these plus the samples list.
    approved: {
      samples_used: approved.samples.length,
      suppressed: approved.suppressed,
      suppression_reason: approved.reason || null,
      excluded: approved.excluded.map((e) => ({ file: e.path.split("/").pop(), reason: e.reason })),
      cap_requested: cap,
      cap_applied: weights.cap_applied,
      cap_clamp: CAP_CLAMP,
      capped: weights.capped,
      scale: round(weights.scale),
      share_of_blended_pool: round(weights.share),
      raw_weighted_words: round(approved.samples.reduce((a, s) => a + s.edit_fraction * s.words, 0)),
      applied_weighted_words: round(approved.samples.reduce((a, s) => a + s.edit_fraction * weights.scale * s.words, 0)),
      blended_words: blend ? blend.blended_words : null,
      samples: approved.samples.map((s) => ({
        file: s.path.split("/").pop(),
        words: s.words,
        edit_fraction: s.edit_fraction,
        applied_weight: round(s.edit_fraction * weights.scale),
      })),
    },
    blended_warning: blendedWarning,
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
  const blended = r.derived.catalog_density_blended;
  const approvedInfo = r.derived.approved || {};
  for (const [k, v] of Object.entries(r.derived.catalog_density)) {
    // Human column always shown; blended shown when there is one, so the reader
    // sees both without a flag (PROFILES.md rule 5).
    if (blended && k in blended) {
      out.push(`    ${k.padEnd(28)} human ${String(v).padEnd(6)} blended ${blended[k]}`);
    } else {
      out.push(`    ${k.padEnd(28)} ${v}`);
    }
  }

  if (approvedInfo.suppressed) {
    out.push("");
    out.push(`  approved/ present but suppressed: ${approvedInfo.suppression_reason}`);
  } else if (approvedInfo.samples_used > 0) {
    out.push("");
    const capNote = approvedInfo.capped
      ? `applied ${(approvedInfo.share_of_blended_pool * 100).toFixed(1)}% of blended pool (cap ${approvedInfo.cap_applied}, scaled x${approvedInfo.scale})`
      : `${(approvedInfo.share_of_blended_pool * 100).toFixed(1)}% of blended pool, under cap ${approvedInfo.cap_applied}`;
    out.push(`  approved: ${approvedInfo.samples_used} sample(s), ${capNote}`);
  }

  if (r.derived.blended_warning) {
    out.push("");
    out.push(`  ⚠  ${wrapText(r.derived.blended_warning, 72, "     ")}`);
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
    else if (a === "--group") opts.group = argv[++i];
    else if (a === "--cap") opts.cap = Number.parseFloat(argv[++i]);
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

  const results = names.map((n) => calibrate(n, searchPath, {
    write: opts.write, group: opts.group, cap: opts.cap ?? DEFAULT_CAP,
  }));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify({ tool: "calibrate", version: "0.1.0", results }, null, 2)}\n`);
    return;
  }
  for (const r of results) process.stdout.write(`${render(r)}\n`);
  process.stdout.write("\n");
}

// Run only when invoked directly, so this module can be imported.
//
// This file previously ended in a bare `main();`, so importing it RAN THE CLI -
// printing usage and exiting inside whatever imported it. That is why nothing
// could reuse these functions, and why prose-author's contract test could not
// pin its port against them until this guard existed.
//
// realpathSync on both sides, not `import.meta.url === \`file://${argv[1]}\``:
// import.meta.url is resolved and argv[1] is not, so the naive form silently
// does nothing when the path contains a symlink. On macOS /tmp is one. (That
// bug was real in prose-author's two tools, which DID have the naive guard;
// these four had no guard at all.)
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
