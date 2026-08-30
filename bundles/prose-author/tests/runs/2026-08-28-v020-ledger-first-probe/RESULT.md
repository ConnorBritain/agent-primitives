# Ledger-first cross-harness probe — portable boundary, asymmetric generation

This two-cell development probe tested prepared commit `3a00796`. It is not acceptance
evidence and contributes no cell to the v0.2 ship bar.

Both Claude and Codex accepted the same strict `voice-draft-source/3` schema, emitted the
claim ledger before paragraphs, and returned structurally complete sentence units. The
initial validator prohibited reusing one ledger premise in several sentences; the Claude
cell showed that constraint was unjustified. A closed factual set requires resolved and
used references, not artificial duplication of a premise. The validator was corrected
after preserving the original result.

## Claude / Doctorow-profile ownership essay — audit failure

Claude took 459,859 ms and planned six claims, including two named product examples and
three legal or lobbying claims. The ledger made those factual choices visible before the
prose, but it did not keep the prose within the closed set. The independent auditor
rejected seven of 26 sentences for unledgered temporal, technical, market-wide, framing,
intent, and outcome claims. It also rejected two unbounded ledger entries about courts and
lobbying.

The audit cannot establish that an exposed external claim is true. Manual inspection also
identified a likely product attribution error: the heated-seat subscription example was
assigned to Tesla, while the widely reported program was BMW's. That claim would therefore
remain blocked at the later source-verification gate even though it was present in the
ledger. No voice critics were run.

## Codex / EFF-profile court-record essay — draft boundary pass

Codex completed in about 32 seconds. It used one request-supported claim and no external
memory claims, then built 26 sentences from reasoning and normative argument. The
independent Claude audit kept all 26. Public assembly, output validation, fabricated-link
scanning, six-word corpus-leakage scanning, and quotation inventory all passed.

Three independent critic draws returned raw `CLEAN` verdicts with finding counts 0, 0,
and 1. The first two strict critic sources validated. The third emitted a lone
low-confidence finding without the required nearby high-confidence support, so the critic
contract rejected it and the cell is ineligible for k=3 scoring. It was not redrawn. The
low-confidence observation was also informative: source-free argument can omit the named
anchors prevalent in the corpus, even when the rest of the voice passes.

## Decision

The provider-neutral ledger seam is viable, and Codex demonstrated a complete safe draft
path. The remaining drafting failure is not transport. Claude still treats real-world
examples and hidden-intent claims as necessary rhetorical material when the request does
not require them. The next prompt must make request-only reasoning the default for an
argumentative task and reserve external-memory claims for tasks whose requested substance
actually requires them. The independent audit and unchanged ship bar remain intact.

Claude CLI reported $1.0356 of API-equivalent telemetry for the two audits, one draft, and
three critic draws. These subscription-backed CLI calls are not evidence of direct API
billing.
