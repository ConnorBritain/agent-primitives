/** Resolve enabled companion plugins, never pick an arbitrary cached version. */
import { basename, dirname, join, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function installedCompanions(directory, adapter = {}, { env = process.env, exec = execFileSync } = {}) {
  const root = resolve(directory, "../../.."), marketplaceRoot = dirname(dirname(root));
  // Only consult a harness registry for its versioned plugin-cache layout.
  // Repository and loose-file installs use their adjacent dependencies instead.
  if (basename(dirname(root)) !== "prose-author" || basename(dirname(marketplaceRoot)) !== "cache"
    || !["codex", "claude"].includes(adapter.harness)) return {};
  const marketplace = basename(marketplaceRoot), found = {};
  try {
    const raw = JSON.parse(exec(adapter.executable ?? adapter.harness, ["plugin", "list", "--json"],
      { encoding: "utf8", env, timeout: 15000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
    const entries = adapter.harness === "codex" ? raw.installed : raw;
    if (!Array.isArray(entries)) return {};
    for (const name of ["prose-review", "prose-tell-scan"]) {
      const matches = entries.filter((e) => (e.pluginId ?? e.id) === `${name}@${marketplace}` && e.enabled === true
        && (adapter.harness !== "codex" || e.installed === true) && !e.errors?.length);
      if (matches.length !== 1) continue;
      const entry = matches[0];
      if (!/^[0-9A-Za-z.+-]+$/.test(entry.version ?? "")) continue;
      const expected = join(marketplaceRoot, name, entry.version);
      const path = adapter.harness === "claude" ? entry.installPath : expected;
      if (!path || realpathSync(path) !== realpathSync(expected)) continue;
      const manifest = JSON.parse(readFileSync(join(path, `.${adapter.harness}-plugin/plugin.json`), "utf8"));
      if (manifest.name === name && manifest.version === entry.version) found[name] = path;
    }
  } catch { /* Missing/incompatible registry stays unavailable, not a cache guess. */ }
  return found;
}
