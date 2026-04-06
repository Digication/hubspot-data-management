# Refine: Use Cases

Concrete scenarios showing how Refine applies across artifact types. Each includes a walkthrough, rubric sketch, and notes on which framework mechanisms it exercises.

---

## Single File Improvement

### Improve an Existing README

**Scenario:** A working README.md (200 lines) written during initial development. Functional but outdated.

**Goal:** Help new contributors get from clone to running in under 10 minutes.

**Entry:** User says "refine README.md." Smart Skip — target and mode are clear.

**Cycle 1:**
- Pre-checks find 3 broken internal links, 1 empty section
- Rubric generated: Clarity, Completeness, Accuracy, Scannability, Prerequisites, Troubleshooting
- Baseline: 4.2/10 — 14 issues (5 HIGH, 6 MEDIUM, 3 LOW)
- Analyze proposes 8 changes: fix links, add prerequisites, add setup commands, fill troubleshooting, add Docker instructions, shorten intro, add reverse proxy note, split large section
- Human approves all
- After: 7.2/10 (+71%)

**Cycle 2:**
- 3 remaining MEDIUM issues. Human approves with one modification: "make the Docker section shorter"
- Preference captured: concise text preferred
- After: 8.5/10. Convergence — 0 HIGH/MEDIUM issues.

**What this exercises:** Core loop mechanics, pre-checks catching deterministic issues, rubric generation from stakeholder analysis, convergence in 2 cycles.

---

### Tighten a System Prompt

**Scenario:** A system prompt for a customer support chatbot. Works but sometimes hallucinates features and is too verbose.

**Goal:** Accurate, concise, edge-case resistant.

**Cycle 1:**
- Audience detected: AI agent (imperative verbs, rule tables, ALL-CAPS keywords)
- Rubric: Task Clarity, Constraint Coverage, Hallucination Resistance, Tone Calibration, Edge Case Handling, Conciseness
- Baseline: 4.7/10
- Proposals: add grounding instruction (reference product catalog), add explicit constraint section (refund rules, escalation rules), add edge case handlers (angry user, off-topic, PII), compress redundant examples, add few-shot examples
- Human approves 3, rejects compression ("bot performs worse without examples"), modifies refund constraint ("we can promise refunds under $50")
- Context captured: preference (keep examples), factual ($50 refund threshold), constraint (don't compress examples)

**Cycle 2:**
- Reflect detects the compression rejection — does not propose it again
- Focuses on hallucination resistance and incorporating the $50 threshold
- Convergence

**What this exercises:** Audience detection for AI-targeted content, rejection pattern recognition in Reflect, constraint capture from modifications, non-textual quality dimensions (hallucination resistance requires reasoning about model behavior, not just text quality).

**Edge exposed:** Some dimensions (Hallucination Resistance) can't be fully evaluated by reading text — they require reasoning about how a model would interpret the instructions. Textual evaluation is a proxy for behavioral quality.

---

## Creation From Nothing

### Migration Guide From a Brain Dump

**Scenario:** Upcoming breaking change to authentication tokens. The developer has bullet points and scattered knowledge.

**Entry:** User provides brain dump directly — skip Extract, go to Draft.

```
Brain dump: token format changing from JWT to opaque, old tokens expire
in 90 days, new endpoint /v2/auth/token, introspection endpoint gone,
rollback possible but tricky, legacy plan users need different steps
```

**Draft:** Complete migration guide covering overview, timeline, what breaks, migration steps (standard + legacy), rollback, FAQ. Makes specific guesses about the /v2/auth/token request format, rollback steps, and legacy differences — even though these guesses may be wrong.

**Cycle 1 — Context explosion:**
During individual proposal review, the human provides:
- The actual request format (client_assertion, not client_id/secret) — correcting the draft's guess
- Two rollback paths based on whether signing keys have been rotated — triggered by seeing the rollback proposal
- Legacy plan detection method (plan_type field) and token lifetime difference (24h vs 1h) — triggered by the legacy user proposal

None of this was in the brain dump. The specific (wrong) draft triggered retrieval of detailed technical knowledge.

After cycle 1: Accuracy jumps from 3/10 to 6/10. Rollback Safety still low — new paths added but not fully detailed.

**Cycle 2:** Discovers the draft doesn't cover key rotation detection or in-flight request behavior during switchover. Human adds: "the WAL archive has a 15-minute lag, so check the last archived timestamp before proceeding."

**Cycle 3:** Quality refinement. Convergence.

**What this exercises:** Bootstrap from brain dump, context expansion as the primary value driver, expansion-to-refinement transition, triggered recall (the core thesis in action).

**Insight validated:** "The wrong answer to a verification prompt is more valuable than the right answer to a generation prompt." The draft was wrong about auth format, but being wrong triggered the human to provide the real format plus surrounding context.

**Edge exposed:** Draft quality matters — if the draft guesses a completely different auth protocol, the human spends energy on confusion rather than correction. Bootstrap works best when the AI has enough context to be plausibly wrong, not wildly wrong.

---

### Technical Spec From a Goal Statement

**Scenario:** User says "I need a spec for adding rate limiting to our API." Minimal input.

**Extract (must do real work):**
- Reads project context: Express app, existing middleware, Redis for sessions
- Proposes a 10-section outline for rate limiting

**Extract round 2:**
Human corrects a fundamental assumption: "We're behind Cloudflare already — this is for per-API-key application-level limits, not DDoS." This changes the document's direction entirely. Also provides: Redis is already in stack.

Updated outline with per-key limits, tier-based configuration, and application-level middleware.

**Draft:** 400-line spec with concrete details — algorithm pseudocode, Redis key schema, middleware sketch, tier limits (100/min free, 1000/min pro, 10000/min enterprise), admin endpoint. Makes specific (possibly wrong) decisions throughout.

**Loop:** 2 cycles. Human corrects tier limits based on actual usage data, adjusts admin endpoint auth requirements.

**What this exercises:** Extract phase with minimal input, multi-round Extract (the first outline was wrong about scope), project context reading as a meaningful enrichment.

**Edge exposed:** For specs, the Draft makes design decisions (token bucket vs. sliding window) that the concept doesn't explicitly address. The Analyze phase should flag opinionated sections as verification prompts: "This proposes token bucket — is that right?"

---

### Runbook From Tribal Knowledge

**Scenario:** One person knows how to respond to a database failover. Nothing is written down.

**Extract:**
- Reads project context: PostgreSQL, docker-compose, .env with DATABASE_URL
- Proposes standard failover outline (trigger, verify, failover, verify post, communicate, rollback, post-incident)
- Human corrects: "Single-instance Postgres with WAL archiving to S3. No replica. Failover means restoring from WAL archive." Also: "This has only happened once and I'm the only person who knows how to do it."

**Extract round 2:** Completely revised for WAL restore scenario. Skill admits specific gaps: "I assumed S3 bucket names and instance sizes — you'll need to fill those in."

Human provides: bucket name, instance size, and a critical detail — "after restoring, you have to manually recreate the replication slots because our app uses logical replication for the analytics pipeline. If you forget that, analytics goes stale silently for days."

**Loop:** 3 cycles. During cycle 2, the human remembers: "The WAL archive has a 15-minute lag. The runbook should have the on-call engineer check the last archived timestamp before deciding to proceed."

**What this exercises:** Extracting tribal knowledge from the sole expert, gap-specific inquiry triggering critical memories, progressive context surfacing across phases (the replication slot issue emerged during Extract; the WAL lag fact emerged during cycle 2 Approve).

**Edge exposed:** Silent failure modes (replication slots) are the most dangerous and hardest to surface. The rubric protocol's failure mode analysis should explicitly ask "what failures would be silent or delayed?" — but this depends on the human thinking of them, which is the chicken-and-egg problem the loop is trying to solve.

---

## Domain Sweep

### Error Messages Across a Codebase

**Scenario:** Express API with ~50 error messages scattered across route handlers, middleware, and validators. Most are generic ("Invalid input", "Not found").

**Entry:** "Refine our error messages." Domain template matched.

**Collection:** 47 error messages across 18 files. Quick scan: 31 generic, 12 with runtime context, 4 exposing internal details.

**User constraint:** "Skip security-facing messages — the security team handles those separately." After filtering: 39 messages.

**Cycle 1:**
- Rubric: Clarity, Runtime Context, Actionability, Log Distinguishability, Consistency, Information Safety
- Baseline: 4.4/10
- Batch proposals: replace 14 "Invalid input" with field-specific messages (one compound proposal), replace 8 "Not found" with entity-specific messages, remove 4 stack traces, add error codes, add "what to do" suggestions
- Human approves all, modifies error code format: "Use ERR_{SERVICE}_{NUMBER} — our logging groups by service"
- Context captured: error code format preference, factual (logging groups by service name)

**Cycle 2:** Runtime Context jumps from 3.1 to 7.2. Remaining consistency issues. Human corrects 2 action suggestions. Reflect notes modification pattern: user makes suggestions more concrete. Adjusts next cycle.

**Cycle 3:** Convergence. One MEDIUM deferred (message in generated code).

**What this exercises:** Domain adapter mechanics, collection patterns, batch proposals (5 decisions for 39 messages), preference capture feeding into generation, Reflect adjusting style.

**Edge exposed:**
- User constraints ("skip security messages") interact with collection methods in ways the domain adapter contract doesn't specify. How to reliably distinguish security messages from regular ones?
- Batch proposals mask per-instance variation. The compound "replace 14 messages" proposal shows one example. Should the user see all 14?

---

## Recursive Self-Application

### Refine a Skill File

**Scenario:** Draft SKILL.md for a new Claude Code skill. Needs to be executable by an AI agent — no ambiguity, complete edge case coverage.

**Rubric:** Unambiguity (could an AI interpret this two ways?), Completeness, Phase Sequencing, Error Recovery, Tool Usage, Testability, Human Interaction.

**Proposals focus on:** Adding decision tables where prose is ambiguous, specifying error recovery per phase, adding "what NOT to do" constraints, specifying exact tool parameters, adding testable scenarios.

**2 cycles to convergence.** Human provides significant context during Approve about inter-skill interactions and edge cases from practice.

**What this exercises:** The framework evaluating its own kind of artifact (recursive applicability). "Unambiguity" as a dimension that only matters for AI-targeted content.

**Edge exposed:** Testability is hard to evaluate textually. The rubric scores it based on whether test scenarios are present, but that's a proxy — the real test is execution.

---

## Boundary Cases

### Already-Good Artifact

User runs refine on a README scoring 8.2/10 with 2 LOW issues. The loop should detect immediate convergence and ask "This scores 8.2/10 with only minor issues. Want me to fix these 2 items, or is this good enough?" — not launch a full 3-cycle loop.

### Structural Reorganization Needed

A 500-line file with fine individual sections but wrong overall structure — scattered related content, duplication, wrong reading order. The proposal model (local before/after edits) can't fix this. The Analyze phase needs to generate structural proposals affecting the whole document, and Apply needs to handle whole-file rewrites.

### Conflicting Rubric Dimensions

An error message must be helpful (include the failed value) and safe (don't leak PII). The rubric can't independently optimize both. The Analyze phase should recognize the tension and propose trade-off resolutions (e.g., mask sensitive parts: `***@example.com`). The Verify personas should debate the trade-off.

### Human Knows Less Than the AI

A junior developer asks to refine a Dockerfile. They can't verify Docker best practices — but they CAN verify intent ("yes, I want this secure" vs. "no, this is just for local dev"). The rubric does the heavy lifting. The loop still works, but the human's role is verifying intent and constraints, not technical correctness.

### Creative Content With Measurable Aspects

A product launch email. Dimensions like CTA clarity, offer comprehension, compliance, and deliverability are measurable. Emotional impact and brand voice are not. The framework handles the measurable dimensions; the subjective ones require human-only evaluation. The boundary isn't binary — it's per-dimension.
