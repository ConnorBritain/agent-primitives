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

import { readdirSync, readFileSync } from "node:fs";
import { extractAtoms, scanFidelity, verdict, renderReport } from "../tools/fidelity-scan.mjs";
import { singleWordEntityCandidates } from "./single-word-survey.mjs";

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
  // WHAT BREAKS IF THIS REGRESSES: every corpus file in this repo is hard-wrapped,
  // so a quote regex that stops at a newline sees only the quotes short enough to
  // fit on one line. On bacon-of-death53 that was 4 of 10 - and the tool then
  // reported the other six as neither present nor missing, which a critic reads as
  // "quotes are fine". A silent 60% coverage hole in the category the fidelity
  // critic most depends on.
  const atoms = extractAtoms('He wrote “Pompa mortis magis terret, quam\nmors ipsa.” in the margin.');
  check("a quote spanning a line break is extracted",
    atoms.some((a) => a.kind === "quote" && /Pompa mortis magis terret, quam mors ipsa\./.test(a.source)),
    JSON.stringify(atoms.filter((a) => a.kind === "quote")));
}

{
  // The bound on the above. A quotation does not contain a paragraph break; an
  // unclosed quote mark somewhere does. Without this bound one stray delimiter
  // swallows the rest of the document as a single "quote" atom, and every
  // revision then "loses" it - a tool that reports one enormous false loss per
  // typo is a tool nobody runs twice.
  const atoms = extractAtoms('He said “this one never closes\n\nA new paragraph entirely, with more words” here.');
  check("a quote does NOT run past a blank line",
    !atoms.some((a) => a.kind === "quote"),
    JSON.stringify(atoms.filter((a) => a.kind === "quote")));
}

{
  // WHAT BREAKS IF THIS REGRESSES: `[A-Z][a-z]+` silently drops any name with a
  // diacritic or ligature. "Augustus Cæsar" was not truncated and not flagged -
  // it was never an atom at all, so a revision could delete it outright and the
  // scan would report every atom present. The failure is invisible in the output,
  // which is what makes it worse than a false positive.
  const atoms = extractAtoms("Later that year Augustus Cæsar died, and Émile Zola wrote of it.");
  const nouns = atoms.filter((a) => a.kind === "proper-noun").map((a) => a.source);
  check("named entities with non-ASCII letters are extracted",
    nouns.includes("Augustus Cæsar") && nouns.includes("Émile Zola"), nouns.join(" | "));
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
  // WHAT BREAKS IF THIS REGRESSES: the false-positive rate becomes a function of
  // line width. The two texts below say the same thing and differ only in where
  // the line wraps; under a literal `includes` the second reports a lost entity.
  // `n-beauty-modernised` was carried as a class-B fixture on exactly this
  // artifact, which means a scanner bug was being scored as critic behaviour.
  const orig = "It happened under Edward the Fourth of England, in 1461.";
  const rev = "It happened under Edward the\nFourth of England, in 1461.";
  const scan = scanFidelity(orig, rev);
  check("a re-wrapped named entity is present, not missing",
    verdict(scan) === "FAITHFUL", JSON.stringify(scan.missing));
}

{
  // And the paired negative: normalising whitespace must not normalise away the
  // loss itself. A presence check loose enough never to fire is the same tool as
  // no presence check, and it fails in the direction that flatters the revision.
  const scan = scanFidelity(
    "It happened under Edward the Fourth of England, in 1461.",
    "It happened under the king, in 1461.",
  );
  check("but a genuinely dropped entity is still missing after normalisation",
    scan.missing.some((a) => a.source === "Edward the Fourth"));
}

{
  // WHAT BREAKS IF THIS REGRESSES: the report asserts a clean result for a check
  // it never ran. The old closing line pronounced "Heading changes are
  // informational" on documents containing no headings - indistinguishable, to
  // the critic reading it, from a heading check that ran and found nothing. Two
  // critics caught it independently; nothing in this suite did.
  const noHeadings = renderReport(scanFidelity("The report ran in 1965.", "The report ran in 1965."));
  check("a pair with no headings makes no claim about headings",
    /original has none/.test(noHeadings) && !/Heading changes are informational/.test(noHeadings),
    noHeadings);

  const withHeadings = renderReport(scanFidelity(
    "## Background\n\nThe report ran in 1965.", "## Background\n\nThe report ran in 1965."));
  check("a pair WITH headings says how many were checked",
    /headings: 1 checked/.test(withHeadings), withHeadings);
}

{
  // The report must name what it cannot see. A FAITHFUL verdict over atoms that
  // exclude single-word names, word-form numbers and every hedge is a statement
  // about a list, not about the revision - and the critic downstream is told the
  // scan is authoritative on presence, so an unqualified "none missing" is the
  // one sentence most likely to be over-read.
  for (const [label, r] of [
    ["FAITHFUL", renderReport(scanFidelity("Ran in 1965.", "Ran in 1965."))],
    ["MATERIAL-LOSS", renderReport(scanFidelity("Ran in 1965.", "Ran some time ago."))],
  ]) {
    check(`the ${label} report names the categories it never examined`,
      /NOT extracted, on any pair: single-word named entities/.test(r), r);

    // FOUND BY A CRITIC, ON THE RUN THAT FIRST SAW THE COVERAGE NOTE. The first
    // wording illustrated the gap with "Suvorin, Salon" - real entities from one
    // fixture. A critic reading them in a document containing neither filed a
    // scanner defect: an example that looks like an observation about this pair
    // is one, to the only reader the report has. WHAT BREAKS IF THIS REGRESSES:
    // the block written to stop the tool over-claiming starts making claims of
    // its own about text it never saw.
    check(`the ${label} report's coverage examples name no corpus entity`,
      !/Suvorin|Salon|Levitan|Fourmis|Cæsar|Sahalin/.test(r) && /CATEGORIES, not observations/.test(r), r);
  }
}

{
  // THE EVIDENCE FOR A DELIBERATE GAP, checked in so it can be overturned with
  // measurements rather than argued with in a comment. P3(c) asked whether
  // single-word entities should be extracted. They are not, and the reason is
  // that the candidate list is roughly half ordinary capitalised English while
  // the critic is told the scan is AUTHORITATIVE on presence.
  //
  // WHAT BREAKS IF THIS REGRESSES: the docstring's numbers stop matching the
  // code and the decision reverts to folklore - which is the failure mode
  // CALIBRATION.md is a list of.
  const dir = new URL("fixtures/fidelity/", import.meta.url);
  const names = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const candidates = new Set();
  const insideAQuote = new Set();
  for (const n of names) {
    const text = readFileSync(new URL(`${n}/original.md`, dir), "utf8");
    const quoted = extractAtoms(text).filter((a) => a.kind === "quote").map((a) => a.source).join(" ");
    for (const w of singleWordEntityCandidates(text)) {
      candidates.add(w);
      if (new RegExp(`\\b${w}\\b`, "u").test(quoted)) insideAQuote.add(w);
    }
  }

  // Not named entities in any reading - ordinary capitalised English, demonyms,
  // weekdays, months, and Latin words sitting inside quotations. This list is the
  // judgement; everything else in this block is mechanical.
  const notEntities = ["Adeste", "April", "Auto", "Cogita", "Deus", "Easter", "Exhibition",
    "Extinctus", "Faculties", "February", "Feri", "French", "Frenchmen", "Germans", "January",
    "Nunc", "October", "Pompa", "Pulchrorum", "Romani", "Russian", "Saturday", "Serbs",
    "Stoics", "Stories", "Thursday", "Ut"];
  check("the single-word-entity survey still yields 55 candidates over the fixture originals",
    candidates.size === 55, `got ${candidates.size}`);
  check("every word the survey calls a non-entity is still produced by the rule",
    notEntities.every((w) => candidates.has(w)),
    notEntities.filter((w) => !candidates.has(w)).join(" "));
  check("so the rule remains roughly half ordinary capitalised English",
    notEntities.length / candidates.size > 0.4,
    `${notEntities.length} of ${candidates.size}`);
  check("and 10 candidates duplicate a loss the quote atoms already report",
    insideAQuote.size === 10, `got ${insideAQuote.size}: ${[...insideAQuote].sort().join(" ")}`);

  // The counterweight, and it is why this is a survey rather than a one-line
  // won't-fix: the rule DOES find the entities the harness transcripts said the
  // scanner missed. Anyone re-opening this decision should start here.
  check("the rule would nonetheless have caught the entities the run reported missing",
    ["Suvorin", "Levitan", "Fourmis", "Salon"].every((w) => candidates.has(w)));
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

/* ------------------------------------------------------------------ */
group("fidelity fixtures — integrity");

{
  const dir = new URL("fixtures/fidelity/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("fixtures.json", dir), "utf8"));
  const corpus = new URL(`${manifest.corpus_root}/`, dir);
  const onDisk = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const declared = manifest.fixtures.map((f) => f.name).sort();

  // A fixture on disk but not in the manifest is a fixture whose expected verdict
  // nobody wrote down, and it would be silently absent from the harness denominator -
  // the direction that flatters a result. Same corpus discipline as prose-tell-scan.
  check("every fixture directory is declared in fixtures.json",
    JSON.stringify(onDisk) === JSON.stringify(declared),
    `disk=${onDisk.length} manifest=${declared.length}`);

  for (const f of manifest.fixtures) {
    const original = readFileSync(new URL(`${f.name}/original.md`, dir), "utf8");

    // THE ANTI-TUNING CHECK. If I can edit an "original", I can edit it until a
    // fixture produces the verdict I wanted, and the harness measures nothing. The
    // original is the corpus file or it is not evidence.
    const source = readFileSync(new URL(f.source, corpus), "utf8");
    check(`${f.name}: original is byte-identical to ${f.source}`, original === source);

    // THE LEAK GUARD, and it exists because the first harness run was invalid.
    // Every revision.md carried `expect: FAITHFUL` in its frontmatter - the answer,
    // sitting in a file the critic is required to read. Six transcripts had to be
    // thrown away. A subagent noticed and said so; nothing in the repo would have.
    // The expected verdict lives in fixtures.json, which the harness forbids reading,
    // and it may live nowhere else.
    for (const file of ["original.md", "revision.md"]) {
      const text = readFileSync(new URL(`${f.name}/${file}`, dir), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
      check(`${f.name}/${file}: frontmatter does not leak the expected verdict`,
        !fm || !/FAITHFUL|MATERIAL-LOSS|\bexpect\b/.test(fm[1]),
        fm ? fm[1].replace(/\n/g, " ") : "");

      // A revision whose `fixture:` names a directory it is not in is either a
      // copy-paste error or an undocumented rename. One fixture here legitimately
      // carries its old name - that stale name is the provenance proving its
      // transcript predates the rename - so the manifest has to declare it.
      const declared = fm && fm[1].match(/^fixture:\s*(\S+)/m);
      if (declared) {
        check(`${f.name}/${file}: frontmatter names this fixture, or its declared former name`,
          declared[1] === f.name || declared[1] === f.previously_named,
          `says ${declared[1]}`);
      }
    }

    // The recorded scan verdict is what makes "an echo of the scanner scores 6/12"
    // a re-derived number instead of a sentence in a README. If a revision is edited
    // and its class silently shifts, the published baseline is wrong and this fails.
    const scan = scanFidelity(original, readFileSync(new URL(`${f.name}/revision.md`, dir), "utf8"));
    check(`${f.name}: fidelity-scan still returns ${f.scan_verdict}`,
      verdict(scan) === f.scan_verdict, `got ${verdict(scan)}`);

    // Class is the (scan, expected-critic) pair. Stating it in prose AND in the two
    // fields lets them drift apart; this makes the prose accountable to the fields.
    const expectedClass = { "FAITHFUL|FAITHFUL": "A", "MATERIAL-LOSS|FAITHFUL": "B",
      "MATERIAL-LOSS|MATERIAL-LOSS": "C", "FAITHFUL|MATERIAL-LOSS": "D" }[`${f.scan_verdict}|${f.expect}`];
    check(`${f.name}: declared class ${f.class} matches its scan/expect pair`,
      f.class === expectedClass, `pair implies ${expectedClass}`);

    // negative = must come back FAITHFUL, positive = must come back MATERIAL-LOSS.
    // verify-run.mjs derives the two denominators from the filename prefix, so a
    // disagreement here would move a result between them with nothing to notice.
    const impliedKind = f.expect === "FAITHFUL" ? "negative" : "positive";
    check(`${f.name}: kind, filename prefix and expected verdict agree`,
      f.kind === impliedKind && f.name.startsWith(f.kind === "positive" ? "p-" : "n-"));
  }

  // Both disagreement directions must be represented, or the harness cannot show the
  // critic is anything other than a wrapper around the regex. B = scanner over-flags,
  // D = scanner is blind. Losing either class silently guts the acceptance argument.
  const byClass = (c) => manifest.fixtures.filter((f) => f.class === c).length;
  process.stdout.write(`  ---- class distribution: ${["A", "B", "C", "D"].map((c) => `${c}=${byClass(c)}`).join(" ")}\n`);

  // MINIMUM TWO, not one, and the reason is a near miss. Class B started at three;
  // reclassifying p-death-severus-unnamed dropped it to two, and the only reason
  // anyone noticed was a reviewer reading the diff - a "> 0" guard sat there green
  // while the class the harness calls load-bearing quietly halved. A class carried
  // by a single fixture is carried by that fixture's arguable edges, not by the
  // property it is supposed to demonstrate.
  //
  // TWO IS A DEFAULT, NOT A MEASUREMENT. Nothing derived it; it is the smallest
  // number that is not one. Raise it when there is a reason to, and say so.
  for (const c of ["B", "D"]) {
    const what = c === "B" ? "scanner over-flags, critic clears" : "scanner blind, critic catches";
    check(`class ${c} (${what}) has at least 2 fixtures`, byClass(c) >= 2, `has ${byClass(c)}`);
  }
}

/* ------------------------------------------------------------------ */
group("primitive/bundle parity");

{
  // AGENTS.md rule 1: the rendered agent's body must be byte-identical to the
  // primitive's, and "there's no generator yet, so this is maintained by hand."
  // A drifted pair silently ships two different agents under one name, which is
  // exactly the class of failure nobody notices by reading. Hand-maintained and
  // unchecked is the combination CALIBRATION.md is a list of.
  const body = (url) => readFileSync(url, "utf8").split(/^---$/m).slice(2).join("---");
  for (const name of ["prose-voice-critic", "prose-fidelity-critic"]) {
    const primitive = new URL(`../../../primitives/agents/${name}/agent.md`, import.meta.url);
    const rendered = new URL(`../agents/${name}.md`, import.meta.url);
    check(`${name}: rendered body is byte-identical to the primitive`,
      body(primitive) === body(rendered));

    // Frontmatter may add tools/model/color from meta.yaml and nothing else. A
    // description that drifts is a dispatcher reading one thing and a reader another.
    const fm = (url) => Object.fromEntries(readFileSync(url, "utf8").split(/^---$/m)[1]
      .split("\n").filter((l) => l.includes(":"))
      .map((l) => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
    const [p, r] = [fm(primitive), fm(rendered)];
    check(`${name}: primitive frontmatter carries only name + description`,
      JSON.stringify(Object.keys(p).sort()) === JSON.stringify(["description", "name"]));
    check(`${name}: rendered name and description match the primitive`,
      p.name === r.name && p.description === r.description);
    check(`${name}: rendered frontmatter adds only tools/model/color`,
      Object.keys(r).every((k) => ["name", "description", "tools", "model", "color"].includes(k)),
      Object.keys(r).join(","));
  }
}

process.stdout.write(`\n${"─".repeat(60)}\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n`);
if (failed) {
  process.stdout.write(`\nFailures:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`);
}
process.exit(failed ? 1 : 0);
