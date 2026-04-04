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

### File Reference Detection

Before classifying intent, check whether the user's message already contains a file reference (e.g., `@path/to/file.md`, a file path, or a file attached via IDE context). If a file reference is present, treat it as the target — do not ask "What would you like to optimize?" since the user already answered that by providing the file.

A referenced file counts as a known target for Intent Detection and Smart Skip, even if the user didn't explicitly say "optimize [filename]."

### Intent Detection

When the user invokes `/optimize` (or says "optimize", "improve", "review", etc.), classify their intent:

| User says something like... | Inferred intent | What to do |
|---|---|---|
| "optimize README.md" / "improve my docs" | Loop (full cycle) | Smart skip → confirm defaults → run |
| "optimize loop README.md" | Loop (explicit) | Smart skip → confirm defaults → run |
| "what's wrong with this file?" / "check README" | Discover only | Run discover, show results |
| "suggest improvements for X" | Analyze only | Run discover + analyze, show proposals |
| "verify these proposals" | Verify only | Run verification on active proposals |
| "generate a rubric for error messages" | Rubric | Run rubric generation |
| Ambiguous or no target specified | Interview | Ask clarifying questions |

### Smart Skip

Skip the full interview and show a short confirmation prompt when **both** conditions are met:
1. **Target is known:** The user named a file, referenced a file (see File Reference Detection), or a domain template matches unambiguously
2. **Mode is known:** The user's words match a specific row in the Intent Detection table (not the "Ambiguous" row)

If either condition is missing, run the full Interview.

**Example:** User says "optimize loop README.md"
→ Target known: README.md. Mode known: "loop" matches "Loop (explicit)".
→ Both conditions met — show one confirmation prompt with defaults:

```
Use AskUserQuestion:
- Target: README.md — correct? (options: Yes / Choose different file)
- Detail level: Short / Medium (Recommended) / Detailed
- Max cycles: 3 (default) — adjust? (options: 3 (Recommended) / 5 / Let me decide after each cycle)
```

**Examples of when NOT to skip:**
- "optimize" (no target, no mode) → Interview
- "improve things" (no target) → Interview
- "check README.md" (target known, mode known: "Discover only") → Smart Skip
- User attaches a file but says nothing else (target known, mode unknown) → Interview

---

## Interview

Use `AskUserQuestion` prompts — never ask questions as inline text. This gives the user clickable options instead of requiring typed responses.

### When to Interview

- User provides no target file **and** no file reference was detected (see File Reference Detection)
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

**Model selection:** Defaults to Opus subagent — rubric quality sets the ceiling for the entire optimization. If discover misses an issue, no later step can fix it. Other phases use the current conversation model.

**How to spawn the subagent:** Use the `Agent` tool with `model: "opus"`. Provide a prompt that includes:
1. The target file content (or a summary if too large — see Context Window Management below)
2. The rubric dimensions and scoring anchors
3. Instructions to output a structured list of issues with severity (HIGH/MEDIUM/LOW) and a baseline score (0-10)

Collect the subagent's response and parse the issues list and baseline score for use in the next phase.

**What it does:**
1. Reads target file/spec. When a domain is specified, uses the domain template's collection method to find matching files — see [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md).
2. **Audience detection:** Before generating a rubric, classify the target audience using these rules in priority order (first match wins):
   1. **User-specified:** If the user stated the audience (e.g., "this is for developers"), use that — skip the rules below.
   2. **Path-based rules:**
      - `.claude/skills/**` or `.claude/CLAUDE.md` → **AI agent**
      - `src/**`, `lib/**`, `packages/**` (code files) → **developer**
      - `docs/**`, `*.md` in project root (except CLAUDE.md) → **human reader**
      - `.github/**`, `Dockerfile`, `docker-compose*`, `*.yml` in CI paths → **ops/DevOps**
   3. **Content-based fallback** (if path is ambiguous) — check the first 50 lines for these signals:
      - **AI agent** (2+ of): imperative verbs as line-starters ("Run", "Use", "Check"), numbered phases/steps, rule tables with "When X do Y" format, ALL-CAPS keywords (MUST, NEVER, ALWAYS), `{{placeholder}}` tokens
      - **Human reader** (2+ of): first-person or second-person prose ("you can", "we recommend"), paragraphs of 3+ sentences, no code blocks in the first 30 lines, FAQ or tutorial structure
      - **Developer** (2+ of): code blocks or inline code in >30% of lines, import/require statements, function/class definitions, JSDoc/docstring comments
      - If signals are mixed or fewer than 2 match any category → **mixed**
   4. **Default:** **mixed** (e.g., README read by both humans and CI)

   Show the classification and confirm with the user via `AskUserQuestion` before proceeding. The audience shapes the entire rubric — "clarity" means something different for an AI agent (unambiguous, machine-parseable instructions) vs. a human reader (plain language, scannable headings). Getting this wrong produces irrelevant proposals.
3. Selects rubric using this priority order:
   - **User-provided rubric file:** If the user attached or referenced a rubric file (e.g., `@my-rubric.md` or "use this rubric"), read it and validate that it contains dimension names with 0/5/10 score anchors. If the format is invalid, show what's wrong and offer to fix it or generate a new one.
   - **Domain template default:** If a domain template is active, use its built-in rubric.
   - **Generate fresh:** Use the [Rubric Generation Protocol](references/RUBRIC_PROTOCOL.md) with Stakeholder Analysis and Failure Mode Analysis (5-7 dimensions).
   
   **The rubric must reflect the confirmed audience** — dimensions, scoring anchors, and severity definitions should all be calibrated to what matters for that audience.
4. Identifies gaps, contradictions, missing information.
5. Outputs structured list of issues with severity:
   - **HIGH**: Blocks users or causes failures (missing prerequisites, broken workflows)
   - **MEDIUM**: Confuses users or degrades experience (unclear instructions, missing context)
   - **LOW**: Minor improvements (formatting, wording, nice-to-have details)
6. Establishes baseline quality score (0–10 scale).

**Score variation note:** Each discover/measure step uses a fresh, independent evaluation agent. Like two different teachers grading the same essay, scores may vary slightly between steps (±0.5–1.0 points is normal). The important number is the delta within each cycle, not the absolute score between cycles. When verbosity is medium or detailed, mention this on the first cycle.

### Rubric Confirmation (after Discover, before Analyze)

After Discover completes, show the rubric dimensions and baseline scores, then confirm with the user before proceeding to Analyze. This is important because the rubric shapes all proposals — if it's wrong, everything downstream will be off.

Display the rubric inline (include the confirmed audience so the user can verify the rubric matches):

```
Target audience: <predicted and confirmed audience, e.g., "AI agent", "developer", "end user">

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

Uses the current conversation model (typically Sonnet). Reads the issues from discover and generates specific before/after proposals for each one. When generating proposals, also check for duplication (same idea in multiple places), unnecessary content (sections no workflow references), and verbosity (content that could be shorter without losing meaning) — surface these as proposals even if not explicitly flagged by the rubric.

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

### Verify (Optional)

**Purpose:** Multi-LLM verification of proposals.

Runs proposals through three personas (Devil's Advocate, Conservative, Pragmatist) and synthesizes a confidence score. Can be requested during the interview or at any time. When verification is enabled in config, it runs automatically between Analyze and Approve.

Full details on personas, scoring, and when to use: [VERIFICATION.md](references/VERIFICATION.md)

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

**How to run:** Spawn a fresh Opus subagent using the `Agent` tool with `model: "opus"`. This must be a new invocation (not the same one used for discover) to ensure independent scoring. Provide:
1. The updated file content
2. The same rubric dimensions used in discover
3. Instructions to score all dimensions from scratch (no anchoring to prior scores) and return per-dimension scores

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
| Score regression (score dropped by more than 1.0 point) | Pause with warning: "Score dropped by X.X points (from Y to Z). Drops of up to 1.0 can be normal scoring variation, but this exceeds that range." Ask to continue or revert. |
| Score dip within noise (score dropped by 1.0 or less) | Note at medium/detailed verbosity: "Score dipped slightly (Y → Z) — this is within normal ±1.0 variation between independent evaluations." Continue without pausing. |
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
   - `{{SCORE_CHART_SVG}}` — generate an inline SVG bar chart showing score progression. Specifications:
     - **Dimensions:** `width="600" height="200"` with `viewBox="0 0 600 200"`
     - **Structure:** One group of paired bars per cycle (before = `#e2e8f0`, after = `#7c3aed`), x-axis labels ("Cycle 1", "Cycle 2", ...), y-axis scale 0-10
     - **Layout:** 60px left margin for y-axis labels, bars 40px wide with 20px gap between before/after, 60px gap between cycles
     - **Labels:** Score value centered above each bar (font-size 12px, font-family system-ui)
     - **Single cycle:** If only 1 cycle, show a single before/after pair centered
     - Calculate bar height as `score / 10 * 180` (max bar height 180px), y position as `180 - barHeight + 10`
3. Write the populated report to `./tmp/<topic>-<UTC_TIMESTAMP>/report.html`
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

**Output:** Display the generated rubric inline as a markdown table (dimensions, 0/5/10 anchors, what each measures). Then ask:

```
AskUserQuestion:
  Q1: "What would you like to do with this rubric?"
      header: "Rubric Output"
      options:
        - "Save to file" → write to `.claude/rubrics/<domain>.md` and confirm path
        - "Use it now — start optimizing" → transition to loop mode with this rubric
        - "Just reviewing — done for now" → end
```

### Config

**When:** User wants to adjust settings ("change the confidence threshold", "show my optimize settings").

**How it works:**
1. Settings are stored in `.claude/optimize-config.json` at the project root
2. If the file doesn't exist, use defaults (verification: enabled, confidence threshold: 6.0, auto-approve: false)
3. When the user asks to change a setting, validate the value against [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md), then update the JSON file
4. When the user asks to see settings, read the file and display current values in a readable format

**Integration with other phases:** At the start of any optimization cycle, read `.claude/optimize-config.json` (if it exists) and apply the settings. For example, if `verification` is `enabled`, automatically run verification during the approve step. If a domain-specific override exists for the current target's domain, use those values instead of the globals.

---

## Safety Features

- **Human approval required** — Approval gate every cycle by default
- **No auto-commit** — Changes are applied to files but not committed unless the user asks
- **Verification optional** — Multi-LLM verification available on request
- **Reversible** — If changes were committed, easy to revert with git
- **Measurable** — Always shows before/after metrics

---

## Context Window Management

**Maximum file size:** If the target file exceeds ~800 lines or ~30KB, do not load the entire file into the subagent prompt. Instead:
1. Read the file in chunks, focusing on sections relevant to the rubric dimensions
2. For discover: summarize each section and note line ranges, then evaluate
3. For apply: edit specific line ranges rather than rewriting the entire file

**Multiple files (domain mode):** When a domain template collects many files, process them in batches of 5-10 files per subagent call. Prioritize files with the most issues.

**Subagent prompt size:** Keep subagent prompts under 50K tokens total (file content + rubric + instructions). If the content is larger, summarize or split across multiple calls.

## State Between Sessions

**Within a session:** Each phase's output is held in conversation context and automatically passed to the next phase. Proposals are also saved to `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json`.

**Across sessions:** State is not persisted in conversation. Use the JSON files in `./tmp/<topic>-<UTC_TIMESTAMP>/` to resume, or start fresh (the skill runs independently without prior context).

---

## Error Handling

Full error catalog with recovery steps: [ERROR_HANDLING.md](references/ERROR_HANDLING.md)

---

## References

- [ERROR_HANDLING.md](references/ERROR_HANDLING.md) — Error catalog with recovery steps
- [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md) — Configuration schema and validation rules
- [DOMAIN_TEMPLATES.md](references/DOMAIN_TEMPLATES.md) — Template catalog with rubrics and examples
- [VERIFICATION.md](references/VERIFICATION.md) — Multi-LLM verification personas and scoring
- [RUBRIC_PROTOCOL.md](references/RUBRIC_PROTOCOL.md) — 4-step protocol for generating and auditing rubrics
- [BEST_PRACTICES.md](references/BEST_PRACTICES.md) — Lessons learned, when to use/skip optimization
- [CONVERSATIONAL_UI.md](references/CONVERSATIONAL_UI.md) — Conversational UI patterns for skills
