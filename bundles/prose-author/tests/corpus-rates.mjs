/**
 * corpus-rates — deterministic habit-rate comparison between a corpus and a draft.
 *
 * WHY THIS EXISTS (FU-19).
 *
 * The voice critic is one-sided. It reliably flags a habit the draft is MISSING —
 * that finding is what drove FU-17 — and it does not flag a habit the draft is
 * OVERUSING. Measured on second-person address: three drafts used it at 2.09x, 2.09x
 * and 2.47x the corpus rate, and nine critic draws across them returned CLEAN.
 *
 * (An earlier version of this note cited profanity at 4.6x. That measurement was wrong
 * — the corpus figure came from a hand count with too narrow a word list — and was
 * retracted. The second-person numbers are the surviving evidence for the same claim.)
 *
 * That is a hole in the ship bar, not just in the critic. The bar is "majority CLEAN
 * and <= 1.0 findings/draw", which assumes the instrument detects deviation. If
 * deviation is invisible in one direction, a draft can caricature a habit and pass.
 *
 * So this module measures the one thing nothing in the pipeline measured: a draft's
 * habit rate against the corpus's own. It is deliberately dumb — regex counts over
 * word counts — because the whole point is to be an instrument the critic is not.
 * Everything it cannot see is in KNOWN LIMITS at the bottom, and the limits are load
 * bearing: this is a screen, not a verdict.
 *
 * THREE DESIGN DECISIONS, EACH FROM A FAILURE.
 *
 * 1. Rates are per-1000-words, never per-piece. Corpus pieces here run far longer
 *    than the drafts written from them. "Once or twice per piece" means different
 *    absolute counts for each, and reading a per-piece frequency as a target for a
 *    much shorter draft is how a habit gets over-applied without anyone noticing.
 *
 * 2. Body extraction is not optional. These corpus files carry site navigation,
 *    an appearances list and a colophon around the actual essay. A rate computed
 *    over the whole file is diluted by boilerplate the author did not write in the
 *    register being profiled. Two earlier attempts at this measurement were wrong
 *    for exactly this reason - one truncated at a nav entry and reported 0/10, the
 *    other returned the whole file and reported all zeros.
 *
 * 3. A flag needs BOTH a ratio breach and an absolute-count breach. At draft length
 *    a single instance swings the rate hugely: against a corpus rate near 1 per 1000,
 *    a 700-word draft's second instance alone pushes it past 3x. Ratio alone would
 *    flag ordinary variation as caricature. See compareRate.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readSamples } from "../skills/prose-draft/tools/exemplars.mjs";

/** Section headings that mark the end of the essay body in this corpus's source format. */
const BOILERPLATE_HEADINGS = [
  "Hey look at this",
  "Object permanence",
  "Upcoming appearances",
  "Recent appearances",
  "Latest books",
  "Upcoming books",
  "Colophon",
];

/**
 * Habit patterns. Each is a global regex counted by occurrence.
 *
 * These are SCREENS, not definitions. `we` cannot tell an inclusive "we, the
 * readers" from an exclusive "we, the company", and no regex can. The profile's
 * prose carries that distinction; this carries the count.
 */
export const HABITS = {
  // Suffixes are enumerated, never `\w*`. An open suffix swallows coinages: `dick\w*`
  // matched `dickovers`/`dickover` 28 times in this corpus - a term the author coins
  // and then uses as ordinary vocabulary through one post - and `crap\w*` matched
  // `craphound`, which is his own handle. Those 30 hits alone put the corpus rate at
  // more than double its real value. A coined term built on a rude root is not the
  // habit being measured, and only an enumerated list can tell the difference.
  profanity:
    /\b(fuck|fucks|fucked|fucking|fucker|fuckers|shit|shits|shitty|shittiness|bullshit|piss|pissed|pissing|crap|crappy|ass|asses|asshole|assholes|bastard|bastards|damn|damned|goddamn|hell|balls|bollocks|dick|dicks|prick|pricks|cunt|cunts|wank|wanker|wankers|screwed|suck|sucks)\b/gi,
  // NOT case-insensitive, and that is the whole point. `/\bus\b/gi` matches the country
  // `US`, which appears 41 times in this corpus of American political writing - a 32%
  // inflation of a habit that drafts were then judged deficient in. Case is the only
  // signal separating the pronoun from the abbreviation, so it must be preserved. The
  // sentence-initial capitalised pronouns are enumerated instead.
  solidarity: /\b(we|We|us|our|Our|ours|Ours|we're|We're|we've|We've|we'd|We'd|we'll|We'll)\b/g,
  secondPerson: /\b(you|your|yours|you're|you've|you'd|you'll)\b/gi,

  // `'s` is a contraction for a CLOSED set of hosts and a possessive everywhere else.
  // The open form `[A-Za-z]+['’]s` counted `earth's`, `world's`, `library's`, `boss's`
  // and 200-odd other possessives as contractions, inflating the count from 300 to 424.
  // A drafter told the corpus contracts 24 times per 1000 words when it does so 17
  // times is being told to write in a register the author does not use.
  //
  // The other elisions (`n't`, `'re`, `'ve`, `'ll`, `'d`, `'m`) are unambiguous and take
  // any host.
  contraction:
    /\b(?:(?:it|that|there|here|who|what|where|when|how|why|he|she|let|one|nothing|everything|something|somebody|nobody|this)['’]s|[A-Za-z]+['’](?:t|re|ve|ll|d|m))\b/gi,
};

/** Strip YAML frontmatter delimited by --- lines at the top of the file. */
export function stripFrontmatter(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text ?? "");
  return m ? text.slice(m[0].length) : (text ?? "");
}

/**
 * Extract the essay body from a corpus sample.
 *
 * The body runs from the line after the FIRST `(permalink)` heading to the first
 * subsequent `(permalink)` heading whose title is boilerplate. Files with no
 * `(permalink)` structure (a plain draft, a fixture) are returned whole minus
 * frontmatter, so this is safe to call on anything.
 */
export function bodyOf(text) {
  return extractBody(text).body;
}

/**
 * `bodyOf` plus how it got there.
 *
 * The fallback is the dangerous path: a corpus in some other scraped format has no
 * `(permalink)` headings, falls through to whole-file, and gets measured with its
 * navigation and colophon diluting every rate - the exact failure this module was
 * built after, now silent instead of loud. Callers that scan a CORPUS assert on
 * `extraction` so that cannot happen unnoticed; callers measuring a draft expect
 * `whole-file` and ignore it.
 */
export function extractBody(text) {
  const body = stripFrontmatter(text);
  const lines = body.split(/\r?\n/);

  const first = lines.findIndex((l) => /\(permalink\)\s*$/.test(l));
  if (first === -1) return { body: body.trim(), extraction: "whole-file" };

  let end = lines.length;
  for (let i = first + 1; i < lines.length; i++) {
    if (!/\(permalink\)\s*$/.test(lines[i])) continue;
    const title = lines[i].replace(/\s*\(permalink\)\s*$/, "").trim();
    if (BOILERPLATE_HEADINGS.includes(title)) {
      end = i;
      break;
    }
  }

  return { body: lines.slice(first + 1, end).join("\n").trim(), extraction: "permalink-delimited" };
}

/** Word count, whitespace-delimited, over already-extracted body text. */
export function words(text) {
  const t = (text ?? "").trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Occurrence count for a habit pattern. Resets lastIndex so callers can reuse HABITS. */
export function countMatches(text, pattern) {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const m = (text ?? "").match(re);
  return m ? m.length : 0;
}

/** Occurrences per 1000 words. Zero-length text is 0, not NaN. */
export function ratePer1000(text, pattern) {
  const w = words(text);
  if (w === 0) return 0;
  return (countMatches(text, pattern) / w) * 1000;
}

/**
 * Read every corpus sample under a profile dir and return their extracted bodies.
 *
 * DELEGATES the scan to `readSamples`, and that is not a style preference. This
 * function's first version walked the directory itself with an extension test and a
 * PROFILES.md special case - which is precisely the reimplementation `exemplars.mjs`
 * documents having already happened once, when it "immediately drifted three ways: no
 * word floor, no extension filter, and a crash on the group subdirectories".
 *
 * The private walk was missing more than that. It had no `human_authored` attestation
 * check, and every shipped profile carries a placeholder `README.md` in `corpus/human`
 * that was silently counted as a writing sample until the attestation guard was added.
 * A habit rate computed partly from that boilerplate would be wrong in the same
 * direction as the body-extraction bug, and just as invisible.
 *
 * So the corpus this measures is by construction the same corpus the drafter is shown
 * and the lock records. Three readers, one definition.
 */
export function corpusBodies(profileDir) {
  const humanDir = join(profileDir, "corpus", "human");
  const { usable } = readSamples(humanDir, { requireAttestation: true });
  return usable.map((s) => {
    const { body, extraction } = extractBody(readFileSync(s.path, "utf8"));
    return { file: s.file, body, extraction };
  });
}

/**
 * Corpus samples whose body could not be delimited and were measured whole.
 *
 * Non-empty means every rate derived from this corpus is diluted by whatever
 * boilerplate the source format wraps around the prose. Callers surface this rather
 * than quietly reporting a number that is wrong in a known direction.
 */
export function undelimitedSamples(bodies) {
  return bodies.filter((b) => b.extraction === "whole-file").map((b) => b.file);
}

/** Aggregate corpus rate for one habit: total occurrences over total body words. */
export function corpusRate(bodies, pattern) {
  const totalWords = bodies.reduce((a, b) => a + words(b.body), 0);
  const totalHits = bodies.reduce((a, b) => a + countMatches(b.body, pattern), 0);
  const samplesWith = bodies.filter((b) => countMatches(b.body, pattern) > 0).length;
  return {
    count: totalHits,
    words: totalWords,
    per1000: totalWords === 0 ? 0 : (totalHits / totalWords) * 1000,
    support: samplesWith,
    of: bodies.length,
  };
}

/** Default band. Pre-registered in FU-19 as ">2x the corpus rate" before any draft was measured. */
export const DEFAULT_RATIO_BAND = 2.0;

/**
 * Minimum absolute deviation, in occurrences, before a ratio breach counts.
 *
 * Two, because one is noise. At corpus rates around 1/1000 a 700-word draft expects
 * well under a single instance, so the FIRST instance is already above the corpus
 * rate and the SECOND is past 3x. Neither is caricature. Three instances against an
 * expectation of 0.6 is, and that clears this floor.
 *
 * PROVENANCE, stated plainly because a threshold that clears its author's own work is
 * the shape reward-hacking takes. This value was written into the module, with the
 * reasoning above, BEFORE any draft was run through `compareRate` - but it is not a
 * blind pre-registration, and calling it one would be false: hand-counted profanity
 * figures for the same drafts were already in view when it was chosen, and those
 * figures later turned out to be wrong. So: reasoned in advance, not blind.
 *
 * What it does to the S6 drafts is disclosed rather than discovered - at this floor
 * none of them is flagged on profanity, and three are flagged on second person. A
 * reader who thinks the floor is self-serving can set `minAbsolute` to 1 and re-run;
 * `compareRate` takes it as an option for exactly that reason.
 */
export const MIN_ABSOLUTE_DEVIATION = 2;

/**
 * Compare a draft's habit rate against the corpus's.
 *
 * Returns a verdict of `in-band`, `excess`, or `deficit`. A verdict other than
 * in-band requires BOTH the ratio band and the absolute floor to be breached — see
 * the header note and MIN_ABSOLUTE_DEVIATION for why either alone is wrong.
 */
export function compareRate(bodies, draftText, pattern, opts = {}) {
  const band = opts.band ?? DEFAULT_RATIO_BAND;
  const floor = opts.minAbsolute ?? MIN_ABSOLUTE_DEVIATION;

  const corpus = corpusRate(bodies, pattern);
  const draftBody = bodyOf(draftText);
  const draftWords = words(draftBody);
  const draftCount = countMatches(draftBody, pattern);
  const draftPer1000 = draftWords === 0 ? 0 : (draftCount / draftWords) * 1000;

  const expected = (corpus.per1000 * draftWords) / 1000;
  const absDeviation = Math.abs(draftCount - expected);

  let ratio;
  if (corpus.per1000 === 0) ratio = draftPer1000 === 0 ? 1 : Infinity;
  else ratio = draftPer1000 / corpus.per1000;

  let verdict = "in-band";
  if (absDeviation >= floor) {
    if (ratio > band) verdict = "excess";
    else if (ratio < 1 / band) verdict = "deficit";
  }

  return {
    verdict,
    corpusPer1000: round2(corpus.per1000),
    draftPer1000: round2(draftPer1000),
    ratio: ratio === Infinity ? Infinity : round2(ratio),
    draftCount,
    expected: round2(expected),
    absDeviation: round2(absDeviation),
    draftWords,
    band,
    minAbsolute: floor,
  };
}

function round2(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : n;
}

/*
 * KNOWN LIMITS — read these before quoting a number from this module.
 *
 * - Regexes cannot read. `we` includes the exclusive "we" and quoted speech;
 *   `hell` matches "hell of a" and "hellscape"; `sucks` matches a vacuum cleaner.
 *   Counts are upper bounds on the habit, not measurements of it.
 * - Only habits expressible as a pattern are covered. The load-bearing observations
 *   in a profile - how a figure is built, where a judgement sits, what a close does
 *   with the opponent's word - are not, and never will be here.
 * - The verdict is a screen for one failure mode: a draft caricaturing a countable
 *   habit. `in-band` means "not caught by this", which is much weaker than "correct".
 * - Body extraction is tuned to this corpus's source format. A corpus without
 *   `(permalink)` headings is returned whole, which is right for drafts and may be
 *   wrong for some other scraped format.
 * - The band and the absolute floor are judgement calls, pre-registered rather than
 *   derived. They were fixed before any draft was measured against them.
 */

/**
 * Paragraph-ending shape — the measure that finally caught FU-14.
 *
 * WHY A SEPARATE MEASURE. The voice critic complained six times, across three attempted
 * fixes, that a draft "lands every paragraph on a short epigrammatic kicker". Every fix
 * tried to reduce the NUMBER of epigrams, and every measure built to check them counted
 * short sentences ANYWHERE in the draft. On that measure the problem read as solved -
 * 0.11 against a corpus 0.12 - and the measure was retracted as invalid.
 *
 * The critic was never talking about short sentences in general. It was talking about
 * paragraph ENDINGS. Measuring those separately splits the two apart immediately: the
 * corpus ends paragraphs on a median 29-word sentence, and the flagged drafts ended them
 * on 10 to 22. The corpus's short flat verdict is real, and it lands INSIDE a paragraph
 * or stands as its own - it is not where the paragraph comes to rest.
 *
 * So the defect is placement, not frequency, and this reports both halves: how often a
 * paragraph ends short, and how far the endings have drifted from the prose around them.
 *
 * KNOWN LIMITS. This cannot tell an epigram from a flatly expository short sentence -
 * that is genuinely a shape judgement and a length proxy will never make it. What it can
 * do is detect the SET-level drift, which is what the critic actually sees and what no
 * per-sentence check catches.
 */
export const SHORT_FINAL_WORDS = 8;

const sentencesOf = (para) =>
  para.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);

/**
 * A bracketed image credit standing as its own paragraph.
 *
 * Three of the ten doctorow samples end on one - "(Image: Kanerva T, CC BY 4.0, modified)".
 * It is publication furniture, not a sentence the author wrote to end a paragraph, and
 * counting it as a paragraph ending made three of the corpus's ten closing sentences look
 * like six- and seven-word punches. A renderer caught this before any test did.
 */
const IMAGE_CREDIT = /^\(\s*(?:image|photo|illustration|credit|pic)\b[^)]*\)$/i;

/**
 * Prose paragraphs: not bare-URL citation lines, and not image credits.
 *
 * Both exclusions are the same rule - measure what the author wrote, not what the
 * publishing platform added around it - and both were found the same way, by a number
 * looking wrong rather than by a test failing.
 */
function proseParagraphs(text) {
  return bodyOf(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^https?:\S*$/.test(p) && !IMAGE_CREDIT.test(p));
}

/**
 * `{ paragraphs, shortFinal, shortFinalFraction, medianFinal, medianOverall, drift }`.
 *
 * `drift` is medianFinal / medianOverall. Below 1 means paragraphs end shorter than the
 * piece reads — the drumbeat signature. At or above 1 means endings sit with the prose.
 */
export function paragraphEndings(text) {
  const paras = proseParagraphs(text);
  const finals = [];
  const all = [];
  for (const p of paras) {
    const s = sentencesOf(p);
    if (!s.length) continue;
    for (const one of s) all.push(one.split(/\s+/).length);
    finals.push(s[s.length - 1].split(/\s+/).length);
  }
  const median = (xs) => {
    if (!xs.length) return 0;
    const t = [...xs].sort((a, b) => a - b);
    return t[Math.floor(t.length / 2)];
  };
  const shortFinal = finals.filter((n) => n <= SHORT_FINAL_WORDS).length;
  const medianFinal = median(finals);
  const medianOverall = median(all);
  return {
    paragraphs: finals.length,
    shortFinal,
    shortFinalFraction: finals.length ? shortFinal / finals.length : 0,
    medianFinal,
    medianOverall,
    drift: medianOverall ? medianFinal / medianOverall : 0,
  };
}

/** Corpus-wide paragraph-ending profile, pooled across samples. */
export function corpusParagraphEndings(bodies) {
  const pooled = bodies.map((b) => b.body).join("\n\n");
  return paragraphEndings(pooled);
}
