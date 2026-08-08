```json
{
  "plan": "plan.json",
  "mode": "plan-only",
  "edits": [
    {
      "plan_id": "e01",
      "before": "for some reason roared",
      "after": "for some reason burst out",
      "reason": "voice-critic: 'roared with laughter' is a construction the corpus samples do not use"
    },
    {
      "plan_id": "e02",
      "before": "with moderation",
      "after": "modestly",
      "reason": "voice-critic: 'with moderation' is a formal register that jars against the letter's tone elsewhere"
    },
    {
      "plan_id": "e03",
      "before": "indeed ",
      "after": "",
      "reason": "voice-critic: 'indeed' is an emphatic filler that appears once in the whole letter; drop"
    }
  ],
  "refused": [],
  "noticed_but_not_edited": []
}
```
