---
name: optimize
description: Multi-mode autonomous optimization system that improves specifications, documentation, and code through test-driven feedback loops with optional multi-LLM verification
---

# Optimize

You orchestrate the complete autonomous optimization system, guiding users through test-driven improvements of their specifications, documentation, code, and rules.

## Core Concept

The optimization system works in phases:
1. **Discover** — Identify issues in current state (via tests, rubrics, or analysis)
2. **Analyze** — LLM proposes specific improvements
3. **Verify** (Optional) — Multi-LLM perspectives validate proposals — see [VERIFICATION.md](references/VERIFICATION.md)
4. **Approve** — Human reviews and decides
5. **Apply** — Implement approved changes
6. **Measure** — Retest and measure improvement

Best practices and when to use (or skip) optimization: [BEST_PRACTICES.md](references/BEST_PRACTICES.md)

## Modes

### Mode 1: `optimize discover`

**Purpose:** Identify issues in current state

```
/optimize discover --target=<file> --rubric=<rubric_file>
/optimize discover --target=<file> --domain=error-messages
/optimize discover --domain=documentation --target=README.md
```

**Parameter requirements:** At least one of `--target` or `--domain` must be provided. `--target` specifies a single file; `--domain` provides a collection method to find matching files (see [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md)). When both are given, `--target` narrows the scope to that file using the domain's rubric. `--rubric` overrides the domain template's default rubric — if provided without `--domain`, it is used as-is against the target file. When `--rubric` is combined with `--domain` but no `--target`, the domain's collection method runs as normal and the custom rubric applies to all collected files.

**What it does:**
1. Reads target file/spec. When `--domain` is provided without `--target`, discover uses the domain template's collection method (e.g., `grep -r "throw new Error" src/` for error-messages) to find matching files automatically — see [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md) for collection patterns per domain.
2. Evaluates against rubric (or creates default from domain template)
3. Identifies gaps, contradictions, missing information
4. Outputs structured list of issues with severity:
   - **HIGH**: Blocks users or causes failures (missing prerequisites, broken workflows)
   - **MEDIUM**: Confuses users or degrades experience (unclear instructions, missing context)
   - **LOW**: Minor improvements (formatting, wording, nice-to-have details)
5. Establishes baseline quality score (0–10 scale)

**Output:**
```
DISCOVERY RESULTS
===============
File: README.md
Rubric: Documentation Clarity

Issues Found: 12
- HIGH: Prerequisites incomplete (missing Docker, pnpm)
- HIGH: No Step 3 (how to start project)
- MEDIUM: Onboarding unclear (where to type?)
- LOW: Fork instructions lack detail

Baseline Quality: 5/10 (clarity), 5/10 (completeness)
Next Step: Run `/optimize analyze` to get improvement proposals
```

---

### Mode 2: `optimize analyze`

**Purpose:** Generate improvement proposals

```
/optimize analyze --target=<file> --issues-from=<discovery_output>
/optimize analyze --target=src/errors.ts --domain=error-messages
/optimize analyze --target=README.md --count=5
```

**Parameters:**
- `--target=<file>`: File to optimize (required)
- `--issues-from=<file>`: Output from discover mode (JSON or text); omit to analyze without prior issues
- `--domain=<name>`: Force a specific domain category
- `--count=<n>`: Maximum proposals to generate (default: all issues)

**Quality Scale:** Scores are 0–10. The baseline comes from discover mode. Each proposal shows the estimated delta.

**Output:**
```
ANALYSIS RESULTS
===============
Generated 6 improvement proposals

Proposal 1: Add Docker Prerequisites
- Current: "That's all you need. Claude handles the rest."
- Proposed: "Before starting, ensure: Claude Code, VS Code, Docker, pnpm, Git, GitHub"
- Impact: Prevents #1 blocker (users can't run project)

Proposal 2: Add Step 3 - Docker Startup
- Current: [Missing]
- Proposed: "docker compose up -d --build"
- Impact: Users can now actually start project

Baseline Score (from discover): 5/10
Estimated Score After Applying All: 8/10 (+60%)

Next Step: Run `/optimize approve` to review proposals
```

---

### Mode 3: `optimize approve`

**Purpose:** Review proposals with optional verification

```
/optimize approve --proposals=<analysis_output>
/optimize approve --proposals=proposals.txt --verify
```

**Parameters:**
- `--proposals=<file>`: Proposals file from analyze step. Optional within the same session (carried forward automatically); required across sessions.
- `--verify`: Enable multi-LLM verification before each decision — see [VERIFICATION.md](references/VERIFICATION.md)
- `--personas=<list>`: Specific verification personas to use (only with `--verify`)
- `--threshold=<0-10>`: Confidence threshold — proposals below this score get a "LOW CONFIDENCE" warning and a "Recommend: REVIEW CAREFULLY" label instead of "Recommend: APPROVE". Does not auto-reject; the human always decides.

**What it does:**
1. Shows each proposal with before/after
2. (Optional with `--verify`) Runs multi-LLM verification — see [VERIFICATION.md](references/VERIFICATION.md)
3. Asks human for approve/reject/modify each proposal
4. Records approval decisions (stored in session context; use `--json` to write to stdout for cross-session use)

**Decision options:**
- **(A)pprove** — Accept the proposal as-is
- **(R)eject** — Skip this proposal
- **(M)odify** — Edit the proposal text inline. The skill prompts: "Enter your modified text:" and records the updated version. Modified proposals are NOT re-verified (the original score stands); re-run `optimize verify` manually if needed.
- **(D)Details** (verified mode only) — Shows full persona reports with reasoning. Returns to the decision prompt after viewing.

**With verification:**
```
PROPOSAL 1: Add Docker Prerequisites
- Confidence Score: 8.2/10 ✅ HIGH CONFIDENCE

Devil's Advocate: "Valid proposal, no critical issues"
Conservative: "Safe (docs only), zero regressions"
Pragmatist: "High ROI (saves users 20 minutes)"

Recommend: APPROVE
Your decision: (A)pprove / (R)eject / (M)odify / (D)Details
```

**Without verification (quick mode):**
```
PROPOSAL 1: Add Docker Prerequisites
- Before: "That's all you need"
- After: "Ensure: Claude Code, VS Code, Docker, pnpm, Git, GitHub"

Approve? (Y/N/M)
```

---

### Mode 4: `optimize apply`

**Purpose:** Implement approved changes

```
/optimize apply --approved=<approval_decisions>
/optimize apply --proposals=proposals.txt --approved-indices=1,2,4
```

**Parameters:**
- `--approved=<file>`: Approval decisions file from approve step (JSON format with proposal index, decision, and optional modifications)
- `--proposals=<file>` + `--approved-indices=<list>`: Alternative syntax — applies specific proposals by 1-based index (comma-separated) directly from the proposals file, skipping the approve step
- `--resume-at=<n>`: Resume from proposal N after a failure (skips already-committed proposals 1 through N-1)
- `--dry-run`: Preview changes as diffs without modifying files or creating commits

**What it does:**
1. Checks working directory is clean (`git status`); warns if uncommitted changes exist
2. Updates files with approved changes
3. Runs basic validation: syntax check for code files (e.g., `node --check` for JS/TS), format check for structured files (JSON/YAML parsing)
4. Creates a git commit per change (message format: `optimize: apply proposal N — {short description}`)
5. Reports success/failures

**With `--dry-run`:** Shows diffs of what would change per proposal without modifying files or creating commits.

**Output:**
```
APPLYING CHANGES
===============
Proposal 1: ✅ Updated README.md (line 8-17) — committed
Proposal 2: ✅ Updated README.md (after Step 2) — committed
Proposal 4: ✅ Updated README.md (new section) — committed

Applied: 3 proposals, 0 failures
Next Step: Run `/optimize measure` to see improvement
```

---

### Mode 5: `optimize measure`

**Purpose:** Quantify improvements

```
/optimize measure --target=<file> --rubric=<rubric>
/optimize measure --target=<file> --before-score=5.2
```

**Parameters:**
- `--target=<file>`: File to measure (required)
- `--rubric=<rubric>`: Evaluation rubric — should match the rubric used in discover for comparable before/after scores. If omitted, uses the same rubric as the discover step (from session context or domain default).
- `--before-score=X`: Manual baseline score (use when discover ran in a different session)

**Score dimensions:** Dimensions come from the rubric (e.g., error-messages rubric uses Clarity, Completeness, Actionability; a custom rubric may define different dimensions). The average across all dimensions is the headline score.

**Baseline detection:**
- **Automatic:** If discover ran in the same session, measure retrieves that baseline automatically
- **Manual:** If baseline was from a previous session, pass `--before-score=X`
- **Loop mode:** Baseline carries forward automatically from the previous cycle

**Convergence:** "Convergence achieved" means discover found 0 HIGH or MEDIUM severity issues in the last cycle. LOW-severity issues do not block convergence.

**Output:**
```
MEASUREMENT RESULTS
=================
BEFORE (Baseline): Clarity 5/10, Completeness 5/10, Actionability 6/10 — Avg 5.3/10
AFTER (Current):   Clarity 9/10, Completeness 9/10, Actionability 9/10 — Avg 9/10 (+69%)

STATUS: ✅ Convergence achieved (no HIGH/MEDIUM issues in last cycle)
```

---

### Mode 6: `optimize loop`

**Purpose:** Run multiple cycles automatically

```
/optimize loop --target=<file> --domain=<domain> --max-cycles=3
/optimize loop --target=<file> --until-convergence
```

Runs: discover → analyze → approve → apply → measure, then repeats.

**Approval gates:** By default, loop pauses at each cycle's approve step for human review. Use `--auto-approve` to skip (not recommended for production).

**Flag precedence:** `--until-convergence` takes precedence over `--max-cycles`. Use one or the other. When `--until-convergence` is used alone, a default safety cap of 10 cycles applies. If reached, the loop stops and shows the improvement trend, then asks: "Maximum cycles (10) reached. Continue? (Y/N)" — this prompt always requires human input, even when `--auto-approve` is active.

**Reassessment advisory:** If no convergence after 4 cycles, the loop warns: "4 cycles without convergence — consider adjusting the rubric or restructuring the target." This is advisory only; the loop continues unless the user intervenes.

**Edge cases:**
- **Immediate convergence (cycle 1):** If discover finds 0 HIGH/MEDIUM issues on the first cycle, loop exits immediately with a note: "No issues found on first cycle. Verify your rubric and target are configured correctly." This prevents silent success on a misconfigured rubric.
- **Score regression:** If measure detects that the score decreased after apply, loop pauses with: "Score decreased ({before} → {after}). Continue? (Y/N)" — even when `--auto-approve` is active.

**Output:**
```
CYCLE 1: 12 issues → 5 approved → 2/10 → 5/10 (+150%)
CYCLE 2: 4 issues  → 2 approved → 5/10 → 7/10 (+40%)
CYCLE 3: 0 issues  → CONVERGENCE ✅

FINAL: 2/10 → 7/10 (+250%) in 3 cycles
```

---

### Mode 7: `optimize template`

**Purpose:** Use pre-built domain templates

```
/optimize template --list
/optimize template --domain=error-messages --show
/optimize template --domain=error-messages --apply
```

**What it does:**
1. `--list`: Lists all available templates grouped by tier, showing domain name, time estimate, and expected improvement
2. `--show`: Shows template details (rubric criteria, before/after examples, collection method, expected impact)
3. `--apply`: Applies template and starts the full optimization cycle (discover → analyze → approve → apply → measure). Uses the domain's collection method to find target files — no `--target` needed.

Each template includes a rubric optimized for that domain. Templates are type-based (all error messages, all help text), not file-based. Override with `--custom-rubric=<file>`.

Full template catalog with rubrics and before/after examples: [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md)

---

### Mode 8: `optimize verify`

**Purpose:** Multi-LLM verification of proposals (standalone)

```
/optimize verify --proposal="Add Docker prerequisites to README"
/optimize verify --proposals=proposals.txt
/optimize verify --persona=devil_advocate
```

Runs proposals through three personas (Devil's Advocate, Conservative, Pragmatist) and synthesizes a confidence score. Can also be used as part of the approve flow with `--verify`.

Full details on personas, scoring, and when to use: [VERIFICATION.md](references/VERIFICATION.md)

---

### Mode 9: `optimize config`

**Purpose:** Customize optimization settings

```
/optimize config --show
/optimize config --set verification=enabled
/optimize config --set confidence-threshold=7.0
/optimize config --domain-specific error-messages --threshold=6.5
```

Full schema, validation rules, and example config: [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md)

---

### Mode 10: `optimize status`

**Purpose:** Show optimization history and metrics

```
/optimize status
/optimize status --domain=error-messages
/optimize status --export-json
```

Shows the last 10 cycles (or 30 days, whichever is smaller). Displays per-domain metrics and aggregate improvement trends.

**`--export-json`** writes a JSON file to the current directory (e.g., `optimize-status-2026-04-03.json`) with full cycle history. Use the global `--json` flag instead to write JSON to stdout (for piping). `--export-json` is a convenience alias that writes to a file.

**Output:**
```
[CYCLE 3] 2026-04-03 | error-messages | 25 min
  5/10 → 7/10 (+40%) | ✓ CONVERGENCE

[CYCLE 2] 2026-04-03 | error-messages | 28 min
  2/10 → 5/10 (+150%) | → Continuing

SUMMARY: error-messages 2/10 → 7/10 (+250%) in 3 cycles
```

---

## Decision Tree

```
What do you want to do?
├─ See what's broken?           → /optimize discover
├─ Get improvement ideas?       → /optimize analyze
├─ Review proposals?            → /optimize approve [--verify]
├─ Make changes?                → /optimize apply
├─ Measure impact?              → /optimize measure
├─ Run multiple cycles?         → /optimize loop
├─ Use pre-built template?      → /optimize template --domain=<name>
├─ Get detailed verification?   → /optimize verify
├─ Adjust settings?             → /optimize config
└─ See history?                 → /optimize status
```

## Quick Start: Full Cycle in 20 Minutes

```bash
# Step 1: Discover issues (5 min)
/optimize discover --target=src/errors.ts --domain=error-messages

# Step 2: Get proposals (5 min) — issues from step 1 carry forward automatically
/optimize analyze --target=src/errors.ts --domain=error-messages

# Step 3: Review & approve (5 min) — proposals from step 2 carry forward automatically
/optimize approve

# Step 4: Apply changes (2 min) — approval decisions from step 3 carry forward automatically
/optimize apply

# Step 5: Measure improvement (3 min) — baseline from step 1 carries forward automatically
/optimize measure --target=src/errors.ts
```

For verified approval (adds ~15 min), use `/optimize approve --verify` in step 3.

## Parameters

### Global
- `--help` — Show mode-specific help: parameter list, usage examples, and one-line descriptions
- `--verbose` — Show detailed output: includes rubric evaluation reasoning (discover), per-issue scoring (analyze), persona full-text responses (verify). Mutually exclusive with `--quiet`; if both are given, `--verbose` wins.
- `--dry-run` — Preview without applying (apply mode: shows diffs, no commits; loop mode: shows what each cycle would do)
- `--json` — Output in structured JSON format (writes to stdout). Useful for piping between modes across sessions. Each mode defines its own JSON schema matching its output fields.
- `--quiet` — Minimal output: single-line summary per mode (e.g., discover: "12 issues found, baseline 5/10"). Mutually exclusive with `--verbose`.

### Domain
- `--domain=<name>` — Use pre-built domain template
- `--target=<file>` — File to optimize
- `--rubric=<file>` — Evaluation rubric to use

### Verification
- `--verify` — Enable multi-LLM verification
- `--personas=<list>` — Specific personas (devil_advocate, conservative, pragmatist)
- `--threshold=<0-10>` — Confidence threshold

### Cycle
- `--max-cycles=<n>` — Maximum cycles (default: 3, must be ≥ 1)
- `--until-convergence` — Loop until 0 HIGH/MEDIUM issues found (safety cap: 10 cycles)
- `--auto-approve` — Skip human approval (not recommended for production)

## State Between Modes

**Within a single session:** Each mode's output is held in conversation context and automatically passed to the next mode. No file flags are needed — just run the modes in order.

**Across sessions:** State is not persisted between conversations. Use explicit file flags to pass data:
- **discover → analyze:** `--issues-from=<file>` (accepts JSON or plain text — discover outputs JSON by default when `--json` is used, otherwise plain text matching the output format shown above)
- **analyze → approve:** `--proposals=<file>` (JSON array of proposal objects with index, description, current/proposed text, and impact)
- **approve → apply:** `--approved=<file>` (JSON with proposal index, decision: approve/reject/modify, and optional modifications)
- **discover → measure:** `--before-score=X` (single number, the baseline average from discover)

**If you forget a flag in a new session:** The mode runs without prior context — analyze generates proposals from scratch (no prior issues), measure reports current score only (no delta). No error is raised; the mode simply operates independently.

## Error Handling

Full error catalog with recovery steps: [ERROR_HANDLING.md](references/ERROR_HANDLING.md)

## Safety Features

- **Human approval required** — Approval gates every change by default
- **Verification optional** — Multi-LLM verification catches errors before apply
- **Dry-run mode** — Preview changes before applying (`--dry-run`)
- **Reversible** — All changes are git commits, easy to revert
- **Measurable** — Always shows before/after metrics

## Common Workflows

| Workflow | Steps | Time |
|---|---|---|
| Quick single improvement | discover → analyze → approve → apply → measure | 20 min |
| Full cycle with verification | discover → analyze → approve --verify → apply → measure | 35 min |
| Iterative optimization | loop (full cycle × N until convergence) | 1–2 hrs |
| Template-guided | template → full cycle | 30 min |

## Related Skills

- `/task` — Save work between sessions
- `/implement` — Larger implementation projects
- `/doc` — Create and manage documents
- `/skill-dev` — Test and validate skills

## References

- [ERROR_HANDLING.md](references/ERROR_HANDLING.md) — Error catalog with recovery steps
- [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md) — Configuration schema and validation rules
- [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md) — Template catalog with rubrics and examples
- [VERIFICATION.md](references/VERIFICATION.md) — Multi-LLM verification personas and scoring
- [BEST_PRACTICES.md](references/BEST_PRACTICES.md) — Lessons learned, when to use/skip optimization
