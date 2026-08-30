# Using `prose-reviser`

The end-to-end path: **plan → reviser → apply → fidelity gate → author decision.**
This document is the operator's how-to. For the plan schema, see
[`PLAN-FORMAT.md`](PLAN-FORMAT.md). For the invocation order in the wider bundle,
see [`PROTOCOL.md`](PROTOCOL.md). For why the reviser was built this way, see
[`../../primitives/agents/prose-reviser/README.md`](../../primitives/agents/prose-reviser/README.md).

## What you're doing, in one sentence

You have a draft and an edit plan. You want a revision that applies the plan
faithfully, and a verdict from a critic that read the result whether the
revision kept what it had to. `prose-reviser` produces the revision; the
`prose-fidelity-critic` gate verifies it. You accept, reject, or adjust.

## Prerequisites

Install the bundle:

```bash
# whole bundle, per-user
./install.sh
# or scope to a project
./install.sh --project
# or as a Claude Code plugin
/plugin install prose-review@agent-primitives
```

Verify:

```bash
ls ~/.claude/agents/prose-reviser.md         # (or ./.claude/... for --project)
```

You will also need:

- **An original draft** as a `.md` or `.txt` file.
- **A plan** as `.json`. If you don't have one yet, the shortest path is: run
  `prose-voice-critic` (or another critic in this bundle) on the draft, read
  its findings, and hand-author a `plan.json` from them.
  [`PLAN-FORMAT.md`](PLAN-FORMAT.md) walks the schema in detail.

## The pipeline, end to end

### 1. Reviser produces a change log

Spawn `prose-reviser` in a fresh clean-context session (Claude Code does this
by default for subagents). Give it the plan and the original. It emits a
JSON change log in a `` ```json `` fence and nothing else.

Shape:

```json
{
  "plan": "path/to/plan.json",
  "mode": "plan-only",
  "edits": [
    {
      "plan_id": "e01",
      "before": "the utilised approach",
      "after": "the approach we used",
      "reason": "echoed from the plan entry, unedited"
    }
  ],
  "refused": [
    {
      "plan_id": "e04",
      "reason": "quote does not match — original text may have moved"
    }
  ],
  "noticed_but_not_edited": [
    "line 87: two more instances of 'utilised' the plan did not name"
  ]
}
```

**Why a diff instead of the whole revised draft:** two reasons, both
load-bearing. The output filter that guards charged content reliably blocks
bulk reproduction of source material — so a reviser that emits the whole
revision cannot process letters about state violence, medical detail, or
self-harm. The diff avoids that entirely. And a reviser whose only output
channel is a list of before/after pairs referring to plan ids **cannot make
an out-of-plan edit by construction**. There is nowhere to put it.

### 2. Apply the log to reconstruct the revision

The harness's apply step is strict. For each edit:

- `before` MUST be an exact substring of the original at apply time.
- `before` MUST fall inside (or equal) the plan entry's `location.quote`.

An edit whose text is genuinely in the original but is NOT inside the
authorising quote is out-of-plan by construction; the harness refuses the
whole log. This is what makes "edits outside the plan" the fidelity critic's
priority-4 rule — **impossible rather than merely detectable**.

Programmatically:

```javascript
import { applyChangeLog } from "bundles/prose-review/tests/revise-harness.mjs";
const { revision, applied, error } = applyChangeLog(originalText, changeLog, plan);
if (error) throw new Error(error);   // apply refused; do NOT ship
writeFileSync("revision.md", revision);
```

Or use the harness end-to-end (see the "one-shot" section below).

### 3. Fidelity gate at k=7

Spawn `prose-fidelity-critic` with `(original, revision, fidelity-scan output)`,
seven times, each in a fresh clean-context session. Collect the seven verdicts.

```bash
node bundles/prose-tell-scan/tools/fidelity-scan.mjs original.md revision.md > scan.txt
# For each of k=7 draws:
claude -p --model sonnet --append-system-prompt \
  "$(cat ~/.claude/agents/prose-fidelity-critic.md | sed '1,/^---$/d;1,/^---$/d')" \
  "<the fidelity-critic case prompt with original, revision, scan.txt inlined>"
```

For most users, the run-harness does this fan-out automatically:

```bash
node bundles/prose-review/tests/run-harness.mjs prepare fidelity my-run-id \
  --fixtures-dir /tmp/my-single-fixture-dir --draws 7
node bundles/prose-review/tests/run-harness.mjs dispatch runs/my-run-id
node bundles/prose-review/tests/run-harness.mjs collect runs/my-run-id
```

### 4. Read the verdict distribution

For each fixture, the harness returns 7 verdicts. Reading the distribution:

| verdict distribution | what it means, in author terms |
|---|---|
| **7 of 7 FAITHFUL** | Highly confident the revision preserved everything. Ship it. |
| **6/7, 5/7 FAITHFUL** | A reader flagged something. Look at their reasoning; usually a legitimate near-miss the author can accept or fix. |
| **4/7, 3/7 FAITHFUL** | Genuine disagreement. This is a SPLIT. Read both sides and decide — the sampling policy surfaces disagreement, it does not resolve it. |
| **2/7 or fewer FAITHFUL** | The revision likely dropped something the critic considers material. Read the MATERIAL-LOSS findings; either fix the plan and re-run or accept the loss knowingly. |
| **0/7 FAITHFUL** | Unanimous. The revision definitely dropped something a critic thinks matters. Rewrite the plan. |

The sampling policy behind this — why k=7 and why SPLITs are surfaced not
resolved — is in [`../../.planning/SAMPLING-POLICY.md`](../../.planning/SAMPLING-POLICY.md).

### 5. Author decides

`MATERIAL-LOSS` is a report, not a rejection. A revision that dropped one
date earns it, correctly, and you decide whether the drop was intended. The
gate's job is to surface what a diff-check alone cannot catch.

**Refusals from the reviser (things in the `refused[]` list) are first-class.**
A revision with 5 of 6 entries applied and one refused is a better outcome
than a revision with 6 of 6 where the sixth is a plausible guess. Read the
refusal reason; usually it's a quote drift you'll want to fix in the plan, or
an ambiguity that means the plan needs to spell out which of two edits it
authorises.

## One-shot: use the harness end-to-end

For repeat use, the harness in `bundles/prose-review/tests/` bundles all four
steps. Given a fixture directory with `original.md` and `plan.json`:

```bash
# 1. prepare and dispatch reviser (k=1)
node bundles/prose-review/tests/revise-harness.mjs prepare 2026-08-08-my-draft
node bundles/prose-review/tests/revise-harness.mjs dispatch runs/2026-08-08-my-draft

# 2. collect + reconstruct revisions
node bundles/prose-review/tests/revise-harness.mjs collect runs/2026-08-08-my-draft

# 3. synthesise fidelity fixtures from the reconstruction
node bundles/prose-review/tests/revise-harness.mjs gate runs/2026-08-08-my-draft

# 4. prepare + dispatch fidelity gate at k=7 (or k=15 for high-confidence)
node bundles/prose-review/tests/run-harness.mjs prepare fidelity 2026-08-08-my-draft-gate \
  --fixtures-dir runs/2026-08-08-my-draft/fidelity-fixtures --draws 7
node bundles/prose-review/tests/run-harness.mjs dispatch runs/2026-08-08-my-draft-gate
node bundles/prose-review/tests/run-harness.mjs collect runs/2026-08-08-my-draft-gate
```

The harness is under `tests/` because it was built to acceptance-test the
primitives. It works equally well as a general-purpose runner — the "tests"
naming is history, not scope.

## A worked example

Original (`draft.md`, 3 sentences):

```
Vvedensky and I for some reason roared with laughter as we listened to you.
In 1888 I took the Pushkin prize.
There is no describing Paris, though; I will put off the description of it till I get home.
```

Plan (`plan.json`):

```json
{
  "draft": "draft.md",
  "voice_profile": "essay",
  "mode": "plan-only",
  "entries": [
    {
      "id": "e01",
      "source": "voice-critic",
      "location": {"line": 1, "quote": "roared with laughter"},
      "change": "replace with 'burst out with laughter'",
      "reason": "voice-critic: 'roared' is theatrical in a way the corpus never uses"
    },
    {
      "id": "e02",
      "source": "voice-critic",
      "location": {"line": 2, "quote": "In 1888 I took the Pushkin prize."},
      "change": "reorder to 'I took the Pushkin prize in 1888.' — same claim, same year, same agent",
      "reason": "voice-critic: 'In YEAR I did X' repeats too often in the paragraph"
    }
  ]
}
```

Reviser output:

```json
{
  "plan": "plan.json",
  "mode": "plan-only",
  "edits": [
    {
      "plan_id": "e01",
      "before": "roared with laughter",
      "after": "burst out with laughter",
      "reason": "voice-critic: 'roared' is theatrical in a way the corpus never uses"
    },
    {
      "plan_id": "e02",
      "before": "In 1888 I took the Pushkin prize.",
      "after": "I took the Pushkin prize in 1888.",
      "reason": "voice-critic: 'In YEAR I did X' repeats too often in the paragraph"
    }
  ],
  "refused": [],
  "noticed_but_not_edited": []
}
```

Reconstructed revision:

```
Vvedensky and I for some reason burst out with laughter as we listened to you.
I took the Pushkin prize in 1888.
There is no describing Paris, though; I will put off the description of it till I get home.
```

Fidelity gate at k=7 on this revision returned, in a real acceptance run:

- **e01 (word swap)**: 4F / 3ML — SPLIT. Some critics read "roared" and "burst
  out with" as claim-drift (loud/sustained vs. sudden), others as equivalent
  phrasings. Author's call.
- **e02 (rephrase)**: 7F / 0ML — unanimous FAITHFUL. Chekhov still the agent,
  same year, same prize.

Author's decision: keep both edits, log the SPLIT on e01 for follow-up, ship
the revision.

## Common patterns

**Plan is ambiguous ("improve the flow"):** the reviser refuses. Refusal is
first-class. Rewrite the plan to name the specific edit.

**Plan quote doesn't match:** the reviser refuses. Fix the quote (line
numbers shift as the draft changes) or update the plan to point at the
current span.

**Gate returns unanimous MATERIAL-LOSS:** the plan authorised a cut or
change the critic reliably reads as loss. Rewrite the plan (make the cut
more surgical, keep the semantic content the critic values) and re-run.

**Gate returns SPLIT:** at least one reader saw loss, at least one did not.
The revision has a genuine disagreement embedded in it. Read the ML critics'
findings — they name specifically what they think was lost. Fix, accept
knowingly, or hand-adjust.

**Gate is expensive on a long document:** k=7 is 7 dispatches per document,
not per edit. Multi-edit plans cost the same as single-edit ones because the
critic reads the whole document once per draw. Documents up to ~5000 words
work well; longer needs a segmentation strategy the current pipeline does
not attempt.

## What NOT to do

- **Do not skip the fidelity gate.** The reviser applies faithfully — but
  faithful application of an aggressive plan still produces a revision that
  dropped things. The gate is the check.
- **Do not treat the reviser's output as the revision.** The reviser emits
  a change log; the harness produces the revision. Reading the log as the
  revision misses everything the plan did not touch.
- **Do not run the fidelity gate at k=1 for production use.** k=3 flips
  direction unpredictably on borderline word-choice edits (measured at ~50%
  on some fixtures); k=7 is the default for a reason. See the sampling
  policy for the math.
- **Do not modify the reviser's tool allowlist.** `Read`, `Grep`, `Glob` only.
  Writing to disk is the harness's job, not the reviser's — that keeps the
  fidelity gate the only path by which a revision reaches a file the author
  might see.

## Known limits (ship v0.3.0)

- **One draft at a time.** The reviser reads and rewrites one document.
- **Plans are hand-authored, for now.** DESIGN.md gives consolidation
  ("turn N critic transcripts into one plan") to the orchestrating session,
  not to a primitive. That work is not in this ship.
- **English essay-length prose.** Untested on fiction, poetry, technical
  writing, or non-English text.
- **The fidelity gate can still return SPLIT.** When it does, the run does
  not accept or reject on its own — it surfaces both versions. The author
  decides.
- **Idempotence is a claim not a proof, until v0.4 tests it.** The prompt is
  written to be idempotent (rerunning on already-accepted output should not
  degrade it), but the property has not been measured.
