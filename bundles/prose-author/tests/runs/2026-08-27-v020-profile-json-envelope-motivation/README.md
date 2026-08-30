# v0.2 profile render failure — split artifacts are unstable

This is the preserved run against `c115d7c`. It is not acceptance evidence and its
lock is deliberately named `failed-corpus.lock.json`.

Doctorow r1 emitted both fences and passed every schema, coverage, deterministic-rate,
paragraph, and recount check. Under the identical locked prompt, Doctorow r2 ended
normally but emitted only its non-refusal JSON fence. The request's final instructions
explicitly required Markdown first and called a non-refusal JSON-only response invalid;
prompt emphasis therefore did not stabilize the split output contract.

The following implementation makes the human profile and machine record structurally
inseparable: `voice-profile/2` carries a required `profile_markdown` string inside one
JSON envelope, and the parser materializes that string as Markdown. Doctorow r3 was
interrupted as soon as r2 made the run incapable of passing. No draw in this directory
is eligible for reuse.
