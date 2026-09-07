/** Harness-independent pointers. Never imports prose into the numerical store. */
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync, unlinkSync, renameSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { sha256, validateProfileV3 } from "./profile-v3.mjs";

export const IDENTITY_SCHEMA = "voice-identity-registry/1";
const idOK = (id) => typeof id === "string" && id !== "none" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id);
const own = (o, key) => Object.hasOwn(o, key);
const pathKeys = ["samples_dir", "profile_file", "preference_store", "history_directory"];
export function identityDirectory(env = process.env, home = homedir()) {
  const path = env.PROSE_IDENTITY_DIR || join(home, ".config", "prose-author", "identities");
  if (!isAbsolute(path)) throw new TypeError("PROSE_IDENTITY_DIR must be absolute");
  return path;
}
const empty = () => ({ schema: IDENTITY_SCHEMA, revision: 0, default_identity: null, identities: [] });
function validateEntry(entry) {
  if (!entry || !idOK(entry.id) || Object.keys(entry).some((k) => !["id", ...pathKeys, "profile_digest", "history_identity"].includes(k))) throw new TypeError("Invalid identity entry or unknown field");
  for (const key of pathKeys) if (entry[key] !== null && (typeof entry[key] !== "string" || !isAbsolute(entry[key]))) throw new TypeError(`${key} must be an absolute path or null`);
  if (!idOK(entry.history_identity)) throw new TypeError("Invalid history identity");
  if (entry.profile_file === null ? entry.profile_digest !== null : !/^[a-f0-9]{64}$/.test(entry.profile_digest ?? "")) throw new TypeError("Profile requires a pinned digest");
}
function validateState(state) {
  if (state?.schema !== IDENTITY_SCHEMA) throw new TypeError("Unsupported identity registry version; no automatic migration");
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !Array.isArray(state.identities)) throw new TypeError("Malformed identity registry");
  state.identities.forEach(validateEntry);
  if (new Set(state.identities.map((e) => e.id)).size !== state.identities.length) throw new TypeError("Duplicate identity");
  if (state.default_identity !== null && !state.identities.some((e) => e.id === state.default_identity)) throw new TypeError("Dangling default identity");
  return state;
}
export function readIdentities(directory = identityDirectory()) {
  const path = join(directory, "current.json");
  if (!existsSync(path)) return empty();
  const pointer = JSON.parse(readFileSync(path, "utf8"));
  if (!/^\d+-[a-f0-9]{64}\.json$/.test(pointer.file ?? "")) throw new TypeError("Invalid registry pointer");
  const bytes = readFileSync(join(directory, "revisions", pointer.file), "utf8");
  const state = validateState(JSON.parse(bytes));
  if (`${state.revision}-${sha256(bytes)}.json` !== pointer.file) throw new TypeError("Registry digest mismatch");
  return state;
}
function update(directory, expectedRevision, change) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError("Expected registry revision required");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, ".writer.lock");
  let fd;
  try { fd = openSync(lock, "wx", 0o600); }
  catch (e) { if (e.code === "EEXIST") throw new Error("Identity registry has another or interrupted writer; inspect before recovery"); throw e; }
  try {
    const state = readIdentities(directory);
    if (state.revision !== expectedRevision) throw new Error("Stale registry revision; reread before changing identity");
    change(state);
    state.revision++;
    validateState(state);
    const bytes = JSON.stringify(state, null, 2) + "\n", file = `${state.revision}-${sha256(bytes)}.json`;
    mkdirSync(join(directory, "revisions"), { recursive: true, mode: 0o700 });
    const target = join(directory, "revisions", file);
    if (existsSync(target)) { if (readFileSync(target, "utf8") !== bytes) throw new Error("Existing registry revision differs"); }
    else writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
    const temp = join(directory, `.pointer-${randomUUID()}.json`);
    try {
      writeFileSync(temp, JSON.stringify({ file }) + "\n", { flag: "wx", mode: 0o600 });
      renameSync(temp, join(directory, "current.json"));
    } finally { if (existsSync(temp)) unlinkSync(temp); }
    return state;
  } finally { closeSync(fd); unlinkSync(lock); }
}
function checkedProfile(path) {
  const bytes = readFileSync(path, "utf8"), profile = JSON.parse(bytes);
  const errors = validateProfileV3(profile);
  if (errors.length) throw new TypeError(`Shared profile requires valid voice-profile/3: ${errors.join("; ")}`);
  return { bytes, profile, digest: sha256(bytes) };
}
export function registerIdentity(directory, config, revision) {
  if (!config || Object.keys(config).some((k) => !["id", ...pathKeys, "history_identity"].includes(k))) throw new TypeError("Unknown identity configuration field");
  const entry = { ...Object.fromEntries(pathKeys.map((k) => [k, null])), ...config,
    history_identity: config.history_identity ?? config.id, profile_digest: null };
  // Validate paths before opening a caller-specified profile.
  validateEntry({ ...entry, profile_digest: entry.profile_file === null ? null : "0".repeat(64) });
  if (entry.profile_file !== null) entry.profile_digest = checkedProfile(entry.profile_file).digest;
  return update(directory, revision, (state) => {
    const index = state.identities.findIndex((e) => e.id === entry.id);
    if (index < 0) state.identities.push(entry); else state.identities[index] = entry;
  });
}
export function selectIdentity(directory, id, revision) {
  return update(directory, revision, (state) => { state.default_identity = id; });
}
export function resolveIdentity(directory = identityDirectory(), id) {
  const state = readIdentities(directory);
  if (id === null) return null;
  const selected = id ?? state.default_identity;
  if (selected === null) {
    if (state.identities.length) throw new TypeError("No default writing identity selected; choose an identity or opt out");
    return null;
  }
  const entry = state.identities.find((e) => e.id === selected);
  if (!entry) throw new TypeError(`Unknown writing identity: ${selected}`);
  return { ...entry, registry_directory: directory, registry_revision: state.revision };
}
export function publishIdentityProfile(directory, id, file, revision) {
  const profile = checkedProfile(file);
  return update(directory, revision, (state) => {
    const entry = state.identities.find((e) => e.id === id);
    if (!entry) throw new TypeError("Unknown writing identity");
    const root = join(directory, "profiles", id), target = join(root, `${profile.digest}.json`);
    mkdirSync(root, { recursive: true, mode: 0o700 });
    if (existsSync(target)) { if (readFileSync(target, "utf8") !== profile.bytes) throw new Error("Pinned profile bytes differ"); }
    else writeFileSync(target, profile.bytes, { flag: "wx", mode: 0o600 });
    entry.profile_file = target; entry.profile_digest = profile.digest;
  });
}

/** Apply once, before job snapshotting. Explicit foreign evidence opts out of defaults. */
export function resolveWritingIdentity(job) {
  if (job.writing_identity === null) return job;
  const evidenceKeys = ["profile", "profile_file", "samples", "samples_dir", "preferences", "preference_store"];
  if (!own(job, "writing_identity") && evidenceKeys.some((k) => own(job, k))) return job;
  const directory = job.identity_registry ?? identityDirectory();
  if (!isAbsolute(directory)) throw new TypeError("identity_registry must be absolute");
  const identity = resolveIdentity(directory, job.writing_identity);
  if (!identity) return job;
  const resolved = { ...job };
  // A task-specific corpus/profile pair is never half-filled with another pair.
  if (!["profile", "profile_file", "samples", "samples_dir"].some((k) => own(job, k))) {
    if (identity.profile_file && job.profile_policy !== "none") {
      const pinned = checkedProfile(identity.profile_file);
      if (pinned.digest !== identity.profile_digest) throw new TypeError("Pinned profile changed; publish a new profile revision");
      resolved.profile = pinned.profile;
    }
    if (identity.samples_dir) {
      if (!existsSync(join(identity.samples_dir, "corpus", "human"))) throw new TypeError("Registered human corpus is unavailable");
      resolved.samples_dir = identity.samples_dir;
    }
  }
  if (!own(job, "preferences") && !own(job, "preference_store") && identity.preference_store) resolved.preference_store = identity.preference_store;
  if (!own(job, "telemetry") && identity.history_directory) resolved.telemetry = { identity: identity.history_identity, directory: identity.history_directory };
  if (job.telemetry && (job.telemetry.identity !== identity.history_identity || (job.telemetry.directory && resolve(job.telemetry.directory) !== identity.history_directory))) throw new TypeError("Telemetry identity conflicts with writing identity; opt out or select the intended identity");
  if (job.telemetry && !job.telemetry.directory) resolved.telemetry = { ...job.telemetry, directory: identity.history_directory };
  resolved.identity_resolution = identity;
  delete resolved.writing_identity;
  delete resolved.identity_registry;
  return resolved;
}

export function identityMain(args) {
  const [op, ...rest] = args;
  const options = { locate: [], list: [], resolve: ["--identity"], register: ["--config", "--revision"],
    select: ["--identity", "--revision"], "publish-profile": ["--identity", "--profile", "--revision"] };
  if (!own(options, op)) throw new TypeError("identity: locate, list, resolve, register, select or publish-profile");
  const flags = new Map();
  for (let i = 0; i < rest.length; i += 2) {
    if (!["--registry", ...options[op]].includes(rest[i]) || flags.has(rest[i]) || !rest[i + 1] || rest[i + 1].startsWith("--")) throw new TypeError("Unknown, duplicate or valueless identity flag");
    flags.set(rest[i], rest[i + 1]);
  }
  const required = (k) => { if (!flags.has(k)) throw new TypeError(`Missing ${k}`); return flags.get(k); };
  const directory = flags.has("--registry") ? resolve(flags.get("--registry")) : identityDirectory();
  if (op === "locate") return { directory, exists: existsSync(join(directory, "current.json")) };
  if (op === "list") return readIdentities(directory);
  if (op === "resolve") return resolveIdentity(directory, flags.get("--identity"));
  const revision = Number(required("--revision"));
  if (op === "register") return registerIdentity(directory, JSON.parse(readFileSync(required("--config"), "utf8")), revision);
  if (op === "select") return selectIdentity(directory, required("--identity") === "none" ? null : required("--identity"), revision);
  return publishIdentityProfile(directory, required("--identity"), resolve(required("--profile")), revision);
}
