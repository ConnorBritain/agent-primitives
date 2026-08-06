**Findings**

None.

**Immaterial losses**

- `"Edward the Fourth"` — not raised as a fidelity finding; the flag is treated as a scanner defect (see below), not as a consequential absence. No other atom in the flagged list.

**Scanner defects**

- The named-entity check reports `"Edward the Fourth"` absent. The revision's line 8–9 read `"Augustus Cæsar, Titus Vespasianus, Philip le Bel of France, Edward the / Fourth of England, Alcibiades of Athens…"` — the entity spans a hard line wrap between `Edward the` (line 8) and `Fourth` (line 9). The matcher appears to compare within a single line, or to normalise the original's wrapping but not the revision's, and so misses entities broken across a newline. Every other entity in the same list survived because none of them straddles a wrap. This is a false positive class that will recur on any reflowed revision.

**Verdict: FAITHFUL**
