# Multi-LLM Verification

Optional verification layer that validates proposals before human approval. Uses three personas to catch different types of problems.

## How It Works

1. Each proposal is evaluated by three independent "personas" (different analysis perspectives)
2. Each persona scores the proposal and flags concerns
3. Results are synthesized into a single confidence score (0-10)
4. The confidence score helps the human decide: approve, reject, or modify

## Implementation

Run all three personas in a **single prompt** within the main conversation model (no subagent needed). Structure the prompt as follows:

1. Provide the proposal text and the target file context
2. Instruct the model to evaluate the proposal from each persona's perspective **in sequence**, producing a separate section per persona with:
   - A score (0-10)
   - A list of concerns (or "none")
   - A one-line recommendation (approve / caution / reject)
3. After all three persona sections, instruct the model to produce a **Synthesis** section that averages the three scores and resolves any conflicting recommendations

**Why one prompt, not three calls:** The personas are analysis lenses, not independent agents. A single call is faster, cheaper, and avoids context duplication. Three separate calls are acceptable if the user explicitly requests independent evaluation (e.g., "run each persona separately").

**Model:** Use the current conversation model. Verification is a lightweight review step — it does not need Opus.

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
| 8.0-10.0 | HIGH CONFIDENCE | All personas agree — safe to approve |
| 5.0-7.9 | MODERATE | Some concerns — review carefully |
| 0.0-4.9 | LOW CONFIDENCE | Significant issues — consider rejecting or modifying |

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
- Recommendation: No critical flaws

CONSERVATIVE REVIEW
- Risk level: Minimal (docs only)
- Backwards compatible: Yes
- Recommendation: Safe to apply

PRAGMATIST REVIEW
- Effort: 5 minutes
- ROI: High (saves users 20 minutes each)
- Feasibility: Easy
- Recommendation: Worth doing

SYNTHESIS
- Confidence score: 8.7/10
- Recommendation: APPROVE_CONFIDENTLY
```

## Proposal Format Requirements

- Proposal text should be under 1000 tokens (~750 words max)
- Should describe a single improvement idea (not multiple)
- Format: Plain text description of what should change

## How to Request Verification

Users can request verification conversationally at any point:
- "verify these proposals" — runs all three personas on the current proposals
- "run the devil's advocate check" — runs a single persona
- "get a second opinion on proposal 3" — runs verification on a specific proposal

By default, all three personas run. The user can ask for a specific subset.

## Standalone Usage

Verification can also be used independently (outside the full refinement loop). Examples of what a user might say:
- "verify this proposal: Add Docker prerequisites to README"
- "run a conservative review on my proposals"
- "check these proposals with the devil's advocate persona"
