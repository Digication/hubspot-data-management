# Resonance

A theory of structured information exchange between humans and AI systems, and the domain-specific applications built on it.

## The Core Insight

Human cognition is optimized for verification, not generation. The most effective way to surface what a person knows is not to ask them, but to show them something concrete and let them react. Corrections carry far more information than unprompted answers.

This asymmetry defines how Resonance-based systems work: the AI proposes, the human reacts, and each reaction expands the available context for the next proposal. For example, a draft migration guide that incorrectly assumes "rollback is straightforward" triggers the engineer to explain two distinct recovery paths they wouldn't have volunteered unprompted. The loop compounds — more context leads to better proposals, which trigger richer reactions.

## The Five Principles

Detailed in [principles.md](principles.md):

1. **Show, Don't Ask** — Present concrete proposals to react to, not open-ended questions. Verification prompts ("is this right?") trigger deeper recall than generation prompts ("what do you want?").
2. **Iterate to Expand Context** — Each cycle improves the output AND expands available context. The second effect is more important than the first.
3. **Earn Autonomy Progressively** — Start with full human review, shift toward autonomy as alignment is demonstrated. Always revocable.
4. **Evaluate From Multiple Perspectives** — Independent perspectives catch different blind spots. Deliberation surfaces disagreement rather than averaging it away.
5. **Converge Toward Defined Quality** — Define "done" with rubrics before starting. Measurable dimensions, score anchors, and convergence criteria make the loop systematic.

## Domain Applications

Resonance manifests differently in different domains, but the core mechanism is the same: show something concrete, capture the reaction, iterate.

### [Refine](refine/) — Artifact Creation and Improvement

Applies Resonance to documents, code, specifications, and structured content. The loop creates and improves artifacts through rubric-driven cycles.

- [Concept](refine/concept.md) — Theory, implementation spec, and the full phase-by-phase breakdown
- [How It Works](refine/how-it-works.md) — Practical guide with step-by-step scenarios from the user's perspective
- [Use Cases](refine/use-cases.md) — Concrete walkthroughs: README improvement, migration guides, error message sweeps, and more

**Implemented as:** the [`/refine` skill](../../.claude/skills/refine/SKILL.md) in Claude Code. The skill is a direct implementation of the concepts in this directory.

### [Assess](assess/) — Evaluation and Assessment

Applies Resonance to human evaluation processes — competency assessment, portfolio review, student work evaluation.

- [Concept](assess/concept.md) — How the loop structures assessment, ensures consistency, and produces evidence-based feedback
- [Use Cases](assess/use-cases.md) — Assessment scenarios and walkthroughs

*Not yet implemented as a skill — the concepts are documented for future development.*

## The Hierarchy

```
Resonance Principles (principles.md)
  |
  |-- Refine -- artifacts: creation and improvement
  |
  |-- Assess -- evaluation: competency, portfolios, student work
  |
  +-- (future siblings as the principles are validated in new domains)
```

Refine and Assess are siblings, not parent and child. They share the five principles but have different loops, different constraints, and different domain-specific machinery.

## What Resonance Is Not

- **Not a replacement for human judgment.** It structures information exchange, not decision-making.
- **Not universally applicable.** Highly creative work, real-time physical tasks, and purely subjective evaluations resist rubric-driven approaches.
- **Not a guarantee of complete extraction.** It improves retrieval of human knowledge, not creation of it.
- **Not a fixed process.** The five principles are design guidelines, not a rigid methodology. Different domains implement them with different loops and constraints.
