#!/usr/bin/env node
/** Deterministic, provider-neutral measurements for voice-profile assembly. */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readSamples } from "./exemplars.mjs";

const BOILERPLATE_HEADINGS = new Set([
  "Hey look at this", "Object permanence", "Upcoming appearances", "Recent appearances",
  "Latest books", "Upcoming books", "Colophon",
]);

const patterns = {
  profanity: /\b(fuck|fucks|fucked|fucking|fucker|fuckers|shit|shits|shitty|shittiness|bullshit|piss|pissed|pissing|crap|crappy|ass|asses|asshole|assholes|bastard|bastards|damn|damned|goddamn|hell|balls|bollocks|dick|dicks|prick|pricks|cunt|cunts|wank|wanker|wankers|screwed|suck|sucks)\b/gi,
  solidarity: /\b(we|We|us|our|Our|ours|Ours|we're|We're|we've|We've|we'd|We'd|we'll|We'll)\b/g,
  secondPerson: /\b(you|your|yours|you're|you've|you'd|you'll)\b/gi,
  contraction: /\b(?:(?:it|that|there|here|who|what|where|when|how|why|he|she|let|one|nothing|everything|something|somebody|nobody|this)['’]s|[A-Za-z]+['’](?:t|re|ve|ll|d|m))\b/gi,
};

export const PROFILE_MEASUREMENT_RULES = [
  { id: "second-person-family", counting_rule: "Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies.", pattern: patterns.secondPerson },
  { id: "first-person-plural-family", counting_rule: "Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded.", pattern: patterns.solidarity },
  { id: "contractions", counting_rule: "Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded.", pattern: patterns.contraction },
  { id: "uncontracted-negatives", counting_rule: "Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies.", pattern: /\b(?:do not|does not|did not|is not|are not|was not|were not|cannot|could not|would not|should not|will not|have not|has not|had not)\b/gi },
  { id: "profanity-vulgarity", counting_rule: "Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author profanity rule; coined words containing a rude root are excluded.", pattern: patterns.profanity },
  { id: "first-person-singular-family", counting_rule: "Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies.", pattern: /\b(?:I|me|my|mine|myself)\b/gi },
  { id: "question-marks", counting_rule: "Count every literal question-mark character in the extracted sample bodies.", pattern: /\?/g },
  { id: "round-parenthetical-spans", counting_rule: "Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies.", pattern: /\([^()\n]+\)/g },
  { id: "em-dashes", counting_rule: "Count every literal em-dash character in the extracted sample bodies.", pattern: /—/g },
  { id: "en-dashes", counting_rule: "Count every literal en-dash character in the extracted sample bodies.", pattern: /–/g },
];

export function extractProfileBody(raw) {
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw ?? "");
  const body = frontmatter ? raw.slice(frontmatter[0].length) : (raw ?? "");
  const lines = body.split(/\r?\n/);
  const first = lines.findIndex((line) => /\(permalink\)\s*$/.test(line));
  if (first === -1) return { body: body.trim(), extraction: "whole-file" };
  let end = lines.length;
  for (let i = first + 1; i < lines.length; i += 1) {
    if (!/\(permalink\)\s*$/.test(lines[i])) continue;
    const title = lines[i].replace(/\s*\(permalink\)\s*$/, "").trim();
    if (BOILERPLATE_HEADINGS.has(title)) { end = i; break; }
  }
  return { body: lines.slice(first + 1, end).join("\n").trim(), extraction: "permalink-delimited" };
}

const words = (value) => value.trim() ? value.trim().split(/\s+/).length : 0;
const count = (value, pattern) => value.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))?.length ?? 0;

export function measureProfile(profileDir) {
  const humanDir = join(profileDir, "corpus", "human");
  const { usable, excluded } = readSamples(humanDir, { requireAttestation: true });
  const bodies = usable.map((sample) => ({ file: sample.file, ...extractProfileBody(readFileSync(sample.path, "utf8")) }));
  const corpusWords = bodies.reduce((sum, sample) => sum + words(sample.body), 0);
  return {
    schema: "voice-profile-measurements/1",
    corpus_words: corpusWords,
    sample_count: bodies.length,
    samples: bodies.map((sample) => ({ file: sample.file, words: words(sample.body) })),
    samples_excluded: excluded,
    undelimited_samples: bodies.filter((sample) => sample.extraction === "whole-file").map((sample) => sample.file),
    measurements: PROFILE_MEASUREMENT_RULES.map((rule) => {
      const perSample = bodies.map((sample) => count(sample.body, rule.pattern));
      const total = perSample.reduce((sum, value) => sum + value, 0);
      const filesWith = bodies.filter((_, i) => perSample[i] > 0).map((sample) => sample.file);
      const filesWithout = bodies.filter((_, i) => perSample[i] === 0).map((sample) => sample.file);
      return {
        id: rule.id, count: total,
        per_1000_words: corpusWords ? Math.round((total / corpusWords) * 100000) / 100 : 0,
        samples_with: filesWith.length, samples_without: filesWithout.length,
        files_with: filesWith, files_without: filesWithout,
        counting_rule: `[measurement:${rule.id}] ${rule.counting_rule}`,
      };
    }),
  };
}

function main() {
  const profileDir = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!profileDir) {
    process.stderr.write("profile-measure: usage: node profile-measure.mjs <profile-dir> [--context <profile-name>]\n");
    process.exitCode = 2;
    return;
  }
  const measured = measureProfile(resolve(profileDir));
  const contextIndex = process.argv.indexOf("--context");
  const profile = contextIndex === -1 ? null : process.argv[contextIndex + 1];
  const output = profile ? {
    profile, measurements: measured,
    samples_used: measured.samples.map((sample) => sample.file),
    samples_excluded: measured.samples_excluded,
  } : measured;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && existsSync(process.argv[1]) && resolve(process.argv[1]) === self) main();
