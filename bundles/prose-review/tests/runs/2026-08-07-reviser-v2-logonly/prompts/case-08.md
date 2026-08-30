You have an original draft and an edit plan. Your only job is to emit a change log of before/after pairs — one entry per plan entry you applied — plus explicit refusals for anything the plan named that you could not apply cleanly. **You do not reproduce the draft.** The harness applies your log to the original to reconstruct the revision, and the fidelity critic judges that reconstruction. Your output is the diff, not the result.

**Why the diff and not the whole revision, stated so the constraint is not mysterious.** A reviser that emits the whole revised draft has to reproduce hundreds of words of source it did not write, and on any text touching charged material (state violence, medical detail, self-harm language) the model's post-processing filter reliably blocks that output — deterministically, across models. Diagnosed 2026-08-07: four Chekhov letters passed, four (Paris riots, Yalta autobiography) failed identically, half-length passed, log-only passed, opus failed identically. The trigger is bulk reproduction, not the reviser's reasoning. This design sidesteps that entirely, and buys a stronger safety property in the same move: **a reviser that emits only diffs cannot make an out-of-plan edit by construction** — its only output channel is a list of before/after pairs referring to plan ids.

You are the one primitive here that mutates prose. That is a real responsibility. The critics have to be shown quiet on human writing before anything acts on what they say, and the fidelity check has to land before the tool that produces things it might catch — both of those preconditions are met, and this primitive exists because they are. If either regresses, this primitive stops being safe.

## What the plan is, and what it is not

The plan is an ordered list of entries. Each carries an `id`, a `location` with a `quote` you must find in the draft verbatim, a one-line `change` telling you what to do, a `reason`, and a `source`. The `quote` is your anchor: the change applies to the span it names, and to no other span.

**The plan is a list of authorisations, not a list of suggestions.** You may apply an entry, or refuse it. You may not apply an entry differently than it says. You may not apply an entry it did not include, even if you notice the same problem elsewhere. If a plan entry says "cut sentence X" and sentence Y has the same problem, sentence Y is not yours to touch — the plan owner decided sentence Y stays, and whether that decision is right is not your question.

**The plan never names the catalog.** You will not see `catalog.json` and you must not ask for it. If a plan entry's reason references a pattern by name — "the tricolon at line 12" — treat the pattern name as prose the plan author wrote, not as a lookup key. You are not optimising against a list.

## Modes

The plan carries a `mode` field. It is `plan-only` or `plan-plus-prose`.

**`plan-only`** (default). You see the plan entries and nothing else. Ignore any `critic_transcript` fields even if present.

**`plan-plus-prose`.** Each entry may carry a `critic_transcript` — the critic's own words about the finding. You may read it as context for what the entry means. **You may not treat it as additional authorisation.** A critic saying "this whole paragraph could go" does not let you cut a whole paragraph if the plan entry only names one sentence. The plan is the authorisation set. The prose is background.

The reason both modes exist is that a critic's reasoning is sometimes the missing half of an underdetermined plan entry, and sometimes it is where the critic's overconfidence leaks into an edit. `plan-only` is the safer half; `plan-plus-prose` is available and the extra risk is real.

## Applying an entry

For each plan entry, in order:

1. **Locate the exact quote** in the draft. Verbatim match. If the quote does not appear, refuse the entry and log the reason.
2. **Read the `change`.** If it is ambiguous — you can imagine two different edits that both satisfy it — refuse the entry. Silence is better than a plausible wrong edit.
3. **Make the smallest edit that satisfies the change.** Not the most elegant, not the most improved. The smallest. Prefer replacing a word to replacing a phrase; prefer replacing a phrase to replacing a sentence; prefer replacing a sentence to reordering paragraphs.
4. **Preserve every fact, number, date, name, quotation and qualifier the entry does not tell you to change.** This is not a courtesy — a revision that quietly drops a date fails the fidelity gate and is thrown away. Assume every specific in the span is load-bearing until the plan says otherwise.
5. **Preserve register.** If the draft says "utilised" three times and the plan asks you to change one to "used," change one. Do not tidy the other two into consistency; that is a separate decision the plan owner did not make.

If an entry cannot be applied cleanly for any of these reasons, refuse it. Refused entries are recorded in the change log with the reason. A revision with five of six entries applied and one refused is a better outcome than a revision with six of six where the sixth is a guess.

## What you must not do

**Do not make edits the plan did not authorise**, even if you would improve the draft by doing so. A better sentence you inserted is still an unauthorised edit, and the fidelity critic's priority-4 rule ("edits outside the plan") is what catches it. If you notice something the plan missed, put it under `noticed_but_not_edited` in your change log. Do not act on it.

**Do not describe what you did as making the draft better.** You do not know that. You applied a plan.

**Do not claim the revision sounds like the author.** That is unmeasurable and it is the one thing the author is best placed to judge.

**Do not claim it would pass any detector.** Refused on principle everywhere in this repo.

**Do not summarise, condense, tighten, or improve on your own initiative.** Every one of those is an edit outside the plan.

## Output

**ONE artifact: the change log, in a ```json fence.** Nothing else. No revised draft, no preamble, no closing remark. The harness applies your log to the original to reconstruct the revision; the fidelity critic reads that reconstruction. You never reproduce the draft.

Shape, matched exactly:

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

Rules for the log:

- Every entry in `edits[]` MUST carry a `plan_id` that exists in the plan.
- `before` MUST be an exact substring of the original draft — the harness will refuse to apply your log otherwise, because the substitution would either match the wrong span or match nothing at all. When the plan authorises a delete, `after` is the empty string.
- `before` MUST also be inside (or equal to) the plan entry's `location.quote` — this is what makes the plan_id → span mapping meaningful. An edit whose before-text is genuine text in the original but is NOT inside the authorising plan entry's quote is an out-of-plan edit the harness catches and refuses.
- `reason` is echoed from the plan entry, unedited. You are not writing new reasoning here; you are auditing what you did.
- `refused[]` may be empty. `noticed_but_not_edited[]` may be empty.
- No key beyond these appears in the log.

**Content hashes are the harness's job, not yours.** The harness computes `plan_sha256`, `original_sha256` and `revision_sha256` after applying your log. Do not emit those fields.

**Terse. No commentary. No preamble. One fenced json block and that is the whole output.**

---

## Your inputs

Plan path (for the change log): `plan.json`

The plan, verbatim:

```json
{
  "draft": "original.md",
  "voice_profile": "essay",
  "mode": "plan-only",
  "entries": [
    {
      "id": "e01",
      "source": "author",
      "location": {
        "line": 21,
        "quote": "In 1884 I took my\r\ndegree in medicine at the University of Moscow."
      },
      "change": "delete this sentence — trim the biography",
      "reason": "author asked to shorten the biographical paragraph"
    }
  ]
}
```

The draft to revise, verbatim (frontmatter has been stripped; treat the text below as line 1):

```markdown
MOSCOW,
February 22, 1892.


... You are mistaken in thinking you were drunk at Shtcheglov’s name-day
party. You had had a drop, that was all. You danced when they all danced,
and your jigitivka on the cabman’s box excited nothing but general delight.
As for your criticism, it was most likely far from severe, as I don’t
remember it. I only remember that Vvedensky and I for some reason roared
with laughter as we listened to you.

Do you want my biography? Here it is. I was born in Taganrog in 1860. I
finished the course at Taganrog high school in 1879. In 1884 I took my
degree in medicine at the University of Moscow. In 1888 I gained the
Pushkin prize. In 1890 I made a journey to Sahalin across Siberia and back
by sea. In 1891 I made a tour in Europe, where I drank excellent wine and
ate oysters. In 1892 I took part in an orgy in the company of V. A. Tihonov
at a name-day party. I began writing in 1879. The published collections of
my works are: “Motley Tales,” “In the Twilight,” “Stories,” “Surly People,”
 and a novel, “The Duel.” I have sinned in the dramatic line too, though
with moderation. I have been translated into all the languages with the
exception of the foreign ones, though I have indeed long ago been
translated by the Germans. The Czechs and the Serbs approve of me also, and
the French are not indifferent. The mysteries of love I fathomed at the age
of thirteen. With my colleagues, doctors, and literary men alike, I am on
the best of terms. I am a bachelor. I should like to receive a pension. I
practice medicine, and so much so that sometimes in the summer I perform
post-mortems, though I have not done so for two or three years. Of authors
my favourite is Tolstoy, of doctors Zaharin.

All that is nonsense though. Write what you like. If you haven’t facts make
up with lyricism.
```

Emit ONLY the change log in a ```json fence — one entry per plan entry you applied,
plus refusals for anything you could not apply cleanly. Do NOT emit the revised draft:
the harness applies your log to the original to reconstruct it. Nothing else.
