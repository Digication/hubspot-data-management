# Phase 04 — LLM-as-Judge Templates

You are creating the LLM-as-judge rubric templates for Layer 3 of the skill-dev testing system in the claude-blueprint project.

**Context:** Phase 02 created YAML fixtures with `llm-rubric` assertion types. Phase 03 built the eval runner that handles deterministic assertions (Layer 2) and marks `llm-rubric` as skipped. This phase creates the judge prompt templates that evaluate subjective quality — things like "is this review actionable?" that can't be checked with string matching.

## Overview

- Create `JUDGE_RUBRICS.md` reference doc with rubric prompt templates
- Create `EVAL_LAYERS.md` reference doc explaining the full 4-layer system
- Define 3 judge rubrics: Review Quality, Test Scenario Quality, Error Message Quality
- Each rubric produces a binary PASS/FAIL verdict (not a score) — per best practice from Anthropic's eval guide
- Judge uses chain-of-thought reasoning before verdict

## Steps

### 1. Create the eval layers reference doc

**Files to create:** `.claude/skills/skill-dev/references/EVAL_LAYERS.md`

```markdown
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

**Handling non-determinism:** Run each rubric 3 times with fresh context. Majority vote wins (2/3 must pass). This absorbs the variance from different LLM interpretations.

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
```

### 2. Create the judge rubrics reference doc

**Files to create:** `.claude/skills/skill-dev/references/JUDGE_RUBRICS.md`

```markdown
# LLM-as-Judge Rubrics

> Prompt templates for Layer 3 evaluation. Each rubric produces a binary PASS/FAIL with reasoning.

## Judge Protocol

For each `llm-rubric` assertion in a test fixture:

1. Spawn a fresh-context agent with the judge prompt below
2. Provide the agent output being evaluated
3. Agent produces: `REASONING: ...` then `VERDICT: PASS` or `VERDICT: FAIL`
4. Run 3 times. Majority vote (2/3) determines final verdict.

**Judge agent tools:** Read only (Read, Glob, Grep) — judge must not modify anything.

## Rubric Templates

### Review Quality

Use when evaluating the output of Mode 1 (Review).

```
You are evaluating the quality of a skill review report.

## Review Output to Evaluate
{agent_output}

## Skill Being Reviewed
{skill_path}

## Evaluation Criteria

Rate this review as PASS or FAIL based on ALL of the following:

1. **Actionability**: Every issue listed must include enough detail to fix it
   - FAIL if any issue says "could be improved" without saying how
   - FAIL if issues reference line numbers that don't exist
   - PASS if each issue specifies what to change and where

2. **Completeness**: Review must cover all CHECKLIST.md categories that apply
   - FAIL if metadata, structure, or effectiveness sections are missing
   - PASS if all applicable categories are addressed (N/A categories noted)

3. **Accuracy**: Findings must be correct
   - FAIL if the review flags something that isn't actually a problem
   - FAIL if the review misses a clear violation (bare Bash, missing hooks)
   - PASS if all findings are verifiable against the skill file

4. **Severity calibration**: Issues must be correctly categorized
   - FAIL if a blocking issue is listed as "nice to have"
   - FAIL if a style preference is listed as "critical"
   - PASS if severity matches the definitions in REPORT_FORMAT.md

## Output Format

REASONING: [2-3 sentences explaining your assessment for each criterion]
VERDICT: PASS or FAIL
```

### Test Scenario Quality

Use when evaluating the output of Mode 2 (Test) scenario design.

```
You are evaluating the quality of test scenarios designed for a skill.

## Scenarios to Evaluate
{scenario_table}

## Skill Being Tested
{skill_path}

## Evaluation Criteria

Rate this scenario set as PASS or FAIL:

1. **Coverage**: Scenarios must cover all decision table rows
   - Count the decision table rows in the skill
   - Check each row is hit by at least one scenario
   - FAIL if any decision table row has zero coverage

2. **Independence**: Each scenario must test a distinct path
   - FAIL if two scenarios test the same decision branch with similar inputs
   - PASS if each scenario exercises a unique combination

3. **Specificity**: Inputs must be exact, not vague
   - FAIL if any input says "choose a typical value" or "any valid input"
   - PASS if every input is a concrete value

4. **Category balance**: Must include at least one from: happy-path, boundary, override
   - FAIL if all scenarios are happy-path
   - PASS if at least 3 categories represented

## Output Format

REASONING: [Assessment per criterion, noting specific scenarios]
VERDICT: PASS or FAIL
```

### Error Message Quality

Use when evaluating error handling output (validation failures, edge cases).

```
You are evaluating the quality of an error message produced by a skill.

## Error Output to Evaluate
{agent_output}

## Context
{what_triggered_the_error}

## Evaluation Criteria

1. **Clarity**: A non-technical user can understand what went wrong
   - FAIL if the message contains unexplained jargon
   - FAIL if the message is a raw stack trace
   - PASS if the message says what happened in plain language

2. **Actionability**: The message tells the user what to do next
   - FAIL if the message only says what's wrong without offering a fix
   - PASS if it suggests concrete next steps

3. **Completeness**: The message provides necessary context
   - FAIL if it references information the user can't see
   - PASS if all referenced items (skills list, options, paths) are shown

## Output Format

REASONING: [Assessment per criterion]
VERDICT: PASS or FAIL
```

## Adding New Rubrics

When Layer 4 (Exploratory) finds a subjective quality issue that can't be captured with deterministic assertions:

1. Write a rubric that captures the quality criterion
2. Include specific PASS/FAIL conditions (not vague "is it good?")
3. Test the rubric 3 times on a known-good and known-bad output
4. If it produces consistent results (3/3 agree), add it to this file
5. Add a corresponding `llm-rubric` assertion to the skill's eval.yaml
```

## Verification

```bash
# Check files exist
ls -la .claude/skills/skill-dev/references/EVAL_LAYERS.md
ls -la .claude/skills/skill-dev/references/JUDGE_RUBRICS.md

# Verify markdown formatting
head -5 .claude/skills/skill-dev/references/EVAL_LAYERS.md
head -5 .claude/skills/skill-dev/references/JUDGE_RUBRICS.md
```

Expected: Both reference docs created, valid markdown, rubrics include specific PASS/FAIL criteria.

## When done

Report: files created (EVAL_LAYERS.md, JUDGE_RUBRICS.md), number of rubrics defined, and any design decisions about judge protocol.
