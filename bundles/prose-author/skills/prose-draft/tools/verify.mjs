#!/usr/bin/env node
/**
 * verify — what a draft is allowed to claim about itself.
 *
 *   node verify.mjs <draft> --profile <name> [--profiles-dir <dir>] [--json]
 *
 * `kind: author` carries one obligation this repo takes literally: STATE HOW THE
 * OUTPUT WAS VERIFIED. Three things about a generated draft are checkable, and
 * those three are exactly what gets claimed:
 *
 *   1. it was scanned by tell-scan against THIS author's profile
 *   2. its cadence and density were compared to THIS author's derived bands
 *   3. any Tier A artifact is a hard failure
 *
 * And what is never claimed, in any wording, under any flag:
 *
 *   - that the draft sounds like the author        (unmeasurable)
 *   - that the draft is good                       (not this tool's business)
 *   - that it would pass any detector               (refused on principle,
 *                                                    everywhere in this repo)
 *
 * TIER A RETURNS THE DRAFT RATHER THAN REPORTING IT. A leaked citation marker,
 * a chatbot preamble, an identifier failing its own checksum - these are not
 * style observations to be weighed against a band. They are evidence the
 * generation went wrong mechanically, and handing one back with a tidy cadence
 * table beside it invites the author to read the table and skim the problem.
 *
 * THE COLD-START REFUSAL. With no calibrated corpus this reports NO GAP. It will
 * still say a draft is clean of artifacts - that is an absolute check needing no
 * corpus - but it will not compare cadence against fallback bands and let the
 * author read "within range" as "within YOUR range". Bands nobody measured are
 * this repo's guess about a generic register, and a comparison against them
 * silently means "resembles our fallback", which is a sentence about nobody.
 */

import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Find the sibling scanner.
 *
 * This bundle ships without prose-tell-scan and has to say so rather than
 * throwing ENOENT at someone who installed one plugin and not the other. The
 * search order goes from a full checkout outward; each candidate is a real
 * install shape, not a guess.
 */
export function firstExisting(candidates) {
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return resolve(c);
  }
  return null;
}

export function findScanner(extra = []) {
  return firstExisting([
    ...extra,
    join(HERE, "..", "..", "..", "..", "prose-tell-scan", "skills", "tell-scan", "tools", "tell-scan.mjs"),
    join(HERE, "..", "..", "..", "..", "..", "prose-tell-scan", "skills", "tell-scan", "tools", "tell-scan.mjs"),
  ]);
}

/** First sentence, capped. Enough to say what the artifact is, never a history. */
function firstSentence(note, max = 140) {
  if (!note) return null;
  const m = note.match(/^[\s\S]*?[.:](?=\s|$)/);
  const one = (m ? m[0] : note).trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}\u2026` : one;
}

export function verifyDraft(draft, { profile, profilesDir, project, scanner } = {}) {
  const scan = scanner || findScanner();
  if (!scan) {
    return {
      status: "unverifiable",
      message:
        "prose-tell-scan is not installed alongside this bundle, so the draft was "
        + "NOT scanned. This is not a passing result - it is the absence of a "
        + "check. Install prose-tell-scan, or state plainly that the draft is "
        + "unverified.",
      claims: [],
    };
  }

  const args = [scan, draft, "--json"];
  if (profile) args.push("--profile", profile);
  if (profilesDir) args.push("--profiles-dir", profilesDir);
  if (project) args.push("--project", project);

  let payload;
  try {
    payload = JSON.parse(execFileSync("node", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  } catch (err) {
    return { status: "unverifiable", message: `scan failed: ${err.message}`, claims: [] };
  }

  const result = payload.results[0];
  const tierA = result.findings.filter((f) => f.tier === "A" && f.flagged);

  if (tierA.length) {
    return {
      // REJECTED, not "reported". The distinction is the whole point: a caller
      // that treats this like a finding will show it beside a cadence table and
      // the author will read the table.
      status: "rejected",
      reason: "tier-a-artifact",
      // First sentence of the note only. Catalog notes carry the entry's whole
      // calibration history, which is right in CALIBRATION.md and wrong here:
      // dumped into a rejection it buries the one line the author needs under
      // three paragraphs about a codepoint fix from last week.
      artifacts: tierA.map((f) => ({
        id: f.id,
        count: f.count,
        note: firstSentence(f.note),
        examples: f.examples,
      })),
      message:
        "Draft returned, not reported. It contains artifacts no register "
        + "explains - leaked markup, a chatbot preamble, or an identifier that "
        + "fails its own checksum. Fix the generation; do not weigh this against "
        + "a band.",
      claims: [],
    };
  }

  const t = result.profile.thresholds;
  const calibrated = Boolean(t.derived);

  const claims = [
    `Scanned by tell-scan against profile "${result.profile.name}".`,
    "No Tier A artifacts present.",
  ];
  if (calibrated) {
    claims.push(
      `Cadence and density compared against bands derived from ${t.samples} of `
      + `your own samples (${t.corpus_words} words).`,
    );
  }

  return {
    status: "verified",
    calibrated,
    profile: result.profile.name,
    samples: t.samples ?? 0,
    corpus_words: t.corpus_words ?? 0,
    confidence: t.confidence || "none",
    cadence_checks: result.cadenceChecks,
    summary: result.summary,
    // The refusal is data, not prose, so a caller cannot accidentally drop it.
    gap_reported: calibrated,
    gap_refusal: calibrated
      ? null
      : `Profile "${result.profile.name}" has no calibrated corpus. Cadence was `
        + "NOT compared against your range, because there is no measurement of "
        + "your range - only fallback bands describing a generic register. A "
        + '"within range" here would mean "resembles our fallback", which is a '
        + "statement about nobody.",
    claims,
  };
}

export function renderVerification(v) {
  const out = [""];
  if (v.status === "unverifiable") {
    out.push("  NOT VERIFIED", "", `  ${v.message}`, "");
    return out.join("\n");
  }
  if (v.status === "rejected") {
    out.push("  DRAFT RETURNED — Tier A artifact", "");
    for (const a of v.artifacts) {
      out.push(`    ${a.id} ×${a.count}${a.note ? ` — ${a.note}` : ""}`);
      for (const e of (a.examples || []).slice(0, 3)) out.push(`      ${e}`);
    }
    out.push("", `  ${v.message}`, "");
    return out.join("\n");
  }

  out.push("  verified — and this is the whole of what that means:", "");
  for (const c of v.claims) out.push(`    · ${c}`);
  out.push("");
  if (!v.gap_reported) {
    out.push("  NO GAP REPORTED", "");
    out.push(`  ${v.gap_refusal.replace(/(.{1,68})(\s|$)/g, "  $1\n").trim()}`);
    out.push("");
  }
  out.push("  Not claimed: that this sounds like you, that it is good, or that it");
  out.push("  would pass any detector. The first is unmeasurable, the second is not");
  out.push("  this tool's business, and the third is refused on principle.");
  out.push("");
  return out.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const draft = args.find((a) => !a.startsWith("--"));
  if (!draft) {
    process.stderr.write("verify: usage: node verify.mjs <draft> --profile <name>\n");
    process.exit(2);
  }
  const val = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };
  const v = verifyDraft(draft, {
    profile: val("--profile"),
    profilesDir: val("--profiles-dir"),
    project: val("--project"),
  });
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(v, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderVerification(v)}\n`);
  }
  process.exit(v.status === "verified" ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
