#!/usr/bin/env node
/**
 * prose-author selftest.
 *
 * The two tools here guard the two ways this bundle could quietly do harm:
 * letting model output become the definition of an author's voice, and letting
 * a draft claim more than was checked. Both failures are silent by nature — the
 * output looks the same either way — so they get tests rather than review.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  selectExemplars, renderExemplars, CORPUS_MINIMUM, CAP_CLAMP, DEFAULT_CAP,
} from "../skills/prose-draft/tools/exemplars.mjs";
import { verifyDraft, renderVerification, findScanner, firstExisting } from "../skills/prose-draft/tools/verify.mjs";

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
        v.artifacts.every((a) => !a.note || a.note.length <= 141),
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
