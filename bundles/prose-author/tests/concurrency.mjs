#!/usr/bin/env node
/**
 * concurrency — mutations.mjs must never touch the working tree.
 *
 *   node bundles/prose-author/tests/concurrency.mjs
 *
 * WHAT BREAKS IF THIS REGRESSES, and it is not "a test gets slower".
 *
 * mutations.mjs deliberately breaks real guards to prove a test catches them. It
 * used to break them IN THE WORKING TREE and restore them afterwards, so for the
 * minute it runs, the repo on disk was intermittently broken. Any other process
 * running a suite in that window saw genuinely broken source and reported
 * genuine failures.
 *
 * That is not theoretical. Two reviewers running in parallel during the
 * prose-fidelity-critic review both reported the prose-tell-scan suite as
 * "flaky", 2-4 intermittent failures. It is not flaky - 8 sequential and 6
 * concurrent runs are green. One reviewer was running mutation experiments while
 * the other ran suites, and they collided through the working tree.
 *
 * The bite: the repo's own verification gate REQUIRES running verification-critic
 * and architecture-reviewer in parallel. The prescribed review process was unsafe
 * against the repo's own test tooling, and the failure mode was reviewers
 * reporting defects that did not exist - which costs trust in precisely the
 * mechanism built to establish it.
 *
 * WHY THIS IS ITS OWN FILE rather than a block in selftest.mjs. mutations.mjs
 * runs selftest.mjs inside a sandbox. A sandbox-creating check living in that
 * suite makes every mutation copy the repo again, nested - which turned one
 * mutation's score into CRASH the first time it was tried. A test about the
 * sandbox cannot live inside the thing the sandbox runs.
 */

import { readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS, createSandbox, applyIn } from "./mutations.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`);
  }
}

process.stdout.write("\nmutations run on a copy, never on the working tree\n");

const sandbox = createSandbox();
try {
  // Every mutation is checked, not just the first. A single sampled mutation
  // would pass while a later one still wrote to the tree, and "most of them are
  // safe" is not the property this file exists to assert.
  let treeUntouched = true;
  let sandboxReallyBroken = true;
  const offenders = [];

  for (const mut of MUTATIONS) {
    const realPath = join(REPO, mut.file);
    const before = readFileSync(realPath, "utf8");

    const restore = applyIn(sandbox, mut);
    const duringReal = readFileSync(realPath, "utf8");
    const duringSandbox = readFileSync(join(sandbox, mut.file), "utf8");
    restore();

    if (duringReal !== before) { treeUntouched = false; offenders.push(mut.name); }
    // The paired positive. Without it a no-op `applyIn` satisfies the check above
    // perfectly, every mutation silently scores zero, and MUTATIONS.md becomes a
    // table of guards nothing tests - which is the exact failure that table was
    // built to prevent.
    if (duringSandbox === before || !duringSandbox.includes(mut.with)) {
      sandboxReallyBroken = false;
      offenders.push(`${mut.name} (sandbox not actually mutated)`);
    }
  }

  // Truncated: when this regresses it regresses for EVERY mutation at once, and a
  // 19-item detail string is unreadable at exactly the moment it matters.
  const detail = offenders.length
    ? `${offenders.slice(0, 3).join("; ")}${offenders.length > 3 ? ` … and ${offenders.length - 3} more` : ""}`
    : "";

  check(`all ${MUTATIONS.length} mutations leave the working tree byte-identical`,
    treeUntouched, detail);
  check("...while each one really does break its sandbox copy",
    sandboxReallyBroken, detail);
  check("and the sandbox is outside the repo", !sandbox.startsWith(REPO), sandbox);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
