# Phase 02 — Test Fixture Format and Golden Datasets

You are creating the test fixture format and initial golden datasets for the skill-dev testing system in the claude-blueprint project.

**Context:** Phase 01 enhanced the structural validator with new deterministic checks. This phase defines the YAML format for Layer 2 (Golden Dataset) test cases and creates initial fixtures for all 8 skills. These fixtures contain specific input/output assertions that produce the same results every run — unlike the current exploratory approach.

## Overview

- Define the YAML test fixture format (inspired by promptfoo but adapted for skill testing)
- Create a reference doc explaining the format (`FIXTURE_FORMAT.md`)
- Write golden dataset fixtures for all 8 skills: `commit`, `onboard`, `skill-dev` (rich — from exploratory findings), plus `task`, `implement`, `fact-check`, `retrospective`, `review-thread` (baseline — from reading their SKILL.md)
- Each fixture captures real bugs (for explored skills) or key decision paths (for new skills)

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

### 5. Create golden dataset for `task` skill

**Files to create:** `.claude/skills/task/tests/eval.yaml`

```yaml
skill: task
description: Golden dataset for task skill — context switching and dirty state handling

cases:
  - name: "start-clean-tree-creates-branch"
    description: "Starting a task on a clean tree creates a task branch without dirty-state prompt"
    category: happy-path
    inputs:
      command: '/task start "Add login page"'
      state:
        git_status: "clean"
    assert:
      - type: not-contains
        value: "uncommitted"
      - type: contains-any
        values:
          - "task/add-login-page"
          - "branch"
    source: "SKILL.md start workflow — clean tree skips Step 2"

  - name: "start-dirty-tree-asks-options"
    description: "Starting a task with uncommitted changes presents 4 options"
    category: boundary
    inputs:
      command: '/task start "Fix auth bug"'
      state:
        git_status: "modified: src/auth.js"
    assert:
      - type: contains-all
        values:
          - "Stash"
          - "Commit"
          - "Related"
          - "Discard"
    source: "SKILL.md Step 2 — 4 options for uncommitted changes"

  - name: "discard-requires-double-confirm"
    description: "Discard option requires a second confirmation before destroying changes"
    category: boundary
    inputs:
      command: '/task start "New feature"'
      state:
        git_status: "modified: src/auth.js"
        user_choice: "Discard"
    assert:
      - type: contains-any
        values:
          - "Are you sure"
          - "cannot be undone"
          - "confirm"
    source: "SKILL.md Step 2 — double-confirm safety gate for discard"

  - name: "status-no-args-shows-state"
    description: "Running task with no args shows current working state"
    category: happy-path
    inputs:
      command: "/task"
      state:
        git_status: "clean"
        current_branch: "main"
    assert:
      - type: contains-any
        values:
          - "main"
          - "branch"
          - "status"
          - "working"
    source: "SKILL.md — no args or status shows current state"

  - name: "resume-no-tasks-found"
    description: "Resume with no task branches or stashes reports nothing to resume"
    category: boundary
    inputs:
      command: "/task resume"
      state:
        task_branches: []
        stash_list: []
    assert:
      - type: contains-any
        values:
          - "No paused tasks"
          - "no tasks"
          - "nothing to resume"
    source: "SKILL.md resume workflow — empty state edge case"
```

### 6. Create golden dataset for `implement` skill

**Files to create:** `.claude/skills/implement/tests/eval.yaml`

```yaml
skill: implement
description: Golden dataset for implement skill — complexity evaluation and mode detection

cases:
  - name: "simple-change-goes-direct"
    description: "A change touching 1-3 files should use direct implementation, not plan mode"
    category: happy-path
    inputs:
      command: '/implement "Add a loading spinner to the login button"'
      state:
        estimated_files: 2
    assert:
      - type: not-contains
        value: "plan"
      - type: not-contains
        value: "Phase"
    source: "SKILL.md complexity table — 1-3 files = direct"

  - name: "complex-change-suggests-plan"
    description: "A change touching 10+ files should trigger plan mode"
    category: boundary
    inputs:
      command: '/implement "Build a complete user authentication system with OAuth, session management, and role-based access control"'
      state:
        estimated_files: 15
    assert:
      - type: contains-any
        values:
          - "plan"
          - "phased"
          - "step-by-step"
          - "Phase"
    source: "SKILL.md complexity table — 10+ files = plan mode"

  - name: "explicit-plan-overrides-complexity"
    description: "User saying 'plan' forces plan mode even for simple changes"
    category: override
    inputs:
      command: '/implement plan "Rename a variable"'
      state:
        estimated_files: 1
    assert:
      - type: contains-any
        values:
          - "plan"
          - "Phase"
          - "overview"
    source: "SKILL.md — user explicitly says plan overrides complexity"

  - name: "dirty-state-precheck"
    description: "Uncommitted changes detected before any mode starts"
    category: boundary
    inputs:
      command: '/implement "Add dark mode"'
      state:
        git_status: "modified: src/theme.js"
    assert:
      - type: contains-any
        values:
          - "uncommitted"
          - "unsaved"
          - "Stash"
    source: "SKILL.md pre-check — dirty state handled before implementation"
```

### 7. Create golden dataset for `fact-check` skill

**Files to create:** `.claude/skills/fact-check/tests/eval.yaml`

```yaml
skill: fact-check
description: Golden dataset for fact-check skill — claim triage and verdict accuracy

cases:
  - name: "hedged-claim-gets-checked"
    description: "Claims with hedging language (I think, usually) should be extracted for verification"
    category: happy-path
    inputs:
      command: "/fact-check"
      state:
        last_response: "I think React 19 introduced server components. Usually you need to configure the bundler separately."
    assert:
      - type: contains-any
        values:
          - "React"
          - "server components"
      - type: contains-any
        values:
          - "Supported"
          - "Contradicted"
          - "Unverifiable"
    source: "SKILL.md — hedged language triggers verification"

  - name: "opinions-not-checked"
    description: "Recommendations and opinions should not be fact-checked"
    category: boundary
    inputs:
      command: "/fact-check"
      state:
        last_response: "I recommend using TypeScript for this project. It would be better to split this into smaller files."
    assert:
      - type: contains-any
        values:
          - "Nothing to verify"
          - "no verifiable"
          - "opinions"
          - "recommendations"
    source: "SKILL.md — opinions/recommendations are not facts"

  - name: "zero-claims-reports-nothing"
    description: "When no verifiable claims exist, report nothing to verify"
    category: boundary
    inputs:
      command: "/fact-check"
      state:
        last_response: "Sure, I can help with that. Let me read the file first."
    assert:
      - type: contains-any
        values:
          - "Nothing to verify"
          - "no verifiable"
          - "no claims"
    source: "SKILL.md — zero claims = early exit"
```

### 8. Create golden dataset for `retrospective` skill

**Files to create:** `.claude/skills/retrospective/tests/eval.yaml`

```yaml
skill: retrospective
description: Golden dataset for retrospective skill — learning routing

cases:
  - name: "skill-correction-routes-to-skill-file"
    description: "When a skill behaved wrong, the fix should target the skill file"
    category: happy-path
    inputs:
      command: "/retrospective"
      state:
        conversation_context: "User corrected the commit skill: it should always suggest a branch for production purposes"
    assert:
      - type: contains-any
        values:
          - "skill file"
          - "SKILL.md"
          - "commit"
      - type: not-contains
        value: "memory"
    source: "SKILL.md routing table — skill correction → edit skill file"

  - name: "personal-preference-routes-to-memory"
    description: "Personal preferences should be saved to auto memory, not skill files"
    category: boundary
    inputs:
      command: "/retrospective"
      state:
        conversation_context: "User prefers terse responses with no trailing summaries"
    assert:
      - type: contains-any
        values:
          - "memory"
          - "preference"
          - "remember"
      - type: not-contains
        value: "CLAUDE.md"
    source: "SKILL.md routing table — personal preference → auto memory (feedback type)"

  - name: "no-learnings-found"
    description: "When conversation has no corrections or preferences, report nothing"
    category: boundary
    inputs:
      command: "/retrospective"
      state:
        conversation_context: "User asked to read a file and Claude read it. No corrections or preferences."
    assert:
      - type: contains-any
        values:
          - "nothing"
          - "no learnings"
          - "no corrections"
          - "didn't find"
    source: "Edge case — empty conversation with no feedback"
```

### 9. Create golden dataset for `review-thread` skill

**Files to create:** `.claude/skills/review-thread/tests/eval.yaml`

```yaml
skill: review-thread
description: Golden dataset for review-thread skill — independent verdict accuracy

cases:
  - name: "correction-evaluated-independently"
    description: "A user correction should be evaluated against evidence, not automatically accepted"
    category: happy-path
    inputs:
      command: "/review-thread"
      state:
        conversation_context: "User said: 'Don't use bare Bash in allowed-tools.' Claude agreed and changed it."
    assert:
      - type: contains-any
        values:
          - "Confirmed"
          - "Valid"
          - "evidence"
          - "verified"
      - type: not-contains
        value: "automatically"
    source: "SKILL.md — independence over agreement, verify with evidence"

  - name: "skepticism-default-not-all-valid"
    description: "If every item comes back as Valid, the reviewer isn't being critical enough"
    category: boundary
    inputs:
      command: "/review-thread"
      state:
        conversation_context: "5 feedback items: all are minor style preferences that Claude agreed to immediately"
    assert:
      - type: contains-any
        values:
          - "Confirmed"
          - "No Change Needed"
          - "Inconclusive"
    source: "SKILL.md — skepticism is default, not every change is justified"

  - name: "verdict-requires-evidence"
    description: "Every verdict must cite specific evidence (file, code, behavior)"
    category: happy-path
    inputs:
      command: "/review-thread"
      state:
        conversation_context: "User corrected a function name from camelCase to snake_case"
    assert:
      - type: llm-rubric
        value: "Every verdict in the review cites specific evidence — a file path, code snippet, documentation reference, or observed behavior. No verdict relies on 'it seems right' or 'user said so' alone."
    source: "SKILL.md — must cite specific evidence for every verdict"
```

## Verification

```bash
# Check all 8 fixture files exist
for skill in commit onboard skill-dev task implement fact-check retrospective review-thread; do
  if [ -f ".claude/skills/$skill/tests/eval.yaml" ]; then
    echo "OK: $skill"
  else
    echo "MISSING: $skill"
  fi
done
```

Expected: 8 fixture files created, valid YAML, combined ~40 test cases across all skills.

## When done

Report: files created (FIXTURE_FORMAT.md + 8 eval.yaml files), total test case count per skill, and any issues with the format design.
