/**
 * Phase 1a — catalog scan. Deterministic, no model calls.
 *
 * Reports DENSITY (hits per 1000 words) rather than raw counts, because a raw
 * count is not comparable across lengths and every threshold in the profile
 * system is expressed as a density.
 *
 * Every hit carries a line number and the matched text. A finding a human
 * cannot locate is a finding they cannot act on or argue with, and arguing with
 * it is the point — this tool emits signals for a person to weigh, never a
 * verdict.
 */

import { lineIndex, perThousand, words } from "./text.mjs";

/**
 * Compile one catalog entry to a global regex.
 *
 * Lexical entries are word-bounded automatically so the catalog can hold plain
 * words. Structural entries carry their own anchoring, because the shapes they
 * match are rarely word-shaped.
 */
function compile(entry) {
  const src = entry.kind === "lexical" ? `\\b(?:${entry.pattern})\\b` : entry.pattern;
  try {
    return new RegExp(src, entry.flags || "gi");
  } catch (err) {
    throw new Error(`catalog entry "${entry.id}": bad pattern — ${err.message}`);
  }
}

/**
 * A window of surrounding prose, with the match marked.
 *
 * A bare matched word is not reviewable: "genuinely" tells you nothing about
 * whether this particular "genuinely" is doing work. The sentence around it
 * does, and the whole design premise here is that a human decides.
 */
function context(text, index, length, window = 34) {
  const from = Math.max(0, index - window);
  const to = Math.min(text.length, index + length + window);
  const before = text.slice(from, index).replace(/\s+/g, " ");
  const hit = text.slice(index, index + length).replace(/\s+/g, " ");
  const after = text.slice(index + length, to).replace(/\s+/g, " ");
  return `${from > 0 ? "…" : ""}${before}«${hit}»${after}${to < text.length ? "…" : ""}`;
}

/**
 * Is this hit allowlisted?
 *
 * Checked against the MATCHED TEXT and the entry id, never against the pattern
 * source. The prototype checked the pattern source, which meant an allowlist
 * entry only worked when it happened to be a literal prefix of the regex —
 * "underscore" suppressed "underscore[sd]?" but "underscores" suppressed
 * nothing.
 */
function allowed(entry, matchText, allow) {
  if (allow.has(entry.id.toLowerCase())) return true;
  const t = matchText.toLowerCase().trim();
  if (allow.has(t)) return true;
  // Allow a base form to cover its inflections: "foster" covers "fostering".
  for (const term of allow) {
    if (t === term || t.startsWith(term) && t.length - term.length <= 3) return true;
  }
  return false;
}

/**
 * Run the catalog over prepared (masked) text.
 *
 * @param {string} text    masked document — offsets align with the original
 * @param {object} catalog merged catalog (base + profile overrides)
 * @param {Set<string>} allow  allowlisted terms for this register
 * @param {object} opts    { maxExamples } how many examples to retain per entry
 */
export function scanCatalog(text, catalog, allow, { maxExamples = 4 } = {}) {
  const lineOf = lineIndex(text);
  const wordCount = words(text).length;
  const findings = [];
  const suppressed = [];

  for (const entry of catalog.entries) {
    const re = compile(entry);
    const hits = [];
    let skipped = 0;
    let m;

    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1; // zero-width match guard: never loop forever
        continue;
      }
      if (allowed(entry, m[0], allow)) {
        skipped += 1;
        continue;
      }
      hits.push({
        line: lineOf(m.index),
        offset: m.index,
        text: m[0].replace(/\s+/g, " ").trim(),
        context: context(text, m.index, m[0].length),
      });
    }

    if (skipped > 0) suppressed.push({ id: entry.id, label: entry.label, count: skipped });
    if (hits.length === 0) continue;

    findings.push({
      id: entry.id,
      label: entry.label,
      category: entry.category,
      kind: entry.kind,
      severity: entry.severity,
      confidence: entry.confidence,
      tier: entry.tier || null,
      always_flag: Boolean(entry.always_flag),
      era: entry.era || null,
      note: entry.note,
      source: entry.source,
      count: hits.length,
      per_1k: perThousand(hits.length, wordCount),
      lines: hits.slice(0, maxExamples).map((h) => h.line),
      examples: hits.slice(0, maxExamples).map((h) => h.text),
      contexts: hits.slice(0, maxExamples).map((h) => ({ line: h.line, text: h.context })),
    });
  }

  findings.sort(
    (a, b) => b.severity - a.severity || b.per_1k - a.per_1k || a.label.localeCompare(b.label),
  );
  return { findings, suppressed, wordCount };
}

/**
 * Punctuation and formatting measures that are counted rather than matched.
 *
 * Em-dash density is the one people ask about. It is reported, but it is a weak
 * signal on its own: plenty of good writers lean on the em dash, and treating it
 * as strong evidence is how a scanner starts flagging its own repo's docs.
 */
export function scanFormatting(text, paras, wordCount) {
  const count = (re) => (text.match(re) || []).length;

  const emDash = count(/[—–]/g) + count(/(?<=\S) -{2} (?=\S)/g);
  const bold = count(/\*\*[^*\n]+\*\*/g);
  const headings = count(/^\s{0,3}#{1,6}\s+\S/gm);
  const curly = count(/[“”‘’]/g);
  const straight = count(/["']/g);

  return {
    em_dash: { count: emDash, per_1k: perThousand(emDash, wordCount),
               per_para: paras.length ? Math.round((emDash / paras.length) * 100) / 100 : 0 },
    bold: { count: bold, per_1k: perThousand(bold, wordCount) },
    headings: { count: headings, per_1k: perThousand(headings, wordCount) },
    // Mixed quote styles inside one document suggest paste-assembly rather than
    // authorship. Only meaningful when both appear in quantity.
    quotes: { curly, straight, mixed: curly > 2 && straight > 2 },
  };
}
