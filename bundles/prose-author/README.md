# prose-author

Personal-style drafting with explicit preferences, human writing examples and
checks tied to the delivered text. **v0.6.0 adds shared writing identities** across
compatible installations, without copying your corpus or preferences into plugins.
See [identity setup and limits](skills/prose-draft/references/identities.md) and
[v0.6 verification](tests/V060-ENGINEERING.md). Historical evaluation evidence
remains in [v0.5 verification](tests/V050-FINAL-ENGINEERING.md) and
[v0.4 verification](tests/V040-PROGRESS.md).

Ask your coding agent to draft a reply, turn an outline into a blog post, rewrite
a passage or continue an existing piece. You do not run the writing scripts
yourself. “Blank page” means new prose from a brief, rather than an existing
passage to rewrite.

## What constrains the writing

The optional history extension retains per-piece numbers, not source prose, and
shows how habits vary across comparable writing and over time. Collection needs
an explicit identity/scope opt-in; model-based rhetorical measurements need a
separate opt-in. Independent human writing, assisted writing and generated output
stay separate. A changing average never silently changes your preferences.

Ask for a history report, a comparison of recent essays, or a drafting-stage
comparison. English rhythm measurements are heuristic; rhetorical labels are
fallible estimates. Reports show empirical variation, not a voice score or a
quality guarantee. See [the history interface and privacy limits](skills/prose-draft/references/history.md).

Your explicit rules and the corpus have different jobs. Literal phrases,
punctuation restrictions, word limits and supported count ranges are checked
deterministically against the exact final text. Other preferences receive
contextual review; they are not falsely described as mechanically enforced.

The corpus provides cited style evidence and descriptive distributions, not a
quota for every draft. A measured absence means “not observed in these samples.”
The drafter reads all ten coverage dimensions. Voice review looks for concrete
departures in function, diction, reader relationship, figures and placement,
not merely whether a counter hits a target.

By default, generation receives up to three deterministically selected whole
human examples alongside a profile. You can choose profile-only generation.
Examples guide style; they do not supply facts about your life. The tell catalog
never enters generation or repair.

## Start with what you have

- No corpus: use explicit preferences without claiming a learned voice.
- Short samples: attributable short pieces count. The default supported-profile
  floor is five independent pieces and 1,000 aggregate author-written words per
  selected register/form. Smaller sets remain explicitly limited evidence.
- An existing passage: preserve its supplied facts and qualifications during a
  rewrite, or pass it as coherence context for continuation. Generated text is
  never silently added to the human corpus.
- A correction: “never use exclamation marks in replies” saves with a visible
  scope/version receipt and undo. Ordinary edits stay local; inferred
  preferences require approval. One word can be useful feedback.

Claude and Codex share a default private preference directory, with an explicit
override for other identities. Independent preferences survive profile refresh;
observation-dependent choices require validated rebinding. Equally specific
conflicts ask for clarification.

## What ships in the candidate

| Component | Responsibility |
| --- | --- |
| `prose-draft` skill | Prepare a writing task and invoke the production runner |
| `prose-style-tune` skill | Save, scope, discover, compare, version and undo choices |
| `voice-profile-render` agent | Interpret cited human evidence for profile assembly |
| `voice-draft` agent | Produce one candidate or bounded repair from authorized inputs |
| `voice-feedback-interpret` agent | Propose narrow changes; never save its own proposal |
| `voice-rhetoric-measure` agent | Annotate supplied rhetorical evidence; caller computes numbers |
| Numerical history tools | Keep consented per-piece statistics, contextual reports and stage comparisons |

Primitive prompts remain canonical. Standalone agents and the skill's embedded
prompts are rendered from those sources with byte-identical bodies. Each
component stays independently usable; the skills provide the integrated workflow.

## Checks and receipts

The dependency-free Node runner uses authenticated Claude or Codex CLI sessions,
preserving configured models. It records actual calls and elapsed time, not
speculative dollar costs. It separates preparation, generation, mechanical
checking, task/voice/fidelity review, bounded repair and final assembly.

Every output receives mechanical checks and task review; profiles add voice
review, rewrites and repairs add fidelity review. Researched or explicitly
publication-sensitive tasks add deeper claim auditing against supplied sources.
At most two repair cycles address identified problems and recheck final bytes.

The result includes prose, a concise receipt and a detailed sidecar with hashes,
preferences, omissions, claims requiring verification and repair history.
The runtime generates `delivery.md` and its receipt from recorded results;
the host verifies and links to that authoritative file. The host is instructed
to label chat summaries unverified; they do not replace its receipt. A host that bypasses
the runner or changes its output can bypass
these checks; the plugin does not control every coding agent's final message.
`passed`, `failed` and `not-evaluated` are distinct. Missing dependencies or
unresolved reviews yield an ungated result; exhausted repairs yield an incomplete
one. Neither is a certification.

See [installation](INSTALL.md), [runtime contracts](RUNTIME.md),
[protocol](PROTOCOL.md) and [design](DESIGN.md).

## Evidence and limits

The bounded comparison records two modern licensed authors across three forms
and three conditions: examples, profile, and both. It measures initial-draft
compliance, deviations, omissions, copying flags, calls and latency. It does not
require the most elaborate condition to win or revive the old 20/60 release bar.
Human keep/edit preference and editing burden remain unmeasured without feedback.

The history extension adds a locked six-passage/two-draw rhetorical diagnostic,
not a new quality bar. All twelve estimates were structurally valid; semantic
accuracy is unmeasured. Installed artifacts passed for both hosts. Claude's
corrected conversation still omitted the required unverified label on its chat
paraphrase; that failed test remains visible in the completion report.

No private user corpus, broad language range, resemblance guarantee, quality
guarantee or hallucination-elimination claim is established. Semantic critics
can miss mistakes. Context restriction is partial, not general OS isolation.
Whole-example copying checks are heuristic. Verify consequential factual
additions against real sources.

Historical /1 and /2 profiles, /1 preferences and quota-era evaluation remain
readable with their original tools and meanings. Current artifacts use
`voice-profile/3`, `voice-preferences/2` and `voice-style-spec/2`; refreshing is
explicit, never a silent reinterpretation of old evidence. The historical
approved-corpus ingestion rules in [PROFILES.md](../prose-tell-scan/PROFILES.md)
are unchanged and do not govern current correction learning.
