# Execution Guide

## Execution Modes

### Mode A: Manual (human-driven)

Run each phase in a fresh Claude Code conversation:

1. Open a new chat
2. Say: "Execute the plan at `docs/implementation-plan/skill-dev-layered-testing/<NN-phase>.md`"
3. Wait for completion and verification
4. Commit the result
5. Repeat for the next phase

### Mode B: Automated (orchestrator agent)

```
/implement execute docs/implementation-plan/skill-dev-layered-testing
```

The orchestrator reads the overview and this guide, then spawns sub-agents per phase.

## Phase Execution Order

| Phase | Prompt File | Model | Dependencies | Can Parallelize With |
|-------|------------|-------|--------------|---------------------|
| 01 | `01-enhanced-validator.md` | sonnet | — | 02 |
| 02 | `02-test-fixture-format.md` | sonnet | — | 01 |
| 03 | `03-eval-runner.md` | opus | 02 | 04 |
| 04 | `04-llm-judge-templates.md` | sonnet | — | 03 |
| 05 | `05-skill-rewrite.md` | opus | 01, 02, 03, 04 | — |

## Dependency Graph

```
01 (validator) ──────────────────────┐
       │                              │
       │ (parallel)                   │
       │                              ▼
02 (fixtures) ──► 03 (eval runner) ──► 05 (SKILL.md rewrite)
                        │              ▲
                        │ (parallel)   │
                        │              │
04 (judge rubrics) ─────┘─────────────┘
```

## Recommended Execution for Maximum Parallelism

**Step 1:** Phase 01 + Phase 02 + Phase 04 (all independent — parallel)
**Step 2:** Phase 03 (depends on Phase 02 for fixture format)
**Step 3:** Phase 05 (depends on all previous phases)

Total: 3 sequential steps with parallelism in step 1.

## Constraints

- Fresh context per phase
- Commit after each phase
- Verification must pass before dependent phases
- No skipping phases
- Phase 05 must read outputs from all prior phases to integrate correctly

## Model Selection Guide

| Phase | Model | Reason |
|-------|-------|--------|
| 01 | sonnet | Straightforward script enhancement — adding functions to existing code |
| 02 | sonnet | YAML file creation and reference doc writing — no complex logic |
| 03 | opus | Eval runner has nuanced assertion logic and needs to handle edge cases |
| 04 | sonnet | Reference doc creation — clear structure, no code |
| 05 | opus | Integrating all layers into SKILL.md requires understanding the full system |

## Environment Setup

Prerequisites before running any phase:
- Node.js available (for running validate-skill.mjs and run-eval.mjs)
- Git repo is clean (all prior work committed)
- On branch `feat/skill-dev-layered-testing`

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| validate-skill.mjs crashes | New check function has a bug | Read the error, fix the specific function, re-run |
| YAML parse error in eval.yaml | Invalid YAML syntax | Check indentation, quote special chars, validate with online tool |
| Phase 05 SKILL.md over 500 lines | Too much detail inline | Move layer descriptions to EVAL_LAYERS.md reference doc, keep SKILL.md concise |
| Eval runner can't find fixtures | Wrong path resolution | Check SKILLS_DIR constant in run-eval.mjs, ensure relative paths are correct |
| Judge rubric produces inconsistent results | Rubric criteria too vague | Add more specific PASS/FAIL conditions, test on known-good/bad outputs |
