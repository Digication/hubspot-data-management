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

General notes on conversational UI patterns for skills: [CONVERSATIONAL_UI.md](references/CONVERSATIONAL_UI.md)

---

## Entry Point

This skill uses **conversational invocation** — the user describes what they want in natural language, and you infer the intent. There are no required parameters or flags. Never tell the user to run a command with `--flags`.

### Intent Detection

When the user invokes `/optimize` (or says "optimize", "improve", "review", etc.), classify their intent:

| User says something like... | Inferred intent | What to do |
|---|---|---|
| "optimize README.md" / "improve my docs" | Loop (full cycle) | Smart skip → confirm defaults → run |
| "optimize loop README.md" | Loop (explicit) | Smart skip → confirm defaults → run |
| "what's wrong with this file?" / "check README" | Discover only | Run discover, show results |
| "suggest improvements for X" | Analyze only | Run discover + analyze, show proposals |
| "verify these proposals" | Verify only | Run verification on active proposals |
| "show optimization status" / "how's it going?" | Status | Show history |
| "generate a rubric for error messages" | Rubric | Run rubric generation |
| Ambiguous or no target specified | Interview | Ask clarifying questions |

### Smart Skip

When the user's intent is clear (target file + mode are both obvious), **skip the full interview** and show a short confirmation prompt instead:

**Example:** User says "optimize loop README.md"
→ Intent is clear: loop mode, target is README.md
→ Show one confirmation prompt with defaults:

```
Use AskUserQuestion:
- Target: README.md — correct? (options: Yes / Choose different file)
- Detail level: Short / Medium (Recommended) / Detailed
- Max cycles: 3 (default) — adjust? (options: 3 (Recommended) / 5 / Let me decide after each cycle)
```

When the user's intent is **ambiguous** (no target, unclear what they want), run the full Interview.

---

## Interview

Use `AskUserQuestion` prompts — never ask questions as inline text. This gives the user clickable options instead of requiring typed responses.

### When to Interview

- User provides no target file
- User's intent doesn't match any row in the Intent Detection table
- User says "optimize" with no other context
- First time using optimize in this project (no prior history)

### Interview Flow

**Prompt 1 — Intent & Target** (always ask if not clear from context):

```
AskUserQuestion:
  Q1: "What would you like to optimize?"
      header: "Target"
      options:
        - "A specific file" → follow up asking which file
        - "All files of a type (e.g., error messages, docs)" → follow up with domain selection
        - "I'm not sure — help me decide" → read the project and suggest targets

  Q2: "What's your goal?"
      header: "Goal"
      options:
        - "Run a full improvement cycle (Recommended)" → loop mode
        - "Just find issues, don't fix yet" → discover only
        - "I have issues already, suggest fixes" → analyze only
```

**Prompt 2 — Strategy** (only if loop/full cycle selected):

```
AskUserQuestion:
  Q1: "How much detail do you want to see as I work?"
      header: "Detail"
      options:
        - "Just the results" → short verbosity
        - "Results + reasoning (Recommended)" → medium verbosity
        - "Everything — models used, decisions, scores" → detailed verbosity

  Q2: "How many improvement cycles?"
      header: "Cycles"
      options:
        - "Up to 3 (Recommended)" → max_cycles=3
        - "Up to 5" → max_cycles=5
        - "I'll decide after each one" → pause after each cycle
```

### Recap After Interview

After collecting all interview answers, print a numbered checklist recap as an inline message (not a prompt) so the user can see the plan at a glance before work begins:

```
Here's what I'll do:

1. Target: README.md
2. Goal: Full improvement cycle (discover → analyze → approve → apply → measure)
3. Detail level: Medium — results + reasoning
4. Max cycles: 3
5. Approval: Review proposals each cycle
6. Report: Generate at the end

```

After showing the recap, use `AskUserQuestion` to confirm before starting:

```
AskUserQuestion:
  Q1: "Does this plan look right?"
      header: "Confirm"
      options:
        - "Looks good, start (Recommended)" → begin Discover
        - "Adjust something" → ask which item to change, update, re-show recap
```

Do not begin work until the user confirms. This gives them a chance to catch mistakes or adjust priorities before any cycles run.

### Respecting User Profile

Read `.claude/user-context.md` for tier and purpose. Adjust the interview:

| Tier | Interview behavior |
|---|---|
| **Guided** | Use the plainest language. Pre-select "Recommended" options. Explain what each choice means. |
| **Supported** | Use plain language. Show recommendations. |
| **Standard** | Show options without lengthy explanations. |
| **Expert** | Skip interview when possible. Show compact confirmation. |

---

## Verbosity Levels

The user chooses their verbosity level during the interview (or it defaults to **medium**). This controls what's displayed throughout the session.

| Level | What's shown | What's hidden |
|---|---|---|
| **Short** | Final scores, proposal table, approval prompt | Rubric reasoning, per-issue scoring, model details |
| **Medium** (default) | Everything in Short + rubric dimensions, issue list with severity, before/after previews | Model selection reasoning, subagent details |
| **Detailed** | Everything in Medium + which model runs each step, subagent spawn details, scoring rationale, decision reasoning, cost notes | Nothing hidden |

### Detailed Mode Output

When verbosity is **detailed**, add a status line before each phase:

```
[Phase: Discover] Model: claude-opus-4-6 (subagent) — Opus is used here because rubric quality
sets the ceiling for all downstream work. If discover misses an issue, no later step can fix it.
```

And after each phase:

```
[Discover complete] 12 issues found, baseline 5.2/10. Moving to Analyze (claude-sonnet-4-6, main session).
```

---

## Phases

### Discover

**Purpose:** Identify issues in current state.

**Model selection:** Defaults to Opus subagent (`model: "opus"`) — rubric quality sets the ceiling for the entire optimization. If discover misses an issue, no later step can fix it. Other phases use the current conversation model.

**What it does:**
1. Reads target file/spec. When a domain is specified, uses the domain template's collection method to find matching files — see [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md).
2. Selects rubric: uses provided rubric if any, else domain template default, else generates one using the [Rubric Generation Protocol](references/RUBRIC_PROTOCOL.md) with Stakeholder Analysis and Failure Mode Analysis (5-7 dimensions).
3. Identifies gaps, contradictions, missing information.
4. Outputs structured list of issues with severity:
   - **HIGH**: Blocks users or causes failures (missing prerequisites, broken workflows)
   - **MEDIUM**: Confuses users or degrades experience (unclear instructions, missing context)
   - **LOW**: Minor improvements (formatting, wording, nice-to-have details)
5. Establishes baseline quality score (0–10 scale).

**Score variation note:** Each discover/measure step uses a fresh, independent evaluation agent. Like two different teachers grading the same essay, scores may vary slightly between steps (±0.5–1.0 points is normal). The important number is the delta within each cycle, not the absolute score between cycles. When verbosity is medium or detailed, mention this on the first cycle.

### Rubric Confirmation (after Discover, before Analyze)

After Discover completes, show the rubric dimensions and baseline scores, then confirm with the user before proceeding to Analyze. This is important because the rubric shapes all proposals — if it's wrong, everything downstream will be off.

Display the rubric inline:

```
The rubric I'll use to evaluate and improve this file:

| # | Dimension | Score | What it measures |
|---|-----------|-------|------------------|
| 1 | Clarity | 5/10 | Can readers understand the content quickly? |
| 2 | Completeness | 4/10 | Are all necessary sections present? |
| 3 | ... | ... | ... |

Baseline: 4.8/10 average across 5 dimensions
Issues found: 12 (5 HIGH, 4 MEDIUM, 3 LOW)
```

Then use AskUserQuestion:

```
AskUserQuestion:
  Q1: "Does this rubric look right for what you want to improve?"
      header: "Rubric"
      options:
        - "Looks good, continue (Recommended)"
        - "Adjust it — I want to focus on different things" → ask what to change, regenerate
        - "Skip rubric review — just go" → proceed without confirmation (for experienced users)
```

**On first cycle only.** Subsequent cycles reuse the same rubric without re-confirming.

---

### Analyze

**Purpose:** Generate improvement proposals.

Uses the current conversation model (typically Sonnet). Reads the issues from discover and generates specific before/after proposals for each one.

**Formatting proposals with embedded code:** When proposed text contains markdown code blocks, do NOT wrap the entire before/after in a fenced code block — this creates broken nested fences. Use blockquotes (`>`) for multi-line proposed content that contains code blocks.

**Before/after display:** Always show the current text and proposed replacement for each proposal. This is not optional — the user must see exactly what will change.

**Store proposals as JSON:** Write the proposals to `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json` for use in the report page. Schema:

```json
[
  {
    "index": 1,
    "title": "Add Docker Prerequisites",
    "severity": "HIGH",
    "current": "That's all you need.",
    "proposed": "Before starting, ensure: Claude Code, VS Code, Docker...",
    "impact": "Prevents #1 blocker",
    "decision": null,
    "modified_text": null
  }
]
```

The `decision` and `modified_text` fields are populated during the approval step.

---

### Approve

**Purpose:** Human reviews and decides on each proposal.

**Batch approval with table:** Present ALL proposals in a single table, then ask for decisions via one `AskUserQuestion` prompt. Never ask per-proposal inline questions.

**Display format:**

```
| # | Proposal | Severity | Impact | Recommend |
|---|----------|----------|--------|-----------|
| 1 | Add Docker prerequisites | HIGH | Prevents setup failure | Approve |
| 2 | Add clone command | HIGH | Unblocks Step 1 | Approve |
| 3 | Add license section | MEDIUM | Legal clarity | Approve |
```

Then use AskUserQuestion:

```
AskUserQuestion:
  Q1: "How would you like to handle these proposals?"
      header: "Approval"
      options:
        - "Approve all (Recommended)"
        - "Reject all"
        - "Let me review individually" → show each proposal with before/after,
          then prompt with Approve / Reject / Modify for each
```

**When reviewing individually**, show full before/after content for each proposal and use `AskUserQuestion` with explicit labels — **Approve**, **Reject**, **Modify** (never abbreviations like A/R/M).

**Decision options:**
- **Approve** — Accept the proposal as-is
- **Reject** — Skip this proposal
- **Modify** — User edits the proposal text. Prompt: "Enter your modified text:" and record the updated version.

After approval, update `decision` and `modified_text` fields in `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json`.

---

### Apply

**Purpose:** Implement approved changes.

**What it does:**
1. Checks working directory status (`git status`); warns if uncommitted changes exist
2. Updates files with approved changes
3. Runs basic validation: syntax check for code files (e.g., `node --check` for JS/TS), format check for structured files (JSON/YAML parsing)
4. Reports success/failures with before/after summary

**Committing:** Do NOT auto-commit changes. The skill applies edits to files but leaves them uncommitted. The user decides when and how to commit (or may prefer to review the diff first).

> **Note:** If the user's onboarding preferences specify auto-commit, respect that. Otherwise, after applying, say: "Changes applied. Want me to commit them?"

**Batching:** When multiple proposals target the same file, apply them all in a single write operation rather than one-at-a-time. This is cleaner and avoids intermediate broken states.

---

### Measure

**Purpose:** Quantify improvements.

Uses a fresh Opus subagent — same model as discover, same independence requirement.

**What it does:**
1. Re-reads the updated file
2. Scores all rubric dimensions from scratch (no anchoring to prior scores)
3. Compares to the baseline from discover
4. Reports per-dimension and average scores with deltas

**Convergence:** "Convergence achieved" means the latest discover found 0 HIGH or MEDIUM severity issues. LOW-severity issues do not block convergence.

**Output includes before/after per dimension:**
```
BEFORE: Clarity 5/10, Completeness 5/10, Actionability 6/10 — Avg 5.3/10
AFTER:  Clarity 9/10, Completeness 9/10, Actionability 9/10 — Avg 9.0/10 (+70%)
```

---

### Verify (Optional)

**Purpose:** Multi-LLM verification of proposals.

Runs proposals through three personas (Devil's Advocate, Conservative, Pragmatist) and synthesizes a confidence score. Can be requested during the interview or at any time.

Full details on personas, scoring, and when to use: [VERIFICATION.md](references/VERIFICATION.md)

---

## Loop Mode

**Purpose:** Run multiple cycles: discover → analyze → approve → apply → measure, then repeat.

### Cycle Behavior

**Max cycles:** Determined during interview. Default is 3. The user can also choose "I'll decide after each one" — in that case, ask after each measure step whether to continue.

**Fresh evaluation per cycle:** Each cycle's discover step MUST perform a full, independent rubric evaluation — re-read the file and score all dimensions from scratch. Do not carry scores or issue lists forward. This prevents anchoring bias.

**Approval gate per cycle:** After each analyze step, show the batch approval table and use `AskUserQuestion`. This is the only prompt per cycle (besides the initial interview).

### Stopping Conditions

| Condition | What happens |
|---|---|
| No HIGH/MEDIUM issues in discover | Convergence — inform user, ask if they want another cycle anyway |
| Max cycles reached | Stop, show summary, ask "Continue for more cycles?" |
| Score regression (score went down) | Pause with warning, ask to continue or revert |
| 4 cycles without convergence | Advisory: "Consider adjusting the rubric or restructuring the target" |
| Immediate convergence (cycle 1) | Note: "No issues found. Verify rubric and target are configured correctly." |

**Important:** Convergence is informational, not a hard stop. Always let the user decide whether to continue.

---

## Report Generation

After the final cycle (or when the user requests), offer to generate a visual report.

### When to Offer

After the last measure step, use `AskUserQuestion`:

```
AskUserQuestion:
  Q1: "Want me to create a visual report with charts?"
      header: "Report"
      options:
        - "Yes, generate report (Recommended)"
        - "No, skip"
```

### How to Generate

1. Read the HTML template from `assets/report-template.html` (relative to this skill's base path)
2. Populate the `{{PLACEHOLDER}}` tokens with data from the session:
   - `{{TOPIC}}` — target file name or domain
   - `{{DATE}}` — current date
   - `{{SCORE_BEFORE}}`, `{{SCORE_AFTER}}`, `{{SCORE_DELTA_PCT}}`
   - `{{TOTAL_CYCLES}}`, `{{TOTAL_PROPOSALS}}`
   - `{{TARGET_FILE}}`
   - `{{CYCLE_CARDS}}` — generate HTML for each cycle summary
   - `{{PROPOSAL_TABLES}}` — generate HTML tables per cycle with before/after + decisions
   - `{{MODEL_USAGE_ROWS}}` — table rows showing which model ran each step and why
   - `{{RUBRIC_DEFINITION}}` — full rubric table with dimension name, definition, and score anchors (0/5/10)
   - `{{RUBRIC_ROWS}}` — before/after scores per dimension with delta
   - `{{SCORE_CHART_SVG}}` — generate an inline SVG chart showing score progression
3. Write the populated report to `./tmp/<topic>/report.html`
4. Write the proposals JSON to `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json` (if not already written)
5. **Print the path and ask if the user wants to open it:**
   - Print: `Report saved to ./tmp/<topic>-<UTC_TIMESTAMP>/report.html`
   - Then use AskUserQuestion: "Open the report in your browser?"
     - "Yes, open it" → run `open <ABSOLUTE_PATH>/tmp/<topic>-<UTC_TIMESTAMP>/report.html` (macOS) or `xdg-open` (Linux) or `start` (Windows)
     - "No, I'll open it later"
   > **Note:** VS Code blocks local file links and `file://` URLs from opening in a browser. The `open` command is the only reliable way to launch HTML reports externally.

### Output Folder Naming

Use UTC timestamp suffix to avoid conflicts when the user runs optimize multiple times on the same file:

```
./tmp/<topic>-<UTC_TIMESTAMP>/
```

Example: `./tmp/readme-20260403T143022Z/`

Generate the timestamp as `YYYYMMDD'T'HHmmss'Z'` using UTC time.

### Static vs. Generated Assets

| Type | Location | Example |
|---|---|---|
| **Static** (skill infrastructure) | `.claude/skills/optimize/assets/` | `report-template.html`, static SVG diagrams |
| **Generated** (session data) | `./tmp/<topic>-<UTC_TIMESTAMP>/` in project root | `report.html`, `proposals.json` |

### Inlining Static Diagrams

The report template has a **second tab ("How It Works")** with static explanatory diagrams. These SVGs live in `assets/` but **cannot be referenced via file paths** from the generated HTML in `./tmp/`. Instead, **read each SVG file and inline its content** into the HTML template placeholders:

- `{{DIAGRAM_LOOP_FLOWCHART}}` ← inline contents of `assets/01-loop-flowchart.svg`
- `{{DIAGRAM_CONTINUE_OR_STOP}}` ← inline contents of `assets/04-continue-or-stop.svg`
- `{{DIAGRAM_MODEL_SELECTION}}` ← inline contents of `assets/06-model-selection.svg`

This makes the report a **single self-contained HTML file** with no external dependencies.

---

## Standalone Modes

These modes run independently without the full loop. Infer from user intent — don't require explicit mode names.

### Template

**When:** User mentions a specific domain ("check our error messages", "optimize help text").

**What it does:**
1. Lists all available templates grouped by tier, showing domain name, time estimate, and expected improvement
2. Shows template details (rubric criteria, before/after examples, collection method, expected impact)
3. When user selects one: starts the full optimization cycle using the domain's rubric and collection method

Full template catalog: [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md)

### Rubric

**When:** User wants to generate or audit a rubric ("create a rubric for email templates", "audit the error-messages rubric").

**What it does (follows the [Rubric Generation Protocol](references/RUBRIC_PROTOCOL.md)):**
1. **Stakeholder Analysis** — Identifies 4+ stakeholders
2. **Failure Mode Analysis** — What goes wrong for each stakeholder
3. **Dimension Selection** — 5-7 dimensions with 0/5/10 anchors
4. **Adversarial Validation** — Tests rubric against sample file (if provided)

### Config

**When:** User wants to adjust settings ("change the confidence threshold", "show my optimize settings").

Full schema and validation: [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md)

### Status

**When:** User wants to see history ("show optimization history", "how did the last run go?").

Shows the last 10 cycles (or 30 days). Displays per-domain metrics and trends.

---

## Safety Features

- **Human approval required** — Approval gate every cycle by default
- **No auto-commit** — Changes are applied to files but not committed unless the user asks
- **Verification optional** — Multi-LLM verification available on request
- **Dry-run available** — Say "show me what would change" to preview without applying
- **Reversible** — If changes were committed, easy to revert with git
- **Measurable** — Always shows before/after metrics

---

## State Between Sessions

**Within a session:** Each phase's output is held in conversation context and automatically passed to the next phase. Proposals are also saved to `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json`.

**Across sessions:** State is not persisted in conversation. Use the JSON files in `./tmp/<topic>-<UTC_TIMESTAMP>/` to resume, or start fresh (the skill runs independently without prior context).

---

## Error Handling

Full error catalog with recovery steps: [ERROR_HANDLING.md](references/ERROR_HANDLING.md)

---

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
- [RUBRIC_PROTOCOL.md](references/RUBRIC_PROTOCOL.md) — 4-step protocol for generating and auditing rubrics
- [BEST_PRACTICES.md](references/BEST_PRACTICES.md) — Lessons learned, when to use/skip optimization
- [CONVERSATIONAL_UI.md](references/CONVERSATIONAL_UI.md) — Conversational UI patterns for skills
