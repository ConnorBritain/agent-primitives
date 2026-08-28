# Proof-carrying draft source — portable shape, correlated audit gap

This two-cell development probe tested prepared commit `9859078`. It is not part of the
v0.2 acceptance set.

## Portable transport — pass

Both harnesses accepted the same strict `voice-draft-source/2` schema:

- Codex CLI with `gpt-5.6-luna`, medium effort, completed in about 31 seconds.
- Claude CLI with Sonnet, low effort, completed in 211,025 ms and reported $0.3139
  API-equivalent telemetry through the authenticated subscription CLI.

Codex produced 32 audited sentence units across eight paragraphs. Claude produced 31
units across six paragraphs. Both sources validated against the original request, both
assembled deterministically into valid public `voice-draft/1`, and neither produced a
placeholder citation.

## Codex independent audit — pass

The Codex draft used three request-supported claims derived from the supplied premise and
otherwise stayed within reasoning, hypotheticals, and normative argument. It introduced no
named external actor, event, date, figure, quotation, or citation. Its one omission
honestly recorded that the request did not supply the sources needed for the profile's
linked-primary-text habit.

## Claude independent audit — fail

Claude correctly exposed two external claims, about John Deere and Tesla, but mislabeled
several other external assertions as `reasoning`, including claims about:

- an industry hollowing out ownership through firmware updates for years;
- device makers building remote-disable architecture for a decade;
- disclosures being placed in lawyer-oriented change logs and long EULAs;
- an industry-wide shift toward retained functional control;
- right-to-repair statutes carving out software; and
- courts treating boilerplate agreements as informed consent.

The certificate proves every sentence received a label; it cannot prove the model chose
the correct label. The same model that generated a claim can retain the same blind spot
while certifying it. A second, narrow claim-audit pass is therefore required before public
assembly and before the existing human release audit.

## Voice decision

No critics were run. Cross-harness structure is established, but the Claude cell failed
claim-disclosure completeness before voice scoring.
