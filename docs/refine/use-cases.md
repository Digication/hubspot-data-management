# Refine: Use Cases and Sample Interactions

**Date:** 2026-04-06
**Companion docs:** [concept.md](concept.md), [skill-blueprint.md](skill-blueprint.md)

---

## How to Read This Document

This is not a feature list. Each use case is a **concrete scenario** with a sample interaction walkthrough, rubric sketch, and an explicit note on which parts of the framework it exercises and exposes.

The use cases are organized by the primary framework mechanism they test. If the framework is sound, every use case below should work. If any doesn't, the gap should feed back into the concept.

---

## Part 1: The Happy Path

### 1.1 Improve an Existing README

**What the user has:** A working README.md (200 lines) that was written quickly during initial development. It works but hasn't been updated since.

**What the user wants:** A README that helps new contributors get from clone to running in under 10 minutes.

**Entry path:** Improvement loop. User says "refine README.md."

**Walkthrough:**

```
USER: refine README.md

SKILL [Smart Skip]:
  Target: README.md — correct?
  Detail level: Medium (Recommended)
  Max cycles: 3

USER: Looks good, start

SKILL [Discover]:
  Audience detected: human reader (docs/README.md path + prose content)
  
  Automated Checks:
  - [FAIL] 3 broken internal links
  - [WARN] 1 empty section ("Troubleshooting" heading, no content)
  - [INFO] Avg sentence length: 26 words (target: <20)

  Rubric generated (6 dimensions):
  | Dimension    | Score | What it measures |
  |--------------|-------|------------------|
  | Clarity      | 5/10  | Can a newcomer follow the instructions? |
  | Completeness | 4/10  | Are all steps from clone to running present? |
  | Accuracy     | 6/10  | Do the instructions match current state? |
  | Scannability | 5/10  | Can someone find what they need in <30 sec? |
  | Prerequisites| 3/10  | Are required tools/versions listed? |
  | Troubleshoot | 2/10  | Are common failure modes addressed? |
  
  Baseline: 4.2/10 — 14 issues (5 HIGH, 6 MEDIUM, 3 LOW)

  Does this rubric look right?
  → "Looks good, continue"

USER: Looks good, continue

SKILL [Analyze → Verify → Approve]:
  | # | Proposal | Severity | Impact |
  |---|----------|----------|--------|
  | 1 | Fix 3 broken links | HIGH | Unblocks navigation |
  | 2 | Add prerequisites section (Node 20+, pnpm, Docker) | HIGH | Prevents setup failure |
  | 3 | Add clone + install commands | HIGH | Unblocks step 1 |
  | 4 | Fill troubleshooting section with 3 common issues | HIGH | Covers "port in use", "Docker not running", "pnpm not found" |
  | 5 | Add Docker Compose startup instructions | HIGH | Unblocks step 2 |
  | 6 | Shorten intro paragraph from 8 sentences to 3 | MEDIUM | Improves scannability |
  | 7 | Add Caddy reverse proxy note | MEDIUM | Explains https://app.localhost |
  | 8 | Split "Development" into subsections | MEDIUM | Improves scannability |

  How would you like to handle these proposals?

USER: Approve all

SKILL [Apply → Measure]:
  BEFORE: Clarity 5, Completeness 4, Accuracy 6, Scannability 5, Prerequisites 3, Troubleshoot 2 — Avg 4.2
  AFTER:  Clarity 7, Completeness 7, Accuracy 7, Scannability 7, Prerequisites 8, Troubleshoot 7 — Avg 7.2 (+71%)

  5 issues remain (0 HIGH, 3 MEDIUM, 2 LOW). Continue?

USER: One more cycle

[Cycle 2: discovers remaining MEDIUM issues, proposes 3 targeted improvements,
 human approves with one modification: "make the Docker section shorter"]

SKILL [Measure]:
  AFTER:  Avg 8.5/10 (+18%). Convergence achieved — 0 HIGH/MEDIUM issues.
```

**Rubric sketch:** Standard documentation rubric weighted toward actionability and first-time-user experience. Stakeholder analysis would surface: new developer, existing developer looking up commands, CI system reading badges/links, project maintainer reviewing PRs.

**What this tests:**
- **Core loop mechanics** — the simplest end-to-end path
- **Pre-checks catching deterministic issues** before the LLM evaluation (broken links, empty sections)
- **Rubric generation from stakeholder analysis** — did it produce dimensions the user agrees with?
- **Convergence** — reaching 0 HIGH/MEDIUM in 2 cycles is typical for a single-file improvement
- **Preference capture** — the "make it shorter" modification in cycle 2 is preference context

**Framework claims validated:** The loop structure works for straightforward improvement. Convergence criteria (no HIGH/MEDIUM) are meaningful for this domain.

**Framework claims exposed:** None — this is the happy path. It doesn't stress creation, context expansion, or progressive autonomy.

---

## Part 2: Creation — Testing Bootstrap

### 2.1 Migration Guide from a Brain Dump

**What the user has:** Bullet points and scattered knowledge about an upcoming breaking change to authentication tokens.

**What the user wants:** A complete migration guide for API consumers.

**Entry path:** Bootstrap (creation). User provides a brain dump.

**Walkthrough:**

```
USER: I need to write a migration guide. Here's what I know:
  - token format changing from JWT to opaque
  - old tokens expire in 90 days
  - new endpoint is /v2/auth/token
  - breaking change: token introspection endpoint gone
  - rollback possible but tricky
  - legacy plan users need different steps

SKILL [Draft — brain dump provided, skip Extract]:
  Generates a complete first draft covering:
  1. Overview — what's changing and why
  2. Timeline — 90-day migration window
  3. What breaks — introspection endpoint removal, JWT parsing
  4. Migration steps — standard path
  5. Migration steps — legacy plan users
  6. Rollback procedure
  7. FAQ
  
  Writes draft to docs/migration-guide.md.
  The draft is intentionally specific: it makes concrete guesses about
  the /v2/auth/token request format, rollback steps, and legacy plan
  differences — even though these guesses may be wrong.

SKILL [Discover — Cycle 1]:
  Audience: API consumer (external developer)
  
  Rubric (7 dimensions):
  | Dimension       | Score |
  |-----------------|-------|
  | Completeness    | 4/10  |
  | Accuracy        | 3/10  |  ← many guesses need correction
  | Step clarity    | 5/10  |
  | Rollback safety | 2/10  |  ← rollback section is vague
  | Edge coverage   | 3/10  |  ← legacy path underspecified
  | Timeline clarity| 6/10  |
  | Self-service    | 4/10  |  ← can someone migrate without contacting support?
  
  Baseline: 3.9/10

SKILL [Analyze — 10 proposals]:
  | # | Proposal | Severity |
  |---|----------|----------|
  | 1 | Fix /v2/auth/token request format (I guessed POST, is it?) | HIGH |
  | 2 | Expand rollback section — current version says "contact support" | HIGH |
  | 3 | Add legacy plan detection: how do users know if they're on legacy? | HIGH |
  | ...

USER [reviewing proposals individually]:
  
  Proposal 1: "Modify — it's POST but the body needs client_assertion, not
  client_id/client_secret. Here's the actual format: { grant_type: 
  'client_credentials', client_assertion: '...' , client_assertion_type: 
  'urn:ietf:params:oauth:...' }"
  
  → CONTEXT CAPTURED: Factual — actual /v2/auth/token request format with
    client_assertion. This is knowledge the user had but didn't include in
    the brain dump.
  
  Proposal 2: "Approve — and actually, rollback is different depending on
  whether the user has already rotated their signing keys. If they have,
  rollback requires re-importing the old key pair through a support ticket.
  If they haven't, they just switch back to /v1/auth/token."
  
  → CONTEXT CAPTURED: Factual — two rollback paths based on key rotation
    state. This is significant new context that didn't exist in the brain
    dump or the draft.
  
  Proposal 3: "Approve — legacy users have a 'plan_type' field in their
  account settings. Actually, there's also a gotcha: legacy plan tokens
  have a max lifetime of 24 hours, not the standard 1 hour."
  
  → CONTEXT CAPTURED: Factual — legacy plan detection method + lifetime
    difference. Triggered by seeing the concrete proposal about legacy users.

SKILL [Apply → Measure — Cycle 1]:
  BEFORE: 3.9/10
  AFTER:  5.8/10 (+49%)
  
  Major improvement in Accuracy (3→6) and Edge Coverage (3→5).
  Rollback Safety still low (2→4) — new rollback paths added but not
  fully detailed.

SKILL [Reflect — Cycle 1→2]:
  - Context expansion: 3 significant factual annotations captured.
    Incorporating into Cycle 2 Discover prompt.
  - The rollback section needs structural work, not just rewording.
  - Completeness improving but legacy path still underspecified.

[Cycle 2: Discover now evaluates with enriched context. Finds the draft
 doesn't cover the key rotation detection step, or what happens to 
 in-flight requests during switchover. Human reviews, adds more detail
 about the grace period for in-flight tokens.]

[Cycle 3: Quality refinement. Remaining issues are clarity and 
 formatting. Convergence achieved.]
```

**Rubric sketch:** Migration guide rubric with heavy Completeness, Accuracy, and Rollback Safety weighting. Stakeholders: API consumer migrating, API consumer's ops team (handling the cutover), support team (fielding questions), security team (token handling review).

**What this tests:**
- **Bootstrap phase** — brain dump → Draft, skipping Extract
- **Context expansion as the primary value driver** — the draft was wrong about the auth format, but being wrong triggered the human to provide the real format. The concept claims "the wrong answer to a verification prompt is more valuable than the right answer to a generation prompt" — this is a direct test
- **Expansion → refinement transition** — cycle 1 is mostly about what's missing, cycle 3 is about quality
- **Triggered recall** — the human didn't mention key rotation in the brain dump but remembered it when reviewing the rollback proposal. This is the core thesis in action

**Framework claims validated:**
- Creation and improvement are the same loop at different starting points
- Context expansion through verification prompts surfaces knowledge the human didn't volunteer
- The expansion → refinement transition happens naturally through the rubric

**Framework claims exposed:**
- **The Draft quality bar is tricky.** The concept says "it doesn't need to be good, it needs to be specific enough to trigger corrections." But if the draft is too wrong (e.g., guesses a completely different auth protocol), the human spends more energy correcting than verifying. There's an unstated assumption that the AI can generate a *plausibly wrong* draft, not a *wildly wrong* one. The concept should acknowledge this — Bootstrap quality depends on how much context the AI has about the domain.
- **Context capture is heavy in this scenario.** Three detailed factual annotations in one approval step. The concept's context storage model (JSON annotations) may be too structured for this kind of free-form technical detail. The actual content the user provided (request formats, key rotation paths) is complex — does a one-line annotation capture enough?

---

### 2.2 Technical Spec from a Goal Statement

**What the user has:** A single sentence: "We need to add rate limiting to our API."

**What the user wants:** A technical spec covering approach, implementation, and rollout.

**Entry path:** Bootstrap (creation). Minimal input — the Extract phase must do real work.

**Walkthrough:**

```
USER: I need a spec for adding rate limiting to our API

SKILL [Extract — minimal input, must interview]:
  Gathers project context: reads package.json (Express app), src/ structure,
  existing middleware, .env for any rate-limit config.
  
  Generates proposed outline:
  
  Based on your Express API structure, here's what I think the rate
  limiting spec needs:
  
  1. Problem statement — why rate limiting is needed now
  2. Requirements — what behavior the rate limiter should have
  3. Approach — token bucket vs. sliding window vs. fixed window
  4. Architecture — where the limiter sits (middleware, API gateway, both)
  5. Storage — Redis vs. in-memory vs. database
  6. Configuration — per-route limits, global limits, headers
  7. Error responses — 429 format, Retry-After header
  8. Rollout plan — shadow mode → warn → enforce
  9. Monitoring — metrics, alerts, dashboards
  10. Testing — load testing approach, edge cases
  
  What's missing or wrong?

USER: Good outline. We're actually behind Cloudflare already, so there's
an existing WAF rate limit. This is for application-level limits per API
key, not DDoS protection. Also, we already use Redis for sessions so
that's the storage answer.

→ CONTEXT CAPTURED: Factual — Cloudflare WAF exists for DDoS, this is
  per-API-key application-level limiting. Redis already in stack.

SKILL [Extract — round 2]:
  Updated outline:
  
  1. Problem statement — per-API-key abuse prevention (Cloudflare handles DDoS)
  2. Requirements — per-key limits, different tiers (free/pro/enterprise)
  3. Approach — token bucket (recommended for per-key) vs. sliding window
  4. Architecture — Express middleware, after auth (needs API key), before routes
  5. Storage — Redis (already in stack for sessions)
  6. Configuration — per-tier defaults, per-key overrides, admin API
  7. Error responses — 429 with Retry-After, rate limit headers on all responses
  8. Rollout — shadow mode with logging → dry-run 429s → enforce
  9. Monitoring — per-key usage dashboards, alert on keys hitting limits
  10. Testing — per-key load testing, tier boundary tests
  
  → "Looks right, generate a draft"

USER: Looks right, generate a draft

SKILL [Draft]:
  Generates a 400-line spec with concrete details: token bucket algorithm
  pseudocode, Redis key schema, middleware code sketch, example config,
  429 response format, rollout timeline.
  
  Makes specific (possibly wrong) decisions:
  - Chose token bucket over sliding window
  - Proposed X-RateLimit-* headers
  - Suggested 100/min for free tier, 1000/min for pro, 10000/min for enterprise
  - Proposed a /v1/rate-limits admin endpoint

[Loop takes over — Discover finds 8 issues, mostly around the specific
 numbers being guesses and the admin endpoint needing auth. Human corrects
 the tier limits based on actual usage data. 2 cycles to convergence.]
```

**Rubric sketch:** Technical spec rubric. Dimensions: Completeness (all sections present), Technical Accuracy (algorithms and data structures correct), Implementability (could a developer build this from the spec alone), Risk Coverage (failure modes, edge cases, rollback), Scope Clarity (what's in/out), Stakeholder Alignment (does it address ops, security, and product concerns).

**What this tests:**
- **Extract phase with minimal input** — the skill must read project context and generate a useful outline, not ask open-ended questions
- **Multi-round Extract** — the first outline was wrong about scope (DDoS vs. per-key). The human's correction in Extract round 1 fundamentally changed the document's direction
- **The verification principle in Extract** — showing an outline and asking "what's wrong?" worked better than asking "what should the spec cover?" The Cloudflare detail surfaced because the proposed outline assumed DDoS protection, and the human corrected that assumption

**Framework claims validated:**
- Extract works through verification prompts, not generation prompts
- Project context (reading the codebase) meaningfully enriches Extract
- The Draft → loop handoff is seamless

**Framework claims exposed:**
- **Extract may need more than 1-2 rounds for complex domains.** The concept says "keep Extract to 1-2 rounds." But this scenario needed 2 rounds just for the outline, and a more complex system might need 3-4. The guideline should be softer — "minimize rounds, but don't rush past fundamental misunderstandings."
- **The Draft makes technical decisions the concept doesn't address.** Choosing token bucket over sliding window is a design decision, not a documentation decision. The concept treats the draft as "something concrete to react to," but for specs, the draft is also making architectural choices. Should the skill flag which parts of the draft are opinions vs. facts?

---

### 2.3 Runbook from Tribal Knowledge

**What the user has:** Mental model of how to respond to a specific production incident. Nothing written down.

**What the user wants:** A runbook that on-call engineers can follow at 3am.

**Entry path:** Bootstrap (creation). User says "help me write a runbook for database failover."

**Walkthrough:**

```
USER: help me write a runbook for database failover

SKILL [Extract]:
  Reads project context: finds docker-compose.yml with PostgreSQL,
  .env with DATABASE_URL, src/db/ directory.
  
  Based on your PostgreSQL setup, here's what I think the runbook needs:
  
  1. Trigger conditions — what tells you a failover is needed
  2. Verification — how to confirm it's a real outage, not a false alarm
  3. Decision tree — failover to replica? promote standby? restore from backup?
  4. Step-by-step — the actual failover commands
  5. Verification post-failover — how to confirm the new primary is healthy
  6. Communication — who to notify, what to say
  7. Rollback — how to undo if the failover made things worse
  8. Post-incident — cleanup, retrospective, updating this runbook
  
  What's missing or wrong?

USER: We don't have a replica in this setup — it's a single-instance
Postgres with WAL archiving to S3. Failover means restoring from the
latest WAL archive to a new instance. Also, this has only happened once
and I'm the only person who knows how to do it. That's why I need
the runbook.

→ CONTEXT CAPTURED: Factual — single-instance Postgres, WAL archiving
  to S3, no replica. Restore-based failover. Only one person has done
  it before.

SKILL [Extract — round 2, heavily revised]:
  Updated for WAL restore scenario:
  
  1. Trigger conditions — Postgres unresponsive, instance health check failing
  2. Verification — check AWS console, check if network vs. instance issue
  3. Decision: recover instance vs. restore to new instance
  4. WAL restore steps — create new instance, pull WAL from S3,
     run pg_restore, point application to new instance
  5. DNS/connection string update — how to cut over
  6. Verification — data integrity checks, transaction log review
  7. Communication template — Slack message, status page update
  8. Rollback — point back to old instance if it recovers
  9. Post-incident checklist
  
  What's missing? I assumed S3 bucket names and instance sizes —
  you'll need to fill those in.

USER: Yeah, the bucket is prod-wal-archive and the instance is
db.m5.xlarge. One thing you're missing: after restoring, you have
to manually recreate the replication slots because our app uses
logical replication for the analytics pipeline. If you forget that,
analytics goes stale silently for days.

→ CONTEXT CAPTURED: Factual — S3 bucket name, instance size.
  Critical: must recreate replication slots post-restore for analytics
  pipeline. Silent failure mode if missed.

[Draft generated with all captured context. Loop runs 3 cycles.
 During cycle 2 Approve, the human remembers: "Oh, and the WAL
 archive has a 15-minute lag, so you'll lose up to 15 minutes of
 data. The runbook should have the on-call engineer check the
 last archived WAL timestamp before deciding to proceed."]
```

**Rubric sketch:** Runbook rubric optimized for 3am usability. Dimensions: Executability (can someone follow this without interpretation?), Completeness (all steps present, no implicit knowledge), Decision Support (clear branching logic at decision points), Failure Mode Coverage (what if a step fails?), Time Sensitivity (are time-critical steps flagged?), Communication (templates, not "notify stakeholders").

**What this tests:**
- **Extracting tribal knowledge that only one person has** — the core use case for the verification-generation asymmetry
- **Gap-specific inquiry** — the skill said "I assumed S3 bucket names..." which triggered the user to provide them AND remember the replication slot issue. The explicit gap triggered an unrelated but critical memory.
- **Progressive context surfacing** — the WAL archive lag fact emerged in cycle 2, not during Extract, because seeing the concrete runbook step triggered the memory

**Framework claims validated:**
- Verification prompts extract knowledge generation prompts cannot
- Triggered recall works across phases, not just during Extract
- "Show, don't ask" is especially powerful when the human is the only source of truth

**Framework claims exposed:**
- **The framework doesn't distinguish "the human is the only expert" from "the human is one of many experts."** When the human is the sole source of truth (as here), every verification prompt matters enormously — there's no external source to cross-check against. The concept's gap-specific inquiry mechanism is critical here but may not be aggressive enough. Should the skill proactively surface assumptions it's making rather than waiting for the human to notice?
- **Silent failure modes are a rubric design challenge.** The replication slot issue is dangerous precisely because nothing visibly breaks. The rubric needs a "silent failure" dimension, but the rubric protocol's failure mode analysis might not surface this unless the human volunteers it during stakeholder analysis. This is a chicken-and-egg problem: the rubric needs to check for things the human hasn't thought of yet, but the rubric is generated from what the human tells us.

---

## Part 3: Domain Sweep — Testing Scale

### 3.1 Error Messages Across a Codebase

**What the user has:** An Express API with ~50 error messages scattered across route handlers, middleware, and validators.

**What the user wants:** Consistent, helpful error messages that include runtime context.

**Entry path:** Domain sweep. User says "refine our error messages."

**Walkthrough:**

```
USER: refine our error messages

SKILL [Domain template matched: error-messages]:
  Collection: grepping for throw new Error, .status(4xx), .status(5xx),
  ValidationError, AppError patterns across src/
  
  Found 47 error messages across 18 files.
  
  Quick scan results:
  - 31 use generic messages ("Invalid input", "Not found", "Server error")
  - 12 include runtime context (the actual value that failed)
  - 4 expose internal details (stack traces, internal paths)
  
  Target: 47 error messages across src/
  Rubric: Error message domain template (6 dimensions)
  Cycles: 3
  
  Does this plan look right?

USER: Yes, but skip security-facing messages — the security team
is handling those separately.

→ CONTEXT CAPTURED: Constraint — exclude security-facing messages
  (401, 403, security-related errors).

SKILL [Discover]:
  After filtering: 39 error messages to evaluate.
  
  Rubric (6 dimensions):
  | Dimension           | Avg Score | Worst files |
  |---------------------|-----------|-------------|
  | Clarity             | 5.2/10    | src/api/users.ts, src/api/billing.ts |
  | Runtime Context     | 3.1/10    | (31 messages lack context) |
  | Actionability       | 4.0/10    | Most say what's wrong, not what to do |
  | Log Distinguishability | 2.8/10 | Many identical "Invalid input" messages |
  | Consistency         | 3.5/10    | Mixed formats, some have codes, some don't |
  | Information Safety  | 7.5/10    | 4 messages expose internals |
  
  Baseline: 4.4/10 — patterns identified:
  - "Invalid input" (used 14 times, always generic)
  - "Not found" (used 8 times, never says what wasn't found)
  - Stack traces in 4 error responses

SKILL [Analyze — batch proposals]:
  | # | Proposal | Scope | Severity |
  |---|----------|-------|----------|
  | 1 | Replace 14 "Invalid input" with field-specific messages | 14 files | HIGH |
  | 2 | Replace 8 "Not found" with entity-specific messages | 6 files | HIGH |
  | 3 | Remove stack traces from 4 error responses | 3 files | HIGH |
  | 4 | Add error codes to all messages (ERR_USER_001 pattern) | 39 messages | MEDIUM |
  | 5 | Add "what to do" to 27 messages that only say what's wrong | 15 files | MEDIUM |
  
  Example for Proposal 1:
  Before: throw new Error("Invalid input")
  After:  throw new AppError("EMAIL_INVALID", `Expected valid email, got "${input}"`, {
            field: "email", received: input, hint: "Check the format: user@domain.com"
          })

USER: Approve all — but for proposal 4, use the format ERR_{SERVICE}_{NUMBER}
not ERR_{ENTITY}_{NUMBER}. Our logging system groups by service.

→ CONTEXT CAPTURED: Preference — error code format is ERR_{SERVICE}_{NUMBER}.
  Factual — logging system groups by service name.

[Cycle 2: Discover re-evaluates. Runtime Context jumps from 3.1 to 7.2.
 Remaining issues are consistency (some messages still don't have the
 new format) and a few messages where the "what to do" suggestion is
 wrong. Human corrects 2 suggestions during Approve.

 Reflect notes: user modified 2 "what to do" proposals to be more
 specific. Adjusting: next cycle will make action suggestions more
 concrete.]

[Cycle 3: Convergence. 0 HIGH, 1 MEDIUM (one message still doesn't
 have an error code — it's in generated code that's hard to modify).]
```

**Rubric sketch:** Error message domain template. Stakeholders: end user (API consumer receiving the error), developer debugging, ops monitoring logs, security reviewer, i18n team. The 6 dimensions emerge from failure mode analysis of each stakeholder's needs.

**What this tests:**
- **Domain sweep mechanics** — collection patterns, batch processing, pattern-based proposals
- **Batch proposals** — grouping 14 instances of "Invalid input" into one proposal instead of 14
- **Preference capture feeding back into generation** — error code format preference applied in cycle 2
- **Reflect adjusting generation style** — noting the user made suggestions more concrete, then adapting

**Framework claims validated:**
- Domain adapters (collection patterns, rubrics, batch apply) work for multi-file sweeps
- The Reflect checklist catches modification patterns and adjusts
- Batch proposals dramatically reduce approval burden (5 decisions for 39 messages, not 39 decisions)

**Framework claims exposed:**
- **The constraint filter ("skip security messages") is easy to state but hard to implement.** How does the skill reliably distinguish security-facing messages from regular ones? The 401/403 filter is simple, but what about messages like "Too many login attempts" — is that security or rate limiting? The domain adapter contract doesn't have a field for exclusion criteria. The concept needs to address how user constraints interact with collection methods.
- **Batch proposals mask per-instance variation.** "Replace 14 'Invalid input' with field-specific messages" is one proposal, but each of the 14 replacements is different. The before/after shown is one example. Should the user see all 14, or trust the pattern? The concept's Approve phase doesn't address this — it assumes each proposal is a single change, not a pattern applied N times.

---

## Part 4: Non-Standard Domains — Testing Generality

### 4.1 Prompt Engineering

**What the user has:** A system prompt for a customer support chatbot. It works but sometimes hallucinates product features and is too verbose.

**What the user wants:** A prompt that's accurate, concise, and resistant to edge cases.

**Entry path:** Improvement loop. User says "refine this system prompt" and attaches the file.

**Walkthrough:**

```
USER: refine @prompts/support-bot.md

SKILL [Discover]:
  Audience detected: AI agent (imperative verbs, rule tables, ALL-CAPS keywords)
  
  Rubric (6 dimensions):
  | Dimension              | Score |
  |------------------------|-------|
  | Task Clarity           | 6/10  | Does the prompt unambiguously define the bot's job? |
  | Constraint Coverage    | 4/10  | Are boundaries explicit (what NOT to do)? |
  | Hallucination Resist.  | 3/10  | Does it ground the bot in specific data sources? |
  | Tone Calibration       | 7/10  | Consistent voice for customer-facing interactions? |
  | Edge Case Handling     | 3/10  | What happens with angry users, off-topic, PII? |
  | Conciseness            | 5/10  | Token-efficient without losing clarity? |
  
  Baseline: 4.7/10

SKILL [Analyze]:
  | # | Proposal | Severity |
  |---|----------|----------|
  | 1 | Add grounding instruction: "Only reference features listed in
  |   | the product catalog at /docs/features.md. If unsure, say 'Let
  |   | me check with the team' rather than guessing." | HIGH |
  | 2 | Add explicit constraints section: "NEVER promise refunds without
  |   | manager approval. NEVER share internal pricing logic. NEVER
  |   | diagnose technical issues — escalate to engineering." | HIGH |
  | 3 | Add edge case handlers: angry user → empathize then redirect,
  |   | off-topic → politely redirect, PII shared → acknowledge and
  |   | do not store or repeat | HIGH |
  | 4 | Compress current instructions from 1200 tokens to ~600 by
  |   | removing redundant examples and merging overlapping rules | MEDIUM |
  | 5 | Add few-shot examples for the 3 most common query types | MEDIUM |

USER: Approve 1, 3, 5. Reject 4 — I'd rather keep the examples
for now, the bot performs worse without them. Modify 2 — we actually
CAN promise refunds under $50, only escalate above that.

→ CONTEXT CAPTURED:
  Preference — keep examples even if verbose (bot performance > token count)
  Factual — refund policy: auto-approve under $50, escalate above
  Constraint — don't compress by removing examples

[Cycle 2: The skill does NOT propose compression again (Reflect caught
 the rejection pattern). Focuses on hallucination resistance and adding
 the $50 refund threshold to the constraints section. Convergence in
 cycle 2.]
```

**Rubric sketch:** Prompt engineering rubric. Unusual dimensions: Hallucination Resistance, Token Efficiency (scored inversely — lower tokens for same behavior is better), Edge Case Handling. Standard dimensions: Task Clarity, Constraint Coverage. Stakeholders: the AI model receiving the prompt, the end user interacting with the bot, the support manager reviewing transcripts, the compliance team.

**What this tests:**
- **Audience detection for AI-targeted content** — the prompt is read by an AI, not a human. "Clarity" means unambiguous machine-parseable instructions, not plain language.
- **Rejection pattern recognition in Reflect** — the user rejected compression; the skill doesn't propose it again
- **Constraint capture from modifications** — the $50 refund threshold is business logic that entered the loop through a proposal modification
- **Non-textual quality dimensions** — "hallucination resistance" can't be measured by reading the text alone; it requires reasoning about how a model would interpret the instructions

**Framework claims validated:**
- The rubric protocol generalizes to non-document domains
- Reflect's "rejected proposal check" works as specified
- Audience detection correctly identifies AI-targeted content

**Framework claims exposed:**
- **Some dimensions can't be evaluated by reading the artifact.** "Hallucination Resistance" requires reasoning about model behavior, not just text quality. The Discover phase scores this based on textual signals (presence of grounding instructions, explicit constraints), but the actual metric is behavioral. The concept doesn't address the gap between textual evaluation and behavioral evaluation. For most domains this doesn't matter, but for prompts, it's central.
- **The rubric protocol's stakeholder analysis produces a useful but unexpected stakeholder.** "The AI model receiving the prompt" is a stakeholder — its needs (unambiguous instructions, consistent format) differ from the human stakeholders. This works within the framework but isn't obvious. The concept could note that for AI-targeted artifacts, the AI itself is a primary stakeholder.

---

### 4.2 AI Skill File (Recursive)

**What the user has:** A draft SKILL.md for a new Claude Code skill.

**What the user wants:** A skill file that an AI agent can execute reliably — no ambiguity, complete edge case coverage, correct phase sequencing.

**Entry path:** Improvement loop. User says "refine this skill file."

**Walkthrough:**

```
USER: refine @.claude/skills/new-skill/SKILL.md

SKILL [Discover]:
  Audience: AI agent (.claude/skills/** path + imperative verbs,
  rule tables, phase structure)
  
  Rubric (7 dimensions):
  | Dimension             | Score |
  |----------------------|-------|
  | Unambiguity          | 4/10  | Could an AI interpret this two ways? |
  | Completeness         | 5/10  | Are all branches and edge cases specified? |
  | Phase Sequencing     | 6/10  | Is the execution order clear and correct? |
  | Error Recovery       | 3/10  | What happens when things go wrong? |
  | Tool Usage           | 5/10  | Are tool calls specified correctly? |
  | Testability          | 2/10  | Can someone verify the skill works? |
  | Human Interaction    | 6/10  | Are prompts well-designed (verification > generation)? |
  
  Baseline: 4.4/10

SKILL [Analyze]:
  Proposals focus on:
  - Adding decision tables where prose is ambiguous
  - Specifying error recovery for each phase
  - Adding "what NOT to do" constraints
  - Specifying exact tool parameters, not just tool names
  - Adding testable scenarios with expected behavior

[2 cycles to convergence. The human provides significant context during
 Approve about how the skill interacts with other skills and about edge
 cases they've seen in practice.]
```

**Rubric sketch:** AI skill file rubric. Unique dimension: Unambiguity (scored by asking "could an AI interpret this two different ways and produce different behavior?"). Stakeholders: the AI agent executing the skill, the user invoking the skill, the skill author maintaining it, other skills that may interact with it.

**What this tests:**
- **Recursive self-applicability** — the refine framework evaluating a skill file is meta (the framework evaluating an artifact of the same type it is). Does the rubric protocol produce useful dimensions for its own kind?
- **"Unambiguity" as a dimension** — this is a dimension that only matters for AI-targeted content. The rubric protocol should surface it through stakeholder analysis (the AI agent as a stakeholder), not require the user to know to ask for it

**Framework claims validated:**
- The rubric protocol, through stakeholder analysis, produces domain-appropriate dimensions even for unusual domains
- The framework can evaluate its own kind of artifact (recursive applicability)

**Framework claims exposed:**
- **Testability is hard to evaluate textually.** The skill says the Discover phase scores "Testability" — but how? By checking for the presence of test scenarios in the skill file? That's a textual check, not an actual test. The concept doesn't address domains where the quality dimension requires execution, not just evaluation.

---

## Part 5: Progressive Autonomy — Testing the Human Role Dial

### 5.1 Multi-Cycle Documentation Polish (Low Risk)

**What the user has:** A set of 8 internal developer docs that are all structurally fine but inconsistent in formatting, tone, and detail level.

**What the user wants:** Consistent quality across all 8 docs. This is a grind task — the user wants to minimize their involvement.

**Entry path:** Domain sweep with auto-approve configuration.

**Walkthrough:**

```
USER: refine all the docs in docs/internal/. These are low-stakes
internal docs — you can auto-approve anything that isn't HIGH severity.

SKILL: Configures auto-approve-severity: ["LOW", "MEDIUM"]

[Cycle 1 — Doc 1: Full Reviewer mode]
  Discover: 11 issues (2 HIGH, 5 MEDIUM, 4 LOW)
  Approve: Human reviews all 8 proposals.
    Approves 7, modifies 1 (changes a heading structure).
  → Approval rate: 88%, 1 modification.
  
[Cycle 1 — Docs 2-3: Still Reviewer (only 1 cycle, need ≥2 for transition)]
  Human approves all proposals for both docs.

[Cycle 2 — Doc 4: Supervisor transition]
  Reflect: 3 docs processed, approval rate 94%, 1 modification
  (not a consistent pattern). Role → Supervisor.
  
  Discover: 9 issues (1 HIGH, 4 MEDIUM, 4 LOW)
  4 MEDIUM and 4 LOW auto-approved. 1 HIGH escalated.
  
  [Cycle 3 — 8 proposals auto-approved, 1 escalated]
  Type "review" to see everything.

  The HIGH proposal suggests restructuring the API authentication
  section. Human reviews and approves.

[Docs 5-8: Supervisor mode continues. Human only sees HIGH proposals
 and the summary line. Total human decisions: ~15 across 8 docs
 instead of ~80.]
```

**What this tests:**
- **Role transition mechanics** — Reviewer → Supervisor after 2+ cycles with >80% approval
- **Graduated auto-approve** — LOW and MEDIUM auto-approved, HIGH escalated
- **The pullback mechanism** — the "[8 auto-approved, 1 escalated] Type 'review'" notice
- **Reduced human load** — 15 decisions instead of ~80 for a grind task

**Framework claims validated:**
- The role dial reduces human effort for low-risk, repetitive tasks
- Auto-approve rules work for severity-based filtering
- The pullback mechanism is present and low-friction

**Framework claims exposed:**
- **Role transitions across multiple files in a sweep are ambiguous.** The concept defines transitions based on "2+ cycles with >80% approval." In a domain sweep, is each file a "cycle"? Or are cycles within each file? If it's per-file, the user might be in Reviewer mode for the first 2 files and Supervisor for the rest — which is probably right, but the concept doesn't specify how sweeps interact with the role dial.
- **"Supervisor" role means the human only sees HIGH proposals.** But what if the auto-approved MEDIUM proposals are systematically wrong in a way that only becomes visible across multiple files? The human wouldn't notice until they explicitly pull back. The concept's Reflect phase should detect this (dimension stagnation check), but it's not clear if Reflect looks across files in a sweep or only within one file's cycles.

---

### 5.2 Production Runbook (High Risk — Dial Should NOT Advance)

**What the user has:** The runbook from use case 2.3 after initial creation.

**What the user wants:** Further refinement of the runbook for production use.

**Entry path:** Improvement loop on an existing file.

**Walkthrough:**

```
USER: refine docs/runbooks/db-failover.md

[Cycle 1: Standard Reviewer mode. 6 proposals — human reviews all,
 approves 5, modifies 1.]

[Cycle 2: The role dial considers transition to Supervisor.]

SKILL [Role dial evaluation]:
  Approval rate: 83% (>80% threshold met)
  No modifications pattern (only 1, not consistent)
  BUT: domain risk = HIGH (production runbook, affects incident response)
  
  Decision: Stay at Reviewer. High-risk domain overrides approval pattern.
  
  "Staying in full review mode — production runbooks are high-risk
  and every change should be human-verified."

[Human continues reviewing all proposals. Convergence in cycle 3.
 Role never advances beyond Reviewer.]
```

**What this tests:**
- **Domain risk overriding approval patterns** — the role dial should NOT advance for high-risk domains even with high approval rates
- **Transparent communication** — the skill explains why it's staying in Reviewer mode

**Framework claims validated:**
- The role dial accounts for domain risk, not just approval patterns
- High-risk domains keep the human in the loop regardless of confidence

**Framework claims exposed:**
- **Who determines domain risk?** The concept says "Code, production config" is high-risk and "Docs, comments" is low-risk. But a production runbook is a *document* about a *high-risk process*. The risk isn't in the file type — it's in the consequences of getting the content wrong. The domain adapter's "risk level" field handles this, but the concept's role dial table oversimplifies by mapping risk to file type. Risk should be a property of the domain adapter, not inferred from the file extension.

---

## Part 6: Boundary Cases

These scenarios test the limits of the framework. Some should work; some might not. The honest assessment of each reveals where the concept needs strengthening.

### 6.1 The Human Has Less Knowledge Than the AI

**Scenario:** A junior developer asks to refine a Dockerfile. They know it works but don't understand multi-stage builds, layer caching, or non-root users. The AI knows more about Docker best practices than the human.

**Challenge to the framework:** The concept's core thesis is that the loop extracts knowledge from the human through verification prompts. But here, the human's latent knowledge is nearly empty — they can't verify what they don't understand. The verification-generation asymmetry breaks down when the human has nothing to verify against.

**What should happen:** The loop still works, but the human's role is different. Instead of verifying correctness, they're verifying *intent* — "yes, I want this to be secure" vs. "no, I don't need multi-stage, this is just for local dev." The rubric dimensions (security, layer efficiency, image size) do the heavy lifting, not the human's Docker expertise.

**Gap in the concept:** The framework assumes the human is the domain expert and the AI is the evaluator. When the relationship is reversed (AI knows more), the loop still functions but for a different reason — the rubric systematizes the AI's expertise, and the human provides only intent and constraints. The concept should acknowledge this mode explicitly and note that the rubric matters even more when the human can't verify the proposals on technical merit.

### 6.2 Conflicting Stakeholder Needs

**Scenario:** An error message needs to be helpful to the end user (include the exact value that failed) and safe from a security perspective (don't leak PII). The error involves an email address.

**Challenge to the framework:** The rubric has both "Runtime Context" and "Information Safety" as dimensions. A proposal that scores 10/10 on one will score 2/10 on the other. The rubric can't converge — improving one dimension degrades the other.

**What should happen:** The Analyze phase should recognize the tension and propose a resolution strategy — e.g., "show the email domain but mask the local part: `***@example.com`." The Verify personas should debate this (Devil's Advocate: "what if the domain itself is sensitive?", Pragmatist: "masking the domain removes most of the diagnostic value"). The human makes the final call.

**Gap in the concept:** The concept treats rubric dimensions as independently optimizable. It doesn't address what happens when dimensions conflict. The Discover phase detects this (both dimensions score poorly), but the Analyze phase has no guidance for proposing trade-offs between dimensions. The concept should address dimension conflict explicitly — either in the rubric protocol (flag potential conflicts during design) or in the Analyze phase (generate trade-off proposals when dimensions are inversely correlated).

### 6.3 The Artifact Needs Structural Reorganization

**Scenario:** A 500-line CLAUDE.md file that has grown organically over months. Individual sections are fine, but the overall structure is wrong — related rules are scattered, there's duplication, and the reading order doesn't match execution order.

**Challenge to the framework:** The loop proposes per-issue improvements (before/after for specific text). But the problem here isn't the text — it's the structure. You can't fix this with 10 targeted edits; you need to reorganize the entire document.

**What should happen:** The Discover phase should detect structural issues — the pre-checks catch duplication, the rubric catches scannability and coherence. The Analyze phase should generate a structural proposal: "Reorganize sections into this order, merge these 3 sections, split this section." This is a single compound proposal that touches most of the file.

**Gap in the concept:** The concept's proposal model assumes bounded, local changes (before/after for a specific text region). Structural reorganization is a global change — the "before" is the entire document and the "after" is a rearrangement of it. The Analyze phase needs guidance for generating structural proposals vs. local proposals. The Apply phase needs to handle whole-file rewrites, not just targeted edits. The concept's convergence model may also struggle — structural reorganization can temporarily *lower* scores (individual sections are disrupted during reorganization) before raising them.

### 6.4 Diminishing Returns on a Already-Good Artifact

**Scenario:** User runs refine on a well-written README that scores 8.2/10 on the initial rubric. There are 2 LOW issues and nothing else.

**Challenge to the framework:** The loop is designed for convergence from a poor starting point. What does it do when the artifact is already good? Running 3 cycles on a document that only needs minor tweaks wastes time and may introduce unnecessary changes ("gilding the lily").

**What should happen:** Immediate convergence detection. The skill should report the high baseline, note the 2 LOW issues, and ask "This scores 8.2/10 with only minor issues. Want me to fix these 2 items, or is this good enough?" — not launch into a full 3-cycle loop.

**Gap in the concept:** The stopping conditions include "no HIGH/MEDIUM issues = convergence" which handles this correctly. But the concept doesn't discuss the UX of this case — the user invoked the skill expecting work to be done, and the answer is "it's already good." The interview should detect this earlier (during Discover, before committing to 3 cycles) and adjust expectations.

### 6.5 Highly Creative Content

**Scenario:** User asks to refine a product launch email. The email needs to be compelling, emotionally engaging, and have a strong CTA.

**Challenge to the framework:** The concept explicitly excludes "subjective aesthetics" as a non-fit. But a product email isn't pure aesthetics — it has measurable dimensions (CTA click-through, clarity of offer, compliance). It sits in the boundary between "definable quality" and "subjective taste."

**What should happen:** The rubric protocol works here — stakeholder analysis surfaces the reader, the marketing team, legal/compliance, and the deliverability engineer. Dimensions like "CTA clarity," "Offer comprehension," "Compliance," and "Deliverability" are all measurable. "Emotional impact" and "Brand voice" are harder — they're evaluable but not measurable. The skill should handle the measurable dimensions normally and flag the subjective ones for human-only evaluation.

**Gap in the concept:** The "What This Framework Is Not" section draws too sharp a line. The framework handles creative content with measurable dimensions fine — it struggles only with purely subjective dimensions. The guidance should be: "the framework works for the measurable aspects of creative content, but can't replace human judgment on taste, voice, and emotional impact." This is a spectrum, not a binary.

### 6.6 The Rubric Is Wrong

**Scenario:** The skill generates a rubric that misidentifies the audience (thinks it's for end users, but it's actually for internal developers). All cycle 1 proposals optimize for the wrong audience.

**Challenge to the framework:** The concept says "the rubric shapes all proposals — if it's wrong, everything downstream will be off." The rubric confirmation step after Discover is supposed to catch this. But what if the human confirms a bad rubric because they didn't read it carefully?

**What should happen:** The Reflect phase should detect symptoms: the human rejects proposals that are "too basic" or "not technical enough" — that's a signal the audience is wrong. Reflect's "approval rate by dimension" check would show low approval on dimensions calibrated for the wrong audience. The skill should ask: "You've rejected several proposals for being too simplified. Should we adjust the rubric for a more technical audience?"

**Gap in the concept:** The concept relies heavily on the rubric confirmation step as the single quality gate. But rubric errors may not be obvious at confirmation time — they become visible through downstream symptoms. The Reflect checklist should include an explicit "audience alignment check" — if the human consistently modifies proposals in a direction that suggests a different audience, flag it.

---

## Part 7: Framework Coverage Matrix

Which framework mechanisms does each use case exercise?

| Use Case | Bootstrap | Core Loop | Context Expansion | Role Dial | Deliberation | Reflect | Domain Adapter |
|---|---|---|---|---|---|---|---|
| 1.1 README improvement | | X | minor | stays Reviewer | | | |
| 2.1 Migration guide | X (brain dump) | X | **heavy** | stays Reviewer | | X | |
| 2.2 Rate limiting spec | X (Extract) | X | moderate | stays Reviewer | | | |
| 2.3 Production runbook | X (Extract) | X | **heavy** | stays Reviewer | | X | |
| 3.1 Error messages | | X | moderate | | | X | **X** |
| 4.1 Prompt engineering | | X | moderate | stays Reviewer | | X | |
| 4.2 Skill file | | X | moderate | stays Reviewer | | | |
| 5.1 Doc polish (low risk) | | X | minor | **Reviewer → Supervisor** | X (for auto-approve) | X | |
| 5.2 Runbook polish (high risk) | | X | minor | **stays Reviewer (risk override)** | | X | |

**Coverage gaps:**
- No use case exercises **deliberation heavily** — it only appears in the auto-approve path of 5.1. A use case where the personas genuinely disagree and escalate to the human would test this better.
- No use case exercises **Draft quality failure** — what happens when the generated draft is so wrong that verification prompts don't help?
- No use case tests **rubric persistence across sessions** — running refine on the same file weeks later.
- No use case tests **Measure disagreement** — what happens when the Measure evaluators disagree about whether the score improved?

---

## Part 8: Summary of Gaps Found

These gaps surfaced from the use cases and should inform the next revision of the concept:

| Gap | Surfaced by | Severity | Recommendation |
|---|---|---|---|
| Draft quality depends on domain context availability | 2.1 Migration guide | MEDIUM | Acknowledge that Bootstrap works best when the AI has project context. For domains where the AI has no context, Extract must do more work. |
| Context annotations may be too structured for complex technical content | 2.1 Migration guide | LOW | Consider allowing annotations to include structured data (code snippets, configs), not just one-line summaries. |
| Extract may need >2 rounds for complex domains | 2.2 Rate limiting spec | MEDIUM | Soften the "1-2 rounds" guideline to "minimize rounds, but don't skip past fundamental misunderstandings." |
| Draft makes design decisions the concept doesn't address | 2.2 Rate limiting spec | MEDIUM | For specs and technical content, the Draft should flag which parts are opinions vs. facts. |
| Silent failure modes challenge the rubric protocol | 2.3 Runbook | HIGH | The rubric protocol's failure mode analysis should explicitly ask: "what failures would be silent or delayed?" |
| Batch proposals mask per-instance variation | 3.1 Error messages | MEDIUM | The Approve phase needs guidance for pattern-based proposals applied across many instances. |
| Some quality dimensions require execution, not just evaluation | 4.1 Prompts, 4.2 Skill files | MEDIUM | Acknowledge that textual evaluation is a proxy for behavioral quality in some domains. |
| Dimension conflicts aren't addressed | 6.2 Conflicting stakeholders | HIGH | Add dimension conflict detection to the rubric protocol or Analyze phase. |
| Structural reorganization exceeds the proposal model | 6.3 Large files | HIGH | Add guidance for structural (global) proposals vs. local proposals in Analyze and Apply. |
| Domain risk should be in the adapter, not inferred from file type | 5.2 Runbook polish | MEDIUM | The role dial should use the domain adapter's risk level, not file extension heuristics. |
| Role dial behavior in domain sweeps is undefined | 5.1 Doc polish | MEDIUM | Specify whether the role dial tracks per-file or per-sweep. |
| "Creative content" boundary is too sharp | 6.5 Product email | LOW | Reframe as: the framework handles measurable aspects of creative content, not creative judgment. |
| Wrong rubric symptoms should be detectable in Reflect | 6.6 Wrong rubric | MEDIUM | Add "audience alignment check" to Reflect's structured checklist. |
