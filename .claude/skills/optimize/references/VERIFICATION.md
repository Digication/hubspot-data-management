# Multi-LLM Verification

Optional verification layer that validates proposals before human approval. Uses three personas to catch different types of problems.

## How It Works

1. Each proposal is evaluated by three independent "personas" (different analysis perspectives)
2. Each persona scores the proposal and flags concerns
3. Results are synthesized into a single confidence score (0–10)
4. The confidence score helps the human decide: approve, reject, or modify

## Personas

### Devil's Advocate
**Focus:** What could go wrong?
- Looks for flaws, edge cases, unintended consequences
- Asks: "What happens if this change interacts badly with X?"
- Flags: Contradictions, ambiguities, missing edge cases

### Conservative
**Focus:** Could this break anything?
- Checks for regressions, backwards compatibility, safety
- Asks: "Is this change safe to apply without risk?"
- Flags: Breaking changes, scope creep, untested assumptions

### Pragmatist
**Focus:** Is this worth doing?
- Evaluates effort vs. impact, feasibility, ROI
- Asks: "Does the improvement justify the change?"
- Flags: Over-engineering, low-value changes, better alternatives

## Confidence Score

The synthesis step combines all three persona scores:

| Score | Label | Meaning |
|---|---|---|
| 8.0–10.0 | HIGH CONFIDENCE | All personas agree — safe to approve |
| 5.0–7.9 | MODERATE | Some concerns — review carefully |
| 0.0–4.9 | LOW CONFIDENCE | Significant issues — consider rejecting or modifying |

## When to Use Verification

| Scenario | Recommendation |
|---|---|
| Documentation-only changes | Optional — low risk, verification adds time |
| Code changes | Recommended — catches regressions |
| Production-facing content | Recommended — catches user-facing issues |
| Quick experiments / prototyping | Skip — speed matters more |

## Verification Output Example

```
PROPOSAL: Add Docker prerequisites to README

DEVIL'S ADVOCATE REVIEW
- Issues found: 0
- Severity: None
- Recommendation: ✅ No critical flaws

CONSERVATIVE REVIEW
- Risk level: Minimal (docs only)
- Backwards compatible: Yes
- Recommendation: ✅ Safe to apply

PRAGMATIST REVIEW
- Effort: 5 minutes
- ROI: High (saves users 20 minutes each)
- Feasibility: Easy
- Recommendation: ✅ Worth doing

SYNTHESIS
- Confidence score: 8.7/10
- Recommendation: APPROVE_CONFIDENTLY
```

## Proposal Format Requirements

- Proposal text should be under 1000 tokens (~750 words max)
- Should describe a single improvement idea (not multiple)
- Format: Plain text description of what should change

## Parameters

- `--verify` — Enable verification on the approve step
- `--persona=devil_advocate` — Run a single persona only
- `--all-personas` — Run all three (default when `--verify` is used)
- `--personas=devil_advocate,conservative` — Run specific subset

## Standalone Usage

Verify can also be used independently (outside the approve flow):

```
/optimize verify --proposal="Add Docker prerequisites to README"
/optimize verify --proposals=proposals.txt
/optimize verify --persona=devil_advocate
```
