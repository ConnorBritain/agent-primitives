/**
 * The evidence for a deliberate gap in `fidelity-scan`: single-word named
 * entities are not extracted, and P3(c) asked whether they should be.
 *
 * WHY THIS LIVES IN tests/ AND NOT IN THE TOOL. The rule below is the rule the
 * tool DOES NOT USE. It is the alternative under test, and putting it in the
 * production module would mean shipping a second extraction heuristic that
 * nothing in the critic pipeline calls. It is also deliberately written against
 * the tool's public `extractAtoms` rather than against its internal regex, so
 * "already covered by a multi-word run" always means what the tool means by it.
 *
 * The survey enumerates; `selftest.mjs` classifies and asserts. Between them the
 * decision recorded in `fidelity-scan.mjs` is re-derivable rather than
 * remembered, so the next person can overturn it with measurements instead of
 * arguing with a comment.
 */

import { extractAtoms } from "../tools/fidelity-scan.mjs";

/** Same shape as the tool's capitalised-word class, and Unicode for the same
 * reason: `\b` is ASCII even under `/u`, so the word edges are spelled out. */
const CAP_WORD = String.raw`\p{Lu}\p{Ll}+`;
const EDGE_L = String.raw`(?<![\p{L}\p{N}_])`;
const EDGE_R = String.raw`(?![\p{L}\p{N}_])`;

/**
 * Sentence-initial capitals are indistinguishable from names without POS
 * tagging, so the rule under test excludes the words that are never names.
 * This is the charitable version: stacking the deck FOR the rule means a poor
 * result is a lower bound on how poor it is.
 */
export const FUNCTION_WORDS = new Set([
  "A", "An", "And", "As", "At", "But", "By", "For", "From", "He", "Her", "His",
  "I", "If", "In", "It", "Its", "My", "Nay", "No", "Not", "Of", "On", "Or",
  "She", "So", "That", "The", "Their", "Then", "There", "They", "This", "To",
  "We", "What", "When", "Which", "Who", "With", "Yes", "Yet", "You", "Your",
]);

const stripFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n/, "");

/**
 * Every capitalised word the most permissive defensible rule would newly tag:
 * not sentence-initial, not a function word, not already inside a multi-word
 * run the tool extracts. Enumeration only — the caller classifies.
 *
 * `sentence-initial` is approximated as "preceded by nothing, by a paragraph
 * break, or by terminal punctuation", which discards the easiest false
 * positives and so is generous toward the rule under test.
 */
export function singleWordEntityCandidates(text) {
  const body = stripFrontmatter(text);
  const covered = new Set();
  for (const a of extractAtoms(text)) {
    if (a.kind !== "proper-noun") continue;
    for (const w of a.source.split(/[ \t]+/)) covered.add(w);
  }
  const out = new Set();
  const re = new RegExp(`(^|[\\s\\S])${EDGE_L}(${CAP_WORD})${EDGE_R}`, "gu");
  for (const m of body.matchAll(re)) {
    const before = body.slice(0, m.index + m[1].length);
    if (/(?:^|[.!?]["'”’)\]]?\s|\n\s*\n\s*|^\s*)\s*$/.test(before)) continue;
    if (FUNCTION_WORDS.has(m[2]) || covered.has(m[2])) continue;
    out.add(m[2]);
  }
  return [...out];
}
