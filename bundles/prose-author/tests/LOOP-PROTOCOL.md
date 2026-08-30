# The generate → critique → revise loop

**Held.** The loop orchestrates two held primitives (`voice-profile-render`,
`voice-draft`) and two shipped ones (`prose-voice-critic`, `prose-reviser`). It lives in
`tests/` because nothing here ships until PI-02 S6, and because a skill placed in this
bundle's `skills/` directory would ship on merge. At S6 a skill wraps this; the decision
logic in `loop.mjs` does not change.

## The shape

```
  voice-draft ──► draft
                    │
                    ▼
            prose-voice-critic  (k=3)
                    │
                    ▼
              ┌───────────┐
              │ SEAM      │  findings → plan.json      ← NOT AUTOMATED. FU-2 owns this.
              └───────────┘
                    │
                    ▼
             prose-reviser  (plan-only, log-only)
                    │
                    ▼
            apply change log ──► revision
                    │
                    ├──► prose-fidelity-critic  — did the revision lose anything?
                    └──► prose-voice-critic (k=3) — did the revision hurt the voice?
                                     │
                                     ▼
                     attributeToEdits()  — did an EDIT cause a finding?
                            ├─ yes ──────► REFUSE that plan_id. Keep the other edits.
                            ▼
                     detectDegradation() — did the totals get worse?
                            ├─ degraded ──► REFUSE. Keep the draft, discard the revision.
                            └─ ok ───────► shouldStop()
                                            ├─ converged / split / stalled / cap ──► stop
                                            └─ otherwise ──► next iteration
```

## The two decisions the loop owns

Everything else is a job an existing primitive or harness already does. These two are
new, live in `loop.mjs`, and are pure functions over verdict data so they can be tested
without dispatching anything.

### 1. Refusing a revision — `detectDegradation()`

**A revision can make the voice worse.** Without this check the loop will walk a draft
away from the author one authorised edit at a time, producing a tidy transcript in which
every change was sanctioned and the result is further from the corpus than where it
started.

The critic runs on the draft *and* on the revision. Two triggers refuse:

1. **The majority verdict fell** (CLEAN → REVISE). Unambiguous.
2. **Every revision draw found more than the draft's worst draw.**

The second is strict on purpose. The S3 matched-Chekhov cell ran **1, 2, 0 findings on an
unchanged draft** — so a rule blocking on a mean tick-up would refuse good revisions at
random, and the loop would silently stop improving. Requiring *every* draw to be worse is
what survives k=3 noise.

A rise inside the noise band is **reported and not blocked**, per the sampling policy: the
loop surfaces what it saw rather than averaging it away.

### 1b. Attributing a finding to an edit — `attributeToEdits()`

Added after the worked run, because counting could not see what went wrong there.

A hand-authored plan turned *"nobody will take it down"* into *"nobody'll take it down"*,
and the critic flagged it — that contraction class appears nowhere in the corpus.
`detectDegradation` did **not** block, correctly: the rise was 0.67 findings/draw, inside
the noise band, and confounded anyway because fixing one finding lets the critic see the
next ones down.

So the count was right and still missed a regression. Causation was the knowable thing:
**the change log records the exact text each edit introduced**, so a finding quoting that
text was caused by that edit. Deterministic, and it names the `plan_id`.

`nextAction` therefore refuses **by `plan_id`** rather than rejecting the whole revision —
the other three edits in that run were fine and there is no reason to lose them. Causation
outranks counts: it fires even when the totals look acceptable.

**Counts say whether things got worse. Only the change log says what caused it.**

### 2. Stopping — `shouldStop()`

Four exits, and **only one is success**:

| outcome | when | meaning |
|---|---|---|
| `converged` | unanimous CLEAN | the loop worked |
| `split` | majority CLEAN, not unanimous | the critics disagree; **surfaced for the author, not resolved** |
| `stalled` | two rounds at the same verdict with no reduction | the finding is one a surgical reviser cannot reach |
| `cap` | 3 iterations | still improving, but the budget is spent |

`stalled` is the common one, and it is not a bug. A finding like *"no contracted forms
anywhere in ~490 words"* or *"the tone never shifts"* names a property of the whole draft,
not a span. A reviser authorised to make small in-place edits has nothing to act on, so
round two re-derives round one's plan. The loop notices and stops rather than spending the
cap re-proving it.

## The seam, and why it is left open

**Turning critic findings into a reviser plan is not automated.** `nextAction()` returns
`consolidate` and stops.

A plan entry needs an exact `location.quote` **and** a specific `change`. A voice finding
often has neither. Of the one finding this run consolidated, the critic happened to cite
four exact spans each with an obvious substitution; the *same round's other finding* named
a whole paragraph and no edit at all, and was left out of the plan by a human.

That selection is the judgement, and **FU-2** owns automating it. S4 deliberately did not
pull that ticket forward: it is 2–3 weeks, and coupling an unsolved contract to this one
would have meant neither got a clean measurement — the same reason the evidence path was
kept out of S3.

## Running it

The loop composes existing harnesses by **invoking their CLIs**, not by importing across
a bundle boundary — no test in this repo does that, and `loop.mjs` needs none of it since
it operates on plain verdict data.

```bash
# 1. critic round on the draft (k=3 by default, per SAMPLING-POLICY.md)
node ../../prose-review/tests/run-harness.mjs prepare  voice <run-id>
node ../../prose-review/tests/run-harness.mjs dispatch <run-dir>
node ../../prose-review/tests/run-harness.mjs collect  <run-dir>

# 2. SEAM — author plan.json by hand against PLAN-FORMAT.md

# 3. reviser, then apply its change log
node ../../prose-review/tests/revise-harness.mjs dispatch <run-dir>
node ../../prose-review/tests/revise-harness.mjs collect  <run-dir>

# 4. critic round on the revision, then feed both rounds to loop.mjs
node loop-harness.mjs status <run-dir>     # what the loop wants next
node loop-harness.mjs replay <run-dir>     # recompute every decision from the artefacts;
                                           # non-zero if a recorded number does not reproduce
```

`replay` is what makes a finished run checkable rather than narrated. It is asserted in
the bundle selftest, and it caught a real defect on its first execution — the run had
stored paraphrased findings where attribution needs verbatim ones, so its recorded
numbers did not recompute.

## What this is not

- **Not automatic.** The seam is manual by decision, not by omission.
- **Not a ship bar.** S5 pre-registers that, and FU-13 has already found a problem with the
  bar as PI-02 drafted it.
- **Not able to fix diffuse findings.** See `stalled`. Whether the loop should be allowed to
  *redraft* rather than revise was considered for S4 and deliberately declined — revision
  uses the shipped, acceptance-tested reviser whose failure modes are measured; redrafting
  loses the fidelity guarantees. Worth revisiting once the loop has run on more fixtures.
