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

  group("Coverage added 2026-08-04 — each measured on the corpus before shipping");
  {
    // Tier A. Judged on whether one occurrence is dispositive, not on rate:
    // nobody drafting an article types the assistant's half of a conversation
    // into it. 2/33 AI, 0/12 human, 0 on this repo.
    const doc = join(tmp, "preamble.txt");
    writeFileSync(
      doc,
      "Certainly, here is the revised section you asked for.\n\n"
      + "The town was founded in 1847.\n\n"
      + "Would you like me to expand the history further?\n",
    );
    const hit = scan([doc, "--profile", "essay"]).results[0]
      .findings.find((f) => f.id === "assistant-preamble");
    check("assistant-preamble catches leaked chat turns", Boolean(hit), "");
    check("it flags on one occurrence, as Tier A must", hit?.flagged === true);
    check("both forms match", hit?.count >= 2, `count=${hit?.count}`);
  }
  {
    // The paired negative, and the one that matters: prose ABOUT an assistant
    // must stay quiet, because this is Tier A and a false positive there
    // devalues every artifact finding.
    const doc = join(tmp, "preamble-neg.txt");
    writeFileSync(
      doc,
      "The interface was polite but unhelpful, and it never explained its reasoning.\n\n"
      + "Reviewers noted that the tone felt rehearsed rather than considered.\n",
    );
    const ids = scan([doc, "--profile", "essay"]).results[0].findings.map((f) => f.id);
    check("and stays quiet on ordinary prose about assistants", !ids.includes("assistant-preamble"),
      ids.join(","));
  }
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
    // Two rejections, recorded so the same reasonable-looking case is not
    // re-argued. `additionally-initial` was proposed to correct what looked like
    // an over-generalisation in the transition-overload rejection, and the corpus
    // says the original call was right: 1/33 AI against 1/12 human.
    const cat = JSON.parse(
      readFileSync(join(SKILL, "profiles", "_base", "catalog.json"), "utf8"),
    );
    for (const id of ["additionally-initial", "copulative-avoidance"]) {
      check(`${id}: tested, rejected, and recorded rather than forgotten`,
        Boolean(cat.rejected?.[id]?.why_rejected)
        && !cat.entries.some((e) => e.id === id),
        "");
    }
    check(
      "the rejections cite the measurement that killed them",
      /corpus/i.test(cat.rejected["additionally-initial"].why_rejected)
      && /corpus/i.test(cat.rejected["copulative-avoidance"].why_rejected),
    );
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
    const probe = join(tmp, "backticked.md");
    writeFileSync(probe, "Documenting the tell: `You’re absolutely right` is the giveaway.\n");
    const masked = scan([probe, "--profile", "technical"]).results[0]
      .findings.filter((f) => f.tier === "A");
    check("a backticked trigger is masked, not matched", masked.length === 0,
      masked.map((f) => f.id).join(","));

    const bare = join(tmp, "bare.md");
    writeFileSync(bare, "Documenting the tell: You’re absolutely right is the giveaway.\n");
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
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
