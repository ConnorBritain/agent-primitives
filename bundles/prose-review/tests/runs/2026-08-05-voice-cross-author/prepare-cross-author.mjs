#!/usr/bin/env node
/**
 * prepare-cross-author — stage the cross-author substitution matrix for prose-voice-critic.
 *
 *   node runs/2026-08-05-voice-cross-author/prepare-cross-author.mjs [--plan]
 *
 * WHY THIS FILE EXISTS AND IS NOT `run-harness.mjs prepare voice`.
 * `voiceFixtures()` in run-harness.mjs is hardcoded to
 * `prose-tell-scan/tests/corpus/{human,ai}` — the multi-editor Wikipedia corpus and the
 * AI-labelled set. It has no way to express "corpus of author X, draft by author Y", which
 * is the whole of this run. run-harness.mjs is owned by another track this wave and may not
 * be edited here, so the staging is reimplemented, and the two integrity primitives that
 * matter — `stripFrontmatter` and `leakCheck` — are IMPORTED from it rather than copied, so
 * a run staged here cannot be laxer than one staged there.
 *
 * The prompt text is duplicated from `buildPrompt`/`voiceTask`, which are not exported. That
 * duplication is a real cost and it is why `assert-prompt-shape.mjs` sits next to this file:
 * it re-derives the harness's own prompt for a voice case and diffs the invariant part.
 *
 * WHAT IS BEING MEASURED. The published voice run is leave-one-out over twelve Wikipedia
 * articles: it bounds a FALSE-POSITIVE rate and can produce no true positives, because there
 * is no ground truth about whose voice a many-editor article is in. Cross-author
 * substitution has ground truth. Corpus of X + a held-out sample of X must be CLEAN; corpus
 * of X + a sample by Y must be REVISE, and "by Y" is a fact about provenance, not a
 * judgement.
 *
 * THE CONFOUND, WHICH IS THE WHOLE DIFFICULTY. Bacon and O. Henry differ in author, in
 * register and in three centuries. A REVISE there may be detecting seventeenth-century
 * aphoristic essay vs. American magazine short story and say nothing about persons. So every
 * ordered pair carries a `tier` naming which dimensions vary, and the run reports the tiers
 * separately. Pooling them would produce one flattering number that answers no question.
 *
 *   A1  author + work-cohesion — same register, same decade      (Chopin <-> O. Henry)
 *   A2  author + era           — same register, same cohesion    (Bacon <-> Chesterton)
 *   B   author + register      — everything else
 *
 * NEITHER A-TIER IS CLEAN, AND THEY ARE DIRTY IN DIFFERENT DIRECTIONS. That is the argument
 * for running both rather than picking one.
 *
 *   A1 matches register and decade — 1899 and 1906 American fiction — but Kate Chopin's 38
 *   samples are 38 consecutive chapters of ONE novel, while O. Henry's 25 are independent
 *   stories. So a Chopin corpus is unusually cohesive: shared characters, one setting, one
 *   narrative arc. Both directions of A1 are therefore easier than a person-level test
 *   should be, and a REVISE there is partly explained by "different book".
 *
 *   A2 has no such problem — Bacon's essays and Chesterton's are each a set of independent
 *   short pieces on unrelated subjects, so subject-continuity cannot carry a verdict. What
 *   it has instead is 284 years, which is a register difference by another name.
 *
 * A1 has exactly two ordered pairs and A2 exactly two. That is not a sampling choice; it is
 * the number of register-matched author pairs this corpus contains, and it is the ceiling on
 * how strong a claim this run can make. If A1 and A2 agree, the explanation the two share is
 * the author, because their other confounds do not overlap. If they disagree, the run has
 * found which confound is doing the work, which is also worth knowing and is the reason
 * neither tier may be pooled into the other.
 *
 * CONTROLS.
 *   - The DRAFT IS HELD CONSTANT ACROSS A ROW. Each author contributes exactly one probe
 *     sample, and that same probe is the draft for its own negative and for every positive
 *     where it is the intruder. So a verdict that changes between two cases changes because
 *     the CORPUS changed. Without this, "Chekhov's probe is just a strange letter" is an
 *     unfalsifiable alternative explanation for every finding in its column.
 *   - PROBE LENGTH IS MATCHED. The probe is the sample nearest PROBE_TARGET_WORDS among the
 *     author's samples. A 400-word letter offers less to find than a 2,500-word blog post,
 *     so unmatched lengths would make the verdict partly a function of draft size.
 *   - CORPUS SIZE IS FIXED at CORPUS_SAMPLES, spread evenly across each author's sorted
 *     sample list rather than taken from the front. Chekhov's files are chronological; the
 *     first ten are all one year of one young man's life, which is a narrower voice than
 *     "Chekhov". Word counts still differ per author and are printed, because they cannot be
 *     equalised without truncating prose, and truncated prose is not the author's.
 *
 * REPLICATION. P12: two dispatches of a byte-identical prompt returned different verdicts on
 * the same span. So every cell carrying a headline number is dispatched k=3 times from ONE
 * prompt file, and disagreement is reported as a finding rather than resolved. Tier-B cells
 * are single draws and are labelled as such in the run log; they are breadth, not evidence
 * about any one pair.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { leakCheck, stripFrontmatter } from "../../run-harness.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS = resolve(HERE, "..", "..");
const REPO = resolve(TESTS, "..", "..", "..");
const CORPUS = join(REPO, "bundles", "prose-tell-scan", "tests", "corpus");

const CORPUS_SAMPLES = 10;
const PROBE_TARGET_WORDS = 1200;
const K_HEADLINE = 3;

/**
 * `register` and `era` are the confound axes. They are asserted from the source, not
 * measured, and that is a limitation of this design rather than a hidden assumption:
 * "Chesterton and Bacon are both argumentative essays" is a judgement a reader may reject,
 * and if they reject it the A2 row is reclassified to B, not silently kept.
 */
const AUTHORS = [
  { id: "bacon",       dir: "human-essays/gutenberg",   prefix: "bacon-",      register: "essay",          era: "1625",  cohesion: "independent" },
  { id: "chesterton",  dir: "human-essays/gutenberg",   prefix: "chesterton-", register: "essay",          era: "1909",  cohesion: "independent" },
  { id: "chopin",      dir: "human-essays/gutenberg",   prefix: "chopin-",     register: "narration",      era: "1899",  cohesion: "one-novel" },
  { id: "ohenry",      dir: "human-essays/gutenberg",   prefix: "ohenry-",     register: "narration",      era: "1906",  cohesion: "independent" },
  { id: "chekhov",     dir: "human-essays/gutenberg",   prefix: "chekhov-",    register: "correspondence", era: "1890s", cohesion: "independent" },
  { id: "doctorow",    dir: "human-essays/pluralistic", prefix: "",            register: "blog",           era: "2026",  cohesion: "independent" },
];

/** Same register and decade; work-cohesion differs (Chopin is one novel). */
const A1 = [["chopin", "ohenry"], ["ohenry", "chopin"]];
/** Same register and cohesion; 284 years apart. */
const A2 = [["bacon", "chesterton"], ["chesterton", "bacon"]];

const sha = (s) => createHash("sha256").update(s).digest("hex");
const words = (s) => s.split(/\s+/).filter(Boolean).length;

function samplesOf(a) {
  return readdirSync(join(CORPUS, a.dir))
    .filter((f) => f.endsWith(".txt") && f.startsWith(a.prefix))
    .sort()
    .map((f) => {
      const body = stripFrontmatter(readFileSync(join(CORPUS, a.dir, f), "utf8"));
      return { file: f, path: join(CORPUS, a.dir, f), body, words: words(body) };
    });
}

/** Evenly spaced over the sorted list, so a chronological filename order does not collapse
 * the corpus onto one period of the author's life. */
function spread(list, n) {
  if (list.length <= n) return list;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Map(out.map((s) => [s.file, s])).values()];
}

function selectAuthor(a) {
  const all = samplesOf(a);
  const probe = [...all].sort(
    (x, y) =>
      Math.abs(x.words - PROBE_TARGET_WORDS) - Math.abs(y.words - PROBE_TARGET_WORDS)
      || (x.file < y.file ? -1 : 1),
  )[0];
  const corpus = spread(all.filter((s) => s.file !== probe.file), CORPUS_SAMPLES);
  return { ...a, all, probe, corpus };
}

const sel = Object.fromEntries(AUTHORS.map((a) => [a.id, selectAuthor(a)]));

// ---------------------------------------------------------------------------
// the matrix
// ---------------------------------------------------------------------------

const inList = (list, x, y) => list.some(([p, q]) => p === x && q === y);

const cells = [];
for (const c of AUTHORS) {
  cells.push({ name: `n-${c.id}`, kind: "negative", corpus: c.id, draft: c.id, tier: "N", k: K_HEADLINE });
}
for (const c of AUTHORS) {
  for (const d of AUTHORS) {
    if (c.id === d.id) continue;
    const tier = inList(A1, c.id, d.id) ? "A1" : inList(A2, c.id, d.id) ? "A2" : "B";
    cells.push({
      name: `p-${c.id}-x-${d.id}`,
      kind: "positive",
      corpus: c.id,
      draft: d.id,
      tier,
      k: tier === "B" ? 1 : K_HEADLINE,
    });
  }
}

// ---------------------------------------------------------------------------
// prompt — shape duplicated from run-harness.mjs buildPrompt/voiceTask
// ---------------------------------------------------------------------------

const VOICE_TASK = [
  "`corpus/` holds samples of one author's writing. `draft.txt` is a draft that is",
  "supposed to sound like them. Report on the draft, following your instructions",
  "exactly, including the output contract and the closing one-line verdict.",
  "",
  "No voice card is supplied. The corpus is present, so this is not a stop condition.",
  "No deterministic rhythm scan is supplied; say so rather than guessing at category 4.",
].join("\n");

function buildPrompt({ caseId, agentPath, inputs, task }) {
  return [
    `# Critic run — ${caseId}`,
    "",
    `Your instructions are the file below, and they are the whole of your brief. If they`,
    `were not supplied to you as a system prompt, read it first:`,
    "",
    `    ${agentPath}`,
    "",
    task,
    "",
    "## Integrity constraints — these are the point of the harness, not boilerplate",
    "",
    "You may read exactly these files, and they are copies staged for this run:",
    "",
    ...inputs.map((i) => `    ${i}`),
    "",
    "You may not read, list, glob, grep or search anything else. In particular: no fixture",
    "manifest, no other case's directory, no previous run under `runs/`, no test file, and",
    "no corpus these copies were made from. Do not try to work out which case this is.",
    "",
    "The expected result for this case exists in this repository. Reading it would void the",
    "run — an earlier sweep was discarded because an expected verdict had leaked into a file",
    "the critic reads. If you find a verdict, an expectation, a class label, a provenance",
    "label or an `expect:` key inside the files above, STOP and report THAT instead of a",
    "verdict. It is a harness defect and it is worth more than the run.",
    "",
    "Line numbers you cite refer to the files exactly as given above.",
    "",
    "Output your report and nothing else: no preamble, no summary of these instructions,",
    "and no commentary after the verdict line.",
  ].join("\n");
}

// ---------------------------------------------------------------------------

function plan() {
  process.stdout.write("\n  selection (corpus samples fixed at "
    + `${CORPUS_SAMPLES}, probe nearest ${PROBE_TARGET_WORDS} words)\n\n`);
  process.stdout.write("    author      register        era    cohesion      avail  corpus words   probe words\n");
  for (const a of AUTHORS) {
    const s = sel[a.id];
    process.stdout.write(
      `    ${a.id.padEnd(12)}${a.register.padEnd(16)}${a.era.padEnd(7)}${a.cohesion.padEnd(14)}`
      + `${String(s.all.length).padStart(5)}${String(s.corpus.reduce((t, x) => t + x.words, 0)).padStart(13)}`
      + `${String(s.probe.words).padStart(13)}\n`,
    );
  }
  const by = (t) => cells.filter((c) => c.tier === t);
  process.stdout.write("\n    tier   what varies                       cells  k  dispatches\n");
  for (const [t, what] of [["N", "nothing (same author, held out)"], ["A1", "author + work-cohesion"],
                           ["A2", "author + era"], ["B", "author + register"]]) {
    const g = by(t);
    process.stdout.write(
      `    ${t.padEnd(7)}${what.padEnd(34)}${String(g.length).padStart(5)}`
      + `${String(g[0]?.k ?? 0).padStart(3)}${String(g.reduce((s, c) => s + c.k, 0)).padStart(12)}\n`,
    );
  }
  process.stdout.write(`\n    total dispatches: ${cells.reduce((s, c) => s + c.k, 0)}`
    + ` over ${cells.length} distinct prompts\n\n`);
}

function stage() {
  const runDir = HERE;
  const agentRel = "primitives/agents/prose-voice-critic/agent.md";
  const agentBody = stripFrontmatter(readFileSync(join(REPO, agentRel), "utf8"));
  rmSync(join(runDir, "inputs"), { recursive: true, force: true });
  rmSync(join(runDir, "prompts"), { recursive: true, force: true });
  mkdirSync(join(runDir, "prompts"), { recursive: true });
  writeFileSync(join(runDir, "prompts", "agent-prompt.md"), agentBody);

  // Case ids are ordered by a hash of the cell name so the numbering carries neither the
  // kind nor the tier. `case-01..06 are the negatives` would be the answer in the case id.
  const ordered = [...cells].sort((a, b) => (sha(a.name) < sha(b.name) ? -1 : 1));

  const leaks = [];
  const entries = [];
  ordered.forEach((cell, i) => {
    const caseId = `case-${String(i + 1).padStart(2, "0")}`;
    const caseDir = join(runDir, "inputs", caseId);
    // Staged corpus filenames are `sample-NN.txt`, NOT the harness's `corpus/${original}`.
    // The originals are `ohenry-the-gift-of-the-magi.txt` and
    // `chopin-005-the-awakening-chapter-v.txt`, and both give away more than a name. The
    // first invites the critic to answer from having read O. Henry rather than from the ten
    // samples in front of it, which is the analysis being measured. The second is worse: a
    // corpus visibly made of chapters 1, 5, 9 ... of one novel tells the critic that a
    // same-author draft is a missing chapter, and it can return CLEAN by arithmetic. The
    // mapping lives in MANIFEST.json, which the critic never sees.
    const inputs = [
      ...sel[cell.corpus].corpus.map((s, n) => ({
        as: `corpus/sample-${String(n + 1).padStart(2, "0")}.txt`,
        from: s.path,
        text: s.body,
      })),
      { as: "draft.txt", from: sel[cell.draft].probe.path, text: sel[cell.draft].probe.body },
    ];
    for (const inp of inputs) {
      const leak = leakCheck(`${cell.name}/${inp.as}`, inp.text);
      if (leak) leaks.push(leak);
      mkdirSync(dirname(join(caseDir, inp.as)), { recursive: true });
      writeFileSync(join(caseDir, inp.as), inp.text);
    }
    writeFileSync(
      join(runDir, "prompts", `${caseId}.md`),
      `${buildPrompt({
        caseId,
        agentPath: relative(REPO, join(runDir, "prompts", "agent-prompt.md")),
        inputs: inputs.map((inp) => relative(REPO, join(caseDir, inp.as))),
        task: VOICE_TASK,
      })}\n`,
    );
    entries.push({
      case: caseId,
      fixture: cell.name,
      kind: cell.kind,
      tier: cell.tier,
      corpus_author: cell.corpus,
      draft_author: cell.draft,
      draws: cell.k,
      transcripts: Array.from({ length: cell.k }, (_, r) => `${cell.name}-r${r + 1}`),
      corpus_words: sel[cell.corpus].corpus.reduce((t, x) => t + x.words, 0),
      draft_words: sel[cell.draft].probe.words,
      inputs: inputs.map((inp) => ({ as: inp.as, from: relative(REPO, inp.from), sha256: sha(inp.text) })),
    });
  });

  if (leaks.length) {
    process.stderr.write("\n  prepare ABORTED — the answer is visible to the critic:\n\n");
    for (const l of leaks) process.stderr.write(`    ${l}\n`);
    process.stderr.write("\n  Fix the corpus, not this check.\n\n");
    process.exit(1);
  }

  writeFileSync(join(runDir, "MANIFEST.json"), `${JSON.stringify({
    critic: "voice",
    run_id: "2026-08-05-voice-cross-author",
    prepared: "2026-08-05",
    design: "cross-author substitution; see prepare-cross-author.mjs header",
    agent_prompt: "primitives/agents/prose-voice-critic/agent.md",
    agent_sha256: sha(agentBody),
    corpus_samples_per_author: CORPUS_SAMPLES,
    probe_target_words: PROBE_TARGET_WORDS,
    k_headline: K_HEADLINE,
    authors: AUTHORS.map((a) => ({
      id: a.id, register: a.register, era: a.era, cohesion: a.cohesion,
      samples_available: sel[a.id].all.length,
      corpus_files: sel[a.id].corpus.map((s) => s.file),
      corpus_words: sel[a.id].corpus.reduce((t, x) => t + x.words, 0),
      probe_file: sel[a.id].probe.file,
      probe_words: sel[a.id].probe.words,
    })),
    total_dispatches: cells.reduce((s, c) => s + c.k, 0),
    cases: entries,
  }, null, 2)}\n`);

  plan();
  process.stdout.write(`  staged ${entries.length} prompts in ${relative(REPO, join(runDir, "prompts"))}\n`);
  process.stdout.write(`  MANIFEST.json lists which transcript each draw writes.\n\n`);
}

if (process.argv.includes("--plan")) plan();
else stage();
