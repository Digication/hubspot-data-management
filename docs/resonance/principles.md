# The Resonance Principles

A theory of structured information exchange between humans and AI systems.

---

## The Core Observation

Human cognition is optimized for verification, not generation. People find it easy to react to something concrete — correcting, extending, redirecting — but hard to produce a complete account of what they know from scratch. This resembles the intuition behind the P vs NP problem in computational complexity — the widely held but unproven belief that verifying a solution is easier than generating one.

This asymmetry has a profound implication for how AI systems should collaborate with humans: **the most effective way to surface what a person knows is not to ask them, but to show them something concrete and let them react.**

When the AI generates a proposal that's close to what the human knows but not quite right, the mismatch activates deep recall. The human corrects the error, and the correction carries far more information than any unprompted answer would have. The wrong answer to a specific question extracts more knowledge than the right answer to a vague one.

This is resonance: a concrete signal from the AI meets the human's latent knowledge and amplifies it. Maximum information transfer occurs not when the AI is right, but when the AI is specifically, concretely wrong — because the mismatch generates the richest response.

---

## The Five Principles

### 1. Show, Don't Ask

Every interaction with a human should present something concrete to react to. Open-ended questions ("what do you want?", "what should this include?") provide no retrieval cues and produce incomplete results. Verification prompts ("here's what I think — what's wrong?") trigger associative recall and surface knowledge the human possesses but cannot produce on demand.

| Approach | What you get |
|---|---|
| "Describe your student's analytical skills." | Partial answer, stalls after 2-3 points |
| "I've rated the student's analytical skills as 'strong' based on the dataset comparison in Section 3 — is that right?" | "That undersells it — they also identified the sampling bias, which nobody else caught" |
| "What should the onboarding guide cover?" | Partial list, stalls after 5-6 items |
| "Here's what I think the guide needs — what's missing?" | Corrections, additions, and triggered memories |
| "What else should I know?" | "Nothing" or "I think that's it" |
| "I assumed this process is straightforward — is it?" | "Actually no, there's a special case for legacy users because..." |

The principle applies at every human touchpoint: interviews should show proposed evaluations and let the interviewer correct; portfolio prompts should show draft reflections and let the student react; documentation workflows should show outlines rather than asking for specifications.

The design goal is **productive wrongness** — generating output specific enough to be meaningfully wrong, because corrections carry more context than approvals.

### 2. Iterate to Expand Context

Each cycle of interaction does two things: it improves the output, and it expands the available context. The second effect is more important than the first.

```
Cycle 1: Available context ████░░░░░░    Output quality ███░░░░░░░
Cycle 2: Available context ██████░░░░    Output quality █████░░░░░
Cycle 3: Available context ████████░░    Output quality ████████░░
Cycle 4: Available context ██████████    Output quality ██████████
```

Output quality is bounded by available context. The loop doesn't just fix issues — it progressively extracts knowledge that wasn't available at the start. Each concrete proposal is a retrieval cue that triggers the human to surface information they wouldn't have volunteered unprompted.

Context expansion happens through four mechanisms:

- **Triggered recall** — seeing a concrete proposal activates related memories. A draft performance review that says "contributed to the Q3 project" triggers the manager to recall: "actually, they led the incident response at 2am — that's the real ownership evidence."
- **Correction context** — when the human rejects or modifies a proposal, their reasoning carries new information. A student rejects a portfolio draft's claim about data cleaning and explains: "the real challenge was that the client's categories didn't match any standard classification."
- **Gap-specific inquiry** — when the AI identifies a specific gap in its own knowledge, the specificity triggers targeted retrieval. "I assumed this process is the same for all users — is it?" beats "anything else I should know?"
- **Preference patterns** — consistent human choices across cycles (always shortening, always adding caveats, always making feedback more specific) reveal unstated standards.

The anti-pattern is context accumulation without pruning. Each cycle should carry forward active corrections, constraints, and preferences, but prune context that's been resolved or incorporated.

### 3. Earn Autonomy Progressively

The human's involvement exists on a spectrum:

```
AUTHOR ←── REVIEWER ←── SUPERVISOR ←── DIRECTOR
  ↑            ↑              ↑             ↑
Creates      Reviews        Handles       Defines
from         everything     only          criteria,
scratch                     escalations   reviews final
```

Most AI workflows put the human as Author (they generate the initial specification) then Reviewer (they check everything). Resonance-based systems start the human as Reviewer and shift them toward Director as the system demonstrates alignment.

The dial position is determined by context:

| Factor | More human involvement | More autonomy |
|---|---|---|
| Iteration number | Early cycles | Later cycles |
| Domain risk | High-stakes decisions | Low-stakes refinements |
| AI confidence | Evaluators disagree | Evaluators are unanimous |
| Novelty | First time encountering this type | Similar to previously approved |
| Human expertise | Human is learning the domain | Human is the domain expert |

**Critical constraint:** Autonomy must be easily revocable. The human should always be able to pull back to full review without friction. Trust is earned per-cycle and can be withdrawn at any moment.

**Domain-dependent override:** Some domains should never advance beyond Reviewer regardless of confidence. Educational contexts (where human engagement IS the learning), high-stakes evaluations (where fairness requires human review of every decision), and situations where the human is the sole source of truth should keep the human fully engaged.

### 4. Evaluate From Multiple Perspectives

A single evaluation perspective has blind spots. Multiple perspectives catch different problems.

The distinction between **averaging** and **deliberation** matters:

- **Averaging** hides disagreement. Scores of 9, 8, and 3 average to 6.7 — "moderate confidence." The 3 represents a specific concern that was diluted.
- **Deliberation** surfaces disagreement. The perspectives examine each other's concerns, concede or defend, and produce a rationale rather than a number.

```
Round 1: Each perspective evaluates independently
Round 2: Each perspective responds to others' concerns
Round 3: Final positions — agree, concede, or maintain dissent

All agree → proceed autonomously
Disagreement → escalate with the specific point of contention
```

Use independent evaluation (with spread reporting) for measurement. Use deliberation for decisions — especially decisions about whether to proceed without human review.

The perspectives should be chosen for the domain:

| Domain | Perspectives | What each catches |
|---|---|---|
| Artifact evaluation | Devil's Advocate, Conservative, Pragmatist | Edge cases; regressions; low-value changes |
| People evaluation | Rigor, Fairness, Development | Weak evidence; bias; unhelpful feedback |
| Interview design | Signal Quality, Bias Risk, Practicality | Low-signal questions; discriminatory framing; time overruns |

### 5. Converge Toward Defined Quality

Define "done" before starting, not after. A rubric with explicit dimensions and scoring anchors transforms subjective "feels done" into objective convergence criteria.

The rubric serves three purposes:
1. **Systematic evaluation** — every dimension is checked every cycle, not just what the human happens to notice
2. **Measurable progress** — before/after scores show whether changes helped
3. **Convergence detection** — when no significant issues remain, the process is complete

Rubric construction should be rigorous:
- **Stakeholder analysis** — identify all parties affected by the output, not just the primary audience. A student portfolio has stakeholders beyond the student: the instructor evaluating it, the program assessing outcomes, and future employers reading it. An error message has the end user, the developer debugging, the ops team monitoring, and the security reviewer.
- **Failure mode analysis** — what goes wrong when the output is bad? What's the real-world consequence? A vague assessment fails the student (no actionable feedback) and the program (no evidence of learning). A misleading document fails the reader and everyone downstream.
- **Dimension selection** — 5-7 dimensions covering the concerns surfaced by stakeholder and failure mode analysis
- **Score anchors** — concrete examples of what 0/10, 5/10, and 10/10 look like for each dimension

Convergence has two phases. **Expansion** (early cycles): the output covers all relevant topics; convergence signal is that no major gaps remain. **Refinement** (later cycles): all dimensions are at acceptable quality; convergence signal is that no high-severity issues remain. The transition happens naturally as the rubric shifts from finding what's missing to finding what's weak.

The human's judgment always overrides the metrics. "Good enough" is a valid stopping condition regardless of what the scores say.

---

## The Resonance Mechanism in Detail

### Why Wrongness Is Productive

When the AI generates output that's exactly right, the human says "yes" — and no new information enters the system. When the AI generates output that's completely wrong, the human says "no" — but has no retrieval cue to explain why. When the AI generates output that's **specifically, concretely wrong in a domain the human knows**, the mismatch activates deep recall:

```
AI: "Your emphasis on active learning is demonstrated by the lab
     redesign in BIO 301."
Human: "The lab redesign is a good example, but the stronger evidence
     is the longitudinal data — students who took my redesigned BIO 301
     performed 15% better in BIO 401 the following year. I also implemented
     peer teaching in the advanced seminar."
```

The AI's incomplete claim triggered recall of stronger evidence (longitudinal data) and a second innovation (peer teaching) that the faculty member hadn't mentioned in their notes. None of this was in the original input. The wrongness was the cue.

A second example from a different domain:

```
AI: "The recovery process is straightforward — restart the service
     from the backup."
Human: "No — recovery depends on whether the keys have been rotated.
     If they have, you need to re-import the old key pair through a
     support ticket. If they haven't, you just switch back."
```

The AI's wrong assumption ("straightforward") triggered a detailed correction with two branching paths and a decision factor the human knew about but didn't think to mention upfront.

This is why drafts should be **intentionally specific rather than cautiously vague**. A vague draft ("the process should be documented") triggers a vague reaction ("yes, it should"). A specific draft ("recovery: restart from the backup") triggers a specific correction that carries real information.

### The Boundary of Productive Wrongness

Wrongness is productive only within a band. If the AI's output is so far from reality that the human can't map it to their knowledge, the mismatch doesn't trigger retrieval — it triggers confusion or dismissal. A draft assessment that evaluates a student on competencies from a completely different course, or a document that assumes a technology stack unrelated to the project, produces no useful reaction. The AI needs enough context to be *plausibly wrong*, not *wildly wrong*.

This means:
- Creation from nothing works best when the AI has background context to ground its first attempt
- Early interactions should gather enough context for subsequent proposals to land in the productive range
- For domains where the AI has no context at all, more upfront conversation is needed before concrete proposals can trigger useful resonance

### Why Iteration Compounds

Each cycle doesn't just fix issues — it increases the surface area for resonance. In cycle 1, the AI has only the human's initial input. By cycle 3, it has the initial input plus every correction, addition, preference, and factual detail surfaced across two cycles of review.

The proposals in cycle 3 are better not just because issues were fixed, but because the AI has more context to generate proposals that are *closer to right* — which means closer to the productive wrongness band, which means they trigger even more specific corrections. The loop has a compounding effect: more context leads to better proposals, which trigger richer reactions, which provide more context.

---

## Application Domains

The Resonance principles apply to any domain where:
1. A human possesses knowledge they cannot fully articulate on demand
2. An AI can generate concrete output for the human to react to
3. The quality of the output can be defined and measured
4. Iteration improves the result

The principles manifest differently in different domains:

| Domain | What resonance looks like | What the loop produces |
|---|---|---|
| **Artifact creation and improvement** | Show drafts, let the human correct. Evaluate against quality rubrics. | Documents, code, specs — improved or created from scratch |
| **Evaluation and assessment** | Show draft assessments, let the evaluator refine. Check consistency across a batch. | Fair, thorough, evidence-based evaluations |
| **Knowledge extraction** | Show structured interpretations of what the expert knows, let them correct. | Documented procedures, decision frameworks, institutional knowledge |
| **Decision support** | Show proposed decisions with rationale, let the decision-maker adjust. | Better-informed decisions with explicit reasoning |

Each domain has specific constraints (education requires preserving the human's learning process; assessment requires fairness and consistency; high-stakes decisions require full human review), but the core mechanism is the same: **show something concrete, capture the reaction, iterate.**

---

## The Hierarchy

```
Resonance Principles (this document)
  │
  ├── Refine — artifacts: creation and improvement
  │   Applies resonance to documents, code, specs, and structured content.
  │   The loop creates and improves artifacts through rubric-driven cycles.
  │
  ├── Assess — evaluation: competency, portfolios, student work
  │   Applies resonance to human evaluation processes.
  │   The loop structures assessment, ensures consistency, and produces
  │   evidence-based feedback.
  │
  └── (future siblings as the principles are validated in new domains)
```

Refine and Assess are siblings, not parent and child. They share the five principles but have different loops, different constraints, and different domain-specific machinery. Each validates and refines the principles through use.

---

## What Resonance Is Not

- **Not a replacement for human judgment.** The principles structure how humans and AI exchange information. They don't replace the human's role in deciding what matters, what's good enough, or when to stop.
- **Not universally applicable.** Highly creative work (where the goal is surprise, not convergence), real-time physical tasks, and purely subjective evaluations resist rubric-driven approaches.
- **Not a guarantee of complete extraction.** The loop surfaces more knowledge than open-ended questions, but it can't surface knowledge the human doesn't have. It improves retrieval, not creation, of human knowledge.
- **Not a fixed process.** The five principles are design guidelines, not a rigid methodology. Different domains implement them with different loops, different cadences, and different constraints.
