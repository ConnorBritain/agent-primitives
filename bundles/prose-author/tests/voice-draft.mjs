/**
 * voice-draft — output contract check, and the firewall check that matters more.
 *
 * The output contract is small: one fence, either a draft or a refusal, never both.
 * It gets a checker anyway because "never both" is the property that stops a caller
 * reading a draft off a refusal, and it is invisible to anyone eyeballing output.
 *
 * The firewall check is the substantive one. `voice-draft` ships with `tools: []` so
 * it CANNOT reach the corpus — but no test harness here can reproduce an empty tool
 * allowlist, so the property is verified on the artefact instead: any long n-gram
 * shared between a draft and the corpus, that the profile did not quote, arrived by
 * some path other than the profile. That is the one claim the primitive's whole design
 * rests on, and it would otherwise be enforced only by a sentence in a prompt.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { parseFences } from "./fences.mjs";

export const SCHEMA_ID = "voice-draft/1";

/** A dispatch's output, named in this primitive's own terms. */
export function parseDraft(text) {
  const f = parseFences(text);
  return {
    draft: f.markdown,
    json: f.json,
    jsonError: f.jsonError,
    hadDraftFence: f.hadMarkdown,
    hadJsonFence: f.hadJson,
  };
}

/**
 * @returns {{ok: boolean, refusal: boolean, errors: string[]}}
 */
export function validateDraft(parsed) {
  const errors = [];
  const err = (m) => errors.push(m);

  if (!parsed.hadDraftFence && !parsed.hadJsonFence) {
    return { ok: false, refusal: false, errors: ["no fence emitted"] };
  }
  // The disjointness rule is about a draft and a REFUSAL, not about two fences: a draft
  // may legally carry an omission record. What must never coexist is a piece of prose and
  // a statement that no prose was produced, because the artefact's status would then
  // depend on which fence a caller read first. That case is checked below, where the
  // json's own shape says which of the two it is.

  // A json fence means one of two different things depending on whether a draft came
  // with it: alone it is a refusal, alongside a draft it is an omission record. Keeping
  // the shapes disjoint is what stops a caller reading a draft off a refusal, and the
  // draft-present branch is checked first so an omission record is never mistaken for one.
  if (parsed.hadJsonFence && parsed.hadDraftFence) {
    if (parsed.json === null) {
      err(`omission record does not parse: ${parsed.jsonError}`);
    } else {
      const keys = Object.keys(parsed.json).sort();
      if (parsed.json.schema !== SCHEMA_ID) err(`schema must be "${SCHEMA_ID}"`);
      if (Object.hasOwn(parsed.json, "refused")) {
        err("a draft and a refusal cannot both be emitted");
      }
      // Either list may be absent; both absent means the fence should not exist.
      const has = (k) => Object.hasOwn(parsed.json, k);
      if (!has("omitted") && !has("claims")) {
        err("record carries neither omitted nor claims — drop the fence entirely when there is nothing to report");
      }
      for (const [key, fields] of [["omitted", ["habit", "why"]], ["claims", ["claim", "where"]]]) {
        if (!has(key)) continue;
        const list = parsed.json[key];
        if (!Array.isArray(list) || list.length === 0) {
          err(`${key} must be a non-empty array — omit the key rather than reporting nothing`);
          continue;
        }
        for (const [i, entry] of list.entries()) {
          if (!entry || typeof entry !== "object" || fields.some((f) => typeof entry[f] !== "string" || !entry[f].trim())) {
            err(`${key}[${i}] needs ${fields.join(" and ")}, both non-empty strings`);
          }
        }
      }
      const allowed = ["claims", "omitted", "schema"];
      const extra = keys.filter((k) => !allowed.includes(k));
      if (extra.length) err(`record carries keys outside the contract: ${extra.join(", ")}`);
    }
  } else if (parsed.hadJsonFence) {
    if (parsed.json === null) {
      err(`json fence does not parse: ${parsed.jsonError}`);
      return { ok: false, refusal: true, errors };
    }
    const keys = Object.keys(parsed.json).sort();
    if (parsed.json.schema !== SCHEMA_ID) err(`schema must be "${SCHEMA_ID}"`);
    if (typeof parsed.json.refused !== "string" || !parsed.json.refused.trim()) {
      err("refused must be a non-empty reason string");
    }
    if (JSON.stringify(keys) !== JSON.stringify(["refused", "schema"])) {
      err(`refusal carries keys outside the contract: ${keys.join(", ")}`);
    }
    return { ok: errors.length === 0, refusal: true, errors };
  }

  const d = parsed.draft ?? "";
  if (!d.trim()) err("draft fence is empty");
  // The three claims the primitive is forbidden to make, checked on the artefact
  // rather than trusted from the prompt.
  if (/\bdetector\b/i.test(d)) err("draft mentions a detector");
  if (/sounds like (the author|you)|indistinguishable from/i.test(d)) {
    err("draft claims resemblance on the author's behalf");
  }
  if (/\b(voice profile|the profile says|section 8)\b/i.test(d)) {
    err("draft refers to the profile it was written from");
  }
  return { ok: errors.length === 0, refusal: false, errors };
}

/**
 * Placeholder and example domains. A draft containing one of these has invented a
 * citation rather than omitted a habit.
 */
export const PLACEHOLDER_HOSTS = [
  "example.com", "example.org", "example.net", "placeholder.", "yoursite.",
  "somewhere.com", "link.here", "url.here", "domain.com", "site.com",
];

/**
 * Fabricated-citation check.
 *
 * Exists because of a measured regression, not a hypothetical. FU-16 gave profiles a
 * frequency vocabulary so a drafter would know how often to use a habit. A follow-up
 * edit — "a stated frequency is an instruction, not a ceiling" — then pushed the drafter
 * to honour a rate of `throughout` for a habit that needs real links. It produced
 * `https://example.com/…` placeholders. Zero fabricated URLs before that edit, two after.
 *
 * A fabricated link looks exactly like a real one in a draft, so this is the failure a
 * human reader is least likely to catch and most damaged by. Deterministic and cheap.
 *
 * Deliberately narrow: it catches placeholder hosts, not wrong-but-plausible URLs, which
 * nothing offline can check. Absence of a finding is not proof the citations are real.
 */
export function findFabricatedCitations(draft) {
  const urls = (draft ?? "").match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  return urls.filter((u) => PLACEHOLDER_HOSTS.some((h) => u.toLowerCase().includes(h)));
}

const words = (t) => t.toLowerCase().match(/[a-z']+/g) ?? [];
const ngrams = (ws, n) => new Set(
  Array.from({ length: Math.max(0, ws.length - n + 1) }, (_, i) => ws.slice(i, i + n).join(" ")),
);
const stripFrontmatter = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, "");

/**
 * Long n-grams a draft shares with the corpus that the profile never quoted.
 *
 * Non-empty means corpus text reached the draft by some path other than the profile —
 * either the firewall leaked, or the harness handed over something it should not have.
 * The profile's own quotations are subtracted because the drafter is *supposed* to have
 * those; they arrived legitimately.
 */
export function corpusLeakage({ draft, corpusDir, profileText, n = 6 }) {
  let corpusWords = [];
  for (const f of readdirSync(corpusDir).filter((f) => /\.(txt|md)$/.test(f))) {
    if (/^readme/i.test(f)) continue;
    corpusWords = corpusWords.concat(words(stripFrontmatter(readFileSync(join(corpusDir, f), "utf8"))));
  }
  const corpus = ngrams(corpusWords, n);
  const viaProfile = ngrams(words(profileText), n);
  const inDraft = ngrams(words(draft), n);
  const leaked = [...inDraft].filter((g) => corpus.has(g) && !viaProfile.has(g));
  return { leaked, count: leaked.length };
}

export function loadRun(runDir) {
  const raw = join(runDir, "raw");
  if (!existsSync(raw)) return [];
  return readdirSync(raw).filter((f) => f.endsWith(".md")).sort()
    .map((f) => ({ name: f, ...parseDraft(readFileSync(join(raw, f), "utf8")) }));
}
