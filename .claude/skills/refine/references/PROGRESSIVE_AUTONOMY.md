# Progressive Autonomy

How the human's level of involvement adjusts based on demonstrated alignment between the AI's proposals and the human's intent.

## The Principle

Most AI workflows put the human as Author (generates the spec) then Reviewer (checks everything). Refine starts the human as Reviewer and shifts toward Director as alignment is demonstrated.

```
REVIEWER ──→ SUPERVISOR ──→ DIRECTOR
  ↑              ↑             ↑
Reviews        Handles       Defines
everything     only          criteria,
               escalations   reviews final
```

Autonomy must be easily revocable. Trust is earned per-cycle and can be withdrawn at any moment.

## Role Definitions

### Reviewer (Default)

The human sees and approves everything. Every proposal is presented with full before/after. Every score is shown. Every apply is confirmed.

**When to use:** First cycle, unfamiliar domains, after any regression, after rubric changes.

### Supervisor

The human sees summaries and handles escalations. LOW and MEDIUM proposals are auto-approved. HIGH proposals require review. Score summaries show deltas, not full breakdowns.

**When to use:** After 2+ cycles of high approval rate with no modifications. The human has validated the direction and the AI's proposals consistently align.

### Director

The human defines criteria and reviews the final result. All proposals are auto-approved with notification. Only regressions are escalated. The human trusts the rubric and the AI's judgment.

**When to use:** Low-risk domains with consistently high verification scores. Rare — most refinement sessions stay at Reviewer or Supervisor.

## Transition Rules

### Reviewer → Supervisor

**Trigger:** ALL of these must be true:
- At least 2 complete cycles in Reviewer mode
- Approval rate > 80% in each cycle
- Zero modifications (not just few — zero)
- No score regressions

**How to transition:** After Measure, before starting the next cycle:

```
Your approval rate has been 90%+ with no modifications for 2 cycles.
I can handle LOW/MEDIUM proposals automatically and only show you HIGH-severity changes.

[Switch to Supervisor (Recommended)] [Stay as Reviewer]
```

Always ask. Never auto-transition without confirmation.

### Supervisor → Director

**Trigger:** ALL of:
- At least 1 cycle in Supervisor mode
- Domain is low-risk (not: security config, production infrastructure, compliance docs)
- Verification confidence scores consistently > 8.0
- No escalated proposals were rejected

**How to transition:** Same pattern — ask, don't auto-transition.

### Pullback (Any → Reviewer)

**Trigger:** ANY of:
- Human says "review" or "show me everything"
- Human rejects an auto-approved proposal
- Score regresses by more than 1.0
- Rubric changes

**How to handle:** Immediately drop to Reviewer for the current cycle. Show everything. Do not ask "are you sure?" — just do it.

## Per-Phase Behavior Matrix

### Discover

| Reviewer | Supervisor | Director |
|---|---|---|
| Full issue list with severity | Summary: "12 issues (3 HIGH, 5 MEDIUM, 4 LOW)" | Only if regression: "Score dropped — 2 new HIGH issues" |
| All pre-check results | Only FAIL/WARN | Only FAIL |
| Full rubric scores | Score delta from last cycle | Silent unless regression |

### Analyze

| Reviewer | Supervisor | Director |
|---|---|---|
| All proposals with before/after | Proposal summary table (no before/after for LOW/MEDIUM) | "8 proposals generated" |
| Full severity and impact | Severity counts | Count only |

### Verify

| Reviewer | Supervisor | Director |
|---|---|---|
| All perspective results per proposal | Only concerns (confidence < threshold) | Silent |
| Confidence scores shown | Only flagged proposals | Nothing shown |

### Approve

| Reviewer | Supervisor | Director |
|---|---|---|
| Review everything via AskUserQuestion | Auto-approve LOW/MEDIUM, prompt for HIGH | Auto-approve all, show notification |
| Full before/after for each | Before/after for HIGH only | One-line summary |
| Context capture on all decisions | Context capture on HIGH decisions | Context capture if human intervenes |

### Apply

| Reviewer | Supervisor | Director |
|---|---|---|
| Confirm before applying | Automatic | Automatic |
| Full success/failure report | Summary | Only failures |

### Measure

| Reviewer | Supervisor | Director |
|---|---|---|
| Full per-dimension scores with deltas | Delta summary: "+1.2 average" | Only if regression |
| Convergence analysis | Convergence status | Only if not converging |

## The Pullback Mechanism

At every phase where the human would be skipped (Supervisor or Director mode), show a one-line pullback option:

```
[Cycle 3 — 8 proposals auto-approved, 1 escalated] Type "review" to see everything.
```

This serves two purposes:
1. **Transparency:** The human knows work is happening even when they're not reviewing
2. **Easy override:** One word to pull back to full review

## Domain-Dependent Overrides

Some domains should never advance beyond Reviewer regardless of alignment:

| Domain | Max Role | Why |
|---|---|---|
| Security configurations | Reviewer | Every change must be human-verified |
| Compliance documents | Reviewer | Legal/regulatory requirements |
| Production infrastructure | Reviewer | Risk too high for auto-approve |
| Educational content where engagement IS the goal | Reviewer | Human review is the learning mechanism |

Detection: If the target file is in a security/compliance/infrastructure path, or the rubric includes "Information Safety" or "Compliance" dimensions, cap at Reviewer and explain why.

## Interaction With Config

The `progressive_autonomy` config flag (default: `true`) controls whether role transitions are offered. When `false`:
- Stay at Reviewer for the entire session
- Never offer transitions
- Graduated auto-approve rules (from config) still apply — they're a separate mechanism

When both progressive autonomy and graduated auto-approve are active, the more permissive rule wins. For example, if the role is Reviewer but auto-approve is configured for LOW severity, LOW proposals are auto-approved even in Reviewer mode.
