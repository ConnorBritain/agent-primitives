#!/usr/bin/env node
/**
 * prose-author selftest — thin runner.
 *
 * The suites guard the ways this bundle could quietly do harm: letting model output
 * become the definition of an author's voice, letting a draft claim more than was
 * checked, letting a profile ship an observation nothing supports, and letting a
 * drafter reach the corpus the profile exists to summarise. Every one of those
 * failures looks identical to success in the output, which is why they get tests
 * rather than review.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as proseDraft from "./suite-prose-draft.mjs";
import * as voiceProfileRender from "./suite-voice-profile-render.mjs";
import * as voiceDraft from "./suite-voice-draft.mjs";
import * as loop from "./suite-loop.mjs";
import * as corpusRates from "./suite-corpus-rates.mjs";
import * as bar from "./suite-bar.mjs";
import * as crossCount from "./suite-cross-count.mjs";
import * as acceptanceRunner from "./suite-acceptance-runner.mjs";
import * as styleTune from "./suite-style-tune.mjs";
import * as v040 from "./suite-v040.mjs";
import * as runtimeV040 from "./suite-runtime-v040.mjs";
import * as historyV050 from "./suite-history-v050.mjs";
import * as identityV060 from "./suite-identity-v060.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(HERE, "..", "..", "prose-tell-scan", "tests", "corpus");

let passed = 0;
let failed = 0;
const failures = [];

const t = {
  check(name, condition, detail = "") {
    if (condition) {
      passed += 1;
      process.stdout.write(`  ok   ${name}\n`);
    } else {
      failed += 1;
      failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
      process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`);
    }
  },
  group(title) {
    process.stdout.write(`\n${title}\n`);
  },
};

const tmp = mkdtempSync(join(tmpdir(), "prose-author-selftest-"));
// Real user defaults must never become synthetic test inputs.
const previousRegistry = process.env.PROSE_IDENTITY_DIR;
process.env.PROSE_IDENTITY_DIR = join(tmp, "empty-identity-registry");

function makeProfile(name, { human = 0, approved = 0, editFraction = 0.5 } = {}) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, "corpus", "human"), { recursive: true });
  for (let i = 0; i < human; i += 1) {
    writeFileSync(
      join(dir, "corpus", "human", `h${i}.txt`),
      `---\nsource: notebook\ndate: 2021-04-0${(i % 9) + 1}\nhuman_authored: true\n---\n`
      + `${"word ".repeat(400 + i * 50)}\n`,
    );
  }
  if (approved) {
    mkdirSync(join(dir, "corpus", "approved"), { recursive: true });
    for (let i = 0; i < approved; i += 1) {
      writeFileSync(
        join(dir, "corpus", "approved", `a${i}.txt`),
        `---\nsource: prose-author draft\ndate: 2026-01-0${(i % 9) + 1}\n`
        + `human_authored: false\nprovenance: model-drafted-human-edited\n`
        + `edit_fraction: ${editFraction}\n---\n${"word ".repeat(500)}\n`,
      );
    }
  }
  return dir;
}

const ctx = { tmp, makeProfile, HERE, CORPUS };

// Suites are selectable so one can be iterated on without re-running the others,
// which is the practical half of splitting them up. The shared fixture setup stays
// here rather than being duplicated into three standalone entry points.
const SUITES = [
  ["prose-draft", proseDraft],
  ["voice-profile-render", voiceProfileRender],
  ["voice-draft", voiceDraft],
  ["loop", loop],
  ["corpus-rates", corpusRates],
  ["bar", bar],
  ["cross-count", crossCount],
  ["acceptance-runner", acceptanceRunner],
  ["style-tune", styleTune],
  ["v040", v040],
  ["runtime-v040", runtimeV040],
  ["history-v050", historyV050],
  ["identity-v060", identityV060],
];
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const selected = only.length
  ? SUITES.filter(([name]) => only.some((a) => name.includes(a)))
  : SUITES;

if (only.length && selected.length === 0) {
  process.stderr.write(`no suite matches ${only.join(", ")}; known: ${SUITES.map(([n]) => n).join(", ")}\n`);
  process.exit(2);
}
if (only.length) {
  process.stdout.write(`running ${selected.length} of ${SUITES.length} suites: ${selected.map(([n]) => n).join(", ")}\n`);
}

try {
  for (const [, suite] of selected) await suite.run(t, ctx);
} finally {
  if (previousRegistry === undefined) delete process.env.PROSE_IDENTITY_DIR; else process.env.PROSE_IDENTITY_DIR = previousRegistry;
  rmSync(tmp, { recursive: true, force: true });
}

process.stdout.write(`\n${"\u2500".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
