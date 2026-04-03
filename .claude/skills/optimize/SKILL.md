---
name: optimize
description: Multi-mode autonomous optimization system that improves specifications, documentation, and code through test-driven feedback loops with optional multi-LLM verification
trigger: when user asks to optimize something, improve a spec, refactor documentation, or auto-enhance code quality
---

# Optimize

You orchestrate the complete autonomous optimization system, guiding users through test-driven improvements of their specifications, documentation, code, and rules.

## Core Concept

The optimization system works in phases:
1. **Discover** — Identify issues in current state (via tests, rubrics, or analysis)
2. **Analyze** — LLM proposes specific improvements
3. **Verify** (Optional) — Multi-LLM perspectives validate proposals (Devil's Advocate, Conservative, Pragmatist)
4. **Approve** — Human reviews and decides
5. **Apply** — Implement approved changes
6. **Verify** — Retest and measure improvement

This system improves specs/docs/rules by **150-300%** while maintaining human oversight.

## Modes

### Mode 1: `optimize discover`

**Purpose:** Identify issues in current state

**Usage:**
```
/optimize discover --target=<file> --rubric=<rubric_file>
/optimize discover --domain=error-messages
/optimize discover --domain=documentation --target=README.md
```

**What it does:**
1. Reads target file/spec
2. Evaluates against rubric (or creates default)
3. Identifies gaps, contradictions, missing information
4. Outputs structured list of issues

**Example:**
```
/optimize discover --target=README.md --rubric=docs/clarity-rubric.md

DISCOVERY RESULTS
===============
File: README.md
Rubric: Documentation Clarity

Issues Found: 12
- HIGH: Prerequisites incomplete (missing Docker, pnpm)
- HIGH: No Step 3 (how to start project)
- MEDIUM: Onboarding unclear (where to type?)
- MEDIUM: No troubleshooting section
- LOW: Fork instructions lack detail

Baseline Quality: 5/10 (clarity), 5/10 (completeness)
Next Step: Run `/optimize analyze` to get improvement proposals
```

---

### Mode 2: `optimize analyze`

**Purpose:** Generate improvement proposals

**Usage:**
```
/optimize analyze --target=<file> --issues-from=<discovery_output>
/optimize analyze --domain=error-messages --file=src/errors.ts
/optimize analyze --spec=README.md --count=5
```

**What it does:**
1. Reads current state
2. Reads identified issues
3. LLM proposes specific improvements
4. Shows before/after for each proposal
5. Estimates impact

**Example:**
```
/optimize analyze --target=README.md --issues-from=discover_results.txt

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

[Continue for each proposal...]

Estimated Improvement: 5/10 → 8/10 (+60%)
Next Step: Run `/optimize approve` to accept/reject proposals
```

---

### Mode 3: `optimize approve`

**Purpose:** Review proposals with optional verification

**Usage:**
```
/optimize approve --proposals=<analysis_output>
/optimize approve --proposals=proposals.txt --verify
/optimize approve --verify-personas=devil_advocate,conservative
```

**What it does:**
1. Shows each proposal with before/after
2. (Optional) Runs multi-LLM verification:
   - Devil's Advocate: "What could go wrong?"
   - Conservative: "Could this break anything?"
   - Pragmatist: "Is this worth doing?"
   - Synthesis: Aggregate results into confidence score
3. Asks human for approve/reject/modify each proposal
4. Records approval decisions

**With Verification:**
```
/optimize approve --proposals=proposals.txt --verify

PROPOSAL 1: Add Docker Prerequisites
- Confidence Score: 8.2/10 ✅ HIGH CONFIDENCE

Devil's Advocate: "Valid proposal, no critical issues"
Conservative: "Safe (docs only), zero regressions"
Pragmatist: "High ROI (saves users 20 minutes)"

Recommend: APPROVE
Your decision: (A)pprove / (R)eject / (M)odify / (D)Details
```

**Without Verification (Quick Mode):**
```
/optimize approve --proposals=proposals.txt

PROPOSAL 1: Add Docker Prerequisites
- Before: "That's all you need"
- After: "Ensure: Claude Code, VS Code, Docker, pnpm, Git, GitHub"

Approve? (Y/N/M)
```

---

### Mode 4: `optimize apply`

**Purpose:** Implement approved changes

**Usage:**
```
/optimize apply --approved=<approval_decisions>
/optimize apply --proposals=proposals.txt --approved-indices=1,2,4
/optimize apply --interactive
```

**What it does:**
1. Updates files with approved changes
2. Creates git commits for each change
3. Runs basic validation (syntax, format checks)
4. Reports success/failures

**Example:**
```
/optimize apply --approved=approvals.txt

APPLYING CHANGES
===============
Proposal 1: Add Docker Prerequisites
  ✅ Updated: README.md (line 8-17)
  ✅ Committed: "docs(README): add Docker prerequisites"

Proposal 2: Add Step 3 - Docker Startup
  ✅ Updated: README.md (after Step 2)
  ✅ Committed: "docs(README): add docker compose startup instructions"

Proposal 4: Add Troubleshooting Section
  ✅ Updated: README.md (new section)
  ✅ Committed: "docs(README): add troubleshooting section"

Applied: 3 proposals, 0 failures
Next Step: Run `/optimize measure` to see improvement
```

---

### Mode 5: `optimize measure`

**Purpose:** Quantify improvements

**Usage:**
```
/optimize measure --target=<file> --rubric=<rubric>
/optimize measure --compare before.txt after.txt
/optimize measure --domain=error-messages --metric=clarity
```

**What it does:**
1. Re-evaluates target against rubric
2. Compares before/after metrics
3. Calculates improvement percentage
4. Projects future improvements (if cycling)

**Baseline Detection:**
- **Automatic (recommended):** If you just ran discover, measure automatically retrieves that baseline from the session. You do NOT need to manually specify it.
- **Manual:** If baseline was from a previous session, pass `--before-score=X` (e.g., `--before-score=5.2` for 5.2/10 baseline)
- **Automatic from loop:** In loop mode, baseline is automatically carried forward from the previous cycle's measurement
- Measure compares: (after score) - (baseline score) = improvement %

**Example:**
```
/optimize measure --target=README.md --rubric=clarity-rubric.md

MEASUREMENT RESULTS
=================
Domain: Documentation (README)
Date: 2026-04-03

BEFORE (Baseline):
- Clarity: 5/10
- Completeness: 5/10
- Actionability: 6/10
- Average: 5.3/10

AFTER (Current):
- Clarity: 9/10 (+80%)
- Completeness: 9/10 (+80%)
- Actionability: 9/10 (+50%)
- Average: 9/10 (+69%)

BUSINESS IMPACT:
- Setup time: 45min → 5min (-89%)
- User confusion: High → Low (-70%)
- Support tickets: 3/week → 0/week

STATUS: ✅ Convergence achieved (no major issues in last cycle)
```

---

### Mode 6: `optimize loop`

**Purpose:** Run multiple cycles automatically

**Usage:**
```
/optimize loop --target=<file> --domain=<domain> --max-cycles=3
/optimize loop --domain=error-messages --threshold=0.9
/optimize loop --until-convergence
```

**What it does:**
1. Runs discover → analyze → approve → apply → measure
2. Loops until convergence (0 new issues) or max cycles
3. Shows progress and stops when value diminishes

**Approval Gates in Loop Mode:**
- By default, loop requires human approval at each cycle's approve step
- Use `--auto-approve` to skip human approval (NOT recommended for production)
- Each cycle pauses and asks: "(A)pprove / (R)eject / (M)odify / (D)Details" for each proposal
- If you want truly hands-off looping, use `--auto-approve`, but this bypasses safety checks

**Example:**
```
/optimize loop --target=errors.ts --domain=error-messages --max-cycles=3

CYCLE 1
=======
Discover: 12 issues found
Analyze: 6 proposals generated
Approve: (user approves 5)
Apply: 5 changes applied
Measure: 2/10 → 5/10 (+150%)

CYCLE 2
=======
Discover: 4 issues found (declining)
Analyze: 3 proposals generated
Approve: (user approves 2)
Apply: 2 changes applied
Measure: 5/10 → 7/10 (+40%)

CYCLE 3
=======
Discover: 0 new issues found
Status: CONVERGENCE ACHIEVED ✅

FINAL RESULTS
=============
Starting quality: 2/10
Final quality: 7/10
Total improvement: +250%
Cycles: 3
Time invested: 1.5 hours
Value created: Significant (errors now actionable)
```

---

### Mode 7: `optimize template`

**Purpose:** Use pre-built domain templates

**Usage:**
```
/optimize template --list
/optimize template --domain=error-messages
/optimize template --domain=help-text --show
/optimize template --domain=code-comments --apply
```

**What it does:**
1. Lists available templates (30+ domains)
2. Shows template details (rubric, examples, expected impact)

**Available Templates:**
The system includes 30 domain templates for specialized optimization:
3. Applies template to your project
4. Guides through full optimization cycle

**Template & Rubric Behavior:**
- Each template includes a pre-built rubric optimized for that domain (e.g., error-messages template includes clarity/completeness/actionability rubric)
- Templates are TYPE-based (apply to all error messages, all help text, etc.), not file-based
- When you use `--domain=error-messages`, the template automatically applies its rubric to all error patterns in your codebase
- To override the template's rubric: `optimize template --domain=error-messages --custom-rubric=my-rubric.md`
- Default rubric is always used unless you explicitly provide a custom one via `--custom-rubric`

**Example:**
```
/optimize template --domain=error-messages

TEMPLATE: Error Messages Optimization
====================================
Target: All error messages in codebase
Complexity: Low
Time to first result: 20 minutes
Expected improvement: +200%

What it improves:
- Clarity: Users know what went wrong
- Completeness: Users understand why
- Actionability: Users know how to fix

Quick start:
1. Collect error messages: grep -r "throw new Error" src/
2. Run: /optimize discover --domain=error-messages
3. Continue through analyze → approve → apply → measure

Ready to start? (Y/N)
```

---

### Mode 8: `optimize verify`

**Purpose:** Multi-LLM verification of proposals (standalone)

**Usage:**
```
/optimize verify --proposal=<proposal_text>
/optimize verify --proposals=proposals.txt
/optimize verify --persona=devil_advocate
/optimize verify --all-personas
```

**What it does:**
1. Runs proposal through Devil's Advocate LLM
2. Runs through Conservative LLM
3. Runs through Pragmatist LLM
4. Synthesizes into confidence score
5. Provides recommendation

**Proposal Format Requirements:**
- Proposal text should be under 1000 tokens (~750 words max)
- Should describe a single improvement idea (not multiple)
- Format: Plain text description of what should change (e.g., "Add Docker prerequisites to README")

**Example:**
```
/optimize verify --proposal="Add Docker prerequisites to README"

VERIFICATION RESULTS
===================
Proposal: Add Docker prerequisites to README

DEVIL'S ADVOCATE REVIEW
- Issues found: 0
- Severity: None
- Recommendation: ✅ No critical flaws

CONSERVATIVE REVIEW
- Risk level: Minimal (docs only)
- Backwards compatible: Yes
- Recommendation: ✅ Safe to apply

PRAGMATIST REVIEW
- Effort: 5 minutes
- ROI: High (saves users 20 minutes each)
- Feasibility: Easy
- Recommendation: ✅ Worth doing

SYNTHESIS
- Confidence score: 8.7/10
- Recommendation: APPROVE_CONFIDENTLY
```

---

### Mode 9: `optimize config`

**Purpose:** Customize optimization settings

**Usage:**
```
/optimize config --show
/optimize config --set verification=enabled
/optimize config --set personas=devil_advocate,conservative
/optimize config --set confidence-threshold=7.0
/optimize config --domain-specific error-messages --threshold=6.5
```

**What it does:**
1. Shows current configuration
2. Updates settings
3. Saves domain-specific customizations
4. Validates configuration

**Configuration Schema:**

Global settings (stored in `.claude/optimize-config.json`):
- `verification` (enabled/disabled) — Enable/disable multi-LLM verification layer
- `personas` (comma-separated list) — Which personas to use: devil_advocate, conservative, pragmatist
- `confidence-threshold` (0-10) — Minimum confidence score to approve proposals (default: 6.0)
- `auto-approve` (true/false) — Skip human approval (default: false, NOT recommended)
- `output-format` (human/json) — Output format (default: human-readable)

Domain-specific settings override global settings:
- `--domain-specific error-messages --threshold=6.5` — Override confidence threshold for error-messages domain only

**Validation Rules:**
- `confidence-threshold` must be 0.0-10.0 (enforced, invalid values rejected with error)
- `personas` must be comma-separated values from: devil_advocate, conservative, pragmatist, synthesis
- `verification` must be true/false
- `auto-approve` must be true/false
- Invalid settings generate error: "Invalid config: {setting}={value}. Valid values: ..."

**Example:**
```
/optimize config --show

CURRENT CONFIGURATION
====================
Global Settings:
  verification: enabled
  personas: devil_advocate, conservative, pragmatist
  confidence-threshold: 6.5
  auto-approve: false
  output-format: human

Domain-Specific Overrides:
  error-messages:
    threshold: 6.5
  documentation:
    personas: devil_advocate, pragmatist
```

---

### Mode 10: `optimize status`

**Purpose:** Show optimization history and metrics

**Usage:**
```
/optimize status
/optimize status --domain=error-messages
/optimize status --show-metrics
/optimize status --export-json
```

**What it does:**
1. Shows recent optimization cycles (last 10 cycles or 30 days, whichever is smaller)
2. Displays metrics by domain
3. Tracks improvement trends
4. Exports data for analysis

**Example Output:**
```
STATUS REPORT
=============
Last 10 Cycles (showing most recent 3)

CYCLE 3 (2026-04-03 14:32)
Domain: error-messages
Duration: 25 minutes
- Discover: 4 issues found
- Analyze: 2 proposals
- Approve: 2 approved, 0 rejected
- Apply: 2 changes applied
- Measure: 5/10 → 7/10 (+40%)
Status: CONVERGENCE (0 new issues next cycle)

CYCLE 2 (2026-04-03 14:05)
Domain: error-messages
Duration: 28 minutes
- Discover: 12 issues found
- Analyze: 6 proposals
- Approve: 5 approved, 1 rejected
- Apply: 5 changes applied
- Measure: 2/10 → 5/10 (+150%)
Status: Continuing (more improvements possible)

CYCLE 1 (2026-04-03 13:30)
Domain: error-messages
Duration: 35 minutes
- Discover: 12 issues found
- Analyze: 5 proposals
- Approve: 4 approved, 1 rejected
- Apply: 4 changes applied
- Measure: Baseline established (2/10)
Status: Starting

SUMMARY BY DOMAIN
=================
error-messages: Cycles 3, Quality 2/10 → 7/10 (+250%)
documentation:  Cycles 1, Quality 5/10 → 8/10 (+60%)

METRICS
=======
Total cycles: 4
Total time: 2 hours
Average improvement per cycle: +150%
Convergence rate: 50% (2 of 4 reached convergence)
```

---

## Decision Tree: Which Mode to Use

```
What do you want to do?

├─ See what's broken?
│  └─ /optimize discover
│
├─ Get improvement ideas?
│  └─ /optimize analyze
│
├─ Review proposals (with/without verification)?
│  └─ /optimize approve [--verify]
│
├─ Make changes?
│  └─ /optimize apply
│
├─ Measure impact?
│  └─ /optimize measure
│
├─ Run multiple cycles?
│  └─ /optimize loop
│
├─ Use pre-built template?
│  └─ /optimize template --domain=<name>
│
├─ Get detailed verification?
│  └─ /optimize verify
│
├─ Adjust settings?
│  └─ /optimize config
│
└─ See history?
   └─ /optimize status
```

## Quick Start: Full Cycle in 30 Minutes

### Example: Optimize Error Messages

```bash
# Step 1: Discover issues (5 min)
/optimize discover --domain=error-messages

# Step 2: Get proposals (5 min)
/optimize analyze --domain=error-messages

# Step 3: Review & approve (5 min)
/optimize approve --verify  # Shows confidence scores

# Step 4: Apply changes (5 min)
/optimize apply --approved=approvals.txt

# Step 5: Measure improvement (5 min)
/optimize measure --domain=error-messages

# Result: +200% improvement, documented, tested ✅
```

## Parameters

### Global Parameters
- `--help` — Show help for any mode
- `--verbose` — Show detailed output
- `--dry-run` — Show what would happen without applying
- `--json` — Output in JSON format
- `--quiet` — Minimal output

### Domain Parameters
- `--domain=<name>` — Use pre-built domain (error-messages, documentation, comments, etc.)
- `--target=<file>` — File to optimize
- `--rubric=<file>` — Evaluation rubric to use

### Verification Parameters
- `--verify` — Enable multi-LLM verification
- `--personas=<list>` — Specific personas (devil_advocate, conservative, pragmatist)
- `--threshold=<0-10>` — Confidence threshold (skip proposals below this)

### Cycle Parameters
- `--max-cycles=<n>` — Maximum cycles (default: 3)
- `--until-convergence` — Loop until 0 issues found
- `--auto-approve` — Skip human approval (not recommended)

**Flag Precedence (when both provided):**
- `--until-convergence` takes precedence over `--max-cycles`
- Example: `/optimize loop --max-cycles=3 --until-convergence` will run until convergence (0 new issues), ignoring the 3-cycle limit
- Use one or the other, not both, to avoid confusion

## Output Format

By default, outputs are human-readable. Use `--json` for automation:

```json
{
  "mode": "discover",
  "domain": "error-messages",
  "baseline_quality": 2.5,
  "issues": [
    {
      "severity": "high",
      "description": "Errors are too vague",
      "example": "Invalid input",
      "impact": "Users don't know what to fix"
    }
  ],
  "next_step": "analyze"
}
```

## Examples

### Optimize Error Messages (20 min)
```
You: Optimize my error messages
Claude: Let's improve your error messages to be clearer and more actionable.
        This typically takes 20 minutes and improves clarity by 200%.
        Ready? (Y/N)

You: yes

Claude: [Runs discover → analyze → approve → apply → measure]
        Result: Error clarity 2/10 → 6/10 (+200%)
```

### Optimize with Verification (45 min)
```
You: Optimize README with verification

Claude: I'll optimize your README with multi-LLM verification
        for confidence and safety. This takes 45 minutes.

Claude: [Discovers 12 issues]
        [Generates 6 proposals]
        [Verifies each with Devil's Advocate, Conservative, Pragmatist]
        [Shows confidence scores for human review]
        [Applies approved changes]
        [Measures improvement: 5/10 → 9/10 (+80%)]
```

### Quick Template (30 min)
```
You: Optimize help text

Claude: Using pre-built help-text template
        Complexity: Low, Time: 20-30 min, Expected improvement: +150%

Claude: [Full cycle with template]
        Result: Help text clarity 2/7 → 5/7 (+150%)
```

### Auto Loop Until Convergence
```
You: Optimize API docs until convergence

Claude: [Cycle 1: Issues 8 → Fixed 6 → Quality 4 → 6]
        [Cycle 2: Issues 3 → Fixed 2 → Quality 6 → 8]
        [Cycle 3: Issues 0 → Convergence achieved]
        Final result: API doc quality 4/10 → 8/10 (+100%)
```

## Safety Features

- **Human Approval Required** — By default, approval gates every change
- **Verification Optional** — Multi-LLM verification catches errors before apply
- **Dry-Run Mode** — Preview changes before applying (--dry-run)
- **Reversible** — All changes are git commits, easy to revert
- **Measurable** — Always shows before/after metrics

## Error Handling & Recovery

### File Not Found
**Error:** `optimize discover --target=nonexistent.md`  
**Behavior:** Skill aborts with clear error message: "File not found: nonexistent.md"  
**Recovery:** Check filename, verify path, and retry with correct file  
**Prevention:** Always verify file exists before running discover

### Malformed Rubric
**Error:** Invalid YAML/JSON in rubric file  
**Behavior:** Skill rejects rubric with validation error: "Invalid rubric format at line X: {error details}"  
**Recovery:** Fix rubric format using `optimize config --show` for format reference, then retry  
**Prevention:** Validate rubric with `--dry-run` before running analyze

### Zero Proposals Approved
**Error:** User rejects or skips all proposals in approve step  
**Behavior:** Apply step skips (no changes), measure still shows baseline quality unchanged  
**Recovery:** Run analyze again to generate different proposals, or adjust rubric to find better improvements  
**Prevention:** Review proposals carefully; modify rejected ones instead of rejecting outright

### All Proposals Rejected (Loop)
**Behavior:** If every cycle finds 0 approved proposals, loop terminates early with message: "No proposals approved in this cycle. Stopping to avoid infinite loop."  
**Recovery:** Review rejection patterns, adjust approval criteria, then retry with `--until-convergence`

### Git Conflicts During Apply
**Error:** Local git changes conflict with proposed changes  
**Behavior:** Apply halts with error: "Git conflict detected. Cannot apply proposal X. Conflicting file: {filename}"  
**Recovery:**
1. Manually resolve conflict in {filename}
2. Run `git add {filename}` to mark as resolved
3. Retry apply: `/optimize apply --approved=approvals.txt --resume-at=X`
**Prevention:** Ensure working directory is clean before running apply (`git status` should show no uncommitted changes)

### Baseline Not Found (Measure)
**Error:** Running measure without prior discover in same session  
**Behavior:** Measure prompts: "No baseline found. Use `--before-score=X` to provide manually, or run discover first."  
**Recovery:** Either pass `--before-score=5.2` or re-run discover to establish baseline  
**Prevention:** Always run discover first in a cycle

### Invalid Configuration
**Error:** `optimize config --set confidence-threshold=15`  
**Behavior:** Config validation rejects with: "Invalid confidence-threshold: 15. Must be 0.0-10.0"  
**Recovery:** Correct the value and re-run config --set  
**Prevention:** Review config constraints via `optimize config --show`

### Convergence Takes Too Long
**Error:** Loop reaches --max-cycles without convergence  
**Behavior:** Loop terminates after N cycles with message: "Maximum cycles (N) reached. Current improvement trend: {trend}. Continue? (Y/N)"  
**Recovery:** Review improvement trend and decide: continue with `--until-convergence`, or accept current quality  
**Prevention:** Start with `--max-cycles=3`, increase if improvements are still declining

### Proposal Text Too Large (Verify)
**Error:** Proposal exceeds verify mode limits (~1000 tokens)  
**Behavior:** Verify rejects with: "Proposal too large. Summarize to under 1000 tokens and retry."  
**Recovery:** Split into multiple proposals or summarize the proposal text  
**Prevention:** Verify targets concise proposals (one improvement idea per proposal)

## Common Workflows

### Workflow 1: Quick Single Improvement (20 min)
```
discover → analyze → approve → apply → measure
```

### Workflow 2: Full Cycle with Verification (45 min)
```
discover → analyze → [verify] → approve → apply → measure
```

### Workflow 3: Iterative Optimization (Multiple cycles)
```
loop (discover → analyze → approve → apply → measure) × N until convergence
```

### Workflow 4: Using Templates
```
template --show → template --apply → [full cycle]
```

### Workflow 5: Custom Rubric (for specific domain)
```
discover --custom-rubric → analyze → approve → apply → measure
```

## Output Format Examples

### Discover Output
```
DISCOVER RESULTS
Domain: Error Messages
Issues: 12 found
- 3 critical (vague, no guidance)
- 4 high (missing context)
- 5 low (formatting)
Baseline quality: 2/10
Next: /optimize analyze
```

### Analyze Output
```
PROPOSALS: 6 generated
1. "Invalid input" → "Email invalid (format: user@example.com)"
   Impact: Clarity -2→6, Actionability -2→6
2. "Auth failed" → "Password incorrect. Reset at /forgot-password"
   Impact: User satisfaction +70%
[...more proposals...]
Estimated improvement: 2/10 → 6/10 (+200%)
```

### Measure Output
```
IMPROVEMENT SUMMARY
Before: 2/10 (clarity), 2/10 (completeness), 2/10 (actionability)
After:  6/10, 6/10, 6/10
Change: +200%
Impact: Support tickets -60%, User frustration -70%
ROI: Excellent (20 min investment → 100+ hours user time saved)
```

---

## Related Skills

- `/task` — For managing workspace and saving work between sessions
- `/implement` — For larger implementation projects
- `/doc` — For creating and managing documents
- `/skill-dev` — For testing and validating skills

---

## Learn More

For detailed guides and examples, see:
- `docs/AUTONOMOUS_OPTIMIZATION.md` — Complete system overview
- `docs/QUICK_WIN_DOMAIN_TEMPLATES.md` — 5 ready-to-use templates
- `docs/VERIFICATION_LAYER_IMPLEMENTATION.md` — How verification works
- `docs/COMPLETE_SYSTEM_INTEGRATION.md` — Integration guide

---

**Status:** Production-ready autonomous optimization system  
**Modes:** 10 (discover, analyze, approve, apply, measure, loop, template, verify, config, status)  
**Supported domains:** 30+ (error messages, documentation, code comments, API specs, etc.)  
**Time to first result:** 20-30 minutes  
**Expected improvement:** 150-300%
