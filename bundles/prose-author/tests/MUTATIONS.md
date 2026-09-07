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
| identity accepts a future registry schema | 1 | incompatible registry versions are not silently reinterpreted |
| identity ignores registry digests | 1 | shared registry revision bytes reproduce their pinned digest |
| identity overwrites a stale registry revision | 5 | concurrent clients cannot overwrite a newer default or profile selection |
| identity ignores explicit opt-out | 1 | one-off work can disable personal identity resolution |
| identity mixes task-specific author evidence | 1 | explicit foreign author inputs do not inherit personal defaults |
| identity accepts a changed pinned profile | 4 | profile changes require explicit publication rather than silent replacement |
| identity silently loses its registered corpus | 4 | unavailable registered corpus is not represented as no evidence |
| identity permits a cross-writer history attachment | 1 | writing identity cannot silently feed another writer numerical records |
| receipt reloads current identity instead of frozen inputs | 1 | historical delivery verification reads its frozen input snapshot |
| ignore misspelled history attachment fields | 1 | an invalid attachment cannot silently collect into the default history directory |
| accept altered numerical stage differences | 1 | stage comparisons reproduce from the recorded exact candidate measurements |
| move the reference baseline during repairs | 1 | all stages use the same pre-generation baseline despite concurrent history ingestion |
| silently ignore unknown history flags | 1 | unknown options cannot silently redirect history writes to the default store |
| reject the known Claude product-name adapter alias | 1 | Claude Code product spelling resolves to the existing authenticated Claude transport |
| history accepts undeclared collection | 6 | collection is disabled until explicit scope consent |
| history disables project precedence | 4 | specific disablement overrides identity-wide collection |
| history ignores revision replacement | 1 | document revisions are not independent pieces |
| history permits source recount divergence | 1 | persisted measurements reproduce from supplied source |
| history leaks its fingerprint key in exports | 1 | exports omit the private keyed-fingerprint secret |
| history applies stale deletion preview | 1 | deletion requires a current exact target preview |
| history drops source text sanitization | 1 | history measurement payloads cannot carry prose |
| history erases within-piece variance | 1 | equal means do not erase rhythm variation |
| history admits generated human baselines | 1 | generated usage remains separate from human evidence |
| history flags sparse empirical departures | 1 | empirical departure labels require twenty pieces |
| history pools incompatible analyzers | 2 | analyzer changes produce separate compatible series |
| rhetoric ignores explicit opt-in | 1 | rhetorical model dispatch requires separate enablement |
| rhetoric ignores spent call budget | 1 | rhetorical analysis has a finite separate call budget |
| rhetoric accepts unaccounted paragraphs | 2 | every paragraph is annotated or explicitly unclassified |
| rhetoric accepts duplicate annotations | 1 | identical evidence cannot inflate estimated frequencies |
| history ignores final byte changes | 1 | history binds the exact delivered prose |
| accept invented check results as direct receipt excerpts | 1 | a directly quoted receipt excerpt must occur in the generated receipt, not just use quotation marks |
| accept changed delivery receipts as checked artifacts | 1 | the authoritative delivery includes exact recorded receipt bytes, not only checked prose |
| let delivery prose differ from the checked draft file | 1 | delivery assembly cannot substitute unverified prose while retaining the old draft hash |
| let a nonterminating capability probe defeat its timeout | 1 | synchronous CLI preflight terminates even when the child ignores SIGTERM |
| let a nonterminating plugin registry defeat its timeout | 1 | dependency discovery cannot indefinitely block interruption handling in the parent |
| read receipt diagnostics as completed mutation-suite counts | 1 | mutation evidence comes from a unique delimited suite summary, not quoted diagnostic counts |
| hide host permission failures behind a generic CLI exit | 1 | the receipt identifies a host-permission failure without implying the model or prose failed |
| skip deep factual auditing when requested | 1 | an explicitly requested claim audit cannot disappear from the required review path |
| invent a passing artifact scan in the human receipt | 1 | the user-facing receipt uses the recorded scanner result, including failure and unavailable cases |
| trim the checked prose during final delivery assembly | 1 | final assembly preserves the exact checked draft bytes |
| call unevaluated semantic checks passed during receipt reproduction | 1 | integrity success does not upgrade the underlying check results |
| treat every omitted observed tendency as a required occurrence | 2 | natural variation is not rejected as if corpus observations were quotas |
| allow omitted required instructions to accompany a clear review | 1 | only observed tendencies receive the advisory-omission exception |
| resolve an advisory omission without both task and voice review | 1 | an unavailable voice review cannot be replaced by task review alone |
| excuse user-rule omissions as observed variation | 1 | reviewed natural variation never exempts an explicit user instruction |
| fill example slots with known form or register mismatches | 2 | a shortage of matching style examples does not silently mix known writing contexts |
| hide unknown example metadata from the final receipt | 1 | unclassified samples are not represented as verified form/register matches |
| certify mismatched remote plugins and local agent wrappers | 1 | remote mode does not silently mix different-generation plugin and wrapper contracts |
| omit the exact missing-atom list from task review | 1 | task reviewers receive an explicit empty accounting list instead of inventing one |
| use a disabled companion plugin from its cache | 1 | dependency discovery respects enabled registry entries instead of stale cached files |
| accept stale installed runtime bytes | 1 | a current version label does not mask changed or stale installed code |
| switch a marketplace containing unrelated installed plugins | 1 | local prose installation does not silently change other marketplace consumers |
| accept missing or redrawn bounded-comparison calls | 1 | the recorded comparison contains every prescribed initial call exactly once |
| drop style evidence when repairing a draft | 1 | repairs retain the same profile and examples rather than substituting generic style |
| accept a session-relative persistent preference path | 1 | persistent corrections cannot move silently with a new session working directory |
| remove the small-batch discovery ceiling | 1 | conversational discovery cannot dump arbitrarily large review batches |
| allow comparison against an inactive scoped preference | 1 | a one-feature preview must actually vary an applicable preference |
| silently render a profile for the examples-only condition | 1 | the examples-only path stays distinct from profile generation |
| dispatch a profile call after cancellation | 1 | cancelled profile preparation cannot consume another model call |
| count Markdown link destinations as author parentheticals | 5 | visible-prose counts exclude balanced Markdown targets while retaining genuine asides |
| turn unevaluable empty-text rates into passing zeroes | 1 | a missing rate denominator is not evaluated, never a passing absence |
| restore a one-hit exception to an explicit zero rule | 7 | explicit mechanical limits are exact and independent of corpus-rate tolerances |
| trust a stored receipt without reproducing final checks | 3 | a presented draft is bound to its checked bytes, not a prior candidate |
| save inferred preferences without user approval | 1 | only explicit persistent feedback or approved inference changes saved preferences |
| silently retarget current observation-dependent preferences | 2 | independent user rules survive refresh but evidence-dependent rules require rebinding |
| let preferences silently retarget a changed observed profile | 2 | user choices remain bound to the exact observed evidence they were made against |
| apply a semantic preference proposal before its questions are answered | 2 | ambiguous feedback cannot mutate the versioned preference overlay |
| apply every proposed preference operation instead of the selected ids | 2 | semantic proposals remain review material until the user explicitly selects operations |
| silently choose among equally specific active style decisions | 2 | scope ties refuse instead of making an unrecorded style choice |
| ignore a user-approved counted target override during drafting | 2 | accepted recountable preferences reach the deterministic drafting target |
| allow full JSON Schema keywords into strict model transport | 2 | provider-specific schema subsets are checked before a model call can be spent |
| stop noticing dominance claims | 3 | a profile calling a habit the engine of a voice must state the rate that backs it |
| accept a profile that states no frequency at all | 2 | a count without a rate cannot tell a drafter how often to use a habit |
| stop recognising placeholder hosts | 4 | an invented citation is caught before it reaches a reader |
| render empty semantic omissions into the public draft record | 2 | a fixed-shape source cannot leak an empty optional list into voice-draft/1 |
| allow a semantic sentence to carry output fences or hidden newlines | 2 | a model cannot smuggle a second public envelope or unaudited sentence through one unit |
| drop the explicit type Codex requires beside the draft schema const | 2 | one source schema is valid in strict Codex output as well as Claude |
| accept a request basis that cannot be found in the request | 2 | a model cannot cite an invented request premise in its sentence certificate |
| let reasoning sentences carry hidden factual claims | 2 | derived public claims cannot be hidden under a non-factual sentence label |
| let external facts masquerade as request-supported claims | 2 | the public audit distinguishes supplied facts from model-memory assertions |
| allow a sentence to cite a claim outside the closed ledger | 2 | every factual sentence is restricted to the pre-writing claim ledger |
| allow an unused retrospective claim into the ledger | 4 | the claim ledger is a closed pre-writing plan rather than a post-hoc dump |
| allow prose to be emitted before its supposed pre-writing ledger | 2 | source/3 mechanically proves the claim ledger precedes expressive prose |
| stop reconciling independent audit sentence ids | 2 | an audit decision cannot drift onto a different sentence |
| assemble a sentence the independent auditor rejected | 3 | fabricated quotations, citations, and biographies cannot pass through as claims |
| accept opaque independent labels with no rationale | 2 | every independent basis decision remains inspectable clause by clause |
| turn ordinary request entailments back into external claims | 1 | buying and ownership roles remain usable reasoning without licensing contingent facts |
| let a historical disclosure cite words absent from its sentence | 2 | historical audit evidence remains bound to exact prose |
| detach a current disclosure from its deterministic sentence evidence | 3 | a current audit-owned claim is mechanically anchored to the complete immutable sentence |
| let a keep row smuggle claims into the audit overlay | 2 | only an explicit disclose decision may append to the verification queue |
| drop audit-owned claims from the public verification record | 3 | an independently discovered premise cannot disappear between audit and publication |
| let the independent auditor trust the drafter's labels | 1 | the factual audit is independent rather than the same self-report twice |
| let hard factual failures become ordinary disclosures | 1 | fabricated citations, attributed wording, biography, and leakage remain fatal |
| hide broad institutional assertions under reasoning | 1 | broad legal, historical, and industry claims enter the verification queue |
| treat request-derived metaphors as external facts | 1 | semantic audit does not inflate request-derived rhetoric into unsupported external claims |
| reject figurative agency as a literal factual contradiction | 1 | coherent request-derived metaphors survive an auditor's deliberately literal reading |
| restore a model-owned quota for qualitative profile evidence | 2 | support prevalence across files cannot masquerade as a within-piece frequency |
| stop deduplicating redundant qualitative support bookkeeping | 2 | a repeated support filename is normalized only when at least two distinct evidence files remain |
| erase the deterministic center aim from draft target cards | 5 | every harness receives the same length-scaled center target instead of model arithmetic |
| let the drafter return an out-of-range measured habit | 2 | a measured target is an enforced final check rather than an informational card |
| hide question marks from the semantic-bearing hard limits | 7 | question-mark ceilings are literal pre-return budgets because conformance cannot repair them |
| let semantic-bearing generation target the outer checker boundary | 2 | unpatchable semantic counters target the exact center rather than an outer acceptance boundary |
| tell the drafter conformance can repair semantic-bearing counts | 3 | the portable prompt assigns semantic-bearing count correction to generation, not conformance |
| let the drafter invent an opponent's paraphrased position | 3 | paraphrased opponent positions remain attribution even without quotation marks |
| detach compiled voice instructions from their observation ids | 2 | the compact control card preserves the profile's exact instruction-to-ID binding |
| accept a conformance patch whose final count remains out of range | 2 | local remeasurement, not the patch author's confidence, gates the final prose |
| let a conformance patch expand the draft without bound | 2 | the correction stage remains a minimal patch rather than a second unconstrained draft |
| let a conformance patch address a non-unique source span | 2 | patch application cannot silently choose among repeated anchors |
| let one conformance anchor span multiple paragraphs | 2 | an exact patch cannot hide a whole-draft replacement in one anchor |
| let equal-length paragraph replacements become a second draft | 2 | minimal conformance retains at least four fifths of the initial draft rather than only its length |
| let unrelated edits borrow a failing measurement id | 2 | every exact edit must independently move one named failing measurement toward its range |
| let measured punctuation edits rewrite unrelated semantics | 13 | a bounded measured correction cannot reverse the request stance or rewrite qualitative content |
| let an edit hide a collateral measurement delta | 2 | every actual per-edit measurement change is named before coverage dimensions are derived |
| reject contractions licensed by an explicit source auxiliary | 6 | an explicit had, would, is, or has source can be contracted without lexical guesswork |
| expand an ambiguous source contraction by convenient symmetry | 3 | an ambiguous source contraction cannot choose whichever expansion makes a patch pass |
| expand ain't as the malformed phrase ai not | 2 | an unresolved negative contraction fails closed instead of inventing a stem |
| collapse structural whitespace around measured punctuation | 2 | tabs and repeated spaces remain structural evidence rather than punctuation trivia |
| let measured punctuation destroy Markdown links | 13 | parenthesis counts cannot be repaired by turning a Markdown link into plain text |
| let measured punctuation rewrite Markdown reference labels | 4 | reference-link labels remain exact even when a measured dash could be normalized away |
| let measured punctuation rewrite Markdown autolink destinations | 3 | autolink destinations remain exact even when a measured dash could be normalized away |
| inspect the edit anchor without its full Markdown-bearing draft | 17 | the smallest exact anchor cannot hide Markdown syntax elsewhere in its source |
| treat fenced code contents as ordinary prose | 5 | tilde-fenced blocks remain protected regardless of nesting, info strings, or anchor size |
| treat CommonMark-indented code as ordinary prose | 4 | tab-expanded and space-indented code cannot be changed by a conformance edit |
| let a failing measurement revise an unrelated coverage dimension | 2 | every conformance edit binds its changed measured rules to their exact coverage dimensions |
| let structured conformance confuse observations with measurements | 2 | strict decoding cannot put profile observation IDs into the measurement namespace |
| count required contraction spelling as lost content | 2 | the minimum required meaning-equivalent contraction correction is content-length neutral |
| use net whitespace delta as the contraction-change count | 4 | zero-word and opposing form changes cannot hide behind a small net whitespace delta |
| treat coupled contraction counters as independent distances | 3 | same-direction contraction and uncontracted-negative failures use the true coupled transition minimum |
| enforce contraction minimality only when length changes | 3 | zero-net extra contraction changes fail independently of target-distance movement |
| let a coupled correction cross one row's nearest boundary | 2 | every initially failing contraction row stops at its nearest permitted count |
| treat two contracted aliases as the same preserved surface | 2 | an apostrophe glyph rewrite or malformed contracted alias cannot hitchhike at zero cost |
| invite the conformer to replace the whole draft | 1 | the model returns bounded edits rather than another candidate draft |
| invite observation IDs into conformance measurement IDs | 1 | the conformer is explicitly told to use deterministic measurement tokens |
| let one observation hide inside a multi-observation omission | 1 | a free-text omission remains accountable to every supported observation it drops |
| tell the drafter to recalculate a locked target card | 2 | the corpus-blind model follows deterministic targets rather than doing approximate bookkeeping |
| teach conformance to use profile observation IDs as measurements | 3 | the portable agent prompt keeps observation and measurement namespaces distinct |
| make every contraction delta content-length neutral | 3 | the portable agent prompt limits the word-count exception to the minimum required correction |
| skip the independent claim-audit dispatch | 1 | acceptance cannot assemble the drafter's correlated self-audit directly |
| let model output downgrade the prepared claim-audit schema | 1 | the immutable prepared pipeline, not model-authored output, selects the accepted audit schema |
| let claim repair alter independently accepted prose | 1 | bounded repair changes only sentence units the independent audit rejected |
| let claim repair alter a retained factual ledger entry | 1 | a repair cannot rewrite the provenance of a retained factual premise |
| let a malformed audit authorize claim repair | 1 | only a complete independently auditable decision set can authorize sentence changes |
| let a broad rejection set become a second draft | 1 | a repair cannot rewrite more than one fifth of a draft even when every row says reject |
| let more than two rejected units enter claim repair | 1 | a low percentage cannot conceal more than two rewritten sentence units |
| let claim repair alter bytes under its hypothetical wrapper | 5 | the only prose edit is one fixed prefix before otherwise byte-identical rejected text |
| let a hypothetical wrapper keep a nonhypothetical basis | 1 | the fixed wrapper changes epistemic status rather than laundering factual prose |
| resume a prepared run under the current environment model | 2 | a prepared run uses only the model recorded before its first dispatch |
| route Codex only for drafts instead of every locked stage | 1 | profile, audit, and critic stages use the same manifest-selected adapter contract as drafts |
| hash committed schemas only for Codex drafts | 1 | profile, audit, and critic provenance hashes the exact schema file Codex received |
| accept an adapter that cannot enforce the gated runtime boundary | 1 | a new harness cannot claim gated acceptance without clean context, no-tools, and immutable failures |
| drop the hash of Claude failure output | 1 | a Claude timeout preserves inspectable raw output instead of disappearing before evidence collection |
| reject a Codex spawn error without persisting its failed cell | 1 | a missing Codex executable records one immutable failed call and cannot be retried as a redraw |
| let an early Claude exit raise an unhandled stdin EPIPE | 1 | an early Claude CLI exit is persisted as one immutable failed cell before retry is possible |
| omit Codex companions from profile artifact hashes | 1 | profile evidence binds the primary Codex event stream and final structured output |
| omit Codex companions from claim-audit artifact hashes | 1 | independent claim audits bind their primary Codex evidence rather than only a mutable wrapper |
| order only the critic wrapper after the independent audit checkpoint | 1 | a pre-audit Codex critic event stream cannot be laundered through a post-audit wrapper |
| skip the exact raw-result namespace inventory | 1 | an orphan failed call, redraw, or extra critic draw cannot survive outside the artifact index |
| allow undeclared files during acceptance dispatch preflight | 2 | an archived failed cell cannot be moved elsewhere in the run before a canonical redraw |
| allow profile-derived files before profile collection | 1 | a profile failure cannot be laundered into an assembled profile path before rendering resumes |
| stop revalidating draft prompts at critic dispatch | 1 | failed evidence cannot be laundered into an earlier prompt before critic dispatch |
| allow final critic outputs before critic collection | 1 | a critic failure cannot be laundered into a future critic source or score path before dispatch |
| let final collection write before its evidence preflight | 2 | collect cannot erase relocated failed evidence before validating the complete critic graph |
| require canonical critic outputs before read-only finalization finishes | 1 | finalization derives all critic evidence in memory before it materializes any canonical output |
| allow undeclared files during final acceptance evidence checking | 1 | the final evidence check rejects every undeclared run file without guessing its content |
| let a Codex wrapper point at another cell's companions | 1 | each Codex wrapper is bound to its own canonical event, output, and recovery filenames |
| trust a recorded artifact hash without reading its file | 1 | editing any recorded acceptance artifact invalidates its evidence |
| stop comparing profile source normalizations to raw evidence | 1 | profile support deduplication metadata reproduces exactly from immutable raw source |
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
| skip claims audit linkage during final check | 1 | independent claims decisions stay linked to the exact draft, disclosure, and quotation candidates |
| trust canonical critic sources instead of comparing them to raw | 1 | critic canonical sources reproduce byte-for-byte from raw model results |
| trust a Codex wrapper that diverges from its primary event stream | 1 | final verification reconstructs Codex structured output from immutable JSONL events |
| select Codex reconstruction from the mutable wrapper label | 1 | a Codex wrapper cannot skip primary-event reconstruction by relabelling itself |
| drop the explicit type from context-specific profile dimensions | 2 | the generated profile schema remains valid in strict structured-output harnesses |
| derive the critic verdict from its finding count | 2 | the model-owned verdict remains independent from the findings-rate instrument |
| drop the independent sentence-by-sentence claim inventory | 1 | a nearby disclosed fact cannot hide a second checkable assertion |
| treat model memory as verified evidence | 4 | remembered examples remain explicitly queued for verification |
| treat profile examples as reusable topic facts | 3 | corpus-derived profile examples cannot cross the factual firewall |
| let unverifiable generalizations enter the claims queue | 3 | claims remain finite propositions a publisher can actually check |
| let argumentative prose decorate itself with external-memory facts | 3 | an argument uses a restrained number of relevant facts instead of decorative memory |
| tell the drafter topical request overlap can license a new predicate | 1 | the model prompt matches the conservative request-support contract |
| let a listed claim license an invented attributed quotation | 3 | an invented quotation cannot be laundered through the verification list |
| collapse multiple named-actor assertions into one topic claim | 1 | each checkable action and consequence remains independently auditable |
| dispatch sixty critics before the claims audit is complete | 1 | an incomplete disclosure audit cannot spend or score sixty critic calls |
| let the independent factual audit treat the profile as a fact packet | 1 | profile examples, biography, and source facts cannot bypass the public verification queue |
| stop requiring a sentence-by-sentence independent decision | 1 | a scalar completeness assertion cannot substitute for an independent decision on every sentence |
| erase deterministic factual candidates from the independent audit checkpoint | 1 | known conditional and rhetorical risks remain source-derived review candidates |
| trust a handwritten checkpoint instead of the immutable independent audit | 1 | every decision, rationale, candidate flag, and claim reference reproduces from independent evidence |
| let an unrelated same-paragraph claim cover an audited sentence | 1 | a public verification claim belongs to the exact independently audited sentence |
| accept a token independent-auditor rationale | 1 | a cleared sentence retains the auditor's inspectable clause-level rationale |
| accept a request ledger claim only topically related to its supplied basis | 3 | a shared topic cannot become model-authored support for an appended predicate |
| let a request-backed claim license unrelated prose | 2 | request support remains linked from supplied basis through claim to exact sentence |
| let the drafting agent serve as its own independent auditor | 1 | drafting and factual clearance remain separate prompt authorities and invocations |
| accept audit provenance that drifts from the locked manifest | 1 | the checkpoint names the exact locked auditor harness, model, prompt body, and transport |
| stop binding the independent audit prompt hash into the checkpoint | 1 | critic-unlocking decisions remain tied to the exact per-draft auditor prompt |
| stop binding the independent audit raw response into the checkpoint | 1 | critic-unlocking decisions remain tied to the immutable raw auditor response |
| follow a mutable alternate draft source pointer during independent audit checking | 1 | independent decisions remain bound to the canonical source derived from raw model evidence |
| follow a mutable alternate independent-audit pointer | 1 | the checkpoint remains bound to the canonical independent result derived from raw model evidence |
| hide a canonical disclosure behind a mutable artifact pointer | 1 | the independent checkpoint cannot suppress or substitute the canonical public disclosure |
| let the completed independent audit checkpoint change after its first commit | 1 | the exact independent checkpoint and critic raw evidence stay immutable after first commit |
| dispatch critics before committing the independent audit checkpoint | 1 | critic calls cannot precede the immutable independent-audit anchor |
| omit the independent audit anchor from critic invocation provenance | 1 | every critic raw record names the exact audit hash and pre-critic commit |
| stop checking that critic evidence was committed after the independent audit checkpoint | 2 | repository history proves the independent checkpoint predates every critic result |
| let a quotation hide inside a profile example | 1 | the profile remains voice evidence rather than a factual quotation source |
| let the requested container override the profile's register | 3 | a policy-newsletter request does not turn the author's vocabulary into policy-brief prose |
| block degradation on any mean rise | 4 | a k=3 noise tick-up does not refuse a good revision |
| stop noticing a fallen verdict | 2 | a revision that drops the verdict is refused |
| treat a split CLEAN as converged | 3 | a split is surfaced, not read as the half that suits the loop |
| resolve a verdict tie to the better verdict | 3 | a coin-flip tie is not evidence of clean |
| drop the attributable-length floor | 2 | a two-letter edit cannot be blamed for an unrelated finding |
| blame edits for text that was already there | 2 | only text an edit INTRODUCED can have caused a finding |
| remove the cap clamp | 3 | human keeps the majority of exemplar slots |
| cold start reports a gap | 4 | no cadence comparison without a calibrated corpus |
| Tier A treated as a normal finding | 6 | an artifact returns the draft instead of being reported |
| drop the attestation requirement | 5 | unattested text cannot become the definition of human |
| stop excluding READMEs | 3 | scaffolding is never a writing sample |
| lose the loose-file scanner candidate | 1 | verification works under the install shape install.sh produces |
| rename readProvenance in calibrate.mjs (sibling present) | 1 | the port is pinned against a sibling that CHANGED, not just absent |
| drop .markdown/.mdx from the ported extension set | 3 | calibration and drafting agree on what counts as a sample |
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
| let an open suffix swallow coinages in the profanity pattern | 3 | a coined term built on a rude root is not counted as the habit it resembles |
| measure rates over the whole file instead of the essay body | 10 | site boilerplate is excluded from a rate the profile will quote |
| let a ratio breach alone become a verdict | 2 | one extra instance in a short draft is not reported as caricature |
| silently skip a claim the checker cannot locate | 2 | a checker that finds nothing to check says so instead of reporting clean |
| read a decimal's fractional part as a count | 2 | 22.65 per 1,000 is a rate, not a count of 65 |
| widen the tolerance past the inflation it exists to catch | 2 | a 32% inflation is still a divergence |
| turn the conjunctive bar into a disjunction | 5 | a draft must clear BOTH instruments, not whichever one it happened to satisfy |
| loosen the pre-registered findings ceiling | 4 | a threshold pre-registered before the run cannot be edited after seeing it |
| let a failed structural gate through | 3 | a fabricated citation fails the run no matter how the drafts scored |
| let a run with no drafts clear the bar | 2 | a run that dispatched nothing cannot report a pass |
| narrow the detector-claim pattern back to a single determiner | 2 | a draft claiming to fool ANY detector is caught, not just one phrased with 'a' |
| let `undetectable` fire without a text subject | 2 | the gate does not flag innocent prose, which is how a gate gets switched off |
| accept a non-integer occurrence count | 2 | a count is a count of instances, not an estimate the renderer interpolated |
| let a stated rate disagree with its own count | 2 | a rate is arithmetic on the corpus, not a number the renderer liked |
| accept a count smaller than the number of samples supporting it | 3 | a habit found in ten samples has at least ten instances |
| stop comparing the frequency phrase against the counted rate | 2 | the phrase a drafter reads and the number a harness reads agree |
| scan the corpus directly instead of delegating to the drafter's reader | 3 | rates are measured over the same attested samples the drafter is shown |
| measure an undelimited corpus without saying so | 2 | a corpus measured whole cannot report itself as cleanly delimited |
| count bare-URL lines as paragraph endings | 4 | citation scaffolding and image credits are not measured as paragraph endings |
| measure every sentence instead of paragraph-final ones | 4 | the drumbeat is visible only when endings are measured apart from the prose |
| count the country US as the pronoun us | 5 | a habit rate is not inflated 32% by an abbreviation that shares its letters |
| treat every possessive as a contraction | 2 | the world's fair is not evidence that the author contracts |
| let the solidarity pattern match inside longer words | 3 | the habit five drafts are deficient in is not inflated by substring hits |
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
