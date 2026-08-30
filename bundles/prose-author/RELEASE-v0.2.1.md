# prose-author v0.2.1 release notes

v0.2.1 hardens one specific blank-page failure without changing the v0.2.0
profile, drafting, claim-audit, or review claims.

## What changed

- Added `voice-draft-residual-prune/1`, a small plan containing only whole body
  paragraph IDs and a reason.
- Added `tools/draft-residual-prune.mjs` with portable `schema`, `prompt`, and
  `apply` commands. Code—not the planner—restores an explicitly locked title,
  removes an excess terminal question mark from a Markdown heading, applies the
  selected deletions, and remeasures the complete draft.
- Updated `prose-draft` to use this path only when the semantic revision remains
  overlength and no unsupported semantic rewrite is required. Underlength drafts,
  arbitrary semantic misses, section-emptying plans, closing-paragraph deletion,
  and out-of-range results are rejected.

## Evidence

The immutable v0.2.0 evaluation stopped on m05 at 851 words, three question
marks, and a changed locked title. Two attempted complete-prose correction
canaries failed at 857 and 845 words, both retaining all three questions. Those
failures are checked in rather than discarded.

The bounded residual-prune canary used the same request, profile, and rejected
revision. Its single zero-redraw planner call selected paragraphs 10 and 14.
Deterministic application produced 737 words, restored the exact title, and left
every semantic-bearing count inside its locked band. The existing exact
conformance stage remains responsible for the resulting em-dash deficit.

All repository self-tests passed after the change. This is targeted diagnostic
evidence, not a fresh 20-draft acceptance run and not a resemblance, quality,
detector, or factual-accuracy claim.

## Limits

- Whole-paragraph pruning can alter emphasis or flow even when measured counters
  remain valid. Independent voice review is still required for a gated result.
- The path repairs overlength drafts only. It does not solve underlength output
  or arbitrary semantic failures.
- Evaluation still covers two modern licensed authors, not a user's private
  corpus or a broad range of languages and historical registers.
