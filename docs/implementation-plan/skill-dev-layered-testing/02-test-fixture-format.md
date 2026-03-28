# Phase 02 — Test Fixture Format and Golden Datasets

You are creating the test fixture format and initial golden datasets for the skill-dev testing system in the claude-blueprint project.

**Context:** Phase 01 enhanced the structural validator with new deterministic checks. This phase defines the YAML format for Layer 2 (Golden Dataset) test cases and creates initial fixtures for 3 skills. These fixtures contain specific input/output assertions that produce the same results every run — unlike the current exploratory approach.

## Overview

- Define the YAML test fixture format (inspired by promptfoo but adapted for skill testing)
- Create a reference doc explaining the format (`FIXTURE_FORMAT.md`)
- Write golden dataset fixtures for `commit`, `onboard`, and `skill-dev` skills
- Each fixture captures real bugs found during previous exploratory testing

## Steps

### 1. Create the fixture format reference doc

**Files to create:** `.claude/skills/skill-dev/references/FIXTURE_FORMAT.md`

```markdown
# Test Fixture Format

> YAML format for Layer 2 (Golden Dataset) test cases. Each skill can have an `eval.yaml` file in its `tests/` directory.

## Structure

```yaml
# .claude/skills/<skill-name>/tests/eval.yaml

skill: <skill-name>
description: Golden dataset for <skill-name> skill

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
```

### 2. Create golden dataset for `commit` skill

**Files to create:** `.claude/skills/commit/tests/eval.yaml`

```yaml
skill: commit
description: Golden dataset for commit skill — regression tests from exploratory testing

cases:
  - name: "clean-tree-stops-early"
    description: "When working tree is clean, skill should stop and tell the user"
    category: boundary
    inputs:
      command: "/commit"
      state:
        git_status: "clean"
    assert:
      - type: contains-any
        values:
          - "clean"
          - "no changes"
          - "nothing to commit"
      - type: not-contains
        value: "commit type"
    source: "Exploratory test 2026-03-28, scenario boundary-no-changes"

  - name: "conventional-commit-format"
    description: "Generated commit message follows Conventional Commits format"
    category: happy-path
    inputs:
      command: "/commit"
      state:
        git_status: "modified: src/auth.js"
        git_diff: "Added login() function"
        git_log: "feat(ui): add dashboard\nfix(api): handle null response"
    assert:
      - type: regex
        value: "^(feat|fix|refactor|docs|test|chore|perf|build|ci|style|revert)"
      - type: contains
        value: ":"
      - type: not-contains
        value: "."
    source: "Exploratory test 2026-03-28, scenario happy-path-single-feature"

  - name: "user-approval-before-commit"
    description: "Skill must ask for user approval before staging and committing"
    category: happy-path
    inputs:
      command: "/commit"
      state:
        git_status: "modified: src/auth.js"
    assert:
      - type: contains-any
        values:
          - "approval"
          - "approve"
          - "confirm"
          - "look good"
          - "proceed"
    source: "SKILL.md step 9 requires approval gate"

  - name: "scope-inference-from-files"
    description: "Commit scope should be inferred from changed file paths"
    category: happy-path
    inputs:
      command: "/commit"
      state:
        git_status: "modified: src/auth/login.js\nmodified: src/auth/logout.js"
    assert:
      - type: regex
        value: "\\(auth\\)"
    source: "SKILL.md step 1 — infer scope from changed files"
```

### 3. Create golden dataset for `skill-dev` skill

**Files to create:** `.claude/skills/skill-dev/tests/eval.yaml`

```yaml
skill: skill-dev
description: Golden dataset for skill-dev — regression tests from dry-run testing rounds

cases:
  - name: "invalid-skill-shows-error"
    description: "When skill name doesn't exist, show error with available skills list"
    category: boundary
    inputs:
      command: "/skill-dev review nonexistent-skill"
      state:
        skill_exists: false
    assert:
      - type: contains
        value: "not found"
      - type: contains-any
        values:
          - "Available skills"
          - "available skills"
      - type: contains
        value: "commit"
      - type: contains
        value: "onboard"
      - type: contains-any
        values:
          - "Which skill"
          - "which skill"
    source: "Exploratory test 2026-03-28, scenario invalid-skill-name"

  - name: "review-history-recent-no-changes"
    description: "Recent review with no changes offers skip/re-review/cancel options"
    category: boundary
    inputs:
      command: "/skill-dev review commit"
      state:
        reviews_log: "2026-03-25 | review | commit | PASS | 2 | Minor issues"
        git_diff_empty: true
        days_since_review: 3
    assert:
      - type: contains
        value: "2026-03-25"
      - type: contains
        value: "PASS"
      - type: contains-all
        values:
          - "Re-review"
          - "Skip to testing"
          - "Cancel"
    source: "Exploratory test 2026-03-28, scenario review-history-recent — previously AMBIGUOUS, fixed"

  - name: "auto-detect-bare-name-reviews-first"
    description: "Bare skill name triggers review first, then offers to test"
    category: happy-path
    inputs:
      command: "/skill-dev commit"
      state:
        skill_exists: true
        reviews_log_empty: true
    assert:
      - type: contains-any
        values:
          - "Review complete"
          - "review complete"
      - type: contains-any
        values:
          - "test this skill"
          - "dry-run"
          - "Want me to test"
    source: "Exploratory test 2026-03-28, scenario auto-detect-bare-name"

  - name: "scenario-arg-runs-single"
    description: "test <skill> <scenario> runs only that scenario with abbreviated report"
    category: boundary
    inputs:
      command: "/skill-dev test onboard happy-path-beginner"
      state:
        skill_exists: true
    assert:
      - type: not-contains
        value: "Cross-Scenario Analysis"
      - type: contains-any
        values:
          - "happy-path-beginner"
          - "single scenario"
          - "abbreviated"
    source: "Exploratory test 2026-03-28, scenario test-with-scenario-arg — previously AMBIGUOUS, fixed"

  - name: "review-report-has-required-sections"
    description: "Review mode produces report with all required sections"
    category: happy-path
    inputs:
      command: "/skill-dev review commit"
      state:
        skill_exists: true
        reviews_log_empty: true
    assert:
      - type: contains-all
        values:
          - "Skill Review:"
          - "Summary"
          - "Critical Issues"
          - "Recommendations"
          - "Suggestions"
          - "Strengths"
    source: "SKILL.md lines 82-89 define the required report format"

  - name: "scenario-approval-table-format"
    description: "Test mode presents scenarios in the specified table format before running"
    category: happy-path
    inputs:
      command: "/skill-dev test commit"
      state:
        skill_exists: true
    assert:
      - type: contains-all
        values:
          - "Name"
          - "Category"
          - "What it tests"
      - type: contains-any
        values:
          - "Ready to run"
          - "ready to run"
    source: "SKILL.md lines 114-122 define scenario approval format — added during fix round"

  - name: "no-args-lists-skills"
    description: "No arguments shows available skills and asks which one"
    category: boundary
    inputs:
      command: "/skill-dev"
      state: {}
    assert:
      - type: contains-any
        values:
          - "commit"
          - "onboard"
          - "task"
      - type: contains-any
        values:
          - "Which skill"
          - "which skill"
          - "What would you like"
    source: "Exploratory test 2026-03-28, scenario no-args-flow"
```

### 4. Create golden dataset for `onboard` skill

**Files to create:** `.claude/skills/onboard/tests/eval.yaml`

```yaml
skill: onboard
description: Golden dataset for onboard skill — decision table coverage

cases:
  - name: "full-mode-no-existing-files"
    description: "No global or project files triggers full onboard flow"
    category: happy-path
    inputs:
      command: "/onboard"
      state:
        has_global_claude_md: false
        has_project_user_context: false
    assert:
      - type: decision-trace
        input: "has_global=false, has_project=false"
        rule: "Mode Detection"
        result: "full"
      - type: contains-any
        values:
          - "Guide me"
          - "coding comfort"
          - "step by step"
    source: "SKILL.md Step 0 — mode detection for fresh users"

  - name: "guided-tier-maximum-safety"
    description: "Guided tier with any purpose produces maximum safety posture"
    category: boundary
    inputs:
      command: "/onboard"
      state:
        has_global_claude_md: false
        has_project_user_context: false
        g1_answer: "Guide me step by step"
        p1_answer: "Learning"
    assert:
      - type: decision-trace
        input: "tier=Guided, purpose=Learning"
        rule: "Safety Derivation Rule 1"
        result: "Maximum safety"
    source: "Safety derivation matrix row 1 — Guided + Any = Maximum safety"

  - name: "expert-concise-minimal-safety"
    description: "Expert tier with concise style produces minimal safety posture"
    category: boundary
    inputs:
      command: "/onboard"
      state:
        g1_answer: "Stay out of my way"
        g2_answer: "Be concise"
        p1_answer: "Production"
    assert:
      - type: decision-trace
        input: "tier=Expert, style=Concise, purpose=Production"
        rule: "Safety Derivation Rule 6"
        result: "Minimal"
    source: "Safety derivation matrix row 6 — Expert + Concise = Minimal"

  - name: "existing-profile-shows-options"
    description: "When both global and project files exist, show existing profile and offer options"
    category: boundary
    inputs:
      command: "/onboard"
      state:
        has_global_claude_md: true
        has_project_user_context: true
    assert:
      - type: decision-trace
        input: "has_global=true, has_project=true"
        rule: "Mode Detection"
        result: "existing"
      - type: contains-any
        values:
          - "Level up"
          - "Update"
          - "Start fresh"
          - "Keep"
    source: "SKILL.md Step 0 — mode detection for returning users"
```

## Verification

```bash
# Check YAML is valid
node -e "const yaml = require('yaml'); const fs = require('fs'); console.log(yaml.parse(fs.readFileSync('.claude/skills/commit/tests/eval.yaml', 'utf8')).cases.length + ' cases')"

# Or if yaml isn't available, just check files exist
ls -la .claude/skills/commit/tests/eval.yaml
ls -la .claude/skills/onboard/tests/eval.yaml
ls -la .claude/skills/skill-dev/tests/eval.yaml
```

Expected: 3 fixture files created, valid YAML, combined ~30 test cases.

## When done

Report: files created (FIXTURE_FORMAT.md, 3 eval.yaml files), total test case count per skill, any issues with the format design.
