#!/usr/bin/env node
/**
 * pattern-harness — prepare, collect and verify a prose-pattern-critic acceptance run.
 *
 *   node tests/pattern-harness.mjs prepare fixtures 2026-08-05-pattern --draws 3
 *   node tests/pattern-harness.mjs prepare corpus   2026-08-05-pattern-corpus \
 *       --draws 1 --human 24 --ai 12
 *   node tests/pattern-harness.mjs collect runs/2026-08-05-pattern
 *   node tests/pattern-harness.mjs verify  runs/2026-08-05-pattern
 *
 * This is prose-review's `run-harness.mjs` idea applied to a critic that reads a different
 * kind of artifact. It is a SEPARATE file rather than a `pattern:` entry in that one's
 * CRITICS table, and that is deliberate: this critic ships on prose-tell-scan's release
 * clock, and a bundle whose tests import another bundle's runner cannot be installed on
 * its own. The duplicated logic is ~150 lines; the coupling would be permanent.
 *
 * WHAT IS AUTOMATED AND WHAT IS NOT. Same split, same reasons.
 *
 *   prepare  — stages every byte the critic may see, strips frontmatter, renames each case
 *              to an opaque id, runs tell-scan and stages the report, writes one
 *              identically-shaped prompt per draw, and refuses to emit anything if a
 *              staged byte carries a verdict word, an expectation key or a provenance
 *              label. `human_authored: false` and `label: ai` live in this corpus's
 *              frontmatter and would hand the critic the answer.
 *   collect  — derives the verdict and the findings count FROM the transcript body and
 *              writes review.json with every finding quoted and `null` where each contract
 *              count belongs. It will not emit transcripts until a person replaces the
 *              nulls, and it never defaults them to 0, because 0 flatters the result.
 *   verify   — re-derives the run's numbers from the wrapped transcripts.
 *
 * dispatch is NOT here. This repo is public and its tests must not need an API key.
 * `prepare` writes prompts; a session dispatching them one clean-context agent per prompt
 * is the intended path, and it is what produced the published run.
 *
 * WHY DRAWS. Critic verdicts are not deterministic: two dispatches of a byte-identical
 * prompt elsewhere in this repo returned opposite verdicts on the same span. `--draws k`
 * writes k prompts per fixture so a run can report agreement instead of implying a
 * determinism it does not have. DECIDE k BEFORE THE RUN. Raising it after seeing a split
 * is choosing the sample that gives the answer you wanted.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const BUNDLE = resolve(TESTS, "..");
const REPO = resolve(BUNDLE, "..", "..");
const SCAN = join(BUNDLE, "skills", "tell-scan", "tools", "tell-scan.mjs");
const AGENT = join(REPO, "primitives", "agents", "prose-pattern-critic", "agent.md");
const CATALOG = join(BUNDLE, "skills", "tell-scan", "profiles", "_base", "catalog.json");

const VOCAB = ["CLEAN", "REVISE"];
/**
 * The per-finding marker the output contract requires. Bold is OPTIONAL here on purpose:
 * one transcript in the first run emitted `PATTERN:` unbolded, and a counter that reads
 * that as zero findings turns a formatting slip into a transcript that contradicts its own
 * verdict and aborts the run. The drift is real and is recorded in the run log. It is not
 * the counter's job to hide it, nor to be defeated by it.
 */
const FINDING = /^[ \t]*(?:[-*+][ \t]+)?\**PATTERN\**[ \t]*:/gm;
const CONTRACT = ["uncatalogued", "authorship_claims", "echoes_scan"];

/**
 * Every way a staged byte could tell the critic the answer. The first fidelity sweep in
 * this repo was thrown away because `expect: FAITHFUL` sat in a file the critic had to
 * read, and the fix at the time was a sentence in a prompt. A sentence is not a mechanism.
 */
const LEAKS = [
  /\bexpect(?:ed|s)?\s*[:=]/i,
  /\bhuman_authored\b/i,
  /\blabel\s*:\s*ai\b/i,
  /\bmulti_author_collection\b/i,
  /\bscan_state\b/i,
  /\bexpect_pattern\b/i,
  new RegExp(`\\b(?:${VOCAB.join("|")})\\b`),
];

/**
 * SEVEN OF THE 33 AI SAMPLES SAY SO IN THEIR OWN BODY TEXT. They are Wikipedia pages whose
 * vendored text includes the talk-page comment that got them listed - "Complete AI slop",
 * "Clearly AI-generated", "LLM-written" - and one whose citation URLs carry
 * `utm_source=chatgpt.com`. Stripping frontmatter does not touch any of it, and a critic
 * handed one has been told the answer in the draft it is judging.
 *
 * The rule is deliberately BLUNT and over-excludes in the safe direction: it also drops
 * four EFF posts that merely discuss LLMs. Losing four negatives costs nothing; keeping
 * one labelled positive would cost the whole positive column.
 *
 * This is a property of the corpus, not of the staging, so it is a SELECTION RULE and an
 * abort, not a silent scrub: deleting the sentence would edit vendored source, and keeping
 * the sample would produce a number that measures nothing. Excluded samples are counted in
 * the run log so the denominator is visible.
 */
export const NAMES_AUTHORSHIP = new RegExp([
  String.raw`\bAI[ -]?(?:slop|generated|written)\b`,
  String.raw`\bChatGPT\b`,
  String.raw`\bLLM\b`,
  String.raw`\bgenerated by (?:an )?AI\b`,
  // ADDED after a vendored talk-page comment reading "the tone is clearly
  // chatbot-generated" passed every guard and reached a critic. The original list
  // enumerated the phrasings someone thought of, which is the failure mode of a
  // denylist stated in one line.
  String.raw`\bchatbot[ -]?(?:generated|written|register|output)\b`,
  String.raw`\b(?:machine|model|bot)[ -]?(?:generated|written)\b`,
  String.raw`\bassistant[ -]?(?:preamble|generated)\b`,
  String.raw`\bwritten by (?:a |an )?(?:bot|machine|model|chatbot)\b`,
].join("|"), "i");

/**
 * Every entry id in the catalog, as a word-boundary regex, derived at run time.
 *
 * DERIVED, NOT LISTED, and that is the whole point. A hand-written list of forbidden ids
 * is correct on the day it is written and silently wrong the first time someone adds a
 * catalog entry - which is the same shape as the defect this guard exists to catch. The
 * catalog is the source of truth for what ids exist, so the guard reads it.
 *
 * Ids are hyphenated slugs (`chatbot-register`), so they cannot collide with ordinary
 * prose; a corpus sample would have to contain the literal slug to trip this.
 */
export function catalogIdGuard() {
  const cat = JSON.parse(readFileSync(CATALOG, "utf8"));
  const ids = [
    ...(cat.entries || []).map((e) => e.id),
    ...Object.keys(cat.not_deterministic || {}).filter((k) => k !== "_about"),
  ].filter((id) => typeof id === "string" && id.includes("-"));
  return new RegExp(`\\b(?:${[...new Set(ids)].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`);
}

const die = (msg) => { process.stderr.write(`${msg}\n`); process.exit(2); };

/** Strip a leading YAML frontmatter block. That is where every provenance label lives. */
function stripFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? text.slice(m[0].length).replace(/^\s*\n/, "") : text;
}

/** Opaque, stable, and NOT alphabetical: `p-` in a fixture name is the answer. */
function caseIds(names) {
  const ordered = [...names].sort((a, b) =>
    createHash("sha256").update(a).digest("hex").localeCompare(
      createHash("sha256").update(b).digest("hex")));
  return new Map(ordered.map((n, i) => [n, `case-${String(i + 1).padStart(2, "0")}`]));
}

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/**
 * The staged scan report, built from an ALLOWLIST of fields rather than filtered by a
 * denylist of forbidden ones.
 *
 * THIS IS THE FIX FOR FN-2026-08-06-o AND THE REASON THE RULE IS PHRASED THAT WAY. The
 * previous version emitted `id` and `category` straight from tell-scan's findings, so the
 * staged JSON carried the scanner's own entry ids - `chatbot-register`,
 * `assistant-preamble`, `model-markup-artifact` - into the one artifact this critic is
 * REQUIRED to read. Those are not verdicts, so the verdict-word guard never saw them; they
 * are category names doing a verdict's work. Four of eleven cases carried one, and the
 * single case that carried `chatbot-register` is the same case that produced both of the
 * authorship claims that blocked the primitive. The harness told the critic the answer and
 * then recorded it for repeating it.
 *
 * A denylist could not have closed this. Every new catalog entry, every vendored quotation,
 * every sibling tool's id space is another hole. The set of fields the critic legitimately
 * needs is small and knowable; the set of strings that could give the game away is not.
 *
 * WHY OPAQUE HITS COST NOTHING HERE. This critic owns exactly the patterns `catalog.json`
 * records as undecidable by regex, so its scope and the scanner's are disjoint BY
 * CONSTRUCTION - the scanner never reports on a pattern this critic owns, and the critic
 * can therefore never echo one. What it needs is to know that a deterministic pass already
 * ran and covered ground, so it does not restate scanner output as its own finding. A count
 * carries that. An id carries that plus an accusation.
 */
function scanReport(file) {
  const out = execFileSync("node", [SCAN, file, "--profile", "essay", "--json"],
    { encoding: "utf8", maxBuffer: 1e8 });
  const r = JSON.parse(out).results[0];
  const flagged = r.findings.filter((f) => f.flagged);
  return {
    words: r.summary.words,
    cadence_flags: r.summary.cadence_flags,
    thresholds_derived: r.summary.thresholds_derived,
    // Numbers only. Deliberately no id, no category, no matched example.
    deterministic_hits: flagged.length,
    // Count only. An earlier version also emitted `deterministic_hit_densities`, reading a
    // `per_1000` field the findings do not carry - they carry `per_1k` - so it was an array
    // of nulls for its whole life. Removed rather than repaired: the count already tells the
    // critic that ground was covered, and the densities of hits it is structurally unable to
    // own tell it nothing it can act on. A field that has never once carried a value is not a
    // field, and repairing it would have added real information for no stated reason.
    _note: "Hit identities are withheld from this report on purpose. The patterns you own "
      + "are the ones no regex can decide, so nothing the deterministic pass flagged can "
      + "be one of yours. You are told the count so you know ground was covered and can "
      + "avoid restating it, and nothing more.",
  };
}

/**
 * Is the deterministic scanner noisy on this draft, or quiet?
 *
 * This is the axis the fixture set is classified on, and it asks only WHETHER the scanner
 * fired - never what it fired on. It used to read `flagged_categories`, which was dropped
 * from the staged report because `leakage` is a category name that asserts authorship. The
 * count answers the same question and carries no accusation, which is the point: a field
 * this classification needed turned out not to need the part that leaked.
 */
export const scanState = (file) =>
  scanReport(file).deterministic_hits > 0 ? "loud" : "quiet";

/* ------------------------------------------------------------------ prepare */

function inputsForFixtures() {
  const manifest = JSON.parse(readFileSync(join(TESTS, "fixtures/pattern/fixtures.json"), "utf8"));
  return manifest.fixtures.map((f) => ({
    name: f.name,
    file: join(TESTS, "fixtures/pattern", f.name, "draft.md"),
  }));
}

/**
 * The corpus sweep.
 *
 * SELECTION IS A WRITTEN RULE EVALUATED HERE, NOT A LIST SOMEONE TYPED. That property is
 * the reason this function exists at all: nobody can be asked which samples were used and
 * answer "the ones that worked". The rule below is longer than the one it replaced and is
 * exactly as mechanical - sort, step, take - applied inside strata instead of across one
 * merged list.
 *
 * WHAT WAS WRONG WITH THE OLD RULE. Two things, and neither was the corpus.
 *
 *   1. FIVE HUMAN DOCUMENTS. `ceil(n/2)` Gutenberg + 1 Wikipedia + 1 EFF drew 5 human
 *      samples at the default. One arguable finding moved the false-positive figure by 20
 *      points, so a real regression and a single defensible call were indistinguishable.
 *      The corpus held ~355 human documents the whole time.
 *
 *   2. ONE `--n` FOR BOTH COLUMNS. The human half bounds FALSE POSITIVES and the AI half
 *      checks the critic is not DECORATIVE. They are different measurements with different
 *      appetites for samples, and a shared knob silently ties them together - which is how
 *      a threshold got set against a human pool sized by what the AI pool needed. `--human`
 *      and `--ai` are separate and there is deliberately no flag that sets both.
 *
 * WHY STRATIFY BY AUTHOR. Every-Nth over a merged Gutenberg listing is every-Nth over
 * whoever has the most files: Chekhov alone is 113 of 293, so a naive sweep is largely a
 * measurement of one translator's letters. The single-author share is therefore split
 * EVENLY ACROSS AUTHORS first, and the every-Nth rule runs inside each author. An author
 * added to the corpus tomorrow enters the sample without anyone editing this file.
 *
 * THE BUCKET SPLIT, and why it is a constant rather than a flag. Half the human pool comes
 * from the single-author essay corpus (seven registers, one identifiable writer each), a
 * quarter from Wikipedia (multi-author, encyclopedic), and the remainder from EFF
 * (multi-author, contemporary professional). A flag here would be one more thing to set
 * differently between two runs that then get compared.
 *
 * Requests larger than a stratum holds are NOT padded from elsewhere. The pool comes back
 * short and the printed line says so, because quietly refilling from Chekhov would restore
 * the exact imbalance the stratification exists to remove.
 */
export function inputsForCorpus({ human, ai }) {
  const C = join(TESTS, "corpus");
  /** Exclusions are counted PER BUCKET, not totalled. The count is a statement about a
   *  denominator, and "15 dropped" across five directories does not tell a reader whether
   *  the AI column lost a quarter of itself or nothing at all. */
  const dropped = new Map();

  /**
   * Tested on the STAGED form: provenance attestations live in frontmatter, which staging
   * strips. Excluded samples are counted, never silently skipped.
   *
   * THE EXCLUSION APPLIES TO THE AI POOL ONLY, and that is a correction.
   *
   * The guard exists so a sample cannot tell the critic the answer. That happens when an
   * AI-labelled Wikipedia page carries the talk-page comment that got it listed - "Complete
   * AI slop" - inside the prose being judged. For those, the phrase IS the label.
   *
   * Human samples are different in kind. Doctorow arguing about LLMs, or an EFF post about
   * chatbot regulation, mentions AI without revealing anything about who wrote it: a human
   * document saying "AI slop" does not thereby look human. Excluding those removed 7 human
   * documents (4 EFF, 3 Doctorow) - and they are the HARDEST human documents in the corpus,
   * the ones where a critic hunting AI-writing patterns is most likely to be fooled by
   * surface vocabulary. Dropping them hid the exact false positive most worth finding.
   *
   * The old comment said "losing four negatives costs nothing". That was true when the human
   * pool was 5 and the worry was the positive column. The human pool is now the measurement,
   * so it is no longer true, and the rule that outlived its reasoning has been narrowed to
   * the case that reasoning actually covered.
   */
  const admissible = (dir, { applyGuard }) => readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()
    .filter((f) => {
      if (!applyGuard) return true;
      const ok = !NAMES_AUTHORSHIP.test(stripFrontmatter(readFileSync(join(dir, f), "utf8")));
      if (!ok) dropped.set(basename(dir), (dropped.get(basename(dir)) ?? 0) + 1);
      return ok;
    });

  /** Sorted, every Nth, take `want`. The whole rule, unchanged from the version this
   *  replaced - it just runs inside a stratum now instead of over everything. */
  const everyNth = (files, want) => {
    if (want <= 0) return [];
    const step = Math.max(1, Math.floor(files.length / want));
    return files.filter((_, i) => i % step === 0).slice(0, want);
  };

  const label = (dir, prefix) => (f) =>
    ({ name: `${prefix}-${basename(f, ".txt")}`, file: join(dir, f) });

  /** The byline, read from frontmatter. Unattributed files form their own stratum rather
   *  than being dropped: a sample with no author is a provenance defect, and folding it
   *  into someone else's share is how the defect stops being visible. */
  const byline = (dir, f) => {
    const m = readFileSync(join(dir, f), "utf8").match(/^author:[ \t]*(.+)$/m);
    return m ? m[1].trim() : "(unattributed)";
  };

  /**
   * Split `want` across the authors present, evenly, with the remainder going to the
   * earliest authors in NAME order. Name order, not sample count: giving the remainder to
   * whoever has the most files is how Chekhov gets back the weight this removes.
   */
  const perAuthor = (dirs, want) => {
    const authors = new Map();
    for (const dir of dirs) {
      for (const f of admissible(dir, { applyGuard: false })) {
        const a = byline(dir, f);
        if (!authors.has(a)) authors.set(a, []);
        authors.get(a).push({ dir, f });
      }
    }
    const names = [...authors.keys()].sort();
    const base = Math.floor(want / names.length);
    const extra = want % names.length;
    const out = [];
    names.forEach((a, i) => {
      const share = base + (i < extra ? 1 : 0);
      const files = authors.get(a).sort((x, y) => x.f.localeCompare(y.f));
      for (const { dir, f } of everyNth(files, share)) out.push(label(dir, "h")(f));
    });
    return out;
  };

  const singleAuthorDirs = [
    join(C, "human-essays", "gutenberg"),
    join(C, "human-essays", "pluralistic"),
  ];
  const wikiDir = join(C, "human");
  const effDir = join(C, "human-professional");

  const wantSingle = Math.ceil(human / 2);
  const wantWiki = Math.floor(human / 4);
  const wantEff = Math.max(0, human - wantSingle - wantWiki);

  const single = perAuthor(singleAuthorDirs, wantSingle);
  const wiki = everyNth(admissible(wikiDir, { applyGuard: false }), wantWiki).map(label(wikiDir, "h"));
  const eff = everyNth(admissible(effDir, { applyGuard: false }), wantEff).map(label(effDir, "h"));
  const aiPicked = everyNth(admissible(join(C, "ai"), { applyGuard: true }), ai).map(label(join(C, "ai"), "x"));

  const humanPicked = [...single, ...wiki, ...eff];
  const authorsDrawn = new Set(single.map((s) => byline(dirname(s.file), basename(s.file))));

  // The report is RETURNED rather than printed, so the rule can be tested without a test
  // suite that prints a sweep log, and so the one place that prints it is the one place
  // that runs a sweep.
  return {
    samples: [...humanPicked, ...aiPicked],
    human: humanPicked,
    ai: aiPicked,
    authors: [...authorsDrawn].sort(),
    report:
      `corpus selection: ${humanPicked.length} human (asked ${human}), `
      + `${aiPicked.length} AI (asked ${ai})\n`
      + `  single-author essays: ${single.length} across ${authorsDrawn.size} authors `
      + `(${[...authorsDrawn].sort().join(", ")})\n`
      + `  Wikipedia (multi-author): ${wiki.length}   EFF (multi-author): ${eff.length}\n`
      + "  excluded because their own body text names AI authorship: "
      + `${[...dropped].sort().map(([d, k]) => `${d} ${k}`).join(", ") || "none"}\n`,
  };
}

/**
 * The patterns this critic owns, read from its own meta.yaml `owns:` block.
 *
 * DERIVED, because the alternative was already wrong. This template used to dump every
 * `not_deterministic` key except `no-voice-shift` and announce them as "the five patterns
 * you own" - so after `absence-of-concrete-detail` was measured out of the critic's scope,
 * the harness kept handing it to the critic as owned while the agent prompt said it was
 * not. Contradictory instructions, in one dispatch, with the harness speaking last.
 *
 * meta.yaml is where the scope decision is recorded, so meta.yaml is what the prompt reads.
 */
function ownedPatterns() {
  const meta = readFileSync(join(REPO, "primitives", "agents", "prose-pattern-critic", "meta.yaml"), "utf8");
  const block = (meta.match(/^\s{2}owns:\n([\s\S]*?)(?=^\s{2}\S|^\S)/m) || [, ""])[1];
  return (block.match(/^\s+- ([a-z][a-z-]+)/gm) || []).map((l) => l.trim().replace(/^- /, ""));
}

export const OWNED = ownedPatterns();

const CATALOG_IDS = catalogIdGuard();

function prepare(set, runId, draws, counts) {
  const picked = set === "corpus" ? inputsForCorpus(counts) : null;
  if (picked) process.stdout.write(picked.report);
  const inputs = picked ? picked.samples : inputsForFixtures();
  const runDir = join(TESTS, "runs", runId);
  const stageDir = join(runDir, "staged");
  const promptDir = join(runDir, "prompts");
  mkdirSync(stageDir, { recursive: true });
  mkdirSync(promptDir, { recursive: true });

  const ids = caseIds(inputs.map((i) => i.name));
  const agentBody = readFileSync(AGENT, "utf8").split(/^---$/m).slice(2).join("---").trim();
  const notDeterministic = JSON.parse(readFileSync(CATALOG, "utf8")).not_deterministic;
  const manifest = { run: runId, set, draws, prompt_sha: sha(agentBody), cases: [] };

  for (const input of inputs) {
    const id = ids.get(input.name);
    const draft = stripFrontmatter(readFileSync(input.file, "utf8"));
    const draftPath = join(stageDir, `${id}-draft.md`);
    writeFileSync(draftPath, draft);

    const report = scanReport(draftPath);
    const reportPath = join(stageDir, `${id}-scan.json`);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    // BACKSTOP, NOT THE MECHANISM. The report is built from an allowlist above; this
    // catches a staged byte that got through anyway, and it aborts BEFORE any agent is
    // dispatched, because a run discovered to be contaminated afterwards has already
    // spent the dispatches and produced a number someone will quote.
    for (const staged of [draft, readFileSync(reportPath, "utf8")]) {
      for (const leak of [...LEAKS, NAMES_AUTHORSHIP, CATALOG_IDS]) {
        if (leak.test(staged)) {
          const hit = staged.match(leak)?.[0];
          die(`ABORT: staged input for ${id} matches leak guard ${leak}`
            + `${hit ? ` (matched ${JSON.stringify(hit)})` : ""} - fix staging, do not dispatch`);
        }
      }
    }

    const prompt = [
      agentBody,
      "",
      "---",
      "",
      "## This case",
      "",
      `The draft is \`staged/${id}-draft.md\`. Read it.`,
      `The \`tell-scan\` report for it is \`staged/${id}-scan.json\`. Read that too, and remember`,
      "that everything in it is the scanner's finding and none of it is yours.",
      "",
      `The ${OWNED.length} patterns you own, verbatim from the catalog:`,
      "",
      ...OWNED.map((k) => `- \`${k}\` \u2014 ${notDeterministic[k]}`),
      "",
      "Line numbers refer to the staged draft as given. Follow your output contract exactly,",
      "and end with the one-line verdict on its own line.",
      "",
    ].join("\n");

    for (let d = 1; d <= draws; d += 1) {
      writeFileSync(join(promptDir, `${id}-d${d}.md`), prompt);
    }
    manifest.cases.push({
      id, fixture: input.name, draws,
      draft_sha: sha(draft), scan_sha: sha(readFileSync(reportPath, "utf8")),
    });
  }

  writeFileSync(join(runDir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `prepared ${inputs.length} cases x ${draws} draws = ${inputs.length * draws} prompts\n` +
    `  ${resolve(promptDir)}\n` +
    "Dispatch one clean-context agent per prompt. Write each report verbatim to\n" +
    `  ${resolve(runDir, "raw")}/<prompt basename>.md\n`);
}

/* ------------------------------------------------------------------ collect */

function deriveVerdict(body) {
  const tail = body.trimEnd().split("\n").slice(-6).join("\n");
  const hits = [...tail.matchAll(new RegExp(`\\b(${VOCAB.join("|")})\\b`, "g"))];
  if (!hits.length) return null;
  return hits[hits.length - 1][1];
}

function collect(runDir) {
  const dir = resolve(runDir);
  const rawDir = join(dir, "raw");
  if (!existsSync(rawDir)) die(`no raw/ under ${dir}`);
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  const reviewPath = join(dir, "review.json");
  const prior = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, "utf8")) : { cases: {} };

  const review = { run: manifest.run, _contract: CONTRACT, cases: {} };
  const rows = [];
  for (const file of readdirSync(rawDir).filter((f) => f.endsWith(".md")).sort()) {
    const key = basename(file, ".md");
    const body = readFileSync(join(rawDir, file), "utf8");
    const verdict = deriveVerdict(body);
    if (!verdict) die(`${file}: no verdict in the last lines - the critic did not end with one`);
    const findings = (body.match(FINDING) || []).length;
    if (verdict === "REVISE" && findings === 0) {
      die(`${file}: REVISE with zero **PATTERN** blocks - the transcript contradicts itself`);
    }
    const p = prior.cases?.[key] ?? {};
    review.cases[key] = Object.fromEntries(
      CONTRACT.map((c) => [c, typeof p[c] === "number" ? p[c] : null]));
    review.cases[key].verdict = verdict;
    review.cases[key].findings = findings;
    review.cases[key].patterns_named = [...new Set(
      (body.match(/^[ \t]*(?:[-*+][ \t]+)?\**PATTERN\**[ \t]*:\s*`?[a-z-]+`?/gm) || [])
        .map((m) => m.replace(/.*?:\s*`?/, "").replace(/`.*/, "").trim()))];
    rows.push({ key, verdict, findings });
  }
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);

  const missing = Object.entries(review.cases)
    .filter(([, v]) => CONTRACT.some((c) => v[c] === null)).map(([k]) => k);
  if (missing.length) {
    process.stdout.write(
      `wrote ${reviewPath}\n${rows.length} transcripts read.\n\n` +
      `${missing.length} case(s) still have a null contract count. A human reads the quoted\n` +
      "findings and fills them in; nothing here may default them to 0.\n");
    process.exit(1);
  }
  verify(dir);
}

/* ------------------------------------------------------------------- verify */

function verify(runDir) {
  const dir = resolve(runDir);
  const review = JSON.parse(readFileSync(join(dir, "review.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"));
  const byCase = new Map(manifest.cases.map((c) => [c.id, c]));
  const fixtures = manifest.set === "fixtures"
    ? JSON.parse(readFileSync(join(TESTS, "fixtures/pattern/fixtures.json"), "utf8")).fixtures
    : [];
  const expected = new Map(fixtures.map((f) => [f.name, f]));

  // Group draws by case so a split can be reported as a split.
  const groups = new Map();
  for (const [key, v] of Object.entries(review.cases)) {
    const id = key.replace(/-d\d+$/, "");
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(v);
  }

  let matched = 0; let scored = 0; let split = 0;
  const lines = [];
  for (const [id, draws] of [...groups].sort()) {
    const meta = byCase.get(id);
    const verdicts = draws.map((d) => d.verdict);
    const tally = verdicts.reduce((a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {});
    const majority = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (Object.keys(tally).length > 1) split += 1;
    const exp = expected.get(meta?.fixture);
    let mark = "";
    if (exp) {
      scored += 1;
      if (majority[0] === exp.expect) { matched += 1; mark = "  ok"; } else { mark = "  MISS"; }
    }
    lines.push(`  ${id}  ${meta?.fixture ?? "?"}  ${majority[0]} ${majority[1]}/${verdicts.length}` +
      `${exp ? `  expected ${exp.expect}` : ""}${mark}`);
  }

  const all = Object.values(review.cases);
  const totals = Object.fromEntries(CONTRACT.map((c) =>
    [c, all.reduce((n, v) => n + (v[c] ?? 0), 0)]));

  process.stdout.write(`\n${lines.join("\n")}\n\n`);
  if (scored) {
    process.stdout.write(`    majority verdicts matching the fixture's expectation:  ${matched} of ${scored}\n`);
  }
  process.stdout.write(
    `    cases whose draws did not agree with each other:       ${split} of ${groups.size}\n` +
    `    findings naming no catalogued pattern (uncatalogued):  ${totals.uncatalogued}   <- must be 0\n` +
    `    claims about machine authorship:                       ${totals.authorship_claims}   <- must be 0\n` +
    `    findings restating a deterministic scan hit:           ${totals.echoes_scan}   <- must be 0\n\n` +
    "    echo baseline: NOT APPLICABLE. The scanner emits no verdict on any pattern this\n" +
    "    critic owns, so there is no verdict to parrot and no rate to beat. See\n" +
    "    critic-harness.md; do not substitute a number here to fill the shape.\n");

  const violated = CONTRACT.filter((c) => totals[c] > 0);
  if (violated.length) {
    process.stderr.write(`\nCONTRACT VIOLATION: ${violated.join(", ")}\n`);
    process.exit(1);
  }
}

/* --------------------------------------------------------------------- main */

// Guarded, because `selftest.mjs` imports `scanState` from here to re-derive each
// fixture's class. An unguarded main block would make importing this file print a usage
// message and exit 2, which is a test suite failing for a reason that has nothing to do
// with what it tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (name, dflt) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : Number(rest[i + 1]);
  };
  // `--n` is refused rather than aliased. It used to size both columns at once, and a
  // stale command line that still carries it would otherwise keep working while measuring
  // something different from what its author expects - which is the failure this split
  // exists to end. Refusing costs one edit and names the replacement.
  if (rest.includes("--n")) {
    die("--n is gone: it sized the human and AI columns together, which is how a "
      + "false-positive threshold got set against a pool sized for the other column.\n"
      + "Use --human <k> --ai <k>. They measure different things and are set separately.");
  }
  if (cmd === "prepare") {
    prepare(rest[0], rest[1], flag("draws", 1), { human: flag("human", 20), ai: flag("ai", 12) });
  } else if (cmd === "collect") collect(rest[0]);
  else if (cmd === "verify") verify(rest[0]);
  else die("usage: pattern-harness.mjs prepare <fixtures|corpus> <run-id> [--draws k]\n" +
           "                                  [--human k] [--ai k]   (corpus only)\n" +
           "       pattern-harness.mjs collect|verify <run-dir>");
}
