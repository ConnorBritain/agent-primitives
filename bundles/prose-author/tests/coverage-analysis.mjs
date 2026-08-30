/**
 * Paragraph-level coverage comparison for repeated voice-profile renders.
 *
 * A previous one-off comparison split prose into sentences. It consequently marked a
 * habit absent when one sentence named it and the next sentence supplied its rate. A
 * paragraph is the renderer's unit of observation, so this analyzer keeps those two
 * sentences together.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseFences } from "./fences.mjs";

export const DEFAULT_HABITS = [
  { id: "person-reader-stance", pattern: /\b(?:first|second|third)[ -]person\b|\b(?:reader|pronouns?|\bwe\b|\byou\b)\b/i },
  { id: "contraction-negation", pattern: /\bcontract(?:ion|ed)|\bnegation|\buncontracted\b/i },
  { id: "qualification-hedging", pattern: /\bqualif(?:y|ication)|\bhedg(?:e|ing)|\bconcessive\b/i },
  { id: "questions-imperatives-vocatives", pattern: /\bquestions?|\bimperatives?|\bvocatives?\b/i },
  { id: "opponents-allies-sources", pattern: /\bopponents?|\ballies|\bsources?|\battribut(?:e|ion|ive)\b/i },
  { id: "profanity-vulgarity", pattern: /\bprofan(?:e|ity)|\bvulgar(?:ity)?\b/i },
  { id: "self-reference-biography", pattern: /\bself-reference|\bbiograph(?:y|ical)|\bpersonal (?:history|experience|testimony|disclosure|material)\b|\bfirst-person singular\b|\bthe (?:writer|author) (?:does not )?appear(?:s)? as (?:a person|an individual)\b/i },
  { id: "interruption-punctuation", pattern: /\binterruption|\bparenthe(?:sis|tical)|\bdashes?\b/i },
  { id: "figures-analogy", pattern: /\bfigures?|\banalog(?:y|ies)|\bmetaphor|\bimage vocabulary\b/i },
  { id: "openings-endings-closure", pattern: /\bopenings?|\bparagraph endings?|\bclos(?:e|es|ing|ure)\b/i },
];

const RATE_PATTERN = /\b\d+(?:\.\d+)?\s+(?:instances?\s+)?per\s+1[,.]?000\s+words\b|"per_1000_words"\s*:/i;

export function analyzeParagraphCoverage(markdown, habits = DEFAULT_HABITS) {
  const paragraphs = String(markdown ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return habits.map(({ id, pattern }) => {
    const mentions = paragraphs.filter((p) => pattern.test(p));
    const rated = mentions.filter((p) => RATE_PATTERN.test(p));
    return {
      id,
      status: rated.length > 0 ? "rated" : mentions.length > 0 ? "mentioned" : "absent",
      paragraph_count: mentions.length,
      rated_paragraph_count: rated.length,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    process.stderr.write("usage: node coverage-analysis.mjs <render.md> [...]\n");
    process.exitCode = 2;
  } else {
    const result = Object.fromEntries(files.map((file) => {
      const raw = readFileSync(file, "utf8");
      const parsed = parseFences(raw);
      return [file, analyzeParagraphCoverage(parsed.markdown ?? raw)];
    }));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}
