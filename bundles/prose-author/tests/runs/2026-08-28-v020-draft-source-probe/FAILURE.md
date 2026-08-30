# Failed cross-harness draft-source probe

This disposable two-cell run tested `voice-draft-source/1` at prepared commit `ee8fa28`.
It is diagnostic evidence only, not part of the v0.2 acceptance sample. Neither cell
produced a usable semantic source, and neither is redrawn.

## Doctorow through Claude

- Harness: authenticated Claude CLI, Sonnet, medium effort, native `--json-schema`
- Request: the locked 650-word `d01` acceptance request with committed Doctorow r1
- Result: aborted without `structured_output` after 830,157 ms
- CLI subtype: `error_during_execution`
- Permission denials: none
- CLI-reported API-equivalent usage: $0.00

The process exceeded the acceptance harness's 720-second ceiling and was interrupted. The
raw record reports `Request was aborted`; it contains no draft to validate. This shows that
medium-effort drafting remains operationally marginal even after the envelope change. It
does not say whether the schema or prose would have passed had the request completed.

## EFF Mullin through Codex

- Harness: Codex CLI 0.146.0, `gpt-5.6-luna`, medium reasoning, `--output-schema`
- Request: the same locked 650-word request with committed EFF Mullin r1
- Result: rejected before generation with HTTP 400 `invalid_json_schema`

Codex requires an explicit JSON `type` beside `const` and `enum`. The draft schema inherited
the terser form accepted by Claude, so `properties.schema` had `const` but no `type`. The
five JSONL events show that the model never produced an output. A local cache warning also
appeared, but the terminal failure was the server's precise schema diagnostic.

The next implementation adds explicit types to every draft and profile source `const` and
`enum`, keeps one shared schema rather than a provider fork, and gives the profile assembler
a context-specific strict schema path. A new probe directory will test that new commit.
