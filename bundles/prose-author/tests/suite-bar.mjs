/**
 * The ship bar, applied by code rather than by a person reading a table.
 *
 * The bar decides whether two held primitives ship. Every way it can be wrong is a way a
 * generator ships on evidence it did not earn: a threshold quietly loosened, a conjunction
 * silently turned into a disjunction, a structural gate failure reported as a passing run.
 * None of those look wrong in the output — they look like a pass.
 */

import {
  scoreDraft, scoreRun, MAJORITY_VERDICT, MAX_FINDINGS_PER_DRAW, STRUCTURAL_GATES,
} from "./bar.mjs";

const draws = (verdicts, findings) => verdicts.map((v, i) => ({ verdict: v, findings: findings[i] }));
const allGatesPass = Object.fromEntries(STRUCTURAL_GATES.map((g) => [g, "pass"]));

export async function run(t) {
  t.group("bar — the pre-registered thresholds");
  {
    // These pin the bar to what was written on 2026-08-07, which states that nothing in it
    // may change after seeing results. A future edit that loosens either value fails here
    // rather than silently passing a run that should have failed.
    t.check("majority verdict is CLEAN, as pre-registered", MAJORITY_VERDICT === "CLEAN");
    t.check("findings ceiling is 1.0 per draw, as pre-registered", MAX_FINDINGS_PER_DRAW === 1.0);
    t.check("all four structural gates are named", STRUCTURAL_GATES.length === 4);
  }

  t.group("bar — conjunctive, and each half fails alone");
  {
    // The pre-registration's reason: the rate alone passes a draft no critic would call
    // clean but that accumulates small problems below the verdict threshold.
    const rateOnly = scoreDraft(draws(["REVISE", "REVISE", "CLEAN"], [1, 1, 0]));
    t.check("a passing rate with a REVISE majority does NOT pass",
      rateOnly.rateOk && !rateOnly.majorityClean && !rateOnly.passes);

    // And the other half: the verdict alone is a coin flip on borderline drafts.
    const verdictOnly = scoreDraft(draws(["CLEAN", "CLEAN", "REVISE"], [1, 1, 4]));
    t.check("a CLEAN majority with a failing rate does NOT pass",
      verdictOnly.majorityClean && !verdictOnly.rateOk && !verdictOnly.passes);

    t.check("both halves passing is what passes",
      scoreDraft(draws(["CLEAN", "CLEAN", "REVISE"], [0, 0, 2])).passes);
  }

  t.group("bar — the ceiling is inclusive, and floats do not move it");
  {
    // The pre-registration's own calibration recorded a draft passing "exactly at the
    // ceiling" with mean 1.00. A strict < would retroactively fail the draft the bar was
    // calibrated on.
    const exact = scoreDraft(draws(["CLEAN", "CLEAN", "REVISE"], [3, 0, 0]));
    t.check("a mean of exactly 1.0 passes", exact.findings.mean === 1 && exact.passes);

    // 1+1+1 over 3 is exact in binary, but 2+1+0 over 3 is not; a naive compare against a
    // computed sum can fail a draft that is at the ceiling by arithmetic.
    const thirds = scoreDraft(draws(["CLEAN", "CLEAN", "CLEAN"], [2, 1, 0]));
    t.check("a mean that is 1.0 only after float division still passes", thirds.passes);

    t.check("just over the ceiling fails",
      !scoreDraft(draws(["CLEAN", "CLEAN", "CLEAN"], [2, 1, 1])).passes);
  }

  t.group("bar — a tie is not a pass");
  {
    // summarise resolves a tie to the worse verdict. The bar depends on that, so it is
    // asserted here too: a 1-1 split resolving to CLEAN would let a coin flip ship a
    // primitive.
    const tie = scoreDraft(draws(["CLEAN", "REVISE"], [0, 1]));
    t.check("a tied verdict resolves to REVISE and fails", tie.majority === "REVISE" && !tie.passes);
  }

  t.group("bar — structural gates fail the RUN, not one draft");
  {
    const clean = { drafts: [{ id: "a", findings: [0, 0, 0], verdicts: ["CLEAN", "CLEAN", "CLEAN"] }],
      structural_gates: allGatesPass };
    t.check("all drafts passing and all gates holding clears the bar", scoreRun(clean).clears);

    // "All must hold, no exceptions." A run with perfect drafts and one fabricated
    // citation has not cleared, and reporting it by draft count alone would be false.
    const leaky = { ...clean, structural_gates: { ...allGatesPass, fabricated_citations: "fail" } };
    const r = scoreRun(leaky);
    t.check("one failed structural gate fails the run even when every draft passes",
      r.passed === 1 && r.of === 1 && !r.clears && r.gateFailures.includes("fabricated_citations"));

    // A gate that is absent from the tally is not a gate that passed.
    const missing = { ...clean, structural_gates: { fabricated_citations: "pass" } };
    t.check("an unreported structural gate counts as failed, not as absent",
      !scoreRun(missing).clears);
  }

  t.group("bar — an empty run does not clear vacuously");
  {
    // `every draft passes` is trivially true of no drafts. A run that dispatched nothing
    // must not report a pass.
    t.check("a run with no drafts does not clear",
      !scoreRun({ drafts: [], structural_gates: allGatesPass }).clears);
    t.check("a draft with no draws does not pass", !scoreDraft([]).passes);
  }
}
