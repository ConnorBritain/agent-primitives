# v1 renders — the prompt-adherence gap that forced a prompt fix

These are the **first three dispatches**, run against `agent.md` at
`sha256:41179c6e26e3b743cc3c2f05c1c59d63b63865a76a1a619126286d0cbde7aea9`.

They are kept because they are the evidence for a prompt change, not because they are
deliverables. **They do not validate against `voice-profile/1`** and the selftest does
not scan this directory. The shipped S2 artefacts are in `../raw/`.

## What went wrong

The v1 prompt listed eight sections by their *prose headings* ("How a piece opens")
and required a `section` key in the emitted JSON — but never said what the key should
be spelled. Two independent renders of the same corpus chose different vocabularies:

| section | draw A (`t1`) | draw B (`t3`) | schema |
|---|---|---|---|
| 1 | `cadence` | `cadence` | `cadence` |
| 2 | `opening` | `openings` | `openings` |
| 3 | `closing` | `closes` | `closings` |
| 4 | `address` | `address` | `address` |
| 5 | `figures` | `figures` | `figures` |
| 6 | `register` | `register-range` | `register-range` |
| 7 | `never-does` | `absences` | `absences` |
| 8 | *(not emitted)* | *(not emitted)* | `gaps` |

**Four of eight keys disagreed between two draws, and neither draw matched the
schema.** Section 8 was written in prose by both and emitted by neither.

The refusal shape had the same class of gap. The v1 prompt said "emit the json fence
alone, with `refused` set to the reason" without saying *and nothing else*, so the
refusal came back carrying `observations: []`, `samples_used: []`, `confidence`, and
`voice_card` — a shape a careless caller could read a profile off.

This is the same class of finding as FU-1 (`prose-fidelity-critic`'s non-bare verdict
line): the judgement was fine, the contract was underspecified. The fix is to the
prompt, not to the schema — loosening `SECTIONS` to accept every synonym two draws
happened to produce would be tuning the check to the output.

## The fix

`agent.md` now gives each section a fixed key in backticks alongside its heading,
restates the eight keys in the output contract, and specifies the refusal as a
three-key shape that must carry nothing else. Post-fix prompt is
`sha256:716367ab9528956d3a5e929090ee9c45dd03dfa1bfb5e3c6e67827a7940f8e54`.
`validateVoiceProfile` enforces both, and `../raw/` holds re-runs under the fixed prompt.

## One v1 observation worth keeping — a real SPLIT, surfaced not resolved

The two v1 Chekhov draws disagreed substantively, not just about key names, and the
disagreement matters more than the bug that surfaced it.

**Draw B recorded the ellipsis as a voice marker** — *"the trailing four-dot ellipsis
ends a thought by letting it go rather than finishing it — 9/10"*.

**Draw A deliberately declined to**, and put its reasoning in the gaps section:

> Four of ten samples begin with an ellipsis, and ellipses recur mid-text. These are
> editorial excisions in the published volume as often as authorial punctuation, and
> the two cannot be separated from inside the corpus — so no observation was made
> about ellipsis use.

Draw A is very likely right, and the consequence reaches backwards. S1's diagnostic
listed *"ellipses, exclamations, direct-address questions"* as the dialogic register
the AI pastiche was missing. If a substantial share of the ellipses in this corpus are
Garnett's editor eliding text rather than Chekhov trailing off, then part of S1's
headline finding is a property of the edition, not of the author.

Per `SAMPLING-POLICY.md` this is surfaced, not resolved. It is written up as a
follow-up in the completion doc; it does not block S2, and S2 does not decide it.
