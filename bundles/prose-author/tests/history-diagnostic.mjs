#!/usr/bin/env node
/** Six locked licensed passages, two draws each. Disagreement report, not a release bar. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { rhetoricalInput, measureRhetoric, RHETORIC_RUBRIC } from "../skills/prose-draft/tools/history-rhetoric.mjs";
import { runtimePrompt } from "../skills/prose-draft/tools/runtime-contract.mjs";
import { sha256 } from "../skills/prose-draft/tools/profile-v3.mjs";
import { HISTORY_ANALYZER } from "../skills/prose-draft/tools/history-measure.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, "../../..");
const write = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
export function selectDiagnosticPassages() {
  return ["doctorow-blog", "eff-mullin"].flatMap((author) => {
    const source = `bundles/prose-author/tests/runs/2026-09-06-v040-bounded/inputs/${author}.json`;
    const bytes = readFileSync(join(ROOT, source), "utf8");
    return JSON.parse(bytes).slice().sort((a, b) => a.id.localeCompare(b.id, "en")).slice(0, 3).map((sample, i) => {
      const paragraphs = rhetoricalInput(sample.text).paragraphs.slice(0, 3);
      const text = paragraphs.join("\n\n");
      return { id: `${author}-${i + 1}`, author: sample.author, source, source_digest: sha256(bytes), sample_id: sample.id,
        selection: "first-three-normalized-author-paragraphs", text_digest: sha256(text), text };
    });
  });
}
export async function diagnosticMain(args) {
  const value = (f) => args[args.indexOf(f) + 1], out = resolve(value("--out"));
  const passages = selectDiagnosticPassages(), prompt_digest = sha256(runtimePrompt("voice-rhetoric-measure"));
  const manifest = { schema: "voice-history-diagnostic/1", rubric: RHETORIC_RUBRIC, analyzer: HISTORY_ANALYZER, prompt_digest,
    draws_per_passage: 2, maximum_calls: 12, redraws: 0, passages: passages.map(({ text, ...p }) => p),
    interpretation: "Structural evidence and model disagreement only; semantic accuracy is unmeasured without independent labels." };
  if (args.includes("--prepare")) {
    mkdirSync(out, { recursive: true }); write(join(out, "LOCK.json"), manifest);
    console.log("Locked six passage selections and twelve draws; commit before dispatch."); return;
  }
  const lock = JSON.parse(readFileSync(join(out, "LOCK.json"), "utf8"));
  if (JSON.stringify(lock) !== JSON.stringify(manifest)) throw new Error("Locked prompt, analyzer or sources changed; do not silently reinterpret the set");
  if (args.includes("--check")) {
    const report = JSON.parse(readFileSync(join(out, "REPORT.json"), "utf8"));
    if (report.cells.length !== 12 || new Set(report.cells.map((c) => c.id)).size !== 12) throw new Error("Missing/duplicate diagnostic draws");
    for (const c of report.cells) if (JSON.stringify(c) !== JSON.stringify(JSON.parse(readFileSync(join(out, `${c.id}.json`), "utf8")))) throw new Error("Changed diagnostic cell");
    console.log("Locked diagnostic sources, prompt, and twelve retained cells reproduce; no new calls."); return;
  }
  const harness = args.includes("--harness") ? value("--harness") : "codex";
  if (!["codex", "claude"].includes(harness)) throw new Error("Choose a supported authenticated CLI");
  execFileSync("git", ["ls-files", "--error-unmatch", join(out, "LOCK.json")], { cwd: ROOT, stdio: "pipe" });
  execFileSync("git", ["diff", "HEAD", "--exit-code", "--", join(out, "LOCK.json"), "primitives/agents/voice-rhetoric-measure", "bundles/prose-author/skills/prose-draft/tools/history-rhetoric.mjs", "bundles/prose-author/skills/prose-draft/tools/history-measure.mjs"], { cwd: ROOT, stdio: "pipe" });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(), cells = [];
  for (const p of passages) for (let draw = 1; draw <= 2; draw++) {
    const id = `${p.id}-draw-${draw}`, path = join(out, `${id}.json`), started = join(out, `${id}.started.json`);
    if (existsSync(path)) { cells.push(JSON.parse(readFileSync(path, "utf8"))); continue; }
    if (existsSync(started)) throw new Error(`Uncertain prior dispatch ${id}; inspect, never redraw automatically`);
    write(started, { id, commit, input_digest: p.text_digest, started_at: new Date().toISOString() });
    const measured = await measureRhetoric(p.text, { enabled: true, budget: { remaining: 1 }, adapter: { harness } });
    const cell = { id, passage: p.id, draw, commit, input_digest: p.text_digest, measured };
    write(path, cell); cells.push(cell); console.log(`${id}: ${measured.status}${measured.reason ? ` (${measured.reason})` : ""}`);
  }
  const pairs = passages.map((p) => {
    const pair = cells.filter((c) => c.passage === p.id);
    if (pair.some((c) => c.measured.status !== "measured-estimate")) return { passage: p.id, status: "not-evaluated", differences: [] };
    return { passage: p.id, status: "descriptive", differences: pair[0].measured.measurements.map((m, i) => ({ id: m.id, first: m.count, second: pair[1].measured.measurements[i].count,
      absolute_difference: Math.abs(m.count - pair[1].measured.measurements[i].count) })) };
  });
  const report = { schema: "voice-history-diagnostic-report/1", lock_digest: sha256(JSON.stringify(lock)), cells, pairs,
    structurally_measured: cells.filter((c) => c.measured.status === "measured-estimate").length,
    dispatched_calls: cells.filter((c) => c.measured.call?.dispatched).length,
    model_elapsed_ms: cells.reduce((n, c) => n + (c.measured.call?.elapsed_ms ?? 0), 0), semantic_accuracy: "not-evaluated", redraws: 0 };
  write(join(out, "REPORT.json"), report);
  writeFileSync(join(out, "REPORT.md"), `# Bounded rhetorical diagnostic\n\n${report.structurally_measured}/12 draws returned structurally valid located estimates. ${report.dispatched_calls} authenticated CLI calls; ${(report.model_elapsed_ms / 1000).toFixed(3)} seconds summed call time. No redraws.\n\nSemantic accuracy is unmeasured; disagreement is descriptive, not a release threshold.\n\n${pairs.map((p) => `${p.passage}: ${p.status}; ${p.differences.filter((d) => d.absolute_difference).length} labels with count disagreement.`).join("\n\n")}\n`, { flag: "wx", mode: 0o600 });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) diagnosticMain(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exitCode = 1; });
