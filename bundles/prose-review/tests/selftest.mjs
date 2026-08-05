#!/usr/bin/env node
/**
 * prose-review selftest.
 *
 * Right now this covers fidelity-scan only - the deterministic sidecar the
 * fidelity critic reads. Voice-critic is tested via critic-harness.md +
 * verify-run.mjs (a different discipline: the critic is a prompt whose behaviour
 * requires spawning subagents, so it lives outside this file). Substance and
 * adversarial critics are corpus-blocked and will land here when they land.
 */

import { extractAtoms, scanFidelity, verdict, renderReport } from "../tools/fidelity-scan.mjs";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    process.stdout.write(`  FAIL ${name}${detail ? ` — ${detail}` : ""}\n`);
  }
}
function group(t) { process.stdout.write(`\n${t}\n`); }

/* ------------------------------------------------------------------ */
group("fidelity-scan — extract");

{
  const atoms = extractAtoms("The building opened in 1965 with 37 rooms.");
  const kinds = atoms.map((a) => a.kind);
  // Both numbers found - a fidelity scan that missed one of these would silently
  // pass a revision that dropped the year OR the count. The two-number sentence
  // exists in the test so a regex that stops after the first match visibly fails.
  check("both years and integers are extracted from a single sentence",
    kinds.filter((k) => k === "number").length === 2);
}

{
  const atoms = extractAtoms('Then he said "the whole plan was wrong from the start" plainly.');
  check("a >=3-word quoted span is extracted",
    atoms.some((a) => a.kind === "quote" && /whole plan was wrong/.test(a.source)));
}

{
  const atoms = extractAtoms('She said "yes" and left.');
  check("a one-word quoted emphasis is NOT extracted as a quote",
    !atoms.some((a) => a.kind === "quote"));
}

{
  const atoms = extractAtoms('He said \u201Cthe plan was wrong from the start\u201D and left.');
  check("curly-quoted spans are extracted the same as straight quotes",
    atoms.some((a) => a.kind === "quote" && /plan was wrong/.test(a.source)));
}

{
  const atoms = extractAtoms("Ahmadu Bello University was founded by Nnamdi Azikiwe.");
  const nouns = atoms.filter((a) => a.kind === "proper-noun").map((a) => a.source);
  check("multi-word proper-noun runs are extracted",
    nouns.includes("Ahmadu Bello University"));
  check("two-word named entities are extracted",
    nouns.includes("Nnamdi Azikiwe"));
}

{
  // THE BUG THIS TEST EXISTS TO PREVENT: an earlier regex used \s+ instead of
  // [ \t]+ for the inter-word gap, so a heading followed by a capitalised
  // sentence produced one huge "proper noun" like "History\n\nThe Northern".
  // That is a class of false positive that would fire on almost any structured
  // document.
  const atoms = extractAtoms("## History\n\nThe Northern Region opened it.");
  const nouns = atoms.filter((a) => a.kind === "proper-noun").map((a) => a.source);
  check("proper-noun runs do NOT span line breaks",
    nouns.every((n) => !n.includes("\n")));
  check("but the actual named entity after the heading is still caught",
    nouns.includes("The Northern Region"));
}

{
  // Duplicates are collapsed. A number that appears 10 times in the original is
  // ONE atom; a revision that drops all 10 is one loss, not ten. Otherwise the
  // critic sees an inflated list and cannot tell the shape of the loss.
  const atoms = extractAtoms("The 12 rooms held 12 people, and 12 books each.");
  const twelves = atoms.filter((a) => a.kind === "number" && a.source === "12");
  check("recurring atoms are deduped", twelves.length === 1);
}

/* ------------------------------------------------------------------ */
group("fidelity-scan — presence + verdict");

{
  // A faithful revision differs in wording but preserves every material atom.
  // The verdict must be FAITHFUL - a scanner that flagged this would train
  // reviewers to ignore its output, which is the same outcome as no scanner.
  const orig = 'The 1965 report noted that "the plan was ambitious" and named Adebayo Alao.';
  const rev = 'A 1965 report described "the plan was ambitious" and cited Adebayo Alao by name.';
  const scan = scanFidelity(orig, rev);
  check("wording change with all atoms preserved is FAITHFUL",
    verdict(scan) === "FAITHFUL", `missing: ${JSON.stringify(scan.missing)}`);
}

{
  // A dropped year is a material loss. Silent acceptance of this is the exact
  // failure mode the critic exists to catch.
  const orig = "The building opened in 1965.";
  const rev = "The building opened in the mid-sixties.";
  const scan = scanFidelity(orig, rev);
  check("a dropped year triggers MATERIAL-LOSS",
    verdict(scan) === "MATERIAL-LOSS");
  check("and the missing atom is the specific year, named",
    scan.missing.some((a) => a.kind === "number" && a.source === "1965"));
}

{
  // A dropped quote counts. A paraphrase-in-place is subtle - the meaning MAY
  // survive - but the quotation as a quotation is gone, and the critic needs
  // to be told so it can decide.
  const orig = 'The chancellor said "we will finish this year" in a rare address.';
  const rev = "The chancellor promised in a rare address to finish that year.";
  const scan = scanFidelity(orig, rev);
  check("a paraphrased-out quote triggers MATERIAL-LOSS",
    verdict(scan) === "MATERIAL-LOSS");
}

{
  // A dropped named entity is a fidelity loss. Reviewers reliably miss these
  // after the reviser has run, when the pre-edit copy is gone - this is the
  // failure that most justifies the scan-first-then-critic split.
  const orig = "Ahmadu Bello University was founded in 1962.";
  const rev = "The university was founded in 1962.";
  const scan = scanFidelity(orig, rev);
  check("a dropped named entity triggers MATERIAL-LOSS",
    verdict(scan) === "MATERIAL-LOSS");
}

{
  // Numbers with thousands separators must match either form: "1,234" in the
  // original and "1234" in the revision is the same information. Anything
  // stricter would train users to write "1,234" everywhere to avoid a false
  // MATERIAL-LOSS, which teaches them to game the tool.
  const orig = "There were 1,234 attendees.";
  const rev = "There were 1234 attendees at the event.";
  const scan = scanFidelity(orig, rev);
  check("thousands separators are normalised for presence checks",
    verdict(scan) === "FAITHFUL");
}

{
  // Heading changes alone do NOT trigger MATERIAL-LOSS. A rewrite may
  // restructure legitimately. The critic sees the change and decides; the
  // verdict machine does not blow up over restructuring.
  const orig = "## Background\n\nThe library opened in 1970.";
  const rev = "## History\n\nThe library opened in 1970.";
  const scan = scanFidelity(orig, rev);
  check("a heading rename with content preserved is FAITHFUL",
    verdict(scan) === "FAITHFUL");
  // But the change is still flagged in the report - "informational, not blocking".
  check("and the heading change is still reported for review",
    scan.missing.some((a) => a.kind === "heading" && a.source === "Background"));
}

{
  // The rendered report exists to be read by the critic prompt. If either
  // classification section vanishes silently, the critic loses a signal.
  const scan = scanFidelity(
    "Ahmadu Bello University opened in 1962.",
    "The university opened years ago.",
  );
  const r = renderReport(scan);
  check("the report labels its verdict clearly", /fidelity: MATERIAL-LOSS/.test(r));
  check("and lists each kind of missing atom under its own header",
    /numbers absent from the revision:/.test(r) && /named entities absent from the revision:/.test(r));
  check("MATERIAL-LOSS wording says the critic decides which losses matter",
    /critic that/.test(r));
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
