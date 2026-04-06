# Refine Skill Blueprint

**Status:** Design specification for a new skill
**Date:** 2026-04-06
**Companion:** [concept.md](concept.md) — framework theory, naming rationale, and critical assessment

---

## Purpose

This document specifies the **Refine** skill: an agent skill that creates and improves artifacts through rubric-driven iterative loops, leveraging the verification-generation asymmetry in human cognition.

This is a design for a new skill, intended to guide implementation from scratch.

---

## 1. Skill Definition

### Frontmatter

```yaml
---
name: refine
description: Creates and improves artifacts through rubric-driven iterative loops. Works on any content with definable quality standards — documentation, code, specs, messages, prompts.
---
```

### Core Capabilities

| Capability | Description |
|---|---|
| **Create from scratch** | Bootstrap an artifact from a brain dump or goal statement through iterative extraction and refinement |
| **Improve existing artifacts** | Evaluate against a rubric, propose specific changes, iterate until convergence |
| **Domain sweep** | Apply a single rubric across many files (e.g., all error messages in a codebase) |
| **Rubric generation** | Create evaluation rubrics through stakeholder and failure mode analysis |
| **Progressive autonomy** | Start with full human review, shift toward autonomous approval as confidence builds |

---

## 2. Entry Point

This skill uses **conversational invocation** — the user describes what they want in natural language. No required parameters or flags. Never tell the user to run a command with `--flags`.

### File Reference Detection

Before classifying intent, check whether the user's message contains a file reference (e.g., `@path/to/file.md`, a file path, or a file attached via IDE context). If present, treat it as the target.

### Intent Detection

| User says something like... | Inferred intent | What to do |
|---|---|---|
| "refine README.md" / "improve my docs" | Loop (full cycle) | Smart skip → confirm → run |
| "I need a migration guide" / "help me write a spec" | Create (bootstrap + loop) | Extract → Draft → loop |
| "here's what I know about X: [brain dump]" | Create (with content) | Skip Extract, go to Draft → loop |
| "what's wrong with this file?" / "check README" | Discover only | Run discover, show results |
| "suggest improvements for X" | Analyze only | Discover + analyze, show proposals |
| "verify these proposals" | Verify only | Run verification on active proposals |
| "generate a rubric for error messages" | Rubric | Run rubric generation |
| "what can I refine?" / "use cases" | Explore | Show use case catalog |
| Ambiguous or no target specified | Interview | Ask clarifying questions |

**Creation signals:**
- "I need a..." / "help me write a..." / "create a..." / "draft a..."
- User provides a brain dump (bullet points, scattered notes, raw thoughts) without referencing an existing file
- Target file doesn't exist or is empty

### Smart Skip

Skip the full interview and show a short confirmation prompt when **both** conditions are met:
1. **Target is known:** The user named a file, referenced a file, or a domain template matches unambiguously
2. **Mode is known:** The user's words match a specific row in the Intent Detection table (not "Ambiguous")

If either condition is missing, run the full Interview.

For creation: if the user provides a brain dump directly ("here's what I need in the README: ..."), skip the Extract phase and go straight to Draft.

---

## 3. Interview

Use `AskUserQuestion` prompts — never ask questions as inline text. This gives the user clickable options.

### When to Interview

- User provides no target file and no file reference was detected
- User's intent doesn't match any row in the Intent Detection table
- User says "refine" with no other context

### Interview Flow

**Prompt 1 — Intent & Target:**

```
AskUserQuestion:
  Q1: "What would you like to work on?"
      header: "Target"
      options:
        - "A specific file" → follow up asking which file
        - "All files of a type (e.g., error messages, docs)" → follow up with domain selection
        - "Something that doesn't exist yet — I'll describe it" → enter Bootstrap
        - "I'm not sure — help me decide" → read the project and suggest targets

  Q2: "What's your goal?"
      header: "Goal"
      options:
        - "Run a full improvement cycle (Recommended)" → loop mode
        - "Just find issues, don't fix yet" → discover only
        - "I have issues already, suggest fixes" → analyze only
        - "Create something new from my notes" → bootstrap mode
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

### Recap and Confirmation

After collecting all answers, show a numbered checklist recap, then confirm with `AskUserQuestion` before starting work:

```
Here's what I'll do:

1. Target: README.md
2. Goal: Full improvement cycle (discover → analyze → approve → apply → measure)
3. Detail level: Medium — results + reasoning
4. Max cycles: 3
5. Approval: Review proposals each cycle
6. Report: Generate at the end
```

Do not begin work until the user confirms.

### Respecting User Profile

Read `.claude/user-context.md` for tier and purpose. Adjust the interview:

| Tier | Interview behavior |
|---|---|
| **Guided** | Use the plainest language. Pre-select "Recommended" options. Explain what each choice means. |
| **Supported** | Use plain language. Show recommendations. |
| **Standard** | Show options without lengthy explanations. |
| **Expert** | Skip interview when possible. Show compact confirmation. |

---

## 4. Verbosity Levels

| Level | What's shown | What's hidden |
|---|---|---|
| **Short** | Final scores, proposal table, approval prompt | Rubric reasoning, per-issue scoring, model details |
| **Medium** (default) | Everything in Short + rubric dimensions, issue list with severity, before/after previews | Model selection reasoning, subagent details |
| **Detailed** | Everything in Medium + which model runs each step, subagent spawn details, scoring rationale, decision reasoning | Nothing hidden |

---

## 5. Bootstrap Phase (Creation)

### When It Activates

Automatically when:
1. Target file doesn't exist (or is empty/near-empty, < 5 lines)
2. User's intent matches creation signals
3. User explicitly asks to create something

### Extract

**Purpose:** Gather requirements through verification, not generation.

**Process:**
1. Gather available context:
   - Project structure (read directory, package.json, README if exists)
   - File path hints (a file at `docs/migration-guide.md` implies a migration guide)
   - User's stated goal
   - Domain template skeleton (if a domain template matches)

2. Generate a **proposed outline** based on available context:
   ```
   Based on [context sources], here's what I think this document needs:

   1. Overview — what this migration covers
   2. Prerequisites — what users need before starting
   3. Breaking changes — what will stop working
   4. Step-by-step migration — the actual process
   5. Rollback procedure — how to undo if something goes wrong
   6. Timeline — when this takes effect

   What's missing or wrong?
   ```

3. Present via `AskUserQuestion` with options:
   - "Looks right, generate a draft"
   - "Missing something — let me add" → capture additions
   - "Wrong direction — let me explain" → restart extraction with new context

4. If the user adds context, capture it as **additive context** and regenerate the outline.

**Keep Extract to 1-2 rounds.** The goal is not a perfect outline but a concrete-enough starting point that triggers reactions during Draft review.

### Draft

**Purpose:** Generate a first artifact that's concrete enough to trigger corrections.

1. Generate a complete first draft from the extracted requirements
2. The draft should be **intentionally comprehensive rather than cautious** — it's easier for the human to say "remove that section" than to realize it's missing
3. Write the draft to the target file and enter the standard loop

**Quality bar:** The draft doesn't need to be good. It needs to be specific enough that every paragraph triggers either "yes" or "no, actually..." from the human.

### Handoff to Loop

After Draft is generated, the loop takes over with no special handling. Discover evaluates the draft against a rubric, Analyze proposes improvements, the human reacts. Creation and improvement are now the same process.

---

## 6. Loop Phases

### Discover

**Purpose:** Identify issues in current state.

**Model selection:** Defaults to Opus subagent — rubric quality sets the ceiling for the entire process. Use the `Agent` tool with `model: "opus"`. If unavailable, fall back to the current conversation model with a warning.

**What it does:**
1. Reads target file
2. **Deterministic pre-checks** — fast automated checks before LLM evaluation:

   | File type | Checks to run |
   |---|---|
   | **Markdown** (`.md`) | Broken internal links, heading hierarchy gaps, empty sections, missing image refs |
   | **Code** (`.ts`, `.js`, `.py`, etc.) | Syntax validation, import resolution, TODO/FIXME/HACK count |
   | **JSON/YAML** | Parse validation, schema validation if referenced |
   | **Structured docs** | Required section presence |
   | **Any file** | Line count, readability estimate, duplication detection |

3. **Audience detection** — classify the target audience before generating a rubric:
   - User-specified audience (highest priority)
   - Path-based rules (e.g., `src/**` → developer, `docs/**` → human reader, `.claude/skills/**` → AI agent)
   - Content-based fallback (check first 50 lines for signals)
   - Default: mixed

4. **Rubric selection** (priority order):
   - User-provided rubric file
   - Persisted rubric from `.claude/rubrics/<target-filename>.md`
   - Domain template default
   - Generate fresh using the Rubric Generation Protocol

5. Identifies issues with severity (HIGH/MEDIUM/LOW)
6. Establishes baseline quality score (0-10)

**Evaluator prompt construction:**
1. Build a single evaluator prompt with target content, rubric, and scoring instructions
2. Write to `<output_dir>/evaluator-prompt.md` before spawning subagents — single source of truth
3. Every evaluator receives this file's content verbatim

**Multi-evaluator scoring (recommended for loop mode):** Spawn 2-3 independent Opus subagents in parallel with identical prompts. Average scores per dimension, report spread. When spread exceeds 1.5, flag it. Use union of all issues (deduplicated).

**Issue deduplication:** Two issues are duplicates when BOTH: same rubric dimension AND same target region (same heading, named entity, or overlapping line ranges). Merge duplicates: keep higher severity, combine descriptions, note "flagged by N/M evaluators."

### Rubric Confirmation

After Discover, show rubric dimensions and baseline scores. Confirm with the user before Analyze. On first cycle only — subsequent cycles reuse the rubric.

### Analyze

**Purpose:** Generate improvement proposals.

Uses the current conversation model. Reads issues from Discover and generates specific before/after proposals.

**Proposal limits:** At most 10 proposals per cycle. Prioritize:
1. All HIGH severity issues first
2. MEDIUM, ordered by lowest-scoring rubric dimensions
3. LOW only if slots remain

If >10 HIGH issues, batch related issues into compound proposals. Note deferred issues for next cycle.

**Always show before/after** for each proposal. Store proposals as JSON at `<output_dir>/proposals.json`.

### Verify

**Purpose:** Multi-perspective validation of proposals.

Runs proposals through three personas in a single prompt:
- **Devil's Advocate:** What could go wrong? Edge cases, contradictions, ambiguities.
- **Conservative:** Could this break anything? Regressions, safety, scope creep.
- **Pragmatist:** Is this worth doing? Effort vs. impact, feasibility.

Produces a synthesized confidence score (0-10) per proposal.

**Default:** Runs automatically between Analyze and Approve in loop mode. Can be skipped for speed.

**For auto-approve decisions:** Use multi-round deliberation instead of single-pass evaluation — see Progressive Autonomy section.

### Approve

**Purpose:** Human reviews and decides.

Present all proposals in a single table, then one `AskUserQuestion`:

```
AskUserQuestion:
  Q1: "How would you like to handle these proposals?"
      header: "Approval"
      options:
        - "Approve all (Recommended)"
        - "Reject all"
        - "Let me review individually" → show each with before/after and Approve/Reject/Modify options
```

**Context capture during Approve:** Parse human responses for non-decision content (new facts, corrections, references). Store as context annotations for the next cycle. See Context Expansion section.

**Graduated auto-approve** (when configured):

| Rule | Config key | Effect |
|---|---|---|
| By severity | `auto-approve-severity` | Auto-approve LOW proposals; prompt for MEDIUM/HIGH |
| By verification confidence | `auto-approve-above-confidence` | Auto-approve if verification score >= threshold |
| By cycle | `auto-approve-after-cycle` | Auto-approve in later cycles if cycle 1 was fully human-approved |
| Combined | (all of above) | All rules must pass |

All graduated rules are off by default. When triggered, show proposals with "[Auto-approved]" tag and a one-click option to review instead.

### Apply

**Purpose:** Implement approved changes.

1. Check `git status`; warn if uncommitted changes exist
2. Update files with approved changes
3. Run basic validation (syntax check, format check)
4. Report success/failures

**No auto-commit.** Changes applied to files but left uncommitted. Batch multiple proposals targeting the same file into a single write operation.

**Proposal conflict resolution:** When two proposals target overlapping text, apply higher-severity first. Re-locate the second proposal's target in the modified file. If consumed, skip with a note.

### Measure

**Purpose:** Quantify improvements.

Spawn fresh Opus subagent(s) — must be new invocations (not reused from Discover) for independent scoring.

1. Write evaluator prompt to `<output_dir>/measure-evaluator-prompt.md`
2. Score all dimensions from scratch (no anchoring to prior scores)
3. Compare to baseline from Discover
4. Report per-dimension and average scores with deltas

**Convergence:** "Convergence achieved" = 0 HIGH or MEDIUM severity issues. LOW issues don't block convergence.

### Reflect (cycles 2+)

**Purpose:** Adapt the loop between cycles.

Runs a **structured checklist** of specific queries against cycle data:

1. **Rejected proposal check:** Were any proposals similar to ones rejected in prior cycles? → Exclude those categories next cycle.
2. **Modification pattern check:** Did the human modify proposals in a consistent direction (e.g., always shortened)? → Adjust generation style.
3. **Dimension saturation check:** Any dimensions scoring 9+ for two consecutive cycles? → Recommend dropping from active evaluation.
4. **Dimension stagnation check:** Any dimensions not improving despite approved proposals? → Suggest structural reorganization.
5. **Context utilization check:** Were any context annotations not reflected in proposals? → Prioritize next cycle.
6. **Convergence trajectory check:** Is the score delta decreasing? → Signal diminishing returns.
7. **Approval rate by dimension:** Low approval on a dimension? → May indicate rubric mismatch with user priorities.

Each check produces a specific, actionable output. Rubric changes can be recommended but require human confirmation.

---

## 7. Context Expansion

### Capture Mechanics

**During Approve:** Parse responses for non-decision content:

| Human says | Decision | Captured context |
|---|---|---|
| "Approve" | Approve | (none) |
| "Approve — and actually, the auth service expires tokens differently for legacy users" | Approve | Factual: different token expiry for legacy users |
| "Reject — we deprecated that feature last month" | Reject | Constraint: feature X is deprecated |
| "Modify — make it shorter" | Modify | Preference: user prefers concise text |

**At gap-detection moments:** When the AI hedges ("assuming rollback is standard..."), ask about the specific gap rather than asking generally for "more context."

### Context Storage

```json
{
  "cycle": 2,
  "annotations": [
    {
      "type": "factual",
      "content": "Auth service has different token expiry for legacy users",
      "source": "human response during Approve, proposal #3",
      "relevance": ["completeness", "accuracy"]
    }
  ]
}
```

### Context Integration

In the Reflect phase:
1. **Factual and constraint annotations:** Added to the next cycle's Discover prompt as known facts
2. **Preference annotations:** Used to adjust Analyze's generation style
3. **Reference annotations:** Prompt the user for referenced content before the next cycle

### Context Pruning

In Reflect:
- Resolved issues → archived
- Incorporated facts → archived
- Preferences → retained
- Constraints → retained until revoked

---

## 8. Progressive Autonomy (Human Role Dial)

### Role Tracking

```json
{
  "cycle": 3,
  "role": "supervisor",
  "reason": "Cycles 1-2 approved 90% of proposals with no modifications. All verification scores > 8.0.",
  "override": null
}
```

### Role Transitions

| From | To | Trigger |
|---|---|---|
| Reviewer | Supervisor | 2+ cycles with >80% approval rate and no modifications |
| Supervisor | Director | Domain is low-risk AND verification scores consistently > 8.0 |
| Any | Reviewer | Human says "wait, show me everything" or rejects an auto-approved proposal |
| Any | Reviewer | Score regression detected |
| Any | Reviewer | New domain or rubric change |

### What Each Role Means

| Phase | Reviewer | Supervisor | Director |
|---|---|---|---|
| **Discover** | Show full results | Show summary | Show only regressions |
| **Analyze** | Show all proposals with before/after | Show proposal table | Show proposal count |
| **Verify** | Show all persona results | Show only concerns | Run silently |
| **Approve** | Review every proposal | Auto-approve LOW/MEDIUM, review HIGH | Auto-approve all, notify of changes |
| **Apply** | Confirm before applying | Apply automatically | Apply automatically |
| **Measure** | Show full before/after scores | Show delta summary | Show only if regression |

### Multi-Agent Deliberation (for auto-approve)

When the role dial would skip human review, use deliberation instead of simple scoring:

**Round 1 — Independent evaluation:** Each persona evaluates independently.
**Round 2 — Cross-examination:** Each persona responds to others' concerns.
**Round 3 — Final positions:** Converge or maintain dissent.

- Unanimous approve → auto-approve, notify human
- Majority approve with dissent → auto-approve with caveat shown
- Any unresolved HIGH concern → escalate to human

All rounds run in a single structured prompt (one LLM call).

### The Pullback Mechanism

At every phase where the human would be skipped:

```
[Cycle 3 — 8 proposals auto-approved, 1 escalated] Type "review" to see everything.
```

Low-friction, always visible. The human can pull back to full Reviewer at any moment.

---

## 9. Loop Mode

### Cycle Behavior

**Max cycles:** Determined during interview. Default is 3.

**Fresh evaluation per cycle:** Each Discover MUST perform a full, independent rubric evaluation. Do not carry scores or issue lists forward.

**Approval gate per cycle:** After each Analyze, show the batch approval table. This is the only prompt per cycle (besides the initial interview).

### Stopping Conditions

| Condition | What happens |
|---|---|
| No HIGH/MEDIUM issues in Discover | Convergence — inform user, ask if they want another cycle |
| Max cycles reached | Stop, show summary, ask "Continue for more cycles?" |
| Score regression > 1.0 | Pause with warning |
| Score dip within noise (≤ 1.0) | Note at medium/detailed verbosity, continue |
| 4 cycles without convergence | Advisory: consider adjusting rubric or restructuring |
| Immediate convergence (cycle 1) | Note: verify rubric and target are correctly configured |

### Convergence for Creation vs. Improvement

When entering via Bootstrap, early cycles are in **expansion mode** (rubric weights completeness). When Discover shifts from finding "missing content" issues to "quality" issues, the loop has naturally transitioned to **refinement mode**. No special logic needed — the rubric handles this.

---

## 10. Rubric Generation Protocol

A structured 4-step process for creating evaluation rubrics:

### Step 1: Stakeholder Analysis

Ask: **Who are all the people who encounter this output, and what do they need from it?**

Minimum 4 stakeholders. Common stakeholders: end user, developer, ops/monitoring, security reviewer, QA, i18n team, designer, legal/compliance, accessibility user, API consumer.

### Step 2: Failure Mode Analysis

Ask: **What goes wrong when this output is bad?**

For each stakeholder need, identify: bad output example, consequence, severity, implied dimension.

### Step 3: Dimension Selection

Select **5-7 dimensions** from Steps 1-2. For each:
- **Name** — short, noun-based
- **Definition** — one sentence
- **Score anchors** — 0/10 (total failure), 5/10 (mediocre), 10/10 (excellent)
- **One before/after example**

Ensure coverage across categories: content quality, operational fitness, stakeholder safety, system integration, structural efficiency.

### Step 4: Adversarial Validation

Test the rubric against a deliberately bad test case. After running a cycle, ask:
- "What would a domain expert improve that the rubric didn't catch?"
- "What stakeholder would still be unhappy?"

The rubric is ready when a test run satisfies all identified stakeholders.

### Rubric Persistence

Save rubrics to `.claude/rubrics/<target-filename>.md` with dimensions, audience, and score history. On subsequent runs, offer to reuse, adjust, or start fresh.

---

## 11. Domain Adapter Structure

Domain templates provide domain-specific configuration for the engine. Each follows this structure:

```markdown
### [Domain Name]

**Audience:** [primary audience]
**Risk level:** LOW / MEDIUM / HIGH
**Collection:** [how to find targets]

| Pattern | Scope | Type |
|---|---|---|
| `throw new Error` | `src/` | Grep |
| `*.error.ts` | `src/` | Glob |

**Rubric:**

| Dimension | 0 (worst) | 5 (acceptable) | 10 (best) |
|---|---|---|---|
| ... | ... | ... | ... |

**Pre-checks:**

| Check | Tool | Severity |
|---|---|---|
| Syntax valid | `node --check` | FAIL → HIGH |
| No TODO/FIXME | Grep | WARN → MEDIUM |

**Apply strategy:** inline | batch | per-file

**Example (before → after):**
> Before: `throw new Error("Invalid input")`
> After: `throw new Error(\`Expected string for name, got ${typeof input}\`)`
```

Adding a new domain = filling in this template. No engine knowledge required.

---

## 12. Report Generation

After the final cycle, offer to generate a visual HTML report.

1. Read the HTML template from `assets/report-template.html`
2. Populate placeholder tokens with session data (scores, proposals, rubric, charts)
3. Generate an inline SVG bar chart showing score progression
4. Inline all static diagram SVGs for a self-contained file
5. Write to `./tmp/<topic>-<UTC_TIMESTAMP>/report.html`
6. Offer to open in browser via system command

---

## 13. State Management

### Within a Session

| State | Set by | Used by |
|---|---|---|
| `target_file` | Interview/Smart Skip | All phases |
| `audience` | Discover | Rubric generation, proposals |
| `rubric` | Discover | Analyze, Measure, Reflect |
| `issues` | Discover | Analyze |
| `baseline_scores` | Discover | Measure |
| `output_dir` | Discover | All subsequent phases |
| `proposals` | Analyze | Verify, Approve, Apply |
| `cycle_scores` | Measure | Reflect, Report, Stopping conditions |
| `context_annotations` | Approve | Reflect, next Discover |
| `role` | Role dial | All phases (controls what's shown/skipped) |

### Across Sessions

Conversation state is not persisted. Rubrics and score history persist to `.claude/rubrics/<target-filename>.md`. Session data (proposals, reports) lives in `./tmp/<topic>-<UTC_TIMESTAMP>/`.

---

## 14. Safety Features

- **Human approval required** — Approval gate every cycle by default
- **No auto-commit** — Changes applied to files but not committed
- **Verification available** — Multi-persona validation of proposals
- **Reversible** — Easy to revert with git
- **Measurable** — Always shows before/after metrics
- **Pullback** — Human can return to full review mode at any time

---

## 15. Configuration

Settings stored in `.claude/refine-config.json`:

```json
{
  "verification": "enabled",
  "confidence_threshold": 6.0,
  "auto_approve": false,
  "auto_approve_severity": [],
  "auto_approve_above_confidence": null,
  "auto_approve_after_cycle": null,
  "default_max_cycles": 3,
  "default_verbosity": "medium"
}
```

All auto-approve rules off by default. Read config at the start of any session and apply settings.

---

## 16. Error Handling

| Error | Recovery |
|---|---|
| Subagent fails or times out | Retry once. Fall back to conversation model with quality warning. |
| Target file not found | Ask user to confirm path. In domain mode, show found vs. missing files. |
| Rubric file invalid | Offer to generate fresh using the protocol. |
| Report template missing | Show results inline instead. |
| Config file malformed | Show parse error, use defaults, offer to reset. |
| Pre-check tool unavailable | Skip that check, note it, continue with LLM evaluation. |
| Proposal apply fails | Show failed edit, current state, and intended change. Ask user to apply manually or skip. |

---

## 17. Open Questions

### Should the rubric auto-adapt for creation vs. improvement?

**Recommendation:** Auto-generate with completeness weighting for creation, but always show the rubric for confirmation. The human can override.

### Should context annotations persist across sessions?

**Recommendation:** No. Context annotations are tightly coupled to a specific session. If the human wants something remembered, they should put it in the artifact or the rubric.

### Should Reflect modify the rubric autonomously?

**Recommendation:** Allow auto-adjustment of dimension weights only after cycle 2, only for Supervisor/Director role, only for changes < 20%. Anything larger requires human confirmation.

### How should the skill handle multi-file creation?

**Recommendation:** Bootstrap creates one file at a time. Use domain sweep mode for multi-file improvement. Multi-file creation from scratch is a different capability.
