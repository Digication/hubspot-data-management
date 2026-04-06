# Refine: Iterative Artifact Creation and Improvement

A domain application of the [Resonance Principles](../principles.md) for creating and improving documents, code, specifications, and structured content through rubric-driven iterative loops.

---

## The Problem

When a human collaborates with AI on an artifact — a document, a spec, a configuration — the standard workflow is: describe what you want, receive output, review, repeat. This workflow is bounded by what the human manages to articulate at the start.

```
What the human knows:              [============================]
What the human provides upfront:   [========]
What the AI works with:            [========]
What the output covers:            [========]
```

The AI's output inherits every gap in the initial specification. Review catches what the human notices, not what would actually be best. There's no systematic evaluation, no convergence criteria, and no mechanism for surfacing the knowledge gap.

Refine closes this gap through iterative loops that show concrete proposals and capture the human's reactions — reactions that carry more context than any upfront specification would.

---

## How It Works

### The Loop

```
Bootstrap (if no artifact exists)
  Extract → Draft → [enter loop]

Loop (repeats until convergence)
  Discover → Analyze → Verify → Approve → Apply → Measure → Reflect
```

Bootstrap is not a separate mode — it's the loop's entry point when there's nothing to evaluate yet. After the draft is generated, the loop takes over identically. Creation and improvement are the same process at different starting points.

```
Creation:    [nothing] → brain dump → draft → loop → loop → converged artifact
Improvement: [existing artifact] ───────────→ loop → loop → converged artifact
```

### Phases

| Phase | Input | Output | Core Question |
|---|---|---|---|
| **Extract** | User's brain dump + project context | Structured requirements | "Here's what I think you need — what's wrong?" |
| **Draft** | Structured requirements | First concrete artifact | "Here's a first pass — react to it." |
| **Discover** | Current artifact + rubric | Scored issues list + baseline | "What's wrong and how bad is it?" |
| **Analyze** | Issues list + context | Concrete proposals (before/after) | "Here's how to fix each issue." |
| **Verify** | Proposals | Confidence scores + concerns | "Would these changes actually help?" |
| **Approve** | Proposals + verification | Decisions + new context | "Which of these do you want?" |
| **Apply** | Approved proposals | Updated artifact | (mechanical — no judgment) |
| **Measure** | Updated artifact + rubric | New scores + deltas | "Did it actually improve?" |
| **Reflect** | Cross-cycle patterns | Adapted strategy for next cycle | "What should change about how I work?" |

### Context Expansion

Each cycle does two things: improves the artifact and expands available context. The second effect drives the first.

When the human reviews proposals, their responses carry information beyond the decision:

| Human says | Decision captured | Context captured |
|---|---|---|
| "Approve" | Approve | (none) |
| "Approve — and the auth service handles legacy tokens differently" | Approve | Factual: different token handling for legacy |
| "Reject — we deprecated that feature" | Reject | Constraint: feature is deprecated |
| "Modify — make it shorter" | Modify | Preference: concise text preferred |

Context annotations are stored per-cycle and integrated into subsequent cycles. Factual and constraint annotations feed into the next Discover prompt. Preference annotations adjust proposal generation style. Resolved context is pruned.

When the AI generates text containing hedges or assumptions ("assuming the rollback process is standard..."), it should ask about the specific gap rather than proceeding. This is gap-specific inquiry — a verification prompt about something concrete, not a generation prompt asking for general input.

---

## The Rubric

Quality must be defined before it can be measured. The rubric is not optional — it's what makes the loop systematic rather than ad hoc.

### Generation Protocol

**Step 1 — Stakeholder Analysis:** Who encounters this output, and what do they need from it? Minimum 4 stakeholders. A README has: the new developer, the existing developer, the CI system, the project maintainer. An error message has: the end user, the developer debugging, the ops engineer, the security reviewer.

**Step 2 — Failure Mode Analysis:** What goes wrong when this output is bad? For each stakeholder need, identify the failure, its real-world consequence, and its severity. Focus on HIGH and MEDIUM failures — these become required rubric dimensions.

**Step 3 — Dimension Selection:** 5-7 dimensions from Steps 1-2. For each: a name, a one-sentence definition, score anchors at 0/10, 5/10, and 10/10, and one before/after example. Ensure coverage across content quality, operational fitness, stakeholder safety, and structural efficiency.

**Step 4 — Adversarial Validation:** Test the rubric against a deliberately bad sample. After one cycle, ask: "What would a domain expert improve that the rubric didn't catch?" Any gap found means a missing dimension.

### Audience Detection

The audience shapes the entire rubric — "clarity" means different things for an AI agent (unambiguous, machine-parseable) vs. a human reader (plain language, scannable).

Detection priority:
1. User-specified audience
2. Path-based rules (e.g., `.claude/skills/**` → AI agent, `docs/**` → human reader, `src/**` → developer)
3. Content-based signals (imperative verbs + rule tables → AI agent; prose paragraphs → human reader)
4. Default: mixed

### Persistence

Rubrics persist across sessions at `.claude/rubrics/<target-filename>.md` with dimensions, audience, and score history. On subsequent runs, the skill offers to reuse, adjust, or start fresh.

---

## Bootstrap: Creation From Nothing

### When It Activates

Automatically when:
- Target file doesn't exist or is nearly empty
- User's intent matches creation signals ("I need a...", "help me write a...", "draft a...")
- User provides a brain dump without referencing an existing file

### Extract

Gather requirements through verification, not generation.

1. Read available context: project structure, file path hints, user's stated goal, matching domain template
2. Generate a **proposed outline** from context: "Based on [sources], here's what I think this needs — what's missing or wrong?"
3. Present with options: looks right / missing something / wrong direction
4. If the user adds context, capture it and regenerate

Keep Extract to 1-2 rounds in most cases. The goal isn't a perfect outline — it's a starting point concrete enough to trigger reactions when the draft is reviewed. For complex domains where the AI has limited context, allow more rounds rather than producing a draft that's outside the productive wrongness band.

If the user provides a brain dump directly, skip Extract and go straight to Draft.

### Draft

Generate a complete first artifact from the extracted requirements.

The draft should be **intentionally comprehensive and specific** rather than cautious and vague. It's easier for the human to say "remove that section" than to realize it's missing. It's more productive for the draft to guess wrong about the auth token format than to hedge with "the authentication process should be documented."

The quality bar: specific enough that every paragraph triggers either "yes" or "no, actually..." from the human.

After the draft is written to the target file, the standard loop takes over. No special handling needed.

### When the Draft Makes Decisions

For technical content (specs, architecture docs), the draft inevitably makes design decisions — choosing token bucket over sliding window, proposing specific endpoints, picking data structures. These are opinions, not facts.

The Analyze phase should flag opinionated sections in its proposals: "This proposes token bucket — is that the right algorithm, or should it be sliding window?" This turns a design decision into a verification prompt rather than letting it pass unexamined.

---

## Discover

### Deterministic Pre-Checks

Before LLM evaluation, run fast automated checks appropriate to the file type:

| File type | Checks |
|---|---|
| **Markdown** | Broken links, heading hierarchy gaps, empty sections, missing image refs |
| **Code** | Syntax validation, import resolution, TODO/FIXME count |
| **JSON/YAML** | Parse validation, schema validation |
| **Structured docs** | Required section presence |
| **Any file** | Line count, readability estimate, duplication detection |

Pre-check failures at FAIL severity become HIGH issues. WARN becomes MEDIUM. INFO is displayed but doesn't create issues unless the rubric also flags them.

### Multi-Evaluator Scoring

For precise measurement (loop mode), use 2-3 independent evaluations in parallel with identical prompts. Average scores per dimension and report spread. When spread exceeds 1.5 on any dimension, flag it.

Write the evaluator prompt to a file before spawning evaluators. This makes it structurally impossible to accidentally vary prompts and makes the prompt inspectable.

Use the union of all issues found (deduplicated). Two issues are duplicates when they reference the same rubric dimension AND the same target region.

### Rubric Confirmation

After Discover completes (first cycle only), show the rubric dimensions, audience classification, and baseline scores. Confirm before proceeding. The rubric shapes everything downstream — if it's wrong, everything is wrong.

---

## Analyze

Generate at most 10 improvement proposals per cycle. Prioritize: all HIGH issues first, then MEDIUM by lowest-scoring dimension, then LOW if slots remain.

Each proposal must include before/after text — the user must see exactly what will change. Store proposals as structured data for reporting.

For issues exceeding 10, batch related items into compound proposals ("Fix 5 broken links" as one proposal). Note deferred issues for the next cycle.

When the target has structural problems (wrong organization, scattered related content, duplication), generate structural proposals — these affect the whole document rather than specific text regions. Flag structural proposals explicitly so the Apply phase handles them correctly.

---

## Verify

Three evaluation perspectives in a single prompt:

- **Devil's Advocate:** What could go wrong? Edge cases, contradictions, unintended consequences.
- **Conservative:** Could this break anything? Regressions, compatibility, scope creep.
- **Pragmatist:** Is this worth doing? Effort vs. impact, feasibility, alternatives.

Produces a synthesized confidence score (0-10) per proposal. Runs automatically in loop mode between Analyze and Approve.

For auto-approve decisions (when progressive autonomy would skip human review), use multi-round deliberation instead of single-pass evaluation. The perspectives examine each other's concerns, concede or defend, and produce a rationale — not just a number.

---

## Approve

Present all proposals in a single table. One decision prompt — not per-proposal questions.

Options: approve all, reject all, or review individually. Individual review shows full before/after with approve/reject/modify per proposal.

### Context Capture

After each decision, parse the human's response for non-decision content. New facts, corrections, references, and preferences are captured as context annotations for the next cycle.

### Graduated Auto-Approve

When configured, proposals can be auto-approved based on rules:
- By severity (auto-approve LOW, prompt for HIGH)
- By verification confidence (auto-approve above a threshold)
- By cycle (auto-approve in later cycles after the human validated direction in cycle 1)

All rules off by default. When triggered, show an "[Auto-approved]" tag with one-click option to review instead.

---

## Apply

Implement approved changes. Check git status, update files, run validation. Do not auto-commit — leave changes uncommitted for the user to review.

Batch multiple proposals targeting the same file. When proposals conflict (overlapping text regions), apply higher-severity first, re-locate the second proposal, skip if consumed.

For structural proposals (reorganization), apply as a whole-file rewrite rather than targeted edits.

---

## Measure

Spawn fresh independent evaluators (not reused from Discover) with the same rubric. Score all dimensions from scratch. Compare to baseline.

Convergence: 0 HIGH or MEDIUM issues. LOW issues don't block convergence. The human's "good enough" overrides metrics.

---

## Reflect (Cycles 2+)

A structured checklist, not open-ended analysis:

1. **Rejected proposal check:** Were proposals similar to previously rejected ones? → Exclude those categories.
2. **Modification pattern check:** Did the human consistently modify in one direction (shorter, more specific, different tone)? → Adjust generation style.
3. **Dimension saturation check:** Any dimensions at 9+ for two cycles? → Recommend dropping from active evaluation.
4. **Dimension stagnation check:** Any dimensions not improving despite approved proposals? → Suggest structural reorganization.
5. **Context utilization check:** Were context annotations not reflected in proposals? → Prioritize next cycle.
6. **Convergence trajectory check:** Score delta decreasing? → Signal diminishing returns.
7. **Approval rate by dimension:** Low approval on a dimension? → May indicate rubric mismatch.
8. **Audience alignment check:** Are proposals consistently modified toward a different audience than the rubric targets? → Suggest rubric recalibration.

Rubric changes can be recommended but require human confirmation.

---

## Progressive Autonomy

### Role Tracking

The skill tracks the human's role per cycle: Reviewer, Supervisor, or Director.

### Transitions

| From | To | Trigger |
|---|---|---|
| Reviewer | Supervisor | 2+ cycles with >80% approval and no modifications |
| Supervisor | Director | Low-risk domain AND verification scores consistently > 8.0 |
| Any | Reviewer | Human requests full review, rejects an auto-approved proposal, score regresses, or rubric changes |

### What Each Role Means

| Phase | Reviewer | Supervisor | Director |
|---|---|---|---|
| Discover | Full results | Summary | Only regressions |
| Analyze | All proposals with before/after | Proposal table | Proposal count |
| Verify | All persona results | Only concerns | Silent |
| Approve | Review everything | Auto-approve LOW/MEDIUM, review HIGH | Auto-approve all, notify |
| Apply | Confirm first | Automatic | Automatic |
| Measure | Full scores | Delta summary | Only if regression |

### Pullback

At every phase where the human would be skipped:

```
[Cycle 3 — 8 proposals auto-approved, 1 escalated] Type "review" to see everything.
```

---

## Domain Adapters

Domain-specific configuration for the engine. Each follows a consistent structure:

```
Domain Adapter:
  Name:           error-messages
  Audience:       developer + end user
  Risk level:     MEDIUM
  Collection:     grep patterns (throw new Error, .status(4xx), ValidationError) in src/
  Rubric:         6 dimensions (Clarity, Runtime Context, Actionability, 
                  Log Distinguishability, Consistency, Information Safety)
  Pre-checks:     syntax validation, duplicate message detection
  Apply strategy: per-file (each error message is independent)
  Examples:       before/after for each dimension
```

Adding a new domain = filling in this template. No engine knowledge required.

---

## Loop Mode

### Stopping Conditions

| Condition | Action |
|---|---|
| No HIGH/MEDIUM issues | Convergence — offer to stop |
| Max cycles reached | Stop, show summary, offer to continue |
| Score regression > 1.0 | Pause with warning |
| Score plateau (delta < 0.5 for 2 cycles) | Suggest stopping or restructuring |
| 4 cycles without convergence | Advisory: adjust rubric or restructure |
| Human says "good enough" | Stop immediately |

### Creation vs. Improvement Convergence

When entering via Bootstrap, early cycles are in expansion mode — the rubric weights completeness. When Discover shifts from finding "missing content" issues to "quality of existing content" issues, the loop transitions to refinement mode naturally. No special logic — the rubric handles it.

---

## Standalone Modes

| Mode | When | What it does |
|---|---|---|
| **Discover only** | "What's wrong with this file?" | Evaluate, show issues, stop |
| **Analyze only** | "Suggest improvements" | Evaluate + propose, stop |
| **Rubric** | "Generate a rubric for X" | Run the generation protocol, save or use |
| **Domain sweep** | "Refine all error messages" | One rubric across many files, batch processing |

---

## Entry Point

Conversational invocation — natural language, no flags.

| User says | Inferred intent |
|---|---|
| "refine README.md" | Loop (full cycle) |
| "I need a migration guide" / brain dump | Create (bootstrap + loop) |
| "what's wrong with this file?" | Discover only |
| "suggest improvements" | Analyze only |
| "generate a rubric for..." | Rubric generation |
| "refine our error messages" | Domain sweep |
| "what can I refine?" | Explore use cases |

### Smart Skip

Skip the full interview when both target and mode are clear from the user's message. Show a short confirmation prompt with defaults instead.

### Interview

When target or mode is ambiguous, use structured prompts (clickable options, not free text) to determine: what to work on, what the goal is, how much detail to show, and how many cycles.

Adjust language and defaults based on the user's profile tier (guided, supported, standard, expert).

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
| `output_dir` | Discover | All subsequent phases |
| `proposals` | Analyze | Verify, Approve, Apply |
| `cycle_scores` | Measure | Reflect, Stopping conditions |
| `context_annotations` | Approve | Reflect, next Discover |
| `role` | Role dial | All phases |

### Across Sessions

Rubrics and score history persist to `.claude/rubrics/`. Session data (proposals, reports) lives in `./tmp/<topic>-<timestamp>/`.

---

## Report Generation

After the final cycle, offer to generate a self-contained HTML report with: score progression chart, per-cycle summaries, proposal tables with decisions, rubric definition, and model usage details. The report is a single file with no external dependencies.

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
  "default_verbosity": "medium"
}
```

---

## Error Handling

| Error | Recovery |
|---|---|
| Evaluator subagent fails | Retry once, fall back to conversation model with quality warning |
| Target file not found | Ask user to confirm path |
| Rubric file invalid | Offer to generate fresh |
| Report template missing | Show results inline |
| Config malformed | Use defaults, offer to reset |
| Pre-check tool unavailable | Skip, note, continue with LLM evaluation |
| Proposal apply fails | Show failed edit, ask user to apply manually or skip |

---

## What Refine Is Not

- **Not a code generator.** It improves existing code and creates documents, but doesn't architect or implement features.
- **Not for subjective aesthetics.** Pure visual design, naming preferences, and brand voice resist rubric-driven evaluation. For creative content with measurable aspects (email campaigns, marketing copy), the framework handles the measurable dimensions but can't replace judgment on taste.
- **Not a replacement for brainstorming.** It needs a direction, even a vague one. If you don't know what you want, start with open-ended exploration.
