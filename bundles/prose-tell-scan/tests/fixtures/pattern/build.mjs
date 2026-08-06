#!/usr/bin/env node
/**
 * build — materialise every prose-pattern-critic fixture draft from the corpus.
 *
 *   node tests/fixtures/pattern/build.mjs           # check only, exits 1 on drift
 *   node tests/fixtures/pattern/build.mjs --write   # (re)write draft.md
 *
 * WHY A BUILDER AND NOT A FOLDER OF FILES. prose-review's fidelity fixtures keep an
 * `original.md` that must be byte-identical to a corpus file, because an original the
 * fixture author may edit is one they can tune until a case passes. That guard only
 * covers the untouched half of the pair; the `revision.md` beside it is freehand.
 *
 * Here there is one file per fixture and no untouched half to compare against, so the
 * guard is moved: the draft is DERIVED, and every byte of it is either corpus bytes or a
 * string written down in `fixtures.json` where a reader can see it. A quiet nudge to a
 * paragraph shows up as an undeclared edit and fails the build.
 *
 * Each `find` must occur EXACTLY ONCE in the text it is applied to. A find that matches
 * twice would make the fixture depend on replacement order, and a find that matches zero
 * times is a corpus file that moved underneath the fixture - both fail loudly rather than
 * producing a draft nobody meant.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(HERE, "fixtures.json"), "utf8"));
const CORPUS = resolve(HERE, manifest.corpus_root);

/** Apply a fixture's declared edits to its corpus source. Throws on anything ambiguous. */
export function renderFixture(fixture, corpusRoot = CORPUS) {
  let text = readFileSync(join(corpusRoot, fixture.source), "utf8");
  for (const [i, edit] of (fixture.edits ?? []).entries()) {
    const hits = text.split(edit.find).length - 1;
    if (hits !== 1) {
      throw new Error(
        `${fixture.name}: edit ${i} matched ${hits} times in ${fixture.source}, expected exactly 1`,
      );
    }
    text = text.replace(edit.find, edit.replace);
  }
  return text;
}

export function loadManifest() {
  return { manifest, corpusRoot: CORPUS, dir: HERE };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = process.argv.includes("--write");
  let drift = 0;
  for (const f of manifest.fixtures) {
    const want = renderFixture(f);
    const dir = join(HERE, f.name);
    const file = join(dir, "draft.md");
    if (write) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, want);
      process.stdout.write(`  wrote ${f.name}/draft.md\n`);
    } else if (!existsSync(file)) {
      drift += 1;
      process.stdout.write(`  MISSING ${f.name}/draft.md\n`);
    } else if (readFileSync(file, "utf8") !== want) {
      drift += 1;
      process.stdout.write(`  DRIFT   ${f.name}/draft.md does not match source + declared edits\n`);
    } else {
      process.stdout.write(`  ok      ${f.name}\n`);
    }
  }
  process.exit(drift ? 1 : 0);
}
