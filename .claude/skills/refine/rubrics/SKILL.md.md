---
target: .claude/skills/refine/SKILL.md
audience: AI agent
created: 2026-04-06
last_used: 2026-04-06
last_session_cycles: 3
---

| Dimension | 0 (worst) | 5 (acceptable) | 10 (best) |
|---|---|---|---|
| Unambiguity | Prose-heavy, subjective language, no decision tables | Mostly clear, some room for interpretation | Every instruction resolves to single interpretation, decision tables for all branching |
| Completeness | Major phases missing, no edge cases | Core flow covered, gaps in edge cases | Every phase, edge case, and decision path documented |
| Phase Sequencing | Phases listed with no transition logic | Transitions implied by ordering | Explicit entry/exit conditions, deterministic state machine |
| Error Recovery | No error handling | Generic error table | Per-phase error scenarios with fallback chains |
| Tool Usage Specificity | References tools by concept only | Tool names with some parameters | Exact tool names, parameters, and invocation patterns |
| Human Interaction Design | "Ask the user" with no format | Some AskUserQuestion examples | Every touchpoint with exact prompt format and options |
| Structural Efficiency | Massive duplication, bloated | Some overlap between inline and references | Each concept once, references for details, no redundancy |

## Known Context
- [factual] Structural Efficiency stalls at 7.0 with inline fixes — needs reference-doc extraction (Codex evaluator spawning, Report Generation details) to break through
- [factual] Adding edge-case handling increases evaluator surface area, keeping scores flat — "completeness paradox"
- [constraint] Tool Usage Specificity and Human Interaction Design saturated at 9.0 — drop from active evaluation in future sessions

## Score History
| Date | Unambiguity | Completeness | Phase Seq | Error Recovery | Tool Usage | Human Interaction | Structural Eff | Avg | Cycles |
|---|---|---|---|---|---|---|---|---|---|
| 2026-04-06 | 7→8 | 8→8 | 8→9 | 6.5→7 | 5→8 | 8.5→9 | 8→8 | 7.1→8.1 | 2 |
| 2026-04-06 | 8→7.5 | 8.5→8 | 7.5→8 | 8→7 | 8→9 | 9→9 | 7→7 | 8.0→7.9 | 3 |
