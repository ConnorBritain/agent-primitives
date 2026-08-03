/**
 * Human-readable rendering. The JSON path is the machine contract; this is the
 * one a person reads, so it is ordered by what they should look at first and
 * kept short enough that they actually do.
 *
 * Nobody reads a review report longer than the thing reviewed.
 */

const SEV = { 3: "HIGH", 2: "MED", 1: "LOW" };

/** No colour when piped or when NO_COLOR is set — output gets pasted into issues. */
const useColour = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColour ? `[${code}m${s}[0m` : s);
const bold = (s) => c("1", s);
const dim = (s) => c("2", s);
const red = (s) => c("31", s);
const yellow = (s) => c("33", s);

function rule(char = "─", width = 74) {
  return char.repeat(width);
}

/**
 * The uncalibrated banner.
 *
 * The brief is explicit that a thin corpus must say so loudly rather than
 * quietly reporting low-confidence findings, because a number presented without
 * its provenance gets quoted without it too.
 */
export function calibrationBanner(thresholds, summary) {
  const lines = [];
  if (!thresholds.derived) {
    lines.push(red(bold("  ⚠  THRESHOLDS ARE NOT CALIBRATED")));
    lines.push(
      "     Every comparison below is against a hand-written fallback, not a",
    );
    lines.push(
      "     measurement of this register. Fallbacks are our guess at what normal",
    );
    lines.push(
      "     looks like; they are not what YOUR writing looks like. Findings are",
    );
    lines.push("     usable as leads, not as evidence.");
    lines.push("");
    lines.push(
      "     This matters most if your English is not the English this catalog",
    );
    lines.push(
      "     was built from. An ornate formal register is the professional norm",
    );
    lines.push(
      "     in several varieties of English, and the fallbacks will read it as",
    );
    lines.push("     a defect. Calibrating on your own writing is the real fix.");
    lines.push(
      dim(`     Fix: add human-written samples to this profile's corpus/human/,`),
    );
    lines.push(dim("     then run  calibrate.mjs <profile>"));
    lines.push(dim("     Or skip style judgement entirely: --artifacts-only"));
  } else if (summary.threshold_confidence !== "calibrated") {
    lines.push(
      yellow(bold(`  ⚠  THIN CORPUS — ${summary.corpus_samples} sample(s)`)),
    );
    lines.push(
      "     Derived thresholds off this few samples are barely better than the",
    );
    lines.push("     fallbacks. Treat percentile bands as provisional.");
  }
  return lines;
}

function renderFinding(f, { showExamples }) {
  const tag = SEV[f.severity] || "?";
  const mark = f.flagged ? red("▲") : f.held_by_floor ? yellow("~") : dim("·");
  const ceiling = f.ceiling === null ? "" : dim(` (limit ${f.ceiling})`);
  const floor = f.held_by_floor ? dim(` needs ${f.min_count}`) : "";
  const conf = f.confidence === "contested" ? dim(" [contested]") : "";
  const head =
    `  ${mark} [${tag}] ${f.label.padEnd(34).slice(0, 34)} ` +
    `n=${String(f.count).padEnd(3)} /1k=${String(f.per_1k).padEnd(6)}${ceiling}${floor}${conf}`;

  const out = [head];
  if (showExamples && f.contexts?.length) {
    // One line per hit, with the match marked in place. Reviewing a tell means
    // reading the sentence it sits in; a column of bare matched words is not
    // something anyone can act on.
    for (const ctx of f.contexts) {
      out.push(dim(`      L${String(ctx.line).padEnd(4)} ${ctx.text.slice(0, 92)}`));
    }
    if (f.count > f.contexts.length) {
      out.push(dim(`      … ${f.count - f.contexts.length} more`));
    }
  }
  return out;
}

export function renderReport(result, { showExamples = true, showClean = false } = {}) {
  const { file, profile, summary, findings, cadence, cadenceChecks, formatting, fit, masked } =
    result;
  const out = [];

  out.push("");
  out.push(bold(rule("═")));
  out.push(bold(` ${file}`));
  out.push(
    ` ${summary.words} words · profile ${bold(profile.name)} ` +
      dim(`(${profile.how})`),
  );
  out.push(bold(rule("═")));

  const banner = calibrationBanner(profile.thresholds, summary);
  if (banner.length) {
    out.push("");
    out.push(...banner);
  }

  if (profile.fellBack && profile.requested) {
    out.push("");
    out.push(yellow(`  ⚠  requested profile "${profile.requested}" not found — using _base`));
  }

  if (fit?.checked && !fit.fits) {
    out.push("");
    out.push(yellow(bold("  ⚠  PROFILE-FIT: this document sits outside its declared register")));
    for (const o of fit.outside) {
      out.push(`     ${o.label}: ${o.value} vs corpus ${o.p10}–${o.p90}`);
    }
    out.push(dim("     Either the wrong profile is selected or the writing has drifted."));
  }

  const flagged = findings.filter((f) => f.flagged);
  const held = findings.filter((f) => f.held_by_floor);
  const quiet = findings.filter((f) => !f.flagged && !f.held_by_floor);

  if (profile.artifacts_only) {
    out.push("");
    out.push(dim("  artifacts only — Tier A. No style judgements, no cadence bands."));
  } else if (profile.disabled_categories?.length) {
    out.push("");
    out.push(dim(`  categories disabled by this profile: ${profile.disabled_categories.join(", ")}`));
  }

  out.push("");
  out.push(bold("  CATALOG"));
  if (!findings.length) {
    out.push(dim("  no catalog hits"));
  } else {
    if (flagged.length) {
      out.push(dim("  over threshold:"));
      for (const f of flagged) out.push(...renderFinding(f, { showExamples }));
    }
    if (held.length) {
      // Shown rather than hidden: these cleared the density ceiling and were
      // held back only because there were too few occurrences to call it a rate.
      // Suppressing them silently would be the tool deciding for the reader.
      out.push(
        dim(`  over density, too few occurrences to count (${held.length}) — see min-count floor:`),
      );
      for (const f of held) {
        out.push(...renderFinding(f, { showExamples }));
      }
    }
    if (quiet.length) {
      out.push(dim(`  below threshold (${quiet.length}) — present, not elevated:`));
      for (const f of quiet.slice(0, showClean ? quiet.length : 12)) {
        out.push(...renderFinding(f, { showExamples: false }));
      }
      if (!showClean && quiet.length > 12) {
        out.push(dim(`      … ${quiet.length - 12} more (--all to list)`));
      }
    }
  }

  out.push("");
  out.push(bold("  CADENCE"));
  out.push(
    `    sentences ${cadence.sentences} · mean ${cadence.mean_len}w · ` +
      `stdev ${cadence.stdev_len} · cv ${cadence.cv_len} · ` +
      `range ${cadence.shortest}–${cadence.longest}`,
  );
  out.push(
    `    paragraphs ${cadence.paragraphs} · mean ${cadence.mean_para_words}w · ` +
      `fragments <6w ${cadence.fragments_under_6w} (${Math.round(cadence.fragment_rate * 100)}%) · ` +
      `uniform run ${cadence.longest_uniform_run}`,
  );
  out.push(
    `    em dash ${formatting.em_dash.count} (/1k ${formatting.em_dash.per_1k}, ` +
      `${formatting.em_dash.per_para}/para) · bold ${formatting.bold.count} · ` +
      `headings ${formatting.headings.count}`,
  );

  for (const check of cadenceChecks.filter((x) => x.flagged)) {
    out.push(red(`    ▲ ${check.label}: ${check.value} — ${check.expectation}`));
  }
  if (cadence.repeated_openers.length) {
    const shown = cadence.repeated_openers
      .slice(0, 5)
      .map((o) => `"${o.opener}"×${o.count}`)
      .join(", ");
    out.push(`    repeated openers: ${shown}`);
  }

  if (masked && Object.values(masked).some((n) => n > 0)) {
    const parts = Object.entries(masked)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${k}`)
      .join(", ");
    out.push("");
    out.push(dim(`  excluded from scan: ${parts}`));
  }

  out.push("");
  out.push(bold("  READING"));
  for (const line of wrap(summary.reading, 70)) out.push(`    ${line}`);
  out.push("");
  out.push(
    dim(
      "    Signals for a human to weigh. Not a verdict, and never usable as an\n" +
        "    authorship test on someone else's writing.",
    ),
  );

  return out.join("\n");
}

function wrap(text, width) {
  const out = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

/**
 * Before/after comparison — the honest measure of whether a revision worked,
 * and the only place this tool reports on a change rather than a state.
 *
 * A regression is any catalog entry present in the revision that was absent
 * before. Revisions introduce new tells constantly and nothing else catches it.
 */
export function renderComparison(baseline, current) {
  const out = [];
  const before = new Map(baseline.findings.map((f) => [f.id, f]));
  const after = new Map(current.findings.map((f) => [f.id, f]));

  const beforeTotal = baseline.summary.total_hits;
  const afterTotal = current.summary.total_hits;

  const introduced = [...after.values()].filter((f) => !before.has(f.id));
  const removed = [...before.values()].filter((f) => !after.has(f.id));
  const worse = [...after.values()].filter((f) => {
    const b = before.get(f.id);
    return b && f.count > b.count;
  });

  out.push("");
  out.push(bold(rule("═")));
  out.push(bold(" BASELINE COMPARISON"));
  out.push(bold(rule("═")));
  out.push(
    `  catalog hits: ${beforeTotal} → ${afterTotal} ` +
      dim(`(${signed(afterTotal - beforeTotal)})`),
  );
  out.push(
    `  cv_len: ${baseline.cadence.cv_len} → ${current.cadence.cv_len}   ` +
      `mean: ${baseline.cadence.mean_len}w → ${current.cadence.mean_len}w   ` +
      `uniform run: ${baseline.cadence.longest_uniform_run} → ${current.cadence.longest_uniform_run}`,
  );

  if (removed.length) {
    out.push("");
    out.push(`  ${dim("resolved")} (${removed.length}): ${removed.map((f) => f.label).join(", ")}`);
  }

  if (introduced.length || worse.length) {
    out.push("");
    out.push(red(bold("  ▲ REGRESSION")));
    for (const f of introduced) {
      out.push(red(`      new: ${f.label} (n=${f.count}, /1k=${f.per_1k}) — L${f.lines.join(", L")}`));
    }
    for (const f of worse) {
      out.push(red(`      worse: ${f.label} ${before.get(f.id).count} → ${f.count}`));
    }
  } else {
    out.push("");
    out.push("  no regression — nothing new was introduced");
  }

  return out.join("\n");
}

const signed = (n) => (n > 0 ? `+${n}` : String(n));
