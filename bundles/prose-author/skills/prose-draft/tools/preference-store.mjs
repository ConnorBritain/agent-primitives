/** Local immutable revision storage. One exclusive writer; atomic current pointer. */
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync, unlinkSync, renameSync, existsSync, readdirSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { initPreferencesV2, validatePreferencesV2, digest, applyPreferencesV2, undoPreferencesV2 } from "./preferences-v2.mjs";

/** Shared across harnesses; task-local output folders are never implicit stores. */
export function defaultPreferenceDirectory(env = process.env, home = homedir()) {
  const configured = env.PROSE_PREFERENCES_DIR;
  if (configured && !isAbsolute(configured)) throw new TypeError("PROSE_PREFERENCES_DIR must be an absolute persistent path");
  return configured || join(home, ".config", "prose-author", "preferences");
}

function valid(p) { const errors = validatePreferencesV2(p); if (errors.length) throw new TypeError(errors.join("; ")); return p; }
const revisionName = (p) => `${String(p.revision).padStart(6, "0")}-${digest(p)}.json`;
export function readPreferenceStore(directory) {
  const pointer = JSON.parse(readFileSync(join(directory, "current.json"), "utf8"));
  if (!/^\d{6,}-[a-f0-9]{64}\.json$/.test(pointer.file)) throw new TypeError("Invalid preference pointer");
  const p = valid(JSON.parse(readFileSync(join(directory, "revisions", pointer.file), "utf8")));
  if (revisionName(p) !== pointer.file) throw new TypeError("Preference revision digest mismatch");
  return p;
}

function withLock(directory, action) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, ".writer.lock");
  let fd;
  try { fd = openSync(path, "wx", 0o600); }
  catch (e) { if (e.code === "EEXIST") throw new Error("Preference store has another or interrupted writer; inspect the lock before recovery"); throw e; }
  try { return action(); } finally { closeSync(fd); unlinkSync(path); }
}

function persist(directory, p) {
  valid(p);
  mkdirSync(join(directory, "revisions"), { recursive: true, mode: 0o700 });
  const file = revisionName(p), revisionPath = join(directory, "revisions", file);
  const bytes = `${JSON.stringify(p, null, 2)}\n`;
  // An interrupted prior save may already have created this exact immutable revision.
  if (existsSync(revisionPath)) {
    if (readFileSync(revisionPath, "utf8") !== bytes) throw new Error("Existing revision bytes diverge");
  } else writeFileSync(revisionPath, bytes, { flag: "wx", mode: 0o600 });
  const temporary = join(directory, `.pointer-${randomUUID()}.json`);
  try {
    writeFileSync(temporary, `${JSON.stringify({ file })}\n`, { flag: "wx", mode: 0o600 });
    renameSync(temporary, join(directory, "current.json"));
  } finally { if (existsSync(temporary)) unlinkSync(temporary); }
  return p;
}

export function initPreferenceStore(directory, id) {
  return withLock(directory, () => {
    if (!existsSync(join(directory, "current.json"))) return persist(directory, initPreferencesV2(id));
    const current = readPreferenceStore(directory);
    if (current.id !== id) throw new TypeError("Existing preference store belongs to a different identity");
    return current;
  });
}
export function applyPreferenceStore(directory, proposal, options) {
  return withLock(directory, () => {
    const current = readPreferenceStore(directory), result = applyPreferencesV2(current, proposal, options);
    if (result.status === "saved") persist(directory, result.preferences);
    return result;
  });
}
export function undoPreferenceStore(directory) {
  return withLock(directory, () => {
    const current = readPreferenceStore(directory);
    if (current.revision === 1) throw new Error("No preference change to undo");
    const file = readdirSync(join(directory, "revisions")).find((f) => f.endsWith(`-${current.parent_digest}.json`));
    if (!file) throw new Error("Previous revision is missing; cannot invent undo history");
    const previous = JSON.parse(readFileSync(join(directory, "revisions", file), "utf8"));
    return persist(directory, undoPreferencesV2(current, previous));
  });
}
