# LLM-as-Judge Rubrics

> Prompt templates for Layer 3 evaluation. Each rubric produces a binary PASS/FAIL with reasoning.

## Judge Protocol

For each `llm-rubric` assertion in a test fixture:

1. Spawn a fresh-context judge agent using the judge prompt template from [TEST_PROTOCOL.md](TEST_PROTOCOL.md) — include the pre-loaded `skill_content_block` (same as Layer 2 agents) and the agent output being evaluated
2. Agent produces: `REASONING: ...` then `VERDICT: PASS` or `VERDICT: FAIL`
3. **2+1 majority vote:** Run 2 judges in parallel. If they agree → verdict is final. If they disagree → spawn a 3rd as tiebreaker. This saves ~33% of judge runs vs. always running 3.

**Judge agent tools:** Read only (Read, Glob, Grep) — judge must not modify anything. Judges should NOT re-read the skill files — they are provided in the prompt via `skill_content_block`.

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
