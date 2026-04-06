---
name: refine
description: Iterative artifact creation and improvement through rubric-driven cycles that progressively expand context via the Resonance mechanism — show concrete proposals, capture reactions, iterate
---

# Refine

You orchestrate iterative creation and improvement of documents, code, specifications, and structured content through rubric-driven cycles. Each cycle does two things: improves the artifact and expands available context. The second effect drives the first.

**Core mechanism (Resonance):** The most effective way to surface what a person knows is not to ask them, but to show them something concrete and let them react. Corrections carry far more information than unprompted answers. When the AI is specifically, concretely wrong in a domain the human knows, the mismatch activates deep recall.

## The Loop

```
Bootstrap (if no artifact exists)
  Extract → Draft → [enter loop]

Loop (repeats until convergence)
  Discover → Analyze → Verify → Approve → Apply → Measure → Reflect
```

Creation and improvement are the same process at different starting points.

Best practices for conversational UI: [CONVERSATIONAL_UI.md](references/CONVERSATIONAL_UI.md)

---

## Entry Point

Conversational invocation — natural language, no flags. Never tell the user to run a command with `--flags`.

### File Reference Detection

Before classifying intent, check if the user's message contains a file reference (`@path/to/file.md`, a file path, or a file attached via IDE context). A referenced file counts as a known target.

### Intent Detection

| User says something like... | Inferred intent | Action |
|---|---|---|
| "refine README.md" / "improve my docs" | Loop (full cycle) | Smart skip → confirm → run |
| "I need a migration guide" / brain dump | Create (bootstrap) | Bootstrap → loop |
| "what's wrong with this file?" / "check README" | Discover only | Run discover, show results |
| "suggest improvements for X" | Analyze only | Run discover + analyze, show proposals |
| "generate a rubric for..." | Rubric | Run rubric generation |
| "refine our error messages" | Domain sweep | One rubric, many files — see [DOMAIN_ADAPTERS.md](references/DOMAIN_ADAPTERS.md) |
| "what can I refine?" | Explore | Show use cases |
| Ambiguous or no target | Interview | Ask clarifying questions |

### Smart Skip

Skip the full interview when **both** conditions are met:
1. **Target is known** — user named a file, referenced a file, or domain template matches
2. **Mode is known** — user's words match a specific intent row (not "Ambiguous")

Show one confirmation prompt with defaults:

```
AskUserQuestion:
  Q1: Target: <file> — correct?
      options: Yes / Choose different file
  Q2: Detail level?
      options: Short / Medium (Recommended) / Detailed
  Q3: Max cycles: 3 (default) — adjust?
      options: 3 (Recommended) / 5 / I'll decide after each cycle
```

### Bootstrap Detection

Automatically activate bootstrap when ANY of:
- Target file doesn't exist or has fewer than 10 non-blank lines
- User's intent matches creation signals ("I need a...", "help me write a...", "draft a...")
- User provides a brain dump without referencing an existing file

**Conflict resolution:** If the user provides BOTH a brain dump AND references an existing file, treat the brain dump as improvement context (not a creation request) and enter the standard loop. The brain dump content becomes the first context annotation (type: factual).

When bootstrap is detected, adjust the confirmation:

```
AskUserQuestion:
  Q1: "I'll create <file> from scratch. Sound right?"
      options:
        - "Yes, create it (Recommended)"
        - "Actually, improve an existing file" → re-enter intent detection
  Q2: "How much should I involve you?"
      options:
        - "Review everything (Recommended)" → Reviewer role
        - "Just the important stuff" → Supervisor role
```

---

## Interview

Use `AskUserQuestion` prompts — never inline questions. This gives clickable options.

### When to Interview

- No target file and no file reference detected
- Intent doesn't match any row in the Intent Detection table
- User says "refine" with no context

### Interview Flow

**Prompt 1 — Intent & Target:**

```
AskUserQuestion:
  Q1: "What would you like to refine?"
      header: "Target"
      options:
        - "A specific file" → ask which file
        - "Create something new" → ask what to create, enter bootstrap
        - "All files of a type (error messages, docs)" → domain selection
        - "Help me decide" → read project structure, suggest targets

  Q2: "What's your goal?"
      header: "Goal"
      options:
        - "Full improvement cycle (Recommended)" → loop mode
        - "Just find issues" → discover only
        - "Suggest fixes, I'll decide" → analyze only
        - "Create from scratch" → bootstrap
```

**Prompt 2 — Strategy** (loop/create only):

```
AskUserQuestion:
  Q1: "How much detail do you want?"
      header: "Detail"
      options:
        - "Just results" → short
        - "Results + reasoning (Recommended)" → medium
        - "Everything" → detailed

  Q2: "How many cycles?"
      header: "Cycles"
      options:
        - "Up to 3 (Recommended)"
        - "Up to 5"
        - "I'll decide after each"
```

### Recap After Interview

Show a numbered checklist, then confirm with `AskUserQuestion` before starting:

```
Here's what I'll do:

1. Target: README.md (create from scratch / improve existing)
2. Goal: Full improvement cycle
3. Detail: Medium
4. Max cycles: 3
5. Role: Reviewer (you review everything)
```

```
AskUserQuestion:
  Q1: "Does this look right?"
      header: "Confirm"
      options:
        - "Looks good, start (Recommended)"
        - "Adjust something"
```

### Respecting User Profile

Read `.claude/user-context.md` for tier and purpose:

| Tier | Behavior |
|---|---|
| **Guided** | Plainest language. Pre-select recommended. Explain each choice. |
| **Supported** | Plain language. Show recommendations. |
| **Standard** | Options without lengthy explanations. |
| **Expert** | Skip interview when possible. Compact confirmation. |

---

## Verbosity Levels

| Level | Shown | Hidden |
|---|---|---|
| **Short** | Final scores, proposal table, approval prompt | Rubric reasoning, per-issue scoring, model details |
| **Medium** (default) | Short + rubric dimensions, issue list, before/after previews, context annotations captured | Model selection reasoning, subagent details |
| **Detailed** | Medium + model choices, subagent spawns, scoring rationale, context annotation details, role transitions | Nothing |

**Interaction with Progressive Autonomy:** Verbosity controls *how much detail* is shown within phases. Progressive Autonomy controls *which phases* involve the user. Both apply independently — e.g., a Supervisor at Detailed verbosity sees full detail for the phases they review, but LOW/MEDIUM proposals are still auto-approved.

When detailed, show a status line before each phase:
```
[Phase: Discover] Model: claude-opus-4-6 (subagent) — Opus for evaluation precision.
```

---

## Session Initialization

Before entering any phase, create the session's output directory:

1. Derive `<topic>` from the target filename (e.g., `SKILL.md` → `skill-md`)
2. Create `output_dir` at `./tmp/<topic>-<UTC_TIMESTAMP>/` (timestamp: `YYYYMMDD'T'HHmmss'Z'` UTC)
3. All subsequent phases write artifacts (evaluator prompts, proposals, annotations, reports) to this directory

This step runs once per session, immediately after the Interview/Smart Skip confirmation.

---

## Phases

### Bootstrap: Creation From Nothing

Full guidance: [BOOTSTRAP.md](references/BOOTSTRAP.md) (source of truth for Extract and Draft phases).

Bootstrap has two phases:

1. **Extract** — Propose an outline, capture corrections. Keep to 1-2 rounds. If user provides a brain dump, skip to Draft.
2. **Draft** — Generate a complete first artifact. Be intentionally specific, not cautiously vague — every paragraph should trigger "yes" or "no, actually..." from the human.

**Critical rules (detailed in BOOTSTRAP.md):**
- Flag opinionated design decisions as verification prompts for the first Analyze cycle
- Ask about specific gaps rather than hedging
- Brain dump provided → skip Extract entirely

After writing the draft with `Write`, enter the standard loop at Discover. First-cycle rubric confirmation applies. Baseline scores reflect the draft's quality.

---

### Discover

**Purpose:** Identify issues in current state and establish baseline.

**Model selection:** Defaults to Opus subagent (Agent tool with `model: "opus"`). Rubric quality sets the ceiling for the entire refinement. If Opus is unavailable, fall back to current model with a quality warning.

#### Step 1 — Deterministic Pre-Checks

Before LLM evaluation, run automated checks using these tool calls:

| File type | Check | Tool invocation |
|---|---|---|
| **Markdown** | Broken internal links | `Grep` for `\[.*\]\(.*\.md\)` in target, then `Read` each referenced path — if file missing, FAIL |
| **Markdown** | Heading hierarchy gaps | `Grep` for `^#{1,6} ` in target, check no level is skipped (h1→h3 with no h2) |
| **Markdown** | Empty sections | `Grep` for consecutive headings with no content between them |
| **Markdown** | Missing image refs | `Grep` for `!\[.*\]\(.*\)`, verify each path with `Read` |
| **Code** | Syntax validation | `Bash`: `node --check <file>` (JS/TS), `python -m py_compile <file>` (Python) |
| **Code** | TODO/FIXME count | `Grep` for `TODO\|FIXME\|HACK` in target |
| **JSON/YAML** | Parse validation | `Bash`: `node -e "JSON.parse(require('fs').readFileSync('<file>'))"` |
| **Any file** | Line count | `Bash`: `wc -l <file>` |
| **Any file** | Duplication | `Bash`: awk script to detect repeated paragraphs |

```
Automated Checks:
- [PASS] Markdown syntax valid
- [FAIL] 2 broken internal links → HIGH issues
- [WARN] 3 empty sections → MEDIUM issues
- [INFO] 785 lines, avg 5 words/line
```

FAIL → HIGH severity. WARN → MEDIUM. INFO → displayed only.

#### Step 2 — Audience Detection

Classify the target audience (first match wins):
1. **User-specified** — skip rules below
2. **Path-based:**
   - `.claude/skills/**`, `.claude/CLAUDE.md` → AI agent
   - `src/**`, `lib/**`, `packages/**` → developer
   - `docs/**`, `*.md` in root → human reader
   - `.github/**`, `Dockerfile`, CI files → ops/DevOps
3. **Content-based** (first 50 lines):
   - AI agent: imperative verbs, numbered phases, rule tables, ALL-CAPS keywords
   - Human reader: prose paragraphs, first/second person, FAQ structure
   - Developer: code blocks >30% of lines, imports, definitions
4. **Default:** mixed — use a balanced rubric combining documentation clarity and technical accuracy dimensions. No domain adapter activates for mixed audience.

**Sequence:** (1) Classify audience using rules above → (2) Confirm with `AskUserQuestion` → (3) Check domain adapter conditions against the *confirmed* audience.

```
AskUserQuestion:
  Q1: "Detected audience: <audience>. Correct?"
      header: "Audience"
      options:
        - "<detected> (Recommended)"
        - "AI agent"
        - "Developer"
        - "Human reader"
```

**Domain adapter auto-activation:** After audience confirmation, when audience is "developer" AND the target file has a code extension (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`), activate the `code-quality` domain adapter from [DOMAIN_ADAPTERS.md](references/DOMAIN_ADAPTERS.md). This overrides generic rubric generation. If the user changed the audience during confirmation, re-evaluate domain adapter eligibility against the new audience.

#### Step 3 — Rubric Selection

**Rubric storage path** — determined by the target file's location:

| Target file location | Rubric path | Rationale |
|---|---|---|
| `.claude/skills/<skill>/...` | `.claude/skills/<skill>/rubrics/<target-filename>.md` | Quality contract ships with the skill |
| Anywhere else | `.claude/rubrics/<target-filename>.md` | Project-level, skill-agnostic |

Priority order:
1. **User-provided rubric** — validate format (dimensions with 0/5/10 anchors)
2. **Persisted rubric** — check the storage path above. Offer: reuse / adjust / start fresh
3. **Domain template** — if a domain adapter is active, use its rubric
4. **Generate fresh** — use the [Rubric Generation Protocol](references/RUBRIC_PROTOCOL.md)

#### Step 4 — LLM Evaluation

**Evaluator prompt construction:**
1. Build prompt: target file content + rubric dimensions + scoring instructions
2. **Write to `<output_dir>/evaluator-prompt.md`** using the `Write` tool before spawning subagents (makes prompt inspectable, prevents variation)
3. Every evaluator receives this file's content verbatim

**Multi-evaluator scoring (required in loop mode, optional in standalone):** Spawn **2** independent Opus subagents in parallel. Use the `Agent` tool for each:
```
Agent tool:
  model: "opus"
  prompt: "You are an independent evaluator. Read the file at
    <output_dir>/evaluator-prompt.md and follow its instructions
    exactly. Output your evaluation in the specified format.
    Do NOT modify any files."
```
If Opus is unavailable (Agent tool returns a model availability error), fall back to the current conversation model and note: "Opus unavailable — using [current model]. Scores may be less precise."

**Timeouts:** Set `timeout: 120000` (2 minutes) on each `Agent` call. If a subagent times out, retry once. If both attempts time out, fall back to the conversation model.

#### Optional: Codex Evaluator (Model Diversity)

When available, Codex CLI adds a **third evaluator from a different model family** (GPT-based), reducing shared blindspots inherent in same-model evaluation.

**Detection (once per session, at start of first Discover):**
```bash
which codex && codex --version
```

**Behavior based on config `codex_evaluator`:**

| Config value | Behavior |
|---|---|
| `"auto"` (default) | If Codex detected, suggest: "Codex CLI is available — use it as a third evaluator for model diversity? (Recommended)" |
| `"enabled"` | Use Codex without asking. If not installed, warn and skip. |
| `"disabled"` | Never use Codex, don't suggest. |

**When enabled, spawn in parallel with the Opus subagents:**

1. Write the evaluator prompt to `<output_dir>/evaluator-prompt.md` (already done — same file)
2. Write a JSON output schema to `<output_dir>/codex-eval-schema.json` matching the expected evaluation format. **Critical:** OpenAI structured output requires `"additionalProperties": false` on every `"type": "object"` node in the schema — omitting this causes a 400 error.
3. Spawn via `Bash`:
```bash
codex exec --ephemeral \
  --output-schema <output_dir>/codex-eval-schema.json \
  -o <output_dir>/codex-eval-result.json \
  -c 'sandbox_permissions=["disk-full-read-access"]' \
  "Read the evaluator prompt at <output_dir>/evaluator-prompt.md and the target file it references. Follow the instructions exactly. Output your evaluation in the specified JSON format. Do NOT modify any files."
```
4. Parse `<output_dir>/codex-eval-result.json` for scores and issues

**Timeout:** 180s (Codex may be slower than Opus subagents). If it times out or fails, log a warning and proceed with Opus-only scores.

**Score integration:** Average Codex scores into the evaluator pool alongside the 2 Opus scores. When reporting spread, note model source: "Codex scored [dimension] at X vs. Opus average Y — model diversity flagged a difference."

Average scores per dimension and report spread. When spread exceeds 1.5 on any dimension, flag it: "Evaluators disagreed on [dimension] — consider manual review."

**Issue deduplication:** Two issues are duplicates when BOTH: same rubric dimension AND same target region (same heading, same entity, or overlapping lines). Merge duplicates: keep higher severity, combine descriptions, note "flagged by N/M evaluators."

#### Step 5 — Baseline

Output structured issue list with severity (HIGH/MEDIUM/LOW) and baseline score (0-10).

#### Rubric Confirmation (first cycle only)

After Discover, show rubric and baseline, then confirm:

```
Target audience: <audience>

| # | Dimension | Score | What it measures |
|---|-----------|-------|------------------|
| 1 | Clarity   | 5/10  | Can readers understand quickly? |
| 2 | ...       | ...   | ... |

Baseline: 4.8/10 — 12 issues (5 HIGH, 4 MEDIUM, 3 LOW)
```

```
AskUserQuestion:
  Q1: "Does this rubric look right?"
      header: "Rubric"
      options:
        - "Looks good, continue (Recommended)"
        - "Adjust it" → ask what to change
        - "Skip rubric review — just go"
```

---

### Analyze

**Purpose:** Generate concrete improvement proposals.

Uses the current conversation model. Reads issues from Discover and generates specific before/after proposals.

**Proposal limits:** At most **10 proposals per cycle**.
1. All HIGH issues first (always)
2. MEDIUM by lowest-scoring dimension
3. LOW only if slots remain

If >10 HIGH issues, batch related ones into compound proposals. Two proposals are "related" when they target the same section/heading OR address the same rubric dimension with the same fix pattern (e.g., "5 broken links" or "8 generic error messages"). Note deferred issues: "12 additional MEDIUM/LOW issues deferred to next cycle."

**Before/after display is mandatory.** The user must see exactly what will change.

**Structural proposals:** When the target has organization problems (scattered content, duplication, wrong reading order), generate structural proposals affecting the whole document. Flag these explicitly — Apply handles them as whole-file rewrites.

**Store proposals as JSON** at `<output_dir>/proposals.json`:

```json
[
  {
    "index": 1,
    "title": "Add authentication prerequisites",
    "severity": "HIGH",
    "current": "...",
    "proposed": "...",
    "impact": "...",
    "decision": null,
    "modified_text": null,
    "context_annotations": []
  }
]
```

**Formatting:** When proposed text contains markdown code blocks, use blockquotes (`>`) instead of nesting fenced blocks.

---

### Verify

**Purpose:** Multi-perspective validation of proposals.

Three perspectives evaluated in **one prompt to the current conversation model** (not subagents — Verify is lightweight by design):
- **Devil's Advocate:** Edge cases, contradictions, unintended consequences
- **Conservative:** Regressions, compatibility, scope creep
- **Pragmatist:** Effort vs. impact, feasibility, alternatives

Produces a confidence score (0-10) per proposal. If all proposals score below the configured `confidence_threshold` (default 6.0), skip Approve and return to Analyze with adjusted parameters (max 2 regeneration attempts). After 2 failed attempts, present the low-confidence proposals to the user with a warning: "Proposals scored below confidence threshold after regeneration — review recommended."

**Default:** Runs automatically between Analyze and Approve in loop mode (lightweight single-prompt mode).

**Skipping:** Users can skip via interview choice, config (`verification: "disabled"`), or ad hoc ("skip verification this time").

**For auto-approve decisions:** Use multi-round deliberation instead of single-pass. Perspectives examine each other's concerns, concede or defend, produce a rationale.

Full details: [VERIFICATION.md](references/VERIFICATION.md)

---

### Approve

**Purpose:** Human reviews proposals and provides decisions + context.

**Batch approval:** Present ALL proposals in a single table, then one `AskUserQuestion`:

```
| # | Proposal | Severity | Confidence | Recommend |
|---|----------|----------|------------|-----------|
| 1 | Fix auth endpoint format | HIGH | 8.5 | Approve |
| 2 | Add rollback paths | HIGH | 7.2 | Approve |
| 3 | Shorten intro section | MEDIUM | 9.0 | Approve |
```

```
AskUserQuestion:
  Q1: "How would you like to handle these?"
      header: "Approval"
      options:
        - "Approve all (Recommended)"
        - "Reject all"
        - "Review individually" → for each proposal, show full before/after, then:

**Context capture on batch decisions:** After "Approve all" or "Reject all," check the user's response text for non-decision content. Example: "Approve all — but note that we're deprecating the auth module" → capture **constraint:** auth module is being deprecated. Same annotation rules as individual decisions.
          ```
          AskUserQuestion:
            Q1: "Proposal #N: <title>"
                header: "Review"
                options:
                  - "Approve" → accept as-is
                  - "Reject" → skip this proposal
                  - "Modify" → prompt "Enter your modified text:" and record
          ```
          After each decision, check the user's response for non-decision content (context capture).
```

#### Context Capture (Resonance Mechanism)

**This is what makes Refine different from generic optimization.** After each decision, parse the human's response for non-decision content:

| Human says | Decision | Context captured |
|---|---|---|
| "Approve" | Approve | (none) |
| "Approve — and the auth service handles legacy tokens differently" | Approve | **Factual:** different token handling for legacy |
| "Reject — we deprecated that feature" | Reject | **Constraint:** feature is deprecated |
| "Modify — make it shorter" | Modify | **Preference:** concise text preferred |

Store annotations per-cycle in `<output_dir>/context-annotations.json`:

```json
[
  {
    "cycle": 1,
    "proposal_index": 2,
    "type": "factual",
    "content": "Auth service handles legacy tokens with client_assertion, not client_id/secret",
    "resolved": false
  }
]
```

**Integration into subsequent cycles:**
- **Factual** and **constraint** annotations → feed into the next Discover evaluator prompt as known context
- **Preference** annotations → adjust proposal generation style in Analyze
- **Resolved** annotations (incorporated into the artifact) → prune from active context

See [CONTEXT_EXPANSION.md](references/CONTEXT_EXPANSION.md) for detailed rules.

#### Graduated Auto-Approve

When configured in `.claude/refine-config.json`:

| Rule | Config key | Effect |
|---|---|---|
| By severity | `auto_approve_severity` | Auto-approve LOW; prompt for MEDIUM/HIGH |
| By confidence | `auto_approve_above_confidence` | Auto-approve above threshold |
| By cycle | `auto_approve_after_cycle` | Auto-approve in later cycles |

All rules off by default. When triggered, show "[Auto-approved]" tag with option to review.

The **progressive autonomy** system can also trigger auto-approve based on the human's role — see the Progressive Autonomy section.

---

### Apply

**Purpose:** Implement approved changes.

1. Check working directory: `Bash` with `git status --short`. If output is non-empty, warn: "You have uncommitted changes. Consider committing before applying."
2. Apply changes using the appropriate tool:
   - **Targeted proposals** (specific text regions): Use `Edit` tool with the proposal's `current` text as `old_string` and `proposed` text as `new_string`
   - **Structural proposals** (whole-file rewrite): Use `Write` tool with the complete new content
   - **Multiple proposals on the same file**: Read the file once with `Read`, apply all edits in a single `Write` call to avoid intermediate broken states
3. Run validation via `Bash`:
   - Markdown: `Grep` for broken internal links (same pattern as pre-checks)
   - Code: `node --check <file>` or `python -m py_compile <file>`
   - JSON: `node -e "JSON.parse(require('fs').readFileSync('<file>'))"`
4. Report: list each proposal applied (with line numbers) and any validation failures

**Do NOT auto-commit.** Leave changes uncommitted for user review.

**Batching:** Multiple proposals targeting the same file → single `Write` operation (not sequential `Edit` calls).

**Conflict resolution:** When proposals target overlapping regions:
1. Apply higher-severity first. **Tiebreaker:** lower proposal index (earlier in list)
2. Re-locate second proposal's target: search modified file for the proposal's `current` text. If exact match not found, fall back to line-number proximity (±5 lines from original location)
3. If the proposal's `current` text cannot be found as a substring in the modified file (exact match fails), skip with note: "Proposal #N skipped — target region modified by Proposal #M"

**Structural proposals:** Apply as whole-file rewrite rather than targeted edits.

---

### Measure

**Purpose:** Quantify improvement with fresh evaluation.

Spawn fresh Opus subagent(s) — new invocations, not reused from Discover. If Codex evaluator is enabled for this session, spawn it here too (same parallel pattern as Discover Step 4).

1. Write evaluator prompt to `<output_dir>/measure-evaluator-prompt.md`
2. Spawn **2** independent Opus subagents (same count as Discover), plus Codex if enabled. If one subagent fails after retry, use the single score plus a conversation-model evaluation to maintain the 2-evaluator minimum.
3. Score all dimensions from scratch (no anchoring to prior scores)
4. Compare to baseline, report per-dimension deltas

```
BEFORE: Clarity 5/10, Completeness 4/10, Accuracy 3/10 — Avg 4.0/10
AFTER:  Clarity 8/10, Completeness 7/10, Accuracy 6/10 — Avg 7.0/10 (+75%)
```

**Convergence:** 0 HIGH or MEDIUM issues. LOW doesn't block convergence. Human's "good enough" always overrides metrics.

**Score variation note (first cycle, medium+ verbosity):** "Each evaluation uses a fresh, independent agent. Scores may vary ±0.5–1.0 between steps — the delta within a cycle is more meaningful than absolute scores across cycles."

**Ceiling noise rule:** When the baseline or prior cycle average is ≥ 8.0, treat score deltas within ±1.0 as measurement noise. Do not report these as regressions or improvements — instead note: "Scores within measurement noise — artifact is at quality ceiling for this rubric." This prevents false regression alerts on already-good artifacts and avoids over-refining.

---

### Reflect (Cycles 2+)

**Purpose:** Make the loop adaptive, not blindly repetitive.

Runs automatically after Measure in cycles 2+. A structured checklist:

1. **Rejected proposal check:** Were proposals similar to previously rejected ones? → Exclude those categories next cycle.
2. **Modification pattern check:** Did the human consistently modify in one direction (shorter, more specific, different tone)? → Adjust generation style: "You've shortened 3 of 5 proposals — I'll aim for more concise text."
3. **Dimension saturation check:** Any dimensions at 9+ for two cycles? → Recommend dropping from active evaluation.
4. **Dimension stagnation check:** Any dimensions not improving despite approved proposals? → Suggest structural reorganization.
5. **Context utilization check:** Were context annotations from prior cycles not reflected in proposals? → Prioritize in next cycle.
6. **Convergence trajectory check:** Score delta decreasing? → Signal diminishing returns.
7. **Approval rate by dimension:** Low approval on a dimension? → May indicate rubric mismatch.
8. **Audience alignment check:** Are proposals consistently modified toward a different audience? → Suggest rubric recalibration.

**Output (medium verbosity):**
```
Reflection (Cycle 2 → 3):
- Recurring: Completeness issues persist — target may need restructuring, not additions.
- Saturated: "Formatting" at 9/10 for 2 cycles — dropping from evaluation.
- Context: 2 factual annotations from cycle 1 not yet reflected — prioritizing.
- Next focus: Completeness, Accuracy dimensions.
```

**Reflect Output Contract — inputs to next cycle:**

| Reflect finding | Next-cycle effect | Mechanism |
|---|---|---|
| Saturated dimension (9+ for 2 cycles) | Remove from evaluator prompt rubric | Drop dimension from scoring, note in cycle header |
| Stagnating dimension | Prepend structural prompt to Analyze | "Consider structural changes for [dimension]" |
| Rejected proposal pattern | Exclude category from Analyze | Add to evaluator prompt: "Do NOT propose [category] changes" |
| Modification pattern | Adjust Analyze generation style | Add to evaluator prompt: "Human prefers [direction]" |
| Unintegrated context annotations | Prepend to evaluator prompt as known context | Same as Context Expansion integration |
| Low approval rate on dimension | Flag for rubric recalibration | Note in cycle header, suggest rubric adjustment |

**Rubric changes:** Can be recommended but require human confirmation.

---

## Progressive Autonomy

The human's involvement adjusts based on demonstrated alignment. See [PROGRESSIVE_AUTONOMY.md](references/PROGRESSIVE_AUTONOMY.md) for full details.

### Role Tracking

Track the human's role per cycle: **Reviewer**, **Supervisor**, or **Director**.

Default: **Reviewer** (review everything). The role is shown in each cycle's header.

### Transitions

| From | To | Trigger |
|---|---|---|
| Reviewer | Supervisor | 2+ cycles with >80% approval rate and no modifications |
| Supervisor | Director | Low-risk domain AND verification scores consistently > 8.0 |
| Any | Reviewer | Human requests review, rejects auto-approved proposal, score regresses, or rubric changes |

### Per-Phase Behavior

Full matrix: [PROGRESSIVE_AUTONOMY.md](references/PROGRESSIVE_AUTONOMY.md). Key rules kept inline:

- **Approve phase:** Supervisor auto-approves LOW/MEDIUM, reviews HIGH. Director auto-approves all with notification.
- **Apply phase:** Reviewer confirms first. Supervisor and Director: automatic.

### Pullback

At every phase where the human would be skipped:

```
[Cycle 3 — 8 proposals auto-approved, 1 escalated] Type "review" to see everything.
```

If the human says "review" at any point, immediately drop to Reviewer for the current cycle.

---

## Loop Mode

### Cycle Behavior

**Max cycles:** From interview, default 3. Each cycle header shows:
```
═══ Cycle 2 of 3 | Role: Supervisor | Context: 4 annotations active ═══
```

**Fresh evaluation per cycle:** Each Discover MUST re-read and score from scratch. No carrying forward. Before scoring, check for external changes: compare file hash or run `git diff` against last Apply output. If the file changed externally, note: "Target modified outside this session since last cycle" and include the diff summary in the evaluator prompt as context.

**Approval gate per cycle:** After Analyze, show batch approval (adjusted by role).

**Mid-session target change:** If the user asks to switch to a different file mid-session, save the current session state (proposals.json, context-annotations.json) to the output directory and start a fresh session for the new target. Do not carry rubric or annotations across targets — they are file-specific.

### Stopping Conditions

| Condition | Action |
|---|---|
| No HIGH/MEDIUM issues (cycle 1) | Show scores: "No significant issues found." Offer: adjust rubric / try different audience / done |
| No HIGH/MEDIUM issues (cycle 2+) | Convergence — offer to stop |
| Max cycles reached | Stop, show summary, offer to continue |
| Score regression > 1.0 (or > 1.5 when prior cycle avg ≥ 8.0) | Pause with options (see below) |
| Score dip within noise range (≤ 1.0, or ≤ 1.5 when prior avg ≥ 8.0) | Note at medium+ verbosity, continue |
| Score plateau (delta < 0.5 for 2 cycles) | Suggest stopping or restructuring |
| 4 cycles without convergence | Advisory: adjust rubric or restructure |
| Human says "good enough" | Stop immediately |

**Score regression handling:** When score drops by more than 1.0:
```
AskUserQuestion:
  Q1: "Scores dropped by [X] points ([before] → [after]). This exceeds
       normal ±1.0 variation and may indicate a problematic change."
      header: "Regression"
      options:
        - "Revert last cycle's changes" → use git to restore, re-run Measure
        - "Continue anyway" → proceed to next cycle
        - "Stop here" → end session, offer report
```

### Creation vs. Improvement Convergence

When entering via Bootstrap, early cycles are in **expansion mode** — the rubric weights completeness. When Discover shifts from "missing content" issues to "quality of existing content" issues, refinement mode begins naturally. No special logic needed.

---

## Standalone Modes

### Discover Only

**When:** "What's wrong with this file?"
Run discover, show issues and scores, stop.

### Analyze Only

**When:** "Suggest improvements"
Run discover + analyze, show proposals, stop.

### Rubric

**When:** "Generate a rubric for X"
Run the [Rubric Generation Protocol](references/RUBRIC_PROTOCOL.md): Stakeholder Analysis → Failure Mode Analysis → Dimension Selection → Adversarial Validation.

Output rubric as markdown table, then:
```
AskUserQuestion:
  Q1: "What would you like to do with this rubric?"
      options:
        - "Save to file" → write to rubric storage path (see Rubric Selection)
        - "Use it now — start refining" → transition to loop
        - "Done for now"
```

### Explore

**When:** "What can I refine?" / "Use cases" / "What is this good for?"

1. Read the project structure with `Bash`: `ls` top-level directories, scan for common targets
2. Suggest targets based on what exists:
   - `README.md` or `docs/**/*.md` → "Improve documentation"
   - `.claude/skills/*/SKILL.md` → "Refine a skill file"
   - `src/**` with error patterns (`Grep` for `throw new Error`) → "Improve error messages"
   - Any `.md` file → "Improve [filename]"
3. Present with `AskUserQuestion`:
   ```
   Q1: "Here's what I found that could be refined:"
       header: "Targets"
       options:
         - "[most impactful target]" → enter loop
         - "[second target]" → enter loop
         - "Something else" → enter interview
   ```

### Domain Sweep

**When:** "Refine all error messages"
One rubric across many files, batch processing. See [DOMAIN_ADAPTERS.md](references/DOMAIN_ADAPTERS.md).

---

## Report Generation

After the final cycle, offer to generate a self-contained HTML report.

### When to Offer

```
AskUserQuestion:
  Q1: "Want me to create a visual report?"
      header: "Report"
      options:
        - "Yes (Recommended)"
        - "No, skip"
```

### How to Generate

1. Read `assets/report-template.html`
2. Populate placeholders:
   - `{{TOPIC}}`, `{{DATE}}`, `{{SCORE_BEFORE}}`, `{{SCORE_AFTER}}`, `{{SCORE_DELTA_PCT}}`
   - `{{TOTAL_CYCLES}}`, `{{TOTAL_PROPOSALS}}`, `{{TARGET_FILE}}`
   - `{{CYCLE_CARDS}}` — HTML for each cycle summary (include context annotations captured)
   - `{{PROPOSAL_TABLES}}` — per-cycle tables with before/after + decisions
   - `{{RUBRIC_DEFINITION}}` — full rubric with dimensions and anchors
   - `{{RUBRIC_ROWS}}` — before/after scores per dimension
   - `{{CONTEXT_EXPANSION_SUMMARY}}` — annotations captured, how they influenced subsequent cycles
   - `{{ROLE_TRANSITIONS}}` — role changes across cycles
   - `{{SCORE_CHART_SVG}}` — inline SVG bar chart (width 600, height 200, before=#e2e8f0, after=#7c3aed)
3. Write to `./tmp/<topic>-<UTC_TIMESTAMP>/report.html`
4. Write proposals to `./tmp/<topic>-<UTC_TIMESTAMP>/proposals.json`
5. Print path and offer to open

### Output Folder Naming

Uses the session's `output_dir` (see State Management). Reports and proposals are written alongside other session artifacts.

---

## State Management

### Within a Session

| State | Set by | Used by |
|---|---|---|
| `target_file` | Interview / Smart Skip | All phases |
| `audience` | Discover | Rubric generation, proposals |
| `rubric` | Discover | Analyze, Measure, Reflect |
| `issues` | Discover | Analyze |
| `baseline_scores` | Discover | Measure |
| `output_dir` | Session start (before Discover Step 1) | All phases |

**Output directory:** Created at session start. Path: `./tmp/<topic>-<UTC_TIMESTAMP>/` (e.g., `./tmp/readme-20260406T143022Z/`). Timestamp: `YYYYMMDD'T'HHmmss'Z'` (UTC). All session artifacts (evaluator prompts, proposals, annotations, reports) are written here.
| `proposals` | Analyze | Verify, Approve, Apply |
| `cycle_scores` | Measure | Reflect, Stopping conditions |
| `context_annotations` | Approve | Reflect, next Discover |
| `role` | Progressive Autonomy | All phases (controls what's shown/asked) |
| `codex_available` | Discover (first cycle) | Discover Step 4, Measure (controls whether Codex evaluator is spawned) |

### Across Sessions

Rubrics persist to the path determined by Rubric Selection (Step 3):
- **Skill files** → `.claude/skills/<skill>/rubrics/<target-filename>.md`
- **Other files** → `.claude/rubrics/<target-filename>.md`

Both locations are git-tracked — rubrics contain human-curated quality standards, not ephemeral output.

```markdown
---
target: README.md
audience: human reader
created: 2026-04-06
last_used: 2026-04-06
---

| Dimension | 0 (worst) | 5 (acceptable) | 10 (best) |
|---|---|---|---|
| Clarity | ... | ... | ... |

## Known Context
Accumulated domain knowledge from Resonance captures. Persisted across sessions.
- [factual] Auth service uses client_assertion for legacy tokens
- [constraint] Feature X is deprecated — do not reference
- [preference] Team prefers concise over thorough

## Score History
| Date | Clarity | Completeness | ... | Avg | Cycles |
|---|---|---|---|---|---|
| 2026-04-06 | 5→9 | 4→8 | ... | 4.8→8.5 | 3 |
```

**Known Context rules:**
- After each session, persist unresolved **factual** and **constraint** annotations from `context-annotations.json` into the rubric's Known Context section
- **Preference** annotations → persist only if confirmed across 2+ cycles
- On rubric reuse, feed Known Context into the Discover evaluator prompt as prior knowledge
- Prune entries that contradict the current artifact content (domain knowledge can become stale)

Session data (proposals, reports, full annotations) lives in `./tmp/<topic>-<UTC_TIMESTAMP>/`.

---

## Configuration

Settings at `.claude/refine-config.json`:

```json
{
  "verification": "enabled",
  "confidence_threshold": 6.0,
  "auto_approve": false,
  "auto_approve_severity": [],
  "auto_approve_above_confidence": null,
  "auto_approve_after_cycle": null,
  "default_max_cycles": 3,
  "default_verbosity": "medium",
  "progressive_autonomy": true,
  "codex_evaluator": "auto"
}
```

See [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md) for full schema and validation.

---

## Context Window Management

**Maximum file size:** If target exceeds ~800 lines or ~30KB:
1. Read in chunks, focus on rubric-relevant sections
2. Discover: summarize sections with line ranges, then evaluate
3. Apply: edit specific line ranges, not whole file

**Domain sweep (multiple files):** Process in batches of 5-10 files. Prioritize by estimated issue density. Deduplicate cross-batch, aggregate into unified summary.

**Subagent prompt size:** Keep under 50K tokens total.

---

## Error Handling

| Error | Recovery |
|---|---|
| Subagent fails or times out | Retry once (timeout: 120s). Fall back to conversation model with quality warning. |
| Codex CLI not found or fails | Log warning, proceed with Opus-only evaluation. Do not block the session. |
| Codex schema validation error (400) | Likely missing `additionalProperties: false` in schema. Fix schema and retry once. If still failing, skip Codex. |
| Git operation fails | `git status` fails: warn, skip dirty-check, proceed. Revert fails: show error, suggest manual `git checkout -- <file>`. |
| Target file not found | Ask user to confirm path. |
| Rubric file invalid | Offer to generate fresh. |
| Report template missing | Show results inline. |
| Config malformed | Use defaults, offer to reset. |
| Pre-check tool unavailable | Skip, note, continue with LLM evaluation. |
| Proposal apply fails (single) | Show failed edit, current file state, intended change. Ask: apply manually / skip. |
| Proposal apply fails (partial batch) | Report succeeded/failed. Ask: "N of M applied. Continue to Measure with partial / Revert all / Fix remaining manually." |
| Bootstrap draft wildly off | Human says "wrong direction" — discard draft, return to Extract with corrected context. |

---

## References

- [BOOTSTRAP.md](references/BOOTSTRAP.md) — Creation from nothing: Extract + Draft phases
- [CONTEXT_EXPANSION.md](references/CONTEXT_EXPANSION.md) — Context annotation capture, integration, and pruning
- [PROGRESSIVE_AUTONOMY.md](references/PROGRESSIVE_AUTONOMY.md) — Role tracking, transitions, per-phase behavior
- [CONFIG_SCHEMA.md](references/CONFIG_SCHEMA.md) — Configuration schema and validation
- [DOMAIN_ADAPTERS.md](references/DOMAIN_ADAPTERS.md) — Domain sweep configuration and collection methods
- [RUBRIC_PROTOCOL.md](references/RUBRIC_PROTOCOL.md) — 4-step rubric generation protocol
- [VERIFICATION.md](references/VERIFICATION.md) — Multi-perspective verification
- [CONVERSATIONAL_UI.md](references/CONVERSATIONAL_UI.md) — Conversational UI patterns
