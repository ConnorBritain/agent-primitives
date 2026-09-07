#!/usr/bin/env node
/**
 * mutations — apply each documented mutation, assert the recorded failure count.
 *
 *   node tests/mutations.mjs            # verify every row
 *   node tests/mutations.mjs --update   # rewrite the table from the runs
 *
 * WHY THIS IS A SCRIPT AND NOT A TABLE. `AGENTS.md` requires the negative test:
 * break a guard, confirm a test fails, restore. The results lived in a
 * hand-maintained markdown table, and a hand-maintained table of measurements is
 * the single failure this project keeps repeating - nine logged instances in
 * CALIBRATION.md, all of them a number that was true when written and untrue
 * when read.
 *
 * It happened to this very table, one commit after it was created. A new
 * cross-implementation check was added, which ALSO fires when the README filter
 * is removed, so a row that correctly said 1 silently became 2. The commit
 * re-ran the row it was adding and not the rows it was invalidating - the exact
 * second-order blindness the log describes.
 *
 * So the table is now output, not input. If a change to the suite alters what a
 * mutation costs, this fails until someone looks.
 *
 * EACH MUTATION MUST STILL BE A REAL DEFECT. A mutation nothing catches means
 * the guard has no test, which is a finding rather than a passing row - the
 * README filter scored 0 that way, and needed a test written before it could
 * honestly appear here at all.
 *
 * IT RUNS ON A COPY, AND THAT IS NOT AN OPTIMISATION. This script used to break
 * real source files in the working tree and restore them afterwards. For the
 * minutes it ran, the repo on disk was intermittently broken - so ANY other
 * process running a suite in that window saw genuinely broken source and
 * reported genuine failures.
 *
 * That is not hypothetical. Two reviewers running in parallel during the
 * prose-fidelity-critic review both reported the prose-tell-scan suite as
 * "flaky", 2-4 intermittent failures. It is not flaky: 8 sequential and 6
 * concurrent runs are green. One reviewer was running mutation experiments while
 * the other ran suites, and they collided through the working tree.
 *
 * The bite is that the repo's own verification gate REQUIRES running
 * verification-critic and architecture-reviewer in parallel. The prescribed
 * review process was unsafe against the repo's own test tooling, and the failure
 * mode was reviewers reporting defects that were not there - which costs trust
 * in precisely the mechanism built to establish it.
 *
 * So: every mutation is applied inside a throwaway copy under the OS temp dir,
 * and the working tree is never written to. Only MUTATIONS.md is, and only on
 * --update.
 */

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(HERE, "..");
const REPO = resolve(BUNDLE, "..", "..");

/** MUTATIONS.md is the one thing written back to the real tree, on --update only. */
const TABLE = join(HERE, "MUTATIONS.md");

/**
 * Every path below is REPO-RELATIVE, so the same declaration resolves against
 * the working tree (to read the pristine source) or against a sandbox copy (to
 * break it). An absolute path here is how the old version could only ever mutate
 * the real thing.
 */
const TOOLS = "bundles/prose-author/skills/prose-draft/tools";
const SIBLING = "bundles/prose-tell-scan/skills/tell-scan/tools";

const SUITES = {
  author: "bundles/prose-author/tests/selftest.mjs",
  sibling: "bundles/prose-tell-scan/tests/selftest.mjs",
  review: "bundles/prose-review/tests/selftest.mjs",
};

const EXEMPLARS = `${TOOLS}/exemplars.mjs`;
const VERIFY = `${TOOLS}/verify.mjs`;
const INGEST = `${TOOLS}/ingest-edit.mjs`;
const CALIBRATE = `${SIBLING}/calibrate.mjs`;
const EVALUATE = `${SIBLING}/lib/evaluate.mjs`;
const SCANNER = `${SIBLING}/tell-scan.mjs`;
const FIDELITY = "bundles/prose-review/tools/fidelity-scan.mjs";
const LOOP = "bundles/prose-author/tests/loop.mjs";
const VPROFILE = "bundles/prose-author/tests/voice-profile.mjs";
const VDRAFT = "bundles/prose-author/tests/voice-draft.mjs";
const DRAFT_CONTRACT = `${TOOLS}/draft-contract.mjs`;
const DRAFT_CLAIM_AUDIT = `${TOOLS}/draft-claim-audit.mjs`;
const DRAFT_CLAIM_REPAIR = `${TOOLS}/draft-claim-repair.mjs`;
const DRAFT_CLAIM_AUDIT_PROMPT = "bundles/prose-author/skills/prose-draft/references/claim-audit.md";
const PROFILE_CONTRACT = `${TOOLS}/profile-contract.mjs`;
const DRAFT_TARGETS = `${TOOLS}/draft-targets.mjs`;
const DRAFT_CONFORMANCE = `${TOOLS}/draft-conformance.mjs`;
const DRAFT_CONTROLS = `${TOOLS}/draft-controls.mjs`;
const CRITIC_SOURCE = "bundles/prose-author/tests/voice-critic-source.mjs";
const ACCEPTANCE_RUNNER = "bundles/prose-author/tests/acceptance-runner.mjs";
const STRICT_OUTPUT_SCHEMA = "bundles/prose-author/tests/strict-output-schema.mjs";
// These mutations exercise the preserved quota-era protocol, not current tendencies.
const VOICE_DRAFT_PROMPT = "bundles/prose-author/tests/fixtures/historical-v030/voice-draft/agent.md";
const RATES = "bundles/prose-author/tests/corpus-rates.mjs";
const BAR = "bundles/prose-author/tests/bar.mjs";
const XCOUNT = "bundles/prose-author/tests/cross-count.mjs";
const GATES = "bundles/prose-author/tests/run-gates.mjs";
const FGUARD = "bundles/prose-author/tests/fixture-guard.mjs";
const STYLE_CONTRACT = "bundles/prose-author/skills/prose-style-tune/tools/style-contract.mjs";

/**
 * A throwaway copy of the whole repo, minus the things that must not be copied.
 *
 * COPY EVERYTHING, and the first attempt at being clever about it is why. Copying
 * only `bundles/` and `primitives/` looked sufficient - they hold the tools, the
 * corpora, the suites, and the primitives that prose-review's parity check reads.
 * The prose-tell-scan suite then failed on `tell-scan: not a file: <sandbox>/README.md`,
 * because it scans the repo's own README as a real-document case.
 *
 * A suite is allowed to read anything in its repo. Enumerating what it currently
 * happens to touch is a list that goes stale the first time someone adds a test,
 * and it goes stale as a confusing baseline failure. The tree is 4.2 MB without
 * .git; copying it is cheaper than maintaining the list.
 */
const SANDBOX_EXCLUDE = new Set([".git", "node_modules", ".planning"]);

export function createSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "prose-mutations-"));
  cpSync(REPO, dir, {
    recursive: true,
    filter: (src) => !SANDBOX_EXCLUDE.has(src.slice(REPO.length + 1).split("/")[0]),
  });
  return dir;
}

/**
 * Every mutation is a one-line edit that removes a real guarantee. `find` must
 * appear exactly once in the file, or the mutation is ambiguous and the run is
 * meaningless rather than merely failing.
 */
export const MUTATIONS = [
  { name: "identity accepts a future registry schema", file: `${TOOLS}/identity-store.mjs`, find: 'if (state?.schema !== IDENTITY_SCHEMA)', with: 'if (false)', guards: "incompatible registry versions are not silently reinterpreted" },
  { name: "identity ignores registry digests", file: `${TOOLS}/identity-store.mjs`, find: 'if (`${state.revision}-${sha256(bytes)}.json` !== pointer.file)', with: 'if (false)', guards: "shared registry revision bytes reproduce their pinned digest" },
  { name: "identity overwrites a stale registry revision", file: `${TOOLS}/identity-store.mjs`, find: 'if (state.revision !== expectedRevision)', with: 'if (false)', guards: "concurrent clients cannot overwrite a newer default or profile selection" },
  { name: "identity ignores explicit opt-out", file: `${TOOLS}/identity-store.mjs`, find: 'if (job.writing_identity === null) return job;', with: 'if (job.writing_identity === null) delete job.writing_identity;', guards: "one-off work can disable personal identity resolution" },
  { name: "identity mixes task-specific author evidence", file: `${TOOLS}/identity-store.mjs`, find: 'if (!own(job, "writing_identity") && evidenceKeys.some((k) => own(job, k))) return job;', with: '/* silently inherit personal identity */', guards: "explicit foreign author inputs do not inherit personal defaults" },
  { name: "identity accepts a changed pinned profile", file: `${TOOLS}/identity-store.mjs`, find: 'if (pinned.digest !== identity.profile_digest)', with: 'if (false)', guards: "profile changes require explicit publication rather than silent replacement" },
  { name: "identity silently loses its registered corpus", file: `${TOOLS}/identity-store.mjs`, find: 'if (!existsSync(join(identity.samples_dir, "corpus", "human")))', with: 'if (false)', guards: "unavailable registered corpus is not represented as no evidence" },
  { name: "identity permits a cross-writer history attachment", file: `${TOOLS}/identity-store.mjs`, find: 'job.telemetry.identity !== identity.history_identity', with: 'false', guards: "writing identity cannot silently feed another writer numerical records" },
  { name: "receipt reloads current identity instead of frozen inputs", file: `${TOOLS}/prose-runtime.mjs`, find: 'loadWritingJob(requireValue("--job"), { resolveIdentity: false })', with: 'loadWritingJob(requireValue("--job"), { resolveIdentity: Boolean(resolveIdentity(identityDirectory())) })', guards: "historical delivery verification reads its frozen input snapshot" },
  { name: "ignore misspelled history attachment fields", file: `${TOOLS}/history-session.mjs`, find: 'Object.keys(config).some((k) => !["identity", "directory", "document_id", "revision_id", "snapshot", "format", "language"].includes(k))', with: 'false', guards: "an invalid attachment cannot silently collect into the default history directory" },
  { name: "accept altered numerical stage differences", file: `${TOOLS}/history-session.mjs`, find: 'if (JSON.stringify(stage.changes) !== JSON.stringify(previous ? compareHistoryStages(previous, stage.measurement) : null))', with: 'if (false)', guards: "stage comparisons reproduce from the recorded exact candidate measurements" },
  // Change the reference population, not the reporting instant too. A fresh
  // wall-clock timestamp made an unrelated single-stage assertion fail only
  // when two calls happened in different milliseconds; the repair fixture
  // deliberately adds history and must catch this probe regardless of timing.
  { name: "move the reference baseline during repairs", file: `${TOOLS}/history-session.mjs`, find: 'compareHistoryMeasurement(measurement, baseline,', with: 'compareHistoryMeasurement(measurement, buildHistoryReport(readHistory(root, config.identity), { now: baseline.as_of }),', guards: "all stages use the same pre-generation baseline despite concurrent history ingestion" },
  { name: "silently ignore unknown history flags", file: `${TOOLS}/history-cli.mjs`, find: '!allowed.has(rest[i]) ||', with: '', guards: "unknown options cannot silently redirect history writes to the default store" },
  { name: "reject the known Claude product-name adapter alias", file: `${TOOLS}/runtime-adapters.mjs`, find: 'name === "claude-code" ? "claude" : name', with: 'name', guards: "Claude Code product spelling resolves to the existing authenticated Claude transport" },
  {"name":"history accepts undeclared collection","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"if (!state) return { enabled: false, rhetoric: false };","with":"if (!state) return { enabled: true, rhetoric: false };","guards":"collection is disabled until explicit scope consent"},
  {"name":"history disables project precedence","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"state.scopes.find((s) => s.project === scope) ??","with":"","guards":"specific disablement overrides identity-wide collection"},
  {"name":"history ignores revision replacement","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"latest.set(r.document, r)","with":"latest.set(r.id, r)","guards":"document revisions are not independent pieces"},
  {"name":"history permits source recount divergence","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"if (digestHistory(input.measurement) !== digestHistory(measureHistoryText(input.text, input)))","with":"if (false)","guards":"persisted measurements reproduce from supplied source"},
  {"name":"history leaks its fingerprint key in exports","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"return exported;","with":"return state;","guards":"exports omit the private keyed-fingerprint secret"},
  {"name":"history applies stale deletion preview","file":"bundles/prose-author/skills/prose-draft/tools/history-store.mjs","find":"if (actual.confirmation !== preview.confirmation)","with":"if (false)","guards":"deletion requires a current exact target preview"},
  {"name":"history drops source text sanitization","file":"bundles/prose-author/skills/prose-draft/tools/history-measure.mjs","find":"visit(m);","with":"/* skip payload sanitization */","guards":"history measurement payloads cannot carry prose"},
  {"name":"history erases within-piece variance","file":"bundles/prose-author/skills/prose-draft/tools/history-measure.mjs","find":"values.reduce((s, v) => s + (v - mean) ** 2, 0) / n","with":"0","guards":"equal means do not erase rhythm variation"},
  {"name":"history admits generated human baselines","file":"bundles/prose-author/skills/prose-draft/tools/history-report.mjs","find":"provenance === \"human-independent\" &&","with":"true &&","guards":"generated usage remains separate from human evidence"},
  {"name":"history flags sparse empirical departures","file":"bundles/prose-author/skills/prose-draft/tools/history-report.mjs","find":"reference?.n >= 20","with":"reference?.n >= 5","guards":"empirical departure labels require twenty pieces"},
  {"name":"history pools incompatible analyzers","file":"bundles/prose-author/skills/prose-draft/tools/history-report.mjs","find":"r.measurement.analyzer, series","with":"\"shared-analyzer\", series","guards":"analyzer changes produce separate compatible series"},
  {"name":"rhetoric ignores explicit opt-in","file":"bundles/prose-author/skills/prose-draft/tools/history-rhetoric.mjs","find":"if (!enabled) return unavailable(\"disabled\");","with":"/* ignore consent */","guards":"rhetorical model dispatch requires separate enablement"},
  {"name":"rhetoric ignores spent call budget","file":"bundles/prose-author/skills/prose-draft/tools/history-rhetoric.mjs","find":"budget.remaining <= 0","with":"false","guards":"rhetorical analysis has a finite separate call budget"},
  {"name":"rhetoric accepts unaccounted paragraphs","file":"bundles/prose-author/skills/prose-draft/tools/history-rhetoric.mjs","find":"errors.push(\"Silent paragraph omission\")","with":"/* silently omit */","guards":"every paragraph is annotated or explicitly unclassified"},
  {"name":"rhetoric accepts duplicate annotations","file":"bundles/prose-author/skills/prose-draft/tools/history-rhetoric.mjs","find":"if (seen.has(key)) errors.push(\"Duplicate annotation\");","with":"/* double count */","guards":"identical evidence cannot inflate estimated frequencies"},
  {"name":"history ignores final byte changes","file":"bundles/prose-author/skills/prose-draft/tools/history-session.mjs","find":"if (h.final_digest !== sha256(result.draft))","with":"if (false)","guards":"history binds the exact delivered prose"},
  {
    name: "accept invented check results as direct receipt excerpts",
    file: "bundles/prose-author/tests/chat-receipt.mjs",
    find: "excerpts.every((excerpt) => receipt.includes(excerpt))", with: "true",
    guards: "a directly quoted receipt excerpt must occur in the generated receipt, not just use quotation marks",
  },
  {
    name: "accept changed delivery receipts as checked artifacts",
    file: `${TOOLS}/prose-runtime.mjs`,
    find: 'readFileSync(delivery, "utf8") === renderWritingDelivery(result, renderWritingReceipt(result, job))',
    with: 'true',
    guards: "the authoritative delivery includes exact recorded receipt bytes, not only checked prose",
  },
  {
    name: "let delivery prose differ from the checked draft file",
    file: `${TOOLS}/prose-runtime.mjs`,
    find: 'result.draft === draft\n      &&',
    with: 'true\n      &&',
    guards: "delivery assembly cannot substitute unverified prose while retaining the old draft hash",
  },
  {
    name: "let a nonterminating capability probe defeat its timeout",
    file: `${TOOLS}/runtime-adapters.mjs`,
    find: 'timeout: 15000, killSignal: "SIGKILL",',
    with: 'timeout: 15000,',
    guards: "synchronous CLI preflight terminates even when the child ignores SIGTERM",
  },
  {
    name: "let a nonterminating plugin registry defeat its timeout",
    file: `${TOOLS}/installed-dependencies.mjs`,
    find: 'timeout: 15000, killSignal: "SIGKILL",',
    with: 'timeout: 15000,',
    guards: "dependency discovery cannot indefinitely block interruption handling in the parent",
  },
  {
    name: "read receipt diagnostics as completed mutation-suite counts",
    file: "bundles/prose-author/tests/mutations.mjs",
    find: "  const m = summaries.length === 1" + " ? summaries[0] : null;",
    with: "  const m = out.match(/(\\d+) passed, (\\d+) failed/);",
    guards: "mutation evidence comes from a unique delimited suite summary, not quoted diagnostic counts",
  },
  {
    name: "hide host permission failures behind a generic CLI exit",
    file: `${TOOLS}/runtime-adapters.mjs`,
    find: 'harness === "codex" && /failed to initialize', with: 'false && /failed to initialize',
    guards: "the receipt identifies a host-permission failure without implying the model or prose failed",
  },
  {
    name: "skip deep factual auditing when requested",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'if (job.review === "deep") await stageReview', with: 'if (false) await stageReview',
    guards: "an explicitly requested claim audit cannot disappear from the required review path",
  },
  {
    name: "invent a passing artifact scan in the human receipt",
    file: `${TOOLS}/writing-receipt.mjs`,
    find: 'flat(attempt?.artifacts?.status)', with: '"passed"',
    guards: "the user-facing receipt uses the recorded scanner result, including failure and unavailable cases",
  },
  {
    name: "trim the checked prose during final delivery assembly",
    file: `${TOOLS}/writing-receipt.mjs`,
    find: '`${result.draft}\\n\\n${receipt}`', with: '`${result.draft.trim()}\\n\\n${receipt}`',
    guards: "final assembly preserves the exact checked draft bytes",
  },
  {
    name: "call unevaluated semantic checks passed during receipt reproduction",
    file: `${TOOLS}/prose-runtime.mjs`,
    find: 'mechanical_status: reproduced.status', with: 'mechanical_status: "passed"',
    guards: "integrity success does not upgrade the underlying check results",
  },
  {
    name: "treat every omitted observed tendency as a required occurrence",
    file: `${TOOLS}/runtime-contract.mjs`,
    find: '!advisoryIds.includes(r.id)', with: 'true',
    guards: "natural variation is not rejected as if corpus observations were quotas",
  },
  {
    name: "allow omitted required instructions to accompany a clear review",
    file: `${TOOLS}/runtime-contract.mjs`,
    find: '!advisoryIds.includes(r.id)', with: 'false',
    guards: "only observed tendencies receive the advisory-omission exception",
  },
  {
    name: "resolve an advisory omission without both task and voice review",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: '["task-review", "voice-review"].every((stage)', with: '["task-review", "voice-review"].some((stage)',
    guards: "an unavailable voice review cannot be replaced by task review alone",
  },
  {
    name: "excuse user-rule omissions as observed variation",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'advisoryIds.includes(o.id) && ["task-review", "voice-review"]', with: 'true && ["task-review", "voice-review"]',
    guards: "reviewed natural variation never exempts an explicit user instruction",
  },
  {
    name: "fill example slots with known form or register mismatches",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'if (mismatches.length) {', with: 'if (false) {',
    guards: "a shortage of matching style examples does not silently mix known writing contexts",
  },
  {
    name: "hide unknown example metadata from the final receipt",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'example_warnings: selected.warnings ?? [],', with: 'example_warnings: [],',
    guards: "unclassified samples are not represented as verified form/register matches",
  },
  {
    name: "certify mismatched remote plugins and local agent wrappers",
    file: "install-prose-codex.mjs",
    find: 'if (plugin.version !== version) throw new Error', with: 'if (false) throw new Error',
    guards: "remote mode does not silently mix different-generation plugin and wrapper contracts",
  },
  {
    name: "omit the exact missing-atom list from task review",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'missing_atoms: options.missingAtoms ?? [], draft: candidate.draft',
    with: 'draft: candidate.draft',
    guards: "task reviewers receive an explicit empty accounting list instead of inventing one",
  },
  {
    name: "use a disabled companion plugin from its cache",
    file: `${TOOLS}/installed-dependencies.mjs`,
    find: '&& e.enabled === true', with: '&& true',
    guards: "dependency discovery respects enabled registry entries instead of stale cached files",
  },
  {
    name: "accept stale installed runtime bytes",
    file: "install-prose-codex.mjs",
    find: '!readFileSync(join(source, file)).equals(readFileSync(join(installed, file)))', with: 'false',
    guards: "a current version label does not mask changed or stale installed code",
  },
  {
    name: "switch a marketplace containing unrelated installed plugins",
    file: "install-prose-codex.mjs",
    find: 'if (others.length) throw new Error', with: 'if (false) throw new Error',
    guards: "local prose installation does not silently change other marketplace consumers",
  },
  {
    name: "accept missing or redrawn bounded-comparison calls",
    file: "bundles/prose-author/tests/bounded-comparison.mjs",
    find: 'return JSON.stringify(calls.map((r) => r.stage)) === JSON.stringify(expected)\n    && new Set(calls.map((r) => r.id)).size === expected.length',
    with: 'return true',
    guards: "the recorded comparison contains every prescribed initial call exactly once",
  },
  {
    name: "drop style evidence when repairing a draft",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: '{ previous_draft: candidate.draft, repair_findings: repairFindings }',
    with: '{ profile: null, examples: [], previous_draft: candidate.draft, repair_findings: repairFindings }',
    guards: "repairs retain the same profile and examples rather than substituting generic style",
  },
  {
    name: "accept a session-relative persistent preference path",
    file: `${TOOLS}/preference-store.mjs`,
    find: 'configured && !isAbsolute(configured)',
    with: 'false',
    guards: "persistent corrections cannot move silently with a new session working directory",
  },
  {
    name: "remove the small-batch discovery ceiling",
    file: `${TOOLS}/style-session.mjs`,
    find: '|| limit > 3',
    with: '|| false',
    guards: "conversational discovery cannot dump arbitrarily large review batches",
  },
  {
    name: "allow comparison against an inactive scoped preference",
    file: `${TOOLS}/style-session.mjs`,
    find: 'const active = a.active_preferences.find((d) => d.id === decision_id);',
    with: 'const active = preferences.decisions.find((d) => d.id === decision_id);',
    guards: "a one-feature preview must actually vary an applicable preference",
  },
  {
    name: "silently render a profile for the examples-only condition",
    file: `${TOOLS}/prose-runtime.mjs`,
    find: '!job.profile && job.profile_policy !== "none"',
    with: '!job.profile',
    guards: "the examples-only path stays distinct from profile generation",
  },
  {
    name: "dispatch a profile call after cancellation",
    file: `${TOOLS}/writing-runtime.mjs`,
    find: 'if (signal?.aborted) return { status: "not-evaluated", reason: "Cancelled before profile render", profile: null };',
    with: '/* defect: dispatch after cancellation */',
    guards: "cancelled profile preparation cannot consume another model call",
  },
  {
    name: "count Markdown link destinations as author parentheticals",
    file: `${TOOLS}/visible-prose.mjs`,
    find: 'mask(labelEnd, k, "link-target");',
    with: '/* defect: leave the destination in prose */',
    guards: "visible-prose counts exclude balanced Markdown targets while retaining genuine asides",
  },
  {
    name: "turn unevaluable empty-text rates into passing zeroes",
    file: `${TOOLS}/style-rules.mjs`,
    find: 'occurrences.length / words * 1000 : null;',
    with: 'occurrences.length / words * 1000 : 0;',
    guards: "a missing rate denominator is not evaluated, never a passing absence",
  },
  {
    name: "restore a one-hit exception to an explicit zero rule",
    file: `${TOOLS}/style-rules.mjs`,
    find: '(maximum === null || actual <= maximum)',
    with: '(maximum === null || actual <= maximum + 1)',
    guards: "explicit mechanical limits are exact and independent of corpus-rate tolerances",
  },
  {
    name: "trust a stored receipt without reproducing final checks",
    file: `${TOOLS}/style-rules.mjs`,
    find: 'export function verifyRuleReceipt(draft, rules, receipt, options) {',
    with: 'export function verifyRuleReceipt(draft, rules, receipt, options) { return { status: receipt.status };',
    guards: "a presented draft is bound to its checked bytes, not a prior candidate",
  },
  {
    name: "save inferred preferences without user approval",
    file: `${TOOLS}/preferences-v2.mjs`,
    find: 'if (!direct && !accepted.length) return',
    with: 'if (false) return',
    guards: "only explicit persistent feedback or approved inference changes saved preferences",
  },
  {
    name: "silently retarget current observation-dependent preferences",
    file: `${TOOLS}/preferences-v2.mjs`,
    find: 'throw new TypeError(`Preference ${d.id} needs validated rebinding to the current profile`);',
    with: '/* defect: accept stale binding */',
    guards: "independent user rules survive refresh but evidence-dependent rules require rebinding",
  },
  {
    name: "let preferences silently retarget a changed observed profile",
    file: STYLE_CONTRACT,
    find: '    if (preferences.profile.digest !== expected.digest) errors.push("preferences profile digest is stale");',
    with: '    if (false) errors.push("preferences profile digest is stale");',
    guards: "user choices remain bound to the exact observed evidence they were made against",
  },
  {
    name: "apply a semantic preference proposal before its questions are answered",
    file: STYLE_CONTRACT,
    find: '  if ((proposal.questions ?? []).length) errors.push("proposal has unresolved questions; answer them before applying changes");',
    with: '  if (false) errors.push("proposal has unresolved questions; answer them before applying changes");',
    guards: "ambiguous feedback cannot mutate the versioned preference overlay",
  },
  {
    name: "apply every proposed preference operation instead of the selected ids",
    file: STYLE_CONTRACT,
    find: '  for (const operation of proposal.operations.filter((row) => accepted.has(row.id))) {',
    with: '  for (const operation of proposal.operations) {',
    guards: "semantic proposals remain review material until the user explicitly selects operations",
  },
  {
    name: "silently choose among equally specific active style decisions",
    file: STYLE_CONTRACT,
    find: '  if (conflicts.length) throw new Error(`active preference conflicts: ${conflicts.map((row) => `${row.feature} (${row.decision_ids.join(", ")})`).join("; ")}`);',
    with: '  if (false) throw new Error(`active preference conflicts`);',
    guards: "scope ties refuse instead of making an unrecorded style choice",
  },
  {
    name: "ignore a user-approved counted target override during drafting",
    file: DRAFT_TARGETS,
    find: '    row.aim_count = control.aim;',
    with: '    row.aim_count = row.aim_count;',
    guards: "accepted recountable preferences reach the deterministic drafting target",
  },
  {
    name: "allow full JSON Schema keywords into strict model transport",
    file: STRICT_OUTPUT_SCHEMA,
    find: '  "patternProperties", "then", "uniqueItems",',
    with: '  "patternProperties", "then",',
    guards: "provider-specific schema subsets are checked before a model call can be spent",
  },
  // --- frequency discipline and fabricated citations (PI-02 FU-16) ---
  // Both guard failures are invisible in the artefact: an overclaimed profile reads
  // like a confident one, and a fabricated URL reads like a real one.
  {
    name: "stop noticing dominance claims",
    file: VPROFILE,
    find: "  const hit = DOMINANCE_PHRASES.find((p) => lower.includes(p));",
    with: "  const hit = undefined;",
    guards: "a profile calling a habit the engine of a voice must state the rate that backs it",
  },
  {
    name: "accept a profile that states no frequency at all",
    file: VPROFILE,
    find: "  if (stated.length === 0) {",
    with: "  if (false) {",
    guards: "a count without a rate cannot tell a drafter how often to use a habit",
  },
  {
    name: "stop recognising placeholder hosts",
    file: VDRAFT,
    find: "  return urls.filter((u) => PLACEHOLDER_HOSTS.some((h) => u.toLowerCase().includes(h)));",
    with: "  return [];",
    guards: "an invented citation is caught before it reaches a reader",
  },
  {
    name: "render empty semantic omissions into the public draft record",
    file: DRAFT_CONTRACT,
    find: "  if (source.omitted.length) record.omitted = source.omitted;",
    with: "  record.omitted = source.omitted;",
    guards: "a fixed-shape source cannot leak an empty optional list into voice-draft/1",
  },
  {
    name: "allow a semantic sentence to carry output fences or hidden newlines",
    file: DRAFT_CONTRACT,
    find: '      if (/```|[\\r\\n]/.test(String(sentence.text ?? ""))) errors.push(`${sat}.ledger-first text cannot contain a fence or newline`);',
    with: '      if (false) errors.push(`${sat}.ledger-first text cannot contain a fence or newline`);',
    guards: "a model cannot smuggle a second public envelope or unaudited sentence through one unit",
  },
  {
    name: "drop the explicit type Codex requires beside the draft schema const",
    file: DRAFT_CONTRACT,
    find: '    schema: { type: "string", const: SOURCE_SCHEMA_ID },',
    with: "    schema: { const: SOURCE_SCHEMA_ID },",
    guards: "one source schema is valid in strict Codex output as well as Claude",
  },
  {
    name: "accept a request basis that cannot be found in the request",
    file: DRAFT_CONTRACT,
    find: "      } else if (normalizedRequest && !normalizedRequest.includes(normalize(entry.request_basis))) {",
    with: "      } else if (normalizedRequest && false) {",
    guards: "a model cannot cite an invented request premise in its sentence certificate",
  },
  {
    name: "let reasoning sentences carry hidden factual claims",
    file: DRAFT_CONTRACT,
    find: '      if (!["request-supported", "external-verification"].includes(sentence.basis) && sentence.claim_ids.length) {',
    with: '      if (!["request-supported", "external-verification"].includes(sentence.basis) && false) {',
    guards: "derived public claims cannot be hidden under a non-factual sentence label",
  },
  {
    name: "let external facts masquerade as request-supported claims",
    file: DRAFT_CONTRACT,
    find: '    } else if (typeof entry.request_basis === "string" && entry.request_basis.length !== 0) {',
    with: "    } else if (false) {",
    guards: "the public audit distinguishes supplied facts from model-memory assertions",
  },
  {
    name: "allow a sentence to cite a claim outside the closed ledger",
    file: DRAFT_CONTRACT,
    find: "          errors.push(`${sat}.claim_ids has dangling reference ${claimId}`);",
    with: "          // dangling reference accepted",
    guards: "every factual sentence is restricted to the pre-writing claim ledger",
  },
  {
    name: "allow an unused retrospective claim into the ledger",
    file: DRAFT_CONTRACT,
    find: '    if (count === 0) errors.push(`source.ledger ${entry?.id ?? "entry"} is not cited by any sentence`);',
    with: "    if (false) errors.push(`unused`);",
    guards: "the claim ledger is a closed pre-writing plan rather than a post-hoc dump",
  },
  {
    name: "allow prose to be emitted before its supposed pre-writing ledger",
    file: DRAFT_CONTRACT,
    find: '  else if (JSON.stringify(Object.keys(source)) !== JSON.stringify(fields)) {',
    with: "  else if (false) {",
    guards: "source/3 mechanically proves the claim ledger precedes expressive prose",
  },
  {
    name: "stop reconciling independent audit sentence ids",
    file: DRAFT_CLAIM_AUDIT,
    find: "    if (expected && row.id !== expected.id) errors.push(`${at}.id must be ${expected.id}`);",
    with: "    if (false) errors.push(`${at}.id must be ${expected.id}`);",
    guards: "an audit decision cannot drift onto a different sentence",
  },
  {
    name: "assemble a sentence the independent auditor rejected",
    file: DRAFT_CLAIM_AUDIT,
    find: "    if (row.status === \"reject\") errors.push(`${row.id ?? at} rejected: ${String(row.reason).trim()}`);",
    with: "    if (false) errors.push(`${row.id ?? at} rejected: ${String(row.reason).trim()}`);",
    guards: "fabricated quotations, citations, and biographies cannot pass through as claims",
  },
  {
    name: "accept opaque independent labels with no rationale",
    file: DRAFT_CLAIM_AUDIT,
    find: '    if (row.status === "keep" && !String(row.reason ?? "").trim()) errors.push(`${at} kept without a basis rationale`);',
    with: "    if (false) errors.push(`${at} kept without a basis rationale`);",
    guards: "every independent basis decision remains inspectable clause by clause",
  },
  {
    name: "turn ordinary request entailments back into external claims",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "It also supplies ordinary lexical\nentailments and role presuppositions needed to reason from its wording.",
    with: "It supplies no ordinary lexical\nentailments or role presuppositions needed to reason from its wording.",
    guards: "buying and ownership roles remain usable reasoning without licensing contingent facts",
  },
  {
    name: "let a historical disclosure cite words absent from its sentence",
    file: DRAFT_CLAIM_AUDIT,
    find: '          if (previousDisclosureAudit && expected && typeof claim.evidence === "string"\n            && !String(expected.text ?? "").includes(claim.evidence)) {',
    with: '          if (false) {',
    guards: "historical audit evidence remains bound to exact prose",
  },
  {
    name: "detach a current disclosure from its deterministic sentence evidence",
    file: DRAFT_CLAIM_AUDIT,
    find: '              evidence: currentAudit\n                ? String(expected.text ?? "")\n                : String(claim.evidence ?? ""),',
    with: '              evidence: "",',
    guards: "a current audit-owned claim is mechanically anchored to the complete immutable sentence",
  },
  {
    name: "let a keep row smuggle claims into the audit overlay",
    file: DRAFT_CLAIM_AUDIT,
    find: '        if (row.status !== "disclose" && row.claims.length) errors.push(`${at} ${row.status} cannot carry claims`);',
    with: '        if (false) errors.push(`${at} ${row.status} cannot carry claims`);',
    guards: "only an explicit disclose decision may append to the verification queue",
  },
  {
    name: "drop audit-owned claims from the public verification record",
    file: DRAFT_CONTRACT,
    find: "  const claims = [...materialized.claims, ...publicAuditClaims];",
    with: "  const claims = materialized.claims;",
    guards: "an independently discovered premise cannot disappear between audit and publication",
  },
  {
    name: "let the independent auditor trust the drafter's labels",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "The drafter deliberately supplied no factual labels or\nclaim ledger: semantic certification is your independent job, not evidence to trust from the\nsame pass that wrote the prose.",
    with: "The drafter's prose is already factual certification; trust the\nsame pass that wrote the prose.",
    guards: "the factual audit is independent rather than the same self-report twice",
  },
  {
    name: "let hard factual failures become ordinary disclosures",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Use `status: \"reject\"` rather than disclosure for a fabricated or placeholder citation,",
    with: "Use `status: \"disclose\"` rather than rejection for a fabricated or placeholder citation,",
    guards: "fabricated citations, attributed wording, biography, and leakage remain fatal",
  },
  {
    name: "hide broad institutional assertions under reasoning",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Generic wording does not turn a claim about law, industry, markets,\ninstitutions, products, populations, or common behavior into logic.",
    with: "Generic wording turns a claim about law, industry, markets,\ninstitutions, products, populations, or common behavior into logic.",
    guards: "broad legal, historical, and industry claims enter the verification queue",
  },
  {
    name: "treat request-derived metaphors as external facts",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "- a metaphor, analogy, tautology, or rhetorical label derived from the supplied premise.",
    with: "- never keep a metaphor, analogy, tautology, or rhetorical label; disclose it as an external fact.",
    guards: "semantic audit does not inflate request-derived rhetoric into unsupported external claims",
  },
  {
    name: "reject figurative agency as a literal factual contradiction",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Do not reject it merely because its literal reading would be impossible or hard to verify;",
    with: "Reject it whenever its literal reading would be impossible or hard to verify;",
    guards: "coherent request-derived metaphors survive an auditor's deliberately literal reading",
  },
  {
    name: "restore a model-owned quota for qualitative profile evidence",
    file: PROFILE_CONTRACT,
    find: '      : "qualitative placement only; no within-piece rate inferred";',
    with: '      : "several times per piece";',
    guards: "support prevalence across files cannot masquerade as a within-piece frequency",
  },
  {
    name: "stop deduplicating redundant qualitative support bookkeeping",
    file: PROFILE_CONTRACT,
    find: "        const uniqueSupport = [...new Set(observation.support_files)];",
    with: "        const uniqueSupport = observation.support_files;",
    guards: "a repeated support filename is normalized only when at least two distinct evidence files remain",
  },
  {
    name: "erase the deterministic center aim from draft target cards",
    file: DRAFT_TARGETS,
    find: "    aim: Math.round(expected),",
    with: "    aim: 0,",
    guards: "every harness receives the same length-scaled center target instead of model arithmetic",
  },
  {
    name: "let the drafter return an out-of-range measured habit",
    file: DRAFT_TARGETS,
    find: "Before returning the source, count the finished draft and revise it until every measured actual is inside its stated min/max range.",
    with: "Before returning the source, ignore measured actuals that fall outside the stated min/max range.",
    guards: "a measured target is an enforced final check rather than an informational card",
  },
  {
    name: "hide question marks from the semantic-bearing hard limits",
    file: DRAFT_TARGETS,
    find: '  "question-marks",',
    with: '  "question-marks-disabled",',
    guards: "question-mark ceilings are literal pre-return budgets because conformance cannot repair them",
  },
  {
    name: "let semantic-bearing generation target the outer checker boundary",
    file: DRAFT_TARGETS,
    find: "operational target EXACTLY ${row.aim_count}; unchanged checker range ${row.gate_minimum}–${row.gate_maximum}",
    with: "operational target at most ${row.gate_maximum}; unchanged checker range ${row.gate_minimum}–${row.gate_maximum}",
    guards: "unpatchable semantic counters target the exact center rather than an outer acceptance boundary",
  },
  {
    name: "tell the drafter conformance can repair semantic-bearing counts",
    file: VOICE_DRAFT_PROMPT,
    find: "that the later exact conformance patch is forbidden from repairing because",
    with: "that the later exact conformance patch is expected to repair because",
    guards: "the portable prompt assigns semantic-bearing count correction to generation, not conformance",
  },
  {
    name: "let the drafter invent an opponent's paraphrased position",
    file: VOICE_DRAFT_PROMPT,
    find: "**Do not invent an opponent's position, likely response,\nmotive, excuse, or defence either.**",
    with: "**You may invent an opponent's position, likely response,\nmotive, excuse, or defence.**",
    guards: "paraphrased opponent positions remain attribution even without quotation marks",
  },
  {
    name: "detach compiled voice instructions from their observation ids",
    file: DRAFT_CONTROLS,
    find: "    lines.push(`- ${row.observation_id} [${dimensions}; section:${row.section}${measurement}]: ${row.instruction}`);",
    with: "    lines.push(`- detached [${dimensions}; section:${row.section}${measurement}]: ${row.instruction}`);",
    guards: "the compact control card preserves the profile's exact instruction-to-ID binding",
  },
  {
    name: "accept a conformance patch whose final count remains out of range",
    file: DRAFT_CONFORMANCE,
    find: "  if (report && !report.pass) {",
    with: "  if (false && report && !report.pass) {",
    guards: "local remeasurement, not the patch author's confidence, gates the final prose",
  },
  {
    name: "let a conformance patch expand the draft without bound",
    file: DRAFT_CONFORMANCE,
    find: "  if (finalWords > initialWords + growthAllowance) {",
    with: "  if (false) {",
    guards: "the correction stage remains a minimal patch rather than a second unconstrained draft",
  },
  {
    name: "let a conformance patch address a non-unique source span",
    file: DRAFT_CONFORMANCE,
    find: "    else if (sourceText.indexOf(edit.before, start + 1) !== -1) errors.push(`${at}.before is not unique in the source`);",
    with: "    else if (false) errors.push(`${at}.before is not unique in the source`);",
    guards: "patch application cannot silently choose among repeated anchors",
  },
  {
    name: "let one conformance anchor span multiple paragraphs",
    file: DRAFT_CONFORMANCE,
    find: "    if (/\\n\\s*\\n/.test(edit.before)) errors.push(`${at}.before spans more than one paragraph`);",
    with: "    if (false) errors.push(`${at}.before spans more than one paragraph`);",
    guards: "an exact patch cannot hide a whole-draft replacement in one anchor",
  },
  {
    name: "let equal-length paragraph replacements become a second draft",
    file: DRAFT_CONFORMANCE,
    find: "  if (replacedWords > replacementAllowance) {",
    with: "  if (false) {",
    guards: "minimal conformance retains at least four fifths of the initial draft rather than only its length",
  },
  {
    name: "let unrelated edits borrow a failing measurement id",
    file: DRAFT_CONFORMANCE,
    find: "    if (improved.length !== relevant.length || improved.length === 0) {",
    with: "    if (false) {",
    guards: "every exact edit must independently move one named failing measurement toward its range",
  },
  {
    name: "let measured punctuation edits rewrite unrelated semantics",
    file: DRAFT_CONFORMANCE,
    find: "    if (!measurementEditEquivalent(edit.before, edit.after, edit.measurement_ids)) {",
    with: "    if (false) {",
    guards: "a bounded measured correction cannot reverse the request stance or rewrite qualitative content",
  },
  {
    name: "let an edit hide a collateral measurement delta",
    file: DRAFT_CONFORMANCE,
    find: "    if (!sameArray([...edit.measurement_ids].sort(), changedMeasurementIds)) {",
    with: "    if (false) {",
    guards: "every actual per-edit measurement change is named before coverage dimensions are derived",
  },
  {
    name: "reject contractions licensed by an explicit source auxiliary",
    file: DRAFT_CONFORMANCE,
    find: "  return ambiguousContractionPattern(afterSkeleton).test(beforeSkeleton);",
    with: "  return false;",
    guards: "an explicit had, would, is, or has source can be contracted without lexical guesswork",
  },
  {
    name: "expand an ambiguous source contraction by convenient symmetry",
    file: DRAFT_CONFORMANCE,
    find: "  return ambiguousContractionPattern(afterSkeleton).test(beforeSkeleton);",
    with: "  return ambiguousContractionPattern(afterSkeleton).test(beforeSkeleton)\n    || ambiguousContractionPattern(beforeSkeleton).test(afterSkeleton);",
    guards: "an ambiguous source contraction cannot choose whichever expansion makes a patch pass",
  },
  {
    name: "expand ain't as the malformed phrase ai not",
    file: DRAFT_CONFORMANCE,
    find: "      /^ai$/i.test(host) ? match : `${host} not`)",
    with: "      `${host} not`)",
    guards: "an unresolved negative contraction fails closed instead of inventing a stem",
  },
  {
    name: "collapse structural whitespace around measured punctuation",
    file: DRAFT_CONFORMANCE,
    find: "  const sequence = (mark) => `(?:${mark} ?)+`;",
    with: "  const sequence = (mark) => `(?:${mark}[ \\t]*)+`;",
    guards: "tabs and repeated spaces remain structural evidence rather than punctuation trivia",
  },
  {
    name: "let measured punctuation destroy Markdown links",
    file: DRAFT_CONFORMANCE,
    find: "  return /`/.test(source) || /[\\[\\]]/.test(source) || /[<>]/.test(source)\n    || /\\b(?:https?|mailto):/i.test(source);",
    with: "  return false;",
    guards: "parenthesis counts cannot be repaired by turning a Markdown link into plain text",
  },
  {
    name: "let measured punctuation rewrite Markdown reference labels",
    file: DRAFT_CONFORMANCE,
    find: "  return /`/.test(source) || /[\\[\\]]/.test(source) || /[<>]/.test(source)\n    || /\\b(?:https?|mailto):/i.test(source);",
    with: "  return /`/.test(source) || /[<>]/.test(source)\n    || /\\b(?:https?|mailto):/i.test(source);",
    guards: "reference-link labels remain exact even when a measured dash could be normalized away",
  },
  {
    name: "let measured punctuation rewrite Markdown autolink destinations",
    file: DRAFT_CONFORMANCE,
    find: "  return /`/.test(source) || /[\\[\\]]/.test(source) || /[<>]/.test(source)\n    || /\\b(?:https?|mailto):/i.test(source);",
    with: "  return /`/.test(source) || /[\\[\\]]/.test(source)\n    || /\\b(?:https?|mailto):/i.test(source);",
    guards: "autolink destinations remain exact even when a measured dash could be normalized away",
  },
  {
    name: "inspect the edit anchor without its full Markdown-bearing draft",
    file: DRAFT_CONFORMANCE,
    find: "    if (draftContainsMarkdownCodeOrLinkRisk(sourceText)",
    with: "    if (false",
    guards: "the smallest exact anchor cannot hide Markdown syntax elsewhere in its source",
  },
  {
    name: "treat fenced code contents as ordinary prose",
    file: DRAFT_CONFORMANCE,
    find: "    || /~{3,}/.test(source)",
    with: "    || false",
    guards: "tilde-fenced blocks remain protected regardless of nesting, info strings, or anchor size",
  },
  {
    name: "treat CommonMark-indented code as ordinary prose",
    file: DRAFT_CONFORMANCE,
    find: "    || /\\t| {4}/.test(source);",
    with: "    || false;",
    guards: "tab-expanded and space-indented code cannot be changed by a conformance edit",
  },
  {
    name: "let a failing measurement revise an unrelated coverage dimension",
    file: DRAFT_CONFORMANCE,
    find: "    if (!sameArray([...edit.coverage_dimensions].sort(), expectedDimensions)) {",
    with: "    if (false) {",
    guards: "every conformance edit binds its changed measured rules to their exact coverage dimensions",
  },
  {
    name: "let structured conformance confuse observations with measurements",
    file: DRAFT_CONFORMANCE,
    find: '            items: { type: "string", enum: CONFORMANCE_MEASUREMENT_IDS },',
    with: '            items: { type: "string", minLength: 1 },',
    guards: "strict decoding cannot put profile observation IDs into the measurement namespace",
  },
  {
    name: "count required contraction spelling as lost content",
    file: DRAFT_CONFORMANCE,
    find: "  if (movedFartherFromTarget && !targetDistanceException) {",
    with: "  if (movedFartherFromTarget) {",
    guards: "the minimum required meaning-equivalent contraction correction is content-length neutral",
  },
  {
    name: "use net whitespace delta as the contraction-change count",
    file: DRAFT_CONFORMANCE,
    find: "    && contractionFormChanges === minimumRequiredContractionChanges",
    with: "    && Math.abs(wordDelta) <= minimumRequiredContractionChanges",
    guards: "zero-word and opposing form changes cannot hide behind a small net whitespace delta",
  },
  {
    name: "treat coupled contraction counters as independent distances",
    file: DRAFT_CONFORMANCE,
    find: "      const changes = Math.abs(negativeDelta)\n        + Math.abs(contractionDelta + negativeDelta);",
    with: "      const changes = Math.max(Math.abs(negativeDelta), Math.abs(contractionDelta));",
    guards: "same-direction contraction and uncontracted-negative failures use the true coupled transition minimum",
  },
  {
    name: "enforce contraction minimality only when length changes",
    file: DRAFT_CONFORMANCE,
    find: "  if (contractionEdits.length > 0 && !contractionCorrectionIsMinimal) {",
    with: "  if (false) {",
    guards: "zero-net extra contraction changes fail independently of target-distance movement",
  },
  {
    name: "let a coupled correction cross one row's nearest boundary",
    file: DRAFT_CONFORMANCE,
    find: "    && contractionRowsReachNearestBoundary;",
    with: "    && true;",
    guards: "every initially failing contraction row stops at its nearest permitted count",
  },
  {
    name: "treat two contracted aliases as the same preserved surface",
    file: DRAFT_CONFORMANCE,
    find: "    // Identical contracted spellings advance through the exact-character path above.\n    // Do not equate two different contracted surfaces merely because they share one\n    // expansion: that would let an extra apostrophe rewrite or a malformed alias such\n    // as won't → willn't hitchhike beside one required correction at zero cost.\n    const result = Number.isFinite(best) ? best : null;",
    with: "    if (beforeContracted && afterContracted\n      && beforeContracted.expansions.some((expansion) => afterContracted.expansions.includes(expansion))) {\n      const continuation = visit(left + beforeContracted.raw.length, right + afterContracted.raw.length);\n      if (Number.isInteger(continuation)) best = Math.min(best, continuation);\n    }\n    const result = Number.isFinite(best) ? best : null;",
    guards: "an apostrophe glyph rewrite or malformed contracted alias cannot hitchhike at zero cost",
  },
  {
    name: "invite the conformer to replace the whole draft",
    file: ACCEPTANCE_RUNNER,
    find: '    "must be no larger than one paragraph. Prefer local recasting over expansion. The local",',
    with: '    "may replace the whole draft. Prefer broad rewriting over local correction. The local",',
    guards: "the model returns bounded edits rather than another candidate draft",
  },
  {
    name: "invite observation IDs into conformance measurement IDs",
    file: ACCEPTANCE_RUNNER,
    find: '    "or uncontracted-negatives); never put an observation ID such as o03 in measurement_ids.",',
    with: '    "or uncontracted-negatives); observation IDs such as o03 are also acceptable measurement_ids.",',
    guards: "the conformer is explicitly told to use deterministic measurement tokens",
  },
  {
    name: "let one observation hide inside a multi-observation omission",
    file: ACCEPTANCE_RUNNER,
    find: '    "dimension and every observation ID from the omitted coverage row. Keep unresolved rows unresolved.",',
    with: '    "dimension and one observation ID from the omitted coverage row. Keep unresolved rows unresolved.",',
    guards: "a free-text omission remains accountable to every supported observation it drops",
  },
  {
    name: "tell the drafter to recalculate a locked target card",
    file: VOICE_DRAFT_PROMPT,
    find: "Do not recalculate those ranges from\nthe prose frequency phrase.",
    with: "Recalculate those ranges from\nthe prose frequency phrase.",
    guards: "the corpus-blind model follows deterministic targets rather than doing approximate bookkeeping",
  },
  {
    name: "teach conformance to use profile observation IDs as measurements",
    file: VOICE_DRAFT_PROMPT,
    find: "  `uncontracted-negatives`), never an observation ID such as `o03`.",
    with: "  `uncontracted-negatives`), and an observation ID such as `o03` is also acceptable.",
    guards: "the portable agent prompt keeps observation and measurement namespaces distinct",
  },
  {
    name: "make every contraction delta content-length neutral",
    file: VOICE_DRAFT_PROMPT,
    find: "  neutral, while any extra form change still fails. You do not estimate whether it passes.",
    with: "  neutral, including extra form changes. You do not estimate whether it passes.",
    guards: "the portable agent prompt limits the word-count exception to the minimum required correction",
  },
  {
    name: "skip the independent claim-audit dispatch",
    file: ACCEPTANCE_RUNNER,
    find: "  await dispatchClaimPipeline(runDir, manifest, cases);",
    with: "  // independent claim pipeline skipped",
    guards: "acceptance cannot assemble the drafter's correlated self-audit directly",
  },
  {
    name: "let model output downgrade the prepared claim-audit schema",
    file: ACCEPTANCE_RUNNER,
    find: "  if (decodedAudit.audit.schema !== DRAFT_AUDIT_SCHEMA_ID) {\n    throw new Error(`${c.id} ${CLAIM_PIPELINE} requires ${DRAFT_AUDIT_SCHEMA_ID}`);\n  }",
    with: "  if (false) {\n    throw new Error(`${c.id} ${CLAIM_PIPELINE} requires ${DRAFT_AUDIT_SCHEMA_ID}`);\n  }",
    guards: "the immutable prepared pipeline, not model-authored output, selects the accepted audit schema",
  },
  {
    name: "let claim repair alter independently accepted prose",
    file: DRAFT_CLAIM_REPAIR,
    find: "        if (!same(before[sIndex], after[sIndex])) errors.push(`repair changed protected sentence ${id}`);",
    with: "        if (false) errors.push(`repair changed protected sentence ${id}`);",
    guards: "bounded repair changes only sentence units the independent audit rejected",
  },
  {
    name: "let claim repair alter a retained factual ledger entry",
    file: DRAFT_CLAIM_REPAIR,
    find: "    if (!originalLedger.has(entry.id) || !same(originalLedger.get(entry.id), entry)) {",
    with: "    if (false) {",
    guards: "a repair cannot rewrite the provenance of a retained factual premise",
  },
  {
    name: "let a malformed audit authorize claim repair",
    file: DRAFT_CLAIM_REPAIR,
    find: '    if (!isObject(row) || !exactKeys(row, ["id", "status", "reason"])',
    with: "    if (!isObject(row) || false",
    guards: "only a complete independently auditable decision set can authorize sentence changes",
  },
  {
    name: "let a broad rejection set become a second draft",
    file: DRAFT_CLAIM_REPAIR,
    find: "  if (sentenceCount && rejectedCount / sentenceCount > MAX_REJECTED_SHARE) {",
    with: "  if (false) {",
    guards: "a repair cannot rewrite more than one fifth of a draft even when every row says reject",
  },
  {
    name: "let more than two rejected units enter claim repair",
    file: DRAFT_CLAIM_REPAIR,
    find: "  if (rejectedCount > MAX_REJECTED_SENTENCES) {",
    with: "  if (false) {",
    guards: "a low percentage cannot conceal more than two rewritten sentence units",
  },
  {
    name: "let claim repair alter bytes under its hypothetical wrapper",
    file: DRAFT_CLAIM_REPAIR,
    find: '  if (after.text !== `${HYPOTHETICAL_PREFIX}${before.text}`) {',
    with: "  if (false) {",
    guards: "the only prose edit is one fixed prefix before otherwise byte-identical rejected text",
  },
  {
    name: "let a hypothetical wrapper keep a nonhypothetical basis",
    file: DRAFT_CLAIM_REPAIR,
    find: '  if (after.basis !== "hypothetical") errors.push(`repair must mark ${id} hypothetical`);',
    with: '  if (false) errors.push(`repair must mark ${id} hypothetical`);',
    guards: "the fixed wrapper changes epistemic status rather than laundering factual prose",
  },
  {
    name: "resume a prepared run under the current environment model",
    file: ACCEPTANCE_RUNNER,
    find: "  const config = manifest?.dispatch?.[stage];",
    with: '  const config = { ...manifest?.dispatch?.[stage], model: "ambient-model" };',
    guards: "a prepared run uses only the model recorded before its first dispatch",
  },
  {
    name: "route Codex only for drafts instead of every locked stage",
    file: ACCEPTANCE_RUNNER,
    find: '  if (dispatch.harness === "codex") return "codex";',
    with: '  if (dispatch.harness === "codex" && dispatch.stage === "draft") return "codex";',
    guards: "profile, audit, and critic stages use the same manifest-selected adapter contract as drafts",
  },
  {
    name: "hash committed schemas only for Codex drafts",
    file: ACCEPTANCE_RUNNER,
    find: '  return dispatch.harness === "codex"\n    ? { schemaPath: pinned.path }',
    with: '  return dispatch.harness === "codex" && dispatch.stage === "draft"\n    ? { schemaPath: pinned.path }',
    guards: "profile, audit, and critic provenance hashes the exact schema file Codex received",
  },
  {
    name: "accept an adapter that cannot enforce the gated runtime boundary",
    file: ACCEPTANCE_RUNNER,
    find: "  if (!capabilities.clean_context || !capabilities.no_tools || !capabilities.immutable_failure) {",
    with: "  if (false) {",
    guards: "a new harness cannot claim gated acceptance without clean context, no-tools, and immutable failures",
  },
  {
    name: "drop the hash of Claude failure output",
    file: ACCEPTANCE_RUNNER,
    find: "        raw_stdout: rel(stdoutPath), raw_stdout_sha256: SHA(stdout),",
    with: "        raw_stdout: rel(stdoutPath), raw_stdout_sha256: null,",
    guards: "a Claude timeout preserves inspectable raw output instead of disappearing before evidence collection",
  },
  {
    name: "reject a Codex spawn error without persisting its failed cell",
    file: ACCEPTANCE_RUNNER,
    find: "      fail(`codex spawn failed: ${error.message}`);",
    with: "      reject(error);",
    guards: "a missing Codex executable records one immutable failed call and cannot be retried as a redraw",
  },
  {
    name: "let an early Claude exit raise an unhandled stdin EPIPE",
    file: ACCEPTANCE_RUNNER,
    find: "    child.stdin.on(\"error\", (error) => { fail(`claude stdin failed: ${error.message}`); });",
    with: "    // stdin failures ignored",
    guards: "an early Claude CLI exit is persisted as one immutable failed cell before retry is possible",
  },
  {
    name: "omit Codex companions from profile artifact hashes",
    file: ACCEPTANCE_RUNNER,
    find: "  profile: [\n    \"prompt\", \"raw\", \"source\", \"render\", \"markdown\", \"json\",\n    \"raw_events\", \"raw_output\", \"recovered_from\",\n  ],",
    with: "  profile: [\"prompt\", \"raw\", \"source\", \"render\", \"markdown\", \"json\"],",
    guards: "profile evidence binds the primary Codex event stream and final structured output",
  },
  {
    name: "omit Codex companions from claim-audit artifact hashes",
    file: ACCEPTANCE_RUNNER,
    find: "    \"initial_audit_prompt\", \"initial_audit_raw\", \"initial_audit\",\n    \"initial_audit_raw_events\", \"initial_audit_raw_output\", \"initial_audit_recovered_from\",",
    with: "    \"initial_audit_prompt\", \"initial_audit_raw\", \"initial_audit\",\n    // independent audit companions omitted",
    guards: "independent claim audits bind their primary Codex evidence rather than only a mutable wrapper",
  },
  {
    name: "order only the critic wrapper after the independent audit checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "      const evidencePaths = [resolve(item.path), ...codexCompanionEvidencePaths(record)];",
    with: "      const evidencePaths = [resolve(item.path)];",
    guards: "a pre-audit Codex critic event stream cannot be laundered through a post-audit wrapper",
  },
  {
    name: "skip the exact raw-result namespace inventory",
    file: ACCEPTANCE_RUNNER,
    find: "  const errors = [...rawNamespaceErrors(runDir, manifest, cases)];",
    with: "  const errors = [];",
    guards: "an orphan failed call, redraw, or extra critic draw cannot survive outside the artifact index",
  },
  {
    name: "allow undeclared files during acceptance dispatch preflight",
    file: ACCEPTANCE_RUNNER,
    find: "    ...runNamespaceErrors(runDir, manifest, cases, phase),\n    ...retiredRepairEvidenceErrors(runDir),",
    with: "    ...retiredRepairEvidenceErrors(runDir),",
    guards: "an archived failed cell cannot be moved elsewhere in the run before a canonical redraw",
  },
  {
    name: "allow profile-derived files before profile collection",
    file: ACCEPTANCE_RUNNER,
    find: "  const afterProfiles = [\"draft\", \"critic\", \"final\"].includes(phase);",
    with: "  const afterProfiles = true;",
    guards: "a profile failure cannot be laundered into an assembled profile path before rendering resumes",
  },
  {
    name: "stop revalidating draft prompts at critic dispatch",
    file: ACCEPTANCE_RUNNER,
    find: "  if ([\"draft\", \"critic\"].includes(phase)) {\n    errors.push(...existingDraftStageInputErrors(runDir, manifest, cases));\n  }",
    with: "  if (phase === \"draft\") errors.push(...existingDraftStageInputErrors(runDir, manifest, cases));",
    guards: "failed evidence cannot be laundered into an earlier prompt before critic dispatch",
  },
  {
    name: "allow final critic outputs before critic collection",
    file: ACCEPTANCE_RUNNER,
    find: "  const final = phase === \"final\";",
    with: "  const final = true;",
    guards: "a critic failure cannot be laundered into a future critic source or score path before dispatch",
  },
  {
    name: "let final collection write before its evidence preflight",
    file: ACCEPTANCE_RUNNER,
    find: "  const preflightErrors = dispatchPreflightErrors(runDir, manifest, cases, \"critic\");\n  if (preflightErrors.length) {\n    die(`acceptance finalization preflight failed; no files were written:\\n    ${preflightErrors.join(\"\\n    \")}`);\n  }\n  const audit = json(p.audit);",
    with: "  const audit = json(p.audit);",
    guards: "collect cannot erase relocated failed evidence before validating the complete critic graph",
  },
  {
    name: "require canonical critic outputs before read-only finalization finishes",
    file: ACCEPTANCE_RUNNER,
    find: "  const evidence = deriveAcceptanceEvidence(runDir, manifest, cases, { deferCanonical: true });",
    with: "  const evidence = deriveAcceptanceEvidence(runDir, manifest, cases);",
    guards: "finalization derives all critic evidence in memory before it materializes any canonical output",
  },
  {
    name: "allow undeclared files during final acceptance evidence checking",
    file: ACCEPTANCE_RUNNER,
    find: "    ...exactNamespaceErrors(criticRoot, expectedCritics, \"critics/raw\"),\n    ...runNamespaceErrors(runDir, manifest, cases),",
    with: "    ...exactNamespaceErrors(criticRoot, expectedCritics, \"critics/raw\"),",
    guards: "the final evidence check rejects every undeclared run file without guessing its content",
  },
  {
    name: "let a Codex wrapper point at another cell's companions",
    file: ACCEPTANCE_RUNNER,
    find: "    record[key] === expected[key]",
    with: "    true",
    guards: "each Codex wrapper is bound to its own canonical event, output, and recovery filenames",
  },
  {
    name: "trust a recorded artifact hash without reading its file",
    file: ACCEPTANCE_RUNNER,
    find: "    } else if (SHA(text(target)) !== expected) {",
    with: "    } else if (false) {",
    guards: "editing any recorded acceptance artifact invalidates its evidence",
  },
  {
    name: "stop comparing profile source normalizations to raw evidence",
    file: ACCEPTANCE_RUNNER,
    find: "    || JSON.stringify(stored.source_normalizations) !== JSON.stringify(derived.source_normalizations)",
    with: "    || false",
    guards: "profile support deduplication metadata reproduces exactly from immutable raw source",
  },
  {
    name: "advertise legacy claim-repair evidence in a current artifact record",
    file: ACCEPTANCE_RUNNER,
    find: "    if (entry[key] !== null && entry[key] !== undefined) {",
    with: "    if (false) {",
    guards: "current audit-disclosure artifacts cannot claim an obsolete repair branch even with a valid file hash",
  },
  {
    name: "scan only the top-level artifact record for legacy repair fields",
    file: ACCEPTANCE_RUNNER,
    find: "  for (const [childKey, child] of Object.entries(entry)) {",
    with: "  for (const [childKey, child] of []) {",
    guards: "legacy repair fields are forbidden in every profile, draft, refusal, critic, and evidence record",
  },
  {
    name: "check only case-shaped files in retired repair trees",
    file: ACCEPTANCE_RUNNER,
    find: "    const files = filesUnder(root);",
    with: "    const files = filesUnder(root).filter((file) => /^[dm]\\d+\\.json$/.test(file));",
    guards: "orphan repair results and prompts invalidate a current run regardless of their names",
  },
  {
    name: "ignore Codex companion files in retired repair trees",
    file: ACCEPTANCE_RUNNER,
    find: "    for (const file of files) {",
    with: '    for (const file of files.filter((entry) => !entry.endsWith(".codex-events.jsonl"))) {',
    guards: "an extra repair-model invocation cannot hide in an unindexed Codex event stream",
  },
  {
    name: "score the handwritten tally instead of rebuilding raw critic evidence",
    file: ACCEPTANCE_RUNNER,
    find: "    const evidence = deriveAcceptanceEvidence(runDir, manifest, cases);",
    with: "    const evidence = { ...deriveAcceptanceEvidence(runDir, manifest, cases), tally: json(p.tally), score: scoreRun(json(p.tally)) };",
    guards: "a passing TALLY.json cannot conceal failing raw critic draws",
  },
  {
    name: "leave transitive scoring dependencies outside the prepare lock",
    file: ACCEPTANCE_RUNNER,
    find: '    ...localModuleClosure(["bundles/prose-author/tests/acceptance-runner.mjs"]),',
    with: '    "bundles/prose-author/tests/acceptance-runner.mjs",',
    guards: "the immutable run locks the full local scoring and structural dependency closure",
  },
  {
    name: "resume from an uncommitted mutable manifest",
    file: ACCEPTANCE_RUNNER,
    find: "  const anchorError = committedManifestError(p.manifest, manifest.prepared_commit);",
    with: "  const anchorError = null;",
    guards: "the prepared manifest is committed unchanged before its first dispatch",
  },
  {
    name: "skip locked implementation verification before dispatch",
    file: ACCEPTANCE_RUNNER,
    find: "  const implementationErrors = lockedImplementationErrors(manifest);",
    with: "  const implementationErrors = [];",
    guards: "a prepared run refuses transient implementation changes before any model process starts",
  },
  {
    name: "let the manifest lock bytes absent from its prepared parent",
    file: ACCEPTANCE_RUNNER,
    find: "      if (SHA(prepared) !== expected) {",
    with: "      if (false) {",
    guards: "manifest hashes are anchored to implementation bytes in prepared_commit, not merely current files",
  },
  {
    name: "relabel recoverable Codex events under a new manifest",
    file: ACCEPTANCE_RUNNER,
    find: "      if (!resultMatchesDispatch(existing, dispatch)",
    with: "      if (false",
    guards: "Codex recovery preserves the dispatch provenance of the original event stream",
  },
  {
    name: "let required artifact path and hash pairs disappear together",
    file: ACCEPTANCE_RUNNER,
    find: "      else if (!optional.has(key)) errors.push(`${label}.${key} required path/hash pair is missing`);",
    with: "      else if (false) errors.push(`${label}.${key} required path/hash pair is missing`);",
    guards: "a missing required artifact cannot pass merely because its hash was also removed",
  },
  {
    name: "omit concurrency from raw dispatch provenance",
    file: ACCEPTANCE_RUNNER,
    find: "    concurrency: manifest.concurrency,",
    with: "    concurrency: 1,",
    guards: "every raw result records the manifest's actual locked concurrency",
  },
  {
    name: "omit the exact prompt from raw invocation provenance",
    file: ACCEPTANCE_RUNNER,
    find: "    prompt_sha256: SHA(prompt),",
    with: "    prompt_sha256: null,",
    guards: "each raw result is bound to the exact prompt bytes sent to its model",
  },
  {
    name: "dispatch prompt bytes that differ from the staged evidence",
    file: ACCEPTANCE_RUNNER,
    find: '  const prompt = body.endsWith("\\n") ? body : `${body}\\n`;',
    with: "  const prompt = body;",
    guards: "the prompt file, dispatched prompt, and invocation hash use identical bytes",
  },
  {
    name: "stop checking invocation provenance on final evidence",
    file: ACCEPTANCE_RUNNER,
    find: "      const record = completedResult(item.path, item.dispatch, item.input);",
    with: "      const record = completedResult(item.path, item.dispatch);",
    guards: "final verification matches every raw result to its system prompt, user prompt, and schema",
  },
  {
    name: "skip staged input reconstruction during final check",
    file: ACCEPTANCE_RUNNER,
    find: "    errors.push(...stagedInputErrors(runDir, manifest, cases));",
    with: "    // staged input reconstruction skipped",
    guards: "final acceptance rederives every staged corpus input from the locked fixture",
  },
  {
    name: "skip prompt reconstruction during final check",
    file: ACCEPTANCE_RUNNER,
    find: "    errors.push(...promptDerivationErrors(runDir, manifest, cases));",
    with: "    // prompt reconstruction skipped",
    guards: "final acceptance rederives every model prompt from locked inputs and raw predecessors",
  },
  {
    name: "skip raw profile reconstruction during final check",
    file: ACCEPTANCE_RUNNER,
    find: "    const profiles = deriveProfileEvidence(runDir, manifest, cases);",
    with: "    const profiles = { profileMeta: {}, stability: artifacts?.profile_stability ?? {} };",
    guards: "canonical profile files and stability reproduce from raw profile responses",
  },
  {
    name: "score canonical drafts without reconstructing raw draft evidence",
    file: ACCEPTANCE_RUNNER,
    find: "  const draftEvidence = deriveDraftEvidence(runDir, manifest, cases);",
    with: "  const draftEvidence = null;",
    guards: "structural gates score drafts reconstructed from raw draft and audit responses",
  },
  {
    name: "skip claims audit linkage during final check",
    file: ACCEPTANCE_RUNNER,
    find: "    if (existsSync(p.audit)) errors.push(...claimsAuditFailures(json(p.audit), cases, artifacts, runDir));",
    with: "    if (existsSync(p.audit)) errors.push(...claimsAuditFailures(json(p.audit), cases));",
    guards: "independent claims decisions stay linked to the exact draft, disclosure, and quotation candidates",
  },
  {
    name: "trust canonical critic sources instead of comparing them to raw",
    file: ACCEPTANCE_RUNNER,
    find: "        if (!existsSync(sourcePath) || text(sourcePath) !== sourceBody) {",
    with: "        if (false) {",
    guards: "critic canonical sources reproduce byte-for-byte from raw model results",
  },
  {
    name: "trust a Codex wrapper that diverges from its primary event stream",
    file: ACCEPTANCE_RUNNER,
    find: "    if (JSON.stringify(record.structured_output) !== JSON.stringify(payload.structured)) {",
    with: "    if (false) {",
    guards: "final verification reconstructs Codex structured output from immutable JSONL events",
  },
  {
    name: "select Codex reconstruction from the mutable wrapper label",
    file: ACCEPTANCE_RUNNER,
    find: "  const lockedHarness = expectedDispatch?.harness ?? record.acceptance_dispatch?.harness;",
    with: "  const lockedHarness = record.harness;",
    guards: "a Codex wrapper cannot skip primary-event reconstruction by relabelling itself",
  },
  {
    name: "drop the explicit type from context-specific profile dimensions",
    file: PROFILE_CONTRACT,
    find: '          items: { type: "string", enum: plan.qualitativeDimensions },',
    with: "          items: { enum: plan.qualitativeDimensions },",
    guards: "the generated profile schema remains valid in strict structured-output harnesses",
  },
  {
    name: "derive the critic verdict from its finding count",
    file: CRITIC_SOURCE,
    find: '  parts.push(`**${source.verdict}**`);',
    with: '  parts.push(`**${source.findings.length ? "REVISE" : "CLEAN"}**`);',
    guards: "the model-owned verdict remains independent from the findings-rate instrument",
  },
  {
    name: "drop the independent sentence-by-sentence claim inventory",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Then inspect every deterministically supplied sentence unit in\norder.",
    with: "Then sample a few supplied sentence units in\nany order.",
    guards: "a nearby disclosed fact cannot hide a second checkable assertion",
  },
  {
    name: "treat model memory as verified evidence",
    file: VOICE_DRAFT_PROMPT,
    find: "Pretrained memory is not verified evidence.",
    with: "Pretrained memory is verified evidence.",
    guards: "remembered examples remain explicitly queued for verification",
  },
  {
    name: "treat profile examples as reusable topic facts",
    file: VOICE_DRAFT_PROMPT,
    find: "It is not a research packet\nfor the new topic.",
    with: "It is also a research packet\nfor the new topic.",
    guards: "corpus-derived profile examples cannot cross the factual firewall",
  },
  {
    name: "let unverifiable generalizations enter the claims queue",
    file: VOICE_DRAFT_PROMPT,
    find: "Prefer one to three bounded specifics\nover a cloud of unsupported generalization",
    with: "Prefer a cloud of unsupported generalization\nover one to three bounded specifics",
    guards: "claims remain finite propositions a publisher can actually check",
  },
  {
    name: "let argumentative prose decorate itself with external-memory facts",
    file: VOICE_DRAFT_PROMPT,
    find: "use a small number of\nrelevant external facts",
    with: "use any number of\nrelevant or decorative external facts",
    guards: "an argument uses a restrained number of relevant facts instead of decorative memory",
  },
  {
    name: "tell the drafter topical request overlap can license a new predicate",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Do not extend this rule\nto a contingent motive, prevalence, actual event, legal consequence, technical\nimplementation, or industry practice",
    with: "Extend this rule\nto any contingent motive, prevalence, actual event, legal consequence, technical\nimplementation, or industry practice",
    guards: "the model prompt matches the conservative request-support contract",
  },
  {
    name: "let a listed claim license an invented attributed quotation",
    file: VOICE_DRAFT_PROMPT,
    find: "Attributed quoted words must appear\nin the request or in real source material the request supplied; otherwise remove the\nattribution and quotation marks.",
    with: "Attributed quoted words may be invented when useful; keep the\nattribution and quotation marks.",
    guards: "an invented quotation cannot be laundered through the verification list",
  },
  {
    name: "collapse multiple named-actor assertions into one topic claim",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "Extract every such proposition into `claims`; do not hide a second assertion behind a\nnearby one.",
    with: "One general topic claim may cover every assertion in a sentence.",
    guards: "each checkable action and consequence remains independently auditable",
  },
  {
    name: "dispatch sixty critics before the claims audit is complete",
    file: ACCEPTANCE_RUNNER,
    find: "const auditFailures = claimsAuditFailures(\n    claimsAudit, cases, artifacts, runDir,\n  );",
    with: "const auditFailures = [];",
    guards: "an incomplete disclosure audit cannot spend or score sixty critic calls",
  },
  {
    name: "let the independent factual audit treat the profile as a fact packet",
    file: DRAFT_CLAIM_AUDIT_PROMPT,
    find: "The request is the only supplied factual packet. It also supplies ordinary lexical",
    with: "The request and profile are supplied factual packets. They also supply ordinary lexical",
    guards: "profile examples, biography, and source facts cannot bypass the public verification queue",
  },
  {
    name: "stop requiring a sentence-by-sentence independent decision",
    file: ACCEPTANCE_RUNNER,
    find: "      if (!SENTENCE_REVIEW_DECISIONS.includes(review.decision)) {",
    with: "      if (false) {",
    guards: "a scalar completeness assertion cannot substitute for an independent decision on every sentence",
  },
  {
    name: "erase deterministic factual candidates from the independent audit checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "    candidate_reasons: factualCandidateReasons(ref.text),",
    with: "    candidate_reasons: [],",
    guards: "known conditional and rhetorical risks remain source-derived review candidates",
  },
  {
    name: "trust a handwritten checkpoint instead of the immutable independent audit",
    file: ACCEPTANCE_RUNNER,
    find: "      if (expectedReviews && JSON.stringify(review) !== JSON.stringify(expectedReviews[index])) {",
    with: "      if (false) {",
    guards: "every decision, rationale, candidate flag, and claim reference reproduces from independent evidence",
  },
  {
    name: "let an unrelated same-paragraph claim cover an audited sentence",
    file: ACCEPTANCE_RUNNER,
    find: "          if (JSON.stringify([...claimRefs].sort()) !== JSON.stringify([...expectedClaimRefs].sort())) {",
    with: "          if (false) {",
    guards: "a public verification claim belongs to the exact independently audited sentence",
  },
  {
    name: "accept a token independent-auditor rationale",
    file: ACCEPTANCE_RUNNER,
    find: "      if (typeof review.note !== \"string\" || normalizeAuditText(review.note).length < 32) {\n        failures.push(`${at} needs a substantive independent-auditor rationale`);\n      }",
    with: "      if (false) {\n        failures.push(`${at} needs a substantive independent-auditor rationale`);\n      }",
    guards: "a cleared sentence retains the auditor's inspectable clause-level rationale",
  },
  {
    name: "accept a request ledger claim only topically related to its supplied basis",
    file: DRAFT_CONTRACT,
    find: "        && !hasSufficientRequestSupport(entry.claim, entry.request_basis)) {",
    with: "        && false) {",
    guards: "a shared topic cannot become model-authored support for an appended predicate",
  },
  {
    name: "let a request-backed claim license unrelated prose",
    file: DRAFT_CONTRACT,
    find: "        if (citedClaims.length && sharedRequestSupportTerms(sentence.text, citedClaims.join(\" \")).length === 0) {",
    with: "        if (false) {",
    guards: "request support remains linked from supplied basis through claim to exact sentence",
  },
  {
    name: "let the drafting agent serve as its own independent auditor",
    file: ACCEPTANCE_RUNNER,
    find: "    if (provenance.audit_agent_sha256 === provenance.draft_agent_sha256) {",
    with: "    if (false) {",
    guards: "drafting and factual clearance remain separate prompt authorities and invocations",
  },
  {
    name: "accept audit provenance that drifts from the locked manifest",
    file: ACCEPTANCE_RUNNER,
    find: "      if (JSON.stringify(provenance) !== JSON.stringify(expected)) {",
    with: "      if (false) {",
    guards: "the checkpoint names the exact locked auditor harness, model, prompt body, and transport",
  },
  {
    name: "stop binding the independent audit prompt hash into the checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "        if (row.audit_prompt_sha256 !== artifact.audit_prompt_sha256) failures.push(`${c.id}: independent audit prompt hash drifted`);",
    with: "        if (false) failures.push(`${c.id}: independent audit prompt hash drifted`);",
    guards: "critic-unlocking decisions remain tied to the exact per-draft auditor prompt",
  },
  {
    name: "stop binding the independent audit raw response into the checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "        if (row.audit_raw_sha256 !== artifact.audit_raw_sha256) failures.push(`${c.id}: independent audit raw hash drifted`);",
    with: "        if (false) failures.push(`${c.id}: independent audit raw hash drifted`);",
    guards: "critic-unlocking decisions remain tied to the immutable raw auditor response",
  },
  {
    name: "follow a mutable alternate draft source pointer during independent audit checking",
    file: ACCEPTANCE_RUNNER,
    find: "        if (artifact.source !== expectedSourcePath\n          || artifact.source_sha256 !== (existsSync(canonicalSourcePath) ? SHA(text(canonicalSourcePath)) : null)) {",
    with: "        if (false) {",
    guards: "independent decisions remain bound to the canonical source derived from raw model evidence",
  },
  {
    name: "follow a mutable alternate independent-audit pointer",
    file: ACCEPTANCE_RUNNER,
    find: "        if (artifact.audit !== expectedAuditPath\n          || artifact.audit_sha256 !== (existsSync(canonicalAuditPath) ? SHA(text(canonicalAuditPath)) : null)) {",
    with: "        if (false) {",
    guards: "the checkpoint remains bound to the canonical independent result derived from raw model evidence",
  },
  {
    name: "hide a canonical disclosure behind a mutable artifact pointer",
    file: ACCEPTANCE_RUNNER,
    find: "        if (artifact.disclosure !== expectedDisclosurePath\n          || artifact.disclosure_sha256 !== (expectedDisclosurePath ? SHA(text(canonicalDisclosurePath)) : null)) {",
    with: "        if (false) {",
    guards: "the independent checkpoint cannot suppress or substitute the canonical public disclosure",
  },
  {
    name: "let the completed independent audit checkpoint change after its first commit",
    file: ACCEPTANCE_RUNNER,
    find: "    if (committed !== text(path)) return { error: \"file differs from its immutable first-add version\" };",
    with: "    if (false) return { error: \"file differs from its immutable first-add version\" };",
    guards: "the exact independent checkpoint and critic raw evidence stay immutable after first commit",
  },
  {
    name: "dispatch critics before committing the independent audit checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "  if (auditAnchor.error) {\n    die(`completed claims audit must be committed unchanged before critic calls: ${auditAnchor.error}`);\n  }",
    with: "  if (false) {\n    die(`completed claims audit must be committed unchanged before critic calls: ${auditAnchor.error}`);\n  }",
    guards: "critic calls cannot precede the immutable independent-audit anchor",
  },
  {
    name: "omit the independent audit anchor from critic invocation provenance",
    file: ACCEPTANCE_RUNNER,
    find: "          prerequisites: criticPrerequisites,",
    with: "          prerequisites: null,",
    guards: "every critic raw record names the exact audit hash and pre-critic commit",
  },
  {
    name: "stop checking that critic evidence was committed after the independent audit checkpoint",
    file: ACCEPTANCE_RUNNER,
    find: "          const orderError = strictlyCommittedAfter(evidencePath, item.prerequisiteCommit);",
    with: "          const orderError = null;",
    guards: "repository history proves the independent checkpoint predates every critic result",
  },
  {
    name: "let a quotation hide inside a profile example",
    file: ACCEPTANCE_RUNNER,
    find: "const supplied = normalizeAuditText(request);",
    with: 'const supplied = normalizeAuditText(`${request} ${profile}`);',
    guards: "the profile remains voice evidence rather than a factual quotation source",
  },
  {
    name: "let the requested container override the profile's register",
    file: VOICE_DRAFT_PROMPT,
    find: "the profile. A request for a newsletter, essay, policy argument, or reply selects form and",
    with: "the profile. A request for a newsletter, essay, policy argument, or reply selects its generic register and",
    guards: "a policy-newsletter request does not turn the author's vocabulary into policy-brief prose",
  },

  // --- the generate -> critique -> revise loop (PI-02 S4) ---
  // Every guard below decides whether a revision is kept. All of them fail silently:
  // the loop keeps running and the transcript still looks orderly.
  {
    name: "block degradation on any mean rise",
    file: LOOP,
    find: "  const allWorse = a.findings.min > b.findings.max;",
    with: "  const allWorse = a.findings.mean > b.findings.mean;",
    guards: "a k=3 noise tick-up does not refuse a good revision",
  },
  {
    name: "stop noticing a fallen verdict",
    file: LOOP,
    find: '  const verdictWorse = b.majority === "CLEAN" && a.majority === "REVISE";',
    with: "  const verdictWorse = false;",
    guards: "a revision that drops the verdict is refused",
  },
  {
    name: "treat a split CLEAN as converged",
    file: LOOP,
    find: '  if (last.majority === "CLEAN" && last.unanimous) {',
    with: '  if (last.majority === "CLEAN") {',
    guards: "a split is surfaced, not read as the half that suits the loop",
  },
  {
    name: "resolve a verdict tie to the better verdict",
    file: LOOP,
    find: '  for (const v of ["REVISE", "CLEAN"]) {',
    with: '  for (const v of ["CLEAN", "REVISE"]) {',
    guards: "a coin-flip tie is not evidence of clean",
  },
  {
    name: "drop the attributable-length floor",
    file: LOOP,
    find: "    .filter((i) => i.needle.length >= MIN_ATTRIBUTABLE_CHARS);",
    with: "    .filter(() => true);",
    guards: "a two-letter edit cannot be blamed for an unrelated finding",
  },
  {
    name: "blame edits for text that was already there",
    file: LOOP,
    find: "    .filter((e) => e.after && e.after !== e.before && !before.includes(squash(e.after)))",
    with: "    .filter((e) => e.after)",
    guards: "only text an edit INTRODUCED can have caused a finding",
  },
  {
    name: "remove the cap clamp",
    file: EXEMPLARS,
    find: "const effectiveCap = Math.min(Math.max(cap, 0), CAP_CLAMP - Number.EPSILON);",
    with: "const effectiveCap = cap;",
    guards: "human keeps the majority of exemplar slots",
  },
  {
    name: "cold start reports a gap",
    file: VERIFY,
    find: "const calibrated = Boolean(t.derived);",
    with: "const calibrated = true;",
    guards: "no cadence comparison without a calibrated corpus",
  },
  {
    name: "Tier A treated as a normal finding",
    file: VERIFY,
    find: 'const tierA = result.findings.filter((f) => f.tier === "A" && f.flagged);',
    with: "const tierA = [];",
    guards: "an artifact returns the draft instead of being reported",
  },
  {
    name: "drop the attestation requirement",
    file: EXEMPLARS,
    find: "    if (requireAttestation) {",
    with: "    if (false) {",
    guards: "unattested text cannot become the definition of human",
  },
  {
    name: "stop excluding READMEs",
    file: EXEMPLARS,
    find: String.raw`const isReadme = (name) => /^readme\b/i.test(name);`,
    with: "const isReadme = () => false;",
    guards: "scaffolding is never a writing sample",
  },
  {
    name: "lose the loose-file scanner candidate",
    file: VERIFY,
    find: 'rel("..", "..", "tell-scan", "tools", "tell-scan.mjs"),',
    with: "",
    guards: "verification works under the install shape install.sh produces",
  },
  {
    name: "rename readProvenance in calibrate.mjs (sibling present)",
    file: CALIBRATE,
    find: "export function readProvenance(",
    with: "export function readProvenanceRenamed(",
    guards: "the port is pinned against a sibling that CHANGED, not just absent",
  },
  {
    name: "drop .markdown/.mdx from the ported extension set",
    file: EXEMPLARS,
    find: 'export const TEXT_EXT = new Set([".md", ".markdown", ".txt", ".mdx"]);',
    with: 'export const TEXT_EXT = new Set([".md", ".txt"]);',
    guards: "calibration and drafting agree on what counts as a sample",
  },
  {
    name: "change the word floor on one side only",
    file: CALIBRATE,
    find: "export const MIN_SAMPLE_WORDS = 200;",
    with: "export const MIN_SAMPLE_WORDS = 150;",
    guards: "the ported floor equals the sibling's",
  },
  {
    name: "let a trivial edit through ingest",
    file: INGEST,
    find: "  if (ef < INGEST_FLOOR) {",
    with: "  if (false) {",
    guards: "voice does not collapse by accepting the model's near-verbatim output",
  },
  {
    name: "let a sub-minimum sample into approved/",
    file: INGEST,
    find: "  if (editedWords < MIN_SAMPLE_WORDS) {",
    with: "  if (false) {",
    guards: "approved/ never advertises files calibration would exclude",
  },
  {
    name: "let --verify skip the recompute and trust the stored ef",
    file: INGEST,
    find: "  const recomputed = editFraction(originalRaw, body);",
    with: "  const recomputed = declared;",
    guards: "--verify actually re-derives ef rather than restating what the file says",
  },
  {
    name: "reintroduce the model: unknown sentinel",
    file: INGEST,
    find: "    ...(model ? [`model: ${model}`] : []),",
    with: "    `model: ${model || \"unknown\"}`,",
    guards: "the frontmatter never claims an unknown model that would pollute filtering",
  },
  {
    name: "let calibrate skip the aggregate cap on approved samples",
    file: CALIBRATE,
    find: "  const scale = Math.min(1, maxScale);",
    with: "  const scale = 1;",
        suite: "sibling",
    guards: "approved samples cannot dominate the blended pool past the cap",
  },
  {
    name: "let calibrate blend approved samples below the human floor",
    file: CALIBRATE,
    find: "  if (humanCount < CORPUS_MINIMUM) {",
    with: "  if (false) {",
        suite: "sibling",
    guards: "cold-start cannot calibrate against model norms on day one",
  },
  {
    name: "let fidelity-scan pass a MATERIAL-LOSS as FAITHFUL",
    file: FIDELITY,
    suite: "review",
    find: '  return material.length === 0 ? "FAITHFUL" : "MATERIAL-LOSS";',
    with: '  return "FAITHFUL";',
    guards: "the verdict actually distinguishes fidelity states",
  },
  {
    name: "let fidelity-scan cross line breaks with proper-noun runs",
    file: FIDELITY,
    suite: "review",
    // ANCHOR REPAIRED TWICE. 2026-08-05: the ASCII regex literal was rebuilt from
    // `\p{Lu}`/`\p{Ll}` with explicit word-edge lookarounds. 2026-08-06: fixing the
    // `X of the Y` extraction gap moved the inter-word gap into a named `NOUN_GAP`
    // constant, deleting that anchor too.
    //
    // NOTE THE BACKSLASH COUNT DROPPED from four to two. `NOUN_GAP` is a `String.raw`
    // literal, so the FILE holds one literal backslash before `t`, where the previous
    // plain template literal held two - and an anchor is matched against source text, so
    // its escaping tracks how that source is written rather than what the regex means.
    // Getting this wrong produces a dead anchor, not a wrong mutation.
    //
    // Superseded reasoning, kept because it explains the shape: the pattern was restricted
    // to ASCII; closing P3(d) rebuilt it from `\p{Lu}`/`\p{Ll}` components with
    // explicit word-edge lookarounds, because `\b` is ASCII even under /u and would
    // have found no boundary before "É" - the fix would have been dead on arrival,
    // silently. The mutation still says the same thing: let the inter-word gap cross
    // a line break, and a heading followed by a capitalised sentence becomes one
    // enormous "proper noun".
    //
    // A dead anchor is why this file HARD-CRASHES rather than scoring 0. A mutation
    // that silently matched nothing would report the guard as untested, which reads
    // like a missing test rather than a stale anchor.
    // NOTE THE QUADRUPLED BACKSLASHES. The anchor is matched against the FILE's
    // source text, where the pattern is a template literal fed to `new RegExp` -
    // so the file contains two literal backslashes before `t`, and a JS string
    // wanting two literal backslashes needs four. The obvious two-backslash
    // version matches nothing.
    find: 'const NOUN_GAP = String.raw`[ \\t]+(?:${LINK_WORD}[ \\t]+){0,${MAX_LINK_WORDS}}`;',
    with: 'const NOUN_GAP = String.raw`\\s+(?:${LINK_WORD}\\s+){0,${MAX_LINK_WORDS}}`;',
    guards: "proper-noun runs stay within a line - a headings-plus-sentence false positive fires on every structured document",
  },
  {
    name: "let fidelity-scan skip thousands-separator normalisation",
    file: FIDELITY,
    suite: "review",
    find: 'function normaliseNumber(n) {\n  return n.replace(/,/g, "");\n}',
    with: 'function normaliseNumber(n) {\n  return n;\n}',
    guards: "1,234 and 1234 read as the same information, so users are not trained to game the formatter",
  },
  {
    // The narrowing warning is the only thing watching for voice collapse, and
    // it shipped reading the wrong field path - computed, written, and dropped
    // one field name from being shown. A reviewer caught it. This mutation is
    // what catches it next time.
    name: "read the narrowing warning from the wrong field path",
    file: SCANNER,
    find: "        warning: profile.thresholds.blended_warning || null,",
    with: "        warning: profile.thresholds.approved?.blended_warning || null,",
    suite: "sibling",
    guards: "the voice-collapse warning reaches the person it is about",
  },
  {
    // The flywheel. calibrate wrote catalog_density_blended for weeks and
    // tell-scan read catalog_density, so an ingested edit changed no output
    // anywhere. Every component passed its own tests throughout. This mutation
    // reopens that gap, and the loop test is what notices.
    name: "let tell-scan ignore the blended bands",
    file: EVALUATE,
    find: "  const use = prefer && usable;",
    with: "  const use = false;",
    suite: "sibling",
    guards: "an approved edit actually changes what the scanner reports",
  },
    {
    name: "trust edit_fraction as a signed number rather than computing it",
    file: INGEST,
    find: "  const lcs = lcsLength(a, b);\n  return round((b.length - lcs) / b.length, 4);",
    with: "  return 1;",
    guards: "edit_fraction is computed from a diff, never asserted",
  },

  // --- habit rates and the fixture guard (PI-02 FU-12 / FU-19) ---
  // The rate screen is the only instrument comparing a draft to the corpus, and the
  // fixture guard is what stops a prompt handing a primitive its own findings. Both
  // fail silently: a broken screen reports in-band, a broken guard reports clean.
  {
    name: "let an open suffix swallow coinages in the profanity pattern",
    file: RATES,
    find: "|dick|dicks|prick|pricks|",
    with: "|dick\\w*|prick\\w*|",
    guards: "a coined term built on a rude root is not counted as the habit it resembles",
  },
  {
    name: "measure rates over the whole file instead of the essay body",
    file: RATES,
    find: "  const first = lines.findIndex((l) => /\\(permalink\\)\\s*$/.test(l));",
    with: "  const first = -1;",
    guards: "site boilerplate is excluded from a rate the profile will quote",
  },
  {
    name: "let a ratio breach alone become a verdict",
    file: RATES,
    find: "  if (absDeviation >= floor) {",
    with: "  if (true) {",
    guards: "one extra instance in a short draft is not reported as caricature",
  },
  // --- the differential counter ---
  // The only check here that can catch a wrong number rather than a wrong shape. Each
  // mutation makes it report clean over nothing, which is the failure mode that matters:
  // a cross-checker that silently stops checking looks exactly like one that found no
  // problems.
  {
    name: "silently skip a claim the checker cannot locate",
    file: XCOUNT,
    find: "    if (!stated) { rows.push({ id: claim.id, status: \"unlocatable\", measured }); continue; }",
    with: "    if (!stated) { continue; }",
    guards: "a checker that finds nothing to check says so instead of reporting clean",
  },
  {
    name: "read a decimal's fractional part as a count",
    file: XCOUNT,
    find: "  const NUM = \"(?<![.\\\\d/,])(\\\\d[\\\\d,]{0,6})(?![\\\\d.]|\\\\s*/)\";",
    with: "  const NUM = \"(\\\\d[\\\\d,]{0,6})(?![\\\\d.]|\\\\s*/)\";",
    guards: "22.65 per 1,000 is a rate, not a count of 65",
  },
  {
    name: "widen the tolerance past the inflation it exists to catch",
    file: XCOUNT,
    find: "export function crossCount(profileDir, markdown, { tolerance = 0.15 } = {}) {",
    with: "export function crossCount(profileDir, markdown, { tolerance = 0.95 } = {}) {",
    guards: "a 32% inflation is still a divergence",
  },
  // --- the ship bar (PI-02 S7) ---
  // This decides whether two held primitives ship. Every mutation below turns a failing
  // run into a passing one, and none of them looks wrong in the output.
  {
    name: "turn the conjunctive bar into a disjunction",
    file: BAR,
    find: "    passes: majorityClean && rateOk,",
    with: "    passes: majorityClean || rateOk,",
    guards: "a draft must clear BOTH instruments, not whichever one it happened to satisfy",
  },
  {
    name: "loosen the pre-registered findings ceiling",
    file: BAR,
    find: "export const MAX_FINDINGS_PER_DRAW = 1.0;",
    with: "export const MAX_FINDINGS_PER_DRAW = 2.0;",
    guards: "a threshold pre-registered before the run cannot be edited after seeing it",
  },
  {
    name: "let a failed structural gate through",
    file: BAR,
    find: "  const gateFailures = STRUCTURAL_GATES.filter((g) => structural[g] !== \"pass\");",
    with: "  const gateFailures = [];",
    guards: "a fabricated citation fails the run no matter how the drafts scored",
  },
  {
    name: "let a run with no drafts clear the bar",
    file: BAR,
    find: "    clears: drafts.length > 0 && passed === drafts.length && gateFailures.length === 0,",
    with: "    clears: passed === drafts.length && gateFailures.length === 0,",
    guards: "a run that dispatched nothing cannot report a pass",
  },
  {
    name: "narrow the detector-claim pattern back to a single determiner",
    file: GATES,
    find: "  /\\b(beat|fool|evade|pass|defeat)(s|es|ed)? (any |an? |the |every )?(ai |content |plagiarism )?detector/i,",
    with: "  /\\b(beat|fool|evade)s? (an? )?(ai )?detector\\b/i,",
    guards: "a draft claiming to fool ANY detector is caught, not just one phrased with 'a'",
  },
  {
    name: "let `undetectable` fire without a text subject",
    file: GATES,
    find: "  /\\bundetectable\\b[^.!?]{0,60}\\b(ai|detector|human|machine|writing|text|prose)\\b/i,",
    with: "  /\\bundetectable\\b/i,",
    guards: "the gate does not flag innocent prose, which is how a gate gets switched off",
  },
  // --- renderer-emitted rates (PI-02 FU-19 option 3) ---
  // A rate in a profile is an instruction a drafter acts on numerically. Every failure
  // here reaches the draft as a wrong target and reads like a confident one.
  {
    name: "accept a non-integer occurrence count",
    file: VPROFILE,
    find: "          if (!isInt(r.count)) err(`${at}.rate.count must be an integer`);",
    with: "          if (false) err(`${at}.rate.count must be an integer`);",
    guards: "a count is a count of instances, not an estimate the renderer interpolated",
  },
  {
    name: "let a stated rate disagree with its own count",
    file: VPROFILE,
    find: "    if (Math.abs(r.per_1000_words - expected) > Math.max(tolerance, expected * tolerance)) {",
    with: "    if (false) {",
    guards: "a rate is arithmetic on the corpus, not a number the renderer liked",
  },
  {
    name: "accept a count smaller than the number of samples supporting it",
    file: VPROFILE,
    find: "          if (isInt(r.count) && !isAbsence && isInt(o.support) && r.count < o.support) {",
    with: "          if (false) {",
    guards: "a habit found in ten samples has at least ten instances",
  },
  {
    name: "stop comparing the frequency phrase against the counted rate",
    file: VPROFILE,
    find: "    if (Math.abs(statedBand - actualBand) >= 2) {",
    with: "    if (false) {",
    guards: "the phrase a drafter reads and the number a harness reads agree",
  },
  {
    name: "scan the corpus directly instead of delegating to the drafter's reader",
    file: RATES,
    find: "  const { usable } = readSamples(humanDir, { requireAttestation: true });",
    with: "  const { usable } = readSamples(humanDir, { requireAttestation: false });",
    guards: "rates are measured over the same attested samples the drafter is shown",
  },
  {
    name: "measure an undelimited corpus without saying so",
    file: RATES,
    find: "  if (first === -1) return { body: body.trim(), extraction: \"whole-file\" };",
    with: "  if (first === -1) return { body: body.trim(), extraction: \"permalink-delimited\" };",
    guards: "a corpus measured whole cannot report itself as cleanly delimited",
  },
  {
    name: "count bare-URL lines as paragraph endings",
    file: RATES,
    find: "    .filter((p) => p && !/^https?:\\S*$/.test(p) && !IMAGE_CREDIT.test(p));",
    with: "    .filter((p) => p);",
    guards: "citation scaffolding and image credits are not measured as paragraph endings",
  },
  {
    name: "measure every sentence instead of paragraph-final ones",
    file: RATES,
    find: "    finals.push(s[s.length - 1].split(/\\s+/).length);",
    with: "    for (const one of s) finals.push(one.split(/\\s+/).length);",
    guards: "the drumbeat is visible only when endings are measured apart from the prose",
  },
  {
    name: "count the country US as the pronoun us",
    file: RATES,
    find: "  solidarity: /\\b(we|We|us|our|Our|ours|Ours|we're|We're|we've|We've|we'd|We'd|we'll|We'll)\\b/g,",
    with: "  solidarity: /\\b(we|us|our|ours)\\b/gi,",
    guards: "a habit rate is not inflated 32% by an abbreviation that shares its letters",
  },
  {
    name: "treat every possessive as a contraction",
    file: RATES,
    find: "    /\\b(?:(?:it|that|there|here|who|what|where|when|how|why|he|she|let|one|nothing|everything|something|somebody|nobody|this)['’]s|[A-Za-z]+['’](?:t|re|ve|ll|d|m))\\b/gi,",
    with: "    /\\b[A-Za-z]+['’](?:t|s|re|ve|ll|d|m)\\b/gi,",
    guards: "the world's fair is not evidence that the author contracts",
  },
  {
    name: "let the solidarity pattern match inside longer words",
    file: RATES,
    find: "  solidarity: /\\b(we|We|us|our|Our|ours|Ours|we're|We're|we've|We've|we'd|We'd|we'll|We'll)\\b/g,",
    with: "  solidarity: /(we|We|us|our|Our|ours)/g,",
    guards: "the habit five drafts are deficient in is not inflated by substring hits",
  },
  {
    name: "stop guarding the corpus's measured rates against leaking into a prompt",
    file: FGUARD,
    find: "      if (per1000 >= 1) out.push({ fixture, what: `${habit} per 1000 words`, token: rate });",
    with: "      if (false) out.push({ fixture, what: `${habit} per 1000 words`, token: rate });",
    guards: "a renderer is not handed the number it is being asked to derive",
  },
  {
    name: "stop deriving author tokens from corpus frontmatter",
    file: FGUARD,
    find: "        if (tok.length >= MIN_TOKEN) tokens.add(tok.toLowerCase());",
    with: "        if (false) tokens.add(tok.toLowerCase());",
    guards: "a prompt naming an author by any part of their name is caught, not just the surname",
  },
  {
    name: "let a not-author-named exemption go stale",
    file: FGUARD,
    find: "  return Object.keys(NOT_AUTHOR_NAMED).filter((n) => !present.has(n));",
    with: "  return [];",
    guards: "an exemption that no longer matches a fixture cannot silently disable a check",
  },
];

function runSuite(root, suiteRel = SUITES.author) {
  try {
    const out = execFileSync("node", [join(root, suiteRel)], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return parseSuiteSummary(out);
  } catch (err) {
    // A non-zero exit is the normal case here - the suite is meant to fail.
    return parseSuiteSummary(String(err.stdout || ""));
  }
}

export function parseSuiteSummary(out) {
  // Diagnostic text can contain receipt counts such as "1 passed, 0 failed".
  // Only the suites' delimited, complete summary is evidence of completion.
  const summaries = [...out.matchAll(/^─{60}\r?\n(\d+) passed, (\d+) failed(?:, \d+ skipped)?\r?$/gm)];
  const m = summaries.length === 1 ? summaries[0] : null;
  // No summary line means the run DIED rather than finished. Reporting the FAIL
  // lines it managed to print before crashing is how this table got a wrong
  // number in the first place (CALIBRATION.md FN-2026-08-04-j).
  if (!m) return { failed: null, crashed: true };
  return { failed: Number(m[2]), crashed: false };
}

/**
 * Break `mut` inside `root`, which must be a sandbox. Returns the restore thunk.
 *
 * The anchor is checked against the sandbox copy rather than the working tree so
 * that a stale sandbox fails loudly instead of mutating nothing and scoring 0 -
 * a silent 0 reads as "no test covers this guard", which is the one number this
 * file must never get wrong by accident.
 */
export function applyIn(root, mut) {
  const target = join(root, mut.file);
  const src = readFileSync(target, "utf8");
  const occurrences = src.split(mut.find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`anchor appears ${occurrences} times in ${mut.file}: ${mut.name}`);
  }
  writeFileSync(target, src.replace(mut.find, mut.with));
  return () => writeFileSync(target, src);
}

export function runAll() {
  const sandbox = createSandbox();
  try {
    // Every suite must start green in the SANDBOX, not merely in the repo. A copy
    // that did not come across intact would otherwise show up as mutation scores
    // that are all mysteriously high.
    for (const suite of Object.values(SUITES)) {
      const b = runSuite(sandbox, suite);
      if (b.crashed) throw new Error(`baseline suite did not finish in sandbox: ${suite}`);
      if (b.failed !== 0) throw new Error(`baseline is not green in sandbox ${suite}: ${b.failed} failed`);
    }

    const results = [];
    for (const mut of MUTATIONS) {
      // Each mutation names which suite covers it. A mutation in calibrate.mjs
      // affects prose-tell-scan's suite, not this one - running the wrong suite
      // would silently score 0, which is exactly the "no failing mutation" trap
      // this file exists to prevent.
      const suite = SUITES[mut.suite === "sibling" ? "sibling" : mut.suite === "review" ? "review" : "author"];
      const restore = applyIn(sandbox, mut);
      try {
        results.push({ ...mut, ...runSuite(sandbox, suite) });
      } finally {
        restore();
      }
    }

    // Restoration is still checked. It no longer protects the working tree - the
    // sandbox is about to be deleted - but a mutation that fails to restore means
    // every LATER mutation in this run scored against a still-broken file, so the
    // whole table would be wrong.
    for (const suite of Object.values(SUITES)) {
      const after = runSuite(sandbox, suite);
      if (after.failed !== 0) throw new Error(`suite not restored in sandbox: ${suite}`);
    }
    return results;
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function render(results) {
  const rows = results.map((r) => {
    const n = r.crashed ? "CRASH" : r.failed;
    return `| ${r.name} | ${n} | ${r.guards} |`;
  });
  return ["| mutation | tests failed | what it guards |", "|---|---|---|", ...rows].join("\n");
}

function main() {
  const update = process.argv.includes("--update");
  const results = runAll();
  const table = render(results);

  const weak = results.filter((r) => r.failed === 0 || r.crashed);
  const doc = readFileSync(TABLE, "utf8");
  const current = doc.match(/\| mutation \| tests failed \|[\s\S]*?(?=\n\n)/);

  if (update) {
    writeFileSync(TABLE, current ? doc.replace(current[0], table) : `${doc}\n\n${table}\n`);
    process.stdout.write(`\n${table}\n\n  MUTATIONS.md updated.\n\n`);
  } else {
    process.stdout.write(`\n${table}\n\n`);
    if (!current || current[0].trim() !== table.trim()) {
      process.stdout.write("  MUTATIONS.md does not match this run. Re-run with --update.\n\n");
      process.exit(1);
    }
    process.stdout.write("  MUTATIONS.md matches.\n\n");
  }

  if (weak.length) {
    for (const w of weak) {
      process.stdout.write(
        w.crashed
          ? `  ${w.name}: the suite CRASHED - the count is not a count.\n`
          : `  ${w.name}: NOTHING FAILED. This guard has no test.\n`,
      );
    }
    process.stdout.write("\n");
    process.exit(1);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
