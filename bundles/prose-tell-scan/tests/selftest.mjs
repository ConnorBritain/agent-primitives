#!/usr/bin/env node
/**
 * selftest — the acceptance criteria, executable.
 *
 *   node tools/selftest.mjs
 *
 * There is no unit test for a prompt, but there is one for a scanner, and this
 * repo's bar for executable code is "test every path" rather than "it looked
 * right". Each case below is one of the brief's acceptance criteria, including
 * the negative ones — false-positive discipline is the criterion most likely to
 * be skipped and the one that decides whether the tool survives contact with
 * real writing.
 *
 * Self-contained: builds its scratch corpora under the OS temp directory and
 * removes them. Touches nothing in the repo.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(HERE, "..");                // bundles/prose-tell-scan
const SKILL = join(BUNDLE, "skills", "tell-scan"); // what actually ships
const REPO = resolve(BUNDLE, "..", "..");                  // repo root, for the FP corpus
const SCAN = join(SKILL, "tools", "tell-scan.mjs");
const CAL = join(SKILL, "tools", "calibrate.mjs");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`);
  }
}

function group(title) {
  process.stdout.write(`\n${title}\n`);
}

function scan(args) {
  const out = execFileSync("node", [SCAN, ...args, "--json"], { encoding: "utf8" });
  return JSON.parse(out);
}

function calibrate(args) {
  const out = execFileSync("node", [CAL, ...args, "--json"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out).results[0];
}

const tmp = mkdtempSync(join(tmpdir(), "tell-scan-selftest-"));

try {
  const before = join(BUNDLE, "fixtures", "script-v1-before.txt");
  const after = join(BUNDLE, "fixtures", "script-v2-after.txt");

  /* ------------------------------------------------------------------ */
  group("Detection — the before-fixture must fire");
  {
    const r = scan([before, "--profile", "narration"]).results[0];
    const flagged = r.findings.filter((f) => f.flagged);
    check("catalog hits found", r.summary.total_hits > 20, `got ${r.summary.total_hits}`);
    // Was >= 3. Lowered to 2 deliberately when `announced-insight` dropped from
    // severity 3 to 2 — the canonical source does not name it, so it lost the
    // severity that let a single occurrence flag. The fixture contains exactly
    // one "here's the thing", and one is genuinely not evidence. The assertion
    // that carries the weight is the intensifier pile-up below, which is the
    // failure this pass exists to catch and which still fires at n=8.
    check("entries flagged", flagged.length >= 2, `got ${flagged.length}`);
    check(
      "the intensifier pile-up is caught",
      flagged.some((f) => f.id === "actually" && f.count >= 8),
      "the tic a self-assessment missed is the one this pass exists for",
    );
    check(
      "more than one category elevated",
      r.summary.flagged_categories.length >= 2,
      `got ${r.summary.flagged_categories.join(",")}`,
    );
  }

  /* ------------------------------------------------------------------ */
  group("False-positive discipline — the after-fixture must go quiet");
  {
    const r = scan([after, "--profile", "narration"]).results[0];
    check(
      "nothing flagged on the author's own revision",
      r.findings.filter((f) => f.flagged).length === 0,
      `flagged ${r.findings.filter((f) => f.flagged).map((f) => f.id).join(",")}`,
    );
    check("no cadence flags either", r.summary.cadence_flags.length === 0);
  }

  group("False-positive discipline — this repo's own docs must go quiet");
  {
    // Well-edited human technical writing. A scanner that fires on these is
    // one that gets uninstalled, which protects nothing.
    for (const doc of ["README.md", "CONTRIBUTING.md", "AGENTS.md", "docs/wiring.md",
                       "docs/portability.md"]) {
      const path = join(REPO, doc);
      const r = scan([path, "--profile", "technical"]).results[0];
      check(
        `${doc} produces no flags`,
        r.findings.filter((f) => f.flagged).length === 0,
        r.findings.filter((f) => f.flagged).map((f) => `${f.id}@${f.per_1k}`).join(","),
      );
    }
  }

  /* ------------------------------------------------------------------ */
  group("Regression — a revision must not introduce new tells");
  {
    const payload = scan([after, "--baseline", before, "--profile", "narration"]);
    const cur = payload.results[0];
    const base = payload.baseline;
    const introduced = cur.findings.filter(
      (f) => !base.findings.some((b) => b.id === f.id),
    );
    check(
      "hits fall sharply",
      cur.summary.total_hits < base.summary.total_hits / 4,
      `${base.summary.total_hits} → ${cur.summary.total_hits}`,
    );
    check("no new pattern introduced", introduced.length === 0,
          introduced.map((f) => f.id).join(","));
  }
  {
    // The inverse: scanning the BEFORE against the AFTER must report regression,
    // or the check is decorative and would never catch a bad revision.
    const payload = scan([before, "--baseline", after, "--profile", "narration"]);
    const introduced = payload.results[0].findings.filter(
      (f) => !payload.baseline.findings.some((b) => b.id === f.id),
    );
    check("regression IS detected when direction is reversed", introduced.length > 0);
  }

  /* ------------------------------------------------------------------ */
  group("Register sensitivity — the same document, two profiles");
  {
    const doc = join(REPO, "CONTRIBUTING.md");
    const essay = scan([doc, "--profile", "essay"]).results[0];
    const technical = scan([doc, "--profile", "technical"]).results[0];
    const differs =
      essay.summary.cadence_flags.length !== technical.summary.cadence_flags.length ||
      essay.summary.held_by_floor !== technical.summary.held_by_floor ||
      essay.profile.allowlist_terms !== technical.profile.allowlist_terms;
    check("findings differ between registers", differs,
          "if they match, the profile system is decorative");
    check(
      "technical tolerates uniform rhythm that essay flags",
      !technical.summary.cadence_flags.includes("longest_uniform_run") &&
        essay.summary.cadence_flags.includes("longest_uniform_run"),
      `essay=[${essay.summary.cadence_flags}] technical=[${technical.summary.cadence_flags}]`,
    );
    check("technical inherits its allowlist", technical.profile.allowlist_terms > 0);
  }

  /* ------------------------------------------------------------------ */
  group("Uncalibrated honesty");
  {
    const r = scan([after, "--profile", "essay"]).results[0];
    check("shipped profiles report as uncalibrated", r.profile.thresholds.derived === false);
    check("threshold confidence is none", r.summary.threshold_confidence === "none");
    check(
      "the reading says so in words",
      /UNCALIBRATED/.test(r.summary.reading),
      "a quiet low-confidence number gets quoted as a measurement",
    );
  }

  /* ------------------------------------------------------------------ */
  group("Corpus refusals");
  {
    const profiles = join(tmp, "profiles");
    mkdirSync(join(profiles, "_base"), { recursive: true });
    cpSync(join(SKILL, "profiles", "_base"), join(profiles, "_base"), { recursive: true });

    const corpus = join(profiles, "reg", "corpus", "human");
    mkdirSync(corpus, { recursive: true });

    // Real prose, chunked, so cadence measurements are meaningful.
    const source = readFileSync(after, "utf8");
    const paras = source.split(/\n\s*\n/).filter((p) => p.trim());
    const chunk = Math.ceil(paras.length / 12);
    const bodies = [];
    for (let i = 0; i < 12; i++) {
      const body = paras.slice(i * chunk, (i + 1) * chunk).join("\n\n");
      if (body.split(/\s+/).length >= 220) bodies.push(body);
    }

    const writeSample = (name, body, frontmatter) =>
      writeFileSync(join(corpus, name), `${frontmatter}\n${body}`);
    const goodFm = (i) =>
      `---\nsource: selftest chunk ${i}\ndate: 2026-01-0${(i % 9) + 1}\nhuman_authored: true\n---\n`;

    // 2 samples → must refuse outright.
    writeSample("a.txt", bodies[0], goodFm(0));
    writeSample("b.txt", bodies[1], goodFm(1));
    let r = calibrate(["reg", "--profiles-dir", profiles]);
    check("refuses to derive from 2 samples", Boolean(r.refused), JSON.stringify(r.confidence));
    check("no thresholds written", r.written === false);

    // Fill out the corpus, then poison three samples' provenance.
    bodies.forEach((b, i) => writeSample(`s${i}.txt`, b, goodFm(i)));
    writeFileSync(join(corpus, "no-frontmatter.txt"), bodies[0]);
    writeSample("not-human.txt", bodies[1], `---\nsource: a model\ndate: 2026-02-02\nhuman_authored: false\n---\n`);
    writeSample("no-source.txt", bodies[2], `---\ndate: 2026-02-02\nhuman_authored: true\n---\n`);

    r = calibrate(["reg", "--profiles-dir", profiles]);
    const reasons = r.excluded.map((e) => e.reason).join(" | ");
    check("unattested samples excluded", r.excluded.length === 3, reasons);
    check("missing frontmatter is named", /no frontmatter/.test(reasons));
    check("human_authored:false is named", /human_authored is "false"/.test(reasons));
    check("missing source is named", /no source/.test(reasons));

    // Write for real, then confirm the scanner picks the derived bands up.
    r = calibrate(["reg", "--profiles-dir", profiles, "--write"]);
    check("derives with a full corpus", Boolean(r.written), r.refused || "");
    check("confidence is calibrated", r.confidence === "calibrated", r.confidence);

    const derived = scan([before, "--profile", "reg", "--profiles-dir", profiles]).results[0];
    check("scanner reports thresholds as derived", derived.profile.thresholds.derived === true);
    check(
      "uncalibrated warning is gone",
      !/UNCALIBRATED/.test(derived.summary.reading),
      derived.summary.reading,
    );
    check(
      "ceilings derived from clean prose still catch the draft",
      derived.findings.filter((f) => f.flagged).length > 0,
      "a corpus of the author's own revision should flag the version it replaced",
    );
    check(
      "pooled ceilings are not inflated by short samples",
      derived.profile.thresholds.catalog_density.low < 2,
      `low ceiling = ${derived.profile.thresholds.catalog_density.low}`,
    );
  }

  /* ------------------------------------------------------------------ */
  group("Masking — code is not prose");
  {
    const doc = join(tmp, "masking.md");
    writeFileSync(
      doc,
      [
        "---", "profile: technical", "---", "",
        "This paragraph is ordinary prose and should be measured.",
        "",
        "```js",
        "// delve delve delve tapestry tapestry multifaceted bustling",
        "const x = 'a testament to nothing';",
        "```",
        "",
        "Inline `delve` and a link to [docs](https://example.com/delve/tapestry).",
        "",
        "<!-- delve tapestry multifaceted -->",
      ].join("\n"),
    );
    const r = scan([doc]).results[0];
    check("fenced code excluded", r.masked.fenced >= 1);
    check("inline code excluded", r.masked.inline >= 1);
    check("link targets excluded", r.masked.urls >= 1);
    check("html comments excluded", r.masked.comments >= 1);
    check(
      "no catalog hits leaked from masked regions",
      r.findings.length === 0,
      r.findings.map((f) => f.id).join(","),
    );
    check("frontmatter profile honoured", r.profile.name === "technical", r.profile.how);
  }

  /* ------------------------------------------------------------------ */
  // Both guard groups run under `essay`, whose allowlist is empty. Running them
  // under `technical` would pass for the wrong reason: that profile allowlists
  // "navigate" and friends, so the allowlist would mask whether the regex guard
  // works at all. Test the guard, not the exemption.
  group("Known false-positive guards");
  {
    const doc = join(tmp, "guards.txt");
    writeFileSync(
      doc,
      [
        // The prototype's false-range regex matched every one of these.
        "From 1995 to 2003, the population doubled.",
        "The study ran from January to March and covered ages 4 to 11.",
        "Prices moved from $12 to $40 over the period.",
        // Legitimate literal uses of figurative-only entries.
        "Press the underscore key, then type an underscore in the identifier.",
        "Use the navigation menu to navigate the file tree.",
        "She works in foster care and fosters two dogs.",
        "The tapestry hangs in the north hall, woven from wool.",
      ].join("\n\n"),
    );
    const r = scan([doc, "--profile", "essay"]).results[0];
    const ids = r.findings.map((f) => f.id);
    check("date and number ranges do not trip false-range", !ids.includes("false-range"), ids.join(","));
    check("literal underscore not flagged", !ids.includes("underscore-figurative"));
    check("literal navigation not flagged", !ids.includes("navigate-abstract"));
    check("foster care not flagged", !ids.includes("foster-abstract"));
    check("a literal woven tapestry not flagged", !ids.includes("tapestry"));
  }

  group("Calibration log regressions — see CALIBRATION.md");
  {
    // FP-2026-07-26-a. Found in real use, not by this suite. The `best part`
    // branch made its punctuation optional, so it matched the ordinary reading
    // in every case and never required the announcing form it was written for.
    const doc = join(tmp, "fp-a.txt");
    writeFileSync(
      doc,
      [
        "It was the best part of joining, and I would do it again tomorrow.",
        "Everyone agreed the best part of the trip was the long drive home.",
      ].join("\n\n"),
    );
    const r = scan([doc, "--profile", "essay"]).results[0];
    check(
      "FP-a: ordinary 'the best part of' does not fire",
      !r.findings.some((f) => f.id === "announced-insight"),
      r.findings.map((f) => f.id).join(","),
    );
  }
  {
    // The paired positive. A tightening with only the negative test is how a
    // pattern gets narrowed into uselessness without anyone noticing.
    const doc = join(tmp, "fp-a-pos.txt");
    writeFileSync(
      doc,
      [
        "The best part? You never have to try.",
        "The best part: you never have to try.",
        "Here's the thing, nobody actually reads these.",
      ].join("\n\n"),
    );
    const r = scan([doc, "--profile", "essay"]).results[0];
    const hit = r.findings.find((f) => f.id === "announced-insight");
    check("FP-a: the announcing sense still fires", Boolean(hit));
    check("FP-a: all three announcing forms match", hit?.count >= 3, `count=${hit?.count}`);
  }

  group("Known false-positive guards — the same patterns MUST still fire");
  {
    const doc = join(tmp, "positives.txt");
    writeFileSync(
      doc,
      [
        "Everything from healthcare to finance has been affected by this shift.",
        "The results underscore the importance of early intervention here.",
        "We must navigate the complexities of an ever-evolving landscape together.",
        "The programme fosters a sense of community among its many participants.",
        "It is a rich tapestry of competing traditions and beliefs.",
      ].join("\n\n"),
    );
    const r = scan([doc, "--profile", "essay"]).results[0];
    const ids = r.findings.map((f) => f.id);
    for (const id of ["false-range", "underscore-figurative", "navigate-abstract",
                      "foster-abstract", "tapestry", "evolving-landscape"]) {
      check(`${id} fires on the genuine article`, ids.includes(id), ids.join(","));
    }
  }

  /* ------------------------------------------------------------------ */
  group("Tier A artifacts bypass density gating");
  {
    // A leaked citation marker in a long document sits at a tiny per-1k rate
    // and would be suppressed by any ceiling. It is still dispositive, so
    // always_flag must override both the ceiling and the min-count floor.
    const doc = join(tmp, "artifact.md");
    const filler = "This is an ordinary sentence of perfectly reasonable length. ".repeat(200);
    writeFileSync(doc, `${filler}\n\nThe result was significant [cite: 14] and worth noting.\n`);
    const r = scan([doc, "--profile", "technical"]).results[0];
    const artifact = r.findings.find((f) => f.id === "model-markup-artifact");
    check("artifact found in a long document", Boolean(artifact));
    check("artifact flags despite trivial density", artifact?.flagged === true,
          `per_1k=${artifact?.per_1k}`);
    check("artifact is not held by the min-count floor", artifact?.held_by_floor === false);
  }
  {
    const doc = join(tmp, "chatbot.md");
    writeFileSync(doc, "You're absolutely right! Here is the revised section.\n\n" +
                       "The migration completed without incident.\n");
    const r = scan([doc, "--profile", "technical"]).results[0];
    check("chatbot register leakage flags on one hit",
          r.findings.some((f) => f.id === "chatbot-register" && f.flagged));
  }
  {
    // The inverse: ordinary prose must not trip any Tier A entry. These carry
    // the most weight, so a false positive here would be the worst kind.
    const clean = scan([after, "--profile", "narration"]).results[0];
    check("no Tier A entry fires on clean human prose",
          !clean.findings.some((f) => f.tier === "A"),
          clean.findings.filter((f) => f.tier === "A").map((f) => f.id).join(","));
  }

  /* ------------------------------------------------------------------ */
  group("Dialect and register risk");
  {
    // The documented highest-risk population for this whole class of tool is
    // people whose English is correct but not the catalog's English: varieties
    // where an ornate formal register is the professional norm, and teaching
    // traditions that explicitly train away from word repetition.
    //
    // This passage is legitimate human writing in an ornate formal register.
    // The test asserts the risk is REAL rather than pretending it away, then
    // asserts both mitigations work. A tool that cannot demonstrate its own
    // bias cannot claim to have addressed it.
    const doc = join(tmp, "ornate.md");
    writeFileSync(
      doc,
      [
        "The committee has undertaken a comprehensive review of the proposals",
        "submitted this quarter, and it is our considered view that the framework",
        "boasts a robust foundation upon which subsequent work may be built.",
        "",
        "The initiative demonstrates a commitment to excellence which the members",
        "found most encouraging. Its holistic approach to the question of regional",
        "development, encompassing a diverse array of stakeholder interests, marks",
        "a significant departure from prior practice.",
        "",
        "We are pleased to record our appreciation of the renowned scholars whose",
        "meticulous preparation enabled so comprehensive a treatment. Their work",
        "underscores the importance of sustained institutional support, and we",
        "commend it to the board without reservation.",
      ].join("\n"),
    );

    const plain = scan([doc, "--profile", "essay"]).results[0];
    const styleHits = plain.findings.filter(
      (f) => f.category === "tonal-inflation" || f.category === "corporate-register",
    );
    check(
      "the bias is real and demonstrable: ornate formal register trips the style catalog",
      styleHits.length >= 3,
      `only ${styleHits.length} — if this drops, the test has stopped measuring anything`,
    );

    // Mitigation 1 — artifacts only. Dialect-neutral by construction: no
    // variety of English produces a leaked citation marker.
    const artifacts = scan([doc, "--profile", "essay", "--artifacts-only"]).results[0];
    check(
      "mitigation 1: --artifacts-only silences every style finding",
      artifacts.findings.length === 0,
      artifacts.findings.map((f) => f.id).join(","),
    );
    check("mitigation 1: cadence bands dropped too", artifacts.summary.cadence_flags.length === 0);
    check("mitigation 1: the mode is declared in output", artifacts.profile.artifacts_only === true);

    // Mitigation 2 — disable the implicated categories per profile.
    const profiles = join(tmp, "dialect-profiles");
    mkdirSync(join(profiles, "ornate"), { recursive: true });
    cpSync(join(SKILL, "profiles", "_base"), join(profiles, "_base"), { recursive: true });
    writeFileSync(
      join(profiles, "ornate", "catalog.json"),
      JSON.stringify({ disable_categories: ["tonal-inflation", "corporate-register"] }, null, 2),
    );
    const scoped = scan([doc, "--profile", "ornate", "--profiles-dir", profiles]).results[0];
    check(
      "mitigation 2: disable_categories removes the implicated categories",
      !scoped.findings.some(
        (f) => f.category === "tonal-inflation" || f.category === "corporate-register",
      ),
      scoped.findings.map((f) => `${f.id}:${f.category}`).join(","),
    );
    check(
      "mitigation 2: the rest of the catalog survives",
      scoped.profile.catalog_entries > 0 && scoped.profile.catalog_entries < plain.profile.catalog_entries,
      `${scoped.profile.catalog_entries} vs ${plain.profile.catalog_entries}`,
    );
    check(
      "mitigation 2: Tier A artifacts are NOT among what gets disabled",
      scoped.profile.disabled_categories.includes("tonal-inflation") &&
        !scoped.profile.disabled_categories.includes("leakage"),
    );
  }

  /* ------------------------------------------------------------------ */
  group("Min-count floor");
  {
    const doc = join(tmp, "short.md");
    // One tricolon in a short document reads as a huge density and is not a tic.
    writeFileSync(
      doc,
      `A short note about scope, budget, and timing.\n\n${"Filler sentence for length. ".repeat(20)}`,
    );
    const r = scan([doc, "--profile", "technical"]).results[0];
    const tri = r.findings.find((f) => f.id === "tricolon");
    check("a single tricolon is not flagged", !tri || tri.flagged === false);
    check("but it is still reported", Boolean(tri), "suppressing it silently would be dishonest");
    check("short document is announced", r.summary.short_document === true);
  }

  /* ------------------------------------------------------------------ */
  group("Robustness");
  {
    const empty = join(tmp, "empty.md");
    writeFileSync(empty, "---\nprofile: essay\n---\n\n```js\nconst a = 1;\n```\n");
    let exitCode = 0;
    try {
      execFileSync("node", [SCAN, empty], { encoding: "utf8", stdio: "pipe" });
    } catch (err) {
      exitCode = err.status;
    }
    check("a prose-free file fails cleanly rather than dividing by zero", exitCode === 1);

    let missingCode = 0;
    try {
      execFileSync("node", [SCAN, join(tmp, "nope.md")], { encoding: "utf8", stdio: "pipe" });
    } catch (err) {
      missingCode = err.status;
    }
    check("a missing file exits non-zero", missingCode === 1);

    const unknown = scan([join(BUNDLE, "fixtures", "script-v2-after.txt"), "--profile", "nosuch"]);
    check("an unknown profile falls back to _base", unknown.results[0].profile.name === "_base");
    check("and says it fell back", unknown.results[0].profile.fellBack === true);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
