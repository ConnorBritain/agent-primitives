# Failed profile-stability set — model-owned measurement slots

This directory preserves the fourth complete six-response stability set. It is failed
evidence and must not be used by drafting or counted toward v0.2 acceptance.

- Prepared commit: `e332358310b7d1a4d2c4e6e3964c9f8b6050546d`
- Transport: Claude CLI native structured output, Sonnet, profile effort low,
  concurrency one
- Responses: three Doctorow and three EFF, all immutable and complete
- Raw model duration: 918,953 ms (15.3 minutes)
- CLI-reported API-equivalent usage: $1.3371; the run used the authenticated subscription
  CLI, not direct API-key billing

The flat `voice-profile-source/2` shape corrected the preceding global-budget failure.
Every response contained 13 or 14 observations, used 627–759 semantic words, covered all
ten dimensions, and satisfied native structural decoding. Four of six sources assembled
cleanly. No response required transport repair.

The remaining failure was ownership of `measurement_id`. The model had to select a
measurement for each semantic paragraph, and two renders assigned an absence paragraph
the positive replacement's ID:

| render | duplicated ID | prose actually described |
|---|---|---|
| Doctorow r2 | `contractions` | sparse uncontracted negatives |
| Doctorow r2 | `en-dashes` | absent em-dashes |
| EFF r2 | `first-person-plural-family` | sparse first-person singular |
| EFF r2 | `em-dashes` | sparse en-dashes |

The assembler correctly rejected all four duplicate IDs rather than silently guessing the
intended counterpart. EFF r1 also omitted the available second-person measurement and used
a qualitative observation, showing that a structurally valid array does not guarantee
complete use of deterministic measurements.

No cell from this set is reused. The next contract makes relevant measured observations
deterministic slots keyed by measurement ID. The semantic renderer fills only each slot's
function and placement. Qualitative observations remain model-authored within the remainder
of the same fourteen-observation global budget.
