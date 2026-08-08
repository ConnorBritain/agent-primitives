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
  // The disjointness rule. A dispatch that emits both has produced an artefact whose
  // status is ambiguous, and the ambiguity resolves differently depending on which
  // fence a caller happens to read first.
  if (parsed.hadDraftFence && parsed.hadJsonFence) {
    err("emitted both a draft and a refusal — the contract permits exactly one");
  }

  if (parsed.hadJsonFence) {
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
