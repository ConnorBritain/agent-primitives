/** Current profile measurement/assembly. Historical profile-contract.mjs is unchanged. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { PROFILE_MEASUREMENT_RULES } from "./profile-measure.mjs";
import { COVERAGE_DIMENSIONS, MEASUREMENT_DIMENSIONS } from "./profile-contract.mjs";
import { visibleProse, wordCount, locatedMatches, NORMALIZATION_VERSION } from "./visible-prose.mjs";

export const PROFILE_V3 = "voice-profile/3";
export const MEASUREMENTS_V2 = "voice-profile-measurements/2";
export const PROFILE_FLOOR = Object.freeze({ pieces: 5, words: 1000, maximum_pieces: 50 });
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
export const rate = (count, words) => words ? Math.round(count / words * 100000) / 100 : null;
const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const CURRENT_MEASUREMENT_RULES = PROFILE_MEASUREMENT_RULES.map((r) => ({ ...r,
  counting_rule: `[normalization:${NORMALIZATION_VERSION}] ${r.counting_rule.replaceAll("extracted sample bodies", "author-visible prose (recognizable quotations excluded)")}`,
}));

// Preserve original offsets while retaining the existing editorial-body boundary.
export function bodyRange(raw) {
  const lines = [...raw.matchAll(/[^\n]*(?:\n|$)/g)].filter((m) => m[0]);
  const first = lines.findIndex((m) => /\(permalink\)\s*$/.test(m[0]));
  if (first === -1) return null;
  const boilerplate = /^(?:Hey look at this|Object permanence|Upcoming appearances|Recent appearances|Latest books|Upcoming books|Colophon)\s*\(permalink\)\s*$/;
  const last = lines.findIndex((m, i) => i > first && boilerplate.test(m[0].trim()));
  return { start: lines[first].index + lines[first][0].length, end: last === -1 ? raw.length : lines[last].index };
}

export function measureSample(sample) {
  if (!sample || typeof sample.text !== "string" || !sample.id) throw new TypeError("Sample needs id and text");
  const normalized = visibleProse(sample.text, { format: sample.format ?? "markdown", quotedRanges: sample.quoted_ranges ?? [], bodyRange: bodyRange(sample.text) });
  const words = wordCount(normalized.author), visibleWords = wordCount(normalized.visible);
  return {
    id: sample.id, digest: sha256(sample.text), author: sample.author ?? null,
    register: sample.register ?? null, form: sample.form ?? null,
    words, quoted_words: visibleWords - words, format: normalized.format,
    exclusions: normalized.exclusions, quotations: normalized.quotations, warnings: normalized.warnings,
    measurements: CURRENT_MEASUREMENT_RULES.map((rule) => {
      const occurrences = locatedMatches(normalized.author, rule.pattern, normalized.author_offsets);
      return { id: rule.id, count: occurrences.length, per_1000_words: rate(occurrences.length, words), occurrences };
    }),
  };
}

const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1);
};
export function distribution(values) {
  return { n: values.length, minimum: values.length ? Math.min(...values) : null,
    p10: quantile(values, 0.1), median: quantile(values, 0.5), p90: quantile(values, 0.9),
    maximum: values.length ? Math.max(...values) : null };
}

export function measureSamples(samples, { register = null, form = null } = {}) {
  if (!Array.isArray(samples)) throw new TypeError("samples must be an array");
  const excluded = [], used = [], seenIds = new Set(), seenBodies = new Set();
  for (const sample of [...samples].sort((a, b) => String(a.id).localeCompare(String(b.id), "en"))) {
    if (!sample.id || seenIds.has(sample.id)) throw new TypeError("Sample ids must be nonempty and unique");
    seenIds.add(sample.id);
    let reason;
    if (sample.human_authored !== true || !sample.source || !sample.author) reason = "Missing human authorship/source attribution";
    else if (register && sample.register !== register) reason = "Outside selected register";
    else if (form && sample.form !== form) reason = "Outside selected form";
    if (reason) { excluded.push({ id: sample.id, reason }); continue; }
    const measured = measureSample(sample);
    const bodyDigest = sha256(visibleProse(sample.text, { format: sample.format ?? "markdown", bodyRange: bodyRange(sample.text) }).author.replace(/\s+/g, " ").trim());
    if (!measured.words) reason = "No attributable prose words";
    else if (seenBodies.has(bodyDigest)) reason = "Duplicate prose is not an independent piece";
    if (reason) { excluded.push({ id: sample.id, reason }); continue; }
    seenBodies.add(bodyDigest); used.push(measured);
  }
  const authors = [...new Set(used.map((s) => s.author))];
  if (authors.length > 1) throw new TypeError("Mixed authors: select one attributed author before rendering");
  if (used.length > PROFILE_FLOOR.maximum_pieces) throw new TypeError("Oversized corpus: explicitly select at most 50 pieces before rendering");
  const corpusWords = used.reduce((n, s) => n + s.words, 0);
  const groupKeys = [...new Set(used.map((s) => JSON.stringify([s.register, s.form])))].sort();
  const groups = groupKeys.map((key) => {
    const [r, f] = JSON.parse(key), members = used.filter((s) => s.register === r && s.form === f);
    const words = members.reduce((n, s) => n + s.words, 0);
    return { register: r, form: f, samples: members.map((s) => s.id), words,
      support: members.length >= PROFILE_FLOOR.pieces && words >= PROFILE_FLOOR.words ? "supported" : "limited-evidence" };
  });
  return { schema: MEASUREMENTS_V2, normalization: NORMALIZATION_VERSION, author: authors[0] ?? null,
    corpus_words: corpusWords, sample_count: used.length, samples: used, samples_excluded: excluded, groups,
    support: !used.length ? "preference-only" : groups.length === 1 && groups[0].support === "supported" ? "supported" : "limited-evidence",
    measurements: CURRENT_MEASUREMENT_RULES.map((rule) => {
      const count = used.reduce((n, s) => n + s.measurements.find((m) => m.id === rule.id).count, 0);
      return { id: rule.id, count, per_1000_words: rate(count, corpusWords), counting_rule: rule.counting_rule,
        interpretation: "advisory", observed_absence: corpusWords > 0 && count === 0,
        distribution: distribution(used.map((s) => s.measurements.find((m) => m.id === rule.id).per_1000_words)),
        groups: groups.map((g) => ({ register: g.register, form: g.form,
          distribution: distribution(used.filter((s) => g.samples.includes(s.id)).map((s) => s.measurements.find((m) => m.id === rule.id).per_1000_words)) })),
      };
    }),
  };
}

/** Small frontmatter subset used by corpus files; no external YAML dependency. */
export function readCurrentSamples(profileDir) {
  const root = join(profileDir, "corpus", "human"), samples = [];
  if (!existsSync(root)) return samples;
  const walk = (dir, depth = 0) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".") || /^readme\b/i.test(name)) continue;
      const path = join(dir, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) { if (depth === 0) walk(path, 1); continue; }
      if (!stat.isFile() || ![".md", ".markdown", ".txt", ".mdx"].includes(extname(name))) continue;
      const text = readFileSync(path, "utf8"), fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
      const field = (k) => new RegExp(`^${k}:\\s*(.*?)\\s*$`, "m").exec(fm)?.[1].replace(/^["']|["']$/g, "") ?? null;
      samples.push({ id: relative(root, path).split("\\").join("/"), text,
        author: field("author"), source: field("source"), date: field("date"),
        human_authored: /^(true|yes)$/i.test(field("human_authored") ?? ""),
        register: field("register"), form: field("form"), format: field("format") ?? "markdown" });
    }
  };
  walk(root); return samples;
}

/** Leave-one-out descriptive diagnostics, not a gate on whether human prose is valid. */
export function heldOutDiagnostics(measured) {
  return { schema: "voice-profile-held-out/1", policy: "advisory; training min/max, same register and form, at least four training pieces",
    samples: measured.samples.map((sample) => {
      const training = measured.samples.filter((s) => s.id !== sample.id && s.register === sample.register && s.form === sample.form);
      return { id: sample.id, training_samples: training.length,
        measurements: sample.measurements.map((m) => {
          const values = training.map((s) => s.measurements.find((r) => r.id === m.id).per_1000_words);
          const d = distribution(values), evaluated = training.length >= 4;
          return { id: m.id, actual_per_1000_words: m.per_1000_words, training_distribution: d,
            status: !evaluated ? "not-evaluated" : m.per_1000_words < d.minimum || m.per_1000_words > d.maximum ? "outside-observed-range" : "within-observed-range" };
        }) };
    }) };
}

/** The model supplies only cited qualitative observations, never arithmetic. */
export function assembleProfileV3({ id, samples, observations = [], unresolved = [], selection = {}, renderer = null }) {
  if (typeof id !== "string" || !id.trim()) throw new TypeError("Profile needs an id");
  const measured = measureSamples(samples, selection), sourceById = new Map(samples.map((s) => [s.id, s]));
  const selectedIds = new Set(measured.samples.map((s) => s.id));
  const obs = observations.map((o, i) => {
    if (!o.description?.trim() || !Array.isArray(o.dimensions) || !o.dimensions.length || o.dimensions.some((d) => !COVERAGE_DIMENSIONS.includes(d))
      || !Array.isArray(o.citations) || !o.citations.length) throw new TypeError(`Invalid semantic observation ${i + 1}`);
    for (const c of o.citations) {
      const source = sourceById.get(c.file);
      if (!source || !selectedIds.has(c.file) || !Number.isInteger(c.start) || !Number.isInteger(c.end) || c.start < 0 || c.end <= c.start
        || !c.quote?.trim() || source.text.slice(c.start, c.end) !== c.quote) throw new TypeError(`Unlocatable citation in observation ${i + 1}`);
      const normalized = visibleProse(source.text, { format: source.format ?? "markdown", quotedRanges: source.quoted_ranges ?? [], bodyRange: bodyRange(source.text) });
      if (normalized.exclusions.some((s) => c.start >= s.start && c.end <= s.end)
        || normalized.quotations.some((s) => c.start >= s.start && c.end <= s.end)) throw new TypeError("Citation points only at excluded or quoted material");
    }
    return { id: `o${String(i + 1).padStart(3, "0")}`, dimensions: [...new Set(o.dimensions)], description: o.description,
      citations: o.citations, interpretation: "advisory" };
  });
  const coverage = COVERAGE_DIMENSIONS.map((dimension) => {
    const refs = obs.filter((o) => o.dimensions.includes(dimension)).map((o) => o.id);
    const counters = measured.measurements.filter((m) => MEASUREMENT_DIMENSIONS[m.id]?.includes(dimension) && measured.corpus_words > 0).map((m) => m.id);
    return { dimension, status: refs.length ? "described" : counters.length ? "rated" : "unresolved", observation_ids: refs, measurement_ids: counters,
      reason: refs.length || counters.length ? null : unresolved.find((u) => u.dimension === dimension)?.reason || "No supported semantic observation; do not invent a habit." };
  });
  return { schema: PROFILE_V3, id, measured, observations: obs, coverage,
    provenance: { corpus_digest: sha256(JSON.stringify(measured.samples.map((s) => [s.id, s.digest]))), renderer },
    limits: ["Counts describe this selected evidence, not mandatory quotas.", "Zero observations are not a permanent prohibition.", "Semantic observations are cited interpretations, not proof of resemblance."] };
}

export function validateProfileV3(profile, { samples } = {}) {
  const errors = [];
  if (profile?.schema !== PROFILE_V3 || !profile.id || profile.measured?.schema !== MEASUREMENTS_V2) return ["Expected voice-profile/3 with measurements/2"];
  const m = profile.measured;
  if (!Array.isArray(m.samples) || !Array.isArray(m.measurements) || !Array.isArray(profile.observations) || !Array.isArray(profile.coverage)) return ["Missing profile arrays"];
  if (m.samples.some((s) => !s || !Array.isArray(s.measurements) || !Number.isInteger(s.words) || s.words <= 0 || !s.id || !/^[a-f0-9]{64}$/.test(s.digest))
    || m.measurements.some((r) => !r || typeof r !== "object")
    || profile.observations.some((o) => !o || !Array.isArray(o.dimensions) || !Array.isArray(o.citations))
    || profile.coverage.some((r) => !r || typeof r !== "object")) return ["Malformed profile rows"];
  if (m.normalization !== NORMALIZATION_VERSION) errors.push("Unsupported normalization version");
  const sampleIds = new Set(m.samples.map((s) => s.id));
  if (sampleIds.size !== m.samples.length || m.sample_count !== m.samples.length) errors.push("Invalid sample identity/count");
  if (m.corpus_words !== m.samples.reduce((n, s) => n + s.words, 0)) errors.push("Invalid corpus word arithmetic");
  if (!Array.isArray(m.groups) || m.groups.some((g) => !Array.isArray(g.samples))) return ["Malformed measurement groups"];
  const expectedGroupKeys = [...new Set(m.samples.map((s) => JSON.stringify([s.register, s.form])))].sort();
  const expectedGroups = expectedGroupKeys.map((key) => {
    const [register, form] = JSON.parse(key), members = m.samples.filter((s) => s.register === register && s.form === form);
    const words = members.reduce((n, s) => n + s.words, 0);
    return { register, form, samples: members.map((s) => s.id), words,
      support: members.length >= PROFILE_FLOOR.pieces && words >= PROFILE_FLOOR.words ? "supported" : "limited-evidence" };
  });
  if (!jsonEqual(m.groups, expectedGroups)) errors.push("Invalid group distribution/support");
  const expectedSupport = !m.samples.length ? "preference-only" : expectedGroups.length === 1 && expectedGroups[0].support === "supported" ? "supported" : "limited-evidence";
  if (m.support !== expectedSupport) errors.push("Invalid evidence support status");
  if (m.measurements.length !== CURRENT_MEASUREMENT_RULES.length || new Set(m.measurements.map((r) => r.id)).size !== m.measurements.length) errors.push("Missing or duplicate counters");
  for (const rule of CURRENT_MEASUREMENT_RULES) {
    const r = m.measurements.find((r) => r.id === rule.id);
    const rows = m.samples.map((s) => s.measurements?.find((r) => r.id === rule.id));
    if (!r || rows.some((r) => !r)) { errors.push(`Missing counter ${rule.id}`); continue; }
    for (const [i, row] of rows.entries()) {
      if (!Number.isInteger(row.count) || row.count < 0 || !Number.isInteger(m.samples[i].words) || m.samples[i].words <= 0
        || row.per_1000_words !== rate(row.count, m.samples[i].words) || !Array.isArray(row.occurrences) || row.occurrences.length !== row.count) errors.push(`Invalid per-piece arithmetic ${rule.id}`);
    }
    const count = rows.reduce((n, r) => n + r.count, 0);
    if (r.count !== count || r.per_1000_words !== rate(count, m.corpus_words)) errors.push(`Invalid rate arithmetic ${rule.id}`);
    if (r.counting_rule !== rule.counting_rule || r.interpretation !== "advisory") errors.push(`Invalid counting rule/interpretation ${rule.id}`);
    if (!jsonEqual(r.distribution, distribution(rows.map((r) => r.per_1000_words)))) errors.push(`Invalid distribution ${rule.id}`);
    const expected = expectedGroups.map((g) => ({ register: g.register, form: g.form,
      distribution: distribution(m.samples.filter((s) => g.samples.includes(s.id)).map((s) => s.measurements.find((r) => r.id === rule.id)?.per_1000_words)) }));
    if (!jsonEqual(r.groups, expected)) errors.push(`Invalid grouped distribution ${rule.id}`);
    if (r.observed_absence !== (m.corpus_words > 0 && count === 0)) errors.push(`Invalid absence claim ${rule.id}`);
  }
  const obsIds = new Set(profile.observations.map((o) => o.id));
  if (obsIds.size !== profile.observations.length) errors.push("Duplicate observation IDs");
  for (const o of profile.observations) {
    if (!o.description?.trim() || o.interpretation !== "advisory" || !o.citations?.length
      || !o.dimensions?.length || o.dimensions.some((d) => !COVERAGE_DIMENSIONS.includes(d))) errors.push(`Invalid observation ${o.id}`);
    if (o.citations?.some((c) => !sampleIds.has(c.file) || !c.quote?.trim() || !Number.isInteger(c.start) || !Number.isInteger(c.end) || c.start < 0 || c.end <= c.start)) errors.push(`Invalid citation ${o.id}`);
  }
  if (profile.coverage.length !== COVERAGE_DIMENSIONS.length) errors.push("Missing coverage dimension");
  for (const dimension of COVERAGE_DIMENSIONS) {
    const rows = profile.coverage.filter((r) => r.dimension === dimension), r = rows[0];
    if (rows.length !== 1) { errors.push(`Missing or duplicate coverage ${dimension}`); continue; }
    const expectedObs = profile.observations.filter((o) => o.dimensions?.includes(dimension)).map((o) => o.id);
    const expectedMeasures = m.measurements.filter((r) => m.corpus_words > 0 && MEASUREMENT_DIMENSIONS[r.id]?.includes(dimension)).map((r) => r.id);
    if (!jsonEqual(r.observation_ids, expectedObs) || !jsonEqual(r.measurement_ids, expectedMeasures)) errors.push(`Dangling or omitted coverage reference ${dimension}`);
    const status = expectedObs.length ? "described" : expectedMeasures.length ? "rated" : "unresolved";
    if (r.status !== status || (status === "unresolved" && !r.reason?.trim())) errors.push(`Invalid coverage status ${dimension}`);
  }
  if (profile.provenance?.corpus_digest !== sha256(JSON.stringify(m.samples.map((s) => [s.id, s.digest])))) errors.push("Invalid corpus digest");
  if (samples) {
    try {
      const selected = samples.filter((s) => sampleIds.has(s.id));
      const recounted = measureSamples(selected);
      if (!jsonEqual(recounted.samples, m.samples) || !jsonEqual(recounted.measurements, m.measurements)) errors.push("Independent source recount divergence or stale corpus");
      assembleProfileV3({ id: profile.id, samples: selected, observations: profile.observations });
    } catch (e) { errors.push(e.message); }
  }
  return errors;
}
