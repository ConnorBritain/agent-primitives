/**
 * relative — "is this me?"
 *
 * Compares a draft against the AUTHOR'S OWN measured rates rather than against
 * severity-band ceilings. This is the one report in the tool that answers a
 * question about a person instead of a question about text.
 *
 * WHY RATES AND NOT BANDS. The normal report asks "is this draft above the
 * ceiling for its severity class?" That ceiling is derived from a class, not
 * from the author. A writer who genuinely leans on a construction gets flagged
 * for writing like themselves; a writer who never touches it gets no signal at
 * all when a draft is suddenly full of it. `entry_rates` in the calibration file
 * is the per-author number that fixes both, and until this module existed it was
 * computed and never read.
 *
 * WHY A POISSON TEST AND NOT A RATIO. The obvious implementation compares
 * per-1k rates: "you use this 0.2x/1k, the draft is 1.4x/1k, that is 7x." On a
 * 400-word draft, ONE occurrence is 2.5x/1k. Every ratio on a short draft is
 * enormous and none of them mean anything. Treating occurrences as Poisson with
 * mean (author rate x draft words) asks the right question — "how surprised
 * should I be by this many, in a draft this long?" — and is automatically quiet
 * on short inputs, which is where a ratio is loudest and least justified.
 *
 * This is the same lesson as the min-count floor in CALIBRATION.md (FP-c, FP-d):
 * rates computed over small denominators are unstable, and the fix is not a
 * bigger threshold but a statistic that knows how much data it has.
 *
 * WHAT IT MAY NOT SAY. Three different things produce "outside your range" and
 * this module cannot distinguish them: the draft drifted, the author is writing
 * something new, or the corpus is too narrow to describe them any more. Every
 * string this module emits is therefore phrased as a question. A tool that says
 * "this doesn't sound like you" when the truth is "you are stretching" teaches
 * an author to write blandly, which is the failure the whole project exists to
 * avoid. See bundles/prose-author/DESIGN.md.
 */

/**
 * Two occurrences of anything can happen by accident. Below this, no claim.
 *
 * Deliberately a COUNT and not a rate: the point is to be unpersuadable by a
 * short draft. Three hits in 200 words is a pattern; three hits is also three
 * hits in 5,000 words, where the Poisson test will find it unremarkable and
 * decline on its own. The floor and the test fail in opposite directions, which
 * is why both are here.
 */
export const MIN_COUNT = 3;

/** Two-in-a-hundred. Loose enough to notice, tight enough not to chatter. */
export const ALPHA = 0.02;

/**
 * Below this many constructions compared, "nothing unusual" is not reassurance.
 *
 * Found by running the first end-to-end check: a 1,300-word encyclopedia article
 * triggered exactly ONE catalogued construction, and the report cheerfully said
 * nothing was unusual. That sentence is true and reads as "your draft is fine",
 * which is a much larger claim than one comparison can carry.
 *
 * The report only ever sees constructions the CATALOG names. Most of how a
 * person writes is not in the catalog and never will be - that is what the voice
 * critic is for. When the overlap is this thin the honest output is "I had
 * almost nothing to look at", not silence dressed as a verdict.
 */
export const THIN_COMPARISON = 5;

/**
 * P(X >= k) for Poisson(mu). Summed on the lower tail because that is the side
 * with few terms; the upper tail is unbounded.
 */
export function poissonAtLeast(k, mu) {
  if (k <= 0) return 1;
  if (mu <= 0) return 0;
  let term = Math.exp(-mu);
  let cdf = term;
  for (let i = 1; i < k; i += 1) {
    term *= mu / i;
    cdf += term;
  }
  return Math.max(0, Math.min(1, 1 - cdf));
}

/**
 * The author's per-word rate for one entry, and how well the corpus knows it.
 *
 * An entry the corpus never contains is NOT rate zero. Zero would assert "this
 * author never does this", which is a claim about a person made from silence.
 * What the corpus supports is a bound: having seen zero in N words, the rule of
 * three puts the 95% upper limit at 3/N. Using the bound rather than zero makes
 * the test conservative in the direction that matters — it takes MORE evidence
 * to flag a construction the corpus has simply never had the chance to show.
 */
export function authorRate(entryRates, id, corpusWords) {
  const e = entryRates?.[id];
  if (e && typeof e.per_1k === "number") {
    return { rate: e.per_1k / 1000, observed: true, corpusCount: e.count, inSamples: e.in_samples };
  }
  if (!corpusWords) return null;
  return { rate: 3 / corpusWords, observed: false, corpusCount: 0, inSamples: 0 };
}

/**
 * Compare one draft against the author's rates.
 *
 * `draftEntries` is [{ id, count, severity, title }] as the scanner produces.
 * Returns surprises only; the caller decides how loudly to say nothing.
 */
export function relativeReport({ entryRates, corpusWords, draftEntries, draftWords }) {
  const surprises = [];
  let compared = 0;
  let unknown = 0;

  for (const entry of draftEntries) {
    if (!entry.count) continue;
    const author = authorRate(entryRates, entry.id, corpusWords);
    if (!author) {
      unknown += 1;
      continue;
    }
    compared += 1;
    if (entry.count < MIN_COUNT) continue;

    const expected = author.rate * draftWords;
    const p = poissonAtLeast(entry.count, expected);
    if (p >= ALPHA) continue;

    surprises.push({
      id: entry.id,
      title: entry.title || entry.id,
      draftCount: entry.count,
      draftPer1k: round((1000 * entry.count) / draftWords),
      authorPer1k: round(1000 * author.rate),
      expected: round(expected),
      p,
      // The distinction the report must not blur: a rate the corpus MEASURED
      // versus a ceiling inferred from never having seen it.
      basis: author.observed ? "measured" : "unseen",
      corpusCount: author.corpusCount,
      inSamples: author.inSamples,
    });
  }

  surprises.sort((a, b) => a.p - b.p);
  return { surprises, compared, unknown, draftWords };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Render. Default is silence plus one line, because a tool that prints a full
 * table every run gets skimmed and then ignored — the same outcome as not having
 * it, after paying for it.
 */
export function renderRelative(result, { corpusWords, samples, showAll = false } = {}) {
  const out = [];
  const { surprises, compared, draftWords } = result;

  out.push("");
  out.push(`  is this me?  ${draftWords} words against your corpus (${samples} samples, ${corpusWords} words)`);
  out.push("");

  const noun = (n) => `${n} construction${n === 1 ? "" : "s"}`;

  if (!surprises.length) {
    if (compared < THIN_COMPARISON) {
      out.push(`  Catalogued constructions in this draft: ${compared}. That is almost`);
      out.push("  nothing to compare against, so this is not a clean bill of health -");
      out.push("  it is a check that had little to look at.");
      out.push("");
      out.push("  The scan only sees constructions the catalog names. Most of how you");
      out.push("  write is not catalogued, and no count will reach it.");
    } else {
      out.push(`  Nothing unusual. ${noun(compared)} checked against your own rates.`);
    }
    out.push("");
    return out.join("\n");
  }

  out.push(`  ${surprises.length} thing${surprises.length === 1 ? "" : "s"} to look at. Each one is a question, not a verdict:`);
  out.push("");

  for (const s of surprises) {
    const you = s.basis === "measured"
      ? `you: ${s.authorPer1k}/1k (${s.corpusCount} across ${s.inSamples} samples)`
      : `your corpus has none of these`;
    out.push(`  ${s.title}`);
    out.push(`    this draft: ${s.draftCount} (${s.draftPer1k}/1k) · ${you}`);
    out.push(`    expected about ${s.expected} in a draft this long`);
    out.push("");
  }

  out.push("  Three things produce this and the scan cannot tell them apart:");
  out.push("    the draft drifted · you are writing something new · your corpus is too");
  out.push("    narrow to describe you any more.");
  out.push("");
  out.push("  If it is you, the corpus is wrong and worth widening — add the passage and");
  out.push("  re-run calibrate. That disagreement is better data than another sample,");
  out.push("  because it covers exactly what the corpus does not.");
  out.push("");

  if (showAll) {
    out.push(`  (${noun(compared)} compared in total.)`);
    out.push("");
  }
  return out.join("\n");
}
