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
const CRITIC_SOURCE = "bundles/prose-author/tests/voice-critic-source.mjs";
const ACCEPTANCE_RUNNER = "bundles/prose-author/tests/acceptance-runner.mjs";
const VOICE_DRAFT_PROMPT = "primitives/agents/voice-draft/agent.md";
const RATES = "bundles/prose-author/tests/corpus-rates.mjs";
const BAR = "bundles/prose-author/tests/bar.mjs";
const XCOUNT = "bundles/prose-author/tests/cross-count.mjs";
const GATES = "bundles/prose-author/tests/run-gates.mjs";
const FGUARD = "bundles/prose-author/tests/fixture-guard.mjs";

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
    name: "let a disclosure cite words absent from its sentence",
    file: DRAFT_CLAIM_AUDIT,
    find: '          if (expected && typeof claim.evidence === "string" && !String(expected.text ?? "").includes(claim.evidence)) {',
    with: '          if (false) {',
    guards: "an audit-owned claim is anchored to exact prose rather than invented during review",
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
    find: "Sentence basis\nlabels and ledger references are evidence to inspect, never conclusions to trust.",
    with: "Sentence basis\nlabels and ledger references are authoritative conclusions.",
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
    find: "Generic wording does not turn a claim about law, industry, markets,\ninstitutions, products, or common behavior into reasoning.",
    with: "Generic wording turns a claim about law, industry, markets,\ninstitutions, products, or common behavior into reasoning.",
    guards: "broad legal, historical, and industry claims enter the verification queue",
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
    name: "trust a recorded artifact hash without reading its file",
    file: ACCEPTANCE_RUNNER,
    find: "    } else if (SHA(text(target)) !== expected) {",
    with: "    } else if (false) {",
    guards: "editing any recorded acceptance artifact invalidates its evidence",
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
    find: "      if (!completedResult(item.path, item.dispatch, item.input)) errors.push(`missing model result ${rel(item.path)}`);",
    with: "      if (!completedResult(item.path, item.dispatch)) errors.push(`missing model result ${rel(item.path)}`);",
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
    guards: "manual claims decisions stay linked to the exact draft, disclosure, and quotations",
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
    name: "drop the drafter's sentence-by-sentence claim inventory",
    file: VOICE_DRAFT_PROMPT,
    find: "After the prose is complete, read it sentence by sentence. Mark every date, amount,",
    with: "After the prose is complete, trust the ledger without rereading. Mark every date, amount,",
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
    find: "An external claim must be finite enough for an independent reviewer to verify from an\nauthoritative record",
    with: "An external claim may be as broad as needed and need not be independently verifiable from an\nauthoritative record",
    guards: "claims remain finite propositions a publisher can actually check",
  },
  {
    name: "let argumentative prose decorate itself with external-memory facts",
    file: VOICE_DRAFT_PROMPT,
    find: "In that situation, the external-verification\npart of the ledger **must be empty**.",
    with: "In that situation, the external-verification\npart of the ledger may contain decorative examples.",
    guards: "a source-free argument stays within request evidence instead of inventing vivid cases",
  },
  {
    name: "let a listed claim license an invented attributed quotation",
    file: VOICE_DRAFT_PROMPT,
    find: "**Putting an attributed\nquotation in the ledger does not make invented wording permissible.**",
    with: "Putting an attributed\nquotation in the ledger makes the wording permissible.",
    guards: "an invented quotation cannot be laundered through the verification list",
  },
  {
    name: "collapse multiple named-actor assertions into one topic claim",
    file: VOICE_DRAFT_PROMPT,
    find: "Inventory each actor-action and actor-consequence\nassertion separately in the ledger before prose, or remove/recast it.",
    with: "One general topic entry may cover every actor-action and consequence\nassertion in the ledger.",
    guards: "each checkable action and consequence remains independently auditable",
  },
  {
    name: "dispatch sixty critics before the claims audit is complete",
    file: ACCEPTANCE_RUNNER,
    find: 'const auditFailures = claimsAuditFailures(json(join(runDir, "CLAIMS-AUDIT.json")), cases);',
    with: "const auditFailures = [];",
    guards: "an incomplete disclosure audit cannot spend or score sixty critic calls",
  },
  {
    name: "let the human factual audit treat the profile as a fact packet",
    file: ACCEPTANCE_RUNNER,
    find: "listed or supplied by the request; the profile is voice evidence, never a factual packet",
    with: "listed or supplied by the request/profile",
    guards: "profile examples, biography, and source facts cannot bypass the public verification queue",
  },
  {
    name: "stop requiring the independent disclosure-completeness decision",
    file: ACCEPTANCE_RUNNER,
    find: '["claims_verified", "disclosure_complete", "quotations_verified"]',
    with: '["claims_verified", "quotations_verified"]',
    guards: "the drafter cannot certify completeness merely by returning a claims list",
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
    return parse(out);
  } catch (err) {
    // A non-zero exit is the normal case here - the suite is meant to fail.
    return parse(String(err.stdout || ""));
  }
}

function parse(out) {
  const m = out.match(/(\d+) passed, (\d+) failed/);
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
