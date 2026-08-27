/**
 * Deterministic measurements supplied to voice-profile-render.
 *
 * The renderer is responsible for interpreting a voice, not for doing bulk regex
 * arithmetic in its hidden reasoning. These rules cover only forms a machine can
 * enumerate without judgement. A rate outside this table remains qualitative.
 */

import { corpusBodies, countMatches, HABITS, words } from "./corpus-rates.mjs";

export const PROFILE_MEASUREMENT_RULES = [
  {
    id: "second-person-family",
    counting_rule: "Count case-insensitive whole-word tokens you, your, yours, you're, you've, you'd, and you'll in the extracted sample bodies.",
    pattern: HABITS.secondPerson,
  },
  {
    id: "first-person-plural-family",
    counting_rule: "Count case-sensitive whole-word tokens we, We, us, our, Our, ours, Ours, and the listed contracted we forms in the extracted sample bodies; uppercase US is excluded.",
    pattern: HABITS.solidarity,
  },
  {
    id: "contractions",
    counting_rule: "Count whole-word n't, 're, 've, 'll, 'd, and 'm forms plus 's only for the closed elision hosts it, that, there, here, who, what, where, when, how, why, he, she, let, one, nothing, everything, something, somebody, nobody, and this; possessive 's is excluded.",
    pattern: HABITS.contraction,
  },
  {
    id: "uncontracted-negatives",
    counting_rule: "Count case-insensitive whole phrases do not, does not, did not, is not, are not, was not, were not, cannot, could not, would not, should not, will not, have not, has not, and had not in the extracted sample bodies.",
    pattern: /\b(?:do not|does not|did not|is not|are not|was not|were not|cannot|could not|would not|should not|will not|have not|has not|had not)\b/gi,
  },
  {
    id: "profanity-vulgarity",
    counting_rule: "Count only the case-insensitive whole-word profanity and vulgarity forms enumerated by the prose-author corpus-rates profanity rule; coined words containing a rude root are excluded.",
    pattern: HABITS.profanity,
  },
  {
    id: "first-person-singular-family",
    counting_rule: "Count case-insensitive whole-word tokens I, me, my, mine, and myself in the extracted sample bodies.",
    pattern: /\b(?:I|me|my|mine|myself)\b/gi,
  },
  {
    id: "question-marks",
    counting_rule: "Count every literal question-mark character in the extracted sample bodies.",
    pattern: /\?/g,
  },
  {
    id: "round-parenthetical-spans",
    counting_rule: "Count each non-nested pair of round brackets whose contents stay on one line in the extracted sample bodies.",
    pattern: /\([^()\n]+\)/g,
  },
  {
    id: "em-dashes",
    counting_rule: "Count every literal em-dash character in the extracted sample bodies.",
    pattern: /—/g,
  },
  {
    id: "en-dashes",
    counting_rule: "Count every literal en-dash character in the extracted sample bodies.",
    pattern: /–/g,
  },
];

export function measureProfile(profileDir) {
  const bodies = corpusBodies(profileDir);
  const corpusWords = bodies.reduce((sum, sample) => sum + words(sample.body), 0);
  return {
    schema: "voice-profile-measurements/1",
    corpus_words: corpusWords,
    sample_count: bodies.length,
    samples: bodies.map((sample) => ({ file: sample.file, words: words(sample.body) })),
    measurements: PROFILE_MEASUREMENT_RULES.map((rule) => {
      const perSample = bodies.map((sample) => countMatches(sample.body, rule.pattern));
      const count = perSample.reduce((sum, n) => sum + n, 0);
      return {
        id: rule.id,
        count,
        per_1000_words: corpusWords ? Math.round((count / corpusWords) * 100000) / 100 : 0,
        samples_with: perSample.filter((n) => n > 0).length,
        samples_without: perSample.filter((n) => n === 0).length,
        counting_rule: rule.counting_rule,
      };
    }),
  };
}
