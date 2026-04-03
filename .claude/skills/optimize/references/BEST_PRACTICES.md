# Best Practices

Lessons learned from real optimization cycles. Follow these to get better results faster.

## Do

1. **Optimize one file at a time.** Narrow scope produces better proposals and clearer measurements.

2. **Define metrics before starting.** Know what "better" means before you optimize. Use the rubric to make it concrete.

3. **Start with discover.** Always establish a baseline before generating proposals. Skipping this makes measurement meaningless.

4. **Preserve backwards compatibility.** Never break what already works. The Conservative persona catches this — use `--verify` when in doubt.

5. **Stop when convergence is reached.** When discover finds 0 HIGH or MEDIUM severity issues, you're done. LOW-severity issues do not block convergence. Continuing past this point wastes time with diminishing returns.

6. **Use human approval.** The approval gate is a feature, not a bottleneck. Domain expertise catches things LLMs miss.

7. **One clear commit per change.** Makes it easy to revert a single proposal without losing others.

8. **Give enough context.** The more context the LLM has about your codebase and users, the better the proposals.

9. **Regression test after each cycle.** Always verify that previous improvements weren't undone by new changes.

## Don't

1. **Don't approve everything blindly.** Review each proposal. Modify when close but not quite right — don't just accept or reject.

2. **Don't let scope creep.** If new issues appear outside your target, note them for a separate cycle.

3. **Don't skip testing.** Even docs-only changes should be re-evaluated against the rubric.

4. **Don't optimize the wrong metric.** Clarity and actionability matter more than word count or formatting.

5. **Don't use `--auto-approve` for production content.** It's there for experimentation, not for real work.

## When Optimization Works Best

Optimization excels on **deterministic systems** — things with clear right/wrong answers:
- Documentation (clarity, completeness)
- Error messages (actionability)
- Validation rules (coverage)
- Configuration docs (accuracy)
- Code comments (relevance, accuracy)

## When Optimization Doesn't Work

Skip optimization for:
- **New features** — Nothing to optimize yet; build first
- **Subjective design** — Visual design, UX flows, naming preferences
- **Unknown unknowns** — If you don't know what's wrong, start with user research, not optimization
- **Highly coupled systems** — Where changing one thing breaks many others; refactor first

## Typical Results

| Domain | Starting Score | Final Score | Cycles | Time |
|---|---|---|---|---|
| Error messages | 2/10 | 6–7/10 | 1–2 | 20–30 min |
| README / docs | 5/10 | 8–9/10 | 1–2 | 30 min |
| Code comments | 2/10 | 7/10 | 1–2 | 30 min |
| Help text | 3/10 | 7/10 | 1 | 20 min |
| Validation rules | 4/10 | 8/10 | 2–3 | 45 min |

## Convergence Pattern

Issues typically decline geometrically per cycle:
```
Cycle 1: 12 issues → fix 6 → 6 remaining
Cycle 2: 6 issues  → fix 4 → 2 remaining
Cycle 3: 2 issues  → fix 2 → 0 remaining (convergence)
```

Most domains converge in 2–3 cycles. If you're past 4 cycles without convergence, the rubric may be too strict or the target may need restructuring rather than optimization.
