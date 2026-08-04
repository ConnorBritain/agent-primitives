#!/usr/bin/env node
/**
 * tell-scan — Phase 0 (intake) and Phase 1 (deterministic scan) of the
 * prose review protocol.
 *
 *   node tell-scan.mjs draft.md
 *   node tell-scan.mjs draft.md --profile essay
 *   node tell-scan.mjs revised.md --baseline original.md    # did the revision work?
 *   node tell-scan.mjs draft.md --json
 *   node tell-scan.mjs --list-profiles
 *
 * No model calls, ever. This pass exists precisely because models cannot audit
 * their own frequency tics: asked to self-assess, a model finds the tells it
 * remembers writing, not the ones it repeated eight times. Counting is a job for
 * a script, and everything a script can decide is decided here so the LLM passes
 * downstream are left with only the judgement calls.
 *
 * Report-only by construction. This tool never writes to the document.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { maskNonProse, normaliseApostrophes, paragraphs, words } from "./lib/text.mjs";
import { scanCatalog, scanFormatting } from "./lib/scan.mjs";
import { cadenceMetrics } from "./lib/cadence.mjs";
import { counterEvidence, resolveAge, readingOverride } from "./lib/counter-evidence.mjs";
import { checkISBNs, checkCitations, measureStructure } from "./lib/artifacts.mjs";
import {
  loadConfig, loadProfile, profileSearchPath, resolveProfile, listProfiles, BASE_PROFILE,
} from "./lib/profile.mjs";
import { evaluateFindings, evaluateCadence, summarise, profileFit } from "./lib/evaluate.mjs";
import { renderReport, renderComparison } from "./lib/report.mjs";

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARKDOWN_EXT = new Set([".md", ".markdown", ".mdx", ".mdown"]);

const USAGE = `
tell-scan — deterministic writing-tell and cadence scan (report-only)

  node tell-scan.mjs <file...> [options]

Options
  --profile <name>      Force a register profile. Otherwise resolved per file:
                        frontmatter → path rule → default → _base.
  --baseline <file>     Compare against a prior version; reports before/after
                        densities and flags any newly introduced tell.
  --allow <a,b,c>       Extra allowlist terms for this run.
  --profiles-dir <dir>  Profile directory to search before the project's and
                        the bundle's.
  --project <dir>       Project root (for .claude/humanizer.json). Default: cwd.
  --json                Machine-readable output.
  --all                 List every below-threshold hit, not just the first 12.
  --no-examples         Omit matched-text examples.
  --plain               Treat input as plain text (skip markdown masking).
  --markdown            Force markdown masking.
  --artifacts-only      Tier A only: leaked citation markup, chatbot register,
                        knowledge-cutoff hedges, unreplaced placeholders. Skips
                        every style judgement. Use this when the style catalog's
                        norms are not your norms — see "Dialect and register" in
                        the README. Cadence is still measured, never flagged.
  --list-profiles       Show discoverable profiles and exit.
  -h, --help            This text.

Exit status is 0 whenever the scan ran. This is a diagnostic, not a gate.
`;

function parseArgs(argv) {
  const opts = {
    files: [], profile: null, baseline: null, allow: [], profilesDir: null,
    project: process.cwd(), json: false, all: false, examples: true,
    markdown: null, listProfiles: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--profile": opts.profile = next(); break;
      case "--baseline": opts.baseline = next(); break;
      case "--allow": opts.allow.push(...next().split(",").map((s) => s.trim()).filter(Boolean)); break;
      case "--profiles-dir": opts.profilesDir = next(); break;
      case "--project": opts.project = resolve(next()); break;
      case "--json": opts.json = true; break;
      case "--all": opts.all = true; break;
      case "--no-examples": opts.examples = false; break;
      case "--plain": opts.markdown = false; break;
      case "--markdown": opts.markdown = true; break;
      case "--list-profiles": opts.listProfiles = true; break;
      case "--artifacts-only": opts.artifactsOnly = true; break;
      case "-h": case "--help": opts.help = true; break;
      default:
        if (a.startsWith("-")) throw new Error(`unknown option: ${a}`);
        opts.files.push(a);
    }
  }
  return opts;
}

/** Phase 0 + Phase 1 for a single document. */

/**
 * Where a document's date can come from, cheapest first.
 *
 * Git is asked for the commit that ADDED the file, not the last one that touched
 * it: a reformatting commit in 2026 says nothing about when the prose was
 * written. Failures are silent by design — not being in a repository is normal,
 * and a scanner that errored on it would be useless outside one.
 */
function fileAge(file, raw) {
  // Isolate the frontmatter block FIRST, then look inside it. The original
  // pattern only anchored on the opening `---` and never required the date to
  // appear before the closing one, so an ordinary body sentence — "the filing
  // date: 2015-06-01 was noted" — was read as frontmatter and, at the time,
  // silenced the whole reading. Non-adversarial prose defeating the tool's one
  // dispositive mechanism.
  const block = raw.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const fm = block ? block[1].match(/^\s*date:\s*["']?(\d{4}-\d{2}-\d{2})/m) : null;
  let gitFirstSeen = null;
  try {
    const out = execFileSync(
      // Absolute pathspec. `cwd` is the file's own directory, so a relative one
      // resolves against it and git silently matches nothing — returning empty
      // rather than erroring, which is indistinguishable from "not tracked".
      "git", ["log", "--diff-filter=A", "--follow", "--format=%aI", "--", resolve(file)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], cwd: dirname(resolve(file)) },
    ).trim().split("\n").filter(Boolean).pop();
    if (out) gitFirstSeen = out.slice(0, 10);
  } catch (err) {
    // Only swallow the failures that are NORMAL: no repository, no git binary,
    // a file git does not track. A broad `catch {}` here previously hid a
    // ReferenceError — `execFileSync` was never imported — so the git path threw
    // on every call for the whole life of the feature and silently degraded to
    // the weaker sources. The bug was invisible precisely because the catch was
    // doing its job too well. Anything that is not an expected environment
    // failure now propagates.
    const expected = err?.code === "ENOENT" || typeof err?.status === "number";
    if (!expected) throw err;
  }
  let mtime = null;
  try { mtime = statSync(file).mtime.toISOString().slice(0, 10); } catch { /* ignore */ }
  return { frontmatterDate: fm?.[1] ?? null, gitFirstSeen, mtime };
}

function analyse(file, opts, config, searchPath) {
  const raw = readFileSync(file, "utf8");

  // ---- Phase 0: intake ------------------------------------------------------
  const resolved = resolveProfile({
    file, text: raw, explicit: opts.profile, config, searchPath, projectRoot: opts.project,
  });
  const profile = loadProfile(resolved.name, searchPath, { extraAllow: opts.allow });

  const isMarkdown = opts.markdown ?? MARKDOWN_EXT.has(extname(file).toLowerCase());

  // ---- Phase 1: deterministic scan -----------------------------------------
  const { text, masked } = maskNonProse(raw, { markdown: isMarkdown });
  const paras = paragraphs(text, { markdown: isMarkdown });
  const wordCount = words(text).length;

  if (wordCount === 0) {
    throw new Error(`${file}: no prose found (empty, or entirely code/frontmatter)`);
  }

  // Artifacts-only narrows the catalog to Tier A before scanning, and drops the
  // cadence bands with it. Everything removed is a style judgement, and style
  // judgements are the part that encodes one set of writing norms as correct.
  const catalog = opts.artifactsOnly
    ? { ...profile.catalog, entries: profile.catalog.entries.filter((e) => e.tier === "A") }
    : profile.catalog;

  // Match against apostrophe-folded text, quote from the text as written. The
  // fold is offset-preserving, so `display` lines up exactly. Formatting still
  // sees the original: it counts curly vs straight quotes, and folding first
  // would zero out that measurement.
  const { findings: rawFindings, suppressed } = scanCatalog(
    normaliseApostrophes(text), catalog, profile.allow, { display: text },
  );
  const cadence = cadenceMetrics(text, paras);
  const formatting = { ...scanFormatting(text, paras, wordCount), structure: measureStructure(text) };

  // Identifier and citation artifacts. These run on RAW text, not masked: the
  // masker blanks URLs before the catalog sees them, so `utm_source` would be
  // gone by then. They are Tier A by the strict test — no human writes a failed
  // ISBN checksum or a chatbot-tagged citation URL in any register.
  // One finding per entry with a count, matching every other entry's shape. An
  // earlier version emitted one finding PER OCCURRENCE, so a document with eight
  // tagged citations produced eight identical findings and the report read as
  // eight separate problems.
  const artifactFindings = [
    ["invalid-identifier", "identifier that fails its own checksum",
      checkISBNs(raw).map((h) => ({ example: h.isbn, why: h.reason }))],
    ["chatbot-sourced-citation", "citation URL tagged by a chat product",
      checkCitations(raw).map((h) => ({ example: h.marker, why: h.reason }))],
  ]
    .filter(([, , hits]) => hits.length > 0)
    .map(([id, label, hits]) => ({
      id,
      label,
      category: "leakage",
      tier: "A",
      severity: 3,
      confidence: "definitive",
      always_flag: true,
      count: hits.length,
      per_1k: Math.round((1000 * hits.length / (wordCount || 1)) * 100) / 100,
      flagged: true,
      held_by_floor: false,
      note: hits[0].why,
      examples: [...new Set(hits.map((h) => h.example))].slice(0, 4),
      contexts: [...new Set(hits.map((h) => h.example))].slice(0, 4)
        .map((e) => ({ line: null, text: `${e} — ${hits[0].why}` })),
    }));

  const findings = [...evaluateFindings(rawFindings, profile.thresholds), ...artifactFindings];
  const cadenceChecks = opts.artifactsOnly
    ? []
    : evaluateCadence(cadence, profile.thresholds);
  const fit = profileFit(cadence, profile.thresholds);
  const summary = summarise({ findings, cadenceChecks, thresholds: profile.thresholds, wordCount });

  // The other half of the source page: signs of HUMAN writing. Never netted
  // against the findings above — see lib/counter-evidence.mjs for why that rule
  // is absolute, and for the measurements that decided which metrics ship.
  // `--artifacts-only` promises in its own help text to skip every style
  // judgement, and the syntax rates are style. Age is not — it is provenance, a
  // fact about the file rather than an opinion about the prose — so it stays.
  const counter = counterEvidence(
    text, wordCount, resolveAge(fileAge(file, raw)), { syntax: !opts.artifactsOnly },
  );
  const override = readingOverride(counter);
  if (override) {
    // Provable age outranks every style observation. A 2019 document with
    // elevated `delve` density has an interesting vocabulary, not a provenance
    // problem, and the reading should not imply otherwise.
    summary.reading = `${override} ${summary.reading}`;
    summary.dispositive_counter_evidence = true;
  }

  return {
    file,
    profile: {
      name: resolved.name,
      how: resolved.how,
      fellBack: resolved.fellBack,
      requested: resolved.requested,
      dir: profile.dir,
      medium: profile.meta.medium || null,
      thresholds: profile.thresholds,
      // Emitted because density findings are only comparable WITHIN one catalog
      // version: adding or retuning an entry silently changes what a per-1k
      // number means. Anything that stores these bands — a voice lock, a derived
      // threshold, a baseline comparison — has to record this alongside them, and
      // it cannot do that if the scanner never says which catalog it used.
      catalog_version: profile.catalog.version || null,
      catalog_audited: profile.catalog.audited || null,
      catalog_entries: catalog.entries.length,
      allowlist_terms: profile.allow.size,
      artifacts_only: Boolean(opts.artifactsOnly),
      disabled_categories: profile.catalog.disabled_categories || [],
    },
    summary, findings, suppressed, cadence, cadenceChecks, formatting, fit, masked,
    counter_evidence: counter,
    markdown: isMarkdown,
  };
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`tell-scan: ${err.message}\n${USAGE}`);
    process.exit(2);
  }

  if (opts.help) {
    process.stdout.write(USAGE);
    return;
  }

  const searchPath = profileSearchPath({
    profilesDir: opts.profilesDir, projectRoot: opts.project, bundleRoot: SKILL_ROOT,
  });

  if (opts.listProfiles) {
    const found = listProfiles(searchPath);
    process.stdout.write(`Profiles discoverable from ${opts.project}:\n\n`);
    for (const [name, dir] of found) {
      const derived = existsSync(join(dir, "thresholds.derived.json"));
      const tag = name === BASE_PROFILE ? "(shared base)" : derived ? "(calibrated)" : "(UNCALIBRATED)";
      process.stdout.write(`  ${name.padEnd(18)} ${tag.padEnd(16)} ${dir}\n`);
    }
    process.stdout.write(`\nSearch order:\n${searchPath.map((d) => `  ${d}`).join("\n")}\n`);
    return;
  }

  if (!opts.files.length) {
    process.stderr.write(`tell-scan: no input files\n${USAGE}`);
    process.exit(2);
  }

  const { config, error: configError } = loadConfig(opts.project);

  const results = [];
  let failures = 0;
  for (const file of opts.files) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      process.stderr.write(`tell-scan: not a file: ${file}\n`);
      failures += 1;
      continue;
    }
    try {
      results.push(analyse(file, opts, config, searchPath));
    } catch (err) {
      process.stderr.write(`tell-scan: ${err.message}\n`);
      failures += 1;
    }
  }

  if (!results.length) process.exit(failures ? 1 : 0);

  let baseline = null;
  if (opts.baseline) {
    if (results.length > 1) {
      process.stderr.write("tell-scan: --baseline compares one file; ignoring the rest\n");
    }
    baseline = analyse(opts.baseline, opts, config, searchPath);
  }

  if (opts.json) {
    const payload = {
      tool: "tell-scan",
      version: "0.1.0",
      generated_from: results.map((r) => r.file),
      config_error: configError || null,
      results,
      baseline,
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  for (const result of results) {
    process.stdout.write(
      `${renderReport(result, { showExamples: opts.examples, showClean: opts.all })}\n`,
    );
  }
  if (baseline) {
    process.stdout.write(`${renderComparison(baseline, results[0])}\n\n`);
  }

  process.exit(failures ? 1 : 0);
}

main();
