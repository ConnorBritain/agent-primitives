/**
 * Shared derivation of the author names a prompt must never contain.
 *
 * WHY THIS EXISTS.
 *
 * The S2 prompt leak: worked examples in `voice-profile-render`'s prompt quoted two of
 * the findings the run then credited the primitive with deriving. A primitive whose one
 * job is to avoid inventing observations was being handed its conclusions in its own
 * instructions. Both prompt suites guard against it, and both derived the forbidden list
 * the same way - so the derivation lives here rather than in two places drifting apart.
 *
 * WHY THE DERIVATION IS NOT JUST "the first segment of the fixture directory name".
 *
 * That heuristic is what both suites used, and it is wrong in both directions:
 *
 *   - It has false positives. `mixed-thin` and `near-mixed` are named for how their
 *     corpora are COMPOSED, not for an author. Their prefixes are ordinary English
 *     words, and the guard failed a prompt for the sentence "any dimension where the
 *     corpus is silent or mixed" - a line with no author in it at all.
 *
 *   - It has false negatives, which matter more. It only ever checks the surname, so
 *     a prompt naming `Cory`, `Kate` or `Anton` sails through, and it never reads the
 *     `author:` frontmatter that several fixtures actually carry.
 *
 * So the list is built from three sources and the composition-named fixtures are
 * declared rather than inferred. Declaring them is the point: NOT_AUTHOR_NAMED is
 * checked against the fixtures on disk, so a fixture added later cannot quietly inherit
 * an exemption, and an entry that stops matching a real directory fails loudly.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { HABITS, corpusBodies, corpusRate, words } from "./corpus-rates.mjs";

/**
 * Fixture directories whose name describes the corpus's composition, not its author.
 *
 * Every entry needs a reason, because an entry here removes a check.
 */
export const NOT_AUTHOR_NAMED = {
  "mixed-thin": "five authors deliberately mixed; 'mixed' and 'thin' describe the corpus",
  "near-mixed": "two stylistically adjacent authors; 'near' and 'mixed' describe the corpus",
};

/**
 * Shortest token treated as evidence of a leak.
 *
 * Four, not five, because given names are short: `Cory`, `Kate` and `Anton` are all
 * at or below five characters, and a prompt naming an author by first name leaks
 * exactly as hard as one naming the surname. A five-character floor silently dropped
 * every given name in the fixture set, which is the hole this floor existed to close.
 *
 * Below four this would start matching ordinary words and fail honest prompts, which
 * is the failure the `mixed` false positive already demonstrated.
 */
const MIN_TOKEN = 4;

function authorTokensFromCorpus(fixtureDir) {
  const tokens = new Set();
  const humanDir = join(fixtureDir, "corpus", "human");
  if (!existsSync(humanDir)) return tokens;

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!/\.(txt|md)$/i.test(entry.name)) continue;
      const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(p, "utf8"));
      if (!fm) continue;
      const m = /^author:\s*(.+)$/im.exec(fm[1]);
      if (!m) continue;
      for (const tok of m[1].split(/[^A-Za-z]+/)) {
        if (tok.length >= MIN_TOKEN) tokens.add(tok.toLowerCase());
      }
    }
  };
  walk(humanDir);
  return tokens;
}

/**
 * For each fixture directory, the strings a prompt must not contain.
 *
 * Returns `[{ fixture, tokens, sampleFiles }]`. `tokens` is empty only for a fixture
 * declared in NOT_AUTHOR_NAMED that also carries no author metadata.
 */
export function fixtureGuards(fixturesDir) {
  if (!existsSync(fixturesDir)) return [];

  return readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((fixture) => {
      const dir = join(fixturesDir, fixture);
      const tokens = authorTokensFromCorpus(dir);

      // The directory prefix is still evidence for fixtures named after their author -
      // bacon and chekhov carry no `author:` frontmatter at all, so dropping this
      // would leave them unguarded.
      if (!(fixture in NOT_AUTHOR_NAMED)) {
        const prefix = fixture.split("-")[0];
        if (prefix.length >= MIN_TOKEN) tokens.add(prefix.toLowerCase());
      }

      const humanDir = join(dir, "corpus", "human");
      const sampleFiles = existsSync(humanDir)
        ? readdirSync(humanDir).filter((f) => /\.(txt|md)$/i.test(f))
        : [];

      return { fixture, tokens: [...tokens].sort(), sampleFiles };
    });
}

/**
 * Entries in NOT_AUTHOR_NAMED that no longer match a fixture on disk.
 *
 * A stale exemption is how a real author name silently stops being checked, so the
 * suites assert this is empty rather than trusting the table.
 */
/**
 * Distinctive numbers measured from the fixture corpora, which a prompt must not contain.
 *
 * WHY A SECOND KIND OF LEAK EXISTS. The name guard above catches a prompt that says
 * "Chekhov". It does not catch a prompt that says "a habit occurring 2.6 times in a
 * 1,755-word sample" - and 2.6 and 1,755 are the doctorow corpus's actual profanity rate
 * and mean sample length. A renderer told that number, then asked to measure that corpus,
 * can report it without counting.
 *
 * This was a live leak, written into the prompt while adding the `rate` field and caught
 * by hand rather than by any check - in the same commit whose whole purpose was making
 * the renderer's counts trustworthy. Handing the renderer the number it is supposed to
 * derive is the S2 leak with arithmetic instead of prose.
 *
 * Only DISTINCTIVE values are returned. Small integers collide with ordinary prompt text
 * ("the eight sections", "10/10 samples") and would fail honest prompts, which is the
 * false-positive failure the name guard already demonstrated.
 */
export function corpusMeasurements(fixturesDir) {
  if (!existsSync(fixturesDir)) return [];
  const out = [];

  for (const { fixture } of fixtureGuards(fixturesDir)) {
    const bodies = corpusBodies(join(fixturesDir, fixture));
    if (bodies.length === 0) continue;

    const totalWords = bodies.reduce((a, b) => a + words(b.body), 0);
    const meanWords = Math.round(totalWords / bodies.length);

    const add = (value, what) => {
      // Below 1000 the integers are not distinctive enough to be evidence.
      if (value >= 1000) {
        out.push({ fixture, what, token: String(value) });
        out.push({ fixture, what, token: value.toLocaleString("en-US") });
      }
    };
    add(totalWords, "total body words");
    add(meanWords, "mean sample words");

    for (const [habit, pattern] of Object.entries(HABITS)) {
      const { count, per1000 } = corpusRate(bodies, pattern);
      if (count >= 10) out.push({ fixture, what: `${habit} count`, token: String(count) });
      // Two decimals is specific enough to be a fingerprint rather than a coincidence.
      const rate = per1000.toFixed(2);
      if (per1000 >= 1) out.push({ fixture, what: `${habit} per 1000 words`, token: rate });
      const perPiece = ((per1000 * meanWords) / 1000).toFixed(1);
      if (Number(perPiece) >= 1) out.push({ fixture, what: `${habit} per piece`, token: perPiece });
    }
  }
  return out;
}

export function staleExemptions(fixturesDir) {
  if (!existsSync(fixturesDir)) return [];
  const present = new Set(
    readdirSync(fixturesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
  );
  return Object.keys(NOT_AUTHOR_NAMED).filter((n) => !present.has(n));
}
