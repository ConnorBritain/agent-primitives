# Negative (leave-one-out) — kenyatta-university · CLEAN

This is the document that produced the single false positive in the earlier
partial run (a bio-list separator, ` - ` versus `, `). The prompt's formatting
exclusion was added in response. Under that prompt it returns CLEAN.

---

No voice card was provided; the draft is judged against the eleven corpus samples in `bundles/prose-tell-scan/tests/corpus/human/` (frontmatter skipped in all files).

**Findings: none.**

Category status — all five clean:

1. **Register breaks — clean.** No paragraph is pitched away from the rest. The opener (line 17, "Kenyatta University ( KU ) is a public research university with its main campus in Nairobi County , Kenya .") matches the corpus's standard definitional opener — cf. `university-of-nairobi.txt:18` and `university-of-lagos.txt:18`. The Obama aside (line 62) and the vice-chancellor suspension (line 275) sit at the same distance from the subject as comparable asides in `university-of-ibadan.txt:39` and `university-of-lagos.txt:30`.

2. **Constructions — clean.** Nothing I can show as absent from all eleven samples. The participial appositive at line 17 ("being the third university after...") is attested at `university-of-nairobi.txt:29` and `university-of-ibadan.txt:37`. The by-road locative chain at line 25 ("approximately 17.5 kilometres (10.9 mi), by road, northeast of...") is not merely present in the corpus but near-identical to `makerere-university.txt:460`.

3. **Vocabulary — clean.** "Constituent college", "satellite campuses", "e-learning", "income-generating businesses" are all inside the corpus's institutional-administrative range; cf. "constituent college" and "Extra-Mural Centres" at `university-of-nairobi.txt:47,57`, "affiliate institutions" at `university-of-ibadan.txt:137`.

4. **Rhythm — clean.** The draft's short-prose-plus-long-bare-list proportion is inside the corpus range, closely tracking `university-of-nairobi.txt` (brief history, then unbroken list blocks). Within the prose, length still varies: line 17 runs three short sentences against the single 45-word locative sentence at line 25.

5. **Voice that never shifts — clean.** The corpus does visibly shift by subject, and so does the draft: narrative in History (line 58), flat enumeration in the campus and sports blocks, and a closer, more particular register in Management (line 275).

One item was considered and dropped, not reported as a finding: "off of" (line 25) is absent from all eleven samples, but it is a two-word preposition idiom rather than a sentence shape, it would rate low confidence, and no high-confidence finding exists near it. The corpus carries comparable one-off idiom and grammar slips (`university-of-lagos.txt:18` "it's college of medicine"; `ahmadu-bello-university.txt:151` "Despites the numerous achievements").

**Verdict: CLEAN**

RESULT: CLEAN | findings=0 | uncited=0 | authorship_claims=0
