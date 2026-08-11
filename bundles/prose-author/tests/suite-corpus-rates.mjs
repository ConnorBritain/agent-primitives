/**
 * The habit-rate screen — the one instrument that compares a draft to the corpus.
 *
 * Every other check in this bundle compares drafts to each other or asks a model for a
 * verdict. This module is the only thing that measures a draft against the corpus's own
 * numbers, so when it is wrong it is wrong in the direction of false confidence: a
 * caricatured habit passes, or a real one is reported as excess and gets edited out.
 *
 * Both failure modes have already happened during development. The same profanity rate
 * was measured three times and came back 16, 26 and 56 occurrences; two of those drove
 * conclusions that had to be retracted. The tests below pin the decisions that made the
 * difference — what counts as the body, what counts as a hit, and when a ratio is
 * allowed to become a verdict.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readSamples } from "../skills/prose-draft/tools/exemplars.mjs";

import {
  HABITS, stripFrontmatter, bodyOf, extractBody, words, countMatches, ratePer1000,
  corpusRate, compareRate, corpusBodies, undelimitedSamples,
  DEFAULT_RATIO_BAND, MIN_ABSOLUTE_DEVIATION,
} from "./corpus-rates.mjs";

const SAMPLE = `---
source: example.net
human_authored: true
---
Today's links

Some nav line here.

Real Title (permalink)
This is the essay body. It is short and it swears: bullshit.

More body here.

Hey look at this (permalink)
Link roundup that the author did not write in this register.

Colophon (permalink)
Boilerplate.
`;

const bodies = (arr) => arr.map((body, i) => ({ file: `s${i}.txt`, body }));

export async function run(t, { tmp, HERE } = {}) {
  t.group("corpus-rates — what counts as the body");
  {
    t.check("frontmatter is stripped, so provenance keys never enter a word count",
      !stripFrontmatter(SAMPLE).includes("human_authored"));

    const b = bodyOf(SAMPLE);

    // Boilerplate dilutes every rate downward. An earlier pass at this measurement
    // returned the whole file and reported all zeros.
    t.check("the body starts after the first (permalink) heading, excluding site nav",
      b.startsWith("This is the essay body") && !b.includes("Some nav line"));

    t.check("the body stops at the first boilerplate (permalink), excluding the link roundup",
      b.includes("More body here") && !b.includes("Link roundup") && !b.includes("Boilerplate"));

    // The other earlier pass cut at a nav entry and reported 0/10 samples with the habit.
    t.check("a heading that is NOT boilerplate does not end the body",
      bodyOf(SAMPLE).includes("This is the essay body"));

    // compareRate is called on drafts, which have no (permalink) structure at all.
    // Returning nothing for them would silently make every draft rate zero.
    t.check("text with no (permalink) structure is returned whole, so drafts still measure",
      bodyOf("Just a draft.\n\nTwo paragraphs.").includes("Two paragraphs"));
  }

  t.group("corpus-rates — what counts as a hit");
  {
    // The regression that inflated the corpus rate by 2.2x. `dick\w*` matched a coined
    // term used as ordinary vocabulary 28 times, and `crap\w*` matched the author's own
    // handle. A rate built on those numbers is a rate for a word the author invented.
    t.check("a coinage built on a rude root is not counted as profanity",
      countMatches("dickovers dickover craphound", HABITS.profanity) === 0);

    t.check("the plain forms still count",
      countMatches("bullshit and shitty and piss", HABITS.profanity) === 3);

    t.check("matching is case-insensitive",
      countMatches("Bullshit BULLSHIT", HABITS.profanity) === 2);

    // Reusing an exported /g regex across calls carries lastIndex between them, which
    // silently halves counts on every second call. The bug is invisible in one test.
    t.check("counting twice with the same exported pattern gives the same answer",
      countMatches("we us our", HABITS.solidarity) === countMatches("we us our", HABITS.solidarity));

    t.check("word boundaries hold — a substring is not a hit",
      countMatches("shellfish assess", HABITS.profanity) === 0);

    t.check("empty text is zero occurrences, not a crash",
      countMatches("", HABITS.profanity) === 0);
  }

  t.group("corpus-rates — every exported pattern is exercised");
  {
    // An exported-but-untested pattern is an instrument nobody has calibrated, in a
    // module whose entire argument is that uncalibrated instruments produce confident
    // wrong numbers. All four are used to make claims in the FU-12 run doc.
    t.check("solidarity counts inclusive first-person plural forms",
      countMatches("We think our case is ours, and it binds us.", HABITS.solidarity) === 4);

    // `us` is also a country abbreviation and `our` is inside `four` - both would
    // inflate a habit the drafts are measured as DEFICIENT in, hiding the deficit.
    t.check("solidarity does not match inside longer words",
      countMatches("four hours, journal, plus.", HABITS.solidarity) === 0);

    t.check("second person counts address forms including contractions",
      countMatches("You said you're taking yours, not your other one.", HABITS.secondPerson) === 4);

    // `your` inside `yourself` is one address, not two; double counting would push a
    // draft over the excess band on a habit already measured at 2x.
    t.check("second person counts a compound address once",
      countMatches("yourself", HABITS.secondPerson) === 0);

    t.check("contraction counts elided forms, not possessives of plurals",
      countMatches("don't, we're, it'll, I'd, I'm, he's", HABITS.contraction) === 6);

    t.check("contraction accepts a typographic apostrophe as well as an ascii one",
      countMatches("don’t", HABITS.contraction) === 1);

    t.check("contraction does not fire on a bare word",
      countMatches("do not", HABITS.contraction) === 0);
  }

  t.group("corpus-rates — rates and aggregation");
  {
    t.check("a rate is occurrences per thousand words",
      Math.abs(ratePer1000(`${"w ".repeat(999)}bullshit`, HABITS.profanity) - 1) < 1e-9);

    // NaN would propagate into a ratio and compare falsely against any band.
    t.check("empty text rates zero rather than NaN", ratePer1000("", HABITS.profanity) === 0);

    const r = corpusRate(bodies(["bullshit here", "nothing here", "bullshit and piss"]), HABITS.profanity);
    t.check("corpus count sums occurrences across samples", r.count === 3);

    // support counts SAMPLES, not occurrences - the profile's n/m means samples, and a
    // support figure that quietly meant something else would corrupt every observation.
    t.check("support counts the samples containing the habit, not the occurrences",
      r.support === 2 && r.of === 3);
  }

  t.group("corpus-rates — the corpus it measures is the corpus everyone else sees");
  {
    const fixtures = resolve(HERE, "fixtures", "profiles");
    const bodies = corpusBodies(join(fixtures, "doctorow-blog"));

    // This module's first version walked corpus/human itself. exemplars.mjs records
    // that the same reimplementation already drifted three ways once, and that a
    // placeholder README in corpus/human was counted as a writing sample until the
    // attestation guard existed. A rate computed partly from README boilerplate is
    // wrong in a direction nobody would see.
    t.check("the corpus scan agrees with the drafter's on how many samples exist",
      bodies.length === readSamples(join(fixtures, "doctorow-blog", "corpus", "human"),
        { requireAttestation: true }).usable.length);

    t.check("and on which files, not just how many",
      JSON.stringify(bodies.map((b) => b.file).sort())
      === JSON.stringify(readSamples(join(fixtures, "doctorow-blog", "corpus", "human"),
        { requireAttestation: true }).usable.map((s) => s.file).sort()));

    // Silent dilution is the failure this module exists to have caught once already.
    // A corpus measured whole reports rates that are wrong and look fine.
    t.check("every sample in this corpus had its body delimited, not measured whole",
      undelimitedSamples(bodies).length === 0, undelimitedSamples(bodies).join(", "));

    t.check("extraction mode is reported, so a fallback cannot pass unnoticed",
      extractBody("no permalink here").extraction === "whole-file"
      && extractBody(SAMPLE).extraction === "permalink-delimited");

    // The fixture corpus is entirely well-formed, so agreeing with readSamples on it
    // proves nothing about WHY they agree. This builds the cases that separate a
    // delegating scan from a directory walk: a file with no attestation, and one
    // under the word floor. A walk counts both and computes a rate over README
    // boilerplate - the incident exemplars.mjs records having already happened.
    const dirty = join(tmp, "dirty-profile");
    const humanDir = join(dirty, "corpus", "human");
    mkdirSync(humanDir, { recursive: true });
    const attested = (n) => `---\nsource: notebook\ndate: 2021-04-0${n}\nhuman_authored: true\n---\n`;
    writeFileSync(join(humanDir, "good.txt"), `${attested(1)}${"word ".repeat(400)}bullshit\n`);
    writeFileSync(join(humanDir, "README.md"), `${"scaffolding ".repeat(400)}bullshit\n`);
    writeFileSync(join(humanDir, "unattested.txt"), `---\nsource: web\n---\n${"word ".repeat(400)}bullshit\n`);
    writeFileSync(join(humanDir, "tiny.txt"), `${attested(2)}word bullshit\n`);

    const scanned = corpusBodies(dirty);
    t.check("an unattested sample is not measured, so model text cannot set the rate",
      !scanned.some((b) => b.file === "unattested.txt"));
    t.check("a README in corpus/human is not measured as a writing sample",
      !scanned.some((b) => b.file === "README.md"));
    t.check("a sample under the word floor is not measured",
      !scanned.some((b) => b.file === "tiny.txt"));
    t.check("the attested sample is measured", scanned.length === 1 && scanned[0].file === "good.txt");
  }

  t.group("corpus-rates — when a ratio is allowed to become a verdict");
  {
    const corpus = bodies([`${"w ".repeat(1000)}bullshit`]); // 1.0 per 1000

    // The discreteness guard. At draft length the first instance of a rare habit is
    // already above the corpus rate and the second is past the band. Flagging that as
    // caricature would send the drafter to remove ordinary usage.
    const twoInShort = compareRate(corpus, `${"w ".repeat(200)}bullshit bullshit`, HABITS.profanity);
    t.check("a ratio breach with a sub-floor absolute deviation is NOT flagged",
      twoInShort.ratio > DEFAULT_RATIO_BAND && twoInShort.absDeviation < MIN_ABSOLUTE_DEVIATION
      && twoInShort.verdict === "in-band");

    const many = compareRate(corpus, `${"w ".repeat(200)}${"bullshit ".repeat(5)}`, HABITS.profanity);
    t.check("a ratio breach that also clears the absolute floor is flagged as excess",
      many.verdict === "excess" && many.absDeviation >= MIN_ABSOLUTE_DEVIATION);

    const none = compareRate(corpus, "w ".repeat(3000), HABITS.profanity);
    t.check("a habit the corpus has and the draft lacks is flagged as deficit",
      none.verdict === "deficit" && none.draftCount === 0);

    const matched = compareRate(corpus, `${"w ".repeat(1000)}bullshit`, HABITS.profanity);
    t.check("a draft at the corpus rate is in-band", matched.verdict === "in-band");

    // Reporting a verdict without the numbers behind it makes the screen unauditable,
    // and this screen has already been wrong three times.
    t.check("the comparison reports the numbers it decided from",
      typeof matched.corpusPer1000 === "number" && typeof matched.draftPer1000 === "number"
      && typeof matched.expected === "number" && typeof matched.draftWords === "number");

    // Division by a zero corpus rate yields Infinity, which is > any band and would
    // flag every draft using a habit the corpus simply never uses.
    const absent = compareRate(bodies(["w ".repeat(1000)]), "w ".repeat(1000), HABITS.profanity);
    t.check("a habit absent from BOTH corpus and draft is in-band, not an infinite ratio",
      absent.verdict === "in-band");
  }
}
