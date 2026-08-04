#!/usr/bin/env node
/**
 * acceptance — measure the scanner against text it did not come from.
 *
 *   node tests/acceptance.mjs           # gate: fails on regression
 *   node tests/acceptance.mjs --report  # full tables, exits 0 regardless
 *
 * Imported by selftest.mjs, so `node tests/selftest.mjs` runs it too.
 *
 * ============================================================================
 * WHAT THIS IS FOR
 * ============================================================================
 *
 * selftest.mjs asks "does the code do what it says". This asks the harder
 * question: "does what it says mean anything". Those are different, and the
 * difference has already cost this bundle twice — a coverage claim measured
 * against a retyped fixture, and a Tier A entry that could not match a real
 * paste. Both passed every test in selftest.mjs.
 *
 * The corpus is 44 documents nobody here wrote: 32 the Wikipedia community
 * judged AI-written, 12 written by real people before ChatGPT existed. See
 * tests/corpus/fetch-corpus.mjs for provenance and licensing.
 *
 * ============================================================================
 * WHY THIS GATES ON REGRESSION, NOT ON AN ABSOLUTE RATE
 * ============================================================================
 *
 * With 12 human documents, one false positive is 8.3% with a 95% Wilson interval
 * of roughly 1.5–35%. A suite that gated on "FPR must be under 10%" would be
 * asserting a precision it cannot support — the exact overclaiming the catalog's
 * own _about block warns against, committed by the tool's own tests.
 *
 * So: the measured numbers are committed to baseline.json and this fails when
 * they get WORSE. It also prints the interval every run, because a point
 * estimate from n=12 quoted without one is how a number stops being honest.
 *
 * Promote to an absolute gate at ~50 samples per class, not before.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = dirname(HERE);
const SKILL = join(BUNDLE, "skills", "tell-scan");
const SCAN = join(SKILL, "tools", "tell-scan.mjs");
const CORPUS = join(HERE, "corpus");
const BASELINE = join(CORPUS, "baseline.json");

/** The corpus is encyclopedia prose; `technical` is its register. */
const PROFILE = "technical";

export function wilson95(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
}

function scanOne(file) {
  const out = execFileSync("node", [SCAN, file, "--profile", PROFILE, "--json"], { encoding: "utf8" });
  return JSON.parse(out).results[0];
}

function measure(dir) {
  const d = join(CORPUS, dir);
  if (!existsSync(d)) return null;
  const files = readdirSync(d).filter((f) => f.endsWith(".txt")).sort();
  return files.map((f) => {
    const r = scanOne(join(d, f));
    return {
      file: f,
      words: r.summary.words,
      // The tool's own stated threshold for "act on this".
      flagged: r.summary.flagged_categories.length >= 2,
      categories: r.summary.flagged_categories.length,
      tierA: r.findings.some((x) => x.tier === "A" && x.flagged),
      entries: r.findings.filter((x) => x.flagged).map((x) => x.id).sort(),
    };
  });
}

export function runAcceptance({ report = false } = {}) {
  const ai = measure("ai");
  const human = measure("human");
  const results = [];
  const add = (name, ok, detail = "") => results.push({ name, ok, detail });

  if (!ai || !human) {
    add("corpus is present", false,
      "tests/corpus/{ai,human} missing — run: node tests/corpus/fetch-corpus.mjs --write");
    return { results, summary: null };
  }

  const aiFlag = ai.filter((r) => r.flagged).length;
  const humanFlag = human.filter((r) => r.flagged).length;
  const aiTierA = ai.filter((r) => r.tierA).length;
  const humanTierA = human.filter((r) => r.tierA).length;
  const [lo, hi] = wilson95(humanFlag, human.length);

  const summary = {
    profile: PROFILE,
    ai: { n: ai.length, flagged: aiFlag, tierA: aiTierA },
    human: { n: human.length, flagged: humanFlag, tierA: humanTierA },
    recall: aiFlag / ai.length,
    fpr: humanFlag / human.length,
    fpr_ci95: [lo, hi],
  };

  // ---- Gate 0: the corpus is what it claims to be --------------------------
  // Two properties, both previously asserted in prose and neither checked.
  //
  // The first cost an entire corpus. `prop=extracts&revids=<historical id>`
  // returns HTTP 200, echoes the requested revid, and serves the CURRENT page —
  // so the first human corpus here carried 2022 metadata above 2026 text, and
  // "provably predates ChatGPT" was false in every file. fetch-corpus.mjs now
  // proves each sample against its own revision's wikitext and records the
  // result; this asserts the record exists rather than trusting the frontmatter.
  //
  // The second is the held-out split, which was described as enforced while
  // nothing enforced it.
  const attribPath = join(CORPUS, "ATTRIBUTION.json");
  if (!existsSync(attribPath)) {
    add("corpus provenance is recorded", false, "ATTRIBUTION.json missing");
  } else {
    const attrib = JSON.parse(readFileSync(attribPath, "utf8"));
    add(
      "every human sample was verified against its own revision's wikitext",
      attrib.human.length > 0 && attrib.human.every((s) => s.revision_verified),
      attrib.human.filter((s) => !s.revision_verified).map((s) => s.file).join(", ")
        || "re-run fetch-corpus.mjs --write",
    );
    add(
      "every human sample predates ChatGPT's public launch",
      attrib.human.every((s) => s.timestamp < "2022-11-30"),
      attrib.human.filter((s) => s.timestamp >= "2022-11-30").map((s) => s.file).join(", "),
    );
    // Held-out: anything the catalog could have been built from is tuning data.
    // The catalog records when it was extracted; samples postdating that could
    // not have informed it.
    const catalog = JSON.parse(readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"));
    const cutoff = catalog.sources?.["wp-signs"]?.retrieved ?? catalog.generated;
    const heldOut = attrib.ai.filter((s) => s.timestamp.slice(0, 10) > cutoff);
    add(
      `held-out split is real: ${heldOut.length}/${attrib.ai.length} AI samples postdate the catalog (${cutoff})`,
      heldOut.length > 0,
      "if every sample predates the catalog, this measures tuning data and nothing else",
    );
  }

  // ---- Gate 1: Tier A must never fire on provably-human text ---------------
  // The only absolute gate here, and it earns that because the whole basis for
  // Tier A is that it is dispositive on one occurrence. One false positive in
  // this tier devalues every Tier A finding anywhere, so there is no rate to
  // negotiate — it is zero or the tier is a lie.
  add(
    "Tier A: zero artifacts on provably-human text",
    humanTierA === 0,
    humanTierA ? human.filter((r) => r.tierA).map((r) => r.file).join(", ") : "",
  );

  // ---- Gate 2: Tier A must still find artifacts in the AI corpus -----------
  // The paired positive. A tier that never fires is trivially precise.
  //
  // `> 0` is the floor; the real check is against the baseline below. Written
  // as a floor alone this gate was demonstrably useless: blanking
  // `model-markup-artifact` — the strongest signal in the catalog — dropped Tier
  // A from 8/32 to 1/32 and this still reported ok. The baseline recorded the 8
  // and nothing read it back.
  add(
    "Tier A: still finds artifacts in the AI corpus",
    aiTierA > 0,
    `${aiTierA}/${ai.length}`,
  );

  // ---- Gate 3 & 4: regression against the committed baseline ---------------
  if (!existsSync(BASELINE)) {
    add("baseline exists", false, "run with --write-baseline once, then commit it");
  } else {
    const base = JSON.parse(readFileSync(BASELINE, "utf8"));
    add(
      `false-positive rate has not worsened (${humanFlag}/${human.length} vs baseline ${base.human.flagged}/${base.human.n})`,
      humanFlag <= base.human.flagged,
      "a rise here means the catalog started firing on real human writing",
    );
    add(
      `recall has not worsened (${aiFlag}/${ai.length} vs baseline ${base.ai.flagged}/${base.ai.n})`,
      aiFlag >= base.ai.flagged,
      "a fall here means a tightening cost real detections — check it was deliberate",
    );
    // Tier A separately, because it is where the tool's actual discriminating
    // power lives and a drop there is invisible in the category-flag rate: a
    // document can lose its artifact hit and still flag on style, or never have
    // flagged at all. Folding the two together is how the strongest signal in
    // the catalog could break with every gate green.
    add(
      `Tier A recall has not worsened (${aiTierA}/${ai.length} vs baseline ${base.ai.tierA}/${base.ai.n})`,
      aiTierA >= base.ai.tierA,
      "the artifact tier is the highest-precision half of this tool — a fall is a real loss",
    );
    add(
      `Tier A false positives have not appeared (${humanTierA} vs baseline ${base.human.tierA})`,
      humanTierA <= base.human.tierA,
      "any rise breaks the tier's dispositive claim",
    );
    // Per-document regression: which specific human documents flag.
    const wasClean = new Set(base.human.flaggedFiles ?? []);
    const nowFlagged = human.filter((r) => r.flagged).map((r) => r.file);
    const newly = nowFlagged.filter((f) => !wasClean.has(f));
    add(
      "no human document newly flags",
      newly.length === 0,
      newly.join(", "),
    );
  }

  if (report) {
    const pct = (x) => `${(100 * x).toFixed(1)}%`;
    process.stdout.write(`\nprofile: ${PROFILE}   (both corpora, so the rates are comparable)\n\n`);
    process.stdout.write(`  AI corpus     n=${ai.length}   flagged ${aiFlag} (${pct(summary.recall)})   Tier A ${aiTierA}\n`);
    process.stdout.write(`  human corpus  n=${human.length}   flagged ${humanFlag} (${pct(summary.fpr)})   Tier A ${humanTierA}\n`);
    process.stdout.write(`  FPR 95% CI    ${pct(lo)} – ${pct(hi)}   <- n=${human.length} cannot resolve this further\n\n`);
    for (const [label, set] of [["AI", ai], ["HUMAN", human]]) {
      process.stdout.write(`  ${label}\n`);
      for (const r of set.slice().sort((a, b) => b.categories - a.categories)) {
        process.stdout.write(
          `    ${r.flagged ? "FLAG" : "    "} ${r.tierA ? "[A]" : "   "} ${String(r.categories)}c ${String(r.words).padStart(5)}w  ${r.file.replace(/\.txt$/, "").slice(0, 36).padEnd(36)} ${r.entries.slice(0, 3).join(",")}\n`,
        );
      }
      process.stdout.write("\n");
    }
  }

  return { results, summary, detail: { ai, human } };
}

// ---- CLI -------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith("acceptance.mjs")) {
  const report = process.argv.includes("--report");
  const { results, summary, detail } = runAcceptance({ report });

  if (process.argv.includes("--write-baseline")) {
    if (!summary) { process.stderr.write("no corpus; nothing to baseline\n"); process.exit(1); }
    const out = {
      _about: [
        "Measured, not chosen. Regenerate deliberately and review the diff: this file is",
        "what stops a tightening from silently costing detections, or a widening from",
        "silently costing precision. Raising a number here to make a run pass is the",
        "same act as weakening an assertion.",
      ],
      profile: PROFILE,
      measured: new Date().toISOString().slice(0, 10),
      catalog_version: JSON.parse(
        readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"),
      ).version,
      ai: { n: detail.ai.length, flagged: summary.ai.flagged, tierA: summary.ai.tierA },
      human: {
        n: detail.human.length, flagged: summary.human.flagged, tierA: summary.human.tierA,
        flaggedFiles: detail.human.filter((r) => r.flagged).map((r) => r.file),
      },
    };
    writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
    process.stdout.write(`wrote ${BASELINE}\n`);
    process.exit(0);
  }

  let failed = 0;
  for (const r of results) {
    process.stdout.write(`  ${r.ok ? "ok  " : "FAIL"} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ""}\n`);
    if (!r.ok) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}
