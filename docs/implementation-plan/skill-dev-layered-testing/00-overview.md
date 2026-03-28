# Phase 0 — Overview

## Project Summary

The current skill-dev test mode (Mode 2) uses a single approach: spawn fresh LLM agents that read a skill and report ambiguities. This is effective for discovery but produces different results every run — the same skill tested twice surfaces different issues each time. There's no way to know when a skill is "done" being tested.

This project redesigns Mode 2 into a **4-layer testing system** based on industry best practices (Anthropic's eval guide, promptfoo, LLM-as-judge patterns). Each layer serves a different purpose, from fast deterministic checks to slow exploratory discovery. The key insight: **separate finding bugs from verifying fixes**.

## Architecture Overview

```
Layer 1: Structural (deterministic, instant)
  validate-skill.mjs → PASS/FAIL
  Existing script, enhanced with new checks
       │
       ▼
Layer 2: Golden Dataset (deterministic, seconds)
  YAML test cases → property assertions → PASS/FAIL per case
  New: eval runner script + per-skill test fixtures
       │
       ▼
Layer 3: LLM-as-Judge (semi-deterministic, minutes)
  Rubric assertions → scored PASS/FAIL → threshold gate
  New: judge prompt templates + scoring logic
       │
       ▼
Layer 4: Exploratory (non-deterministic, discovery only)
  Fresh agents → open-ended findings → new Layer 2 cases
  Existing Mode 2, reframed as discovery tool
```

## Key Decisions & Assumptions

1. **YAML for test cases** — Test fixtures are defined in YAML (like promptfoo) because they're readable, diffable, and don't require code. Each skill gets a `tests/` directory with fixture files.
2. **Node.js for eval runner** — Matches the existing `validate-skill.mjs` pattern. No new runtime dependencies.
3. **LLM-as-judge uses Claude itself** — The same model running skill-dev evaluates quality via rubric prompts. No external API needed.
4. **Layer 4 stays as-is** — The current exploratory mode works well for discovery. We just reframe it and add a step: "convert findings to Layer 2 test cases."
5. **Backward compatible** — Existing `/skill-dev test <skill>` still works. New layers are additive.
6. **No external dependencies** — Everything runs with Node.js + the tools already available in Claude Code (Read, Glob, Grep, Agent, Bash).

## Phase Dependency Graph

```
Phase 01 ─────────────────────────────────┐
(Enhanced validator)                       │
                                           ▼
Phase 02 ──────────► Phase 03 ──────► Phase 05
(Test fixture        (Eval runner     (SKILL.md rewrite)
 format + golden      script)
 datasets)                │
                          ▼
                     Phase 04
                     (LLM-as-judge
                      templates)
```

## Phase Summary

| Phase | Title | Description |
|-------|-------|-------------|
| 01 | Enhanced structural validator | Add new checks to validate-skill.mjs: decision table coverage, referenced file existence, gotchas section, transition logic |
| 02 | Test fixture format and golden datasets | Define YAML test case format, create golden datasets for 3 skills (commit, onboard, skill-dev) |
| 03 | Eval runner script | Build `run-eval.mjs` that loads fixtures, spawns agents or runs assertions, scores results |
| 04 | LLM-as-judge templates | Create rubric prompts for subjective quality checks (actionability, completeness, clarity) |
| 05 | SKILL.md rewrite | Update skill-dev Mode 2 to use 4-layer system, update reference docs, add new argument syntax |

## Change Inventory

### Scripts
| Category | Files |
|----------|-------|
| Enhanced | `skills/skill-dev/scripts/validate-skill.mjs` |
| New | `skills/skill-dev/scripts/run-eval.mjs` |

### Reference Docs
| Category | Files |
|----------|-------|
| New | `skills/skill-dev/references/EVAL_LAYERS.md` |
| New | `skills/skill-dev/references/FIXTURE_FORMAT.md` |
| New | `skills/skill-dev/references/JUDGE_RUBRICS.md` |
| Updated | `skills/skill-dev/references/TEST_PROTOCOL.md` |
| Updated | `skills/skill-dev/references/REPORT_FORMAT.md` |

### Test Fixtures (new — one per skill)
| Category | Files |
|----------|-------|
| New | `skills/commit/tests/eval.yaml` |
| New | `skills/onboard/tests/eval.yaml` |
| New | `skills/skill-dev/tests/eval.yaml` |
| New | `skills/task/tests/eval.yaml` |
| New | `skills/implement/tests/eval.yaml` |
| New | `skills/fact-check/tests/eval.yaml` |
| New | `skills/retrospective/tests/eval.yaml` |
| New | `skills/review-thread/tests/eval.yaml` |

### Skill Definition
| Category | Files |
|----------|-------|
| Updated | `skills/skill-dev/SKILL.md` |

## Verification Strategy

| Tier | Command | When |
|------|---------|------|
| Script runs | `node scripts/validate-skill.mjs <path>` | After Phase 01 |
| Fixture validation | `node scripts/run-eval.mjs --skill commit --layer 2 --dry-run` | After Phase 03 |
| Full eval | `node scripts/run-eval.mjs --skill commit` | After Phase 05 |
| Manual test | `/skill-dev test commit` in fresh session | After Phase 05 |
