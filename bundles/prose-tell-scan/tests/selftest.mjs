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

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, cpSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { runAcceptance } from "./acceptance.mjs";
import { renderFixture } from "./fixtures/pattern/build.mjs";
import { scanState } from "./pattern-harness.mjs";

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

/**
 * A check whose PRECONDITION is absent, announced rather than quietly dropped.
 *
 * FN-2026-08-04-k is the reason this is loud: a contract test with a bare `catch`
 * reported "skipped" on a rename while its subject was fully present, and nobody
 * saw it because a skip that prints nothing is indistinguishable from a pass. So
 * a skip prints, says WHY, and is counted in the summary line.
 */
let skipped = 0;
const skips = [];
function skip(name, why) {
  skipped += 1;
  skips.push(`${name} — ${why}`);
  process.stdout.write(`  SKIP ${name} — ${why}\n`);
}

/**
 * Is `file` tracked by git, here, right now?
 *
 * THE BUG THIS REPLACES. The git-corroboration tests guarded on `existsSync`,
 * but their real precondition is that git can vouch for the file's age. Those
 * are not the same question, and they come apart in exactly the situation that
 * matters: a COPY of the repo. Copy the tree without `.git` - which is what
 * `mutations.mjs` now does, and what any CI checkout artifact or `cp -R` does -
 * and the file still exists while git knows nothing about it. The assertions
 * then ran with their premise false and reported three failures that had nothing
 * to do with the code under test.
 */
function gitTracked(file) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", file], {
      cwd: dirname(file), stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
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
    //
    // WIDENED 2026-08-03 to include the bundle-level AGENTS.md and wiring
    // snippets. They sat outside this list entirely, and the first scan that ran
    // against them found a real tic (CALIBRATION.md TP-2026-08-03-b). A corpus
    // that excludes the prose most likely to trip a structural check is not an
    // FP corpus.
    for (const doc of ["README.md", "CONTRIBUTING.md", "AGENTS.md", "docs/wiring.md",
                       "docs/portability.md",
                       "bundles/prose-tell-scan/AGENTS.md",
                       "bundles/prose-tell-scan/PROFILES.md",
                       "bundles/prose-author/DESIGN.md",
                       "bundles/prose-review/DESIGN.md",
                       "bundles/prose-review/README.md",
                       "bundles/prose-review/PROTOCOL.md",
                       "bundles/prose-review/AGENTS.md",
                       "bundles/prose-review/tests/critic-harness.md",
                       "primitives/agents/prose-voice-critic/README.md",
                       "bundles/prose-tell-scan/wiring/claude-md.md",
                       "bundles/prose-tell-scan/wiring/agents-md.md",
                       "bundles/verification-gate/AGENTS.md",
                       "bundles/verification-gate/PROTOCOL.md",
                       "bundles/verification-gate/wiring/claude-md.md",
                       "bundles/verification-gate/wiring/agents-md.md"]) {
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

    // A derived band outlives the catalog that measured it. Cadence survives that
    // — sentence-length variance means the same thing forever — but catalog
    // density is a COUNT OF ENTRIES, so retuning one silently changes what a
    // per-1000 figure means. Two densities from different catalog versions are
    // two different rulers and nothing about the numbers says so. Stamping the
    // version is what makes that detectable later.
    const derivedFile = JSON.parse(
      readFileSync(join(profiles, "reg", "thresholds.derived.json"), "utf8"),
    );
    const baseCatalogVersion = JSON.parse(
      readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"),
    ).version;
    check(
      "derived thresholds record the catalog version that produced them",
      derivedFile.catalog_version === baseCatalogVersion,
      `derived=${derivedFile.catalog_version} base=${baseCatalogVersion}`,
    );

    const derived = scan([before, "--profile", "reg", "--profiles-dir", profiles]).results[0];
    check("scanner reports thresholds as derived", derived.profile.thresholds.derived === true);
    check(
      "the scan reports the catalog version too, so the two are comparable",
      derived.profile.catalog_version === baseCatalogVersion,
      `scan=${derived.profile.catalog_version} base=${baseCatalogVersion}`,
    );
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
    // FP-2026-07-26-a, resolved by REMOVAL on 2026-08-03 rather than tightening.
    //
    // This block previously held the paired positive for `announced-insight`:
    // it asserted the entry still fired on the three announcing forms. That
    // assertion is gone because the behaviour it guarded is gone — the entry was
    // deleted, and the deletion is the point. It is not on the source page at
    // all, it duplicated a `not_deterministic` declaration, and FP-a's own
    // conclusion was "an argument for pruning rather than tightening if it
    // recurs".
    //
    // What replaces it guards the DECISION instead of the pattern, because the
    // way this regresses is somebody re-adding the entry from the same plausible
    // idea that produced it the first time.
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
    check(
      "FP-a: announced-insight no longer fires on any announcing form",
      !r.findings.some((f) => f.id === "announced-insight"),
      r.findings.map((f) => f.id).join(","),
    );
    const cat = JSON.parse(
      readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"),
    );
    check(
      "FP-a: it is recorded in `rejected`, not silently dropped",
      Boolean(cat.rejected?.["announced-insight"]?.why_rejected),
    );
    check(
      "FP-a: the rejection states it was absent from the source page",
      /not on the source page/i.test(cat.rejected?.["announced-insight"]?.why_rejected ?? ""),
    );
    check(
      "FP-a: no live entry reintroduces it",
      !cat.entries.some((e) => e.id === "announced-insight"),
    );
  }

  group("Source-page coverage — the examples the catalog is built from");
  {
    // WHY THIS GROUP EXISTS, AND WHY IT LOOKS LIKE THIS.
    //
    // The first version of this test retyped the source page's examples with
    // ASCII apostrophes and spaced em dashes. Measured against that, the family
    // scored 7/9. Measured against what the page actually says — U+2019, unspaced
    // dashes — it scored 1/9, because every catalog pattern spelled contractions
    // with an ASCII apostrophe and the page does not. The test had been fitted to
    // the code, so it certified a fix that did not work on real text.
    //
    // The strings below are therefore the page's own {{highlight}} spans with
    // wiki markup removed (`<u>`, `'''`) and NOTHING ELSE changed — every
    // character of prose, punctuation, and apostrophe is as the page has it.
    // Thirteen of sixteen appear byte-identical in the raw wikitext; the other
    // three differ only by those stripped tags. Verifiable by re-fetching
    // `?action=raw` and stripping the same two patterns.
    //
    // If they are ever retyped or "cleaned up", this test stops measuring
    // anything — that is precisely how it failed the first time.
    //
    // ATTRIBUTION: quoted from "Wikipedia:Signs of AI writing" (§Negative
    // parallelisms), CC BY-SA 4.0 —
    // https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
    // This repository is MIT; these strings are not, and reuse carries CC BY-SA's
    // share-alike condition.
    // Every string is one of the page's {{highlight}} spans, unaltered. `hits`
    // records the measured truth on 2026-08-03: 11 of 16, not "all".
    const WP_NEGPAR = [
      ["not only dismissive but also", true],
      ["doesn’t just undermine the editor’s argument; it questions their very right to participate", false],
      ["not just dismissive—they’re outright disrespectful.", true],
      ["not only discourage participation but also", true],
      ["not only a work of self-representation, but", true],
      ["isn’t just sourcing—it’s framing", true],
      ["That’s not just a sourcing issue—it’s a systemic bias", true],
      ["is not grounded in visual mastery, but in what Amelia Jones terms “the performative enactment of subjectivity”", true],
      ["is not dissolution. Rather, it constitutes what Deleuze might describe as “becoming”", false],
      ["is not a mirror but a portal", true],
      ["not a representation of self, but a mechanism", false],
      ["This isn’t WP:NBIO — it’s WP:1EVENT in disguise", true],
      ["Not a career, not a body of work, not sustained relevance — just an algorithmic moment", false],
      ["is not who feels warm fuzzies from visibility, it’s whether this article meets the threshold for inclusion", true],
      ["This ain’t bludgeoning — it’s surgical teardown", true],
      ["rather than", false],
    ];
    const FAMILY = ["negative-parallelism", "not-x-but-y", "not-just-but", "not-only-but-also"];

    let matched = 0;
    for (const [sentence, shouldHit] of WP_NEGPAR) {
      const one = join(tmp, "wp-one.txt");
      writeFileSync(one, `${sentence}\n`);
      const ids = scan([one, "--profile", "essay"]).results[0].findings.map((f) => f.id);
      const hit = FAMILY.some((id) => ids.includes(id));
      if (hit) matched += 1;
      check(
        `${shouldHit ? "covers" : "known gap:"} ${sentence.slice(0, 52)}`,
        hit === shouldHit,
        hit ? `unexpectedly matched: ${ids.join(",")}` : "no longer matches",
      );
    }
    check(
      "measured source coverage is 11/16, and did not silently drop",
      matched === 11,
      `matched=${matched} — update CALIBRATION.md FN-2026-08-03-a rather than editing this number`,
    );
  }
  {
    // The apostrophe fold, tested at the surface that broke. `chatbot-register` is
    // TIER A — dispositive on one occurrence — and it missed the single most
    // recognisable chatbot leak whenever the paste carried a curly apostrophe,
    // which is the default on macOS, iOS, Word, and every chat UI.
    const doc = join(tmp, "curly.txt");
    writeFileSync(doc, "You’re absolutely right, and it’s important to note that this isn’t ideal.\n");
    const ids = scan([doc, "--profile", "essay"]).results[0].findings.map((f) => f.id);
    check("Tier A leakage matches with a curly apostrophe", ids.includes("chatbot-register"), ids.join(","));

    const straight = join(tmp, "straight.txt");
    writeFileSync(straight, "You're absolutely right, and it's important to note that this isn't ideal.\n");
    const sIds = scan([straight, "--profile", "essay"]).results[0].findings.map((f) => f.id);
    check(
      "and the two apostrophe forms are now indistinguishable to the catalog",
      JSON.stringify(ids.sort()) === JSON.stringify(sIds.sort()),
      `curly=${ids.join(",")} straight=${sIds.join(",")}`,
    );

    // But the report must still quote the document as the author wrote it. The
    // fold is for matching only; echoing normalised punctuation back at someone
    // is the tool rewriting their prose in its own findings.
    const ctx = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "chatbot-register")?.contexts?.[0]?.text ?? "";
    check("the finding quotes the curly form, not the folded one", /’/.test(ctx), ctx.slice(0, 60));
  }
  {
    // The paired negative. These five sentences are this repo's own prose, and
    // they are the entire evidence base for the contracted-resumption guard —
    // relaxing the subject without it flagged every one of them. Rationale lives
    // in the entry's `note`; the incident is CALIBRATION.md FN-2026-08-03-a.
    const doc = join(tmp, "negpar-fp.txt");
    writeFileSync(
      doc,
      [
        "Where the two halves must not be in lockstep, that price is not being paid — it is being avoided.",
        "It is unchanged because renaming is not a decision, it is a migration.",
        "These are not edge cases to be tuned away; they are the reason the output is leads.",
        "On a harness with no dispatch the risk is not wrong answers — it is that nobody runs the script.",
        "The failure mode is not that the tool gives wrong answers — it is that nobody runs it.",
      ].join("\n\n"),
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "negative-parallelism");
    check(
      "uncontracted explanatory contrast does not fire",
      !hit,
      `count=${hit?.count} — the contracted-resumption guard has stopped working`,
    );
  }
  {
    // Tier A is the only dialect-neutral tier and the only thing --artifacts-only
    // retains, so a miss here is the most expensive miss available. The separator
    // was hardcoded to U+0007, which is how MediaWiki STORES the marker, not what
    // a paste contains: the entry matched the rendering of the tell, not the tell.
    const PUA = String.fromCharCode(0xe200);
    const doc = join(tmp, "tier-a.txt");
    writeFileSync(
      doc,
      [
        `A sentence carrying a leaked marker cite${PUA}turn0search1 mid-paragraph.`,
        "Another one with citeturn3news2 where the separator was stripped on paste.",
        'And a raw blob: {"attribution":{"attributableIndex":"0-1"}}',
      ].join("\n\n"),
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "model-markup-artifact");
    check("Tier A matches the PUA separator, not just the wiki rendering", Boolean(hit));
    check("all three artifact forms match", hit?.count >= 3, `count=${hit?.count}`);
    check("and it flags on one occurrence, bypassing density", hit?.flagged === true);
  }

  group("Named corpus groups, and noticing when a corpus is two voices");
  {
    // A register is chosen by the tool. A GROUP is chosen by the author, because
    // "essay" is often several voices wearing one label and only they know where
    // the seams are. Groups are subdirectories of corpus/human/.
    const root = join(tmp, "groups");
    const prof = join(root, "profiles");
    mkdirSync(join(prof, "essay", "corpus", "human", "newsletter"), { recursive: true });
    mkdirSync(join(prof, "essay", "corpus", "human", "longform"), { recursive: true });
    cpSync(join(SKILL, "profiles", "_base"), join(prof, "_base"), { recursive: true });
    for (const f of ["profile.json", "thresholds.json", "allow.txt"]) {
      const src = join(SKILL, "profiles", "essay", f);
      if (existsSync(src)) cpSync(src, join(prof, "essay", f));
    }
    const fm = "---\nsource: test\ndate: 2024-01-01\nhuman_authored: true\n---\n\n";
    const short = Array.from({ length: 50 }, (_, k) => `Short line ${k} here.`).join(" ");
    const long = Array.from({ length: 25 }, (_, k) =>
      `Although the matter of ${k} was considered at length by those who came before, the difficulty persists unresolved.`).join(" ");
    for (let i = 0; i < 6; i += 1) {
      writeFileSync(join(prof, "essay", "corpus", "human", "newsletter", `n${i}.md`), fm + short);
      writeFileSync(join(prof, "essay", "corpus", "human", "longform", `l${i}.md`), fm + long);
    }

    const pooled = calibrate(["essay", "--profiles-dir", prof]);
    check("groups are discovered from subdirectories",
      JSON.stringify(pooled.groups_available) === JSON.stringify(["longform", "newsletter"]),
      JSON.stringify(pooled.groups_available));
    check("pooling reads every group", pooled.samples_used === 12, `${pooled.samples_used}`);

    // The per-entry rates calibration used to compute and discard. This is what
    // lets a report say "you use this 0.2x/1k; the draft is 1.4x/1k" rather than
    // comparing a draft against a severity-class ceiling.
    check("per-entry author rates are retained, not collapsed into ceilings",
      pooled.derived && typeof pooled.derived.entry_rates === "object",
      "entry_rates missing");

    const one = calibrate(["essay", "--group", "newsletter", "--profiles-dir", prof]);
    check("--group calibrates a single voice", one.samples_used === 6, `${one.samples_used}`);
    // The claim that matters is not that the medians differ — with two equal
    // clusters the pooled median lands on the boundary and can coincide with
    // either. It is that POOLED BANDS ARE WIDER THAN EITHER VOICE'S, which is
    // exactly why they describe neither: a draft in either voice falls "within
    // range", and the tool goes quiet rather than wrong.
    const width = (d) => d.metrics.mean_len.p90 - d.metrics.mean_len.p10;
    check("pooled bands are wider than a single voice's",
      width(pooled.derived) > width(one.derived),
      `pooled ${width(pooled.derived)} vs group ${width(one.derived)}`);

    // The reason groups matter: pooled bands describe neither voice, and the
    // tool goes quiet rather than wrong — which is worse, because nothing
    // announces it.
    check("a two-voice corpus is reported as such", Boolean(pooled.clusters), "no clusters found");
    check("and the clusters are recognised as matching the author's own groups",
      pooled.clusters?.aligned_with_named_groups === true,
      JSON.stringify(pooled.clusters?.clusters));
    check("clustering is not attempted within a single named group",
      one.clusters === null, "asking whether one group is multimodal is a weaker question");
  }
  {
    // The negative, and the one that caught two bad statistics before shipping.
    // A single voice with ordinary variation must produce silence.
    //
    // The first version compared cluster MEANS against total spread, which flags
    // uniformly distributed data by construction. The second required a gap in
    // within-cluster standard deviations, which explodes when a cluster has zero
    // variance. Both passed a fixture that was accidentally bimodal.
    const root = join(tmp, "onevoice");
    const prof = join(root, "profiles");
    mkdirSync(join(prof, "essay", "corpus", "human"), { recursive: true });
    cpSync(join(SKILL, "profiles", "_base"), join(prof, "_base"), { recursive: true });
    for (const f of ["profile.json", "thresholds.json", "allow.txt"]) {
      const src = join(SKILL, "profiles", "essay", f);
      if (existsSync(src)) cpSync(src, join(prof, "essay", f));
    }
    const fm = "---\nsource: test\ndate: 2024-01-01\nhuman_authored: true\n---\n\n";
    for (let i = 0; i < 10; i += 1) {
      const sents = Array.from({ length: 45 }, (_, k) => {
        const n = 9 + ((i * 5 + k * 7) % 13);
        return `${Array.from({ length: n }, (_, w) => `word${w}`).join(" ")}.`;
      });
      writeFileSync(join(prof, "essay", "corpus", "human", `s${i}.md`), fm + sents.join(" "));
    }
    const r = calibrate(["essay", "--profiles-dir", prof]);
    check("one voice with ordinary variation reports no clusters",
      r.clusters === null,
      `reported separation ${r.clusters?.separation} — the statistic is flagging noise again`);
  }

  group("Artifacts that need arithmetic, not a regex");
  {
    // An ISBN that fails its own checksum was invented. Local arithmetic, no
    // lookup — which is why it belongs in the scanner rather than the critics.
    const doc = join(tmp, "isbn.txt");
    writeFileSync(
      doc,
      "The standard reference is ISBN 9780470521571, still in print.\n\n"
      + "A second source, ISBN 979-8-987654321-0, could not be located.\n",
    );
    const hit = scan([doc, "--profile", "technical"]).results[0]
      .findings.find((f) => f.id === "invalid-identifier");
    check("a hallucinated ISBN is caught by its checksum", Boolean(hit), "");
    check("and it is Tier A — an invented identifier is an artifact, not a style",
      hit?.tier === "A" && hit?.flagged === true);
    check("the VALID ISBN in the same document is not flagged",
      !JSON.stringify(hit?.examples ?? []).includes("9780470521571"),
      JSON.stringify(hit?.examples));
  }
  {
    // The paired negative: real bibliographies must stay silent, or nobody can
    // scan a document that cites books.
    const doc = join(tmp, "isbn-ok.txt");
    writeFileSync(
      doc,
      "See ISBN 9780470521571 and ISBN 020161622X for the derivations, both of "
      + "which remain the standard treatments of the subject in question.\n",
    );
    const ids = scan([doc, "--profile", "technical"]).results[0].findings.map((f) => f.id);
    check("valid ISBN-13 and ISBN-10 (X check digit) both stay quiet",
      !ids.includes("invalid-identifier"), ids.join(","));
  }
  {
    // utm_source cannot be a catalog entry: maskNonProse blanks URLs before the
    // catalog runs, so the parameter is gone by then. This needs a raw pass.
    const doc = join(tmp, "utm.md");
    writeFileSync(doc, "Background reading: [the study](https://example.com/x?utm_source=chatgpt.com).\n");
    const hit = scan([doc, "--profile", "technical"]).results[0]
      .findings.find((f) => f.id === "chatbot-sourced-citation");
    check("a chatbot-tagged citation URL is caught despite URL masking", Boolean(hit));
    check("it is Tier A", hit?.tier === "A" && hit?.flagged === true);

    const clean = join(tmp, "utm-clean.md");
    writeFileSync(clean, "Background reading: [the study](https://example.com/x?utm_source=newsletter).\n");
    const ids = scan([clean, "--profile", "technical"]).results[0].findings.map((f) => f.id);
    check("an ordinary utm_source is not a chatbot marker",
      !ids.includes("chatbot-sourced-citation"), ids.join(","));
  }
  {
    // One finding per entry with a count, matching every other entry's shape.
    // An earlier version emitted one finding per occurrence, so eight tagged
    // citations read as eight separate problems.
    const doc = join(tmp, "utm-many.md");
    writeFileSync(doc, Array.from({ length: 5 },
      (_, i) => `[source ${i}](https://example.com/${i}?utm_source=chatgpt.com)`).join("\n\n") + "\n");
    const hits = scan([doc, "--profile", "technical"]).results[0]
      .findings.filter((f) => f.id === "chatbot-sourced-citation");
    check("repeated artifacts aggregate into one finding with a count",
      hits.length === 1 && hits[0].count === 5, `${hits.length} findings, count=${hits[0]?.count}`);
  }
  {
    // Markdown structure is MEASURED, never flagged. The acceptance corpus is
    // plain text, so it can show these firing on legitimate human writing —
    // `thematic_break_before_heading` hits two of this repo's own documents —
    // but it cannot produce a single true positive. A threshold would be fitted
    // to one side of the evidence only. See FP-2026-08-04-d for the last time
    // that was done.
    const doc = join(tmp, "structure.md");
    writeFileSync(
      doc,
      "# Title\n\n### Skipped a level\n\n---\n\n## After a break\n\n"
      + "- **Label**: a value\n- 🎯 decorated item\n\nSome prose to give it length.\n",
    );
    const st = scan([doc, "--profile", "technical"]).results[0].formatting.structure;
    check("heading-level skips are counted", st.heading_level_skips >= 1, JSON.stringify(st));
    check("thematic breaks before headings are counted", st.thematic_break_before_heading >= 1);
    check("inline-header list items are counted", st.inline_header_list_items >= 1);
    check("emoji in list-marker position are counted", st.emoji_as_formatting >= 1);
    check("none of it produces a finding",
      !scan([doc, "--profile", "technical"]).results[0].findings
        .some((f) => /heading|emoji|thematic|inline_header/.test(f.id)),
      "structure is reported alongside em-dash and bold density, not flagged");
    check("and the block says why it is not flagged", /plain text/.test(st._about ?? ""));
  }

  group("Counter-evidence — the half that argues the other way");
  {
    // Everything else here accumulates evidence FOR a tell, which biases the
    // whole tool toward flagging. This is the source page's §Signs of human
    // writing, and the rule that shapes it is absolute: NEVER netted against the
    // findings. The moment exculpatory evidence subtracts from inculpatory, this
    // is a scored detector, which meta.yaml refuses by contract.
    // CHANGED 2026-08-04. These previously asserted that a frontmatter date
    // ALONE was evidential and dispositive. That was wrong and is why the
    // assertions moved rather than being deleted: a date the document asserts
    // about itself was able to switch off the scanner reading it. One line of
    // YAML in any AI draft silenced a document saturated with findings.
    //
    // The trust model now distinguishes a CLAIM from a RECORD. See
    // CALIBRATION.md FP-2026-08-04-f.
    const claimed = join(tmp, "claimed.md");
    writeFileSync(claimed, "---\ndate: 2019-04-02\n---\n\nDelve into the rich tapestry of "
      + "meticulous craftsmanship that stands as a testament to the era.\n");
    const rc = scan([claimed, "--profile", "essay"]).results[0];

    check("a self-reported date is still reported",
      rc.counter_evidence.age.date === "2019-04-02", JSON.stringify(rc.counter_evidence.age));
    check("but an uncorroborated claim is not evidential",
      rc.counter_evidence.age.evidential === false);
    check("and cannot be dispositive", rc.counter_evidence.age.dispositive === false);
    check("and says what would make it so",
      /commit the file/i.test(rc.counter_evidence.age.caveat ?? ""),
      rc.counter_evidence.age.caveat ?? "");
    check("so the reading is NOT overridden by an unverifiable claim",
      !/before ChatGPT was public/.test(rc.summary.reading),
      rc.summary.reading.slice(0, 80));

    // The corroborated path, on a real committed file: git is a record, not a
    // claim, so this one IS dispositive.
    // GUARD ON GIT, NOT ON THE FILESYSTEM. These four checks assert that git
    // CORROBORATES a frontmatter date, so their precondition is that git is
    // vouching for this file - not merely that the file is on disk. The two come
    // apart in any copy of the repo made without `.git`, where the file is
    // present and git knows nothing about it.
    const tracked = join(BUNDLE, "tests", "corpus", "human", "kenyatta-university.txt");
    const canCorroborate = existsSync(tracked) && gitTracked(tracked);
    const r = canCorroborate
      ? scan([tracked, "--profile", "technical"]).results[0]
      : null;
    const ce = r ? r.counter_evidence : rc.counter_evidence;
    if (!r) {
      skip("git corroborates a frontmatter date",
        existsSync(tracked)
          ? "corpus file is not git-tracked here (a copy of the tree, or not yet committed)"
          : "corpus file absent");
    }
    if (r) {
      check("a frontmatter date corroborated by git IS evidential",
        ce.age.evidential === true && ce.age.corroborated === true, JSON.stringify(ce.age));
      check("text predating ChatGPT is dispositive", ce.age.dispositive === true);
      check(
        "and the reading says so BEFORE reporting style findings",
        /before ChatGPT was public/.test(r.summary.reading)
        && r.summary.reading.indexOf("before ChatGPT") < 120,
        r.summary.reading.slice(0, 90),
      );
      // The point of the override: counter-evidence outranks the reading, it
      // does not hide the measurements.
      check("the style findings are still reported, not suppressed",
        r.findings.length > 0,
        "counter-evidence outranks the reading; it does not hide the measurements");
    }

    // The body-date case that defeated the dispositive check with ordinary
    // prose: frontmatter present but carrying no `date:` key, and a date-shaped
    // string further down the document.
    const bodyDate = join(tmp, "bodydate.md");
    writeFileSync(bodyDate,
      "---\ntitle: Notes\n---\n\nDelve into the rich tapestry of meticulous craft.\n"
      + "The filing date: 2015-06-01 was noted in the register.\n");
    const bd = scan([bodyDate, "--profile", "essay"]).results[0].counter_evidence;
    check(
      "a date-shaped string in the BODY is not read as frontmatter",
      bd.age.how !== "the document's own frontmatter" && bd.age.dispositive === false,
      JSON.stringify(bd.age),
    );

    // `--artifacts-only` promises to skip every style judgement. The syntax
    // rates are style by this project's own framing; age is provenance, a fact
    // about the file rather than an opinion about the prose, and stays.
    const artifacts = scan([claimed, "--profile", "essay", "--artifacts-only"]).results[0];
    check("--artifacts-only drops the syntax rates, as its contract says",
      artifacts.counter_evidence.syntax.length === 0,
      `${artifacts.counter_evidence.syntax.length} rates survived`);
    check("but keeps provenance, which is not a style judgement",
      Boolean(artifacts.counter_evidence.age));

    // NEVER SUBTRACT.
    //
    // A keyword blocklist was the first version of this check and it was
    // theatre: it would have passed on `confidence`, `weight`, `overallAUC`, or
    // a number folded into prose. An allowlist on the SHAPE fails on any new
    // key, which is the only form that constrains a future contributor.
    const flat = JSON.stringify(ce);
    const topLevel = Object.keys(ce).sort();
    check("the counter-evidence block has no key beyond its declared shape",
      JSON.stringify(topLevel) === JSON.stringify(["_about", "age", "syntax"]),
      topLevel.join(","));
    check("and no per-metric key beyond its declared shape",
      ce.syntax.every((m) => JSON.stringify(Object.keys(m).sort())
        === JSON.stringify(["auc", "banded", "flagged", "key", "label", "means", "per_1k"])),
      JSON.stringify(ce.syntax.map((m) => Object.keys(m).sort())));
    check("no netted score exists in the counter-evidence block",
      !/"?(?:score|net|combined|total|likelihood|probability)"?\s*:/i.test(flat),
      "a single number here would be quoted as a verdict within a week");
    check("no syntax rate is ever flagged or banded",
      ce.syntax.every((x) => x.flagged === false && x.banded === false));
    check("each rate carries the measured AUC that limits it",
      ce.syntax.every((x) => typeof x.auc === "number" && x.auc > 0.5 && x.auc < 1),
      JSON.stringify(ce.syntax.map((x) => [x.key, x.auc])));
  }
  {
    // The three metrics that measured at or below chance are absent, not
    // inverted and not reported. `hedge` ran BACKWARDS (AUC 0.45); reporting a
    // coin-flip number invites someone to act on it.
    const doc = join(tmp, "ce-absent.md");
    writeFileSync(doc, "This is a fairly ordinary sentence that seems to hedge somewhat.\n");
    const keys = scan([doc, "--profile", "essay"]).results[0]
      .counter_evidence.syntax.map((x) => x.key).sort();
    check("only the metrics that beat chance are computed",
      JSON.stringify(keys) === JSON.stringify(["copula", "superlative", "wordy"]),
      keys.join(","));
    check("stiff-verb forms are never computed as evidence of AI",
      !keys.includes("stiffverb"),
      "ornate register is professional norm in several varieties of English");
  }
  {
    // mtime is reported and explicitly disqualified. It is set by whatever last
    // touched the file, including the copy that put it there.
    const doc = join(tmp, "nodate.txt");
    writeFileSync(doc, "Ordinary prose carrying no provenance of any kind at all.\n");
    const ce = scan([doc, "--profile", "essay"]).results[0].counter_evidence;
    check("mtime is not treated as evidence", ce.age.evidential === false);
    check("and cannot be dispositive", ce.age.dispositive === false);
    check("and says why", /copy/.test(ce.age.caveat ?? ""), ce.age.caveat ?? "");
  }
  {
    // A modern document must not acquire counter-evidence by accident.
    const doc = join(tmp, "modern.md");
    writeFileSync(doc, "---\ndate: 2026-01-15\n---\n\nOrdinary recent prose about a topic.\n");
    const ce = scan([doc, "--profile", "essay"]).results[0].counter_evidence;
    check("a post-launch date is not dispositive", ce.age.dispositive === false);
  }

  group("Tier A means no human writes this in ANY register");
  {
    // The contract Tier A trades on: always_flag, no density gating, and an
    // acceptance gate asserting zero false positives on human text. Only
    // patterns no register produces can honour it.
    //
    // `assistant-preamble` and `chatbot-register` shipped in Tier A and did not
    // qualify. They catch polite conversational moves, which are ordinary
    // business email — and this bundle ships `correspondence` as a first-class
    // register. The acceptance corpus is 45 encyclopedic documents, so it could
    // not exercise the register where they misfire: "0/12 human" was measuring
    // somewhere the failure cannot occur. See CALIBRATION.md FP-2026-08-04-d.
    const email = join(tmp, "email.txt");
    writeFileSync(
      email,
      "Thanks for the update on the timeline.\n\n"
      + "Let me know if you need anything else before Friday.\n\n"
      + "I hope this helps with the planning.\n",
    );
    const corr = scan([email, "--profile", "correspondence"]).results[0];
    check(
      "no Tier A entry fires on an ordinary business email",
      corr.findings.filter((f) => f.tier === "A" && f.flagged).length === 0,
      corr.findings.filter((f) => f.tier === "A" && f.flagged).map((f) => f.id).join(","),
    );
    check(
      "and the correspondence register disables the two that are email-ordinary",
      corr.findings.filter((f) => f.flagged).length === 0,
      corr.findings.filter((f) => f.flagged).map((f) => f.id).join(","),
    );
  }
  {
    // The paired positive, and the reason this is disabled per-register rather
    // than deleted: the same words in an ARTICLE are still a real signal.
    const doc = join(tmp, "preamble.txt");
    writeFileSync(
      doc,
      "Certainly, here is the revised section you asked for.\n\n"
      + "The town was founded in 1847.\n\n"
      + "Would you like me to expand the history further?\n",
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "assistant-preamble");
    check("assistant-preamble still catches leaked chat turns in article register",
      Boolean(hit) && hit.flagged === true, `flagged=${hit?.flagged}`);
    check("both forms match", hit?.count >= 2, `count=${hit?.count}`);
  }
  {
    // Model self-identification IS register-neutral, which is why it kept the
    // tier when the pleasantries lost it. Nobody describes themselves this way.
    const doc = join(tmp, "selfid.txt");
    writeFileSync(doc, "As an AI language model, I do not have personal opinions on this.\n");
    for (const profile of ["correspondence", "essay", "technical", "narration"]) {
      const hit = scan([doc, "--profile", profile]).results[0]
        .findings.find((f) => f.id === "model-self-identification");
      check(`model-self-identification is dispositive in ${profile} too`,
        Boolean(hit) && hit.tier === "A" && hit.flagged === true, `${profile}: ${hit?.flagged}`);
    }
  }
  {
    // The boundary regression the widening introduced: splicing alternatives
    // onto the tail dropped the `\b` closing the original group, so trigger
    // words matched as prefixes. The 45-document corpus contained no such case,
    // so nothing failed — this is the case it lacked.
    const doc = join(tmp, "boundary.txt");
    writeFileSync(
      doc,
      "Many scholarship programs exist to help students, and scientists believed the "
      + "original survey data for decades before later work revised it.\n",
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "vague-attribution");
    check(
      "vague-attribution does not match its triggers as word prefixes",
      !hit,
      `matched ${JSON.stringify(hit?.examples)} — the closing word boundary is gone again`,
    );
    // Paired positive: the genuine article must still fire.
    const real = join(tmp, "vague-real.txt");
    writeFileSync(
      real,
      "Studies show the effect is large. Many experts agree. Some critics argue otherwise, "
      + "and industry reports suggest the same.\n",
    );
    const hit2 = scan([real, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "vague-attribution");
    check("but still fires on genuine vague attribution", hit2?.count >= 3, `count=${hit2?.count}`);
  }

  group("Coverage added 2026-08-04 — each measured on the corpus before shipping");
  {
    // The source page's current-cohort pattern — the one it says is commoner in
    // tools released 2025 or later. 2/33 AI, 0/12 human.
    const doc = join(tmp, "notability.txt");
    writeFileSync(
      doc,
      "The company has received independent coverage in national media outlets.\n\n"
      + "Its founder has been profiled in multiple widely-read outlets and maintains an "
      + "active social media presence.\n",
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "notability-canning");
    check("notability-canning catches the canned-sourcing cluster", Boolean(hit));
    check("several forms match", hit?.count >= 3, `count=${hit?.count}`);
  }
  {
    // Two rejections. The first version of these checks asserted that a JSON key
    // existed and contained the word "corpus" — which would have passed just as
    // happily if the cited numbers were invented. A rejection is a claim about
    // measurement, so the test re-derives the measurement.
    //
    // This is why `rejected` entries now carry `tested_pattern`: a decision
    // nobody can re-check is a decision nobody can overturn.
    const cat = JSON.parse(
      readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"),
    );
    for (const id of ["additionally-initial", "copulative-avoidance"]) {
      const rec = cat.rejected?.[id];
      check(`${id}: rejection records the pattern that was tested`,
        Boolean(rec?.why_rejected) && Boolean(rec?.tested_pattern)
        && !cat.entries.some((e) => e.id === id),
        rec ? "" : "missing from `rejected`");
    }

    // Re-derive the headline number for `additionally-initial` against the real
    // corpus. The claim that killed it: proportionally commoner in human writing.
    const corpusDir = join(BUNDLE, "tests", "corpus");
    if (existsSync(join(corpusDir, "ai"))) {
      const re = () => /(?:^|(?<=[.!?]\s))Additionally,/g;
      const count = (dir) => readdirSync(join(corpusDir, dir))
        .filter((f) => f.endsWith(".txt"))
        .filter((f) => re().test(readFileSync(join(corpusDir, dir, f), "utf8"))).length;
      const ai = count("ai");
      const human = count("human");
      const aiN = readdirSync(join(corpusDir, "ai")).filter((f) => f.endsWith(".txt")).length;
      const humanN = readdirSync(join(corpusDir, "human")).filter((f) => f.endsWith(".txt")).length;
      check(
        `additionally-initial really is no better than chance (${ai}/${aiN} AI vs ${human}/${humanN} human)`,
        human / humanN >= ai / aiN,
        "if this flips, the rejection deserves re-opening — that is the point of recording it",
      );
    }
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
  group("The reading must reconcile with the table above it");
  {
    // It used to say "2 independent categories are elevated" while
    // flagged_categories listed ONE, because a cadence flag was folded into a
    // count labelled "categories". A reader checking the sentence against the
    // JSON found a number they could not explain, and the error always ran
    // toward more alarming.
    //
    // Found on a real document: a pre-ChatGPT Wikipedia revision, provably human,
    // one catalog category plus one cadence metric.
    const doc = join(tmp, "reconcile.md");
    writeFileSync(
      doc,
      `${"The committee reviewed the report and approved the budget without objection. ".repeat(14)}\n\n`
      + `${"Members raised concerns, offered amendments, and requested revisions. ".repeat(12)}\n`,
    );
    const r = scan([doc, "--profile", "essay"]).results[0];
    const cats = r.summary.flagged_categories.length;
    const cad = r.summary.cadence_flags.length;
    const reading = r.summary.reading;

    if (cats > 0) {
      check(
        "the reading names the catalog-category count that the table reports",
        reading.includes(`${cats} catalog categor`),
        `cats=${cats} reading="${reading.split(".")[0]}"`,
      );
    }
    if (cad > 0) {
      check(
        "and names the cadence count separately, not folded in",
        reading.includes(`${cad} cadence metric`),
        `cadence=${cad} reading="${reading.split(".")[0]}"`,
      );
    }
    check(
      "the two axes are never collapsed under the word 'categories'",
      !/\d+ independent categories/.test(reading),
      reading.split(".")[0],
    );
  }

  group("Min-count floor");
  {
    // Rewritten 2026-08-04. This used `tricolon`, which has since been deleted
    // on corpus evidence (it fired on 92% of provably-human documents and 84% of
    // AI ones — see FN-2026-08-04-a). The floor it demonstrated is unaffected, so
    // the case is rebuilt on a severity-1 entry that survived.
    //
    // One occurrence in a short document reads as an enormous per-1000 density.
    // The floor exists so that a rate computed from a single event is never
    // treated as a rate.
    const doc = join(tmp, "short.md");
    writeFileSync(
      doc,
      `This is genuinely the only concern worth raising here.\n\n${"Filler sentence for length. ".repeat(20)}`,
    );
    const r = scan([doc, "--profile", "technical"]).results[0];
    const one = r.findings.find((f) => f.id === "genuinely");
    check("a single severity-1 hit is not flagged", one && one.flagged === false,
      `flagged=${one?.flagged} count=${one?.count}`);
    check("it is held by the floor, not by density", one?.held_by_floor === true);
    check("but it is still reported", Boolean(one), "suppressing it silently would be dishonest");
    check("short document is announced", r.summary.short_document === true);
  }

  /* ------------------------------------------------------------------ */
  group("Known exposure — a measurement that was true and nearly meaningless");
  {
    // `not-only-but-also` was widened to make `also` optional, and reported as
    // "0 false positives across the repo corpus". True, and close to worthless:
    // this repo is technical register and technical register does not reach for
    // the construction. In ordinary formal prose it is ordinary English.
    //
    // This asserts the exposure rather than pretending it away, in the same shape
    // as the ornate-register bias test: a check designed to keep FAILING is the
    // only kind that keeps a known limitation visible.
    const doc = join(tmp, "formal-notonly.txt");
    writeFileSync(
      doc,
      [
        "She was not only the first to arrive but the last to leave.",
        "The treaty was not only unpopular but unenforceable.",
        "He is not only a poet but a translator of some distinction.",
      ].join("\n\n"),
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "not-only-but-also");
    check(
      "the exposure is real: legitimate formal prose matches this entry",
      hit?.count === 3,
      `count=${hit?.count} — if this changed, re-measure and update the entry note`,
    );
    // And the thing that actually protects the author: density gating, not the
    // regex. One occurrence must never flag.
    const single = join(tmp, "formal-one.txt");
    writeFileSync(single, `${"The treaty was not only unpopular but unenforceable. ".repeat(1)}${"Filler sentence to give the document length. ".repeat(60)}\n`);
    const one = scan([single, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "not-only-but-also");
    check(
      "but one occurrence does not flag — the floor is what holds the line",
      one && one.flagged === false,
      `flagged=${one?.flagged} count=${one?.count}`,
    );
  }

  group("Mention-vs-use — accepted for style, never for Tier A");
  {
    // The two tiers get different rules, and the difference is the basis for
    // Tier A existing at all.
    //
    // STYLE entries are density-gated and mention-vs-use is accepted: a document
    // discussing `delve` gets flagged for it, that is logged as
    // FP-2026-07-26-f · ACCEPTED, and it is listed under Known limits rather than
    // engineered around. Forcing it to zero here would contradict the log.
    //
    // TIER A cannot take that deal. It claims near-zero false positives and
    // fires on a single occurrence, so one accepted false positive devalues every
    // Tier A finding anywhere. The documents most likely to quote a trigger are
    // this bundle's own — which is exactly where it happened: an earlier draft of
    // FN-2026-08-03-c quoted a chatbot phrase as plain prose and tripped it.
    //
    // The fix is to mark quoted triggers as inline code, which the masking layer
    // already removes before scanning. These are the prose files most likely to
    // discuss tells, so they are the ones worth guarding.
    for (const doc of ["CALIBRATION.md", "README.md", "PROFILES.md", "AGENTS.md"]) {
      const r = scan([join(BUNDLE, doc), "--profile", "technical"]).results[0];
      const tierA = r.findings.filter((f) => f.tier === "A");
      check(
        `${doc}: no Tier A artifact fires on a document about artifacts`,
        tierA.length === 0,
        tierA.map((f) => `${f.id}@L${f.lines?.[0]}`).join(",") + " — quote the trigger in backticks",
      );
    }
    // And the paired positive: masking is what makes that work, not luck.
    //
    // The probe uses a Tier A trigger deliberately. It used to use a chatbot
    // pleasantry, which left Tier A on 2026-08-04 — so the test would have
    // quietly started asserting nothing, passing because it found no Tier A
    // findings rather than because masking worked.
    const probe = join(tmp, "backticked.md");
    writeFileSync(probe, "Documenting the tell: `As an AI language model, I cannot` is the giveaway.\n");
    const masked = scan([probe, "--profile", "technical"]).results[0]
      .findings.filter((f) => f.tier === "A");
    check("a backticked trigger is masked, not matched", masked.length === 0,
      masked.map((f) => f.id).join(","));

    const bare = join(tmp, "bare.md");
    writeFileSync(bare, "Documenting the tell: As an AI language model, I cannot help.\n");
    const unmasked = scan([bare, "--profile", "technical"]).results[0]
      .findings.filter((f) => f.tier === "A");
    check("the same phrase unquoted still fires, so the guard is masking not blindness",
      unmasked.length > 0);
  }

  group("Provenance hygiene — every citation must resolve");
  {
    // This exists because a commit message claimed it existed before it did, and
    // the same pass that fixed one dangling citation asserted a safeguard that
    // had not been written. Both are the same failure: a claim nobody could
    // check.
    //
    // A catalog whose whole value is auditability cannot cite incidents that do
    // not exist, so this walks every FP-/FN-/TP- reference in the bundle and
    // requires a matching heading in CALIBRATION.md.
    //
    // Note for anyone extending this: do not write a literal example incident id
    // into a comment here. This check cannot tell mention from use — the same
    // limitation the catalog documents for `delve` — and it will flag your
    // example. That is the correct trade: the alternative is an exemption
    // mechanism that a real dangling citation could hide behind.
    const cal = readFileSync(join(BUNDLE, "CALIBRATION.md"), "utf8");
    const defined = new Set(
      [...cal.matchAll(/^###\s+((?:FP|FN|TP)-\d{4}-\d{2}-\d{2}-[a-z])\b/gm)].map((m) => m[1]),
    );
    check("CALIBRATION.md defines incidents", defined.size >= 6, `found ${defined.size}`);

    const searched = [
      join(SKILL, "profiles", "_base", "catalog.json"),
      join(BUNDLE, "README.md"),
      join(BUNDLE, "PROFILES.md"),
      join(BUNDLE, "AGENTS.md"),
      join(SKILL, "SKILL.md"),
      join(SKILL, "meta.yaml"),
      join(BUNDLE, "tests", "selftest.mjs"),
      // CALIBRATION.md checks ITSELF. Omitting it was the same overclaim in
      // miniature: the gate said "every reference in the bundle" while the file
      // most likely to cross-reference incidents was the one file exempt. Its
      // own `###` headings are the definitions, so they are skipped below.
      join(BUNDLE, "CALIBRATION.md"),
    ];
    const dangling = [];
    for (const f of searched) {
      const body = readFileSync(f, "utf8");
      const lines = body.split("\n");
      for (const [n, line] of lines.entries()) {
        if (/^###\s+(?:FP|FN|TP)-/.test(line)) continue; // a definition, not a reference
        for (const m of line.matchAll(/\b((?:FP|FN|TP)-\d{4}-\d{2}-\d{2}-[a-z])\b/g)) {
          if (!defined.has(m[1])) dangling.push(`${f.split("/").pop()}:${n + 1} -> ${m[1]}`);
        }
      }
    }
    check("no citation points at a nonexistent incident", dangling.length === 0, dangling.join("; "));
  }

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
  /* ------------------------------------------------------------------ */
  // The acceptance corpus: 44 documents nobody here wrote. Everything above
  // asks "does the code do what it says"; this asks "does what it says mean
  // anything". They are different questions, and the difference has already
  // cost this bundle twice — see CALIBRATION.md FN-2026-08-03-c and
  // FN-2026-08-04-a. Both of those defects passed every test above.
  group("Acceptance — measured against text this repo did not write");
  {
    const { results, summary } = runAcceptance();
    for (const r of results) check(r.name, r.ok, r.detail);
    if (summary) {
      const pct = (x) => `${(100 * x).toFixed(1)}%`;
      const [lo, hi] = summary.fpr_ci95;
      process.stdout.write(
        `       recall ${pct(summary.recall)} (${summary.ai.flagged}/${summary.ai.n})`
        + `   FPR ${pct(summary.fpr)} (${summary.human.flagged}/${summary.human.n},`
        + ` 95% CI ${pct(lo)}–${pct(hi)})\n`,
      );
    }
  }

  /* ------------------------------------------------------------------ */
  group("Relative report — \"is this me?\" against the author's own rates");

  {
    const rel = await import("../skills/tell-scan/tools/lib/relative.mjs");
    const { poissonAtLeast, relativeReport, authorRate, renderRelative } = rel;
    const { MIN_COUNT, THIN_COMPARISON } = rel;

    // A wrong tail makes every surprise wrong in the same direction, and would
    // look like a threshold needing tuning rather than arithmetic that is broken.
    check(
      "Poisson upper tail matches the closed form at k=1",
      Math.abs(poissonAtLeast(1, 1) - (1 - Math.exp(-1))) < 1e-12,
    );

    // THE REASON THIS MODULE USES POISSON AT ALL. A per-1k ratio on a short
    // draft is enormous for a single occurrence, so a ratio-based report flags
    // every short draft and the author learns to ignore it. If this fails, the
    // tool has started shouting at people for writing 400 words.
    const rates = { widget: { per_1k: 0.2, count: 8, in_samples: 5 } };
    const shortDraft = relativeReport({
      entryRates: rates,
      corpusWords: 40000,
      draftEntries: [{ id: "widget", count: 1, title: "widget" }],
      draftWords: 400,
    });
    check("one occurrence in a short draft is not a finding", shortDraft.surprises.length === 0);

    // The other direction, or the quietness above is indistinguishable from the
    // module doing nothing at all.
    const loaded = relativeReport({
      entryRates: rates,
      corpusWords: 40000,
      draftEntries: [{ id: "widget", count: 9, title: "widget" }],
      draftWords: 900,
    });
    check("a genuinely elevated count is reported", loaded.surprises.length === 1);
    check("a measured rate is labelled measured", loaded.surprises[0].basis === "measured");

    // A construction the corpus never contains is NOT rate zero. Zero asserts
    // "this author never does this" from silence, which is a claim about a
    // person the corpus cannot support. The rule-of-three bound needs MORE
    // evidence to flag, not less.
    const unseen = authorRate({}, "novel", 40000);
    check(
      "an unseen construction uses the rule-of-three bound, not zero",
      unseen.rate === 3 / 40000 && unseen.observed === false,
    );

    const unseenReport = relativeReport({
      entryRates: {},
      corpusWords: 40000,
      draftEntries: [{ id: "novel", count: 5, title: "novel" }],
      draftWords: 600,
    });
    check(
      "an unseen construction is labelled unseen, never measured",
      unseenReport.surprises[0] && unseenReport.surprises[0].basis === "unseen",
    );

    // Floor and test fail in opposite directions on purpose: two of anything
    // stays silent however improbable, because two of anything happens.
    const twoHits = relativeReport({
      entryRates: {},
      corpusWords: 400000,
      draftEntries: [{ id: "novel", count: MIN_COUNT - 1, title: "novel" }],
      draftWords: 5000,
    });
    check(
      "below the min-count floor nothing is claimed, however improbable",
      twoHits.surprises.length === 0,
    );

    // "Nothing unusual" after ONE comparison reads as "your draft is fine",
    // which is far larger than one comparison carries. Silence that sounds like
    // reassurance is the failure this project keeps rediscovering.
    const thin = renderRelative(
      { surprises: [], compared: 1, draftWords: 1300 },
      { corpusWords: 36096, samples: 12 },
    );
    check("a thin comparison does not report 'nothing unusual'", !/Nothing unusual/.test(thin));
    check("a thin comparison says what it could not check", /not a clean bill of health/.test(thin));

    const fat = renderRelative(
      { surprises: [], compared: THIN_COMPARISON + 3, draftWords: 1300 },
      { corpusWords: 36096, samples: 12 },
    );
    check("a real comparison does say nothing unusual", /Nothing unusual/.test(fat));

    // Three causes produce "outside your range" and the tool cannot tell them
    // apart. Phrased as a verdict it teaches authors to write blandly, which is
    // the exact damage this project exists to prevent.
    const spoken = renderRelative(
      {
        surprises: [{
          id: "w", title: "w", draftCount: 9, draftPer1k: 10, authorPer1k: 0.2,
          expected: 0.18, p: 0.0001, basis: "measured", corpusCount: 8, inSamples: 5,
        }],
        compared: 9, draftWords: 900,
      },
      { corpusWords: 36096, samples: 12 },
    );
    check("findings are framed as a question", /question, not a verdict/.test(spoken));
    check("the report names the innocent explanations", /writing something new/.test(spoken));
    check(
      "the report never says it does not sound like you",
      !/sound like you/i.test(spoken),
    );
  }


  /* ------------------------------------------------------------------ */
  group("Relative report — through the CLI, not just the module");

  {
    // The unit tests exercise relative.mjs directly. Nothing exercised the flag
    // through tell-scan.mjs itself, so a wiring mistake - a flag never parsed, a
    // refusal never reached, a renderer never called - would pass every test.
    const prof = join(tmp, "relcli", "profiles", "encyc", "corpus", "human");
    mkdirSync(prof, { recursive: true });
    const humanDir = join(REPO, "bundles", "prose-tell-scan", "tests", "corpus", "human");
    for (const f of readdirSync(humanDir).filter((x) => x.endsWith(".txt"))) {
      cpSync(join(humanDir, f), join(prof, f));
    }
    const root = join(tmp, "relcli");
    execFileSync("node", [CAL, "encyc", "--profiles-dir", join(root, "profiles"), "--project", root, "--write"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    const out = execFileSync("node", [
      SCAN, join(humanDir, "kenyatta-university.txt"), "--relative",
      "--profile", "encyc", "--profiles-dir", join(root, "profiles"), "--project", root,
    ], { encoding: "utf8" });
    check("--relative renders the 'is this me?' header", /is this me\?/.test(out));
    check("--relative reports against the corpus, not a severity class", /against your corpus/.test(out));
    check("--relative never says a draft does not sound like you", !/sound like you/i.test(out));

    // THE COLD-START REFUSAL, through the CLI. Without a corpus there is no
    // "you" to compare against, and answering from fallback bands would be a
    // confident, personal-sounding statement about nobody. It must exit non-zero
    // so a script cannot mistake the refusal for a clean result.
    let code = 0;
    let stderr = "";
    try {
      execFileSync("node", [SCAN, join(humanDir, "kenyatta-university.txt"), "--relative"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      code = err.status;
      stderr = String(err.stderr || "");
    }
    check("--relative without a corpus exits non-zero", code !== 0);
    check("and explains that there is no 'you' to compare against", /no calibrated corpus/.test(stderr));
  }


  /* ------------------------------------------------------------------ */
  group("Blend — approved samples influence catalog bands under the cap");

  {
    const root = join(tmp, "blend-real");
    const profile = join(root, "profiles", "essay");
    mkdirSync(join(profile, "corpus", "human"), { recursive: true });
    writeFileSync(join(profile, "profile.json"), '{"purpose": "test"}\n');
    writeFileSync(join(profile, "catalog.json"), JSON.stringify({
      version: "test", entries: [
        { id: "lake", label: "lake", kind: "lexical", category: "test",
          severity: 2, confidence: "high", pattern: "\\blake\\b" },
      ],
    }));
    for (let i = 1; i <= 12; i += 1) {
      writeFileSync(
        join(profile, "corpus", "human", `h${i}.txt`),
        `---\nsource: n\ndate: 2021-01-0${(i % 9) + 1}\nhuman_authored: true\n---\n`
        + `${"The lake was calm this morning and the birds sat still. ".repeat(20)}\n`,
      );
    }
    const origPath = join(root, "orig.txt");
    const editPath = join(root, "edit.txt");
    writeFileSync(origPath, "The lake was calm this morning. Fog sat on the water and did not move. ".repeat(30));
    writeFileSync(editPath, "The lake was still at dawn. Mist held above the water without stirring, and the far shore did not exist. ".repeat(20));
    execFileSync("node", [
      resolve(REPO, "bundles", "prose-author", "skills", "prose-draft", "tools", "ingest-edit.mjs"),
      editPath, "--original", origPath, "--profile", "essay",
      "--profiles-dir", join(root, "profiles"), "--project", root,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    const human = calibrate(["essay", "--profiles-dir", join(root, "profiles"), "--project", root]).derived;
    // A hard cap much smaller than what the sample would occupy naturally.
    const capped = calibrate(["essay", "--profiles-dir", join(root, "profiles"),
      "--project", root, "--cap", "0.02"]).derived;

    // Rule 2: cap constrains the SHARE of the blended pool. If the raw sample
    // would occupy more than the cap, it must be scaled DOWN. Silent
    // acceptance here would let approved dominate the pool despite the config.
    check("an approved sample participates when there is enough human corpus",
      human.approved.samples_used === 1);
    check("share tracks the cap when it binds",
      Math.abs(capped.approved.share_of_blended_pool - 0.02) < 1e-3);
    check("the scale is <1 when the cap binds", capped.approved.scale < 1);
    check("and =1 when it does not", human.approved.capped === false);

    // Rule 5: BOTH bands ship, every run. A consumer reads both with eyes open;
    // drift between them is visible. If either goes null when the other exists
    // and the corpus is calibrated, the whole side-by-side promise is broken.
    check("human catalog_density is present", human.catalog_density.medium !== undefined);
    check("blended catalog_density is present when approved contributes",
      human.catalog_density_blended && human.catalog_density_blended.medium !== undefined);

    // Rule 3, THE FIREWALL: cadence is untouched by blending. Verified by
    // measuring the exact same metric before adding approved (via --cap 0 gives
    // a scale of 0, effectively) and comparing.
    const capZero = calibrate(["essay", "--profiles-dir", join(root, "profiles"),
      "--project", root, "--cap", "0"]).derived;
    // A cap of 0 means share = 0 by construction. Cadence bands must not
    // differ between cap=0 and cap=0.2 EVER - they read only human samples.
    check("cadence bands are identical across cap values (cadence firewall)",
      JSON.stringify(capZero.metrics) === JSON.stringify(human.metrics));

    // Absurd cap gets clamped BELOW 0.5. The clamp lives in code, not config.
    const clamped = calibrate(["essay", "--profiles-dir", join(root, "profiles"),
      "--project", root, "--cap", "0.99"]).derived;
    check("a config cap above CAP_CLAMP is clamped, not honoured",
      clamped.approved.cap_applied < 0.5);

    // The reproducibility promise: from the checked-in samples + the reported
    // scale, ANY reader can reproduce the applied_weighted_words. If this drifts
    // the "auditable" claim in the docs is a lie.
    const expected = human.approved.samples.reduce(
      (a, s) => a + s.edit_fraction * human.approved.scale
        * (human.approved.raw_weighted_words / human.approved.samples.reduce(
          (a2, s2) => a2 + s2.edit_fraction * s2.words, 0) === 0
          ? 0 : s.words * (human.approved.raw_weighted_words / human.approved.samples.reduce(
            (a2, s2) => a2 + s2.edit_fraction * s2.words, 0))),
      0,
    );
    void expected;  // The direct check below is cleaner.
    const recomputedApplied = human.approved.samples
      .reduce((a, s) => a + s.applied_weight * s.words, 0);
    check("applied weight is reproducible from the recorded fields",
      Math.abs(recomputedApplied - human.approved.applied_weighted_words) < 1);
  }

  /* ------------------------------------------------------------------ */
  group("The loop closes — an approved edit changes what the scanner reports");

  {
    // THE TEST THIS WHOLE MECHANISM EXISTS FOR, and until now nothing asserted
    // it end to end.
    //
    // calibrate.mjs has written `catalog_density_blended` since the blend
    // shipped, and tell-scan.mjs read `catalog_density` (human-only). So the
    // path was: ingest an edit, compute its edit_fraction, blend it under the
    // cap, write both band sets - and change no output anywhere. The user's
    // stated goal is that their kept edits tune the engine toward their voice.
    // With the consumer missing, that was unobservable.
    //
    // WHAT BREAKS IF THIS REGRESSES: the flywheel silently reopens. Every part
    // keeps passing its own unit test, the JSON still carries both bands, and
    // an author's accumulated corpus stops affecting a single reported verdict.
    // That is the failure mode nothing else here can see, because every
    // component is individually correct.
    const root = join(tmp, "loop-closes");
    const profile = join(root, "profiles", "essay");
    const profilesDir = join(root, "profiles");
    mkdirSync(join(profile, "corpus", "human"), { recursive: true });
    writeFileSync(join(profile, "profile.json"), '{"purpose": "test"}\n');
    writeFileSync(join(profile, "catalog.json"), JSON.stringify({
      version: "test", entries: [
        { id: "lake", label: "lake", kind: "lexical", category: "test",
          severity: 2, confidence: "high", pattern: "\\blake\\b" },
      ],
    }));

    // Human corpus: dense in the catalogued word - one "lake" per ~11 words.
    for (let i = 1; i <= 12; i += 1) {
      writeFileSync(
        join(profile, "corpus", "human", `h${i}.txt`),
        `---\nsource: n\ndate: 2021-01-0${(i % 9) + 1}\nhuman_authored: true\n---\n`
        + `${"The lake was calm this morning and the birds sat still. ".repeat(20)}\n`,
      );
    }

    // --write, because a dry run reports bands without persisting them and the
    // scanner reads the persisted file. Omitting it made the whole loop test
    // silently measure the shipped FALLBACK ceilings instead of either derived
    // band set - two identical numbers, no flip, and a green "cadence unchanged"
    // that was unchanged because nothing was calibrated at all.
    const humanOnly = calibrate(["essay", "--profiles-dir", profilesDir, "--project", root, "--write"]).derived;

    // Now the author edits a draft and keeps it. The kept text uses the
    // catalogued word at roughly HALF the density of their unaided corpus, so
    // blending it must pull the ceiling DOWN.
    const origPath = join(root, "orig.txt");
    const editPath = join(root, "edit.txt");
    writeFileSync(origPath, "The lake was calm this morning. Fog sat on the water and did not move. ".repeat(30));
    writeFileSync(editPath, "The lake was still at dawn. Mist held above the water without stirring, and the far shore did not exist. ".repeat(20));
    execFileSync("node", [
      resolve(REPO, "bundles", "prose-author", "skills", "prose-draft", "tools", "ingest-edit.mjs"),
      editPath, "--original", origPath, "--profile", "essay",
      "--profiles-dir", profilesDir, "--project", root,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    const blended = calibrate(["essay", "--profiles-dir", profilesDir, "--project", root, "--write"]).derived;

    // Step 1: calibrate produced a genuinely different ceiling. Without this the
    // rest of the test proves nothing - two identical numbers cannot show a flip.
    check("ingesting an edit changes the blended catalog ceiling",
      typeof blended.catalog_density_blended?.medium === "number"
      && blended.catalog_density_blended.medium !== humanOnly.catalog_density.medium,
      `human ${humanOnly.catalog_density.medium} vs blended ${blended.catalog_density_blended?.medium}`);

    // Step 2: THE FLIP. A draft whose density sits between the two ceilings is
    // judged differently depending on which band set is used. This is the loop
    // being closed, expressed as a verdict a user would actually see.
    const hi = humanOnly.catalog_density.medium;
    const lo = blended.catalog_density_blended.medium;
    const [tight, loose] = lo < hi ? [lo, hi] : [hi, lo];

    // Build the draft to an EXACT density between the two ceilings.
    //
    // The obvious construction - repeat a sentence with one "lake" every N words
    // - cannot hit this window. Density moves in steps of 1000/N, so at ~11 words
    // per occurrence the available rates jump 90.9 -> 83.3 and step clean over a
    // gap of 3. A long document with an exact count is the only way to land
    // inside a narrow band, and the band is narrow precisely because one approved
    // sample against twelve human ones is a small nudge - which is the mechanism
    // working as designed, not a fixture inconvenience.
    const totalWords = 4000;
    const target = (tight + loose) / 2;
    const lakes = Math.round((target * totalWords) / 1000);
    const density = (1000 * lakes) / totalWords;

    // Assert the fixture before asserting the behaviour. If a future band change
    // makes the window unreachable, this fails saying so, rather than the verdict
    // check failing for a reason that looks like a regression in the scanner.
    check("the draft's density sits strictly between the two ceilings",
      density > tight && density < loose,
      `density ${density} not inside (${tight}, ${loose})`);

    const filler = "and the quiet water held morning light without moving much at all".split(" ");
    const tokens = [];
    for (let i = 0; i < totalWords; i += 1) tokens.push(filler[i % filler.length]);
    // Spread the occurrences evenly rather than clustering them, so paragraph
    // masking or a sentence-level heuristic cannot change the count.
    for (let i = 0; i < lakes; i += 1) tokens[Math.floor((i * totalWords) / lakes)] = "lake";
    const draftPath = join(root, "draft.txt");
    writeFileSync(draftPath, `${tokens.join(" ")}\n`);

    const args = [draftPath, "--profile", "essay", "--profiles-dir", profilesDir, "--project", root];
    const withBlend = scan(args).results[0];
    const withHuman = scan([...args, "--human-only"]).results[0];

    const lakeIn = (r) => r.findings.find((f) => f.id === "lake");
    check("the scan reports which band set it judged against",
      withBlend.profile.bands.used === "blended" && withHuman.profile.bands.used === "human-only");
    check("the ceiling applied to a finding differs between them",
      lakeIn(withBlend).ceiling !== lakeIn(withHuman).ceiling,
      `${lakeIn(withBlend).ceiling} vs ${lakeIn(withHuman).ceiling}`);
    check("and the same draft flips verdict on the strength of a kept edit",
      lakeIn(withBlend).flagged !== lakeIn(withHuman).flagged,
      `blended flagged=${lakeIn(withBlend).flagged}, human flagged=${lakeIn(withHuman).flagged}, `
      + `density=${lakeIn(withBlend).per_1k} between ${tight} and ${loose}`);

    // Step 3: RULE 3, the firewall. Blending touches catalog density and NEVER
    // cadence. A generation whose rhythm was right was right BECAUSE it matched
    // the human corpus that set the band; blending there lets the ceiling
    // confirm itself. Same draft, same cadence verdicts, either way.
    check("cadence checks are identical under both band sets",
      JSON.stringify(withBlend.cadenceChecks) === JSON.stringify(withHuman.cadenceChecks));

    // Step 4: the blend is disclosed, not silent. A ceiling derived partly from
    // model-assisted text is a different claim from one derived from unaided
    // prose, and a reader who cannot tell which has been handed a measurement
    // wearing the wrong label.
    check("the blend is disclosed with its sample count",
      withBlend.profile.bands.blend_available === true
      && withBlend.profile.bands.approved_samples === 1);
    check("both band sets are carried in the result, not just the chosen one",
      typeof withBlend.profile.bands.human.medium === "number"
      && typeof withBlend.profile.bands.blended.medium === "number");
  }

  {
    // THE NARROWING WARNING MUST REACH A HUMAN.
    //
    // calibrate computes it, writes it to thresholds.derived.json, and for a
    // while nothing read the file - so the safety signal against voice collapse
    // existed only as a string in JSON nobody opened. Wiring the scanner to the
    // blend fixed that, except the first version read
    // `thresholds.approved.blended_warning` when calibrate writes
    // `blended_warning` at the TOP level of the derived object. Permanently
    // undefined. The exact bug the wiring sprint existed to fix, reintroduced
    // one field name deep inside the fix, and invisible because null renders as
    // "no warning" rather than as an error.
    //
    // WHAT BREAKS IF THIS REGRESSES: an author whose approved pool is quietly
    // dragging their bands tighter than their own writing gets no signal, keeps
    // feeding it, and the tool teaches them to write blander while reporting
    // that everything is fine. That is the outcome this project exists to
    // prevent, and the warning is the only thing watching for it.
    const root = join(tmp, "blend-narrowing");
    const profile = join(root, "profiles", "essay");
    const profilesDir = join(root, "profiles");
    mkdirSync(join(profile, "corpus", "human"), { recursive: true });
    mkdirSync(join(profile, "corpus", "approved"), { recursive: true });
    writeFileSync(join(profile, "profile.json"), '{"purpose": "test"}\n');
    writeFileSync(join(profile, "catalog.json"), JSON.stringify({
      version: "test", entries: [
        { id: "lake", label: "lake", kind: "lexical", category: "test",
          severity: 2, confidence: "high", pattern: "\\blake\\b" },
      ],
    }));
    for (let i = 1; i <= 12; i += 1) {
      writeFileSync(
        join(profile, "corpus", "human", `h${i}.txt`),
        `---\nsource: n\ndate: 2021-01-0${(i % 9) + 1}\nhuman_authored: true\n---\n`
        + `${"The lake was calm this morning and the birds sat still. ".repeat(20)}\n`,
      );
    }
    // An approved sample containing NONE of the catalogued word. Pooled counts
    // stay put while pooled words grow, so the rate - and the ceiling derived
    // from it - falls. This is the arithmetic of voice collapse: the author's
    // own natural density starts sitting above their own band.
    writeFileSync(
      join(profile, "corpus", "approved", "a1.txt"),
      "---\nsource: draft\ndate: 2026-01-01\nhuman_authored: false\nedit_fraction: 1\n---\n"
      + `${"Mist held above the water without stirring and the far shore was gone. ".repeat(160)}\n`,
    );

    // --cap 0.35 rather than the 0.2 default, and the reason is worth recording:
    // at share s the rate scales by (1 - s), and the warning fires below 0.8, so
    // the DEFAULT CAP CANNOT TRIGGER IT - 0.2 lands exactly on the boundary. The
    // warning is only reachable for a user who has raised the cap, which is also
    // the user most likely to need it.
    const derived = calibrate(["essay", "--profiles-dir", profilesDir, "--project", root,
      "--cap", "0.35", "--write"]).derived;

    check("a blend that narrows the human ceiling produces a warning",
      typeof derived.blended_warning === "string" && derived.blended_warning.length > 0,
      `blended_warning=${JSON.stringify(derived.blended_warning)}`);

    const draftPath = join(root, "draft.txt");
    writeFileSync(draftPath, `${"The lake was calm this morning and the birds sat still. ".repeat(20)}\n`);
    const args = [draftPath, "--profile", "essay", "--profiles-dir", profilesDir, "--project", root];
    const r = scan(args).results[0];

    check("and the scan result carries it, at the field name calibrate writes",
      typeof r.profile.bands.warning === "string" && r.profile.bands.warning.length > 0,
      `bands.warning=${JSON.stringify(r.profile.bands.warning)}`);

    // The whole point is that a person sees it. JSON is not a person.
    const rendered = execFileSync("node", [SCAN, ...args], { encoding: "utf8" });
    check("and a human reading the report sees it, not just --json",
      /BLENDED BANDS NARROWED/.test(rendered) && /voice collapse/.test(rendered),
      rendered.split("\n").filter((l) => /NARROW|collapse/.test(l)).join(" | "));
  }

  {
    // Cold start (RULE 4): below CORPUS_MINIMUM, approved contributes zero and
    // says so. Otherwise the cold-start path is: fill approved/ with model
    // output, calibrate against model norms on day one, never find out.
    const root = join(tmp, "blend-cold");
    const profile = join(root, "profiles", "essay");
    mkdirSync(join(profile, "corpus", "human"), { recursive: true });
    mkdirSync(join(profile, "corpus", "approved"), { recursive: true });
    writeFileSync(join(profile, "profile.json"), '{"purpose": "test"}\n');
    writeFileSync(join(profile, "catalog.json"), '{"version":"t","entries":[]}\n');
    for (let i = 1; i <= 5; i += 1) {
      writeFileSync(
        join(profile, "corpus", "human", `h${i}.txt`),
        `---\nsource: n\ndate: 2021-01-0${i}\nhuman_authored: true\n---\n${"word ".repeat(400)}\n`,
      );
    }
    writeFileSync(
      join(profile, "corpus", "approved", "a1.txt"),
      `---\nsource: d\ndate: 2026-01-01\nhuman_authored: false\nedit_fraction: 0.8\n---\n${"word ".repeat(400)}\n`,
    );
    const r = calibrate(["essay", "--profiles-dir", join(root, "profiles"), "--project", root]).derived;
    check("below the human floor, approved samples DO NOT count",
      r.approved.samples_used === 0 && r.approved.suppressed === true);
    check("and the suppression reason names the floor",
      /before approved.* counts/.test(r.approved.suppression_reason || ""));
  }

  {
    // Malformed approved samples are excluded, not defaulted. Rule 1: ef is
    // computed by ingest, so a missing/bad value means something bypassed
    // ingest - that file is not evidence and does not get a placeholder weight.
    const root = join(tmp, "blend-malformed");
    const profile = join(root, "profiles", "essay");
    mkdirSync(join(profile, "corpus", "human"), { recursive: true });
    mkdirSync(join(profile, "corpus", "approved"), { recursive: true });
    writeFileSync(join(profile, "profile.json"), '{"purpose": "test"}\n');
    writeFileSync(join(profile, "catalog.json"), '{"version":"t","entries":[]}\n');
    for (let i = 1; i <= 12; i += 1) {
      writeFileSync(
        join(profile, "corpus", "human", `h${i}.txt`),
        `---\nsource: n\ndate: 2021-01-0${(i % 9) + 1}\nhuman_authored: true\n---\n${"word ".repeat(400)}\n`,
      );
    }
    // No edit_fraction at all
    writeFileSync(
      join(profile, "corpus", "approved", "no-ef.txt"),
      `---\nsource: d\ndate: 2026-01-01\nhuman_authored: false\n---\n${"word ".repeat(400)}\n`,
    );
    // Out-of-range edit_fraction
    writeFileSync(
      join(profile, "corpus", "approved", "out-of-range.txt"),
      `---\nsource: d\ndate: 2026-01-01\nhuman_authored: false\nedit_fraction: 1.5\n---\n${"word ".repeat(400)}\n`,
    );
    const r = calibrate(["essay", "--profiles-dir", join(root, "profiles"), "--project", root]).derived;
    check("malformed approved samples are excluded", r.approved.samples_used === 0);
    check("and the exclusion lists what and why", r.approved.excluded.length === 2);
  }


  /* ------------------------------------------------------------------ */

  /**
   * Disk-vs-manifest-vs-frontmatter integrity for one vendored corpus
   * directory.
   *
   * WHY IT IS A FUNCTION AND NOT A THIRD COPY. The same three questions get
   * asked of every bucket - is every file accounted for in both directions,
   * does every file carry the provenance calibrate.mjs reads, is every file
   * long enough to teach a cadence. Hand-retyping them is where they drift,
   * and this one already had a hole worth not reproducing: `\nsource:\s+`
   * accepts an EMPTY value, because `\s` matches the line break and the `\S`
   * lands on the next field's name. A negative test caught it on a blank
   * `author:` field. Anchored per line here, it is fixed in one place.
   *
   * Bucket-SPECIFIC rules stay at the call site - which authors are licensed,
   * whether the bucket is single- or multi-author, what boilerplate its
   * parser must not leak. Those are the facts that distinguish the buckets,
   * so sharing them would defeat the point of having separate buckets.
   */
  function corpusIntegrity({ label, dir, manifestFiles, manifestName, floor }) {
    const files = readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
    const diskFiles = new Set(files);
    const attrFiles = new Set(manifestFiles);
    const orphans = [...diskFiles].filter((f) => !attrFiles.has(f));
    const missing = [...attrFiles].filter((f) => !diskFiles.has(f));
    check(`${label}every sample on disk is in ${manifestName}`,
      orphans.length === 0, orphans.length ? `orphans: ${orphans.slice(0, 3).join(", ")}` : "");
    check(`${label}every entry in ${manifestName} is on disk`,
      missing.length === 0, missing.length ? `missing: ${missing.slice(0, 3).join(", ")}` : "");

    // Provenance discipline: each file must attest human_authored and carry
    // the source/date the calibrator needs. A file that fails this is one
    // calibrate.mjs would silently exclude, so it would look present in the
    // manifest and absent to the tool.
    let badFrontmatter = 0;
    let underFloor = 0;
    for (const f of files) {
      const raw = readFileSync(join(dir, f), "utf8");
      if (!/^---\n[\s\S]*?human_authored:\s*true[\s\S]*?\n---\n/.test(raw)) badFrontmatter += 1;
      if (!/^source:[ \t]+\S/m.test(raw)) badFrontmatter += 1;
      if (!/^date:[ \t]+\S/m.test(raw)) badFrontmatter += 1;
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
      if (body.split(/\s+/).filter(Boolean).length < floor) underFloor += 1;
    }
    check(`${label}every sample attests human_authored: true with source + date`,
      badFrontmatter === 0, `${badFrontmatter} field(s) missing`);
    check(`${label}no sample is below the ${floor}-word calibration floor`,
      underFloor === 0, `${underFloor} under floor`);
    return files;
  }

  group("human-essays — the vendored PD essay corpus");

  {
    // THE INTEGRITY CHECK. Files in tests/corpus/human-essays/ are vendored
    // from Project Gutenberg by fetch-essays.mjs. They are committed, which
    // means they can drift silently (someone edits a file by hand and the
    // ATTRIBUTION count no longer matches, or the frontmatter breaks and
    // calibrate.mjs would exclude the file without saying so). Every check
    // here answers "does the committed corpus still match what its manifest
    // says". It does NOT re-fetch; that is fetch-essays.mjs's job.

    const dir = resolve(REPO, "bundles", "prose-tell-scan", "tests", "corpus", "human-essays");
    const gutenbergDir = join(dir, "gutenberg");

    if (!existsSync(gutenbergDir)) {
      check("human-essays/gutenberg/ is present", false, "run fetch-essays.mjs --write");
    } else {
      const attrPath = join(dir, "ATTRIBUTION.json");
      const attr = JSON.parse(readFileSync(attrPath, "utf8"));
      corpusIntegrity({
        label: "gutenberg: ",
        dir: gutenbergDir,
        manifestFiles: attr.essays.map((e) => e.file.replace(/^gutenberg\//, "")),
        manifestName: "ATTRIBUTION.json",
        floor: 200,
      });

      // Provenance recorded once (in fetch-essays.mjs) and quoted here so a
      // silent addition of a source without permissive licensing gets caught.
      // If a new source is added, this test fails until it lands in the list.
      const authors = new Set(attr.essays.map((e) => e.author));
      // Public-domain authors approved for this corpus. Adding a name here
      // requires the added author to be genuinely public-domain (author died
      // >70 years ago in most jurisdictions, or the work was published pre-
      // 1930). Chekhov died 1904; the Constance Garnett translation appeared
      // in 1920. Both PD. Chopin died 1904 and The Awakening is 1899; O.
      // Henry (William Sydney Porter) died 1910 and The Four Million is 1906
      // - each clears both grounds. Full table in human-essays/LICENSE.
      const expected = new Set([
        "Francis Bacon", "G. K. Chesterton", "Anton Chekhov",
        "Kate Chopin", "O. Henry",
      ]);
      const surprise = [...authors].filter((a) => !expected.has(a));
      check(
        "no unrecognised author entered the corpus (add to the expected set with license justification)",
        surprise.length === 0, `unrecognised: ${surprise.join(", ")}`,
      );

      // WHAT MAKES A DIRECTORY A VOICE CORPUS. human-essays/ is the
      // single-author set, and everything that reasons about voice - band
      // calibration, the cross-author authorship test - assumes each author
      // here has enough samples to characterise a cadence rather than a mood.
      // An author who lands with three essays satisfies every other check on
      // this page and quietly breaks that assumption, so the floor is checked
      // rather than trusted to whoever adds the next fetcher.
      const perAuthor = new Map();
      for (const e of attr.essays) perAuthor.set(e.author, (perAuthor.get(e.author) ?? 0) + 1);
      const thin = [...perAuthor].filter(([, n]) => n < 15);
      check(
        "every gutenberg author clears the 15-sample single-author floor",
        thin.length === 0,
        thin.map(([a, n]) => `${a}: ${n}`).join(", "),
      );
    }

    // Second, the pluralistic tranche - CC-BY 4.0 not PD, so it lives in a
    // separate subdirectory with its own attribution manifest.
    const pluralisticDir = join(dir, "pluralistic");
    const modernAttrPath = join(dir, "ATTRIBUTION.modern.json");
    if (existsSync(pluralisticDir) && existsSync(modernAttrPath)) {
      const attr = JSON.parse(readFileSync(modernAttrPath, "utf8"));
      const files = corpusIntegrity({
        label: "pluralistic: ",
        dir: pluralisticDir,
        manifestFiles: attr.posts.map((p) => p.file.replace(/^pluralistic\//, "")),
        manifestName: "ATTRIBUTION.modern.json",
        floor: 500,
      });

      // THE PARSER GUARD. pluralistic post bodies must not leak the trailing
      // license notice, the BOGUS AGREEMENTS legal boilerplate, or the ISSN
      // footer - the fetcher's job is to strip them. A vendored body that
      // contains any of those anchors is evidence the extractor missed them,
      // and the corpus is now training a critic on the wrong prose.
      let leaked = [];
      for (const f of files) {
        const raw = readFileSync(join(pluralisticDir, f), "utf8");
        const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
        for (const anchor of ["Creative Commons Attribution", "BOGUS AGREEMENTS", /ISSN:\s*\d/]) {
          const found = typeof anchor === "string" ? body.includes(anchor) : anchor.test(body);
          if (found) leaked.push(`${f}: ${anchor}`);
        }
      }
      check("pluralistic: no vendored body leaks the license notice, BOGUS AGREEMENTS, or ISSN",
        leaked.length === 0, leaked.length ? leaked.slice(0, 3).join("; ") : "");

      check("pluralistic: license is CC-BY 4.0",
        attr.license === "CC-BY 4.0" && /creativecommons\.org.licenses.by.4\.0/.test(attr.license_url));

      // Same author-set guard: adding a new author fails the build until it is
      // acknowledged with a license justification here.
      //
      // THIS GUARD COULD NOT FAIL AND NOW CAN. It previously read
      // `attr.posts.map((p) => p.file).map(() => "Cory Doctorow")` - it mapped
      // every entry to the constant it then asserted, so it passed on any
      // corpus, including an empty one or one full of somebody else. The CC-BY
      // grant here is Doctorow's personal licence on his own posts, not a
      // site-wide grant, so "who wrote this" IS the licence-bearing fact and
      // the check has to read it from the files. The manifest has no author
      // field, so the frontmatter is the source of truth.
      const bylines = new Set(files.map((f) => {
        const m = readFileSync(join(pluralisticDir, f), "utf8").match(/^author:[ \t]+(.+)$/m);
        return m ? m[1].trim() : "(unbylined)";
      }));
      const expected = new Set(["Cory Doctorow"]);
      const surprise = [...bylines].filter((a) => !expected.has(a));
      check("pluralistic: no unrecognised author (add with license justification)",
        surprise.length === 0 && bylines.size === 1, `found: ${[...bylines].join(", ")}`);
    }
  }


  /* ------------------------------------------------------------------ */
  group("human-professional — the CC-BY multi-author register corpus");

  {
    // EFF Deeplinks, vendored by fetch-professional.mjs. Same integrity
    // discipline as human-essays/, with one guard inverted, and the inversion
    // is the point of the directory.
    //
    // human-essays/ guards that no UNRECOGNISED AUTHOR appears, because there
    // the author is the licence-bearing fact. Here the licence attaches to the
    // SITE - EFF grants CC-BY over all original material on eff.org - and the
    // bylines are staff who rotate. So the drift guard follows the licence:
    // every sample must come from eff.org. An author-name allowlist would fail
    // on the next new hire while passing a post silently pulled from
    // somewhere else, which is precisely backwards.

    const dir = resolve(REPO, "bundles", "prose-tell-scan", "tests", "corpus", "human-professional");
    const attrPath = join(dir, "ATTRIBUTION.json");

    if (!existsSync(dir) || !existsSync(attrPath)) {
      check("human-professional/ is present", false, "run fetch-professional.mjs --write");
    } else {
      const attr = JSON.parse(readFileSync(attrPath, "utf8"));
      const files = corpusIntegrity({
        label: "eff: ",
        dir,
        manifestFiles: attr.posts.map((p) => p.file),
        manifestName: "ATTRIBUTION.json",
        floor: 200,
      });

      check("license is CC-BY 4.0 with the grant quoted, not summarised",
        attr.license === "CC-BY 4.0"
        && /creativecommons\.org.licenses.by.4\.0/.test(attr.license_url)
        && /eff\.org\/copyright/.test(attr.license_evidence ?? ""));

      // THE SOURCE GUARD - this directory's equivalent of the author guard.
      const offSite = attr.posts.filter((p) => !/^https:\/\/www\.eff\.org\//.test(p.permalink));
      check("every post's permalink is on eff.org (the site the CC-BY grant covers)",
        offSite.length === 0, offSite.slice(0, 3).map((p) => p.permalink).join(", "));

      // The byline is checked separately from the shared frontmatter pass
      // because here it is a LICENSING requirement, not a metadata one: CC-BY
      // is an attribution licence, and a sample with no named author cannot
      // be redistributed in compliance with it. Folding it into a generic
      // "fields missing" count would bury that.
      //
      // `[ \t]+` and not `\s+`: \s matches newlines, so `author:` with an
      // EMPTY value satisfies `\nauthor:\s+\S` by running past the line break
      // and matching the first character of the next field. The negative test
      // for this guard caught it doing exactly that - an empty byline passed.
      let unbylined = 0;
      for (const f of files) {
        const raw = readFileSync(join(dir, f), "utf8");
        if (!/^author:[ \t]+\S/m.test(raw)) unbylined += 1;
      }
      check("every post names its author (CC-BY compliance, not just tidiness)",
        unbylined === 0, `${unbylined} unbylined`);

      // THE MISFILING GUARD. The danger with this directory is not that it
      // rots - it is that someone reads 50 samples of consistent house style
      // and points a voice test at it. That test would report a confident
      // measurement of an author who does not exist, and nothing else in this
      // suite would object. Two facts have to stay true for the directory to
      // mean what its LICENSE says: the manifest declares itself multi-author,
      // and no single byline reaches the 15-sample floor that would make it a
      // voice corpus in fact whatever the manifest says.
      check("the manifest declares itself multi-author",
        attr.multi_author === true);

      const perAuthor = new Map();
      for (const p of attr.posts) perAuthor.set(p.author, (perAuthor.get(p.author) ?? 0) + 1);
      const wouldBeVoice = [...perAuthor].filter(([, n]) => n >= 15);
      check(
        "no single byline reaches the 15-sample floor (this is register coverage, not a voice corpus)",
        wouldBeVoice.length === 0,
        wouldBeVoice.map(([a, n]) => `${a}: ${n} — decide deliberately where this belongs`).join(", "),
      );
      check("and it really is many hands, not one author under a site name",
        perAuthor.size >= 5, `${perAuthor.size} distinct authors`);
    }
  }

} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/* ================================================================== */
/* prose-pattern-critic — the one primitive here that is not a script */
/* ================================================================== */

group("prose-pattern-critic — primitive/bundle parity");

{
  // AGENTS.md rule 1: the rendered agent's body must be byte-identical to the
  // primitive's, and there is no generator, so this is maintained by hand. A drifted
  // pair silently ships two different agents under one name - the class of failure
  // nobody notices by reading. Copied deliberately from prose-review's selftest:
  // a bundle that cannot be installed alone is not a bundle, so the check lives here
  // rather than being imported from over there.
  const body = (url) => readFileSync(url, "utf8").split(/^---$/m).slice(2).join("---");

  /**
   * Mapping keys under `unowned_by_decision:` — patterns measured OUT of the
   * critic's scope, each recorded with a reason and an overturn condition.
   *
   * Stops at the first line indented less than the entries, so an adjacent block
   * cannot leak in. An earlier version ran past the comment into
   * `boundary_with_spec_only:` and silently asserted things about
   * `prose-substance-critic`, which is not a catalog pattern at all - a guard
   * reading the wrong keys passes for the wrong reason, which is worse than failing.
   */
  const unownedByDecision = (meta) => {
    const block = (meta.match(/^\s{2}unowned_by_decision:\n([\s\S]*?)(?=^\s{0,2}\S|$)/m) || [, ""])[1];
    return (block.match(/^\s{4}([a-z][a-z-]+):/gm) || []).map((l) => l.trim().replace(/:$/, ""));
  };

  const name = "prose-pattern-critic";
  const primitive = new URL(`../../../primitives/agents/${name}/agent.md`, import.meta.url);
  const rendered = new URL(`../agents/${name}.md`, import.meta.url);
  const meta = readFileSync(new URL(`../../../primitives/agents/${name}/meta.yaml`, import.meta.url), "utf8");

  // A HELD primitive: authored in primitives/, deliberately absent from bundles/.
  // The gap between the two IS the hold, so the parity checks below cannot run and
  // must not silently pass either.
  //
  // The declaration is required. Without it, "no rendered copy" is indistinguishable
  // from "somebody forgot to render it" - and a primitive that silently stops
  // shipping is exactly as bad as one that silently ships. So: absent + declared is
  // a hold, absent + undeclared is a failure, and present + `ships: false` is also a
  // failure, because a held primitive that is sitting in the deployment directory is
  // being installed by everyone who installs the bundle.
  const held = /^ships:\s*false\b/m.test(meta);
  const renderedExists = existsSync(rendered);

  check(`${name}: a primitive with no rendered copy declares ships: false with a reason`,
    renderedExists || (held && /^held_reason:\s*\S/m.test(meta)));
  check(`${name}: a held primitive is absent from the bundle's agents/ directory`,
    !held || !renderedExists);

  if (!renderedExists) {
    skip(`${name}: primitive/bundle parity`, "held — no rendered copy by design");
  } else {

  check(`${name}: rendered body is byte-identical to the primitive`,
    body(primitive) === body(rendered));

  const fm = (url) => Object.fromEntries(readFileSync(url, "utf8").split(/^---$/m)[1]
    .split("\n").filter((l) => l.includes(":"))
    .map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  const [pf, rf] = [fm(primitive), fm(rendered)];
  check(`${name}: primitive frontmatter carries only name + description`,
    JSON.stringify(Object.keys(pf).sort()) === JSON.stringify(["description", "name"]),
    Object.keys(pf).join(","));
  check(`${name}: rendered name and description match the primitive`,
    pf.name === rf.name && pf.description === rf.description);
  check(`${name}: rendered frontmatter adds only tools/model/color`,
    Object.keys(rf).every((k) => ["name", "description", "tools", "model", "color"].includes(k)),
    Object.keys(rf).join(","));

  }

  // SCOPE CHECKS RUN WHETHER OR NOT IT SHIPS. The prompt's scope IS a data file: if a
  // `not_deterministic` key is added to the catalog and the prompt is not updated,
  // the critic silently stops covering it - the exact failure the catalog's own
  // `_about` block warns about. A held primitive is still being edited, and a hold
  // that switched off its own correctness checks would rot in the dark and come back
  // wrong.
  const catalogKeys = Object.keys(JSON.parse(readFileSync(
    new URL("../skills/tell-scan/profiles/_base/catalog.json", import.meta.url), "utf8"),
  ).not_deterministic).filter((k) => k !== "_about");
  const declared = [
    ...(meta.match(/^\s+- ([a-z-]+)\s*(?:#.*)?$/gm) || []).map((l) => l.trim().replace(/^- /, "").replace(/\s+#.*/, "")),
    // THIRD BUCKET: `unowned_by_decision`, whose entries are mapping keys rather
    // than list items because each carries a reason and an overturn condition.
    // A pattern measured out of the critic's scope is still *accounted for* - that
    // is the whole point of recording it - so it satisfies this check. What it must
    // not do is disappear: a key in no bucket at all still fails, which is the case
    // this guard exists for.
    ...unownedByDecision(meta),
  ];
  const unaccounted = catalogKeys.filter((k) => !declared.includes(k));
  check(`${name}: every not_deterministic key is owned, disowned, or recorded unowned`,
    unaccounted.length === 0, unaccounted.join(","));

  // The scope drop has to be visible in the PROMPT, not only in metadata. A critic
  // whose meta.yaml disclaims a pattern while its instructions still list it will
  // keep flagging that pattern, and the metadata becomes documentation of a fiction.
  const promptBody = readFileSync(
    new URL(`../../../primitives/agents/${name}/agent.md`, import.meta.url), "utf8");
  for (const k of unownedByDecision(meta)) {
    check(`${name}: prompt states ${k} is NOT a finding`,
      new RegExp(`##\\s*What is NOT a finding[\\s\\S]*${k}`).test(promptBody));
  }
  check(`${name}: meta.yaml disowns no-voice-shift (prose-voice-critic item 5 owns it)`,
    /does_not_own:[\s\S]*no-voice-shift/.test(meta));
}

group("prose-pattern-critic — fixtures");

{
  const dir = new URL("fixtures/pattern/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("fixtures.json", dir), "utf8"));

  const onDisk = readdirSync(new URL(".", dir), { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const declared = manifest.fixtures.map((f) => f.name).sort();
  // A fixture on disk but not in the manifest is one whose expected verdict nobody
  // wrote down, and it would be silently absent from the harness denominator - the
  // direction that flatters a result.
  check("every pattern fixture directory is declared in fixtures.json",
    JSON.stringify(onDisk) === JSON.stringify(declared),
    `disk=${onDisk.length} manifest=${declared.length}`);

  // THE ANTI-TUNING CHECK, and it is the whole reason the drafts are built rather
  // than written. Re-apply the declared edits to the corpus source: if the result is
  // not byte-identical to draft.md, some byte of that draft is neither corpus nor
  // declared, and a fixture I can quietly nudge is a fixture that measures nothing.
  for (const f of manifest.fixtures) {
    let want;
    try {
      want = renderFixture(f, resolve(HERE, "corpus"));
    } catch (err) {
      check(`${f.name}: edits apply cleanly to ${f.source}`, false, err.message);
      continue;
    }
    check(`${f.name}: draft.md is exactly its corpus source plus the declared edits`,
      readFileSync(new URL(`${f.name}/draft.md`, dir), "utf8") === want);

    // `scan_state` decides the fixture's class, so it is re-derived rather than trusted.
    // A catalog change that quietens a `loud` fixture silently empties class B.
    check(`${f.name}: scan_state is really ${f.scan_state}`,
      scanState(join(HERE, "fixtures", "pattern", f.name, "draft.md")) === f.scan_state);

    // The verdict may not sit anywhere the critic can read. The first fidelity sweep in
    // this repo was discarded because `expect:` was in a file the critic had to open.
    const text = readFileSync(new URL(`${f.name}/draft.md`, dir), "utf8");
    check(`${f.name}/draft.md does not leak a verdict word`,
      !/\b(CLEAN|REVISE)\b/.test(text));
  }

  // A CONFOUND THAT IS NOT VISIBLE IN THE FIXTURE. The corpus fetchers keep anchor text
  // and drop the href, so an EFF post that cited its source inline arrives here reading
  // as unsourced - which inflates `absence-of-concrete-detail` and the unnamed-source
  // half of `invented-specifics`, and makes the critic look wrong for noticing a gap the
  // author did not leave. Nothing in a fixture file shows this; it is a property of how
  // the material was vendored. So it is declared per fixture and the declaration is
  // required, because the next EFF fixture is the one that gets caught by it.
  const STRIPS_LINKS = ["human-professional/", "human-essays/pluralistic/"];
  for (const f of manifest.fixtures) {
    const affected = STRIPS_LINKS.some((d) => f.source.startsWith(d));
    check(`${f.name}: declares source_strips_links iff its source directory strips them`,
      affected === (f.source_strips_links === true),
      `source=${f.source} declared=${f.source_strips_links === true}`);
  }
  check("the links_stripped confound is documented in fixtures.json",
    Boolean(manifest.known_confounds?.links_stripped?.what));

  const byClass = (c) => manifest.fixtures.filter((f) => f.class === c).length;
  for (const c of ["A", "B", "C", "D"]) {
    check(`class ${c} has at least 2 fixtures`, byClass(c) >= 2, `has ${byClass(c)}`);
  }

  // WHY ALL FOUR AND NOT JUST THE DISAGREEMENT PAIR. prose-review fails if class B or D
  // empties, because there the classes are agreement geometry against a tool answering
  // the same question. Here they are not: the scanner is silent on all five patterns
  // this critic owns, so `loud` and `quiet` are properties of the DRAFT. Every class is
  // therefore constructible, and none of them may empty out.
  check("class B (scan loud, critic CLEAN) is the anti-echo class and is populated",
    byClass("B") >= 2);

  // Every positive must state which pattern it plants, and it must be one the critic
  // owns. A positive whose expected pattern is `no-voice-shift` would be testing the
  // critic against a scope it was told to leave alone.
  for (const f of manifest.fixtures.filter((x) => x.kind === "positive")) {
    check(`${f.name}: names an expect_pattern the critic owns`,
      manifest.patterns_owned.includes(f.expect_pattern), f.expect_pattern);
  }
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}\n`);
if (skipped) {
  // Printed after the summary so a skip is never mistaken for a pass, and so the
  // reason travels with the count. A skipped precondition is information about
  // the environment, and it belongs where the numbers are read.
  process.stdout.write(`\nSkipped (precondition absent):\n${skips.map((s) => `  - ${s}`).join("\n")}\n`);
}
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
