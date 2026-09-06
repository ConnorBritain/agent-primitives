# Installed persistence, conversations and final bytes

Local verification against the v0.4.0 candidate at `0833014`, followed by the
example-selection correction described below. These are workflow tests using
synthetic identities, not private user preferences or evidence of voice quality.
All model work used authenticated CLI sessions and inherited configured models.
No direct API-key client was used and no dollar cost is inferred.

## Persistent correction through installed entrypoints

`tests/installed-preferences-test.mjs` starts a fresh runtime process for each
operation. Its rule is “Never use exclamation marks in replies.” The sequence
checks scope/revision/undo receipts, cross-process persistence, exact-zero
violations, exclusion from other forms, independent-rule survival across profile
refresh, three-card discovery, a temporary one-feature comparison, approval for
one-word inferred feedback, undo, and explicit ungated missing-CLI behavior.

| Installed path | Assertions | Live model calls | Model-call elapsed | Result |
|---|---:|---:|---:|---|
| Codex plugin | 10 | 2 | 13.552 s | Passed, saved correction applied to final draft |
| Claude plugin | 10 | 2 | 23.092 s | Passed, saved correction applied to final draft |
| Claude loose skill | 9 | 0 | 0 s | Passed, no live generation requested |

The live draft checks also reproduced against each installed `check-result`
entrypoint. Undo restored an empty active rule set as revision 3 while retaining
revisions 1 and 2. No real user's preference store was changed.

## Fresh agent conversations

`tests/conversational-smoke.mjs` supplies the installed tuning skill path and a
test-only store, then asks the agent to save the same instruction. A second,
fresh conversation asks it to undo. Both harnesses invoked the actual preference
runtime rather than writing revision files themselves. The harness checked the
saved state after each conversation: revision 2 with one reply-only punctuation
rule, then revision 3 with no active decisions. Each conversation returned a
human-readable receipt. Tool records showed installed instructions and test-store
operations; no unrelated preference writes were observed.

| Harness | Save elapsed | Undo elapsed | Outer CLI conversations | Result |
|---|---:|---:|---:|---|
| Codex | 61.719 s | 60.934 s | 2 | Passed |
| Claude | 40.761 s | 36.218 s | 2 | Passed |

These are four outer conversations, **not** a claim of four internal model
requests. The CLIs' aggregate token-usage records are retained locally. Automatic
skill discovery was not tested: the prompt explicitly identified the skill.
Claude's save receipt described undo with a runtime operation name; the next
natural-language undo request nevertheless completed successfully.

## External final-text edits

`tests/installed-final-bytes-test.mjs` checks each already-recorded live draft
through its installed runtime. The original bytes pass. A copy with one trailing
space fails with “Published bytes differ from the run,” despite unchanged word
and punctuation counts. Both Codex and Claude plugin paths passed this negative
test, with zero additional model calls. Original evidence was not overwritten.

This proves invalidation **when checking is invoked**. It does not prevent a
hosting agent from bypassing checking or editing prose after returning it.

## Narrow example-selection correction

A completion audit found that ranking preferred matching examples but filled
remaining slots with known nonmatching writing forms. Current selection excludes
known form/register conflicts even when fewer than three examples remain. Samples
with unknown metadata remain available as general evidence, with explicit receipt
warnings that matching is not established. A new regression checks exclusions,
warnings and their propagation into the final receipt; the existing test now
requires one matching reply rather than topping it up with essays. Selection
without a requested form still verifies the three-example cap.

The full author suite passed **1,333 checks, zero failures**. The unchanged
bounded comparison reproduces under the corrected selector: its source metadata
was unknown, not known-conflicting. No comparison draft or input was regenerated.
Both plugins and the Claude loose draft skill were reinstalled afterward; their
runtime bytes match the source. The complete mutation table update/check remains
a separate, unfinished engineering requirement at this checkpoint.

Two isolated mutation trials verify the new guards: admitting known mismatches
caused two test failures; hiding unknown-metadata warnings caused one. Each trial
used the existing mutation tool's sandbox/apply mechanism and the full author
suite. These focused trials do not substitute for the full update/check.

## Evidence retention and limits

### Subsequent profile-guided failures

`tests/installed-profile-smoke.mjs` exercises an installed full draft/review
invocation using the already-recorded Doctorow profile and licensed samples.
Its fictional outline-to-blog brief is taken from the bounded comparison; it
does not rerender a profile or replace a comparison cell.

The first Codex invocation used three model calls, 78.499 s model-call elapsed;
Claude used three calls, 145.290 s. Both returned **ungated**. Voice reviewers
accounted for supplied explicit rules beyond the requested list. In addition,
the validator rejected clear reviews that explained absent advisory habits as
ordinary variation. The Codex voice reviewer did identify an actionable drift:
an evaluator-like disclaimer replaced the direct reader relationship in the
examples. Its response could not drive a repair because the accounting contract
was invalid. This is evidence of a useful finding and a real orchestration
defect, not a successful end-to-end result.

The correction explicitly supplies advisory IDs, requests all rule/observation
IDs consistently, and permits ordinary variation only with reasoned, successful
task and voice reviews. All omission disclosures remain in the sidecar; required
rule omissions and unresolved judgments are still blocking. The full author
suite after this correction passed 1,336 checks. Four focused mutation trials
detected reintroduced quota semantics (two failures), excused required omissions
(one), missing dual review (one), and user rules treated as observations (one).

The focused live repeats produced:

| Harness | Calls | Model-call elapsed | Attempts | Outcome |
|---|---:|---:|---:|---|
| Claude | 3 | 131.640 s | 1 | Checked; final bytes reproduced |
| Codex | 11 | 234.887 s | 3 | Incomplete after the two-repair limit |

The corrected Claude run retained three omission disclosures (unsupplied sources,
unsupplied biography, context-inappropriate profanity) as reviewed advisory
omissions. They were not silently removed and did not become compulsory habits.

Codex's voice review requested a register repair to remove an evaluator-like
disclaimer. Fidelity review then requested restoration of the explicit statement
that no deterrence had been observed in the scenario. The last voice review
flagged that restored sentence. Task and fidelity review passed; voice review
did not. The runtime stopped incomplete with all attempts retained. The smoke
test's strict successful-output assertion therefore failed; this case must not
be counted as a passed installed draft. It demonstrates a remaining disagreement
between voice and fidelity review, and the bounded failure path, not a reason
to silently waive a review or redraw until success.

The two initial invocations and two focused repeats used **20 model calls**
in total. No profile was rerendered and no comparison output was replaced.

### Retained original reports

Complete raw reports, generated drafts, runtime calls, preference revisions and
conversation traces are retained in a private local backup, not published in
this repository: outer CLI traces can contain host configuration metadata.
The following SHA-256 hashes identify the original, unedited `REPORT.json` files.

| Report | SHA-256 |
|---|---|
| codex-persistence | `505665b31136225793b27dce55708a254c258df3e57b85b9ea1e6fb2f8a7e478` |
| claude-persistence | `4f9911df58ae1d644e3bed47628e3f07062bbd56332f2ad82aaf47f4ca1f4b3d` |
| claude-loose-persistence | `9a7f868ba8c69cf922547d16ef56032a973e88821f0a17af371704f8567c0d62` |
| codex-conversation | `332ca8a60af583a80106567afac861397cda52b96dde8c4c59fb20c63f5f364b` |
| claude-conversation | `a80a0a7ada1b7d136314403f9c9d5699423e42bf6ae273129871230d2c6c5ba4` |
| codex-final-bytes | `e9840fbc3f7b23306cc307ca7266706f400900dc13fc57bc7b94d7fcd89a6f39` |
| claude-final-bytes | `eefb14af7cfa999bbb61ebd8966ad01c018e23fc5e831c1e899cc0e4520c627c` |
| codex-profile-1 (ungated) | `03d73d8e89787d5e4a8bc6f4e3c016c2d1ce3a8c84ef3d3ee431277a825c8c92` |
| claude-profile-1 (ungated) | `66dd5fe1ce8f1b2cef92f7d94e49ba12af4fcd3905446d14a09954a578c3af41` |
| codex-profile-2 (incomplete) | `8923fed1211800058c8312d3614ed80966e5b52c30b2fd722eff9a25b6846182` |
| claude-profile-2 (checked) | `34bcd34dbb332d56986c93b2132ef0292675996b282a58dee8e56103621bb57e` |

The engineering scripts can repeat these scenarios against another local install
using explicit `--skill`, `--harness`/`--artifact`, and new `--out` paths. Normal
users invoke the skills conversationally, not these test scripts. These results
do not establish implicit discovery, subjective usefulness, private-corpus voice
fidelity, Windows execution, or a completed release audit.

## Conversation-level drafting: failures retained

`conversational-writing-smoke.mjs` requests the installed skill by name, without
supplying its path or runtime command. It uses an isolated preference store and
asks for a two-sentence invitation reply with required exact text, no question
or exclamation marks, and fewer than 60 words. No result is sent externally.

| Invocation | Outer elapsed | Inner CLI dispatches | Inner elapsed | Observed outcome |
|---|---:|---:|---:|---|
| Codex conversation 1 | 61.939 s | 1 | 0.293 s | Ungated: parent sandbox prevented child initialization |
| Claude conversation 1 | 77.621 s | 2 | 18.838 s | Checked runtime draft, but incomplete mechanical encoding and inaccurate host receipt |
| Claude conversation 2 | 95.020 s | 2 | 18.795 s | Zero-call input refusal, then checked corrected job; strict conversation test still failed |

Outer elapsed includes inner calls; do not add them. The Codex child launch
failed before a provider response, so one CLI dispatch is not evidence of one
completed model request. The test temporarily enabled network but kept the
workspace-write sandbox. No saved permissions were changed, and no unrestricted
repeat has been run under this test.

Claude conversation 1 treated literal text and punctuation restrictions as
semantic preferences rather than hard rules. Its prose happened to comply,
but the final host-written receipt incorrectly claimed that a scanner was
unavailable even though the runtime recorded a passing scan. The runtime now
generates `receipt.md` and `delivery.md`; the skill tells the host to return
those recorded statuses. Exact receipt reproduction is independently checked
without relabeling semantic not-evaluated checks as mechanical passes.

Claude conversation 2 represented all four supported hard rules correctly.
Its initial job also invented a `sentences` measurement, which the runtime
refused with zero calls. The host corrected that instruction to semantic and
ran the corrected job once: one draft and one task review. Thus two result
directories do **not** mean two generated drafts. The test's single-invocation
assertion failed, and the host also reformatted the generated receipt rather
than delivering it verbatim. Neither failure is relabeled as a pass. The runtime
reference now enumerates its actual counter IDs, including the fact that
sentence counting is unsupported. The original evidence is unchanged.

| Original report | SHA-256 |
|---|---|
| codex-writing-conversation-1 | `3502f9da244c431ffad8b0e45388630cd37980e463fb8808c8a3d68d577e0529` |
| claude-writing-conversation-1 | `4b1fdd693107d7f35f06063d6b92344cc0e75e9cc7f821a54bdb425e292093e0` |
| claude-writing-conversation-2 | `c9f7a3ea8ec868ab6e5987a7587cc346b291d80e4e551e9ff0d07e426f644bbe` |

Raw traces and both Claude result directories are retained in a private local
backup. These failures concern outer-host integration, not a rerun of the
bounded 18-draft comparison and not evidence that every generated draft is poor.

### Focused counter-documentation repeat

Claude conversation 3 used the refreshed counter reference, prepared one valid
job and made exactly one draft call plus one task-review call. All four hard
rules passed on the exact 22-word draft. The outer invocation took 90.151 seconds;
the two inner calls took 19.057 seconds. The model was not changed and no
comparison cell was regenerated.

The strict delivery assertion still failed. The host reformatted `delivery.md`
and added a statement that prose-review was not installed, despite the verified
local installation. Its job explicitly set `review_root: null` after its own
dependency lookup; that is not evidence that the bundle was absent. No voice or
fidelity review was required for this no-profile, unrepaired reply, and no such
review was represented as passed by the runtime. The hard-rule preparation gap
is closed in this case; faithful host receipt delivery is not proved. Do not
repeat the same run unchanged to select a compliant-looking response.

The original report is retained privately with SHA-256
`82e95f604218281696a006ad65b13d9f000322073d34224e0b806bdba329c4f9`.

## Installed lifecycle and receipt rechecks

These checks use the refreshed installed tools, isolated stores and local fake
CLI children. **No model requests or network calls** are made. The fixture
deliberately ignores SIGTERM to test bounded process cleanup, not language quality.

The initial Codex interruption check hung in plugin-registry discovery before
generation. The synchronous probe's timeout could not finish while the child
ignored SIGTERM. The exact fixture child was manually stopped; the original
failed report is retained (67.531 seconds including diagnosis). The original
Claude loose-file generation interruption passed in 3.359 seconds because it
did not need that registry lookup.

The fixed synchronous probes use forced termination at 15 seconds. The installed
focused checks now report:

| Installed path / scenario | Elapsed | Outcome |
|---|---:|---|
| Codex plugin / generation timeout | 3.411 s | Passed; ungated, no draft, child dead, temporary context removed |
| Codex plugin / stuck registry then generation timeout | 18.100 s | Passed; both children terminated, no retry or checked output |
| Claude plugin / stuck capability probe | 15.674 s | Passed; ungated, no generation dispatch |
| Claude loose / generation timeout | 3.612 s | Passed; ungated, no draft, child dead, temporary context removed |

Fresh-process preference tests pass nine assertions in both installed Codex and
Claude loose paths: direct save, scope, profile refresh, inference approval,
comparison, undo and unavailable-CLI behavior. Updated receipt verification also
passes in both plugin paths and rejects trailing-space alterations. Claude's
mixed hard/semantic report reproduces with integrity status passed **and
mechanical status not-evaluated**; no semantic check is upgraded.

| Retained report | SHA-256 |
|---|---|
| codex-interruption-final (failed original) | `f2595b3617d68645c291d382d973f7e5d61eee0b496120bb34dbe065aa467db0` |
| claude-interruption-final | `d4e997217fdac1dac01840701198b9ae8af9e60fe4255820c3350582e3c201cb` |
| codex-interruption-fixed | `abe614af6f2c250093a4406d0ee395cdbaff09bc35e3764f114f49daf54758bb` |
| codex-registry-timeout-fixed | `7621b48f18b0acb61eefac56597b532d1f722267d819d84a81139f7aa47f09e5` |
| claude-capability-timeout-fixed | `3f89feb71cb357ce10eabd7a0079d00b416c27ec9a5d15379f73736547583ac5` |
| claude-interruption-fixed | `78aeb6234a84e2b03ca5ea63dc8a0a8f46f3b121c93079e0a2172dc7afc9993f` |
| codex-receipt-integrity-2 | `efc2c08f91ff723ae8fe2941332e1e3e6b93f788acd518a98c923ac6b971da0b` |
| claude-receipt-integrity-2 | `1637c4aebce2ca812b994da2625b1de68f4d6a2ddbbae8ee75cdfdf8dc3e1ced` |
| codex-preferences-final | `9e7e908c4c27435be21337a32c040c8eff85b7edab3ecf98340b4aaa380fb45e` |
| claude-preferences-final | `b3b9433fd1035bf60eecd4a9cf011cc8c005cd01179076c9d11c0c18d096e79d` |

Raw reports and fixture artifacts are retained privately. These are POSIX local
process checks, not proof of Windows termination or cancellation at a model
provider. They do not resolve the separate conversational handoff failures.

## User-authorized authoritative-file handoff

The user subsequently approved an isolated full-access Codex test, with no
saved-setting changes, and generated-file authority with host summaries labeled
unverified. Implementation commit `8085719` preceded these fresh conversations.
Both installations had matching production files. The tests requested the skill
by name, supplied no skill path, used isolated preference stores and generated
one initial draft plus one task review per harness. They sent no messages to
external recipients. Inspected outer execution records show task-local writes,
skill/dependency reads and runtime commands, not account-setting changes.

| Harness | Outer elapsed (includes inner calls) | Inner calls / elapsed | Delivered artifact |
|---|---:|---:|---|
| Codex, authorized one-off full access | 86.681 s | 2 / 16.573 s | Checked; complete delivery verification passed |
| Claude, existing test permissions | 79.049 s | 2 / 18.885 s | Checked; complete delivery verification passed |

Claude used its refreshed loose skill and passed the conversation test directly.
It linked the generated file and explicitly labeled its chat summary unverified.
Codex used its refreshed plugin skill and linked the authoritative file, with
directly quoted receipt excerpts. Its original automated result was **failed**:
the test required the word “unverified” even for source-verified direct excerpts,
rather than distinguishing quotations from host-written summaries.

That false alarm was corrected in the test, not by changing the conversation.
Independent fixtures reject invented quoted statuses, unsupported added claims
and unlabeled summaries; a focused mutation of the excerpt-source check fails.
A zero-model-call recheck of both retained conversations verifies the actual
delivery bytes, rule encoding, task-local preferences, source excerpts or summary
label, and the file link. Codex's source excerpts occur in its recorded receipt.
The original failed report remains unchanged alongside the separate recheck.
Neither conversation nor any bounded-comparison cell was redrawn.

The runtime's new `check-result --delivery` also rejects receipt-only changes,
whitespace changes and substitution of different prose. Omitting the option
reports delivery not-evaluated. These are integrity checks, not semantic or
resemblance guarantees. Raw conversations and rechecks are backed up privately.

| Retained report | SHA-256 |
|---|---|
| Codex (original false-alarm result retained) | `678ba9930d3bad6d9b9468bfec34c51c04bfaff6fe976d3095e20e7bc691c787` |
| Claude | `0b5eb54f598f1ef904eebda23f946a473556aa8b146dce3a969547ad6cacd241` |
| Codex zero-call artifact recheck | `b35bc1c21e7e005ad40ff134d686f3a20b6e818811f848f77c24198f00b3d984` |
| Claude zero-call artifact recheck | `9cf2035c1369ffd90984ff9ab8a9dcfefc5675a4c2d506d342d995bbbf1d6e39` |
