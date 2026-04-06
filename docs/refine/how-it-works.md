# How Refine Works: Common Scenarios

**Date:** 2026-04-06
**Companion docs:** [concept.md](concept.md) (theory), [skill-blueprint.md](skill-blueprint.md) (implementation spec), [use-cases.md](use-cases.md) (detailed walkthroughs)

---

## What This Document Covers

A practical guide to how Refine behaves in everyday situations. Each scenario shows what happens step by step, what you'll be asked, and what to expect. No framework theory — just how it works from the user's perspective.

---

## The Core Idea in 30 Seconds

Refine works by **showing you something concrete and letting you react**. It's easier to say "this is wrong" or "you missed X" than to describe everything from scratch. Each time you react, Refine learns something new about what you actually need — and the next version gets closer.

```
You say what you want (even vaguely)
  → Refine produces something concrete
    → You react: correct, add, reject
      → Refine incorporates your reaction
        → Better version
          → Repeat until you're satisfied
```

This works whether you're creating something new or improving something that already exists.

---

## The Complete Workflow

### Two Entry Paths, One Loop

Every Refine session follows the same engine. The only difference is where you enter:

```
┌─────────────────────────────────────────────────────────────┐
│                        ENTRY                                │
│                                                             │
│   "Improve this README"        "Create a migration guide"   │
│          │                              │                   │
│          │                         ┌────┴────┐              │
│          │                         │ Extract │              │
│          │                         │ (brain  │              │
│          │                         │  dump)  │              │
│          │                         └────┬────┘              │
│          │                         ┌────┴────┐              │
│          │                         │  Draft  │              │
│          │                         │ (first  │              │
│          │                         │  pass)  │              │
│          │                         └────┬────┘              │
│          │                              │                   │
│          └──────────┬───────────────────┘                   │
│                     ▼                                       │
│              ┌─────────────┐                                │
│              │   THE LOOP  │                                │
│              └──────┬──────┘                                │
└─────────────────────┼───────────────────────────────────────┘
                      ▼
```

After the entry point, creation and improvement are identical. The loop doesn't know or care how it started.

### The Refinement Loop

Each cycle runs these phases in order:

```
    ┌──────────────────────────────────────────────────────┐
    │                     ONE CYCLE                        │
    │                                                      │
    │   ┌───────────┐    What's wrong?                     │
    │   │ Discover  │──→ Score against rubric              │
    │   └─────┬─────┘    Find atomic issues                │
    │         │                                            │
    │         ▼                                            │
    │   ┌───────────┐    How to fix it?                    │
    │   │ Analyze   │──→ Before/after proposals            │
    │   └─────┬─────┘    Evidence-grounded, capped at 10   │
    │         │                                            │
    │         ▼                                            │
    │   ┌───────────┐    Would the fix actually help?      │
    │   │  Verify   │──→ Independent check (fresh context) │
    │   └─────┬─────┘    Flags trade-offs                  │
    │         │                                            │
    │         ▼                                            │
    │   ┌───────────┐    Which fixes do you want?          │
    │   │  Approve  │──→ You decide: approve/reject/modify │
    │   └─────┬─────┘    Your reactions = new context  ◄───── KEY: this is where
    │         │                                              knowledge extraction happens
    │         ▼                                            │
    │   ┌───────────┐    Make the changes                  │
    │   │  Apply    │──→ Section-targeted edits only       │
    │   └─────┬─────┘    Untouched sections stay intact    │
    │         │                                            │
    │         ▼                                            │
    │   ┌───────────┐    Did it actually improve?          │
    │   │ Measure   │──→ Re-score, show deltas             │
    │   └─────┬─────┘    "Clarity: 6 → 8"                 │
    │         │                                            │
    │         ▼                                            │
    │   ┌───────────┐    What should change next time?     │
    │   │ Reflect   │──→ Check patterns, adapt strategy    │
    │   └─────┬─────┘    (cycles 2+ only)                  │
    │         │                                            │
    └─────────┼────────────────────────────────────────────┘
              │
              ▼
        ┌───────────┐     No HIGH/MEDIUM issues
        │ Converged?│──→  AND score ≥ 85%?
        └─────┬─────┘
              │
         ┌────┴────┐
         │         │
        YES        NO
         │         │
         ▼         ▼
      ┌──────┐  ┌──────────────┐
      │ Done │  │ Next cycle   │
      │      │  │ (with new    │
      │      │  │  context)    │
      └──────┘  └──────┬───────┘
                       │
                       └──→ Back to Discover
```

### What Each Phase Does

| Phase | Question it answers | Your involvement |
|---|---|---|
| **Extract** | "What should this contain?" | React to a proposed structure |
| **Draft** | "What does a first pass look like?" | React to a concrete artifact |
| **Discover** | "What's wrong and how bad?" | Review the rubric (cycle 1 only) |
| **Analyze** | "How should each issue be fixed?" | None — proposals generated for you |
| **Verify** | "Would these fixes actually help?" | None — independent check runs automatically |
| **Approve** | "Which fixes do you want?" | **This is your main touchpoint** — approve, reject, or modify |
| **Apply** | "Make the approved changes" | None — mechanical |
| **Measure** | "Did scores improve?" | Review the deltas |
| **Reflect** | "What should change about the approach?" | None — adapts automatically |

### How Context Flows Between Cycles

The loop gets smarter each cycle because your reactions carry information:

```
Cycle 1                          Cycle 2                          Cycle 3
───────                          ───────                          ───────
Discover: 12 issues              Discover: 7 issues               Discover: 2 issues
Analyze:  10 proposals           Analyze:  7 proposals            Analyze:  2 proposals
Approve:  8 approved             Approve:  6 approved             Approve:  2 approved
          2 rejected ──context──→ (filtered out)
          + "legacy users        + "oh and the cache
            need different         invalidation is
            rollback" ──context──→  also different" ──context──→ (incorporated)
Measure:  68% → 74%             Measure:  74% → 86%              Measure:  86% → 91%
                                                                  → Converged ✓
```

Each rejection and comment becomes context that shapes what Discover finds and what Analyze proposes in the next cycle. This is why cycle 3 proposals are closer to what you'd write yourself — Refine has learned your constraints.

### When the Loop Stops

| Signal | What happens |
|---|---|
| No HIGH/MEDIUM issues + score ≥ 85% | Refine suggests stopping — you confirm |
| Max cycles reached (default: 3) | Stops, shows summary, offers to continue |
| Score drops on any dimension | Pauses with a warning |
| Scores plateau for 2 cycles | Suggests stopping or restructuring |
| You say "good enough" | Stops immediately — your judgment overrides metrics |

### The Bootstrap Path (Creation Only)

When creating from nothing, two extra phases run before the loop:

```
┌─────────────────────────────────────────────────────────┐
│                     BOOTSTRAP                           │
│                                                         │
│  ┌─────────┐                                            │
│  │ Extract │  "Here's what I think this needs:          │
│  │         │   1. Breaking changes                      │
│  │         │   2. Migration steps                       │
│  │         │   3. Rollback procedure                    │
│  │         │   What's wrong with this?"                 │
│  └────┬────┘                                            │
│       │     Your reaction: "Add data migration —        │
│       │     that's the hard part"                       │
│       ▼                                                 │
│  ┌─────────┐                                            │
│  │  Draft  │  Generates a complete first artifact       │
│  │         │  Intentionally comprehensive (easier to    │
│  │         │  say "remove this" than to notice gaps)    │
│  └────┬────┘                                            │
│       │                                                 │
└───────┼─────────────────────────────────────────────────┘
        │
        ▼
   Enter the loop (same as improvement from here)
```

Extract uses **verification prompts** ("react to this structure") instead of **generation prompts** ("what should it contain?"). This triggers more recall — you remember things when reacting to something concrete that you wouldn't volunteer unprompted.

### Expansion vs. Refinement Within the Loop

Creation sessions naturally shift focus as they progress:

```
         Expansion phase                    Refinement phase
         (what should be here?)             (how good is what's here?)
         ─────────────────────              ──────────────────────────

Cycle 1: "Section on data migration         
          is missing"  (Completeness)       
Cycle 2: "Auth edge cases not covered"      "Introduction could be clearer"
          (Completeness)                     (Clarity)
Cycle 3:                                    "Steps 3-5 assume too much
                                              context" (Clarity)
                                            "Rollback section doesn't match
                                              the code" (Accuracy)
```

The transition is automatic — when Discover stops finding missing-content issues and starts finding quality issues, the loop has shifted. No configuration needed.

---

## Scenario 1: Improving an Existing Document

**Situation:** You have a README, API doc, runbook, or spec that exists but needs work.

**What you say:** "Refine this README" or "Improve docs/setup-guide.md"

### What happens

```
Step 1: Rubric Generation
  Refine reads the document and asks: who reads this? what goes wrong if it's bad?
  → Produces 5-7 quality dimensions (clarity, completeness, accuracy, etc.)
  → You confirm or adjust the rubric

Step 2: Discover
  Refine scores the document against each rubric dimension
  → Produces a list of specific, atomic issues ranked by severity
  → Example: "Section 3 assumes Docker knowledge the audience may not have" (Clarity, HIGH)

Step 3: Analyze
  Each issue becomes a concrete proposal with before/after text
  → "Change this paragraph FROM [current text] TO [proposed text]"
  → Capped at 7-10 proposals per cycle to keep review manageable

Step 4: Verify
  A separate evaluation (isolated from the proposal reasoning) checks:
  does this change actually improve the targeted dimension?
  → Flags trade-offs: "improves clarity but removes a useful detail"

Step 5: Approve
  You see each proposal and decide: approve, reject, or modify
  → Your rejections carry context: "No, we keep that section because..."
  → That context feeds the next cycle

Step 6: Apply
  Approved changes are made to the document
  → Only the targeted sections change — everything else stays untouched

Step 7: Measure
  The updated document is re-scored against the rubric
  → You see the score movement: "Clarity: 6 → 8, Completeness: 7 → 7"

Step 8: Next cycle or stop
  If issues remain → back to Discover with your new context incorporated
  If scores are high and no major issues → Refine suggests stopping
  If you say "good enough" → stops immediately
```

### What you'll be asked

| When | What you're asked | Why |
|---|---|---|
| Start | "Who is the audience? What matters most?" | To build the rubric |
| Each proposal | "Approve, reject, or modify?" | You control what changes |
| After each cycle | "Continue refining or stop here?" | You decide when it's done |

### How many cycles to expect

Most documents converge in **2-4 cycles**. The first cycle catches the obvious issues. The second catches things your reactions surfaced. By the third, you're polishing.

---

## Scenario 2: Creating Something from Nothing

**Situation:** You have ideas, notes, or knowledge in your head, but no document yet.

**What you say:** "Refine a migration guide for our v3 upgrade" or "Create a runbook for the deploy process"

### What happens

```
Step 1: Extract (the "brain dump")
  Refine asks you to dump what you know — but not as open-ended questions.
  Instead, it shows you a proposed structure and asks you to react:

  "Here's what I think a migration guide needs:
   1. Breaking changes list
   2. Step-by-step upgrade path
   3. Rollback procedure
   4. Known issues
   What's wrong with this? What's missing?"

  Your corrections ("Add a section on data migration — that's the hard part")
  carry more information than answering "what should the guide cover?"

Step 2: Draft
  Refine produces a first concrete artifact based on your input
  → This draft will be wrong in places — that's intentional
  → Wrong proposals trigger richer corrections than right questions

Step 3: Enter the improvement loop
  Same cycle as Scenario 1: Discover → Analyze → Verify → Approve → Apply → Measure
  → But now your reactions to the draft add context that wasn't in your brain dump
  → "You got the rollback steps wrong — legacy users need a different process"
  → That reaction carries new knowledge the next cycle uses
```

### Why it works better than Q&A

| Traditional approach | Refine approach |
|---|---|
| "What should the guide cover?" → You list 5-6 things, then stall | "Here's what I think it needs — what's wrong?" → You correct, add, and remember things you forgot |
| "Anything else?" → "I think that's it" | "I assumed rollback is straightforward — is it?" → "Actually no, legacy users need..." |
| You do the hard work (generating from memory) | Refine does the hard work (proposing), you do the easy work (reacting) |

### How many cycles to expect

Creation typically takes **3-5 cycles**. The first 1-2 cycles are "expansion" (getting all the content in). The remaining cycles are "refinement" (improving quality). You'll notice the shift — issues move from "this section is missing" to "this section could be clearer."

---

## Scenario 3: Sweeping Across Many Files

**Situation:** You need consistent quality across many similar items — error messages, API endpoint docs, component README files, test descriptions.

**What you say:** "Refine all error messages in src/" or "Improve the JSDoc across our API handlers"

### What happens

```
Step 1: Collection
  Refine finds all matching files using patterns you confirm
  → "Found 47 error messages across 12 files. Proceed?"

Step 2: Rubric (once, for all files)
  A single rubric is generated for the domain
  → Error messages might score on: actionability, specificity, tone consistency, technical accuracy

Step 3: Batch scoring
  All items are scored against the rubric
  → Results are grouped by severity: "14 HIGH, 21 MEDIUM, 12 LOW"
  → Worst items are prioritized first

Step 4: Batch proposals
  Proposals are generated for the highest-priority items
  → Before/after for each: "Change 'Error 500' TO 'Could not save — the database connection timed out. Try again in a few seconds.'"

Step 5: Batch approve
  You review proposals as a batch (with option to review individually)
  → Approve all, reject specific ones, or modify the pattern

Step 6: Apply across files
  Approved changes are applied to each file
  → Each file is modified only where proposals were approved

Step 7: Next batch or stop
  Move to the next priority tier, or stop when quality is consistent
```

### What makes this different from find-and-replace

Refine understands context. The same rubric produces different proposals for different error messages because each one has a different trigger condition, audience state, and recovery path. A user-facing "file not found" gets different treatment than an internal "cache miss" — even under the same rubric.

### How many cycles to expect

Sweeps typically take **2-3 cycles per priority tier**. HIGH issues first, then MEDIUM. Most teams stop before LOW — diminishing returns.

---

## Scenario 4: Improving Code Quality

**Situation:** You have working code that could be clearer, better structured, or better documented.

**What you say:** "Refine the error handling in src/api/" or "Improve the test descriptions in this file"

### What happens

The same loop applies, but the rubric dimensions shift to code-relevant concerns:

| Dimension | What it measures |
|---|---|
| Clarity | Can a new team member understand this without asking questions? |
| Correctness | Does the code handle edge cases the comments/types claim it does? |
| Consistency | Does it follow the patterns used in the rest of the codebase? |
| Testability | Can the behavior be tested without complex setup? |
| Error handling | Are failure modes handled explicitly, not silently? |

### Code-specific verification

The Verify phase for code can do more than read — it can:
- Check that claims in comments match the actual implementation
- Run existing tests to confirm proposals don't break behavior
- Verify type correctness after changes
- Check that error messages match the conditions that trigger them

### What you'll be asked

Same as other scenarios — approve, reject, or modify each proposal. But code proposals include:
- The specific function or block being changed
- A before/after diff
- Which rubric dimension it targets
- What evidence supports the change

---

## Scenario 5: When You're Not Sure What You Want

**Situation:** You know something needs to exist or improve, but you can't articulate exactly what.

**What you say:** "I need some kind of onboarding doc" or "This module feels messy but I'm not sure why"

### What happens

This is where Refine's extraction model is strongest. Instead of asking you to define the problem, it:

1. **Proposes a rubric** — "Here's how I'd evaluate an onboarding doc. React to this."
2. **Proposes a structure** — "Here's what I think it needs. What's wrong?"
3. **Proposes content** — "Here's a first draft. Where does it miss the mark?"

Each reaction you give narrows the space. By cycle 2-3, you know what you want — because you've been reacting to concrete proposals, not trying to generate requirements from an empty page.

### The key insight

You don't need to know what you want at the start. You just need to be able to say "not that" or "closer, but..." when you see something concrete. Refine handles the generation; you handle the judgment.

---

## Scenario 6: Quick One-Shot Improvement

**Situation:** You don't need a full multi-cycle refinement. You just want a single pass of improvement.

**What you say:** "Give this a quick refine pass" or "One round of improvement on this doc"

### What happens

```
Single cycle: Discover → Analyze → Verify → Approve → Apply → Done
```

No rubric negotiation — Refine infers a reasonable rubric from the content type. No measurement phase — you decide if it's better. Useful for:
- Polishing a doc before a PR
- Cleaning up a draft before sharing
- Catching obvious issues you might have missed

---

## What Refine Does NOT Do

| If you need... | Use instead |
|---|---|
| Generate a new feature from requirements | An implementation tool — Refine improves artifacts, not architects systems |
| Brainstorm when you have no direction at all | A brainstorming session — Refine needs at least a vague direction |
| Evaluate subjective aesthetics (design, naming) | Human judgment — rubrics don't capture taste well |
| Replace user research | Actual user research — Refine surfaces what *you* know, not what *users* need |

---

## How It Gets Better Over Time

Each cycle, Refine learns from your reactions:

| Your reaction | What Refine learns |
|---|---|
| Reject a proposal | "Don't suggest changes like this" — filters future proposals |
| Modify a proposal | "The direction was right but the execution needs adjustment" — calibrates style |
| Add context during approval | "There's a constraint I didn't know about" — enriches the next cycle |
| Approve without changes | "This kind of proposal works well" — confirms the approach |

By cycle 3-4, proposals are closer to what you'd write yourself — because Refine has extracted your standards, constraints, and preferences through your reactions to concrete proposals.

---

## The Human Role: From Reviewer to Director

Your involvement naturally decreases as Refine learns:

```
Cycle 1:  You review everything          (Reviewer)
Cycle 2:  You review most things         (Reviewer → Supervisor)
Cycle 3:  You handle only disagreements  (Supervisor)
Cycle 4+: You review the final output    (Director)
```

You can always pull back to full review mode at any point. Autonomy is earned per-cycle and revocable instantly.

---

## Quick Reference: What to Expect

| Scenario | Cycles | Your effort per cycle | Total time feel |
|---|---|---|---|
| Improve existing doc | 2-4 | Review 7-10 proposals | 15-30 min |
| Create from scratch | 3-5 | Brain dump + review proposals | 30-60 min |
| Sweep across files | 2-3 per tier | Batch review | Varies by count |
| Quick one-shot | 1 | Review proposals once | 5-10 min |
| Vague starting point | 3-5 | React to proposals, context builds | 30-60 min |
