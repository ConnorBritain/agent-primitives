# Draft and critic structured transport — claim audit still fails

This disposable Doctorow cell tested prepared commit `f03ca7c`. It is development
evidence only and does not contribute to v0.2 acceptance.

## Draft result

- Claude CLI, Sonnet, low effort, native `voice-draft-source/1`
- 672 words
- 55,944 ms model duration
- $0.1076 API-equivalent telemetry through the authenticated subscription CLI
- five disclosed claims and one supported omission
- valid semantic source and valid assembled `voice-draft/1`
- zero placeholder citations, corpus-leakage 6-grams, or forbidden claims

The final register pass corrected the preceding probe's policy-brief vocabulary. The prose
uses actor-and-verb argument, stays inside the profile's punctuation and address patterns,
and records the named-allies habit it could not honestly apply.

## Human claim audit — fail

The added sentence-by-sentence inventory improved disclosure but did not make it complete.
Among the assertions not represented in `claims`:

- Deere software reports back and can render a machine inoperable during harvest.
- Deere calls the restriction `protecting software integrity`.
- Deere controls dealer, parts, and labor-rate aftermarket access.
- courts support the described software/property division.
- lemon laws and the implied warranty of merchantability establish analogous sale rights.

The attributed Deere phrase is the clearest blocker: those exact words appear in neither
the request nor the rendered profile, yet the draft puts them in Deere's mouth. A claims
entry would expose the quotation for checking but would not license inventing it. The next
prompt adds an explicit attributed-quotation sweep and treats each named actor plus action
as a separate candidate claim.

## Critic transport — pass

One fresh critic draw was run only to test `voice-critic-source/1`, not to score this failed
draft. It completed in 58,268 ms and reported $0.1695 API-equivalent telemetry. The model
returned zero findings and an independent `CLEAN`. The semantic validator passed;
deterministic assembly produced an exact terminal `**CLEAN**`; the unchanged parser derived
zero findings, zero uncited findings, and zero authorship claims.

No further critic draws were made. A substantive voice bar is not reported over a draft
that already failed the evidence audit.
