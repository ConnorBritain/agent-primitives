/**
 * Text preparation for the deterministic scan.
 *
 * Two jobs, both of which exist to stop the scanner reporting things that are
 * not prose:
 *
 *   1. MASKING. Code blocks, inline code, URLs, link targets, and frontmatter
 *      are not writing and must not be scanned for writing tells. Masked regions
 *      are replaced with spaces rather than removed, so every character offset in
 *      the masked text still points at the same place in the original. Line
 *      numbers in findings stay honest.
 *
 *   2. SENTENCE SPLITTING. Cadence metrics are built on sentence lengths, so a
 *      splitter that breaks on "Dr." or "e.g." corrupts the single strongest
 *      signal the scanner has. Naive split-on-period is not good enough here.
 */

/** Abbreviations that end in a period without ending a sentence. */
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "rev", "hon", "pres",
  "gen", "col", "lt", "sgt", "capt", "cmdr", "adm", "gov", "sen", "rep",
  "e.g", "i.e", "etc", "vs", "cf", "al", "approx", "fig",
  "vol", "pp", "eds", "trans", "ibid",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "inc", "ltd", "corp", "dept", "univ", "assn",
  "u.s", "u.k", "u.n", "e.u", "a.m", "p.m", "b.c", "a.d",
]);
// Deliberately NOT abbreviations, despite the obvious temptation: "no", "ed",
// "est", "co", "st", "op", "cit". Each is a common sentence-final word ("the
// answer is no.", "the price is est."), and swallowing that boundary merges two
// sentences into one — which inflates mean length and deflates variance, the
// exact metric the cadence pass exists to measure.

/**
 * Replace a span with spaces, preserving newlines so line numbers survive.
 * This is what keeps offsets in the masked text aligned with the original.
 */
function blank(match) {
  return match.replace(/[^\n]/g, " ");
}

/**
 * Mask everything in a markdown document that is not prose.
 *
 * Order matters: frontmatter and fenced blocks are removed before inline rules
 * run, so a stray backtick inside a code fence cannot open a phantom inline span.
 *
 * Returns the masked text (same length as the input) plus a record of what was
 * masked, so the report can say "3 code blocks excluded" rather than silently
 * scanning less than the user thinks.
 */
export function maskNonProse(text, { markdown = true } = {}) {
  const masked = { frontmatter: 0, fenced: 0, inline: 0, urls: 0, comments: 0 };
  let out = text;

  const apply = (re, key) => {
    out = out.replace(re, (m) => {
      masked[key] += 1;
      return blank(m);
    });
  };

  // YAML frontmatter, only when it opens the document.
  out = out.replace(/^---\n[\s\S]*?\n---(\n|$)/, (m) => {
    masked.frontmatter += 1;
    return blank(m);
  });

  if (markdown) {
    apply(/^([ \t]*)(```|~~~)[\s\S]*?\n[ \t]*\2[ \t]*$/gm, "fenced");
    // An unterminated fence runs to end of document — otherwise the rest of the
    // file gets scanned as prose when it is actually code.
    apply(/^[ \t]*(```|~~~)[\s\S]*$/m, "fenced");
    apply(/<!--[\s\S]*?-->/g, "comments");
    apply(/`[^`\n]+`/g, "inline");
    // Link and image targets, but NOT the visible link text — that is prose.
    apply(/\]\([^)\s]*(?:\s+"[^"]*")?\)/g, "urls");
    apply(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, "urls");
  }

  // Bare URLs and paths, in any document type.
  apply(/\b(?:https?|ftp):\/\/\S+/g, "urls");
  apply(/<(?:https?|ftp):\/\/[^>]*>/g, "urls");

  if (out.length !== text.length) {
    throw new Error("masking changed document length — offsets would be wrong");
  }
  return { text: out, masked };
}

/** Byte-offset → 1-indexed line number, via a prefix table built once per document. */
export function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * Split into sentences, respecting abbreviations, decimals, and ellipses.
 *
 * Returns objects rather than strings because cadence findings need to point at
 * a line, and a bare string has lost that.
 */
export function sentences(text) {
  const out = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    // Ellipsis: skip to its end, never a boundary on the first two dots.
    if (ch === "." && text.slice(i, i + 3) === "...") {
      i += 2;
      continue;
    }
    // Decimal point or version number: 3.14, v1.2.
    if (ch === "." && /\d/.test(text[i - 1] || "") && /\d/.test(text[i + 1] || "")) continue;

    // Consume any run of terminators and closing quotes/brackets.
    let end = i;
    while (end + 1 < text.length && /[.!?]/.test(text[end + 1])) end += 1;
    while (end + 1 < text.length && /["'’”)\]]/.test(text[end + 1])) end += 1;

    const after = text.slice(end + 1);
    // A sentence ends only if whitespace-then-something follows, or the text does.
    if (after && !/^\s/.test(after)) continue;

    // Abbreviation check: the token immediately before the period.
    if (ch === ".") {
      const before = text.slice(start, i);
      const word = (before.match(/([A-Za-z][A-Za-z.]*)$/) || [])[1];
      if (word) {
        const key = word.toLowerCase().replace(/\.$/, "");
        // A single capital is an initial (J. R. R. Tolkien), not a sentence end.
        if (ABBREVIATIONS.has(key) || /^[a-z]$/i.test(key)) continue;
      }
      // A following lowercase letter means the period did not end anything.
      if (/^\s+[a-z]/.test(after) && !/^\s*\n\s*\n/.test(after)) continue;
    }

    const raw = text.slice(start, end + 1).trim();
    if (raw) out.push({ text: raw, offset: start });
    start = end + 1;
    i = end;
  }

  const tail = text.slice(start).trim();
  if (tail) out.push({ text: tail, offset: start });
  return out;
}

/**
 * Prose paragraphs, with markdown scaffolding dropped.
 *
 * Headings, list bullets, table rows, and blockquote markers are structure, not
 * sentences; counting them as paragraphs skews every length distribution.
 */
export function paragraphs(text, { markdown = true } = {}) {
  return text
    .split(/\n\s*\n/)
    .map((p) => {
      if (!markdown) return p.trim();
      return p
        .split("\n")
        .filter((l) => !/^\s{0,3}#{1,6}\s/.test(l))
        .filter((l) => !/^\s*\|.*\|\s*$/.test(l))
        .filter((l) => !/^\s*[-*_]{3,}\s*$/.test(l))
        .map((l) => l.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").replace(/^\s*>\s?/, ""))
        .join("\n")
        .trim();
    })
    .filter((p) => p.length > 0);
}

/** Words, for density denominators. Hyphens and apostrophes stay inside words. */
export function words(text) {
  return text.match(/\b[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*\b/gu) || [];
}

/** Density per 1000 words, the unit the whole scanner reports in. */
export function perThousand(count, wordCount) {
  if (!wordCount) return 0;
  return Math.round((count * 1000 / wordCount) * 100) / 100;
}
