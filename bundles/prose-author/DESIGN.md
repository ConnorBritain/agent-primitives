# prose-author — design

The v0.4 candidate separates **what the samples do**, **what the user chooses**
and **what a checker can actually establish**. It remains a set of independently
usable primitives with a headless runtime, not a writing application or service.

## Why observed frequencies are not quotas

A corpus is a finite set of writing occasions. Per-document distributions
preserve variation that pooled rates hide. Applying every empirical interval
as a mandatory per-draft constraint can reject the writer's own held-out work;
it can also produce a caricature that hits counts without their rhetorical
function. Current diagnostics expose those held-out departures before claiming
the distributions are useful guidance.

This does not make style optional. The profile records cited behavior and
placement. Generation reads every coverage dimension, and targeted review
accounts for supported instructions. Repairs retain the original style inputs
and check for lost stylistic material. Numerical variation alone is not an
error; a concrete substitution that flattens supported style can be a finding.
Neither model review nor a counter guarantees resemblance.

Explicit choices are different. A user may prohibit a phrase, constrain
punctuation, set a word limit or choose an exact count range. Those rules are
checked against actual final prose independently of corpus evidence. Semantic
preferences stay reviewable, not mislabeled as deterministic.

## Mechanisms and ownership

- `visible-prose.mjs` preserves source locations while excluding non-prose and
  separating identifiable quotations from author-written material.
- `profile-v3.mjs` owns per-document measurements, distributions, source
  recounting and assembly. The renderer owns cited interpretation, not arithmetic.
- `preferences-v2.mjs` owns portable choices and contextual compilation;
  `preference-store.mjs` owns local immutable revisions, writer locking and undo.
- `style-rules.mjs` owns explicit-rule checks and advisory observations.
- `runtime-adapters.mjs` owns authenticated CLI dispatch and event inspection.
- `writing-runtime.mjs` owns task-scaled review, bounded repair and final assembly.
- Skills own conversation and authorized input preparation, not hidden alternate
  checking pipelines. Primitive prompts remain the single source of instructions.

Paths above are under `skills/prose-draft/tools/`. No production dependencies
beyond Node and a supported authenticated CLI are required. Independent review
and scanning remain companion bundle responsibilities.

## Avoiding feedback loops

The v0.5 history extension observes variation rather than optimizing a similarity
score. Deterministic counters and rhythm, and optional rhetorical estimates, have
separate definitions and compatibility series. Keeping per-piece numbers permits
later regrouping without copying the underlying prose. It does not permit later
recounting without the originals or capture all rhetorical meaning.

One immutable reference is used throughout a writing run. Numerical departures
and stage differences can inform existing voice review; only a located,
contextually justified finding can authorize repair. A repair is never required
merely to return a feature to its empirical interval. The history store and
read-only rhetoric annotator remain independently reusable mechanisms, not an
application, watcher, or service.

Human-independent, assisted, generated, and unknown histories are distinct.
Opting into collection does not authorize rhetorical model calls until separately
enabled. Generated acceptance never updates the independent human baseline.
Recent variation does not change an explicit preference or pinned reference.

Selected examples are whole human-authored pieces, at most three by default,
chosen deterministically by available form/register and length proximity.
Examples may be disabled. The tell catalog never reaches generation or repair.

An existing passage is content/coherence context for rewriting or continuation,
not automatically style evidence. A kept model draft is not silently relabeled
human. Historical approved-corpus ingestion remains available under its original
safeguards; current measurement and default selection use human samples only.

Correction learning is separate from corpus ingestion. A one-word correction
can support a narrow preference proposal. Clear persistent instructions save
with scope and undo; inferred instructions need approval. Neither approval nor
edit fraction establishes that a passage was wholly human-authored.

## Atomicity and a possible future split

The renderer interprets samples. The drafter produces a candidate. The feedback
interpreter proposes a preference change. Reviewers judge specified properties.
Deterministic tools keep contracts, history and checks explicit. Consumers can
use these pieces without adopting the complete workflow.

A small local preference store serves these primitives; it is not a reason to
move the repository. A corpus library, accounts, project lifecycle UI, visual
annotation or hosted collaboration would make a separate writing product
natural. Such a product should consume these contracts rather than relocate
their canonical definitions. Pi receives an adapter interface, not a claimed
implementation.

## Verification boundaries

Mechanical checks bind exact output bytes; semantic review is fallible.
Unavailable checks are not-evaluated and do not become passes. Review intensity
depends on the task: every output gets mechanical/task checks, profiles add
voice review, rewrites/repairs add fidelity review, researched or sensitive work
adds claim auditing. Repairs stop after two cycles and may not silently delete
substance to satisfy a count.

The bounded comparison evaluates examples, profile, and both across six cases.
It records all eighteen initial drafts without redraw or a k=3 panel. It need
not prove the richest input wins. Human preference and editing burden remain
unmeasured until someone tries the drafts. No required attestation or resurrected
20/60 release bar belongs in this workflow.

Current versions are profile/3, preferences/2 and style-spec/2. Historical
schemas, prompts, scoring and raw runs keep their original meaning. Current
prompt evidence must be recorded separately. The tool makes uncertainty visible;
it does not promise to eliminate hallucinations or certify an author's identity.
## Shared identities (v0.6)

Installation owns executable code, not the writer's evidence or choices. A
versioned local registry connects each writer to independently stored corpus,
profile, preferences and metrics. This makes harness switching a path-resolution
problem rather than a data-copying problem. Profile publication is explicit and
immutable; independent rules survive it. Local writer locks and expected revisions
prevent competing updates from silently replacing a newer selection, but are not
distributed synchronization. Jobs snapshot input versions before model dispatch;
later identity changes do not invalidate past receipts. Explicit foreign evidence
does not inherit the user's default writing identity.
