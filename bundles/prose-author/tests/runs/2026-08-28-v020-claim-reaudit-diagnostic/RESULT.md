# Claim-boundary diagnostic — did not clear

This is diagnostic evidence, not acceptance evidence. It replayed exactly the three known
failures from `2026-08-28-v020-isolated-codex-matrix-2`, made no redraws, and stopped before
critics.

The first diagnostic runner preserved three successful Codex repairs, then halted before
reaudit because its staged prompt file had one trailing newline that the dispatched prompt
did not. The continuation re-derived the exact dispatched prompt bytes, verified every raw
Codex record and its event stream, mechanically validated each repair, and committed the
repaired sources before making three fresh Claude audit calls.

One cell cleared:

- `m05`: both rejected behavioral claims remained byte-identical under the fixed
  `Hypothetically: ` wrapper, and the fresh independent audit accepted every sentence.

Two cells did not clear:

- `d01`: both wrapped sentences still described actual industry practice and ordinary
  treatment. A hypothetical label cannot change the proposition asserted by unchanged prose.
- `d05`: pruning the unused ledger entry repaired the structural error, but the fresh audit
  found two separate unledgered behavioral claims elsewhere in the draft.

Interpretation: the exact wrapper is mechanically safe but not a sufficient factual-boundary
repair. Do not spend a complete 20-draft acceptance run on this implementation. Reconsider
the representation and drafting contract first.
