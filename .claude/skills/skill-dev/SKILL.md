---
name: skill-dev
description: Review, test, and validate Claude skills. Trigger on review skill, test skill, audit skill, validate SKILL.md, check skill quality, is this skill good, improve this skill, skill pipeline, skill QA. Combines static review, behavioral dry-run testing, and real-world integration testing.
metadata:
  allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(git diff:*), Bash(git log:*), Bash(find:*), Bash(md5:*), Bash(xargs:*), Agent
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: ".claude/skills/skill-dev/scripts/guard-integration.sh"
          timeout: 10
          statusMessage: "Checking command safety for integration tests..."
---

# Skill Development — Review, Test, Validate

Unified skill for the skill quality pipeline. Three modes, run in order:

```
/skill-dev review <skill> → /skill-dev test <skill> → /skill-dev integration <skill>
```

## Available skills
!`ls .claude/skills/`

## Arguments

- `review <skill-name>`: Static quality review against checklist
- `test <skill-name>`: Run Layers 1-3 (structural + golden dataset + LLM-judge)
- `test <skill-name> --layer <1|2|3>`: Run only the specified layer
- `test <skill-name> --explore`: Run Layer 4 (exploratory discovery with fresh agents)
- `test <skill-name> --full`: Run all 4 layers
- `test <skill-name> <scenario>`: Run a single named scenario from the golden dataset (Layer 2 only)
- `integration plan <skill-name>`: Create real-world integration test plan
- `integration evaluate`: Read test results and propose fixes
- `baseline <skill-name>`: Compare skill-assisted vs. unassisted agent output. Answers "does this skill actually help?"
- `baseline <skill-name> --cases N`: Limit to first N test cases (cheaper for quick checks)
- `triggers <skill-name>`: Test and optimize the skill's description for trigger accuracy
- `triggers <skill-name> --max-rounds N`: Set max optimization rounds (default: 5)
- `triggers <skill-name> --dry-run`: Show the query set and current score only, no optimization
- `stats <skill-name>`: Show skill size, complexity, and estimated test cost (no agents spawned)
- `stats <skill-name> --json`: Same as stats but output raw JSON
- `<skill-name>`: Auto-detect — review first, then offer to test (see Auto-Detect Flow below)
- (no args): List available skills and ask which to work on (see No-Args Flow below)

### Skill Name Validation

Before any mode runs, validate the skill name: check that `.claude/skills/<skill-name>/SKILL.md` exists. If not, show:

```
Skill '{name}' not found. Available skills:
{bulleted list from ls .claude/skills/}

Which skill would you like to work on?
```

After the user picks a valid skill, continue with the originally requested mode (e.g., if user ran `review badname`, ask for a skill then proceed to review).

### Auto-Detect Flow

When the argument is a bare skill name (no mode keyword):

1. Run Mode 1 (Review) in full
2. After the review report, ask: "Review complete. Want me to test this skill with dry-run scenarios? (yes/no)"
3. If **yes** → proceed to Mode 2 (Test) for the same skill
4. If **no** → done, save review to log and exit

### No-Args Flow

When no arguments are provided:

1. Show the available skills list (populated by the `!`\`ls .claude/skills/\`` injection)
2. Ask: "Which skill would you like to work on?"
3. After the user names a skill, ask: "What would you like to do? (review / test / integration plan)"
4. If the user just names a skill without picking a mode, follow the Auto-Detect Flow above

---

## Mode 1: Review

Static quality review of a skill's structure, metadata, and content.

### Workflow

1. **Check Review History first** — see the Review History section below. If a recent review exists with no changes, offer to skip/re-review/cancel before proceeding.

2. **Run the automated validator** (`node <skill-base-dir>/scripts/validate-skill.mjs /path/to/skill/`), then review against [CHECKLIST.md](references/CHECKLIST.md) — covering metadata, structure, content quality, and effectiveness. See [ALLOWED_TOOLS.md](references/ALLOWED_TOOLS.md) for tool safety guidelines.

Generate a feedback report:

```markdown
# Skill Review: [skill-name]
## Summary — [1-2 sentence assessment]
## Critical Issues (must fix)
## Recommendations (should fix)
## Suggestions (nice to have)
## Strengths
```

Finish with self-critique per [SELF_CRITIQUE.md](references/SELF_CRITIQUE.md) — check if the checklist caught everything or if you relied on intuition.

---

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

0. **Pre-load skill content** (enables prompt caching — see [TEST_PROTOCOL.md](references/TEST_PROTOCOL.md))
   - Read all files in `<skill>/` directory (excluding `tests/` and `.plugin-data/`)
   - Format each as `### {filename}\n{content}` and concatenate into a single `skill_content_block`
   - This block is embedded verbatim in every agent prompt below — agents must NOT re-read these files
   - **Why:** All agents share this prefix. The API caches it after the first agent, reducing input token cost by ~90% for agents 2+.

1. **Layer 1: Structural validation**
   - Run `node <skill-base-dir>/scripts/validate-skill.mjs <skill-path>`
   - If FAIL → stop, report errors. Fix before proceeding.

2. **Layer 2: Golden dataset**
   - Load `<skill>/tests/eval.yaml` (see [FIXTURE_FORMAT.md](references/FIXTURE_FORMAT.md))
   - For each test case, spawn an agent with `model: "haiku"` using the prompt template from [TEST_PROTOCOL.md](references/TEST_PROTOCOL.md) with the pre-loaded `skill_content_block` and the case's inputs. Standard cases need no tools — all content is in the prompt. For review-type cases (command contains "review" or state has `review_type: true`), use `model: "sonnet"` with Read, Glob, Grep tools and add the review-specific prompt — the agent must verify findings against the target skill files.
   - Check agent output against deterministic assertions: `contains`, `regex`, `not-contains`, `contains-all`, `contains-any`, `decision-trace`
   - If any case FAILs → stop, report failures with assertion details
   - If no fixture file exists → skip Layer 2, warn: "No golden dataset found. Run `--explore` to create one."

3. **Layer 3: LLM-as-Judge** (2+1 strategy)
   - For each `llm-rubric` assertion in the fixture file, spawn a judge agent with `model: "sonnet"`, the rubric from [JUDGE_RUBRICS.md](references/JUDGE_RUBRICS.md), and the pre-loaded `skill_content_block`
   - **2+1 majority vote:** Run 2 judges in parallel. If they agree → verdict is final. If they disagree → spawn a 3rd as tiebreaker. This saves ~33% of judge runs compared to always running 3.
   - Report: rubric name, judge verdicts (2 or 3), final verdict, reasoning from the deciding vote
   - If any rubric FAILs → report as warning (non-blocking unless `--strict` flag)
   - If **no `llm-rubric` assertions exist** in eval.yaml → report "Skipped — no rubrics" and continue to step 3b.

   **3b. Suggest rubrics (when Layer 3 was skipped due to no rubrics)**

   This step is **mandatory** when Layer 3 is skipped — do not jump to the report.

   Ask: "No LLM-judge rubrics found. Want me to suggest rubrics for subjective quality checks?"
   - If yes: analyze the skill's output types and decision logic, propose 1-3 rubrics targeting aspects that deterministic assertions can't cover (e.g., "plain-language descriptions are jargon-free", "output adapts appropriately to tier"). Present each rubric with its PASS/FAIL criteria per [JUDGE_RUBRICS.md](references/JUDGE_RUBRICS.md). After approval, append the rubrics as `llm-rubric` assertions to the relevant test cases in eval.yaml.
   - If no: proceed to report.

4. **Generate report** — consolidated results across all layers, and generate an HTML viewer:

   Write the collected results to a JSON file using the Write tool. Track cost metrics as each agent completes — the Agent tool returns `total_tokens`, `tool_uses`, and `duration_ms` in its response metadata.

   ```json
   {
     "skillName": "<skill-name>",
     "timestamp": "<ISO timestamp>",
     "cases": [
       {
         "name": "<case name>",
         "description": "<what this case tests — from eval.yaml>",
         "category": "<category>",
         "verdict": "PASS|FAIL|PARTIAL",
         "notes": "<1-2 sentence result summary: key decision made, assertion outcome, or why it failed>",
         "output": "<agent output summary>",
         "assertions": [{ "passed": true, "type": "contains", "evidence": "..." }],
         "metrics": { "tokens": 12500, "tool_uses": 0, "duration_ms": 15000, "model": "haiku" }
       }
     ],
     "costSummary": {
       "totalAgents": 14,
       "totalTokens": 180000,
       "totalDurationMs": 95000,
       "byLayer": {
         "layer2": { "agents": 12, "tokens": 150000, "model": "haiku" },
         "layer3": { "agents": 2, "tokens": 30000, "model": "sonnet" }
       },
       "skillContentTokens": 1800,
       "cacheEligible": true
     }
   }
   ```
   Write to `$TMPDIR/eval-results-<skill>.json`, then run:
   ```bash
   node <skill-base-dir>/scripts/generate-viewer.mjs --skill <skill-name> --results $TMPDIR/eval-results-<skill>.json
   ```
   Check the exit code and output. If the script fails (e.g., permission error writing to `/tmp`), surface the error to the user — do not silently continue. Common cause: sandbox restricts `/tmp` writes; the script uses `$TMPDIR` which resolves to the sandbox-allowed path.
   The script auto-opens the report in the browser — do not run `open` separately.
   Tell the user: "I've also generated an interactive HTML report — it opened in your browser. You can leave feedback there and export it as JSON."

   Consolidated report format:

   ```markdown
   # Eval Report: [skill-name]

   ## Layer 1: Structural — [PASS/FAIL]
   [Validator output summary]

   ## Layer 2: Golden Dataset — [PASS/FAIL/SKIPPED]
   | Case | Category | Verdict | Details |
   |---|---|---|---|
   [Per-case results, or "Skipped — no eval.yaml" if no fixture file]

   ## Layer 3: LLM-as-Judge — [PASS/FAIL/SKIPPED]
   | Rubric | Run 1 | Run 2 | Run 3 | Final |
   |---|---|---|---|---|
   [Per-rubric results, or "Skipped — no rubrics / Layer 2 failed" if not run]

   ## Cost Summary
   | Metric | Value |
   |---|---|
   | Agents spawned | [total] (L2: [n] × [model], L3: [n] × [model]) |
   | Total tokens | [total] |
   | Skill content size | [n] tokens (cached after first agent) |
   | Wall clock time | [duration] |

   [If total tokens exceeds 200K: ⚠️ **High token usage** — consider reducing test cases or using `--layer 2` for quick checks.]
   [If agents used opus: ⚠️ **Expensive model detected** — test agents should use haiku/sonnet, not opus. See TEST_PROTOCOL.md Agent Model Selection.]

   ## Verdict: [PASS / FAIL / PARTIAL]
   ```

5. **Suggest next step** — if the report contains any Bug or Ambiguity findings:
   "I found [N] issues. Want me to run `/retrospective` to capture these as skill improvements so they're addressed in future work?"
   (Do not suggest this if all findings are Gaps only, or if the report is PASS.)

6. **Log results** — append to `${CLAUDE_PLUGIN_DATA}/reviews.log`

### Exploratory Workflow (`/skill-dev test <skill> --explore`)

Run Layer 4 only. This is the discovery tool for finding unknown issues with fresh agents:

1. **Pre-load skill content** — same as step 0 in the default workflow: read all skill files, format as `skill_content_block`. If this was already done in a preceding default workflow run, reuse the existing block.
2. **Check existing coverage** — read `<skill>/tests/eval.yaml` if it exists. For each decision table row in the skill, check whether an existing test case already covers it. Build a coverage map:

   ```
   | Decision Table Row | Covered by | Status |
   |---|---|---|
   | {row description} | {case name or "—"} | Covered / Uncovered |
   ```

   - **If all rows covered AND last Layer 4 run found zero Bugs** → report "Exploration complete — full decision table coverage achieved. No new scenarios needed." Skip to step 6 (generate report with coverage summary only).
   - **If uncovered rows exist** → proceed to step 3, targeting only uncovered areas.
   - **If no eval.yaml exists** → all rows are uncovered, proceed normally.

3. **Design test scenarios** — target **uncovered decision table rows only**. Use the same categories (happy path, boundary, override, combination gaps, freeform, idempotency). Present for approval using the table format:

   ```
   | # | Name | Category | What it tests | Covers row |
   |---|---|---|---|---|
   | 1 | {name} | {category} | {one-line description} | {decision table row} |
   ```

   Ask: "Ready to run these {N} scenarios? (yes/no)"

   Scenario count: simple skills 2-3, decision-heavy 4-6, complex 6-8. Count is based on **uncovered rows**, not total rows — fewer uncovered rows means fewer scenarios.

4. **Run test agents** — fresh context, read-only tools (Read, Glob, Grep), `model: "sonnet"`, structured output per [TEST_PROTOCOL.md](references/TEST_PROTOCOL.md). Use the pre-loaded `skill_content_block` in all agent prompts.
5. **Collect findings** — classify as Bug, Ambiguity, or Gap
6. **Convert findings to fixtures** — for each finding, ask:
   "Want me to add this as a regression test? (yes/skip)"
   - If yes: append a new test case to `<skill>/tests/eval.yaml` with appropriate assertions (use `contains` for exact strings, `regex` for patterns, `not-contains` for exclusions — match the finding type). Set category to `regression`. Populate `source` with the exploratory test date and scenario name. If eval.yaml doesn't exist, create it with the standard header (skill name, description, current skill_hash). Update `skill_hash` after adding cases.
   - If skip: note in the report but don't add to fixtures
7. **Suggest rubrics** — after converting findings, check if eval.yaml has any `llm-rubric` assertions. If not, suggest 1-3 rubrics based on the skill's output types (same prompt and flow as Layer 3's "no rubrics" suggestion in the default workflow).
8. **Generate report** — same format as [REPORT_FORMAT.md](references/REPORT_FORMAT.md), plus a "Coverage Map" section (from step 2) and a "Fixtures Added" section

### Single Scenario (`/skill-dev test <skill> <scenario>`)

Run a single named case from the golden dataset (Layer 2 only):

1. Load `<skill>/tests/eval.yaml`
2. Find the case matching the scenario name
3. If not found → list available case names and ask to pick one
4. Spawn one agent with the case's inputs
5. Check assertions, report results (no cross-case analysis)

---

## Mode 3: Integration Testing

Two-phase workflow for skills that touch the real file system, git, or global config.

### `integration plan <skill-name>`

1. **Read the skill** — identify all file writes, git operations, and external state changes

2. **Check for existing plan** — if `.claude/tests/TEST_PLAN.md` exists, update it using per-skill section boundaries (`## Part N — {Skill Name}` headers). Replace only the target skill's section; leave all other sections untouched. If the skill already has a section, replace it entirely with the new scenarios (idempotent). If the skill has no section yet, append a new `## Part N` section at the end.

3. **Design scenarios** covering:

   | Category | What to test |
   |---|---|
   | Happy path | Correct input, expected output |
   | Decision boundaries | Every row in every decision table |
   | Arguments/modes | Each named argument |
   | Idempotency | Re-run produces correct result |
   | Preservation | Re-run keeps user-added content |
   | Cross-session state | Pause in one session, resume in another |
   | Edge cases | Empty state, missing files, partial state |

   See [SCENARIO_DESIGN.md](references/SCENARIO_DESIGN.md) for test type and isolation strategy guidance.

4. **Write the test plan** to `.claude/tests/TEST_PLAN.md` — must be fully self-contained (a fresh session can execute it). See [PLAN_FORMAT.md](references/PLAN_FORMAT.md).

5. **Self-critique** — follow [SELF_CRITIQUE.md](references/SELF_CRITIQUE.md): check scenario coverage (every decision table row hit?), dry-run vs. integration classifications justified, and execution ordering complete.

6. Tell the user: "Open a fresh Claude Code session and say: 'Execute the test plan at `.claude/tests/TEST_PLAN.md` and save results to `.claude/tests/TEST_RESULTS.md`.'"

### `integration evaluate`

1. Read `.claude/tests/TEST_RESULTS.md`
2. Classify issues: Bug (fix immediately), Ambiguity (clarify spec), Gap (add rule or document)
3. For each Bug: identify exact line(s), propose specific edit, explain why
4. Ask for approval, then apply fixes
5. After fixes are applied, suggest: "These fixes came from integration testing. Want me to run `/retrospective` to capture any patterns worth remembering?"
6. Suggest re-running the plan in a fresh session to verify

---

## Mode 4: Baseline Comparison

Runs each test case twice — once with the skill, once without — and measures the delta in assertion pass rate. This answers "does this skill actually help, compared to having no skill at all?"

### Workflow

1. Load `<skill>/tests/eval.yaml`
2. For each test case (or `--cases N` if limited):
   a. **With-skill run:** agent prompt includes full SKILL.md + references content
   b. **Without-skill run:** agent gets the `natural_prompt` from the fixture (or a derived plain-language version of the command)
   c. Run both in parallel
3. Score each run against deterministic assertions (skip `llm-rubric` — too expensive)
4. Generate comparison report with delta metrics and impact verdict
5. Save JSON results to `${CLAUDE_PLUGIN_DATA}/baseline-{timestamp}.json`

### Cost note

Doubles runtime and LLM cost per test case. Use `--cases 3` for a quick spot check, or run the full suite when you need a definitive answer.

---

## Mode 5: Trigger Optimization

Tests whether the skill's `description` field causes Claude to activate the skill for the right queries — and not activate for near-misses. Iteratively improves the description using Claude with extended thinking.

See [TRIGGER_OPTIMIZATION.md](references/TRIGGER_OPTIMIZATION.md) for methodology details.

### Workflow

1. Read `SKILL.md` to extract current description
2. Use `claude -p` to generate 20 realistic test queries (10 should-trigger, 10 should-not)
3. Present the query set: "Here are the trigger queries I'll test. Look right? (yes/no)"
4. Score the current description against the train set (precision, recall, F1)
5. If score is already high (F1 ≥ 0.85) and user is happy: stop, no changes needed
6. Otherwise: run `optimize-triggers.mjs` and present the best candidate
7. Show before/after: current description vs. best candidate with score delta
8. Ask: "Want me to apply this improved description to SKILL.md?"
9. If yes: edit the `description` field in the frontmatter

---

## Mode 6: Stats

Instant skill profile — shows size, complexity, and estimated test cost without spawning any agents.

### Workflow

1. Run `node <skill-base-dir>/scripts/validate-skill.mjs --stats <skill-path>`
2. Present the output to the user
3. If `--json` flag is present, run with `--stats --json` and show raw JSON instead

### What it measures

| Category | Metrics |
|---|---|
| **Instruction size** | SKILL.md chars/tokens/lines, references chars/tokens/count, total instruction tokens |
| **Complexity** | Section count, decision tables, transition points, gotchas presence |
| **Test coverage** | Test case count, LLM rubric count, estimated agents and tokens per test run |

### Warnings

The stats output includes automated warnings when the skill looks expensive or under-tested:

| Condition | Warning |
|---|---|
| Instruction tokens > 20K | "Large skill — agents will be slow and expensive" |
| Instruction tokens > 10K | "Moderate size — prompt caching is important" |
| Decision tables > test cases | "Coverage may be incomplete" |

This mode is useful for:
- Checking a skill's "weight" before running expensive tests
- Comparing skills to find outliers
- Catching instruction bloat early

---

## Gotchas

- The validate script only checks metadata format — it does NOT check content quality. A passing validation is not a full review.
- Test agents sometimes "help" by inferring missing rules instead of flagging them as Gaps. The test prompt must explicitly say: flag ambiguity, don't fill in gaps yourself.
- Review-type test agents take shortcuts — they use "if the skill has..." instead of reading the target file. Use the review-specific prompt from TEST_PROTOCOL.md to force them to read the file and cite specific content. Without this, the Review Quality rubric will fail every time.
- Bare `Bash` (without command restriction) in allowed-tools is the #1 review finding — always flag it.
- Self-critique often produces generic "looks good" output. Push for specific checklist item references — "checklist item X was not covered" is useful, "review was thorough" is not.
- When testing decision-heavy skills, agents tend to skip "Other/freeform" inputs. Explicitly include them in scenarios.
- Skills that write to `~/.claude/` need a fake HOME in dry-run tests — agents forget this and report false passes.
- Dynamic content injection (`!`\`...\``) commands must be single operations — pipes and chained commands fail the shell permission check. Use one simple command.
- `${CLAUDE_PLUGIN_DATA}` resolves to `.plugin-data/` inside the skill's own directory (e.g., `.claude/skills/skill-dev/.plugin-data/`). Don't hardcode paths — use the variable. Test agents often fail to resolve this and report the log as missing.
- Layer 2 fixtures can go stale — if a skill's behavior intentionally changes, update eval.yaml or tests will false-fail. When a Layer 2 case fails, always check: is it a real bug or an outdated fixture?
- Layer 3 judge rubrics must have specific PASS/FAIL criteria — vague rubrics like "is it good?" produce inconsistent results. Every criterion needs a concrete condition.
- Layer 4 findings are NOT a quality gate — they're discovery input. Don't block shipping on exploratory findings; convert them to Layer 2 cases first.
- Layer 4 without coverage checking produces endless findings — each run discovers new edge cases without converging. Always check existing coverage first (step 2 of Exploratory Workflow) to avoid re-exploring covered areas.
- `generate-viewer.mjs` writes to `$TMPDIR`, not `/tmp` directly — the sandbox blocks `/tmp` writes. If the viewer script fails with a permission error, the root cause is always this. The script was fixed to use `process.env.TMPDIR`, but if you see this error again, check the `--output` path.
- Appending to `${CLAUDE_PLUGIN_DATA}/reviews.log` via `echo >>` or shell redirect fails with a sandbox permission error. Use `cat >>` with `dangerouslyDisableSandbox: true`, or read the file first and rewrite it with the Write tool. The sandbox allows write access to `.plugin-data/` via file tools but blocks shell redirects.

---

## Review History

After each review or test, append a summary to `${CLAUDE_PLUGIN_DATA}/reviews.log`:

```
{date} | {mode} | {skill-name} | {verdict} | {issue-count} | {one-line summary}
```

On each run:
- Check the log: if skill was reviewed in the **last 7 calendar days** (< 7 days ago, using the date in the log entry) and hasn't changed, mention this and offer options. If multiple entries exist for the same skill, use the most recent one.
- Detect changes with: `git diff HEAD@{7.days.ago} -- .claude/skills/<skill-name>/` (checks the entire skill directory, not just SKILL.md)
- If recent review exists AND no changes detected, ask: "This skill was reviewed on {date} with verdict {verdict}. No changes since. Want to: (1) Re-review anyway, (2) Skip to testing, (3) Cancel?"
  - **Re-review** → proceed with Mode 1 normally
  - **Skip to testing** → jump directly to Mode 2 (Test) step 1 (Identify the skill). The previous passing review satisfies the "review before testing" rule — no re-validation needed. Design fresh scenarios (do not reuse previous test scenarios).
  - **Cancel** → exit, no action taken
- If recent review exists AND changes ARE detected, mention the previous review and proceed directly to a full review: "This skill was reviewed on {date} ({verdict}), but it's been modified since. Running a fresh review."
- Surface patterns across skills: "This is the 3rd skill with bare Bash in allowed-tools"

---

## Rules

- **Review before testing** — test mode assumes the skill passes structural validation
- **Fresh context per test agent** — each agent starts with zero conversation history
- **Read-only dry-run testing** — enforce via tool restrictions (`Read, Glob, Grep` only), not just instructions
- **Deterministic inputs** — each scenario specifies exact answers, never "let the agent choose"
- **Cover decision tables exhaustively** — every row should be hit by at least one scenario
- **Never remove other skills' scenarios** — `integration plan task` only touches task scenarios
- **Test plans must be self-contained** — no references to "as we discussed" or current conversation
- **Dry-run for global state** — skills writing to `~/.claude/` should use a fake HOME
- **Integration for git ops** — skills with git commands should use a temp clone
- **Cleanup is mandatory** — every integration test must specify cleanup commands
- **Layers run in order (default workflow)** — Layer 2 depends on Layer 1 passing. Layer 3 depends on Layer 2 passing. Layer 4 is independent. When using `--layer N`, these dependencies are bypassed at the user's discretion.
- **Layer cascade on failure** — If Layer 2 fails, stop at the first failing case (do not run remaining cases). Skip Layer 3 entirely. Report verdict as FAIL.
- **Layer cascade on skip** — If Layer 2 is skipped (no eval.yaml), also skip Layer 3 (it has no fixtures to judge). Report verdict as PARTIAL with guidance to run `--explore`.
- **`--layer N` runs standalone** — `--layer 1` runs only the structural validator and reports its result. `--layer 2` skips Layer 1 (assumes structural validity); if eval.yaml is missing, report PARTIAL with guidance to run `--explore`. `--layer 3` skips Layers 1-2 (assumes the user verified fixtures separately); if no `llm-rubric` assertions exist, report PASS with a note that no rubrics were found. This is a speed optimization — the user takes responsibility for skipped prerequisites. Verdict reflects only the layer that ran. `--layer 4` is not valid; use `--explore` instead.
- **`--full` includes Layer 4 with approval** — `--full` runs Layers 1-3 (applying normal cascade rules), then presents Layer 4 scenarios for approval (same table format and prompt as `--explore`). If user declines, report Layers 1-3 results only. If L1 fails, stop entirely (no L4). If L2 fails or is skipped, still offer L4 — Layer 4 is independent and can discover issues without fixtures. L4 findings follow the same fixture conversion step as `--explore` (step 6).
- **Fixtures are regression tests** — every bug fixed should add a Layer 2 case. This prevents the "find different issues each run" problem.
- **Judge runs 2+1** — Layer 3 rubrics use a 2+1 majority vote: run 2 judges in parallel; if they agree, the verdict is final; if they disagree, spawn a 3rd as tiebreaker. Never trust a single judge run.
- **Explore then codify** — Layer 4 findings should be converted to Layer 2/3 cases for lasting value. The "Want me to add?" prompt lets users skip findings that are informational (Ambiguity/Gap) rather than behavioral (Bug). Bug findings should always become fixtures; Ambiguity/Gap findings are optional. Raw exploratory results without corresponding fixtures expire.
- **Coverage-aware exploration** — Layer 4 must read existing eval.yaml before designing scenarios. Only target uncovered decision table rows. This prevents the "endless new findings" problem where each run discovers different edge cases without converging.
- **Exploration converges** — If all decision table rows are covered by Layer 2 cases AND the last Layer 4 run found zero Bug findings, report "Exploration complete" and skip scenario design. Ambiguity/Gap findings do not block convergence — only Bugs do.
