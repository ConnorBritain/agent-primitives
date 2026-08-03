/**
 * Phase 0 — intake. Resolve which profile governs a document, then load the
 * catalog, allowlist, and thresholds that profile implies.
 *
 * The register decides the thresholds, and getting the register wrong makes
 * every downstream number wrong in the same direction. A technical reference is
 * SUPPOSED to be rhythmically uniform; an essay is not. One global configuration
 * would have to be wrong for most of what anyone writes.
 *
 * Profiles inherit from `_base` and override it. The catalog is never duplicated
 * per profile — that guarantees drift between them within about two edits.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

export const BASE_PROFILE = "_base";

/* ------------------------------------------------------------------ globbing */

/** Minimal glob → RegExp. Supports `**`, `*`, `?`, and `{a,b}`. No dependencies. */
export function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**/` may match zero directories, so the slash is part of the option.
        if (glob[i + 2] === "/") { out += "(?:.*/)?"; i += 2; }
        else { out += ".*"; i += 1; }
      } else out += "[^/]*";
    } else if (c === "?") out += "[^/]";
    else if (c === "{") out += "(?:";
    else if (c === "}") out += ")";
    else if (c === "," ) out += "|";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

/* --------------------------------------------------------------- config load */

/** Project opt-in config. Absent is normal and means "no path rules". */
export function loadConfig(projectRoot) {
  const path = join(projectRoot, ".claude", "humanizer.json");
  if (!existsSync(path)) return { path: null, config: {} };
  try {
    return { path, config: JSON.parse(readFileSync(path, "utf8")) };
  } catch (err) {
    // Asymmetric failure, same rule the repo's hooks follow: a broken config
    // warns and gets ignored. It must not take the tool down with it.
    process.stderr.write(`warning: ignoring ${path} — ${err.message}\n`);
    return { path, config: {}, error: err.message };
  }
}

/** `profile:` in the document's own YAML frontmatter, if it has any. */
export function frontmatterProfile(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) return null;
  const line = m[1].match(/^\s*profile\s*:\s*["']?([\w.-]+)["']?\s*$/m);
  return line ? line[1] : null;
}

/* ----------------------------------------------------------- profile lookup */

/**
 * Where profiles may live, most specific first. A user profile directory
 * overrides the shipped one per profile, not wholesale — so keeping a local
 * `essay` does not cost you the shipped `technical`.
 */
export function profileSearchPath({ profilesDir, projectRoot, bundleRoot }) {
  const dirs = [];
  if (profilesDir) dirs.push(resolve(profilesDir));
  if (projectRoot) dirs.push(join(projectRoot, ".claude", "humanizer", "profiles"));
  if (bundleRoot) dirs.push(join(bundleRoot, "profiles"));
  return dirs.filter((d, i) => dirs.indexOf(d) === i);
}

export function findProfileDir(name, searchPath) {
  for (const dir of searchPath) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function listProfiles(searchPath) {
  const seen = new Map();
  for (const dir of searchPath) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (!name.isDirectory() || seen.has(name.name)) continue;
      seen.set(name.name, join(dir, name.name));
    }
  }
  return seen;
}

/**
 * Resolve the governing profile for one file. Order is fixed and reported, so
 * the answer to "why did it use that profile?" is always in the output.
 */
export function resolveProfile({ file, text, explicit, config, searchPath, projectRoot }) {
  const available = listProfiles(searchPath);

  const pick = (name, how) => {
    if (!name) return null;
    if (!available.has(name)) {
      return { name: BASE_PROFILE, how: `${how} named "${name}", which does not exist`,
               fellBack: true, requested: name };
    }
    return { name, how, fellBack: false };
  };

  const fromFlag = pick(explicit, "--profile flag");
  if (fromFlag) return fromFlag;

  const fromDoc = pick(frontmatterProfile(text), "document frontmatter");
  if (fromDoc) return fromDoc;

  const rules = config.profiles || {};
  const rel = projectRoot ? relative(projectRoot, resolve(file)).split(sep).join("/") : file;
  for (const [glob, name] of Object.entries(rules)) {
    if (globToRegExp(glob).test(rel)) {
      const hit = pick(name, `path rule "${glob}" in .claude/humanizer.json`);
      if (hit) return hit;
    }
  }

  const fromDefault = pick(config.default, "`default` in .claude/humanizer.json");
  if (fromDefault) return fromDefault;

  return { name: BASE_PROFILE, how: "no profile matched", fellBack: true, requested: null };
}

/* ------------------------------------------------------------ catalog + rules */

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Merge the base catalog with a profile's overrides.
 *
 * A profile may: disable an entry (`"disable": ["delve"]`), change its severity,
 * or add entries of its own. It may not silently redefine a base pattern — an
 * override that changes the pattern gets a new id, because two different regexes
 * answering to one id is how a catalog becomes unauditable.
 */
export function mergeCatalog(base, override) {
  const entries = new Map();
  for (const e of base.entries || []) entries.set(e.id, { ...e, origin: BASE_PROFILE });

  const disable = new Set(override?.disable || []);
  for (const id of disable) {
    if (entries.has(id)) entries.set(id, { ...entries.get(id), disabled: true });
  }

  // Whole-category disable. The reason this exists rather than making people
  // list two dozen ids: the categories most likely to need switching off are
  // `tonal-inflation` and `corporate-register`, and they need switching off for
  // a specific and serious reason — several varieties of English, and several
  // teaching traditions, treat ornate formal register as correct writing. A
  // catalog built from one set of norms will read those as defects. Turning off
  // the category is the honest response; tuning individual words is not.
  const disabledCategories = new Set(override?.disable_categories || []);
  if (disabledCategories.size) {
    for (const [id, entry] of entries) {
      if (disabledCategories.has(entry.category)) entries.set(id, { ...entry, disabled: true });
    }
  }

  for (const [id, patch] of Object.entries(override?.adjust || {})) {
    if (!entries.has(id)) {
      process.stderr.write(`warning: profile adjusts unknown catalog entry "${id}"\n`);
      continue;
    }
    entries.set(id, { ...entries.get(id), ...patch, adjusted: true });
  }

  for (const e of override?.entries || []) {
    if (entries.has(e.id)) {
      process.stderr.write(
        `warning: profile entry "${e.id}" collides with a base entry — rename it\n`,
      );
      continue;
    }
    entries.set(e.id, { ...e, origin: "profile" });
  }

  return {
    ...base,
    entries: [...entries.values()].filter((e) => !e.disabled),
    disabled: [...entries.values()].filter((e) => e.disabled).map((e) => e.id),
    disabled_categories: [...disabledCategories],
  };
}

/** Allowlist terms, one per line, `#` comments. Base terms are inherited. */
export function loadAllowlist(paths) {
  const terms = new Set();
  for (const path of paths) {
    if (!path || !existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split("\n")) {
      const line = raw.replace(/#.*$/, "").trim().toLowerCase();
      if (line) terms.add(line);
    }
  }
  return terms;
}

/**
 * Load thresholds for a profile.
 *
 * Derived thresholds (from `thresholds.derived.json`, written by calibrate.mjs
 * off this register's human corpus) are the real thing. Fallback thresholds are
 * somebody's guess — ours — and the loaded object says which one it is on every
 * path, so the report cannot accidentally present a guess as a measurement.
 */
export function loadThresholds({ profileDir, baseDir }) {
  const derivedPath = profileDir && join(profileDir, "thresholds.derived.json");
  if (derivedPath && existsSync(derivedPath)) {
    const derived = readJson(derivedPath);
    return {
      ...derived,
      derived: true,
      source: derivedPath,
      // calibrate.mjs writes the sample count as `derived_from`; everything
      // downstream asks for `samples`. Without this the reader saw 0 samples,
      // printed a THIN CORPUS warning over perfectly good derived bands, and
      // then told the reader they were uncalibrated fallbacks. Wrong twice.
      samples: derived.samples ?? derived.derived_from ?? 0,
      confidence: derived.confidence || "unknown",
    };
  }

  const fallbackPaths = [
    profileDir && join(profileDir, "thresholds.json"),
    baseDir && join(baseDir, "thresholds.json"),
  ].filter((p) => p && existsSync(p));

  if (!fallbackPaths.length) {
    return { derived: false, source: null, confidence: "none", metrics: {}, catalog_density: {} };
  }

  // Profile fallback overlays base fallback, key by key.
  const merged = fallbackPaths.reduceRight((acc, p) => {
    const t = readJson(p);
    return {
      ...acc,
      ...t,
      metrics: { ...(acc.metrics || {}), ...(t.metrics || {}) },
      catalog_density: { ...(acc.catalog_density || {}), ...(t.catalog_density || {}) },
    };
  }, {});

  return { ...merged, derived: false, source: fallbackPaths[0], confidence: "none", samples: 0 };
}

/** Optional per-profile metadata: medium, description, what it is for. */
export function loadProfileMeta(profileDir) {
  const path = profileDir && join(profileDir, "profile.json");
  if (!path || !existsSync(path)) return {};
  try {
    return readJson(path);
  } catch (err) {
    process.stderr.write(`warning: ignoring ${path} — ${err.message}\n`);
    return {};
  }
}

/**
 * Assemble everything Phase 0 owes Phase 1.
 */
export function loadProfile(name, searchPath, { extraAllow = [] } = {}) {
  const baseDir = findProfileDir(BASE_PROFILE, searchPath);
  if (!baseDir) throw new Error(`no "${BASE_PROFILE}" profile found on ${searchPath.join(", ")}`);

  const profileDir = name === BASE_PROFILE ? baseDir : findProfileDir(name, searchPath);
  const baseCatalog = readJson(join(baseDir, "catalog.json"));

  let override = null;
  const overridePath = profileDir && join(profileDir, "catalog.json");
  if (profileDir !== baseDir && overridePath && existsSync(overridePath)) {
    override = readJson(overridePath);
  }

  const allow = loadAllowlist([
    join(baseDir, "allow.txt"),
    profileDir && profileDir !== baseDir ? join(profileDir, "allow.txt") : null,
  ]);
  for (const term of extraAllow) allow.add(term.trim().toLowerCase());

  return {
    name,
    dir: profileDir,
    baseDir,
    meta: loadProfileMeta(profileDir),
    catalog: mergeCatalog(baseCatalog, override),
    allow,
    thresholds: loadThresholds({ profileDir, baseDir }),
  };
}
