# prose-author v0.2.0 acceptance — locked design

**This file and `CASES.json` must be committed before the first acceptance draft is
dispatched. Results may fill `TALLY.json` and `COMPLETE.md`; they may not change this
design, the prompts, the profile assignment, or the bar.**

## Question

Can the final `voice-profile-render` → `voice-draft` pipeline clear the generator ship bar
on two modern, licensed, single-author corpora without selecting a favourable render?

## Inputs

- `doctorow-blog`: ten CC BY 4.0 Pluralistic posts.
- `eff-mullin`: eleven CC BY 4.0 EFF Deeplinks posts by Joe Mullin.
- Three fresh `voice-profile/2` renders per corpus. All six must pass the coverage contract.
- Ten prompts per corpus: four essay topics, three title-and-outline posts, and three replies.
- The two corpora receive the same ten prompts. This keeps topic and form fixed while voice
  changes.
- Profile assignment is round-robin (`r1`, `r2`, `r3`, repeat), fixed in `CASES.json`.
  A failed render is not replaced by the best remaining render.

The acceptance drafts are new. No historical draft contributes to this result.

## Dispatch and scoring

- `voice-draft`: one clean-context dispatch per draft, with only its prompt and assigned
  profile inline. No tools and no corpus access.
- `prose-voice-critic`: three fresh clean-context draws per draft, sixty draws total. A
  completed draw is never redrawn.
- One underdetermined-register request per corpus must refuse with no draft.
- `acceptance-runner.mjs` records raw responses, prompt and agent hashes, corpus locks,
  parsed contracts, and the final tally. Hand-written verdicts are not accepted.

## Bar

Unchanged from `.planning/2026-08-07-generator-ship-bar.md`:

1. Every draft has a majority `CLEAN` verdict at k=3.
2. Every draft has at most 1.0 findings per draw.
3. Zero fabricated citations.
4. Zero corpus leakage outside text quoted by the profile.
5. Both underdetermined requests refuse.
6. No draft claims resemblance, quality, or detector performance.

All twenty drafts and all structural gates must pass. A miss keeps both primitives held.
After a fix, a new complete run is required; favourable cells from this run cannot be reused.

## Evidence audit

Before scoring, the collector must validate both output contracts, verify every profile and
agent hash, recompute the deterministic structural gates, and report any unlocatable or
divergent recountable profile claim. A contract or provenance failure invalidates the run;
it cannot be recorded as a voice finding.

## What a pass does not establish

- It does not show that the system sounds like a private user. No private corpus is part of
  this release gate.
- It does not validate poetry, translation, tables, code, or whole-book generation.
- It does not make Codex or AGENTS.md-only tool restrictions enforceable. Those ports remain
  advisory as documented.
