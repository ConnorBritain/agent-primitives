# v0.2 profile dispatch — invalidated before drafting

This is preserved harness-failure evidence, not acceptance evidence.

The first dispatcher used relative file names in the task while Claude Code resolved
tool paths from the user-level workspace rather than the child process's working
directory. Every completed response therefore reported that the corpus was unreadable;
two other calls were interrupted once the common mechanism was identified. No valid
voice profile and no acceptance draft was produced.

The failed run pins implementation commit `64547829be0462213d2c53492a40c0f15b2fc307`.
All completed raw records are retained. None may be reused in the replacement k=3 run.
