# Sol claim-boundary probe — one-cell hold

This two-cell development probe was prepared against implementation `024e347`. It reran
the exact Doctorow essay and EFF outline shapes that failed the Luna matrix, using
`gpt-5.6-sol` at medium effort. It is not acceptance evidence. Neither response was
redrawn.

Both Sol sources passed `voice-draft-source/3` validation with fully used ledgers, zero
external-memory claims, and zero tool events. The independent auditor kept all 37
Doctorow sentences. It rejected one of 40 EFF sentences: an otherwise hypothetical list
ended with “a familiar pattern in software permissions and installation flows,” adding a
real-world industry-practice claim that the empty ledger did not authorize.

No critics were called because both claim audits did not clear. Sol improved on Luna's
failure set, but did not remove the underlying mixed-clause classification error. This
rules out treating the problem as merely a small-model capability limit.

| case | model | source | independent audit | tool events | external claims |
|---|---|---|---:|---:|---:|
| d01 | gpt-5.6-sol / medium | valid | 37/37 keep | 0 | 0 |
| m05 | gpt-5.6-sol / medium | valid | 39/40 keep | 0 | 0 |

The next decision is architectural. A bare sentence-level `basis` label cannot force a
single generation pass to notice a descriptive aside embedded inside a hypothetical.
Keeping the current publication boundary therefore requires either a genuinely staged
audit-and-repair dispatch or a new proof structure that makes mixed clauses explicit
before final prose is emitted. Weakening the independent audit would change the asserted
factual-safety boundary and is not supported by this probe.
