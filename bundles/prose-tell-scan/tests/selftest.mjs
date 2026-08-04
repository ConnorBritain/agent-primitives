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
    const tracked = join(BUNDLE, "tests", "corpus", "human", "kenyatta-university.txt");
    const r = existsSync(tracked)
      ? scan([tracked, "--profile", "technical"]).results[0]
      : null;
    const ce = r ? r.counter_evidence : rc.counter_evidence;
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

} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
