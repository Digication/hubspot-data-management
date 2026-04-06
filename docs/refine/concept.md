# Refine: A Framework for Iterative Human-AI Artifact Creation and Improvement

**Status:** Proposal
**Date:** 2026-04-06
**Origin:** Research on verification-generation asymmetry in human-AI collaboration

---

## 1. What This Document Is

A framework design for **Refine** — a domain-agnostic capability for creating and improving artifacts through rubric-driven iterative loops. This covers the theoretical model, architectural decisions, domain separation strategy, and a critical assessment of trade-offs.

This is not a skill file. The companion document [skill-blueprint.md](skill-blueprint.md) translates this framework into an implementable agent skill specification.

---

## 2. The Problem

### How most human-AI collaboration works today

```
Human describes what they want → AI generates output → Human reviews → Repeat
```

This workflow is bounded by a cognitive bottleneck: **humans cannot generate a complete specification of what they know on demand.** Human memory is associative — retrieval requires cues. Open-ended generation ("tell me everything about this") provides no cues and produces incomplete results.

```
What the human knows:              [============================]
What the human provides upfront:   [========]
What the AI works with:            [========]
What the output covers:            [========]
```

Output quality is bounded by the narrowest point: what the human managed to articulate at the start.

### Why this matters

The AI's output inherits every gap in the human's initial specification. Subsequent review catches what the human happens to notice, not what would actually be best. There's no systematic evaluation, no convergence criteria, and no mechanism for surfacing knowledge the human didn't think to mention.

---

## 3. The Framework: Refine

### Core Thesis

**Iterative loops with concrete proposals extract more knowledge from humans than direct questioning, because human cognition is optimized for verification, not generation.** This asymmetry means the most effective human-AI workflow is:

1. AI generates something concrete (even if wrong)
2. Human reacts — correcting, adding, redirecting
3. The reaction carries new context that wasn't available before
4. AI incorporates new context and generates again
5. Repeat until the artifact converges on what the human actually wanted

This is the same process whether you're creating from nothing or improving something existing. The only difference is the starting point.

### Why "Refine"

| Candidate | Verdict | Reasoning |
|---|---|---|
| **Optimize** | Rejected | Implies narrowing toward a known optimum. Excludes creation. Users won't invoke it for a brain dump. |
| **Iterate** | Rejected | Describes the mechanism, not the outcome. Too generic. |
| **Forge** | Rejected | Evocative but metaphorical. Would confuse non-native English speakers. Implies heavy transformation, not the verification-first approach. |
| **Craft** | Rejected | Implies artisanal care, which is right for the output but wrong for the process (which is systematic, not artisanal). |
| **Loop** | Rejected | Too mechanical. Describes the structure, not the purpose. |
| **Converge** | Rejected | Too technical. Correct but doesn't communicate intent. |
| **Distill** | Close | "Distill knowledge into an artifact" works for creation but not for improvement. One-directional. |
| **Refine** | **Selected** | Works for creation ("refine these raw ideas into a spec") and improvement ("refine this README"). Natural language invocation. Covers the full spectrum from raw to polished. Implies iterative processing — you refine through repeated passes, not in one shot. |

"Refine" correctly implies that the human's raw input has value — it's not generating from nothing, it's extracting and shaping what already exists in the human's knowledge.

### The Two Modes Are One Process

```
Creation:   [nothing] → brain dump → draft → refine → refine → converged artifact
Improvement: [existing artifact] ────────────→ refine → refine → converged artifact
```

The difference is just where you enter the loop. Creation starts with an extraction phase, then enters the same refinement loop as improvement. There should not be two separate code paths — there should be one loop with an optional bootstrap phase.

### The Knowledge Extraction Model

Each cycle does two things:
1. **Improves the artifact** (the visible output)
2. **Expands available context** (the invisible output)

```
Cycle 1: Human context ████░░░░░░    Artifact quality ███░░░░░░░
Cycle 2: Human context ██████░░░░    Artifact quality █████░░░░░
Cycle 3: Human context ████████░░    Artifact quality ████████░░
Cycle 4: Human context ██████████    Artifact quality ██████████
```

Context expansion happens through three mechanisms:

1. **Triggered recall** — Concrete proposals trigger the human to remember things they wouldn't have volunteered. "You missed rollback steps" triggers "and actually, rollback is different for legacy users."
2. **Correction context** — When the human rejects or modifies a proposal, their reasoning carries new information. "No, don't add that section because we deprecated that feature last month."
3. **Gap-specific inquiry** — When the AI identifies a specific gap in its own knowledge ("I assumed rollback is straightforward — is it?"), the specificity triggers targeted retrieval from the human.

All three are verification prompts, not generation prompts. The human reacts to something concrete rather than generating from an open-ended question.

### The Show, Don't Ask Principle

Every human touchpoint should be a **verification prompt** (show something concrete, ask "is this right?") rather than a **generation prompt** (ask "what should this include?").

| Approach | Prompt type | What you get |
|---|---|---|
| "What should the migration guide cover?" | Generation | Partial list, stalls after 5-6 items |
| "Here's what I think the migration guide needs — what's missing?" | Verification | Corrections, additions, and triggered memories |
| "What else should I know?" | Generation (open-ended) | "Nothing" or "I think that's it" |
| "I assumed rollback is straightforward — is it?" | Verification (specific) | "Actually no, legacy users need a different process because..." |

The wrong answer to a verification prompt is more valuable than the right answer to a generation prompt. When the AI guesses wrong, the human corrects — and the correction carries context.

---

## 4. Framework Architecture

### The Refine Loop

```
Bootstrap (if no artifact exists)
  Extract → Draft → [enter loop]

Loop (repeats until convergence)
  Discover → Analyze → Verify → Approve → Apply → Measure → Reflect
```

**Bootstrap** is not a separate mode — it's the loop's entry point when there's nothing to discover against. After the draft is generated, the loop takes over identically.

### Phase Responsibilities

| Phase | Input | Output | Core Question |
|---|---|---|---|
| **Extract** | User's brain dump + project context | Structured requirements | "Here's what I think you need — what's wrong?" |
| **Draft** | Structured requirements | First concrete artifact | "Here's a first pass — react to it." |
| **Discover** | Current artifact + rubric | Atomic scored issues list + baseline | "What's wrong and how bad is it?" |
| **Analyze** | Issues list + context + grounding store | Concrete proposals (before/after) with evidence citations | "Here's how to fix each issue." |
| **Verify** | Proposals (without Analyze reasoning) | Impact assessment per rubric dimension | "Would these changes actually help?" |
| **Approve** | Proposals + verification | Decisions (approve/reject/modify) + new context | "Which of these do you want?" |
| **Apply** | Approved proposals | Updated artifact (section-targeted, diff-validated) | (mechanical — no judgment) |
| **Measure** | Updated artifact + rubric | New scores + deltas + convergence log entry | "Did it actually improve?" |
| **Reflect** | Cross-cycle patterns | Adapted strategy for next cycle | "What should change about how I work?" |

### The Human Role Dial

The human's involvement is a continuous variable, not a binary switch:

```
AUTHOR ←──── REVIEWER ←──── SUPERVISOR ←──── DIRECTOR
  ↑              ↑                ↑               ↑
Creates from   Reviews every   Handles only    Defines rubric,
scratch        proposal        disagreements   reviews final
                               and escalations output
```

**Most AI workflows put the human as Author, then Reviewer.** Refine starts the human as Reviewer (or lower) and shifts them toward Director as confidence builds.

The dial position is determined by:

| Factor | Toward Reviewer (more human) | Toward Director (more autonomous) |
|---|---|---|
| Cycle number | Cycle 1 | Cycles 3+ |
| Domain risk | Code, production config | Docs, comments |
| AI confidence | Evaluators disagree | Evaluators unanimous |
| Novelty | First time seeing this proposal type | Similar to previously approved |
| Context completeness | AI identifies knowledge gaps | AI has full context |

**Critical constraint:** The human can always pull back to full Reviewer mode instantly. Autonomy is earned per-cycle and revocable at any moment.

### Domain-Agnostic Core vs. Domain Adapters

The framework separates cleanly into a domain-agnostic engine and pluggable domain adapters.

**Domain-agnostic core** (the engine):
- The loop structure and phase sequencing
- Knowledge extraction mechanics (verification > generation)
- Human role dial and progressive autonomy
- Context expansion and capture
- Multi-agent deliberation and cross-family evaluation
- Fresh-context verification agent spawning
- Convergence detection, stopping conditions, and convergence logging
- Issue decomposition (compound → atomic)
- Proposal budget discipline and priority cascade
- Section-targeted apply with diff validation
- Rubric-driven evaluation (the protocol, not specific rubrics)
- Report generation
- State management between phases

**Domain adapters** (pluggable configuration):
- Rubric templates (dimensions, anchors, scoring criteria)
- Pre-check suites (deterministic checks per file type)
- Collection methods (how to find targets in a domain)
- Audience detection rules
- Apply strategies (how changes are made in this domain)
- Verify strategies (tools and evidence sources per domain)
- Grounding stores (evidence basis for proposals and revisions)
- Severity definitions (what counts as HIGH vs. LOW in this context)

**The contract for a domain adapter** is defined in the Extended Domain Adapter Contract section below, which includes verification strategy and grounding store configuration alongside the base fields.

Adding a new domain is a structured task: fill in the adapter, and the engine handles everything else. The contract is a specification for template structure, not a plugin system — domain templates can live in a single reference file with consistent structure.

### Phase-Level Design Principles

The following principles govern specific phases. Each addresses a known failure mode in iterative AI improvement loops.

#### Discover: Atomic Issue Decomposition

Issues must be atomic — each targets exactly one rubric dimension and one location in the artifact. If Discover identifies a compound issue like "Section 3 is unclear and missing examples," it must decompose it:

1. Section 3 is unclear (Clarity dimension)
2. Section 3 is missing examples (Completeness dimension)

These become separate proposals in Analyze, separate verifications, and separate approval decisions. Bundling them means a rejection of one ("we intentionally don't have examples there") blocks the fix for the other. Compound assertions must be split so each gets an independent verdict.

#### Analyze: Evidence-Grounded Proposals with Budget Discipline

**Evidence citation.** Every proposal must cite its evidence: a rubric score, a specific user correction, or a grounding store reference. "Change the introduction to emphasize X" must point to *why*. Proposals without evidence are opinions, not improvements.

**Grounding store.** For domains where claims need external grounding (docs referencing code, specs referencing requirements), the domain adapter can define a grounding store — a mapping from claims to verified sources. Proposals and revisions are constrained to draw from this store, preventing the introduction of unsupported claims during iteration. (See the extended domain adapter contract below.)

This addresses a known failure mode in iterative refinement: revision drift, where successive iterations introduce plausible-sounding but unverified claims. The principle: **make the evidence basis explicit and constrain revisions to it.**

**Budget cap.** Cap proposals per cycle (e.g., 7-10). When Analyze generates more, apply a priority cascade:
1. HIGH severity issues
2. Dimensions furthest from target score
3. Dimensions the human has given context on

List overflow proposals in the cycle report as "deferred to next cycle." This prevents the Approve phase from becoming a rubber-stamping exercise — the human should genuinely evaluate each proposal, not be buried in 25 of them.

#### Verify: Fresh-Context Independence

**Verification agents must not see Analyze reasoning.** The agent that evaluates "does this proposal improve clarity?" must not see the Analyze phase's argument for *why* it should. Give the verifier only:

1. The **proposal** (before/after)
2. The **rubric dimension** it targets
3. The **current artifact context** (just the relevant section)
4. The **grounding store entries** for that section (if applicable)

This is the single most important quality mechanism in the framework. Self-evaluation bias — where the generator's reasoning primes the evaluator toward agreement — is the dominant failure mode in AI improvement loops. When evaluators share context with generators, they produce artificially high agreement (in multi-LLM evaluation studies, inter-rater reliability can exceed Krippendorff's Alpha 0.96, far above the 0.6-0.7 typical in human peer review). This isn't consensus — it's shared bias masquerading as agreement.

The verifier's job is to assess impact, not to confirm the generator's intent.

**Verdict format.** Proposal verification needs a richer signal than binary pass/fail:

| Verdict | Meaning |
|---|---|
| **Improves target** | The proposal improves the targeted rubric dimension |
| **Improves target, degrades other** | Improves the target but harms another dimension — flag the trade-off |
| **Neutral** | No meaningful impact on any dimension |
| **Degrades** | Makes the targeted dimension worse |

Each verdict must cite specific evidence — a rubric anchor comparison, a grounding store reference, or a concrete observation about the change. "I believe this helps" is not verification.

**Cross-family evaluation.** When the artifact was generated by model X, at least one evaluator should be a different model family. Same-family judges share systematic biases from similar training data. If multi-model evaluation isn't available, flag this as a confidence limitation in the cycle report.

#### Apply: Section-Targeted with Diff Validation

Apply is a two-step process:

1. **Generate** — produce revised content scoped to the approved proposal's target section
2. **Validate** — programmatically diff the result against the original, verify that changes fall within the proposal's stated scope, flag any out-of-scope modifications for human review

Only sections targeted by approved proposals are modified. Untouched sections pass through unchanged. This prevents scope creep that instruction-following alone cannot catch — relying on an LLM to obey "only modify this section" without programmatic enforcement is insufficient.

### Extended Domain Adapter Contract

The domain adapter contract includes verification and grounding configuration:

```
Domain Adapter {
  name: string                    // e.g., "error-messages"
  description: string             // One-line description
  collection: {
    patterns: string[]            // Glob/grep patterns to find targets
    scope: string                 // Where to look (e.g., "src/")
  }
  rubric: {
    audience: string              // Primary audience
    dimensions: Dimension[]       // 5-7 dimensions with anchors
  }
  prechecks?: Precheck[]          // Deterministic checks
  apply_strategy?: "inline" | "batch" | "per-file"
  verify_strategy?: {
    tools: string[]               // What the verifier can use
    evidence_sources: string[]    // Where to look for ground truth
    checks: string[]              // Domain-specific verification steps
  }
  grounding_store?: {
    type: "code" | "docs" | "config" | "external"
    sources: string[]             // File patterns or URLs
    extraction: "auto" | "manual" // How entries are populated
  }
  examples?: {                    // Before/after for each dimension
    before: string
    after: string
  }[]
}
```

**`verify_strategy`** defines how the Verify phase operates for this domain. For code: read the actual function, run tests, check types. For docs: check that claims match the code they describe. For error messages: check that the message matches the error condition that triggers it.

**`grounding_store`** defines the evidence basis for proposals and revisions. For documentation domains, this maps claims to source code. For specs, it maps requirements to stakeholder decisions. Proposals must reference grounding store entries, and Apply must preserve those references.

---

## 5. Convergence Model

### Two Phases of Convergence

Creation and improvement have different convergence patterns:

**Phase 1: Expansion** (creation mode, cycles 1-2)
- Success = the artifact covers all relevant topics
- Convergence signal = no major gaps identified, only quality issues
- Human role = Reviewer (high involvement, establishing direction)

**Phase 2: Refinement** (improvement mode, cycles 2+)
- Success = all dimensions at acceptable quality
- Convergence signal = no HIGH/MEDIUM issues
- Human role = shifting toward Supervisor/Director

The transition from expansion to refinement is automatic: when Discover stops finding missing-content issues and starts finding quality issues, the loop has shifted from "what should be here?" to "how good is what's here?"

### Stopping Conditions

Convergence uses both qualitative and quantitative signals. Relying on qualitative assessment alone ("no HIGH/MEDIUM issues") is vulnerable to the AI's own judgment about severity classification. Empirical data from multi-LLM evaluation systems shows a consistent gap between automated and human quality scores — AI judges tend to declare convergence too early. Numeric thresholds provide a floor that qualitative assessment can't game.

| Condition | Type | Action |
|---|---|---|
| No HIGH/MEDIUM issues AND aggregate score ≥ 85% of rubric max | Qualitative + quantitative | Convergence — offer to stop |
| No HIGH/MEDIUM issues but aggregate score < 85% | Sanity check | Warning: severity classification may be too lenient. Show scores. |
| Max cycles reached | Quantitative | Stop, show summary, offer to continue |
| Score regression > 1.0 on any dimension | Quantitative | Pause with warning |
| Score plateau (delta < 0.5 for 2 cycles) | Quantitative | Suggest stopping or restructuring |
| 4 cycles without convergence | Quantitative | Advisory: consider rubric or structural changes |
| Human says "good enough" | Qualitative | Stop immediately — the human's judgment overrides metrics |

The 85% threshold is a starting default, not a universal constant. Domain adapters can override it (e.g., production code may require 90%; internal docs may accept 80%).

### Convergence Log

Each cycle produces a structured log entry that feeds into both the stopping conditions and the Reflect phase:

```
CycleLog {
  cycle: number
  scores: {
    dimension: string
    evaluator: string         // which persona or model scored
    score: number
    delta: number             // vs. previous cycle
  }[]
  aggregate: number
  aggregate_delta: number
  proposals_generated: number
  proposals_approved: number
  proposals_rejected: number
  proposals_deferred: number  // overflow from budget cap
  context_additions: number   // new facts from human reactions
}
```

This serves three purposes: (a) the Reflect phase has structured data to analyze instead of open-ended pattern recognition, (b) stopping conditions can be evaluated mechanically against numeric fields, (c) the human can see whether the loop is actually converging or thrashing. The trajectory `[87.0 → 90.1 → 91.4 → 92.7]` communicates more than "issues found: 3."

---

## 6. Multi-Agent Deliberation vs. Independent Scoring

Averaging independent scores hides meaningful disagreement. Scores of 9, 8, and 3 average to 6.7 — "moderate confidence." But the 3 represents a specific concern that was diluted, not addressed.

Multi-LLM evaluation panels that use pure averaging with no mechanism for surfacing dissent consistently produce inter-rater reliability far higher than human peer review (Alpha > 0.96 vs. 0.6-0.7 for humans). This suggests the judges aren't providing genuinely independent perspectives — they're converging on shared biases. When the goal is measurement, this is acceptable. When the goal is a *decision* (should this proposal ship without human review?), artificial consensus is dangerous.

### When to use deliberation vs. averaging

| Context | Method | Reasoning |
|---|---|---|
| Verification of proposals | Deliberation | Concerns must be articulated and defended, not just scored |
| Baseline scoring (Discover) | Averaging with spread reporting | Independent scoring is appropriate for measurement; spread flags disagreement |
| Measurement (Measure) | Averaging with spread reporting | Same as above — measurement should be independent |
| Auto-approve decisions | Deliberation | The decision to skip human review must be high-confidence |

Deliberation is more expensive (multi-round) and should be reserved for decisions, not measurements.

### Cross-Family Evaluation

When the artifact or proposals were generated by model X, at least one evaluator in Discover and Measure should be a different model family. Same-family judges share systematic biases from similar training data — ablation studies show self-judge bias is small but measurable. For the Verify phase (fresh-context agents), cross-family evaluation is especially important because the verifier must be independent from the generator.

If multi-model evaluation isn't available (cost, API access), flag it as a confidence limitation in the cycle report rather than silently proceeding. The human should know when all quality signals come from the same model family.

### Deliberation Protocol

```
Round 1: Each persona evaluates independently
  → Structured output: score, concerns, recommendation
Round 2: Each persona sees others' concerns, responds
  → Concede, defend, or refine position
Round 3: Final positions
  → Unanimous agreement → auto-approve (notify human)
  → Majority agreement → auto-approve with caveats (notify human of dissent)
  → Persistent dissent → escalate to human with the specific contention
```

The key output is not a number but a **rationale** — "approve because X" or "escalate because persona Y is concerned about Z."

---

## 7. Context Expansion as a First-Class Mechanism

### Context Types

| Type | Source | Example | How it enters the loop |
|---|---|---|---|
| **Correction context** | Human rejects/modifies a proposal | "No, we deprecated that feature" | Filters future proposals |
| **Additive context** | Human approves and adds | "Yes, and also the auth service has a quirk..." | Enriches next cycle's discover |
| **Reference context** | Human points to external source | "There's a wiki page about this" | Prompts for content; adds to context |
| **Preference context** | Pattern in human decisions | User always shortens proposed text | Adjusts generation style |

### Integration Points

1. **After Approve:** Parse human responses for non-decision content. If the response contains new facts, corrections, or references beyond "approve/reject/modify," capture them as context annotations.

2. **In Reflect:** Analyze context annotations from the current cycle. Update the next cycle's Discover prompt to incorporate new context. Adjust proposal generation style based on preference context.

3. **During any phase:** If the AI hedges or makes assumptions ("assuming the rollback process is standard..."), this is a gap signal. Before proceeding, ask about the specific gap — not an open-ended "anything else?" but a targeted "I'm not sure about X — do you have context on this?"

### The Anti-Pattern: Context Accumulation Without Pruning

Context expansion is valuable, but unbounded context accumulation degrades the loop. Each cycle should carry forward:
- Active corrections and constraints (always)
- Preference patterns (always)
- Factual context relevant to remaining issues (selectively)
- Resolved context for issues already addressed (pruned)

The Reflect phase should prune context that's no longer relevant to remaining issues.

---

## 8. Critical Second-Pass Assessment

After writing the above, I stepped back and challenged my own framing:

### Challenge 1: Is "Refine" the right name?

**Concern:** "Refine" might be too soft. It implies gentle improvement, not the aggressive, measurable, rubric-driven process the framework actually delivers.

**Counter:** The problem isn't softness — it's scope. "Refine" works for both creation ("refine these raw ideas into a spec") and improvement ("refine this README"). The rigor comes from the rubric and measurement, not the name. Users will learn that "refine" means "measurable, iterative, rubric-driven" through experience.

**Verdict:** "Refine" stands. The scope benefit outweighs the connotation cost.

### Challenge 2: Is the creation mode actually the same process as improvement?

**Concern:** The claim that "creation and improvement are the same process at different starting points" is elegant but potentially false. Creation involves scope discovery (what should exist?), while improvement involves quality assessment (how good is what exists?). These might need fundamentally different rubrics.

**Counter:** They need different rubric dimensions, not different processes. A creation rubric emphasizes completeness ("are all necessary sections present?") while an improvement rubric emphasizes quality ("is each section clear and accurate?"). The loop structure — generate concrete artifact, human reacts, extract context, iterate — is identical. The transition from expansion to refinement is when the rubric naturally shifts from completeness-weighted to quality-weighted.

**Verdict:** Same process, different rubric weighting. The rubric protocol (stakeholder analysis) will naturally produce completeness-focused dimensions for creation and quality-focused dimensions for improvement.

### Challenge 3: Is the domain adapter contract over-engineered?

**Concern:** Formalizing a contract adds complexity without clear payoff unless there are many domains.

**Counter:** Fair point. The contract is a design target, not an implementation requirement. In practice, domain templates can remain in a single file with a consistent structure. The contract defines what that structure should be, not that it needs a plugin system.

**Verdict:** Keep the contract as a specification for template structure. Do not build an actual plugin system until there are 10+ domains.

### Challenge 4: Does multi-agent deliberation justify its cost?

**Concern:** Deliberation requires 3 rounds of evaluation per proposal. For a cycle with 10 proposals, that's 30 evaluations vs. 3 for independent scoring. The cost is 10x.

**Counter:** Deliberation should be reserved for auto-approve decisions, not all proposals. If the human is reviewing anyway, independent scoring with flagged disagreements is sufficient. Deliberation only matters when the decision is "should this skip the human?" — and in that case, the extra cost is justified by the risk reduction.

**Verdict:** Deliberation is for auto-approve gates only. Use independent scoring with spread reporting for everything else.

### Challenge 5: Will the Reflect phase actually work in practice?

**Concern:** Reflect requires cross-cycle analysis of patterns, approval rates, and context accumulation. LLMs may not be reliable enough for open-ended pattern recognition across 3-4 cycles of complex data.

**Counter:** The Reflect phase should be structured, not open-ended. Instead of "analyze patterns," it should run specific checks: "Were any proposals similar to rejected proposals from prior cycles? Did the human modify proposals in a consistent direction? Which dimensions are no longer improving?" These are concrete queries against structured data, not vague pattern recognition.

**Verdict:** Make Reflect a checklist of specific cross-cycle queries, not an open-ended meta-analysis.

### Challenge 6: Is the "show, don't ask" principle always correct?

**Concern:** Highly creative work may benefit from open-ended generation, and expert users may have richer unprompted recall. The framework applies "verification > generation" universally.

**Counter:** Valid limitation. For highly creative or subjective work (visual design, naming, brand voice), the rubric-driven approach may over-constrain. However, for the domains the skill targets (documentation, code quality, structured content), the principle holds strongly.

**Verdict:** Add explicit guidance on when the framework is and isn't appropriate. Don't claim universality.

---

## 9. Implementation Path

### Phase 1: Core Loop

Build the fundamental loop from scratch:
1. Conversational entry point with intent detection
2. Rubric generation protocol (stakeholder + failure mode analysis)
3. Discover phase with multi-evaluator scoring and atomic issue decomposition
4. Analyze phase with evidence-grounded before/after proposals and budget cap
5. Verify phase with fresh-context sub-agents (isolated from Analyze reasoning)
6. Approve phase with batch and individual review
7. Apply phase with section-targeted changes and diff validation
8. Measure phase with independent re-scoring and convergence log
9. Stopping conditions with both qualitative and numeric thresholds

**Why first:** The loop is the foundation. Everything else extends it.

### Phase 2: Bootstrap / Creation Mode

1. Implement the Extract phase (interview biased toward verification)
2. Implement the Draft phase (generate first artifact from extracted context)
3. Add creation intent detection to the entry point
4. Seamless handoff from Draft to the loop

**Why second:** Highest user-impact feature. Unlocks creating from nothing.

### Phase 3: Context Expansion

1. Parse human responses in Approve for non-decision content
2. Add context annotation capture and storage
3. Integrate context annotations into Reflect and next-cycle Discover
4. Add gap-specific inquiry when the AI hedges

**Why third:** Enriches every cycle but requires the loop and extraction mechanics as a foundation.

### Phase 4: Progressive Autonomy

1. Implement the human role dial with per-cycle tracking
2. Implement Reflect as a structured checklist of cross-cycle queries
3. Add multi-agent deliberation for auto-approve decisions
4. Add graduated auto-approve rules
5. Add easy pullback to full Reviewer mode

**Why last:** Reduces human load but requires the loop to be working well first. Autonomy before quality is dangerous.

---

## 10. What This Framework Is Not

- **Not a replacement for brainstorming.** If you don't know what you want, refine can't help. It needs a direction, even a vague one.
- **Not for subjective aesthetics.** Visual design, naming preferences, brand voice — these resist rubric-driven evaluation.
- **Not a code generator.** It improves existing code and creates documents, but it doesn't architect or implement features.
- **Not magic extraction.** It's better than open-ended questions at surfacing what humans know, but it can't surface knowledge the human doesn't have.
- **Not a replacement for user research.** If the problem is "we don't know what users need," that requires research, not refinement.

---

## 11. Prior Art and Foundations

Refine builds on established research in cognitive science, human-computer interaction, and AI agent design. The individual components draw from well-studied fields — the contribution is their combination into a unified framework where the human's verification responses are the primary knowledge transfer mechanism, not a safety check.

### Cognitive Science Foundations

| Principle used | Established name | Key researchers |
|---|---|---|
| Verification is cheaper than generation | Recognition vs. recall asymmetry; generate-recognize model | Anderson & Bower (1972), Kintsch (1970), Bahrick (1970) |
| Memory retrieval requires cues | Encoding specificity principle | Tulving & Thomson (1973) |
| Wrong guesses trigger richer corrections | Hypercorrection effect | Butterfield & Metcalfe (2001), Metcalfe (2016) |
| Progressive autonomy as a dial | Adjustable/sliding autonomy; mixed-initiative interaction | Sheridan & Verplank (1978), Horvitz (1999), Parasuraman et al. (2000) |
| Concrete artifacts elicit richer feedback than questions | Prototyping for requirements elicitation; Wizard of Oz method | Kelley (1983), design thinking (IDEO/Stanford d.school) |

Nielsen's 6th usability heuristic — "Recognition rather than recall" (1994) — is the applied UX formulation of the same recognition-recall asymmetry that underpins this framework's "show, don't ask" principle.

### Related Work in AI Agent Design

Several existing systems implement subsets of this framework's architecture. Understanding where they stop clarifies what Refine adds:

**Rubric-driven iterative loops** (e.g., ARISE, GradeOpt) demonstrate that evaluate-revise-re-evaluate cycles work mechanically — scores improve across rounds, and convergence thresholds produce usable stopping points. Their limitations: fully autonomous (no human knowledge extraction), fixed rubrics (not generated per-artifact), instruction-only revision constraints (no programmatic scope validation), and pure score averaging (disagreement diluted rather than surfaced).

**LLM self-refinement** (e.g., Self-Refine, Madaan et al.) shows ~20% improvement through self-critique loops — but hits a ceiling without external grounding. The model can only improve relative to what it already knows. There's no mechanism for introducing new facts mid-loop.

**Cross-cycle reflection** (e.g., Reflexion, Shinn et al.) stores verbal self-reflection in episodic memory to improve across trials. The known risk is "degeneration of thought" — agents repeating flawed reasoning across iterations. Structured cross-cycle queries (not open-ended reflection) and human correction at each cycle mitigate this.

**Metric-driven pipeline optimization** (e.g., DSPy, TextGrad) iteratively improves LLM pipeline components using feedback as optimization signal. Domain-agnostic by design, but operates on pipeline internals (prompts, weights), not user-facing content. Optimizes toward single loss functions rather than multi-dimensional rubric scoring.

**Principle-based critique-and-revision** (e.g., Constitutional AI) is structurally identical to "score against rubric, then improve," but operates on model behavior during training rather than user content at runtime.

### Design Methodology Predecessors

Tom Chi's rapid prototyping methodology (Google X) embodies the same "show, don't ask" principle applied to physical product design: build rough prototypes fast, put them in front of users, let reactions replace specification. Design sprints (GV) formalize a one-shot version. Refine extends these from one-shot to iterative convergence, adds rubric-based measurement, and applies the pattern to AI-mediated content creation.

### What This Framework Adds

The individual components draw from existing work. No existing system combines them:

1. **The human as knowledge oracle** — existing iterative loops treat the human as a safety valve or exception handler. Refine treats verification responses as the primary knowledge transfer mechanism.
2. **Dynamic rubric generation** — existing rubric systems use fixed rubrics designed by experts. Refine generates rubrics per-artifact through stakeholder and failure-mode analysis.
3. **Fresh-context verification** — existing refinement loops share full context between generation and evaluation. Refine isolates verifiers from generators to prevent self-evaluation bias.
4. **Progressive autonomy within a single workflow** — static autonomy levels are well-studied. Dynamic trust calibration that adjusts per-cycle based on demonstrated accuracy within a single session is not implemented elsewhere.
5. **Selective deliberation** — existing systems either average everything or deliberate everything. Applying deliberation only to decisions (auto-approve gates) while using averaging for measurements is a cost-effective middle ground.

---

## 12. Summary

**Refine** is a framework for creating and improving artifacts through rubric-driven iterative loops. It exploits a fundamental asymmetry in human cognition: verification is cheap, generation is expensive. By showing concrete proposals and letting humans react, the loop progressively extracts knowledge that wasn't available at the start.

The framework's architecture separates a domain-agnostic engine (the loop, knowledge extraction, progressive autonomy) from domain-specific adapters (rubrics, pre-checks, collection methods). The same engine that creates a spec from a brain dump can improve a README, enforce consistency across error messages, or evaluate prompt engineering quality.

The core insight: **show the human something concrete and let them react. Their reactions carry more context than their instructions ever would.**
