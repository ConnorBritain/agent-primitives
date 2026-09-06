#!/usr/bin/env node
/** Rebuild current deterministic evidence without rerendering or touching historical runs. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCurrentSamples, measureSamples, heldOutDiagnostics } from "../skills/prose-draft/tools/profile-v3.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const EVIDENCE_PATH = join(HERE, "fixtures/v040/MEASUREMENTS.json");
export function currentEvidence() {
  return { schema: "prose-author-current-evidence/1", purpose: "Deterministic measurements only; no semantic render or resemblance evaluation",
    corpora: ["doctorow-blog", "eff-mullin"].map((id) => {
      const m = measureSamples(readCurrentSamples(join(HERE, "fixtures/profiles", id)));
      const diagnostics = heldOutDiagnostics(m);
      return { id, normalization: m.normalization, corpus_words: m.corpus_words, sample_count: m.sample_count, support: m.support,
        samples: m.samples.map((s) => ({ id: s.id, digest: s.digest, words: s.words, quoted_words: s.quoted_words,
          register: s.register, form: s.form, measurements: s.measurements.map(({ occurrences, ...r }) => r),
          exclusions: Object.fromEntries([...new Set(s.exclusions.map((e) => e.kind))].sort().map((k) => [k, s.exclusions.filter((e) => e.kind === k).length])) })),
        measurements: m.measurements, diagnostics,
        summary: { held_out_pieces_with_any_deviation: diagnostics.samples.filter((s) => s.measurements.some((r) => r.status === "outside-observed-range")).length,
          held_out_measurement_deviations: diagnostics.samples.flatMap((s) => s.measurements).filter((r) => r.status === "outside-observed-range").length,
          interpretation: "Descriptive departures are expected in human writing. These are not mandatory style violations." } };
    }) };
}
export function checkCurrentEvidence() {
  const expected = `${JSON.stringify(currentEvidence(), null, 2)}\n`;
  return existsSync(EVIDENCE_PATH) && readFileSync(EVIDENCE_PATH, "utf8") === expected;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--update")) writeFileSync(EVIDENCE_PATH, `${JSON.stringify(currentEvidence(), null, 2)}\n`);
  const passed = checkCurrentEvidence();
  process.stdout.write(`${passed ? "passed" : "failed"}: current v0.4 measurement evidence reproduces\n`);
  process.exitCode = passed ? 0 : 1;
}
