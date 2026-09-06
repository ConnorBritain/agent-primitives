# v0.4.0 final local engineering evidence

Tested implementation commit: `95690f578e8563459bbe020f9b73caa001133be6`.
These are local engineering checks, not a writing-quality or resemblance claim.
No model requests, comparison redraws, publication or Actions changes were made
by this verification sequence.

## Mutation verification

| Invocation | Outcome | Elapsed |
|---|---|---:|
| `node bundles/prose-author/tests/mutations.mjs --update` | Exit 0; 242 mutations, no zero scores or crashes | 1,827.024 s |
| `node bundles/prose-author/tests/mutations.mjs` | Exit 1; one recorded-count discrepancy | 1,815.467 s |
| Three focused repeats of mutation 77 in a private sandbox | Two failures each, no crashes | See retained raw logs |
| Same full check with a diagnostic-only preload capturing child output | Exit 0; all 242 rows match | 1,801.493 s |

The first check reported four failing assertions for “let equal-length
paragraph replacements become a second draft,” where the update recorded two.
Its other 241 rows matched. That runner discarded the individual assertion
output, so the two extra failures cannot be identified from its retained table.
They remain unexplained; neither the mutation nor the expected count was
changed to obtain a pass.

The focused repeats and diagnostic full check captured the two expected
failures: the same-length paragraph-replacement regression and the historical
locked-input drift check. The diagnostic preload only records child outputs;
it preserves child arguments, return values, thrown errors and exit behavior.
It does not change repository source, assertions or table generation.

All 248 child-suite outputs are retained: three baseline suites, 242 mutated
suites, and three restoration suites. Baseline and restored counts were:

- prose-author: 1,342 passed, 0 failed.
- prose-tell-scan in the mutation sandbox: 330 passed, 0 failed, 2 skipped.
- prose-review: 300 passed, 0 failed.

The sandbox skips are Git corroboration of a corpus frontmatter date (the copy
has no tracked-file history) and primitive/rendered parity for the intentionally
held pattern critic. The separately recorded real-checkout sibling suite is
334 passed, 0 failed, 1 skipped; these scopes are not interchangeable.

Both full check invocations reproduced the same before/after tracked diff
digest, `f20ac710f7d8ebefe288be046fbb7126691cc6b4a83879ddaf17b43cc880e731`.
The mutation table was written only by the existing update command.

## Concurrent safety

Five prose-review suites passed during the first full check. Five additional
review suites also passed while mutation 13 was directly observed as applied in
the private sandbox both before and after each review. Each reported 300 passed,
0 failed. These complement the existing 242-target working-tree safety check;
they do not erase the separate count discrepancy.

## Retained report hashes

Raw logs, diagnostic scripts and reports are backed up privately, including the
failed original. No private machine paths are required to use the shipped tool.

| Artifact | SHA-256 |
|---|---|
| Original sequence report | `d323a09a48fdf263a896ba344104f1b136bd538144d685d3ff949cb86fce75f8` |
| Original failed check log | `8d657eeb1d4a7aaf46b982d15d1607a416e5b2125ddd69346984393b4b95422a` |
| Diagnostic check report | `f1c9717aa9f785338c5b9e82b9279f607307f22df800f8e4844a4b5557d0f99f` |
| Diagnostic passing check log | `4c8251f32e19e2b3062e4e9a012e1b77fdb58effbbfaf8a68880e89a695a3e90` |

## Completion is still unproven

The [completion audit](V040-COMPLETION-AUDIT.md) records the remaining installed
conversation boundaries: the restricted Codex parent sandbox prevented nested
CLI initialization, and Claude reformatted the generated receipt and added an
unsupported installation statement. The requested permission and delivery-boundary
decisions remain pending. No unrestricted retry or receipt-boundary relaxation
is implied by these engineering results.

Automatic profile rendering uses all supplied samples. Task register/form
context does not itself filter the rendering corpus; supply selected whole
pieces when a register-specific profile is intended. Mixed-corpus support is
reported conservatively, not represented as a complete learned voice.

## Documentation and installed refresh

After the diagnostic check, only the generated mutation table, evidence notes
and corpus-selection guidance changed. The author suite passed again with
1,342 assertions and zero failures. Skill and plugin format validators passed
(the validators use PyYAML through the development runner; production remains
dependency-free apart from Node and the authenticated harness CLI).

The native local Codex installer refreshed all three prose plugins and six
custom-agent wrappers, then verified enabled versions and deployment bytes.
Claude's native plugin installation refreshed prose-author; its deployment
inventory/bytes were compared directly with the repository. The loose Claude
drafting skill was refreshed too, and its changed runtime reference matches.
Both installed workflows require a fresh host session to pick up new guidance.
These installation checks do not substitute for the unresolved conversational
delivery tests above.

`git diff --check` passed. The preexisting untracked claims audit retains
SHA-256 `12814f1c017285fd0942a7069be8b29878aefeb252e42bc08f00c82d6e0ef9d6`.
GitHub Actions files have no diff from the starting commit `62a0e3a`.

A heuristic scan of 197 changed/new text files found no personal home-directory
paths. Two API-key-shaped matches were inspected and were the same public
Economist URL slug (`elon-musk-is-building-…`) in locked corpus inputs, not
credentials. Those historical inputs were preserved. This is not a comprehensive
secret audit.
