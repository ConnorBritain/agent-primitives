# Isolated Codex matrix attempt 2 — claim-boundary hold

This bounded development set was prepared against implementation `8cdd02f`. It is not
acceptance evidence. All eight Codex calls and every structurally eligible independent
claim audit completed; no response was redrawn.

The isolated backend itself held: every JSONL stream contains zero tool events, none of
the eight calls needed event recovery, all six drafts contain zero external-memory ledger
claims, and both underdetermined requests refused.

The drafting boundary did not clear:

- `d05` over-declared one request instruction as ledger claim `c3` and cited it from no
  sentence. The source validator rejected it before audit.
- `d01` had two of 35 sentences rejected for unledgered claims about common seller/buyer
  behavior, terms-of-service length, and how digital arrangements are commonly treated.
- `m05` had two of 37 sentences rejected for unledgered population claims: “many will
  not” inspect options and “Developers feel this gap.”
- `d09`, `m01`, and `m09` passed their complete independent sentence audits (20/20,
  31/31, and 13/13 respectively).

The development collector also exposed a local bookkeeping bug: it tested
`corpusLeakage(...).length`, although the scanner returns `{ leaked, count }`. An
independent recomputation using `count` reports zero leakage for all three assembled,
audit-clean drafts. The production acceptance collector already uses `leakage.count` and
does not have this bug.

Critics were correctly blocked, so this attempt made zero critic calls. The next change
must address the sentence-classification failure before another bounded set: request
format/audience instructions are not ledger propositions, and generic claims about what
people, industries, courts, or developers normally do must be made genuinely
hypothetical, exposed as finite evidence, or omitted.

| case | profile | shape | source | independent audit | external claims |
|---|---|---|---|---:|---:|
| d01 | doctorow-blog | essay-topic | valid | 33/35 keep | 0 |
| d05 | doctorow-blog | outline-post | unused ledger claim | not dispatched | 0 |
| d09 | doctorow-blog | reply | valid | 20/20 keep | 0 |
| m01 | eff-mullin | essay-topic | valid | 31/31 keep | 0 |
| m05 | eff-mullin | outline-post | valid | 35/37 keep | 0 |
| m09 | eff-mullin | reply | valid | 13/13 keep | 0 |
| dr01 | doctorow-blog | refusal | valid refusal | n/a | 0 |
| mr01 | eff-mullin | refusal | valid refusal | n/a | 0 |
