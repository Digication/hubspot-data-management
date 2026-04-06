# Bootstrap: Creation From Nothing

Detailed guidance for creating artifacts when no starting material exists.

## The Principle

Creation and improvement are the same process at different starting points. Bootstrap provides the entry point — once a draft exists, the standard loop takes over identically.

```
Creation:    [nothing] → brain dump → draft → loop → loop → converged artifact
Improvement: [existing artifact] ───────────→ loop → loop → converged artifact
```

## When It Activates

Automatically when ANY of:
- Target file doesn't exist or is nearly empty (< 10 lines)
- User's intent matches creation signals ("I need a...", "help me write a...", "draft a...")
- User provides a brain dump without referencing an existing file

## Extract Phase

### Purpose

Gather requirements through **verification, not generation**. Show a proposed outline and let the human correct — don't ask open-ended "what do you want?" questions.

### Process

1. **Read available context:**
   - Project structure (`ls`, `package.json`, `README.md`)
   - File path hints (if the user said "create docs/migration.md", the path tells you the domain)
   - User's stated goal
   - Any existing related files

2. **Generate a proposed outline:**
   ```
   Based on [project context], here's what I think [target] needs:

   1. Overview — what's changing and why
   2. Timeline — when does this take effect
   3. What breaks — specific API/behavior changes
   4. Migration steps — standard users
   5. Migration steps — legacy users
   6. Rollback — how to undo if needed
   7. FAQ

   What's missing or wrong?
   ```

3. **Present with `AskUserQuestion`:**
   ```
   options:
     - "Looks right, draft it (Recommended)"
     - "Missing something" → capture, regenerate outline
     - "Wrong direction" → ask what's off, regenerate
   ```

4. **If the user adds context**, capture it and regenerate. Don't proceed with a wrong outline.

### Constraints

- **1-2 rounds maximum** in most cases. The goal isn't a perfect outline — it's a starting point concrete enough to trigger reactions when the draft is reviewed.
- **Complex domains** (where the AI has limited context): allow more rounds rather than producing a wildly wrong draft.
- **Brain dump provided directly**: Skip Extract entirely, go straight to Draft.

## Draft Phase

### Purpose

Generate a complete first artifact that's specific enough to trigger corrections.

### The Productive Wrongness Principle

The draft should be **intentionally comprehensive and specific** rather than cautious and vague:

| Approach | What happens |
|---|---|
| "The authentication process should be documented" | Human says "yes it should" — no new information |
| "Authentication: POST /v2/auth/token with client_id and client_secret in the body" | Human says "No — it uses client_assertion, not client_id/secret" — specific correction with real information |

The quality bar: **every paragraph triggers either "yes" or "no, actually..." from the human.**

### Making Decisions in the Draft

For technical content (specs, architecture docs), the draft inevitably makes design decisions:
- Algorithm choices (token bucket vs. sliding window)
- Data structures (Redis key schema)
- Endpoint formats
- Configuration values

These are **opinions, not facts.** The Analyze phase should flag opinionated sections as verification prompts:

```
"This proposes token bucket rate limiting — is that the right algorithm, or should it be sliding window?"
```

This turns a design decision into a verification prompt rather than letting it pass unexamined.

### Gap-Specific Inquiry

When writing the draft, if you encounter a specific gap in your knowledge:

| Instead of | Do this |
|---|---|
| "Assuming the rollback process is standard..." | Ask: "I need to know: is rollback a simple switch-back, or are there conditions (like key rotation) that change the process?" |
| "The legacy user flow may differ..." | Ask: "How do legacy plan users differ? Same token format? Different endpoints?" |
| Hedging with "typically" / "usually" / "in most cases" | Identify the specific gap and ask about it |

A specific question about a concrete gap triggers targeted retrieval from the human. A hedge produces a vague artifact that doesn't trigger useful corrections.

**When to ask vs. when to guess:**
- If you have some context about the domain → guess specifically (be plausibly wrong)
- If you have zero context → ask (can't be productively wrong if you're just randomly wrong)
- If the gap would affect multiple sections → ask before drafting
- If the gap is local to one paragraph → guess, flag for review

### After the Draft

1. Write the complete draft to the target file
2. Enter the standard loop — no special handling
3. The first Discover + Analyze cycle evaluates the draft like any existing artifact
4. Context captured during the first Approve cycle feeds into cycle 2

## Examples

### Brain Dump → Migration Guide

**Input:**
```
token format changing from JWT to opaque, old tokens expire in 90 days,
new endpoint /v2/auth/token, introspection endpoint gone, rollback possible
but tricky, legacy plan users need different steps
```

**Draft decisions (all potentially wrong, all productive):**
- Guesses `/v2/auth/token` takes `client_id` + `client_secret` → triggers correction: "Actually, it uses `client_assertion`"
- Guesses rollback is a single step → triggers: "Two paths depending on key rotation"
- Guesses legacy users use the same endpoint → triggers: "No, legacy detection uses `plan_type` field, and tokens have 24h lifetime vs 1h"

**Result:** Cycle 1 captures 3 factual corrections + 2 new constraints not in the brain dump.

### Goal Statement → Technical Spec

**Input:** "I need a spec for adding rate limiting to our API"

**Extract round 1:** Proposes DDoS-focused outline based on "rate limiting" keyword.
**Human corrects:** "We're behind Cloudflare — this is per-API-key application-level limits."
**Extract round 2:** Revised for per-key, tier-based limits.

**Draft:** 400-line spec with pseudocode, Redis schema, tier limits (100/min free, 1000/min pro). All specific, all correctable.

### Tribal Knowledge → Runbook

**Extract:** Proposes standard failover outline.
**Human corrects:** "Single-instance Postgres with WAL archiving. No replica."
**Extract round 2:** Revised for WAL restore. Admits gaps: "I assumed S3 bucket names."
**Human provides:** Bucket name, instance size, plus: "You have to manually recreate replication slots for the analytics pipeline. If you forget, analytics goes stale silently for days."

The critical detail (replication slots) emerged from the Extract conversation, triggered by seeing a concrete but incomplete outline.

## What Makes Bootstrap Different From a Chatbot

A chatbot asks "what do you want?" and generates from the answer. Bootstrap:
1. **Shows** a proposed outline (verification, not generation)
2. **Drafts** something specific enough to be meaningfully wrong
3. **Captures** corrections that carry more information than the original request
4. **Feeds** captured context into systematic rubric-driven evaluation

The loop doesn't just fix the draft — it expands the available context with each cycle.
