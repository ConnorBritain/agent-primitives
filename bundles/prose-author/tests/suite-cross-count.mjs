/**
 * The differential counter — the only check here that can catch a wrong number.
 *
 * Every other test in this bundle checks shape: does the function return a number, handle
 * empty input, reset lastIndex. Seven counting bugs shipped through those tests green,
 * because none of them asks whether a number is true.
 *
 * This module asks. It cannot know the truth either — what it does is put two counters
 * with different methods beside each other and report where they part. So the tests below
 * are mostly about the ways it could quietly stop checking: a claim it cannot find, a
 * decimal read as a count, a support count read as an occurrence count. A cross-checker
 * that silently checks nothing is worse than none, because it reports clean.
 */

import { crossCount, RECOUNTABLE } from "./cross-count.mjs";

export async function run(t, { HERE } = {}) {
  const { resolve } = await import("node:path");
  const P = resolve(HERE, "fixtures", "profiles", "doctorow-blog");
  // Crash-safe by design. A mutation that stops the checker reporting a row must produce
  // a clean FAIL, not a TypeError - the mutation harness treats a crash as "the count is
  // not a count" and refuses to score it, so a test that throws hides the very guard it
  // was written to prove. Returning a sentinel makes the assertion fail on its merits.
  const MISSING = { id: null, status: "missing", stated: null, measured: null, delta: null };
  const find = (rows, id) => rows.find((r) => r.id === id) ?? MISSING;

  t.group("cross-count — it compares, and says when it cannot");
  {
    // A claim it cannot locate must be REPORTED. The failure this prevents: a prose
    // rewrite moves a habit out of the cue's reach, every claim silently becomes
    // unlocatable, and the checker reports a clean run over zero comparisons.
    const rows = crossCount(P, "This profile says nothing about any habit at all.");
    t.check("a claim that cannot be located is reported, not skipped",
      rows.length === RECOUNTABLE.length && rows.every((r) => r.status === "unlocatable"));

    // The measured side is reported even when the claim is missing, so a reader can see
    // the checker did run and what it found.
    t.check("the harness count is still reported for an unlocatable claim",
      rows.every((r) => typeof r.measured === "number"));

    const located = crossCount(P,
      "Second-person address. [measurement:second-person-family] Count: 385 instances; 21.94 per 1,000 words.");
    t.check("a stable measurement locator makes a canonical v2 claim recountable",
      find(located, "second person").status === "agrees");
  }

  t.group("cross-count — the two ways a rate sentence lies to a naive parser");
  {
    // "22.65 per 1,000" yielded 65 in the first version of this module: the fractional
    // part of the rate, read as the count. It reported a 83% divergence against a profile
    // that was correct.
    const decimal = crossCount(P, "The reader is you: 390 tokens of the you-family, 10/10 samples, throughout (22.65 per 1,000).");
    t.check("a decimal's fractional part is not read as the count",
      find(decimal, "second person").stated === 390);

    const rateFirst = crossCount(P, "Second person runs throughout at 21.94 per 1,000 words — counting the you-family: 385 instances, 10/10 samples.");
    t.check("a per-1,000 denominator before the occurrence count is not read as the count",
      find(rateFirst, "second person").stated === 385
        && find(rateFirst, "second person").status === "agrees");

    // "10/10 samples" is a support count. Read as an occurrence count against a habit
    // measured at zero, it manufactures a 100% divergence out of a correct claim - which
    // is what it did to the em-dash observation, the one claim in the corpus that is
    // exactly right.
    const support = crossCount(P, "Nothing in the corpus uses an em dash — 10/10 samples contain zero.");
    const em = find(support, "em dash");
    t.check("a support count is not read as an occurrence count",
      em.status === "unlocatable" || em.stated !== 10);
  }

  t.group("cross-count — it catches the class of bug it was built for");
  {
    // The real case, from two committed profiles: the pronoun count includes the country
    // abbreviation. 127 pronouns + 41 instances of "US" = 168, and the profiles stated
    // 169 and 163. This is FU-20's bug reproduced by a renderer, in profiles that were
    // used to write drafts, and nothing caught it for five days.
    const inflated = crossCount(P, "Alongside it, a we that includes the reader: 168 tokens of we / us / our, 10/10 samples, throughout.");
    t.check("a count inflated by the country abbreviation is flagged",
      find(inflated, "we/us").status === "DIVERGES");

    const correct = crossCount(P, "Alongside it, a we that includes the reader: 127 tokens of we / us / our (uppercase US is the country and is excluded), 10/10 samples.");
    t.check("the same claim counted correctly is not flagged",
      find(correct, "we/us").status === "agrees");

    // The band must not be so wide it stops catching things. 168 against 127 is 32%.
    t.check("the tolerance is tight enough to catch a 32% inflation",
      find(inflated, "we/us").delta > 0.15);
  }
}
