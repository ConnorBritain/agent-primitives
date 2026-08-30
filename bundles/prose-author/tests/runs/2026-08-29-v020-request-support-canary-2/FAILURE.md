# Narrowed request-support canary failure

This is development evidence, not acceptance evidence. Both locked calls were attempted
sequentially with no redraw.

- Codex returned a fresh structured source in 37 seconds. The narrowed production
  `voice-draft-source/3` validator accepted it with no source errors and it assembled into
  a valid public draft with no external-verification claims or fabricated citations.
- Claude emitted no result and hit the locked 720,000 ms timeout. The Claude adapter did
  not persist a raw failure envelope on timeout; the missing cell is therefore a harness
  evidence defect as well as a failed call.
- The canary collector then treated the structured `{ leaked, count }` corpus-leakage
  result as an array. That made the otherwise valid Codex cell report
  `no_corpus_leakage: false` even though its recorded leakage count is zero.

The set remains `HOLD`. Do not redraw either cell or reuse the Codex cell as acceptance
evidence. Before another canary, fix failure persistence and the collector's leakage shape.
The semantic result is limited but useful: unlike the previous over-strict whole-sentence
coverage rule, the claim-only coverage boundary accepted the fresh Codex paraphrases.
