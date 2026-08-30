#!/usr/bin/env node
/**
 * check — test this run's three pre-registered predictions.
 *
 *   node check.mjs <draft.txt>
 *
 * WHY THIS IS CHECKED IN AND NOT A THROWAWAY. The predictions were committed before the
 * run (DESIGN.md, dcede29). A measurement written afterwards can be shaped, however
 * honestly, by the numbers it is about to report. This one is written before the draft
 * exists and its thresholds come from DESIGN.md, not from what the draft turns out to do.
 *
 * WHY THE FIGURE VOCABULARY IS NOT IN `HABITS`. corpus-rates.mjs exports habits that
 * generalise - contraction, second person, profanity. A body-and-indignity word list is a
 * register, and this one was assembled by reading THIS corpus. Promoting it to a general
 * instrument would be claiming it travels, which is untested. It lives here, scoped to the
 * run that uses it, and says so.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS = resolve(HERE, "..", "..");
const { corpusBodies, corpusRate, words, bodyOf, HABITS } = await import(`${TESTS}/corpus-rates.mjs`);

/**
 * The register the corpus builds its figures from — body, waste, animal, appetite.
 *
 * Assembled by reading the corpus, not by intuition. Every word below occurs in it. The
 * S7 measurement using this list found the corpus at 10/10 samples and all six drafts at
 * exactly zero, which is the deficit P1 tests.
 */
const FIGURE_WELL = /\b(orifice|orifices|bladder|bladders|piss|pissed|piss-bottles|pee|balls|kidney|kidneys|vagina|guts?|gut flora|hairball|throat|blood|flesh|licks?|swallow|belly|bowel|carcass|maggot|vomit|sweat|spit|teeth|tongue|appetite|horny)\b/gi;

/** Habits P3 requires to stay in band, with the S7 corpus rates they are measured against. */
const IN_BAND = {
  "second person": HABITS.secondPerson,
  "we/us":         HABITS.solidarity,
  "contraction":   HABITS.contraction,
  "profanity":     HABITS.profanity,
  "parenthesis":   /\([^)]{4,}\)/g,
  "en dash":       /–/g,
};

const draftPath = process.argv[2];
if (!draftPath) { process.stderr.write("usage: check.mjs <draft.txt>\n"); process.exit(2); }

const b = corpusBodies(`${TESTS}/fixtures/profiles/doctorow-blog`);
const t = bodyOf(readFileSync(draftPath, "utf8"));
const w = words(t);
const rate = (re) => ((t.match(re) || []).length / w) * 1000;
const n = (re) => (t.match(re) || []).length;

let failed = 0;

// P1 — the figure vocabulary must come back non-zero. All six S7 drafts were at zero.
const wellCorpus = corpusRate(b, FIGURE_WELL);
const wellDraft = n(FIGURE_WELL);
const p1 = wellDraft > 0;
if (!p1) failed++;
process.stdout.write(`\n  P1 figure vocabulary   corpus ${wellCorpus.per1000.toFixed(2)}/1000 (${wellCorpus.support}/${wellCorpus.of})   draft ${wellDraft} (${rate(FIGURE_WELL).toFixed(2)})   ${p1 ? "PASS" : "FALSIFIED"}\n`);

// P3 — habits already in band stay in band. Band is half to double the corpus rate.
process.stdout.write("\n  P3 no collateral damage\n");
for (const [name, re] of Object.entries(IN_BAND)) {
  const c = corpusRate(b, re).per1000;
  const d = rate(re);
  const ok = d >= c * 0.5 && d <= c * 2;
  if (!ok) failed++;
  process.stdout.write(`     ${name.padEnd(15)} corpus ${c.toFixed(2).padStart(6)}   draft ${d.toFixed(2).padStart(6)}   ${ok ? "in band" : "OUT OF BAND"}\n`);
}
const em = n(/—/g);
if (em > 0) failed++;
process.stdout.write(`     ${"em dash".padEnd(15)} corpus   0.00   draft ${String(em).padStart(6)}   ${em === 0 ? "in band" : "OUT OF BAND"}\n`);

process.stdout.write(`\n  P2 (the finding does not recur) is a critic result and is not measured here.\n`);
process.stdout.write(`\n  ${failed === 0 ? "P1 and P3 hold" : `${failed} prediction(s) falsified`}\n\n`);
process.exit(failed === 0 ? 0 : 1);
