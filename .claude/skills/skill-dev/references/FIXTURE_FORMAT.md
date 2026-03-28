# Test Fixture Format

> YAML format for Layer 2 (Golden Dataset) test cases. Each skill can have an `eval.yaml` file in its `tests/` directory.

## Structure

```yaml
# .claude/skills/<skill-name>/tests/eval.yaml

skill: <skill-name>
description: Golden dataset for <skill-name> skill
skill_hash: "a1b2c3d4..."  # MD5 of skill folder (excluding tests/) — auto-generated

# Test cases — each one is a specific scenario with deterministic assertions
cases:
  - name: "descriptive-kebab-case-name"
    description: "One sentence — what this tests and why"
    category: happy-path | boundary | override | freeform | idempotency | regression

    # Simulated inputs the agent receives
    inputs:
      command: "/skill-dev review commit"
      # Skill-specific input state
      state:
        key: value

    # Property assertions on the output (ALL must pass)
    assert:
      # Deterministic assertions (checked by eval runner script)
      - type: contains
        value: "expected substring in output"
      - type: not-contains
        value: "string that must NOT appear"
      - type: regex
        value: "pattern\\s+to\\s+match"
      - type: contains-all
        values:
          - "must contain this"
          - "and also this"
      - type: contains-any
        values:
          - "either this"
          - "or this"
      - type: decision-trace
        input: "skill-name = nonexistent"
        rule: "Skill Name Validation"
        result: "fail"

      # LLM-judge assertions (checked by Layer 3)
      - type: llm-rubric
        value: "The review report contains actionable recommendations with specific line references"
      - type: llm-rubric
        value: "The error message lists available skills and prompts the user to pick one"

    # Optional: source of this test case
    source: "Found during exploratory test on 2026-03-28, scenario invalid-skill-name"
```

## Assertion Types

### Deterministic (Layer 2)

| Type | Description | Example |
|---|---|---|
| `contains` | Output includes this substring | `"Skill 'foo' not found"` |
| `not-contains` | Output must NOT include this | `"undefined"`, `"error"` |
| `contains-all` | Output includes ALL of these substrings | `["Critical Issues", "Strengths"]` |
| `contains-any` | Output includes AT LEAST ONE | `["PASS", "PARTIAL"]` |
| `regex` | Output matches this regex pattern | `"Skill '.*' not found"` |
| `decision-trace` | Specific decision point produces expected result | See below |
| `exits-with` | Flow terminates at this point | `"validation-failure"` |

### LLM-Judge (Layer 3)

| Type | Description | Example |
|---|---|---|
| `llm-rubric` | LLM evaluates output against this criterion | `"Report is actionable"` |

### decision-trace Format

Tests a specific decision point in the skill's logic:

```yaml
- type: decision-trace
  input: "mode = review, skill = nonexistent"
  rule: "Skill Name Validation (lines 37-48)"
  result: "Show error message and list available skills"
```

The eval runner spawns a read-only agent that traces through the decision and reports Input → Rule → Result. The assertion checks that the result matches.

## Naming Conventions

- File: `tests/eval.yaml` inside each skill directory
- Case names: `kebab-case`, descriptive (e.g., `invalid-skill-name-shows-error`)
- Categories: one of `happy-path`, `boundary`, `override`, `freeform`, `idempotency`, `regression`

## When to Add New Cases

- **After fixing a bug**: Add a regression case so the bug stays fixed
- **After exploratory testing (Layer 4)**: Convert findings into specific assertions
- **After a user reports an issue**: Capture as a test case before fixing

## When NOT to Add Cases

- Don't test exact wording — test properties ("contains X", not "equals X")
- Don't test LLM style — only test structural/behavioral properties
- Don't duplicate what validate-skill.mjs already checks (Layer 1)

## Staleness Detection

Skills are living documents — when SKILL.md or reference files change, some test cases may break not because of bugs but because the expected output changed. The eval runner detects this automatically using **content hashing**.

Each fixture stores a `skill_hash` — an MD5 of all files in the skill directory (excluding `tests/` and `.plugin-data/`). At test time:

1. Eval runner computes the current hash of the skill folder
2. Compares it to the stored `skill_hash` in the fixture
3. If they match → skill hasn't changed, test failures are real regressions
4. If they differ → skill content changed since fixtures were written

**When hash mismatches:**

- **Hash differs + test fails** → flag as `POSSIBLY_STALE` instead of `FAIL`. Show:
  "Skill content changed (stored: a1b2..., current: c3d4...). Want to: (1) Update fixture, (2) Keep as-is (real bug), (3) Delete case"
- **Hash differs + tests pass** → tests still valid, but suggest updating the hash
- **Hash matches + test fails** → real `FAIL`. The skill has a regression.

After updating fixtures, recompute and store the new `skill_hash`. The eval runner can do this automatically with `--rehash`.

## Writing Resilient Assertions

Assertions should survive minor skill rewording. Choose the right type based on what you're testing:

| What you're testing | Best assertion type | Why |
|---|---|---|
| A decision path was taken | `decision-trace` | Tests logic, not wording — survives any rewording |
| Required content sections exist | `contains-all` with section headers | Headers change less than body text |
| User gets a choice | `contains-any` with multiple phrasings | `["Re-review", "review again", "redo the review"]` |
| Something must NOT happen | `not-contains` | Stable — absence is unambiguous |
| Subjective quality | `llm-rubric` (Layer 3) | LLM judges handle phrasing variation naturally |
| A specific bug was fixed | `contains` with exact string | Intentionally brittle — should break if the fix is reverted |

**Rule of thumb:** Use `decision-trace` for logic, `contains-any` for content, `llm-rubric` for quality. Reserve exact `contains` for regression tests where brittleness is the point.
