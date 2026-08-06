# Positive (lossy revision) — death-severus-unnamed · MATERIAL-LOSS

THE CORRECTED FIXTURE. Authored as a negative expecting FAITHFUL; the critic disagreed and was right. See fixtures.json correction_note. This transcript is unedited.

---

# prose-fidelity-critic — n-death-honorifics

## Findings

**CLASS**: dropped-fact
**ORIGINAL**: line 44 — "Septimus Severus in dispatch, “Adeste, si quid mihi restat agendum,”"
**REVISION**: line 40 — "Severus in dispatch, “Adeste, si quid mihi restat agendum,”"
**WHAT THE READER LOSES**: Which emperor said it. "Severus" alone does not distinguish Septimius Severus from Alexander Severus or Libius Severus, all emperors; the original named one, the revision names a family. In a list whose whole point is attributing specific dying words to specific men, the reader can no longer attribute this one.

## Immaterial losses

None. "Septimus Severus" was the only atom the scan flagged, and it is raised above.

## Scanner defects

- The scan did not flag "Augustus Cæsar" (original line 38), which the revision shortened to "Augustus" (revision line 34). The entity as written in the original is absent from the revision; the scan appears to accept a substring or leading-token match and so misses honorific and cognomen stripping — the exact edit class this fixture contains. It caught the same operation on "Septimus Severus" only because the retained token there is the *second* word. Reported as a tool bug, not folded into a finding: on consequence, dropping "Cæsar" costs the reader nothing, since "Augustus" identifies the same emperor unambiguously and the title is not carried by any other figure in the list.

**Verdict: MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=1 | uncited=0 | contradicts_scan=0
