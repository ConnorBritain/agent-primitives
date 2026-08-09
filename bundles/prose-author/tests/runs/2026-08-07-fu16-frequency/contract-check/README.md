# Output-contract verification — the omission record

The author's read of the v3 draft asked for the inline `Omitted:` line to go. It moved
into an optional second json fence: the markdown fence is what gets pasted somewhere, so
anything in it that is not the piece is a defect — but a draft quietly missing a rated
habit must still not pass as complete.

One draft under the new contract. It emitted a clean prose fence and:

```json
{ "schema": "voice-draft/1",
  "omitted": [
    { "habit": "paragraph-ending colon and bare link (rated throughout, 5-17 times per piece)",
      "why": "no verified URLs available for this topic; writing plausible-looking links would fabricate sources" },
    { "habit": "another writer's coinage borrowed and credited by name (rated several times per piece)",
      "why": "used once, with an attribution I can verify; further instances would require attributing coinages to real people without confidence they said them" }
  ] }
```

`validateDraft` accepts it, does not misread it as a refusal, and
`findFabricatedCitations` returns zero.

**This resolves FU-17 in a way none of that ticket's three proposals anticipated.** The
drafter applies a rated habit as far as it honestly can and discloses the shortfall —
better than compliance, because the shortfall is real and now visible.

**It also surfaced FU-18.** The same draft asserted that *"LogMeIn took LastPass private
with a pair of PE firms in 2020"* and dated the breach to 2022. Both accurate — by luck,
not architecture. The anti-fabrication rule covers citations, not factual claims, and a
wrong date has no `example.com` tell.
