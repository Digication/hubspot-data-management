# Context Expansion

How Refine captures, stores, and uses context annotations across cycles. This is the mechanism that makes each cycle more informed than the last.

## The Principle

Each cycle does two things: improves the artifact and expands available context. The second effect is more important than the first.

When the human reviews proposals, their responses carry information beyond the decision itself. A "reject" with a reason tells you something new. An "approve" with an addendum surfaces knowledge that wasn't in the original input.

## Annotation Types

### Factual

New facts about the domain that weren't in the original input.

**Trigger:** Human provides specific information alongside a decision.

**Examples:**
- "Approve — and the auth service handles legacy tokens with client_assertion, not client_id/secret"
- "The WAL archive has a 15-minute lag"
- "Legacy detection uses the plan_type field"

**How to use:** Feed into the next Discover evaluator prompt as known context. Also feed into Analyze so proposals incorporate these facts.

### Constraint

Rules, limitations, or boundaries that must be respected.

**Trigger:** Human rejects or modifies based on a rule or limitation.

**Examples:**
- "Reject — we deprecated that feature last quarter"
- "Modify — refund threshold is $50, not $100"
- "We can't use that endpoint — it's behind the internal VPN"

**How to use:** Feed into Discover as constraints the rubric must respect. Feed into Analyze as hard rules for proposal generation. Proposals that violate known constraints should not be generated.

### Preference

Stylistic or structural preferences revealed through consistent choices.

**Trigger:** Human modifies proposals in the same direction, or explicitly states a preference.

**Examples:**
- "Make it shorter" (explicit)
- Human shortens 3 of 5 proposals (implicit pattern — detected in Reflect)
- "I prefer bullet points over paragraphs" (explicit)
- Human consistently adds caveats to absolute statements (implicit pattern)

**How to use:** Adjust proposal generation style in Analyze. Don't feed into Discover (preferences don't affect what's wrong, only how to fix it).

## Capture Rules

### When to Capture

Parse the human's response after EVERY decision in the Approve phase. Look for:

1. **Explicit new information** — facts, numbers, names, dates not in the current artifact
2. **Corrections** — "actually", "no", "not X but Y"
3. **Reasons for rejection** — why something was rejected (often reveals a constraint)
4. **Addenda to approvals** — "yes, and also..."
5. **Modification patterns** — consistent direction in modifications (detected in Reflect)

### When NOT to Capture

- Pure decisions with no reasoning: "Approve" / "Reject" (no annotation)
- Conversation noise: "sounds good" / "okay" (no information content)
- Already-known information: facts that are already in the artifact or prior annotations

### Storage Format

Write to `<output_dir>/context-annotations.json`:

```json
[
  {
    "cycle": 1,
    "proposal_index": 2,
    "type": "factual",
    "content": "Auth service handles legacy tokens with client_assertion, not client_id/secret",
    "source": "User correction during proposal review",
    "resolved": false,
    "integrated_in_cycle": null
  },
  {
    "cycle": 1,
    "proposal_index": 5,
    "type": "constraint",
    "content": "Feature X is deprecated — do not reference it",
    "source": "User rejection reason",
    "resolved": false,
    "integrated_in_cycle": null
  },
  {
    "cycle": 1,
    "proposal_index": null,
    "type": "preference",
    "content": "Concise text preferred — user shortened 3 of 5 proposals",
    "source": "Modification pattern detected in Reflect",
    "resolved": false,
    "integrated_in_cycle": null
  }
]
```

## Integration Into Subsequent Cycles

### Discover Phase

When building the evaluator prompt for cycle N+1, append a "Known Context" section:

```
## Known Context (from prior cycles)

Factual:
- Auth service uses client_assertion for legacy tokens (cycle 1)
- WAL archive has 15-minute lag (cycle 2)

Constraints:
- Feature X is deprecated — must not be referenced (cycle 1)
- Refund threshold is $50 (cycle 1)

Evaluate the artifact with this context in mind. Flag any content that contradicts these facts or violates these constraints.
```

### Analyze Phase

When generating proposals for cycle N+1:

1. **Factual annotations:** Proposals should incorporate known facts. A proposal that contradicts a factual annotation is a bug.
2. **Constraint annotations:** Proposals must not violate constraints. A constraint-violating proposal should never be generated.
3. **Preference annotations:** Adjust generation style. If the user prefers concise text, generate shorter proposals. If the user prefers bullet points, use bullet points.

### Reflect Phase

Reflect checks context utilization (checklist item 5): "Were context annotations from prior cycles not reflected in proposals?" If yes, prioritize them in the next cycle.

## Pruning

### When to Prune

Mark an annotation as `resolved: true` and set `integrated_in_cycle` when:
- The fact has been incorporated into the artifact and verified in Measure
- The constraint has been respected in all proposals and the artifact
- The preference has been consistently applied for 2+ cycles

### What Pruning Means

Resolved annotations are NOT deleted — they stay in the file for the report. But they are NOT included in the "Known Context" section of subsequent evaluator prompts, reducing prompt size.

### What NOT to Prune

- Constraints that are ongoing (e.g., "feature X is deprecated" — this is permanent)
- Preferences (these should persist for the entire session)
- Facts that haven't been verified as incorporated

## How Context Expansion Compounds

```
Cycle 1: AI knows [initial input]
         → Draft triggers corrections → +3 factual, +1 constraint
         
Cycle 2: AI knows [initial input + 3 facts + 1 constraint]
         → Proposals are closer to right → corrections are more specific
         → +2 factual (deeper details), +1 preference
         
Cycle 3: AI knows [initial input + 5 facts + 1 constraint + 1 preference]
         → Proposals are very close → corrections are fine-grained
         → convergence
```

Each cycle's proposals are better not just because issues were fixed, but because the AI has more context. Better context → proposals closer to the productive wrongness band → richer corrections → even more context. The loop compounds.

## Reporting

In the final report, include a "Context Expansion" section showing:
- Total annotations captured per cycle
- Annotation types breakdown
- Key facts/constraints that changed the artifact's direction
- How many annotations were resolved vs. still active
