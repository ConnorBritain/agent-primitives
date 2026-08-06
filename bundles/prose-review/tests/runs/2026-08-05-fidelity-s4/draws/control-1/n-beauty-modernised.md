**CLASS**: claim-drift
**ORIGINAL** (line 1): "surely virtue is best in a body that is comely"
**REVISION** (line 1): "surely virtue shows best in a body that is comely"
**WHAT THE READER LOSES**: The original asserts that a comely body is virtue's best condition; the revision reduces this to how virtue is perceived, so the reader can no longer tell that Bacon claimed anything about virtue itself rather than about its visibility.

## Immaterial losses

None. The scan flagged exactly one atom, and it is handled under *Scanner defects* below rather than waved through.

## Scanner defects

- `"Edward the Fourth"` reported as absent from the revision. The revision carries "Edward the / Fourth of England" across the line break at revision lines 8–9. The scanner appears to match entity strings against single lines, or without normalising the newline inside a hard-wrapped span, and so misses entities split by wrapping. This is a false positive in the presence check, not a fidelity finding, and it means the scan's `MATERIAL-LOSS` was raised on an atom that is present.

**MATERIAL-LOSS**
