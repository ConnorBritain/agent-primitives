/** Human receipt assembled from recorded checks, never another model's recollection. */
const flat = (value) => String(value ?? "not-evaluated").replace(/[\r\n]+/g, " ");
const counts = (checks) => ["passed", "failed", "not-evaluated"].map((s) => `${checks.filter((c) => c.status === s).length} ${s}`).join(", ");

export function renderWritingReceipt(result, job) {
  const attempt = result.attempts?.at(-1), checks = attempt?.mechanical?.checks ?? [];
  const hard = checks.filter((c) => c.enforcement === "enforced"), semantic = checks.filter((c) => c.enforcement === "advisory");
  const review = (stage, notRequested = false) => {
    const found = attempt?.reviews?.find((r) => r.stage === stage);
    return found ? flat(found.status) : `not-evaluated (${notRequested ? "not required for this task" : "no completed check"})`;
  };
  const lines = [`Status: ${flat(result.status)}.`,
    `Context: ${flat(job.context?.form)}; register ${flat(job.context?.register ?? "unspecified")}. Profile evidence: ${flat(job.profile?.measured?.support ?? "not-evaluated (no profile supplied)")}.`,
    `Hard rules: ${hard.length ? counts(hard) : "not-evaluated (no completed hard-rule checks)"}.`,
    `Task review: ${review("task-review")}. Voice review: ${review("voice-review", !job.profile)}. Fidelity review: ${review("fidelity-review", job.mode !== "rewrite" && (result.attempts?.length ?? 0) < 2)}.`,
    `Artifact scan: ${flat(attempt?.artifacts?.status)}. Copying check: ${flat(attempt?.copying?.status)}.`,
    `Preferences: revision ${flat(result.receipt?.preference_revision)}, ${result.receipt?.active_preferences?.length ?? 0} active. Omissions: ${result.unresolved_omissions?.length ?? result.omitted?.length ?? 0} unresolved, ${result.advisory_omissions?.length ?? 0} reviewed advisory.`,
  ];
  if (job.identity_resolution) lines.push(`Writing identity: ${flat(job.identity_resolution.id)}; registry revision ${flat(job.identity_resolution.registry_revision)}. Inputs snapshotted for this run.`);
  if (semantic.length) lines.push(`Not mechanically evaluated (semantic instructions): ${semantic.map((c) => flat(c.id)).join(", ")}. See task review and sidecar.`);
  if (result.claims?.length) lines.push(`Claims disclosed for verification: ${result.claims.length}. See sidecar.`);
  if (result.telemetry) {
    const h = result.telemetry, last = h.stages.at(-1);
    lines.push(`Numerical history: ${flat(h.status)}; ${h.stages.length} stages. Baseline: ${flat(h.baseline?.digest)}. Additional rhetorical CLI dispatches: ${h.calls.filter((c) => c.dispatched).length}.`,
      `Rhetorical analysis: ${flat(last?.rhetoric.status)}. Final-stage empirical departures: ${last?.comparison.features.filter((f) => /^(above|below)-/.test(f.status)).length ?? 0}; comparison ${flat(last?.comparison.status)}. See history sidecar; departures are advisory, not rule failures.`);
  }
  if (result.status !== "checked" && result.reason) lines.push(`Reason: ${flat(result.reason)}.`);
  lines.push(`CLI dispatches: ${result.invocation?.model_calls ?? 0}; elapsed: ${((result.invocation?.elapsed_ms ?? 0) / 1000).toFixed(3)} s.`,
    "This generated delivery is authoritative for the recorded checks. Host-written chat summaries are unverified.",
    "Checks are not a quality, resemblance or factual guarantee.");
  return lines.join("\n\n") + "\n";
}

export function renderWritingDelivery(result, receipt) {
  return result.draft ? `${result.draft}\n\n${receipt}` : receipt;
}
