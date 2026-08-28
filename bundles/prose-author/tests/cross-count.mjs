/**
 * cross-count — re-count a profile's own stated claims and report where they diverge.
 *
 * WHY THIS EXISTS, and it is the most-earned module in this bundle.
 *
 * Seven times in one session, a primitive was right about a number and my measurement was
 * wrong. Every time, the harness suite was green. The bugs: a case-insensitive `\bus\b`
 * counting the country, `[A-Za-z]+'s` counting possessives as contractions, an open `\w*`
 * suffix swallowing a coinage, site chrome left in a vendored corpus, image credits counted
 * as prose paragraphs, URL slugs counted as hyphenated compounds, and a stability table
 * built from a discarded run.
 *
 * None of those is a shape bug, which is all my tests check. `countMatches` returned a
 * number, handled empty input, and reset lastIndex correctly through every one of them. The
 * tests asked "does this function work" and never "is this number true".
 *
 * I cannot write the missing test alone. Checking my arithmetic with my arithmetic proves
 * nothing. What caught the bugs every time was a SECOND counter using a different method
 * disagreeing with the first - which is differential testing, and it only became possible
 * here because FU-23 made the renderer state its counting rules and its word lists. A
 * profile's claims are now re-runnable, and this module re-runs them.
 *
 * WHAT IT CANNOT DO. Two counters can share a bug: one render reproduced both of my regex
 * errors exactly. So agreement is weak evidence and disagreement is strong evidence. This
 * reports divergence. It does not certify a number as correct, and a clean run here means
 * "nothing disagreed", not "the counts are right".
 */

import { readFileSync } from "node:fs";

import { corpusBodies, corpusRate, HABITS } from "./corpus-rates.mjs";

/**
 * Claims this module knows how to re-count, mapped to the harness pattern that measures
 * the same habit.
 *
 * The key is a phrase that identifies the observation in the profile's prose. Matching on
 * prose is loose by nature, so a claim that cannot be located is REPORTED AS UNLOCATABLE
 * rather than skipped - a check that quietly finds nothing to check is the failure mode
 * this whole module exists to prevent.
 */
export const RECOUNTABLE = [
  { id: "second person", measurement: "second-person-family", cue: /\byou-family|second person|tokens of \*?you\b/i, pattern: HABITS.secondPerson },
  { id: "we/us", measurement: "first-person-plural-family", cue: /\bwe-family|we\/us|inclusive first-person plural|a \*?we\*? that\b/i, pattern: HABITS.solidarity },
  { id: "en dash", measurement: "en-dashes", cue: /\ben dash(es)?\b/i, pattern: /–/g },
  { id: "em dash", measurement: "em-dashes", cue: /\bem dash(es)?\b/i, pattern: /—/g },
];

/** Pull the occurrence count out of the sentence that carries a cue and a rate. */
function claimedCount(markdown, cue, measurement) {
  const paragraphs = markdown.split(/\n\s*\n/);
  const located = paragraphs.find((paragraph) => paragraph.includes(`[measurement:${measurement}]`));
  const sentences = paragraphs
    .flatMap((b) => b.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim());
  const host = located?.replace(/\s+/g, " ").trim() ?? sentences.find((s) => cue.test(s));
  if (!host) return null;
  // Prefer an explicitly labelled occurrence count. Renderers legitimately put the rate
  // first ("21.94 per 1,000 words ... 385 instances") or the count first ("385 tokens ...
  // 21.94 per 1,000"). Looking only before the rate makes its fixed denominator look like
  // the claim. `count: N` is the deterministic-prepass spelling; the unit spelling covers
  // ordinary prose.
  // A number must NOT be preceded by a decimal point. Without that guard, "22.65 per
  // 1,000" yields 65 - the fractional part of the rate read as the count. That bug was in
  // the first version of this file, which is the eighth time in one session that a
  // counting tool I wrote miscounted. It is also the argument for the module: the bug was
  // visible instantly because a second counter disagreed.
  // Also excluded: a number followed by "/", which is a support count like "10/10
  // samples", not an occurrence count. Without this the em-dash sentence - "no em dash
  // anywhere - 10/10 samples contain zero" - reports a claimed count of 10 against a
  // measured 0 and manufactures a divergence out of a correct claim.
  const NUM = "(?<![.\\d/,])(\\d[\\d,]{0,6})(?![\\d.]|\\s*/)";
  const labelled = new RegExp(`\\bcount\\s*:\\s*${NUM}`, "i").exec(host);
  const withUnit = new RegExp(`${NUM}\\s+(?:instances|tokens|spans|en dashes|em dashes)\\b`, "i").exec(host);
  const beforeRate = new RegExp(`${NUM}\\s+(?:of them|such)?[^.]*?per 1,?000`, "i").exec(host);
  const bare = new RegExp(`\\b${NUM}`).exec(host);
  const raw = labelled?.[1] ?? withUnit?.[1] ?? beforeRate?.[1] ?? bare?.[1];
  return raw ? { count: Number(raw.replace(/,/g, "")), host } : null;
}

/**
 * Compare a profile's stated counts against the harness's own.
 *
 * `tolerance` is generous on purpose. The two counters legitimately differ - a renderer
 * that excludes quoted matter or URL lines and says so is not wrong. The band is set to
 * catch the class of error actually seen (32%, 41%, 77% inflations), not to enforce
 * agreement on definitions.
 */
export function crossCount(profileDir, markdown, { tolerance = 0.15 } = {}) {
  const bodies = corpusBodies(profileDir);
  const rows = [];
  for (const claim of RECOUNTABLE) {
    const stated = claimedCount(markdown, claim.cue, claim.measurement);
    const measured = corpusRate(bodies, claim.pattern).count;
    if (!stated) { rows.push({ id: claim.id, status: "unlocatable", measured }); continue; }
    const delta = measured === 0
      ? (stated.count === 0 ? 0 : 1)
      : Math.abs(stated.count - measured) / measured;
    rows.push({
      id: claim.id, stated: stated.count, measured,
      delta, status: delta <= tolerance ? "agrees" : "DIVERGES",
    });
  }
  return rows;
}

export function loadProfile(path) {
  return readFileSync(path, "utf8");
}
