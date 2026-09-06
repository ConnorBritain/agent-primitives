/** Explicit mechanical instructions are enforceable; learned distributions are not. */
import { visibleProse, wordCount, locatedMatches } from "./visible-prose.mjs";
import { CURRENT_MEASUREMENT_RULES, rate, sha256 } from "./profile-v3.mjs";

export const RULE_KINDS = ["prohibited-phrase", "required-text", "punctuation", "word-limit", "count-range", "semantic"];
const counters = new Map(CURRENT_MEASUREMENT_RULES.map((r) => [r.id, r]));
const integer = (n) => Number.isInteger(n) && n >= 0;
const nonempty = (s) => typeof s === "string" && s.trim().length > 0;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function ruleErrors(rule) {
  if (!rule || !nonempty(rule.id) || !RULE_KINDS.includes(rule.kind)) return ["Rule needs id and supported kind"];
  const errors = [];
  const allowed = ["id", "kind", "directive", ...({
    "prohibited-phrase": ["text", "case_sensitive", "substring"], "required-text": ["text", "case_sensitive"],
    punctuation: ["characters", "minimum", "maximum"], "word-limit": ["minimum", "maximum"],
    "count-range": ["minimum", "maximum", "measurement_id", "unit"], semantic: [],
  }[rule.kind])];
  if (Object.keys(rule).some((k) => !allowed.includes(k))) errors.push("Unknown rule field");
  if (!nonempty(rule.directive)) errors.push("Rule needs the user's directive");
  if (["prohibited-phrase", "required-text"].includes(rule.kind) && !nonempty(rule.text)) errors.push("Literal text is required");
  if (rule.case_sensitive !== undefined && typeof rule.case_sensitive !== "boolean") errors.push("case_sensitive must be boolean");
  if (rule.substring !== undefined && typeof rule.substring !== "boolean") errors.push("substring must be boolean");
  if (rule.kind === "punctuation" && (!nonempty(rule.characters) || /[^\p{P}\p{S}]/u.test(rule.characters))) errors.push("Punctuation rules need literal punctuation/symbol characters");
  if (["punctuation", "word-limit", "count-range"].includes(rule.kind)) {
    const bound = rule.kind === "count-range" && rule.unit === "per-1000-words" ? (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 : integer;
    if (!bound(rule.minimum) || !(rule.maximum === null || bound(rule.maximum)) || (rule.maximum !== null && rule.minimum > rule.maximum)) errors.push("Count bounds need non-negative minimum and maximum (integers for absolute counts, or null upper bound)");
  }
  if (rule.kind === "count-range") {
    if (!counters.has(rule.measurement_id)) errors.push("Unknown deterministic measurement");
    if (!["per-document", "per-1000-words"].includes(rule.unit)) errors.push("Explicit count unit is required");
  }
  return errors;
}

export function checkRules(draft, rules, { format = "markdown" } = {}) {
  if (typeof draft !== "string" || !Array.isArray(rules)) throw new TypeError("Expected draft and rules");
  if (new Set(rules.map((r) => r.id)).size !== rules.length) throw new TypeError("Duplicate rule IDs");
  const normalized = visibleProse(draft, { format }), text = normalized.visible;
  const words = wordCount(text);
  const checks = rules.map((rule) => {
    const errors = ruleErrors(rule);
    if (errors.length) throw new TypeError(`${rule.id}: ${errors.join("; ")}`);
    const base = { id: rule.id, kind: rule.kind, directive: rule.directive };
    if (rule.kind === "semantic") return { ...base, status: "not-evaluated", enforcement: "advisory", reason: "Requires contextual semantic review; no mechanical verifier" };
    let actual, minimum = rule.minimum ?? 0, maximum = rule.maximum ?? null, occurrences = [];
    if (rule.kind === "word-limit") actual = words;
    else if (rule.kind === "count-range") {
      occurrences = locatedMatches(text, counters.get(rule.measurement_id).pattern, normalized.visible_offsets);
      actual = rule.unit === "per-document" ? occurrences.length : words ? occurrences.length / words * 1000 : null;
    } else if (rule.kind === "punctuation") {
      const pattern = new RegExp([...new Set(rule.characters)].map(escape).join("|"), "gu");
      occurrences = locatedMatches(text, pattern, normalized.visible_offsets); actual = occurrences.length;
    } else {
      const literal = escape(rule.text);
      const boundary = rule.kind === "prohibited-phrase" && !rule.substring;
      const sensitive = rule.case_sensitive ?? rule.kind === "required-text";
      const pattern = new RegExp(boundary ? `(?<![\\p{L}\\p{N}_])${literal}(?![\\p{L}\\p{N}_])` : literal, sensitive ? "gu" : "giu");
      occurrences = locatedMatches(text, pattern, normalized.visible_offsets); actual = occurrences.length;
      minimum = rule.kind === "required-text" ? 1 : 0; maximum = rule.kind === "required-text" ? null : 0;
    }
    return { ...base, enforcement: "enforced", actual, minimum, maximum, occurrences,
      status: actual === null ? "not-evaluated" : actual >= minimum && (maximum === null || actual <= maximum) ? "passed" : "failed",
      ...(actual === null ? { reason: "Cannot evaluate a rate on zero prose words" } : {}) };
  });
  return { schema: "voice-rule-report/1", draft_digest: sha256(draft), draft_words: words, normalization: normalized.schema,
    exclusions: normalized.exclusions, warnings: normalized.warnings, checks,
    status: checks.some((r) => r.status === "failed") ? "failed" : !checks.length || checks.some((r) => r.status === "not-evaluated") ? "not-evaluated" : "passed" };
}

/** Descriptive reference intervals are evaluated against actual text, never a guessed target. */
export function compareObserved(draft, profile, context = {}) {
  const normalized = visibleProse(draft), words = wordCount(normalized.author);
  if (profile?.schema !== "voice-profile/3") return { status: "not-evaluated", reason: "A current profile is unavailable", measurements: [] };
  return { schema: "voice-observed-comparison/1", draft_digest: sha256(draft), draft_words: words, enforcement: "advisory",
    measurements: profile.measured.measurements.map((r) => {
      const count = locatedMatches(normalized.author, counters.get(r.id).pattern, normalized.author_offsets).length;
      const group = r.groups.find((g) => g.register === (context.register ?? null) && g.form === (context.form ?? null));
      const d = group?.distribution;
      const actual = rate(count, words), evaluated = actual !== null && d?.n >= 5;
      return { id: r.id, count, per_1000_words: actual, reference: d ?? null,
        status: !evaluated ? "not-evaluated" : actual < d.minimum || actual > d.maximum ? "outside-observed-range" : "within-observed-range",
        reason: evaluated ? "Descriptive range, not a mandatory quota" : "Insufficient matching evidence or no prose words" };
    }) };
}

/** A check receipt cannot survive changes to the published bytes. */
export function verifyRuleReceipt(draft, rules, receipt, options) {
  if (receipt?.draft_digest !== sha256(draft)) return { status: "failed", reason: "Final draft bytes changed after checking" };
  const fresh = checkRules(draft, rules, options);
  if (JSON.stringify(fresh) !== JSON.stringify(receipt)) return { status: "failed", reason: "Rule report does not reproduce" };
  return { status: fresh.status, reproduced: true, reason: "Report reproduced against exact final bytes" };
}
