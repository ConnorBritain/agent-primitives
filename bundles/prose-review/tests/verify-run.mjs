#!/usr/bin/env node
/**
 * verify-run — re-derive a harness run's headline numbers from its transcripts.
 *
 *   node tests/verify-run.mjs runs/2026-08-04-b
 *
 * WHY THIS EXISTS. `critic-harness.md` requires verbatim transcripts because a
 * summary table is the reporter grading their own transcript. Checking the
 * transcripts in fixes who can see the evidence. It does not fix who did the
 * counting — a summary can still say "0 of 12" over a directory that says
 * something else, and nobody would notice.
 *
 * This is the same lesson the project has now learned seven times and logged in
 * CALIBRATION.md: a number needs a method anyone can re-run, and the method
 * needs reading too. So the run's numbers are computed here, from the files, and
 * the summary quotes this output rather than the other way round.
 *
 * The contract counts are the point. For each critic they must be zero, and
 * either being non-zero blocks the primitive regardless of how well it scored —
 * so those exit non-zero rather than printing a warning.
 *
 * TWO CRITICS NOW, AND THE VERDICT VOCABULARY IS PER-CRITIC. An earlier version
 * hardcoded CLEAN|REVISE. Adding a second critic by loosening that regex to
 * "any word" would have made a typo'd verdict parse as a valid one, so the
 * vocabularies are enumerated per critic instead, and a run directory must be
 * homogeneous: two critics' transcripts in one directory would share a
 * denominator that means nothing.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { scanFidelity, verdict as scanVerdict } from "../tools/fidelity-scan.mjs";

/**
 * Per-critic profile. `clean` is the verdict that means "nothing to report" and
 * `flag` the one that means "something was found"; `contract` lists the counts
 * that must be zero for the primitive to ship at all.
 *
 * `labels` exist so this file can serve both critics without either one's
 * published output changing wording. The voice-critic rows are quoted verbatim
 * in critic-harness.md and in a checked-in run log.
 */
const CRITICS = {
  voice: {
    clean: "CLEAN",
    flag: "REVISE",
    contract: ["uncited", "authorship_claims"],
    labels: {
      negative: "negative (leave-one-out, n=%N%):  ",
      positive: "positive (AI drafts, n=%N%):       ",
      uncited: "findings without corpus citation: %V%          <- must be 0",
      authorship_claims: "any claim about machine authorship: %V%        <- must be 0",
    },
  },
  fidelity: {
    clean: "FAITHFUL",
    flag: "MATERIAL-LOSS",
    contract: ["uncited", "contradicts_scan"],
    labels: {
      negative: "negative (faithful revisions, n=%N%):    ",
      positive: "positive (lossy revisions, n=%N%):       ",
      uncited: "findings not quoting both original and revision: %V%   <- must be 0",
      contradicts_scan: "claims an atom is present that the scan flagged: %V%   <- must be 0",
    },
    // Fixtures live in tests/fixtures/<critic>/, resolved from the run directory.
    report: (...a) => scannerAgreement(...a),
  },
};

const VERDICTS = Object.fromEntries(
  Object.entries(CRITICS).flatMap(([name, c]) => [[c.clean, name], [c.flag, name]]),
);

const RESULT = /RESULT:\s*([A-Z][A-Z-]*)\s*\|\s*(.+?)\s*$/m;
const KIND = /^#\s+(Negative|Positive)\b/im;

/** `findings=0 | uncited=0 | ...` → an object. A malformed pair yields no key,
 * which then trips the required-key check below rather than defaulting to 0.
 * Defaulting a missing contract count to 0 would flatter the result silently,
 * which is the one direction this file exists to close off. */
function parseFields(rest) {
  const out = {};
  for (const part of rest.split("|")) {
    const m = part.trim().match(/^([a-z_]+)=(\d+)$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

export function readRun(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();

  const runs = [];
  const malformed = [];
  const mismatched = [];
  for (const f of files) {
    // `<fixture>-dK.md` for runs that record their draws, bare `<fixture>.md` for the
    // pre-draws runs that predate the suffix. Both parse to (fixture, draw); a legacy
    // run reads as draw 1 of a 1-draw case, which is what those runs actually were.
    const nameNoExt = f.replace(/\.md$/, "");
    const dm = nameNoExt.match(/^(.+)-d(\d+)$/);
    const fixture = dm ? dm[1] : nameNoExt;
    const draw = dm ? Number(dm[2]) : 1;
    const text = readFileSync(join(dir, f), "utf8");
    const m = text.match(RESULT);
    if (!m) {
      // A transcript without a RESULT line cannot be counted, and silently
      // skipping it would understate the denominator - which is the direction
      // that flatters the result.
      malformed.push(f);
      continue;
    }

    const critic = VERDICTS[m[1]];
    if (!critic) {
      malformed.push(`${f} (unknown verdict "${m[1]}")`);
      continue;
    }
    const profile = CRITICS[critic];
    const fields = parseFields(m[2]);
    const required = ["findings", ...profile.contract];
    const absent = required.filter((k) => !(k in fields));
    if (absent.length) {
      malformed.push(`${f} (RESULT line missing ${absent.join(", ")})`);
      continue;
    }

    const declared = text.match(KIND);
    if (!declared) {
      malformed.push(`${f} (no "# Negative"/"# Positive" heading)`);
      continue;
    }
    const fromHeading = declared[1].toLowerCase();
    const fromName = fixture.startsWith("p-") ? "positive" : "negative";
    if (fromHeading !== fromName) {
      mismatched.push(`${f}: heading says ${fromHeading}, filename says ${fromName}`);
      continue;
    }

    runs.push({ file: f, fixture, draw, critic, kind: fromHeading, verdict: m[1], ...fields });
  }
  return { runs, malformed, mismatched };
}

/**
 * Group transcripts by fixture. Each entry is one *case*, with all its draws attached.
 *
 * Grouping is where "single-draw" and "k=3" become the same code path, and it is why
 * `tally` can stop caring which one it got. A k=1 run yields groups of size 1, so the
 * majority is just the one verdict and every case is trivially unanimous — which is
 * the correct thing to say about a run that only asked once.
 */
export function groupCases(runs) {
  const groups = new Map();
  for (const r of runs) {
    if (!groups.has(r.fixture)) groups.set(r.fixture, []);
    groups.get(r.fixture).push(r);
  }
  const cases = [...groups.entries()].map(([fixture, draws]) => {
    // Every draw of a case shares the same kind and the same critic, because they come
    // from the same fixture. A run that mixed those would be broken elsewhere.
    const kind = draws[0].kind;
    const critic = draws[0].critic;
    const verdicts = draws.map((d) => d.verdict);
    const tally = verdicts.reduce((a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {});
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    return {
      fixture,
      kind,
      critic,
      draws,
      verdicts,
      majority: sorted[0][0],
      majorityCount: sorted[0][1],
      unanimous: sorted.length === 1,
    };
  });
  return cases;
}

export function tally(runs, profile) {
  const cases = groupCases(runs);
  const of = (kind) => cases.filter((c) => c.kind === kind);
  const count = (list, v) => list.filter((c) => c.majority === v).length;
  const t = {
    // n is the number of CASES, not draws. Reporting "12 of 33 flagged" over 11 cases
    // with 3 draws each would be technically true and completely misleading — the
    // question the header answers is "how many of the fixtures came back X", and a
    // fixture that comes back REVISE-REVISE-CLEAN counts as REVISE once, not twice.
    negative: { n: of("negative").length, flagged: count(of("negative"), profile.flag) },
    positive: { n: of("positive").length, flagged: count(of("positive"), profile.flag) },
    findings: runs.reduce((a, r) => a + r.findings, 0),
    // A split is any case whose draws did not all agree. Reported as its own count
    // rather than resolved: a critic that returns opposite verdicts on the same prompt
    // is telling you which cases sit on its threshold, and hiding that in a majority
    // would throw away the most useful thing about running k>1.
    splits: cases.filter((c) => !c.unanimous).length,
    totalCases: cases.length,
    cases,
  };
  // Contract counts sum across every draw. A critic is not allowed to make an
  // authorship claim once, so an authorship claim in 1 of 3 draws still blocks.
  for (const k of profile.contract) t[k] = runs.reduce((a, r) => a + r[k], 0);
  return t;
}

/**
 * Fidelity only. The argument for this critic existing is that it DISAGREES with
 * `fidelity-scan` in both directions - clearing atoms the scan over-flagged, and
 * catching losses the scan is structurally blind to. A critic whose verdict
 * always matched the scanner would be an expensive wrapper around a regex.
 *
 * So the scan verdict is re-derived HERE from the fixture files, not read from
 * the transcript. A self-reported disagreement rate is the reporter grading
 * their own transcript again, one level up.
 */
function scannerAgreement(runs, dir, critic, line) {
  const fixturesDir = join(dir, "..", "..", "fixtures", critic);
  if (!existsSync(join(fixturesDir, "fixtures.json"))) return 0;

  const manifest = JSON.parse(readFileSync(join(fixturesDir, "fixtures.json"), "utf8"));
  const byName = new Map(manifest.fixtures.map((f) => [f.name, f]));
  const cases = groupCases(runs);
  let echo = 0, clearedOverFlag = 0, caughtBlindSpot = 0, correct = 0;
  const unresolved = [], corrected = [];

  // Per CASE, not per draw. A fixture whose 3 draws split REVISE/REVISE/CLEAN counts
  // once in the tally — with the majority verdict — because a case is one document and
  // "correct" is a property of the document's ground truth, not of the individual
  // dispatches. Splits are already surfaced elsewhere; double-counting them here would
  // scale the echo baseline by the split count and turn a stable measurement into a
  // moving target.
  for (const c of cases) {
    const f = byName.get(c.fixture);
    if (!f) { unresolved.push(c.fixture); continue; }

    // A fixture whose expected verdict was changed AFTER this run scored against it.
    // ONLY when the correction happened after THIS run — `corrected_after_run` names
    // the run whose score was computed against the OLD expectation, and a later run
    // scored against the corrected one is not caveated by it. A caveat that cries wolf
    // is worse than no caveat.
    if (f.corrected_after_run === basename(resolve(dir))) {
      corrected.push(`${c.fixture}: expected ${f.previous_expect} when run, now ${f.expect}`);
    }
    const scan = scanVerdict(scanFidelity(
      readFileSync(join(fixturesDir, c.fixture, "original.md"), "utf8"),
      readFileSync(join(fixturesDir, c.fixture, "revision.md"), "utf8"),
    ));
    if (c.majority === f.expect) correct += 1;
    if (c.majority === scan) echo += 1;
    else if (scan === "MATERIAL-LOSS") clearedOverFlag += 1;
    else caughtBlindSpot += 1;
  }

  const n = cases.length - unresolved.length;
  process.stdout.write("\n");
  line(`verdicts matching the fixture's expected verdict:  ${correct} of ${n}`);
  line(`losses the scan flagged and the critic cleared:    ${clearedOverFlag}`);
  line(`losses the scan missed and the critic caught:      ${caughtBlindSpot}`);
  line(`verdicts identical to fidelity-scan's (echo rate): ${echo} of ${n}`);

  let bad = 0;
  if (corrected.length) {
    process.stdout.write("\n");
    line(`${corrected.length} fixture(s) whose expected verdict was CORRECTED after this run:`);
    for (const cc of corrected) line(`  ${cc}`);
    line("  Read fixtures.json's correction_note before quoting the score above.");
  }
  if (unresolved.length) {
    // An unresolvable transcript is one whose ground truth nobody can check.
    process.stdout.write(`\n    ${unresolved.length} case(s) naming no known fixture: ${unresolved.join(", ")}\n`);
    bad += 1;
  }
  return bad;
}

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(dir)) {
    process.stderr.write("verify-run: usage: node tests/verify-run.mjs <run-dir>\n");
    process.exit(2);
  }
  const { runs, malformed, mismatched } = readRun(dir);

  // A directory mixing two critics would sum their findings and share their
  // denominators, producing numbers that describe neither.
  const critics = [...new Set(runs.map((r) => r.critic))];
  if (critics.length > 1) {
    process.stdout.write(`\n  ${dir} — transcripts from more than one critic: ${critics.join(", ")}\n`);
    process.stdout.write("    A run directory holds one critic. Split them.\n\n");
    process.exit(1);
  }
  const critic = critics[0] ?? "voice";
  const profile = CRITICS[critic];
  const t = tally(runs, profile);
  const line = (s) => process.stdout.write(`    ${s}\n`);

  // Draws come from the MANIFEST if it exists; otherwise infer from the runs. A run
  // whose draws differ across cases is a legitimate thing to say — the cross-author
  // voice run had k=3 on some cells and k=1 on others — so we describe what we see
  // rather than claim a single k.
  const manifest = existsSync(join(dir, "MANIFEST.json"))
    ? JSON.parse(readFileSync(join(dir, "MANIFEST.json"), "utf8"))
    : null;
  const observedDraws = [...new Set(t.cases.map((c) => c.draws.length))].sort((a, b) => a - b);
  const drawsLabel = manifest?.draws != null
    ? `k=${manifest.draws}`
    : observedDraws.length === 1 ? `k=${observedDraws[0]}` : `k=${observedDraws.join("/")}, mixed`;

  process.stdout.write(`\n  ${dir} — ${t.cases.length} case(s), ${runs.length} transcript(s) (${drawsLabel})\n\n`);

  // The "single draw" banner is the whole reason SAMPLING-POLICY exists. A run with
  // only one dispatch per case cannot tell a stable verdict from an unstable one, and
  // a reader who quotes it without knowing that is quoting an unmeasured wobble as if
  // it were a number.
  const singleDraw = manifest?.draws === 1 || (observedDraws.length === 1 && observedDraws[0] === 1);
  if (singleDraw) {
    line("single draw per case (unreliable on borderlines)  <- widen to k=3 before quoting");
    process.stdout.write("\n");
  }

  for (const kind of ["negative", "positive"]) {
    const { n, flagged } = t[kind];
    line(`${profile.labels[kind].replace("%N%", String(n))} ${flagged} ${profile.flag}, ${n - flagged} ${profile.clean}`);
  }

  // Splits are only meaningful when there is more than one draw somewhere in the run.
  // Reporting "0 splits" over a k=1 run would falsely imply the critic agreed with
  // itself, which it was never asked.
  if (observedDraws.some((k) => k > 1)) {
    line(`cases whose ${drawsLabel} draws did not all agree:  ${t.splits} of ${t.totalCases}   (a split is a finding)`);
  }

  for (const k of profile.contract) line(profile.labels[k].replace("%V%", String(t[k])));

  // Anything a critic needs beyond the shared counts goes through this hook, so
  // `main` does not grow a branch per critic. `prose-pattern-critic` is next and
  // reads a different deterministic artifact; it gets a `report` of its own rather
  // than another `if` here.
  let bad = profile.report ? profile.report(runs, dir, critic, line) : 0;
  process.stdout.write("\n");

  if (mismatched.length) {
    process.stdout.write(`    ${mismatched.length} transcript(s) whose heading and filename disagree:\n`);
    for (const m of mismatched) process.stdout.write(`      ${m}\n`);
    process.stdout.write("\n");
    bad += 1;
  }
  if (malformed.length) {
    process.stdout.write(`    ${malformed.length} transcript(s) with no RESULT line: ${malformed.join(", ")}\n\n`);
    bad += 1;
  }
  if (profile.contract.some((k) => t[k])) {
    process.stdout.write("    CONTRACT VIOLATION — this blocks the primitive regardless of score.\n\n");
    bad += 1;
  }
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("verify-run.mjs")) main();
