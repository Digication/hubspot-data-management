# Phase 05 — SKILL.md Rewrite

You are updating the skill-dev SKILL.md to use the new 4-layer testing system in the claude-blueprint project.

**Context:** Phases 01-04 built the infrastructure: enhanced validator (Layer 1), YAML fixtures + eval runner (Layer 2), LLM-as-judge rubrics (Layer 3), and reference docs. This phase rewrites Mode 2 in SKILL.md to use these layers instead of the current single exploratory approach. It also updates the argument syntax and reference doc links.

## Overview

- Rewrite Mode 2 (Test) section to describe the 4-layer system
- Add new argument syntax: `--layer`, `--explore`, `--full`
- Update the test workflow to: Layer 1 → Layer 2 → Layer 3 → (optional) Layer 4
- Add "Convert findings to fixtures" step after Layer 4
- Update references to new docs (EVAL_LAYERS.md, FIXTURE_FORMAT.md, JUDGE_RUBRICS.md)
- Keep backward compatibility: `/skill-dev test <skill>` still works (runs Layers 1-3)

## Steps

### 1. Update the Arguments section

**Files to modify:** `.claude/skills/skill-dev/SKILL.md`

Replace the current test arguments (lines 30-31) with:

```markdown
- `test <skill-name>`: Run Layers 1-3 (structural + golden dataset + LLM-judge)
- `test <skill-name> --layer <1|2|3>`: Run only the specified layer
- `test <skill-name> --explore`: Run Layer 4 (exploratory discovery with fresh agents)
- `test <skill-name> --full`: Run all 4 layers
- `test <skill-name> <scenario>`: Run a single named scenario from the golden dataset (Layer 2 only)
```

### 2. Rewrite Mode 2 section

Replace the current Mode 2 section (lines 95-138) with the new 4-layer workflow:

```markdown
## Mode 2: Test

Multi-layer testing system. Each layer catches different kinds of issues. See [EVAL_LAYERS.md](references/EVAL_LAYERS.md) for the full layer reference.

### Layer Overview

| Layer | What | Speed | Deterministic? |
|---|---|---|---|
| 1 — Structural | `validate-skill.mjs` checks | Instant | Yes |
| 2 — Golden Dataset | YAML fixtures with property assertions | Seconds | Yes |
| 3 — LLM-as-Judge | Rubric-based quality evaluation | Minutes | Semi (3x majority vote) |
| 4 — Exploratory | Fresh agents finding unknown issues | Minutes | No |

### Default Workflow (`/skill-dev test <skill>`)

1. **Layer 1: Structural validation**
   - Run `node <skill-base-dir>/scripts/validate-skill.mjs <skill-path>`
   - If FAIL → stop, report errors. Fix before proceeding.

2. **Layer 2: Golden dataset**
   - Load `<skill>/tests/eval.yaml` (see [FIXTURE_FORMAT.md](references/FIXTURE_FORMAT.md))
   - For each test case, spawn a read-only agent (Read, Glob, Grep only) with the case's inputs
   - Check agent output against deterministic assertions: `contains`, `regex`, `not-contains`, `contains-all`, `contains-any`, `decision-trace`
   - If any case FAILs → stop, report failures with assertion details
   - If no fixture file exists → skip Layer 2, warn: "No golden dataset found. Run `--explore` to create one."

3. **Layer 3: LLM-as-Judge**
   - For each `llm-rubric` assertion in the fixture file, spawn a judge agent with the rubric from [JUDGE_RUBRICS.md](references/JUDGE_RUBRICS.md)
   - Run each rubric **3 times** with fresh context. Majority vote (2/3) determines verdict.
   - Report: rubric name, 3 verdicts, final verdict, reasoning from the deciding vote
   - If any rubric FAILs → report as warning (non-blocking unless `--strict` flag)

4. **Generate report** — consolidated results across all layers:

   ```markdown
   # Eval Report: [skill-name]

   ## Layer 1: Structural — [PASS/FAIL]
   [Validator output summary]

   ## Layer 2: Golden Dataset — [PASS/FAIL]
   | Case | Category | Verdict | Details |
   |---|---|---|---|
   [Per-case results]

   ## Layer 3: LLM-as-Judge — [PASS/FAIL]
   | Rubric | Run 1 | Run 2 | Run 3 | Final |
   |---|---|---|---|---|
   [Per-rubric results]

   ## Verdict: [PASS / FAIL / PARTIAL]
   ```

5. **Log results** — append to `${CLAUDE_PLUGIN_DATA}/skill-dev/reviews.log`

### Exploratory Workflow (`/skill-dev test <skill> --explore`)

Run Layer 4 only. This is the current behavior (fresh agents, open-ended discovery) reframed as a discovery tool:

1. **Identify the skill** — read SKILL.md and all references
2. **Design test scenarios** — same categories as before (happy path, boundary, override, combination gaps, freeform, idempotency). Present for approval using the table format:

   ```
   | # | Name | Category | What it tests |
   |---|---|---|---|
   | 1 | {name} | {category} | {one-line description} |
   ```

   Ask: "Ready to run these {N} scenarios? (yes/no)"

   Scenario count: simple skills 2-3, decision-heavy 4-6, complex 6-8.

3. **Run test agents** — fresh context, read-only tools (Read, Glob, Grep), structured output per [TEST_PROTOCOL.md](references/TEST_PROTOCOL.md)
4. **Collect findings** — classify as Bug, Ambiguity, or Gap
5. **Convert findings to fixtures** — for each finding, ask:
   "Want me to add this as a regression test? (yes/skip)"
   - If yes: append a new test case to `<skill>/tests/eval.yaml` with appropriate assertions
   - If skip: note in the report but don't add to fixtures
6. **Generate report** — same format as [REPORT_FORMAT.md](references/REPORT_FORMAT.md), plus a "Fixtures Added" section

### Single Scenario (`/skill-dev test <skill> <scenario>`)

Run a single named case from the golden dataset (Layer 2 only):

1. Load `<skill>/tests/eval.yaml`
2. Find the case matching the scenario name
3. If not found → list available case names and ask to pick one
4. Spawn one agent with the case's inputs
5. Check assertions, report results (no cross-case analysis)
```

### 3. Update Gotchas section

Add new gotchas for the layered system:

```markdown
- Layer 2 fixtures can go stale — if a skill's behavior intentionally changes, update eval.yaml or tests will false-fail. When a Layer 2 case fails, always check: is it a real bug or an outdated fixture?
- Layer 3 judge rubrics must have specific PASS/FAIL criteria — vague rubrics like "is it good?" produce inconsistent results. Every criterion needs a concrete condition.
- Layer 4 findings are NOT a quality gate — they're discovery input. Don't block shipping on exploratory findings; convert them to Layer 2 cases first.
```

### 4. Update Rules section

Add new rules:

```markdown
- **Layers run in order** — Layer 2 depends on Layer 1 passing. Layer 3 depends on Layer 2 passing. Layer 4 is independent.
- **Fixtures are regression tests** — every bug fixed should add a Layer 2 case. This prevents the "find different issues each run" problem.
- **Judge runs 3 times** — Layer 3 rubrics use majority vote (2/3) to handle LLM non-determinism. Never trust a single judge run.
- **Explore then codify** — Layer 4 findings must be converted to Layer 2/3 cases to have lasting value. Raw exploratory results expire.
```

### 5. Update reference doc links

Ensure SKILL.md links to all new reference docs:
- `[EVAL_LAYERS.md](references/EVAL_LAYERS.md)` — layer system overview
- `[FIXTURE_FORMAT.md](references/FIXTURE_FORMAT.md)` — YAML test case format
- `[JUDGE_RUBRICS.md](references/JUDGE_RUBRICS.md)` — LLM-as-judge rubric templates

## Verification

```bash
# Check SKILL.md is valid and under 500 lines
wc -l .claude/skills/skill-dev/SKILL.md

# Run the validator against the updated skill
node .claude/skills/skill-dev/scripts/validate-skill.mjs .claude/skills/skill-dev/

# Check all referenced files exist
grep -oP '\[.*?\]\((references/[^)]+)\)' .claude/skills/skill-dev/SKILL.md | while read link; do
  file=$(echo "$link" | grep -oP 'references/[^)]+')
  if [ ! -f ".claude/skills/skill-dev/$file" ]; then
    echo "BROKEN: $file"
  fi
done
```

Expected:
- SKILL.md under 500 lines (may be tight — split to reference docs if needed)
- Validator passes
- All reference links resolve

## When done

Report: files modified (SKILL.md), final line count, validator results, any reference docs that needed updates, and confirmation that backward compatibility is maintained (basic `/skill-dev test <skill>` still works).
