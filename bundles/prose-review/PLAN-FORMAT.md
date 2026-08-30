# Edit plan format

The contract `prose-reviser` reads and writes to. Held in this document rather than
in a schema file because there is one consumer and one producer today, and a schema
that has never validated anything is worth less than a paragraph that describes what
is required and why.

## The unit

A **plan** is a JSON object. It names a draft, names the voice profile the reviser
should stay inside, and carries an ordered list of **entries**. Each entry is one
edit the reviser is authorised to make.

```json
{
  "draft": "path/to/original.md",
  "voice_profile": "essay",
  "mode": "plan-only",
  "entries": [
    {
      "id": "e01",
      "source": "voice-critic",
      "location": {"line": 42, "quote": "the utilised approach"},
      "change": "replace with 'the approach we used'",
      "reason": "voice-critic flagged 'utilised' as outside the corpus register"
    }
  ]
}
```

## Field-by-field, and why each is required

**`draft`** — a path to the original text. The reviser reads it and does not
edit it. The fidelity gate uses it as ground truth.

**`voice_profile`** — the profile name (`essay`, `technical`, etc.) whose corpus
the reviser must stay inside. Not the same thing as "which corpus to imitate" — the
reviser is not a drafter; it makes small changes that a fresh reader would not
notice as a change of hand. The profile is the fence, not the goal.

**`mode`** — `plan-only` or `plan-plus-prose`. Default is `plan-only`.
- `plan-only` — the reviser sees the entries below and nothing else. Small
  attack surface, clean traceability, no critic overconfidence leaking into an
  edit.
- `plan-plus-prose` — each entry may carry a `critic_transcript` field, and the
  reviser reads it as context. The transcript never authorises an edit the plan
  does not already; it only supplies reasoning the reviser may weigh. Use when a
  plan entry's `change` is genuinely underdetermined and the critic's argument
  is the missing half.

Two modes exist because DESIGN.md's open question 4 ("does the reviser see the
critics' prose, or only the plan?") is a real fork. The default is the safer
half; the other half is available and its extra risk is stated on the tin.

**`entries[]`** — the actual work.

- **`id`** — a short string, unique within the plan. The reviser echoes this on
  every diff it makes, which is how the fidelity critic checks "edits outside
  the plan" — an atom whose span is not inside any entry's `location.quote`, or
  a diff whose change log carries no matching `id`, is out of plan by definition.

- **`source`** — where the entry came from. Free-form (`voice-critic`,
  `substance-critic`, `author`, `consolidator`) but recorded so a run log can
  explain which critic's finding drove which change. The reviser does not act
  on this — it is provenance, not instruction.

- **`location`** — `{line: N, quote: "..."}`. The `quote` is what
  `prose-fidelity-critic` matches spans against. The `line` is for the
  operator's report and is not load-bearing; if a document was reflowed between
  the plan being written and the reviser reading it, the quote is the anchor.

- **`change`** — a short imperative sentence. What to do. Not why. If the
  reviser cannot execute the change as stated (the quote does not match, the
  change is ambiguous), it refuses that entry rather than guessing. Silence is
  better than a plausible wrong edit.

- **`reason`** — one line, echoed into the change log unedited. This is the
  audit trail: any diff the reviser made, why it made it.

- **`critic_transcript`** *(optional, `plan-plus-prose` only)* — inline text or
  a path relative to the plan file. Ignored in `plan-only` mode even if
  present, so a plan authored for one mode does not accidentally leak into
  another.

## What is NOT in the plan, and why

**No `catalog.json`.** Not as a hint, not as an "avoid these words" list, not in
any form. Same rule as the drafter, same reason: prose optimised against a tell
list reads like nobody wrote it. If a voice-critic finding was originally about
a catalogued word, the plan entry says so in prose (*"'delve' appears three
times, replace two"*) — the reviser never sees the catalog.

**No verdict.** A plan says what to do, not what a critic decided. Verdicts
belong to critics, and the reviser has no verdict to render.

**No hint at the desired output.** Not a suggested replacement, not "something
like...". The reviser writes; the plan authorises.

## The change log the reviser produces

Every reviser run emits a JSON change log alongside the revised text:

```json
{
  "plan": "path/to/plan.json",
  "plan_sha256": "<hash of the plan file, unchanged>",
  "original_sha256": "<hash of draft before>",
  "revision_sha256": "<hash of draft after>",
  "mode": "plan-only",
  "edits": [
    {
      "plan_id": "e01",
      "before": "the utilised approach",
      "after": "the approach we used",
      "reason": "voice-critic flagged 'utilised' as outside the corpus register"
    }
  ],
  "refused": [
    {"plan_id": "e04", "reason": "quote does not match — original text may have moved"}
  ]
}
```

**Every `edits[]` entry carries the `plan_id` it acted on.** This is the property
that makes "edits outside the plan" checkable rather than a matter of taste.

**`refused[]` is not a failure.** A plan entry the reviser could not execute
cleanly gets refused and logged. A revision with 5 of 6 entries applied and one
refused is a better outcome than a revision with 6 of 6 entries where the
sixth is a plausible guess.

## What the fidelity gate does with all this

1. Runs `fidelity-scan` on (original, revision). This is presence-only.
2. Dispatches `prose-fidelity-critic` at k=3, giving it the scan output, the
   plan, and the change log.
3. Takes the majority verdict per the sampling policy:
   - **FAITHFUL 3/3** — accept the revision, present to author.
   - **MATERIAL-LOSS majority** — restore the original, present the plan entries
     that caused the loss so the author can re-plan.
   - **SPLIT** — surface: show the author both versions and the disagreement.

The critic's priority-4 rule ("edits outside the plan") gets its first real
input here. Any diff whose span is not covered by an entry's `location.quote`,
or whose change log carries no `plan_id`, counts as out-of-plan **even when the
change is good**. That is the reviser's mandate spelled out: apply the plan,
nothing else.
