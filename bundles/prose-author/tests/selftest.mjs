#!/usr/bin/env node
/**
 * prose-author selftest.
 *
 * The two tools here guard the two ways this bundle could quietly do harm:
 * letting model output become the definition of an author's voice, and letting
 * a draft claim more than was checked. Both failures are silent by nature — the
 * output looks the same either way — so they get tests rather than review.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  selectExemplars, renderExemplars, attested, CORPUS_MINIMUM, CAP_CLAMP, DEFAULT_CAP,
} from "../skills/prose-draft/tools/exemplars.mjs";
import {
  verifyDraft, renderVerification, findScanner, firstExisting, scannerCandidates, SCANNER_ENV,
} from "../skills/prose-draft/tools/verify.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, "..", "..", "prose-tell-scan", "tests", "corpus");

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

const tmp = mkdtempSync(join(tmpdir(), "prose-author-selftest-"));

function makeProfile(name, { human = 0, approved = 0, editFraction = 0.5 } = {}) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, "corpus", "human"), { recursive: true });
  for (let i = 0; i < human; i += 1) {
    writeFileSync(
      join(dir, "corpus", "human", `h${i}.txt`),
      `---\nsource: notebook\ndate: 2021-04-0${(i % 9) + 1}\nhuman_authored: true\n---\n`
      + `${"word ".repeat(400 + i * 50)}\n`,
    );
  }
  if (approved) {
    mkdirSync(join(dir, "corpus", "approved"), { recursive: true });
    for (let i = 0; i < approved; i += 1) {
      writeFileSync(
        join(dir, "corpus", "approved", `a${i}.txt`),
        `---\nsource: prose-author draft\ndate: 2026-01-0${(i % 9) + 1}\n`
        + `human_authored: false\nprovenance: model-drafted-human-edited\n`
        + `edit_fraction: ${editFraction}\n---\n${"word ".repeat(500)}\n`,
      );
    }
  }
  return dir;
}

try {
  /* ------------------------------------------------------------------ */
  group("Exemplars — the channel that can poison a voice");

  {
    // Drafting "in your voice" with no samples of your voice is the failure
    // this whole ordering constraint exists to prevent. It must refuse, not
    // silently fall back to a generic register and keep the second person.
    const none = selectExemplars(join(tmp, "missing"));
    check("refuses when there is no human corpus", none.refusal === "no-corpus");
    check("the refusal explains why, not just that", /someone else's voice/.test(none.message));
    check("a refusal returns no exemplars", none.exemplars.length === 0);

    // Whole files only. A paragraph lifted out shows a rhythm without showing
    // what the rhythm was responding to, which teaches the wrong thing.
    const p = makeProfile("plain", { human: 12 });
    const picked = selectExemplars(p, { targetWords: 900, n: 3 });
    check("selects the requested number", picked.exemplars.length === 3);
    check("every exemplar is a whole sample", picked.exemplars.every((e) => e.words > 0 && !e.excerpt));
    check("selection is by length proximity", picked.exemplars.every((e) => Math.abs(e.words - 900) < 900));
  }

  {
    // RULE 4, and it is the one that stops the cold-start disaster: fill the
    // folder with model output, draft against model norms on day one, never
    // find out. Below CORPUS_MINIMUM human samples, approved contributes zero
    // no matter how many there are or how heavily they were edited.
    const thin = makeProfile("thin", { human: CORPUS_MINIMUM - 1, approved: 20, editFraction: 0.9 });
    const r = selectExemplars(thin, { n: 10 });
    check(
      "below the corpus minimum, approved drafts contribute nothing",
      r.accounting.approved_slots === 0 && r.exemplars.every((e) => e.origin === "human"),
    );
    check("and the report says they were suppressed", r.accounting.approved_suppressed === true);
    check(
      "the rendered output says it out loud",
      /contributed NOTHING/.test(renderExemplars(r, thin)),
    );
  }

  {
    // RULE 3: human keeps the majority, always. A config that can express "the
    // model is 80% of my voice" will eventually be set that way by someone who
    // stopped thinking about it, so the ceiling lives in code.
    const rich = makeProfile("rich", { human: 20, approved: 20, editFraction: 0.8 });
    const capped = selectExemplars(rich, { n: 10, cap: DEFAULT_CAP });
    check(
      "at the default cap, approved fills at most its share",
      capped.accounting.approved_slots <= Math.floor(10 * DEFAULT_CAP),
    );
    check("human always holds the majority", capped.accounting.human_slots > capped.accounting.approved_slots);

    const absurd = selectExemplars(rich, { n: 10, cap: 0.95 });
    check(
      "a config cap above the clamp is clamped, not honoured",
      absurd.accounting.cap_applied < CAP_CLAMP,
    );
    check(
      "even at an absurd requested cap, human still holds the majority",
      absurd.accounting.human_slots > absurd.accounting.approved_slots,
    );

    // Weight scales with how much of the sample is actually the author. A
    // generation approved untouched is worth approximately nothing as evidence
    // about a person, so it must not outrank a heavily rewritten one.
    const mixed = join(tmp, "mixed");
    mkdirSync(join(mixed, "corpus", "human"), { recursive: true });
    for (let i = 0; i < 12; i += 1) {
      writeFileSync(join(mixed, "corpus", "human", `h${i}.txt`),
        `---\nsource: s\ndate: 2021-01-01\nhuman_authored: true\n---\n${"word ".repeat(500)}\n`);
    }
    mkdirSync(join(mixed, "corpus", "approved"), { recursive: true });
    writeFileSync(join(mixed, "corpus", "approved", "untouched.txt"),
      `---\nsource: d\ndate: 2026-01-01\nhuman_authored: false\nedit_fraction: 0.02\n---\n${"word ".repeat(500)}\n`);
    writeFileSync(join(mixed, "corpus", "approved", "rewritten.txt"),
      `---\nsource: d\ndate: 2026-01-01\nhuman_authored: false\nedit_fraction: 0.71\n---\n${"word ".repeat(500)}\n`);
    const ordered = selectExemplars(mixed, { n: 10, cap: 0.4 });
    const app = ordered.exemplars.filter((e) => e.origin === "approved");
    check(
      "the more heavily edited approved sample is preferred",
      app.length === 0 || app[0].file === "rewritten.txt",
    );
  }

  /* ------------------------------------------------------------------ */
  group("Exemplars — provenance, and the README that was almost a writing sample");

  {
    // THE BUG THIS EXISTS TO PREVENT, found by a reviewer against the shipped
    // tree. Every profile this repo ships has an empty corpus/human/ containing
    // only a placeholder README explaining how to fill it. Without a README
    // filter and an attestation check, that README counted as a human sample:
    // the cold-start refusal never fired, and the drafter would have been handed
    // the scanner's own instructional boilerplate as "how this person writes".
    const shipped = resolve(HERE, "..", "..", "prose-tell-scan", "skills", "tell-scan", "profiles", "essay");
    const r = selectExemplars(shipped);
    check("a shipped profile with only a README refuses", r.refusal === "no-corpus");
    check("no exemplar is ever a README", r.exemplars.every((e) => !/^readme/i.test(e.file)));

    // THE README FILTER NEEDS ITS OWN TEST, and the obvious one does not give it
    // one. An unattested README is already rejected by the attestation check, so
    // deleting the filter entirely changed no result - a mutation run proved it,
    // scoring 0 failures where the other five guards scored 1 to 6.
    //
    // The filter still earns its place, and this is the case that shows why:
    // calibrate.mjs excludes READMEs unconditionally, BEFORE looking at
    // frontmatter. So an attested README is a file calibration would never
    // measure and drafting would happily imitate - the two sides disagreeing
    // about what the corpus contains, which is the one thing the port must not
    // do. Isolating it needs a README that would otherwise pass.
    const rm = join(tmp, "attested-readme");
    mkdirSync(join(rm, "corpus", "human"), { recursive: true });
    const good = `---\nsource: s\ndate: 2021-01-01\nhuman_authored: true\n---\n${"word ".repeat(400)}\n`;
    writeFileSync(join(rm, "corpus", "human", "README.md"), good);
    writeFileSync(join(rm, "corpus", "human", "real.txt"), good);
    const rmr = selectExemplars(rm, { n: 2 });
    check(
      "an ATTESTED README is still excluded, as calibrate.mjs excludes it",
      rmr.exemplars.length === 1 && rmr.exemplars[0].file === "real.txt",
    );

    // Attestation is the guard against AI-assisted drafts silently becoming the
    // definition of "human". Unattested files are excluded, not downweighted.
    const un = join(tmp, "unattested");
    mkdirSync(join(un, "corpus", "human"), { recursive: true });
    writeFileSync(join(un, "corpus", "human", "a.txt"), `${"word ".repeat(400)}\n`);
    writeFileSync(join(un, "corpus", "human", "b.txt"),
      `---\nsource: s\ndate: 2021-01-01\nhuman_authored: false\n---\n${"word ".repeat(400)}\n`);
    const ur = selectExemplars(un);
    check("an unattested sample does not count as human", ur.refusal === "no-corpus");
    check("and the refusal names what it excluded and why", /human_authored/.test(ur.message));

    // Too short to teach a rhythm.
    const shortp = join(tmp, "shortp");
    mkdirSync(join(shortp, "corpus", "human"), { recursive: true });
    writeFileSync(join(shortp, "corpus", "human", "a.txt"),
      `---\nsource: s\ndate: 2021-01-01\nhuman_authored: true\n---\n${"word ".repeat(10)}\n`);
    check("a sample below the word floor is excluded", selectExemplars(shortp).refusal === "no-corpus");
  }

  {
    // CONTRACT TEST. These rules are a PORT of calibrate.mjs, not an import -
    // importing across the bundle boundary would make prose-author unloadable
    // without prose-tell-scan. A port drifts unless something pins it, so this
    // runs BOTH implementations over the same fixtures and fails on disagreement.
    let readProvenance = null;
    try {
      ({ readProvenance } = await import("../../prose-tell-scan/skills/tell-scan/tools/calibrate.mjs"));
    } catch { /* sibling absent: the port is untestable, not wrong */ }

    if (!readProvenance) {
      check("contract test skipped — prose-tell-scan not present", true);
    } else {
      const cases = [
        ["---\nsource: s\ndate: 2021-01-01\nhuman_authored: true\n---\nbody", true],
        ["---\nsource: s\ndate: 2021-01-01\nhuman_authored: false\n---\nbody", false],
        ["---\nsource: s\ndate: 2021-01-01\n---\nbody", false],
        ["---\ndate: 2021-01-01\nhuman_authored: true\n---\nbody", false],
        ["---\nsource: s\nhuman_authored: true\n---\nbody", false],
        ["---\nsource: s\ndate: 2021-01-01\nhuman_authored: yes\n---\nbody", true],
        ["no frontmatter at all", false],
      ];
      const disagreements = cases.filter(([text, want]) => {
        const mine = attested(text).ok;
        const theirs = readProvenance(text).ok;
        return mine !== theirs || mine !== want;
      });
      check(
        "the ported attestation rule agrees with calibrate.mjs on every fixture",
        disagreements.length === 0,
        disagreements.length ? `${disagreements.length} disagreement(s)` : "",
      );
    }
  }

  /* ------------------------------------------------------------------ */
  group("Verify — what a draft is allowed to claim about itself");

  const scanner = findScanner();
  if (!scanner) {
    check("prose-tell-scan is present for verification tests", false, "sibling bundle not found");
  } else {
    // The bundle ships independently of the scanner, so the missing-sibling
    // path is a real user state and must not read as a pass. findScanner()
    // always succeeds inside this repo, so the resolution step is tested
    // directly rather than asserted against a literal written in this file.
    check("scanner resolution returns null when nothing is there", firstExisting([join(tmp, "nope.mjs")]) === null);
    check("scanner resolution finds a real file", typeof scanner === "string");

    // THE LOOSE-FILE INSTALL, which install.sh actually produces and which the
    // first version of findScanner could not resolve. The failure was not a
    // missing dependency - the sibling sat one directory over - so the tool said
    // NOT VERIFIED while the thing it needed was present. A degradation that
    // fires when the dependency exists is a worse lie than no check at all.
    const loose = join(tmp, "loose", "skills");
    mkdirSync(loose, { recursive: true });
    cpSync(resolve(HERE, "..", "skills", "prose-draft"), join(loose, "prose-draft"), { recursive: true });
    cpSync(
      resolve(HERE, "..", "..", "prose-tell-scan", "skills", "tell-scan"),
      join(loose, "tell-scan"),
      { recursive: true },
    );
    const looseVerify = await import(`file://${join(loose, "prose-draft", "tools", "verify.mjs")}`);
    check(
      "the loose-file install shape resolves its sibling",
      typeof looseVerify.findScanner() === "string",
    );

    // An explicit override must beat discovery, for installs nothing can guess.
    check(
      "an env override is searched before discovery",
      scannerCandidates([], { [SCANNER_ENV]: "/x/y.mjs" })[0] === "/x/y.mjs",
    );

    // An unscannable draft must not read as a pass. Pointing at a missing
    // scanner exercises the same branch a missing install produces.
    const unscannable = verifyDraft(join(CORPUS, "human", "kenyatta-university.txt"), {
      scanner: join(tmp, "nope.mjs"), profile: "_base",
    });
    check("an unscannable draft is unverifiable", unscannable.status === "unverifiable");
    check("an unverifiable result carries no claims", unscannable.claims.length === 0);
    check("and is not rendered as a pass", !/^\s*verified/m.test(renderVerification(unscannable)));

    {
      // A Tier A artifact is mechanical evidence the generation went wrong, not
      // a style observation. Returning it beside a cadence table invites the
      // author to read the table and skim the problem.
      const v = verifyDraft(join(CORPUS, "ai", "aleftina-evdokimova.txt"), { profile: "_base" });
      check("a Tier A artifact rejects the draft", v.status === "rejected");
      check("rejection names the reason", v.reason === "tier-a-artifact");
      check("a rejected draft makes NO claims", v.claims.length === 0);
      check(
        "the artifact note is trimmed, not the catalog's whole history",
        Array.isArray(v.artifacts) && v.artifacts.every((a) => !a.note || a.note.length <= 141),
      );
      const r = renderVerification(v);
      check("the rendering says returned, not reported", /RETURNED/.test(r));
      check("a rejection shows no cadence comparison", !/within range/i.test(r));
    }

    {
      // THE COLD-START REFUSAL. Comparing against fallback bands and letting
      // "within range" be read as "within YOUR range" is the tool's worst
      // available lie: confident, personal-sounding, and about nobody.
      const v = verifyDraft(join(CORPUS, "human", "kenyatta-university.txt"), { profile: "_base" });
      check("an uncalibrated profile still verifies artifacts", v.status === "verified");
      check("but reports no gap", v.gap_reported === false);
      check("and the refusal is structured data, not just prose", typeof v.gap_refusal === "string");
      check(
        "no claim mentions the author's own bands",
        !v.claims.some((c) => /your own samples/.test(c)),
      );

      const r = renderVerification(v);
      check("the rendering states NO GAP REPORTED", /NO GAP REPORTED/.test(r));

      // THE THREE FORBIDDEN CLAIMS. Checked as strings, because a string is how
      // they would actually reach a person.
      //
      // "sounds like you" DOES appear in the output - inside the sentence
      // disclaiming it. So the test cannot be "the phrase is absent"; that
      // version passes for the wrong reason and would keep passing if the
      // disclaimer were replaced with an assertion. It checks instead that
      // every occurrence is preceded by "Not claimed".
      const claimIdx = [...r.matchAll(/sounds like you/gi)].map((m) => m.index);
      const disclaimIdx = r.indexOf("Not claimed");
      check("the phrase appears only inside the disclaimer", claimIdx.length > 0);
      check(
        "every 'sounds like you' sits after 'Not claimed'",
        disclaimIdx !== -1 && claimIdx.every((i) => i > disclaimIdx),
      );
      check("refuses the detector claim explicitly", /pass any detector/.test(r));
      check("does not call the draft good", !/\bis good\b(?![^.]*Not claimed)/.test(r.split("Not claimed")[0]));
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
