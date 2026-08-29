# Mutation results

`AGENTS.md` requires the negative test: break a guard, confirm a test fails,
restore. A guard with no failing mutation is decoration.

**This table is generated. Do not edit it by hand.**

```bash
node tests/mutations.mjs            # verify every row against a real run
node tests/mutations.mjs --update   # rewrite it from the runs
```

| mutation | tests failed | what it guards |
|---|---|---|
| stop noticing dominance claims | 2 | a profile calling a habit the engine of a voice must state the rate that backs it |
| accept a profile that states no frequency at all | 1 | a count without a rate cannot tell a drafter how often to use a habit |
| stop recognising placeholder hosts | 3 | an invented citation is caught before it reaches a reader |
| render empty semantic omissions into the public draft record | 1 | a fixed-shape source cannot leak an empty optional list into voice-draft/1 |
| allow a semantic sentence to carry output fences or hidden newlines | 1 | a model cannot smuggle a second public envelope or unaudited sentence through one unit |
| drop the explicit type Codex requires beside the draft schema const | 1 | one source schema is valid in strict Codex output as well as Claude |
| accept a request basis that cannot be found in the request | 1 | a model cannot cite an invented request premise in its sentence certificate |
| let reasoning sentences carry hidden factual claims | 1 | derived public claims cannot be hidden under a non-factual sentence label |
| let external facts masquerade as request-supported claims | 1 | the public audit distinguishes supplied facts from model-memory assertions |
| allow a sentence to cite a claim outside the closed ledger | 1 | every factual sentence is restricted to the pre-writing claim ledger |
| allow an unused retrospective claim into the ledger | 3 | the claim ledger is a closed pre-writing plan rather than a post-hoc dump |
| allow prose to be emitted before its supposed pre-writing ledger | 1 | source/3 mechanically proves the claim ledger precedes expressive prose |
| stop reconciling independent audit sentence ids | 1 | an audit decision cannot drift onto a different sentence |
| assemble a sentence the independent auditor rejected | 1 | fabricated quotations, citations, and biographies cannot pass through as claims |
| accept opaque independent labels with no rationale | 1 | every independent basis decision remains inspectable clause by clause |
| let a disclosure cite words absent from its sentence | 1 | an audit-owned claim is anchored to exact prose rather than invented during review |
| let a keep row smuggle claims into the audit overlay | 1 | only an explicit disclose decision may append to the verification queue |
| drop audit-owned claims from the public verification record | 1 | an independently discovered premise cannot disappear between audit and publication |
| let the independent auditor trust the drafter's labels | 1 | the factual audit is independent rather than the same self-report twice |
| let hard factual failures become ordinary disclosures | 1 | fabricated citations, attributed wording, biography, and leakage remain fatal |
| hide broad institutional assertions under reasoning | 1 | broad legal, historical, and industry claims enter the verification queue |
| skip the independent claim-audit dispatch | 1 | acceptance cannot assemble the drafter's correlated self-audit directly |
| let model output downgrade the prepared claim-audit schema | 1 | the immutable prepared pipeline, not model-authored output, selects the accepted audit schema |
| let claim repair alter independently accepted prose | 1 | bounded repair changes only sentence units the independent audit rejected |
| let claim repair alter a retained factual ledger entry | 1 | a repair cannot rewrite the provenance of a retained factual premise |
| let a malformed audit authorize claim repair | 1 | only a complete independently auditable decision set can authorize sentence changes |
| let a broad rejection set become a second draft | 1 | a repair cannot rewrite more than one fifth of a draft even when every row says reject |
| let more than two rejected units enter claim repair | 1 | a low percentage cannot conceal more than two rewritten sentence units |
| let claim repair alter bytes under its hypothetical wrapper | 5 | the only prose edit is one fixed prefix before otherwise byte-identical rejected text |
| let a hypothetical wrapper keep a nonhypothetical basis | 1 | the fixed wrapper changes epistemic status rather than laundering factual prose |
| resume a prepared run under the current environment model | 1 | a prepared run uses only the model recorded before its first dispatch |
| route Codex only for drafts instead of every locked stage | 1 | profile, audit, and critic stages use the same manifest-selected adapter contract as drafts |
| hash committed schemas only for Codex drafts | 1 | profile, audit, and critic provenance hashes the exact schema file Codex received |
| accept an adapter that cannot enforce the gated runtime boundary | 1 | a new harness cannot claim gated acceptance without clean context, no-tools, and immutable failures |
| drop the hash of Claude failure output | 1 | a Claude timeout preserves inspectable raw output instead of disappearing before evidence collection |
| reject a Codex spawn error without persisting its failed cell | 1 | a missing Codex executable records one immutable failed call and cannot be retried as a redraw |
| omit Codex companions from profile artifact hashes | 1 | profile evidence binds the primary Codex event stream and final structured output |
| omit Codex companions from claim-audit artifact hashes | 1 | independent claim audits bind their primary Codex evidence rather than only a mutable wrapper |
| order only the critic wrapper after the human audit | 1 | a pre-audit Codex critic event stream cannot be laundered through a post-audit wrapper |
| skip the exact raw-result namespace inventory | 1 | an orphan failed call, redraw, or extra critic draw cannot survive outside the artifact index |
| allow extra files in a locked raw-result namespace | 1 | renaming an earlier failed call cannot make a redrawn expected cell look unique |
| let a Codex wrapper point at another cell's companions | 1 | each Codex wrapper is bound to its own canonical event, output, and recovery filenames |
| trust a recorded artifact hash without reading its file | 1 | editing any recorded acceptance artifact invalidates its evidence |
| advertise legacy claim-repair evidence in a current artifact record | 2 | current audit-disclosure artifacts cannot claim an obsolete repair branch even with a valid file hash |
| scan only the top-level artifact record for legacy repair fields | 1 | legacy repair fields are forbidden in every profile, draft, refusal, critic, and evidence record |
| check only case-shaped files in retired repair trees | 4 | orphan repair results and prompts invalidate a current run regardless of their names |
| ignore Codex companion files in retired repair trees | 1 | an extra repair-model invocation cannot hide in an unindexed Codex event stream |
| score the handwritten tally instead of rebuilding raw critic evidence | 1 | a passing TALLY.json cannot conceal failing raw critic draws |
| leave transitive scoring dependencies outside the prepare lock | 1 | the immutable run locks the full local scoring and structural dependency closure |
| resume from an uncommitted mutable manifest | 1 | the prepared manifest is committed unchanged before its first dispatch |
| skip locked implementation verification before dispatch | 1 | a prepared run refuses transient implementation changes before any model process starts |
| let the manifest lock bytes absent from its prepared parent | 1 | manifest hashes are anchored to implementation bytes in prepared_commit, not merely current files |
| relabel recoverable Codex events under a new manifest | 1 | Codex recovery preserves the dispatch provenance of the original event stream |
| let required artifact path and hash pairs disappear together | 1 | a missing required artifact cannot pass merely because its hash was also removed |
| omit concurrency from raw dispatch provenance | 2 | every raw result records the manifest's actual locked concurrency |
| omit the exact prompt from raw invocation provenance | 1 | each raw result is bound to the exact prompt bytes sent to its model |
| dispatch prompt bytes that differ from the staged evidence | 1 | the prompt file, dispatched prompt, and invocation hash use identical bytes |
| stop checking invocation provenance on final evidence | 1 | final verification matches every raw result to its system prompt, user prompt, and schema |
| skip staged input reconstruction during final check | 1 | final acceptance rederives every staged corpus input from the locked fixture |
| skip prompt reconstruction during final check | 1 | final acceptance rederives every model prompt from locked inputs and raw predecessors |
| skip raw profile reconstruction during final check | 1 | canonical profile files and stability reproduce from raw profile responses |
| score canonical drafts without reconstructing raw draft evidence | 1 | structural gates score drafts reconstructed from raw draft and audit responses |
| skip claims audit linkage during final check | 1 | manual claims decisions stay linked to the exact draft, disclosure, and quotations |
| trust canonical critic sources instead of comparing them to raw | 1 | critic canonical sources reproduce byte-for-byte from raw model results |
| trust a Codex wrapper that diverges from its primary event stream | 1 | final verification reconstructs Codex structured output from immutable JSONL events |
| select Codex reconstruction from the mutable wrapper label | 1 | a Codex wrapper cannot skip primary-event reconstruction by relabelling itself |
| drop the explicit type from context-specific profile dimensions | 1 | the generated profile schema remains valid in strict structured-output harnesses |
| derive the critic verdict from its finding count | 1 | the model-owned verdict remains independent from the findings-rate instrument |
| drop the drafter's sentence-by-sentence claim inventory | 2 | a nearby disclosed fact cannot hide a second checkable assertion |
| treat model memory as verified evidence | 2 | remembered examples remain explicitly queued for verification |
| treat profile examples as reusable topic facts | 2 | corpus-derived profile examples cannot cross the factual firewall |
| let unverifiable generalizations enter the claims queue | 2 | claims remain finite propositions a publisher can actually check |
| let argumentative prose decorate itself with external-memory facts | 2 | a source-free argument stays within request evidence instead of inventing vivid cases |
| tell the drafter topical request overlap can license a new predicate | 2 | the model prompt matches the conservative request-support contract |
| let a listed claim license an invented attributed quotation | 2 | an invented quotation cannot be laundered through the verification list |
| collapse multiple named-actor assertions into one topic claim | 2 | each checkable action and consequence remains independently auditable |
| dispatch sixty critics before the claims audit is complete | 1 | an incomplete disclosure audit cannot spend or score sixty critic calls |
| let the human factual audit treat the profile as a fact packet | 1 | profile examples, biography, and source facts cannot bypass the public verification queue |
| stop requiring a sentence-by-sentence human decision | 1 | a scalar or model-authored claim list cannot substitute for human review of every sentence |
| erase deterministic factual candidates from the human review ledger | 1 | the known conditional and rhetorical misses are surfaced without relying on the model auditor |
| trust handwritten candidate reasons instead of rederiving them | 1 | candidate flags and sentence hashes reproduce from the immutable semantic source |
| let an unrelated same-paragraph claim cover a reviewed sentence | 1 | a public verification claim must belong to the exact sentence under human review |
| accept a token rationale for clearing a flagged non-factual sentence | 1 | a human clearing a possible factual premise records an inspectable rationale |
| accept a request ledger claim only topically related to its supplied basis | 2 | a shared topic cannot become model-authored support for an appended predicate |
| let a request-backed claim license unrelated prose | 1 | request support remains linked from supplied basis through claim to exact sentence |
| accept human request evidence unrelated to the reviewed sentence | 1 | human request evidence is independently checked instead of trusting the model-authored ledger |
| accept request-supported human clearance without a rationale | 1 | a human explains how exact request evidence supports the complete sentence |
| let request-supported clearance defer to pipeline authority | 1 | human request support is an independent semantic judgment rather than a model label |
| let non-factual clearance defer to pipeline authority | 1 | human non-factual classification cannot cite the model or audit as its authority |
| accept a fragment as evidence that a whole sentence is non-factual | 1 | a non-factual decision accounts for the complete sentence rather than one convenient clause |
| let free-form prose replace a closed non-factual classification | 1 | the human completeness boundary records an explicit normative, hypothetical, logical, rhetorical, or procedural basis |
| accept an empty human reviewer identity | 1 | critic-unlocking sentence review carries an explicit human attestation |
| follow a mutable alternate draft source pointer during human audit checking | 1 | human decisions remain bound to the canonical source derived from raw model evidence |
| hide a canonical disclosure behind a mutable artifact pointer | 1 | human review cannot suppress or substitute the canonical public disclosure |
| let the completed human audit change after its first commit | 1 | the exact human audit and critic raw evidence stay immutable after first commit |
| dispatch critics before committing the completed human audit | 1 | critic calls cannot precede the immutable human-audit anchor |
| omit the human audit anchor from critic invocation provenance | 1 | every critic raw record names the exact audit hash and pre-critic commit |
| stop checking that critic evidence was committed after the human audit | 2 | repository history proves the reviewed audit predates every critic result |
| let a quotation hide inside a profile example | 1 | the profile remains voice evidence rather than a factual quotation source |
| let the requested container override the profile's register | 2 | a policy-newsletter request does not turn the author's vocabulary into policy-brief prose |
| block degradation on any mean rise | 3 | a k=3 noise tick-up does not refuse a good revision |
| stop noticing a fallen verdict | 1 | a revision that drops the verdict is refused |
| treat a split CLEAN as converged | 2 | a split is surfaced, not read as the half that suits the loop |
| resolve a verdict tie to the better verdict | 2 | a coin-flip tie is not evidence of clean |
| drop the attributable-length floor | 1 | a two-letter edit cannot be blamed for an unrelated finding |
| blame edits for text that was already there | 1 | only text an edit INTRODUCED can have caused a finding |
| remove the cap clamp | 2 | human keeps the majority of exemplar slots |
| cold start reports a gap | 4 | no cadence comparison without a calibrated corpus |
| Tier A treated as a normal finding | 6 | an artifact returns the draft instead of being reported |
| drop the attestation requirement | 4 | unattested text cannot become the definition of human |
| stop excluding READMEs | 2 | scaffolding is never a writing sample |
| lose the loose-file scanner candidate | 1 | verification works under the install shape install.sh produces |
| rename readProvenance in calibrate.mjs (sibling present) | 1 | the port is pinned against a sibling that CHANGED, not just absent |
| drop .markdown/.mdx from the ported extension set | 2 | calibration and drafting agree on what counts as a sample |
| change the word floor on one side only | 1 | the ported floor equals the sibling's |
| let a trivial edit through ingest | 2 | voice does not collapse by accepting the model's near-verbatim output |
| let a sub-minimum sample into approved/ | 1 | approved/ never advertises files calibration would exclude |
| let --verify skip the recompute and trust the stored ef | 1 | --verify actually re-derives ef rather than restating what the file says |
| reintroduce the model: unknown sentinel | 1 | the frontmatter never claims an unknown model that would pollute filtering |
| let calibrate skip the aggregate cap on approved samples | 2 | approved samples cannot dominate the blended pool past the cap |
| let calibrate blend approved samples below the human floor | 2 | cold-start cannot calibrate against model norms on day one |
| let fidelity-scan pass a MATERIAL-LOSS as FAITHFUL | 11 | the verdict actually distinguishes fidelity states |
| let fidelity-scan cross line breaks with proper-noun runs | 4 | proper-noun runs stay within a line - a headings-plus-sentence false positive fires on every structured document |
| let fidelity-scan skip thousands-separator normalisation | 1 | 1,234 and 1234 read as the same information, so users are not trained to game the formatter |
| read the narrowing warning from the wrong field path | 2 | the voice-collapse warning reaches the person it is about |
| let tell-scan ignore the blended bands | 3 | an approved edit actually changes what the scanner reports |
| trust edit_fraction as a signed number rather than computing it | 3 | edit_fraction is computed from a diff, never asserted |
| let an open suffix swallow coinages in the profanity pattern | 2 | a coined term built on a rude root is not counted as the habit it resembles |
| measure rates over the whole file instead of the essay body | 9 | site boilerplate is excluded from a rate the profile will quote |
| let a ratio breach alone become a verdict | 1 | one extra instance in a short draft is not reported as caricature |
| silently skip a claim the checker cannot locate | 1 | a checker that finds nothing to check says so instead of reporting clean |
| read a decimal's fractional part as a count | 1 | 22.65 per 1,000 is a rate, not a count of 65 |
| widen the tolerance past the inflation it exists to catch | 1 | a 32% inflation is still a divergence |
| turn the conjunctive bar into a disjunction | 4 | a draft must clear BOTH instruments, not whichever one it happened to satisfy |
| loosen the pre-registered findings ceiling | 3 | a threshold pre-registered before the run cannot be edited after seeing it |
| let a failed structural gate through | 2 | a fabricated citation fails the run no matter how the drafts scored |
| let a run with no drafts clear the bar | 1 | a run that dispatched nothing cannot report a pass |
| narrow the detector-claim pattern back to a single determiner | 1 | a draft claiming to fool ANY detector is caught, not just one phrased with 'a' |
| let `undetectable` fire without a text subject | 1 | the gate does not flag innocent prose, which is how a gate gets switched off |
| accept a non-integer occurrence count | 1 | a count is a count of instances, not an estimate the renderer interpolated |
| let a stated rate disagree with its own count | 1 | a rate is arithmetic on the corpus, not a number the renderer liked |
| accept a count smaller than the number of samples supporting it | 2 | a habit found in ten samples has at least ten instances |
| stop comparing the frequency phrase against the counted rate | 1 | the phrase a drafter reads and the number a harness reads agree |
| scan the corpus directly instead of delegating to the drafter's reader | 2 | rates are measured over the same attested samples the drafter is shown |
| measure an undelimited corpus without saying so | 1 | a corpus measured whole cannot report itself as cleanly delimited |
| count bare-URL lines as paragraph endings | 3 | citation scaffolding and image credits are not measured as paragraph endings |
| measure every sentence instead of paragraph-final ones | 3 | the drumbeat is visible only when endings are measured apart from the prose |
| count the country US as the pronoun us | 4 | a habit rate is not inflated 32% by an abbreviation that shares its letters |
| treat every possessive as a contraction | 1 | the world's fair is not evidence that the author contracts |
| let the solidarity pattern match inside longer words | 2 | the habit five drafts are deficient in is not inflated by substring hits |
| stop guarding the corpus's measured rates against leaking into a prompt | 1 | a renderer is not handed the number it is being asked to derive |
| stop deriving author tokens from corpus frontmatter | 1 | a prompt naming an author by any part of their name is caught, not just the surname |
| let a not-author-named exemption go stale | 1 | an exemption that no longer matches a fixture cannot silently disable a check |

Baseline is 0 failed. Every mutation is applied to the real source, measured, and
reverted; the runner refuses to report anything if the baseline is not green or
the tree is not restored afterwards.

## Why this is a script

The table used to be maintained by hand, and it went stale **one commit after it
was created**. A cross-implementation check was added that *also* fires when the
README filter is removed, so a row that correctly said `1` silently became `2`.
The commit re-ran the row it was adding and not the rows it was invalidating.

That is nine-going-on-ten instances of the one failure
[`CALIBRATION.md`](../../prose-tell-scan/CALIBRATION.md) keeps logging: a number
that was true when written and untrue when read. The fix is the same every time
and it is not "be more careful" — it is to make the number an **output** of
something re-runnable. So the table is now output, and a change that alters what
a mutation costs fails this script until somebody looks.

Two failure modes get special handling, both learned the hard way:

- **A row that scores 0** is not a passing row. It means the guard has no test,
  and the runner exits non-zero saying so. `stop excluding READMEs` scored 0
  originally — an unattested README was already rejected by the attestation
  check, so deleting the README filter changed nothing — and needed a test that
  isolated it (an *attested* README, which `calibrate.mjs` still excludes) before
  it could honestly appear here.
- **A run that crashes** is not a run. An early mutation left a field undefined,
  a test dereferenced it, and the suite died after three failures — while the
  shell collecting the result filtered output through `grep`, which showed three
  FAILs and hid the missing summary line. The runner now reports `CRASH` when no
  `N passed, N failed` line appears, because through a filter a crashed run and a
  finished one look identical.

## What the rows are actually protecting

The last three rows exist because `exemplars.mjs` **ports** rules from
`calibrate.mjs` rather than importing them — a hard cross-bundle import would
make this bundle unloadable without its sibling. A port drifts, so each ported
rule needs a mutation on the *sibling's* side proving the port notices.

Getting that wrong is not hypothetical. The first version of the contract test
reported "skipped — sibling not present" on any import failure, so renaming
`readProvenance` with the sibling fully present went green. The mutation named
for it is the regression test.
