/**
 * artifacts — checks that need code rather than a catalog entry.
 *
 * Two kinds live here, and they ship on completely different terms.
 *
 * ============================================================================
 * DISPOSITIVE (Tier A): identifiers and citation provenance
 * ============================================================================
 *
 * An ISBN that fails its own checksum is not a style choice. Neither is a
 * citation URL carrying `utm_source=chatgpt.com`. These are artifacts in the
 * strict sense the tier requires — no human writes them in any register — and
 * they are computable offline, which is why they belong here rather than in the
 * critics.
 *
 * `utm_source` cannot be a catalog entry at all: `maskNonProse` blanks URLs and
 * link targets before the catalog ever runs, so the parameter is gone by then.
 * It needs a pass over the RAW text, and that is the whole reason this module
 * takes raw input separately.
 *
 * The narrow claim, stated because it is easy to overread: a chatbot-tagged
 * citation URL proves the CITATION came from a chatbot. It does not prove the
 * prose did. Someone can paste a link from a chat window into hand-written text.
 *
 * ============================================================================
 * MEASURED BUT NEVER FLAGGED: markdown structure
 * ============================================================================
 *
 * The source page's §Style lists heading-level skips, emoji as formatting,
 * thematic breaks before headings, and inline-header vertical lists. All four
 * are real observations and all four ship here as measurements only.
 *
 * The reason is a limitation of the evidence, not modesty. THE ACCEPTANCE CORPUS
 * IS PLAIN TEXT. Both halves of it are Wikipedia articles rendered to prose, so
 * every markdown structure was stripped before the files were written. The
 * corpus can therefore show these checks firing on legitimate human writing —
 * `thematic_break` hits two of this repo's own documents — but it cannot produce
 * a single true positive, because there is no markdown in it to find.
 *
 * That is exactly the shape of FP-2026-08-04-d: a Tier A entry validated on a
 * corpus that could not exercise the register where it misfired. Shipping a flag
 * whose false-positive side is measured and whose true-positive side is
 * unmeasurable would repeat it deliberately.
 *
 * So they are counted and reported next to em-dash and bold density, and they
 * become flaggable if and when a markdown corpus exists to justify a threshold.
 */

/**
 * ISBN check digits, both lengths. Local arithmetic, no lookup.
 *
 * A wrong checksum means the identifier was invented, which the source page
 * lists under Citations. Note what this does NOT do: a well-formed ISBN can
 * still point at the wrong book, and only a lookup would catch that. The scanner
 * claims the part it can prove.
 */
export function checkISBNs(raw) {
  const bad = [];
  for (const m of raw.matchAll(/\bISBN(?:-1[03])?[:\s]*((?:97[89][-\s]?)?[\dXx][\dXx\-\s]{7,17})/g)) {
    const digits = m[1].replace(/[-\s]/g, "");
    if (!/^[\dX]+$/i.test(digits)) continue;
    if (digits.length === 13) {
      const sum = [...digits].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
      if (sum % 10 !== 0) bad.push({ isbn: digits, reason: "ISBN-13 checksum fails" });
    } else if (digits.length === 10) {
      const sum = [...digits].reduce(
        (a, d, i) => a + (d.toUpperCase() === "X" ? 10 : Number(d)) * (10 - i), 0,
      );
      if (sum % 11 !== 0) bad.push({ isbn: digits, reason: "ISBN-10 checksum fails" });
    } else {
      bad.push({ isbn: digits, reason: `${digits.length} digits — an ISBN is 10 or 13` });
    }
  }
  return bad;
}

/** Citation URLs tagged by the chat product that produced them. */
export function checkCitations(raw) {
  return [...raw.matchAll(
    /[?&](?:utm_source=(?:openai|chatgpt\.com|copilot\.microsoft\.com|perplexity\.ai)|referrer=grok\.com)/gi,
  )].map((m) => ({ marker: m[0], reason: "citation URL tagged by a chat product" }));
}

/**
 * Markdown structure. Counted, never flagged — see the header.
 *
 * Runs on MASKED text so that fenced code, frontmatter and link targets cannot
 * contribute: a `#` inside a code block is not a heading, and measuring it as
 * one is how a scanner starts reporting on your examples.
 */
export function measureStructure(masked) {
  const headings = [...masked.matchAll(/^(#{1,6})\s+\S/gm)].map((m) => m[1].length);
  let skips = 0;
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i] - headings[i - 1] > 1) skips += 1;
  }
  return {
    heading_level_skips: skips,
    // Position-scoped: an emoji decorating a heading or list marker, not one
    // used in a sentence or a table cell.
    emoji_as_formatting:
      [...masked.matchAll(/^(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+)\p{Extended_Pictographic}/gmu)].length,
    thematic_break_before_heading:
      [...masked.matchAll(/^(?:---|\*\*\*|___)\s*\n+#{1,6}\s/gm)].length,
    inline_header_list_items:
      [...masked.matchAll(/^[-*+]\s+\*\*[^*\n]{2,40}\*\*\s*:/gm)].length,
    _about:
      "Counted, never flagged. The acceptance corpus is plain text, so it can show these "
      + "firing on legitimate human writing but cannot produce a true positive — there is no "
      + "markdown in it. A threshold would be fitted to one side of the evidence only.",
  };
}
