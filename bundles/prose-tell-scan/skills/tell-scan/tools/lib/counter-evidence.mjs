/**
 * counter-evidence — the half of the source page the scanner could never see.
 *
 * Everything else here accumulates evidence FOR a tell. That is a structural
 * bias toward flagging: a document can only ever look worse the longer you scan
 * it. Wikipedia:Signs of AI writing has a §Signs of human writing, and nothing
 * in this tool read it.
 *
 * ============================================================================
 * THE RULE THAT SHAPES ALL OF THIS: NEVER SUBTRACT
 * ============================================================================
 *
 * Counter-evidence gets its own block, its own render section, and is NEVER
 * arithmetic on the findings. The moment exculpatory evidence is netted against
 * inculpatory evidence, this becomes a scored detector — the thing the README
 * forbids and `meta.yaml` refuses by contract. There is no combined number here
 * and there will not be one.
 *
 * ============================================================================
 * WHAT SURVIVED MEASUREMENT, AND WHAT DID NOT
 * ============================================================================
 *
 * The source page's §Syntax lists five classes whose LOW rate supposedly marks a
 * machine: copulas, hedges, wordy constructions, superlatives, plain-vs-stiff
 * verbs. All five were measured against the acceptance corpus — 33 documents the
 * community judged AI-written, 12 provably predating ChatGPT.
 *
 *   metric        AUC     verdict
 *   copula        0.73    weak, direction matches the source
 *   wordy         0.73    weak, direction matches the source
 *   superlative   0.77    weak, direction matches the source
 *   plainverb     0.56    noise
 *   stiffverb     0.49    coin flip
 *   hedge         0.45    BACKWARDS — commoner in the AI set
 *
 * AUC 0.5 is worthless. Two of the six sit at or below it, the third barely above
 * at 0.56, and `hedge` runs the wrong way — so none of the three is computed at
 * all: reporting a coin-flip number invites someone to act on it.
 *
 * The three that survive are reported and NEVER FLAGGED, for two reasons that
 * both matter. AUC 0.73–0.77 on 12 human documents carries an interval wide
 * enough to include "no signal". And the best single-threshold accuracy any of
 * them reaches — 84%, against 73% for always guessing "AI" — was chosen on the
 * same 45 documents it was scored against, which is a fitted number, not a
 * predictive one. Shipping a threshold on that basis is the overfitting this
 * project has already committed twice.
 *
 * So: three numbers, with their measured weakness printed beside them, and no
 * band, no ceiling, no flag.
 *
 * ============================================================================
 * THE ASYMMETRY RULE
 * ============================================================================
 *
 * Plain forms may count as counter-evidence FOR human authorship. Stiff forms
 * are NEVER evidence of AI. `utilised`, `authored`, `commenced` are ordinary
 * professional register in several varieties of English, and a metric that
 * treated them as suspicious would be the ornate-register bias again, wearing a
 * new label. This is why `stiffverb` is absent rather than inverted, and it
 * would stay absent even if it measured well.
 */

const RATES = {
  copula: {
    re: /\b(?:is|are|was|were)\b/gi,
    auc: 0.73,
    label: "plain copulas (is/are/was/were)",
    means: "the source associates AVOIDING these with machine text",
  },
  wordy: {
    re: /\b(?:as\s+a\s+result\s+of|in\s+order\s+to|all\s+of\s+the|a\s+part\s+of|the\s+fact\s+that|due\s+to\s+the\s+fact)\b/gi,
    auc: 0.73,
    label: "wordy constructions",
    means: "human writing tolerates these; edited machine text tends to compress them out",
  },
  superlative: {
    re: /\b(?:one\s+of\s+the\s+(?:best|most|first|largest|oldest)|is\s+the\s+only|was\s+the\s+first)\b/gi,
    auc: 0.77,
    label: "unhedged superlatives",
    means: "human writing makes flat claims of this shape more often",
  },
};

/** ChatGPT's public launch. Text older than this cannot have used it. */
export const CHATGPT_LAUNCH = "2022-11-30";

/**
 * Age, and it is the only dispositive thing in this file — which is exactly why
 * the trust model matters more than the lookup.
 *
 * The source page is firm: if the text predates the tool, AI use "can be safely
 * ruled out". No rate, no threshold. So a `dispositive: true` here overrides the
 * entire reading, and anything that can set it is a way to switch the tool off.
 *
 * THE THREE SOURCES ARE NOT EQUALLY TRUSTWORTHY, and an earlier version treated
 * two of them as if they were.
 *
 *   git first-add commit   A RECORD. Something outside the document asserts when
 *                          it appeared. Not forgeable by editing the file.
 *                          → dispositive
 *
 *   frontmatter `date:`    A CLAIM the author writes into the text. Adding one
 *                          line to any document sets it. It shipped as
 *                          dispositive, which meant one line of YAML silently
 *                          turned off a scanner saturated with findings.
 *                          → reported, never dispositive on its own
 *
 *   filesystem mtime       Whatever last touched the file, including the copy
 *                          that put it there.
 *                          → reported, explicitly not evidence
 *
 * Frontmatter plus git AGREEING is dispositive, because then the record
 * corroborates the claim. Frontmatter alone stays visible in the output — an
 * author scanning their own draft knows whether their own date is honest, and
 * the tool should not pretend the information does not exist. It simply does not
 * get to silence the findings on the strength of a self-report.
 */
export function resolveAge({ frontmatterDate, gitFirstSeen, mtime }) {
  if (gitFirstSeen && frontmatterDate && frontmatterDate <= gitFirstSeen) {
    return {
      date: frontmatterDate,
      how: "the document's frontmatter, corroborated by the commit that added the file",
      evidential: true,
      corroborated: true,
    };
  }
  if (gitFirstSeen) {
    return {
      date: gitFirstSeen,
      how: "first commit that added the file",
      evidential: true,
      corroborated: true,
    };
  }
  if (frontmatterDate) {
    return {
      date: frontmatterDate,
      how: "the document's own frontmatter",
      // Reported, and deliberately not evidential: a date the document asserts
      // about itself cannot be allowed to switch off the scanner reading it.
      evidential: false,
      corroborated: false,
      caveat:
        "a self-reported date, unverified — the document is the only thing claiming it. "
        + "Commit the file, or the scan cannot treat this as dispositive",
    };
  }
  if (mtime) {
    return {
      date: mtime,
      how: "filesystem mtime",
      evidential: false,
      corroborated: false,
      caveat: "an mtime is set by whatever last touched the file, including a copy — not evidence of when the text was written",
    };
  }
  return null;
}

export function counterEvidence(text, wordCount, age, { syntax: withSyntax = true } = {}) {
  const n = wordCount || 1;
  const syntax = !withSyntax ? [] : Object.entries(RATES).map(([key, spec]) => ({
    key,
    label: spec.label,
    per_1k: Math.round((1000 * ((text.match(spec.re) ?? []).length) / n) * 100) / 100,
    // Printed with every number so it cannot be quoted without its weakness.
    auc: spec.auc,
    means: spec.means,
    flagged: false,
    banded: false,
  }));

  const resolved = age ?? null;
  const predates = Boolean(resolved?.evidential && resolved.date < CHATGPT_LAUNCH);

  return {
    age: resolved
      ? { ...resolved, predates_chatgpt: predates, dispositive: predates }
      : { date: null, how: "not resolvable", evidential: false, predates_chatgpt: false, dispositive: false },
    syntax,
    _about: [
      "Counter-evidence is NEVER netted against the findings above. There is no combined",
      "score here and there will not be one.",
      "`age` is dispositive when evidential and older than ChatGPT's launch; the source page",
      "says AI use can be ruled out for such text.",
      "`syntax` rates are reported and never flagged. Measured AUC on this project's",
      "45-document corpus is 0.73-0.77, which is weak, and the interval at n=12 human",
      "documents includes no-signal. Three further metrics the source lists (hedges, plain",
      "verbs, stiff verbs) are not computed at all: they measured 0.45-0.56, and `hedge` ran",
      "backwards.",
      "Stiff or ornate verb forms are never treated as evidence of AI, at any rate. They are",
      "professional register in several varieties of English.",
    ],
  };
}

/**
 * When the text provably predates the tool, that fact outranks every style
 * observation above it — so it replaces the reading rather than appending to it.
 * A document from 2019 with elevated `delve` density has an interesting
 * vocabulary, not a provenance problem.
 */
export function readingOverride(ce) {
  if (!ce?.age?.dispositive) return null;
  return (
    `This text dates to ${ce.age.date}, before ChatGPT was public, per ${ce.age.how}. `
    + "Whatever the style findings above say, they are observations about the writing and "
    + "not evidence about how it was produced."
  );
}
