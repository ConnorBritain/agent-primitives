#!/usr/bin/env node
/**
 * prose-author selftest.
 *
 * The two tools here guard the two ways this bundle could quietly do harm:
 * letting model output become the definition of an author's voice, and letting
 * a draft claim more than was checked. Both failures are silent by nature — the
 * output looks the same either way — so they get tests rather than review.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  selectExemplars, renderExemplars, attested, CORPUS_MINIMUM, CAP_CLAMP, DEFAULT_CAP, MIN_SAMPLE_WORDS, TEXT_EXT,
} from "../skills/prose-draft/tools/exemplars.mjs";
import {
  verifyDraft, renderVerification, findScanner, firstExisting, scannerCandidates, SCANNER_ENV,
} from "../skills/prose-draft/tools/verify.mjs";
import {
  editFraction, lcsLength, planIngest, verifyApproved, INGEST_FLOOR,
} from "../skills/prose-draft/tools/ingest-edit.mjs";
import { existsSync as fsExists, readFileSync as fsRead } from "node:fs";

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
    // runs both implementations over the same fixtures and fails on disagreement.
    //
    // THE FIRST VERSION OF THIS TEST COULD NOT FAIL THE WAY IT MATTERED. It
    // wrapped the import in a bare `catch` and reported "skipped - sibling not
    // present" on ANY error. Rename `readProvenance` on the other side and the
    // suite went green while claiming the port was pinned: a check that cannot
    // tell "did not run" from "ran and passed", which is the exact failure this
    // project has now logged nine times. A reviewer reproduced it.
    //
    // So absence and change are distinguished. Only a genuinely missing module
    // is a skip; anything else - a rename, a moved file, a dropped export - is a
    // loud failure, because those are the drift this exists to catch.
    let sibling = null;
    let importError = null;
    try {
      sibling = await import("../../prose-tell-scan/skills/tell-scan/tools/calibrate.mjs");
    } catch (err) {
      importError = err;
    }

    const genuinelyAbsent = importError
      && (importError.code === "ERR_MODULE_NOT_FOUND" || importError.code === "ENOENT");

    if (importError && !genuinelyAbsent) {
      check(`calibrate.mjs is present but failed to import — ${importError.message}`, false);
    } else if (genuinelyAbsent) {
      check("contract test skipped — prose-tell-scan genuinely absent", true);
    } else {
      // Every symbol the port depends on. A missing one is drift, not absence.
      const required = ["readProvenance", "corpusFiles", "MIN_SAMPLE_WORDS", "TEXT_EXT", "DEFAULT_CAP", "CAP_CLAMP"];
      const missing = required.filter((k) => sibling[k] === undefined);
      check(
        `calibrate.mjs still exports what the port is pinned to (${required.join(", ")})`,
        missing.length === 0,
        missing.length ? `missing: ${missing.join(", ")}` : "",
      );

      if (!missing.length) {
        // RULE 1 — the attestation predicate.
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
          const theirs = sibling.readProvenance(text).ok;
          return mine !== theirs || mine !== want;
        });
        check(
          "ported attestation agrees with calibrate.mjs on every fixture",
          disagreements.length === 0,
          disagreements.length ? `${disagreements.length} disagreement(s)` : "",
        );

        // RULE 2 — the word floor. Previously asserted only against this
        // bundle's own constant, which pins nothing.
        check(
          "the ported word floor equals calibrate.mjs's",
          MIN_SAMPLE_WORDS === sibling.MIN_SAMPLE_WORDS,
          `ours ${MIN_SAMPLE_WORDS}, theirs ${sibling.MIN_SAMPLE_WORDS}`,
        );

        // RULE 3 — README exclusion and group traversal, checked against
        // calibrate.mjs's own file walker over a shared fixture rather than
        // against a comment asserting what it would do.
        const shared = join(tmp, "shared-walk", "corpus", "human");
        mkdirSync(join(shared, "newsletter"), { recursive: true });
        const body = `---\nsource: s\ndate: 2021-01-01\nhuman_authored: true\n---\n${"word ".repeat(400)}\n`;
        // Every extension both sides claim to accept, so a set that drifts on
        // one side shows up as a file the other never sees.
        for (const f of ["README.md", "readme.txt", "real.txt", "essay.markdown", "notes.mdx"]) {
          writeFileSync(join(shared, f), body);
        }
        writeFileSync(join(shared, "newsletter", "grouped.txt"), body);

        const theirs = sibling.corpusFiles(shared).map((e) => e.path.split("/").pop()).sort();
        const ours = selectExemplars(join(tmp, "shared-walk"), { n: 10 })
          .exemplars.map((e) => e.file).sort();
        check(
          "the ported file walk selects exactly what calibrate.mjs's does",
          JSON.stringify(theirs) === JSON.stringify(ours),
          `theirs ${JSON.stringify(theirs)} vs ours ${JSON.stringify(ours)}`,
        );
        check("and both reach into named groups", theirs.includes("grouped.txt"));
        check(
          "the ported extension set equals calibrate.mjs's",
          JSON.stringify([...TEXT_EXT].sort()) === JSON.stringify([...sibling.TEXT_EXT].sort()),
          `ours ${[...TEXT_EXT].sort()} vs theirs ${[...sibling.TEXT_EXT].sort()}`,
        );

        // The cap rule now lives in TWO places - here (for exemplar selection)
        // and in calibrate.mjs (for blended-band computation). Both READ the
        // same corpus/approved/ files and must agree on how many they let in
        // and how they scale the ones they do. A drift here would mean:
        // exemplar selection accepts a sample that calibration ignores, or
        // vice versa. Pin both defaults against calibrate.mjs.
        check("the ported cap default equals calibrate.mjs's",
          DEFAULT_CAP === sibling.DEFAULT_CAP,
          `ours ${DEFAULT_CAP}, theirs ${sibling.DEFAULT_CAP}`);
        check("the ported cap clamp equals calibrate.mjs's",
          CAP_CLAMP === sibling.CAP_CLAMP,
          `ours ${CAP_CLAMP}, theirs ${sibling.CAP_CLAMP}`);
      }
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

  /* ------------------------------------------------------------------ */
  group("Ingest — the correction channel");

  {
    // LCS is the whole measurement's honesty, so it earns direct anchors rather
    // than an assertion about the metric it feeds.
    check("LCS on identical sequences is the length", lcsLength(["a","b","c"], ["a","b","c"]) === 3);
    check("LCS on disjoint sequences is zero", lcsLength(["a","b","c"], ["x","y","z"]) === 0);
    check("LCS respects order, not just membership",
      lcsLength(["a","b","c","d"], ["d","c","b","a"]) === 1);

    // The three anchor cases the whole metric is designed to hit correctly. A
    // number that gets any of these wrong flatters the direction the design
    // exists to prevent.
    check("an untouched generation registers as no evidence about the author", editFraction("word ".repeat(100), "word ".repeat(100)) === 0);
    check(
      "a totally rewritten sample counts as fully authored",
      editFraction("aaa ".repeat(100), "bbb ".repeat(100)) === 1,
    );

    // A rewrite that keeps every word but reorders them must NOT read as
    // untouched. If it does, order-blindness has crept in and the metric flatters
    // "you rewrote a lot".
    const scrambled = ["a","b","c","d","e","f","g","h","i","j"];
    const reversed = [...scrambled].reverse();
    const efScramble = editFraction(scrambled.join(" "), reversed.join(" "));
    check("editFraction on a reordered sample is not zero", efScramble > 0);
  }

  {
    const profile = makeProfile("ingest-basic", { human: 12 });
    const original = "The lake was calm this morning. Fog sat on the water and did not move.";
    const edited =
      "The lake was still at dawn. Mist held above the water without stirring, "
      + "and the far shore did not exist until the sun cleared the treeline. "
      + `${"more prose ".repeat(120)}`;

    // A real edit lands, edit_fraction is computed, files land where the plan
    // says they will.
    const plan = planIngest({ original, edited, profileDir: profile, model: "test-model" });
    check("a real edit is not refused", plan.refusal === null);
    check("edit_fraction is between the floor and 1", plan.editFraction > INGEST_FLOOR && plan.editFraction <= 1);
    plan.write();
    check("the sample is durable after ingest — nothing is only in memory", fsExists(plan.samplePath));
    check("the pre-edit generation is retained so ef can be re-derived later", fsExists(plan.originalPath));

    // The sample MUST attest human_authored: false and carry the computed
    // edit_fraction. Otherwise calibration will happily read it as human, and
    // the whole point of the frontmatter discipline is lost.
    const body = fsRead(plan.samplePath, "utf8");
    check("stored sample declares human_authored: false", /human_authored: false/.test(body));
    // Not just "some ef appears in the file" - re-parse it and confirm it
    // equals what a fresh recomputation from the two files gives. A weaker
    // regex-match test could pass under a mutation that wrote a plausible-but-
    // wrong number, or under an edge case where the input happens to hit 1.0
    // regardless of the diff. Anchor the assertion to a recomputation
    // independent of `plan` itself.
    const storedEf = Number.parseFloat(body.match(/^edit_fraction:\s*(\S+)/m)?.[1]);
    const fromFiles = editFraction(original, edited);
    check("the stored ef equals a recomputation from the two files",
      Number.isFinite(storedEf) && Math.abs(storedEf - fromFiles) < 1e-9);
    check("stored sample points at the .originals hash",
      body.includes(`original: .originals/`));
  }

  {
    // REFUSAL A: not enough of it is yours. The whole floor exists to stop
    // voice collapse from many rounds of accepting the model's output verbatim.
    const profile = makeProfile("ingest-trivial", { human: 12 });
    const original = `${"the same words ".repeat(200)}`;
    const edited = original.replace("the same words the same words", "the same word the same words");
    const plan = planIngest({ original, edited, profileDir: profile });
    check("a trivial edit is refused", plan.refusal === "trivial-edit");
    check("and the refusal names the floor by number",
      new RegExp(String(INGEST_FLOOR)).test(plan.reason || ""));
    check("no file is written when refused", !plan.samplePath || !fsExists(plan.samplePath));
  }

  {
    // REFUSAL B: too short. Even a heavily rewritten fragment does not become a
    // corpus sample below the calibration floor - storing it there would be
    // misleading advertising.
    const profile = makeProfile("ingest-short", { human: 12 });
    const original = "one two three four five";
    const edited = "six seven eight nine ten";
    const plan = planIngest({ original, edited, profileDir: profile });
    check("a too-short edit is refused for length, not edit fraction",
      plan.refusal === "too-short");
  }

  {
    // REFUSAL C: silent double-ingest. The same edited draft ingested twice
    // would produce two files with identical content but different `date`
    // values - exactly the "silently rerecords itself" failure that flatters
    // the corpus over time.
    const profile = makeProfile("ingest-dup", { human: 12 });
    const original = `The lake was calm. ${"more calm prose ".repeat(120)}`;
    const edited = `The lake was silent at dawn. ${"different prose about mist ".repeat(120)}`;
    const first = planIngest({ original, edited, profileDir: profile });
    check("first ingest of a novel edit is accepted", first.refusal === null);
    first.write();
    const second = planIngest({ original, edited, profileDir: profile });
    check("second ingest of the same edit is refused", second.refusal === "already-exists");
    // ...unless --force is passed, so the escape hatch works but requires intent.
    const forced = planIngest({ original, edited, profileDir: profile, force: true });
    check("--force overrides the double-ingest refusal", forced.refusal === null);
  }


  /* ------------------------------------------------------------------ */
  group("Verify — every stored ef must be reproducible from its files");

  {
    // THE PROMISE THIS FUNCTION EXISTS TO KEEP. Ingest cannot prove --original
    // was really the drafter's output: pass an unrelated file, get a fabricated
    // edit_fraction. --verify makes that number auditable AFTER THE FACT -
    // anyone can rerun this over an approved corpus and get every drift, so a
    // lying ingest lands but cannot survive review. If this ever passes on a
    // doctored corpus, "computed not asserted" was a promise the tool broke.

    const profile = makeProfile("verify", { human: 12 });
    const orig = `The lake was calm this morning. ${"more calm prose ".repeat(120)}`;
    const edit = `The lake was still at dawn, and the mist held. ${"different prose about mist ".repeat(120)}`;
    planIngest({ original: orig, edited: edit, profileDir: profile }).write();

    const clean = verifyApproved(profile);
    check("a freshly ingested sample verifies clean",
      clean.summary.ok === 1 && clean.summary.drift === 0);

    // DRIFT 1: someone changes the stored ef by hand. Silent acceptance here
    // would let a threshold input be edited without recompute, which is the
    // whole failure this exists to catch.
    const sampleFile = clean.samples[0].file;
    const samplePath = join(profile, "corpus", "approved", sampleFile);
    const before = readFileSync(samplePath, "utf8");
    writeFileSync(samplePath, before.replace(/edit_fraction: [0-9.]+/, "edit_fraction: 0.05"));
    const drifted = verifyApproved(profile);
    check("a hand-edited edit_fraction is caught as drift",
      drifted.summary.drift === 1 && drifted.samples[0].status === "drift");
    writeFileSync(samplePath, before);

    // DRIFT 2: the stored original is edited in place. Its content no longer
    // hashes to its filename, so the pair no longer describes the same edit
    // even though the numbers in frontmatter still look self-consistent.
    const originalHash = before.match(/original: \.originals\/([0-9a-f]{64})\.txt/)[1];
    const originalPath = join(profile, "corpus", "approved", ".originals", `${originalHash}.txt`);
    const originalBefore = readFileSync(originalPath, "utf8");
    writeFileSync(originalPath, `${originalBefore} tampered`);
    const tampered = verifyApproved(profile);
    check("a tampered stored original is caught as drift",
      tampered.summary.drift === 1
      && /no longer hashes/.test(tampered.samples[0].reason || ""));
    writeFileSync(originalPath, originalBefore);

    // DRIFT 3: the stored original goes missing. Must be loud, not silent -
    // otherwise a corpus can shed its evidence and read clean.
    rmSync(originalPath);
    const missing = verifyApproved(profile);
    check("a missing stored original is reported, not treated as ok",
      missing.summary.missing === 1);
    writeFileSync(originalPath, originalBefore);

    // Recovery matters: a check that stays red after the drift is undone would
    // train users to ignore it, which is the same outcome as no check.
    const recovered = verifyApproved(profile);
    check("verify returns to clean after each drift is undone",
      recovered.summary.ok === 1 && recovered.summary.drift === 0);
  }

  {
    // model: unknown was a sentinel that would pollute future filtering. The
    // absence of --model now reads as absence, not as a claim about an unknown
    // model. Anchored so a regression that restored the sentinel would fail.
    const profile = makeProfile("no-model", { human: 12 });
    const orig = `The lake was calm this morning. ${"more calm prose ".repeat(120)}`;
    const edit = `The lake was still at dawn. ${"different prose about mist ".repeat(120)}`;
    planIngest({ original: orig, edited: edit, profileDir: profile }).write();
    const approvedDir = join(profile, "corpus", "approved");
    const sample = readdirSync(approvedDir).find((f) => f.endsWith(".txt"));
    const stored = readFileSync(join(approvedDir, sample), "utf8");
    check("no --model means no model: line, not a sentinel",
      !/^model:\s*unknown/m.test(stored) && !/^model:/m.test(stored));
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
