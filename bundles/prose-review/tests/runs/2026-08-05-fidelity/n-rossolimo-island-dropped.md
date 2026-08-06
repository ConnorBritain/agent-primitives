# Negative (faithful revision) — rossolimo-island-dropped · MATERIAL-LOSS — FALSE POSITIVE

Class B, and the critic FAILS it. It read the dropped "Island of" as losing that
the penal colony was offshore. The expectation was deliberately left alone rather
than corrected to match it — see fixtures.json `outcome_note`. This is the
harness's one false positive, and it is counted as one.

---

# prose-fidelity-critic — n-rossolimo-island-dropped

## Findings

**CLASS**: dropped-fact
**ORIGINAL** (line 27): "In 1890 I travelled to the Island of Sahalin, to write afterwards a book upon our penal colony and prisons there."
**REVISION** (line 23): "In 1890 I travelled to Sahalin, to write afterwards a book upon our penal colony and prisons there."
**WHAT THE READER LOSES**: That Sahalin is an island — the fact that the penal colony described was on an offshore island rather than somewhere on the mainland. A reader who does not already know the geography now reads "Sahalin" as an unplaced place name, and nothing else in the revision restores it.

## Immaterial losses

None. The single atom the scan flagged ("Island of Sahalin") is raised as a finding above.

## Scanner defects

None.

**Verdict: MATERIAL-LOSS**

RESULT: MATERIAL-LOSS | findings=1 | uncited=0 | contradicts_scan=0
