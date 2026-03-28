# Eval Layers

> The 4-layer testing system for skill quality. Each layer catches different kinds of issues.

## Layer Summary

| Layer | Name | Speed | Deterministic? | What it catches | When to run |
|---|---|---|---|---|---|
| 1 | Structural | Instant | Yes | Metadata errors, broken links, missing sections | Every review |
| 2 | Golden Dataset | Seconds | Yes | Regressions, decision logic errors, format violations | Every review + test |
| 3 | LLM-as-Judge | Minutes | Semi (run 3x, majority vote) | Subjective quality: actionability, clarity, completeness | After Layer 2 passes |
| 4 | Exploratory | Minutes | No | Unknown unknowns, new edge cases, spec gaps | After major changes only |

## Layer 1: Structural Validation

**Tool:** `node scripts/validate-skill.mjs <path>`

Checks metadata format, file structure, reference links, decision table presence, safety hooks. Binary PASS/FAIL.

**When it fails:** Fix the structural issue before proceeding. These are objective errors.

## Layer 2: Golden Dataset

**Tool:** YAML fixtures at `<skill>/tests/eval.yaml`, checked by eval runner or inline assertions

Property-based assertions against agent output: `contains`, `regex`, `not-contains`, `decision-trace`. Each assertion is binary. A case passes when ALL its assertions pass.

**When it fails:** Either the skill has a real bug, or the test case is outdated. Check both — update the fixture if the skill's behavior intentionally changed.

**How to add cases:** After fixing a bug, add a regression case. After exploratory testing (Layer 4), convert findings into specific assertions. See FIXTURE_FORMAT.md.

## Layer 3: LLM-as-Judge

**Tool:** Rubric prompts from JUDGE_RUBRICS.md, evaluated by spawning a judge agent

Evaluates subjective quality that can't be string-matched: "Is this review actionable?", "Does this scenario actually test what it claims?" Uses binary PASS/FAIL verdicts with chain-of-thought reasoning.

**Handling non-determinism:** Run each rubric 3 times with fresh context. Majority vote (2/3) determines final verdict. This absorbs the variance from different LLM interpretations.

**When it fails:** Read the judge's reasoning. If the judge is wrong, adjust the rubric. If the skill is genuinely unclear, fix the skill.

## Layer 4: Exploratory

**Tool:** Fresh-context agents with open-ended prompts (current Mode 2 behavior)

Discovers unknown issues — ambiguities, gaps, edge cases the golden dataset doesn't cover. Results are NOT a quality gate — they're input for creating new Layer 2 cases.

**When to run:** After major skill rewrites. Not on every test cycle.

**After running:** Review findings. Convert real issues into:
- Layer 1 checks (if structural)
- Layer 2 cases (if deterministic)
- Layer 3 rubrics (if subjective)
- Discard if not reproducible or not actionable

## Running Layers

```
/skill-dev test <skill>              # Layers 1 + 2 + 3
/skill-dev test <skill> --layer 2    # Layer 2 only (fast)
/skill-dev test <skill> --explore    # Layer 4 (discovery)
/skill-dev test <skill> --full       # All 4 layers
```

## Quality Gates

| Context | Required layers | Pass criteria |
|---|---|---|
| Quick check during development | Layer 1 | PASS |
| Before shipping a skill fix | Layers 1 + 2 | All cases PASS |
| Before shipping a new skill | Layers 1 + 2 + 3 | All cases PASS, judge 2/3 majority |
| After major rewrite | All 4 layers | Layers 1-3 pass, Layer 4 findings reviewed |
