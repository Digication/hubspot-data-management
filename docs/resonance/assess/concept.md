# Assess: Structured Evaluation of People and Work

A domain application of the [Resonance Principles](../principles.md) for portfolio building, student work assessment, competency evaluation, interview design, and feedback quality — any process where humans evaluate human performance against defined criteria.

---

## How Assess Differs From Refine

Refine creates and improves **artifacts** — the artifact is the goal. Assess structures and improves **evaluations** — the artifact (assessment, feedback, rubric) is evidence of something deeper: learning, competency, growth, or fit.

This difference changes several framework behaviors:

| Dimension | Refine | Assess |
|---|---|---|
| **Goal** | Best possible artifact | Best possible evaluation (fair, thorough, evidence-based) |
| **Progressive autonomy** | Useful for low-risk, repetitive work | Almost always wrong — human engagement IS the goal |
| **Proposal style** | Prescriptive (here's the replacement text) | Explanatory (here's the issue and the principle behind it) |
| **Draft quality target** | Specific enough to trigger corrections | Provocatively incomplete — triggers thinking, not just correction |
| **Authenticity** | Not a dimension | Critical dimension (does this sound like the person's own voice?) |
| **Rubric source** | Usually generated or from a domain template | Often pre-existing (instructor-defined, HR-defined) |
| **Human expertise** | Usually the domain expert | Sometimes a learner, not an expert |
| **Batch consistency** | Not a concern | Critical — same rubric must produce comparable results across people |

The Resonance principles apply identically. The domain-specific machinery is different.

---

## The Core Insight for Evaluation

Evaluators — teachers, managers, interviewers — face the same generation problem as everyone else. They have rich observations from weeks or months of interaction but struggle to produce a complete, well-evidenced assessment on demand. Their knowledge is associative: they remember incidents, impressions, and patterns, but open-ended generation ("describe this person's performance") produces partial, recency-biased results.

The verification-generation asymmetry applies:

```
"Describe this student's analytical skills."
  → Partial answer, recent examples only, stalls after 2-3 points.

"I've rated Alex's analytical skills as 'Meets Expectations' based on
the Q3 project. Here's the evidence: [specific examples]. Is this
the right rating?"
  → "Actually, the Q3 project understates it — Alex also redesigned
     the data pipeline in August, which required significantly more
     complex analysis. That's 'Exceeds' behavior."
```

The concrete draft assessment triggered recall of evidence the evaluator had but didn't surface unprompted. The rating was wrong — and the wrongness was productive.

---

## Application Areas

### 1. Portfolio Building

**What the human has:** Lived experiences — internships, projects, coursework, growth moments. Rich knowledge that resists cold articulation.

**What the human needs:** Authentic reflective artifacts that demonstrate learning and competency.

**Why the standard approach fails:** "Write about what you learned during your internship" is a generation prompt. The student produces thin, generic reflection — not because they didn't learn anything, but because unprompted recall of experiential learning is hard.

**How Assess applies:**

**Extract:** Gather basic facts — role, company, timeframe, coursework. Generate a proposed outline of what the reflection might cover: skills applied, challenges faced, growth moments, connection to academic work.

**Draft:** Generate a specific first draft. The draft should be **intentionally wrong in productive ways** — it guesses specific skills, specific challenges, specific growth moments. "You applied data analysis skills from STAT 301 to a real client dataset, encountering challenges with data cleaning..."

The student reads this and reacts: "No, the real challenge wasn't data cleaning — it was that the client's data categories didn't match our model's assumptions, and I had to reclassify 200 records manually, which taught me that real data never matches textbook assumptions."

That correction IS the portfolio. It's specific, authentic, and contains genuine reflection that the student couldn't have produced from a blank page.

**Loop:** Evaluate the reflection against a rubric — Depth of Reflection, Specificity of Evidence, Connection to Learning Objectives, Authenticity of Voice, Growth Articulation. Propose improvements. The student reviews and incorporates.

**Critical constraints for portfolio building:**

1. **Voice preservation.** The final artifact must sound like the student, not like AI-generated text. Proposals should suggest what to add or develop, not provide polished replacement text. The before/after model should become before/guidance: "This paragraph states a conclusion without evidence. Consider adding a specific example of when this happened."

2. **The process is the learning.** Engaging with each proposal is where reflection happens. Auto-approve defeats the purpose. The human role dial should stay at Reviewer permanently.

3. **Productive wrongness over polished correctness.** The draft should be wrong enough to provoke genuine reaction, not so polished that the student just accepts it. A draft that says "you developed leadership skills" prompts a vague "yes." A draft that says "you led the team through the database migration by delegating the schema design to junior engineers" prompts "no — I actually did the schema design myself, and the leadership part was convincing the team to adopt the new ORM when everyone wanted to stick with raw SQL."

4. **Authenticity as a rubric dimension.** Every Discover cycle should evaluate: "Does this sound like the student's own reflection, or like generated text?" Proposals that would make the text more polished but less authentic should be flagged.

---

### 2. Student Work (Formative Feedback)

**What the student has:** Work in progress — an essay, a project, a lab report.

**What the student needs:** Feedback that helps them improve AND understand why.

**How Assess applies:**

**Rubric:** The instructor's assignment rubric, ingested rather than generated. This is a different entry path — the rubric already exists. The skill validates the rubric's structure (dimensions, anchors) and confirms with the student.

**Discover:** Evaluate the student's work against the rubric. Score each dimension. Identify issues by severity.

**Analyze — with a critical difference:** Proposals should **explain the principle, not just the fix.**

| Refine-style proposal | Assess-style proposal |
|---|---|
| "Change 'The experiment showed results' to 'The experiment demonstrated a 23% reduction in response time (p < 0.05)'" | "This paragraph states a conclusion without quantitative evidence. Strong scientific writing ties claims to specific data points. Consider: what was the measured effect, and what was the statistical significance?" |

The Refine proposal gives the answer. The Assess proposal teaches the principle and prompts the student to generate the improvement. This is pedagogically sound — the student learns more from applying the principle than from copying the fix.

**When the student can't verify:**
Unlike Refine (where the human is usually the domain expert), the student may be learning the domain. When the AI proposes "strengthen your thesis statement," the student may not know HOW. Proposals should include enough scaffolding: "A strong thesis makes a specific, debatable claim. Your current thesis ('Social media has effects on society') could become 'Social media's algorithmic content curation reduces exposure to opposing viewpoints, weakening democratic discourse.' Notice how the second version is specific enough that someone could argue against it."

**Progressive autonomy:** Should NOT advance. Every proposal is a learning opportunity. The student's engagement with each one matters.

**Batch consistency:** Not relevant for formative feedback on a single piece of work. Becomes relevant when the same rubric is used across a class (see Faculty Assessment below).

---

### 3. Student Work (Pre-Submission Check)

**What the student has:** Final work, ready to submit.

**What the student needs:** A score prediction and last-chance issue detection.

**How Assess applies:** This is closer to Refine's standard mode. Discover against the assignment rubric, show the score prediction, list issues by severity. The student decides what to address before submitting.

**Constraint:** Proposals can suggest improvements but should not provide finished text. The student must make the changes themselves — otherwise the boundary between "AI-assisted review" and "AI-authored work" dissolves.

---

### 4. Faculty Assessment of Student Work

**What the faculty member has:** A stack of 30 student submissions and a rubric.

**What the faculty member needs:** Consistent, evidence-based evaluations with actionable feedback for each student.

**How Assess applies in three layers:**

**Layer 1 — Rubric calibration (before assessing):**

The rubric generation protocol helps faculty build better rubrics. Stakeholder analysis surfaces: the student receiving feedback, the program assessing learning outcomes, external accreditors, the faculty member (will this rubric be efficient to apply 30 times?).

Failure mode analysis catches: a dimension that's ambiguous at the boundary between two rating levels, a dimension that inadvertently penalizes certain writing styles, a dimension that's impossible to evaluate without domain expertise the student doesn't have yet.

**Layer 2 — Assessment production (per student):**

The faculty member reviews the student's work and has impressions, mental notes, and a gut sense of the grade. Turning this into a structured evaluation with specific evidence is a generation task.

Bootstrap: Faculty provides brief notes ("strong analysis, weak methodology section, good use of sources but conclusions overreach"). Assess generates a structured evaluation against the rubric with specific evidence pulled from the student's work.

The faculty member reviews and corrects. During this review, resonance activates: "The draft evaluation says 'demonstrates basic analytical skill' — actually, the student's comparison of the two datasets in Section 3 was quite sophisticated for this level. I'd rate that higher." The concrete draft triggered recall of a specific strength the faculty member knew about but didn't mention in their notes.

**Layer 3 — Batch consistency (across all students):**

After assessing all 30 students, run a consistency check across all evaluations against the same rubric.

- Flag scoring drift: "You scored Student A's methodology at 7/10 in the first batch but scored similar quality at 5/10 in the last batch. Are these intentionally different?"
- Flag evidence gaps: "Your evaluation of Student B references their 'strong conclusion' but doesn't cite specific text. The evaluations of Students A and C both include specific quotes."
- Flag dimension neglect: "12 of 30 evaluations don't address the 'Original Contribution' dimension."
- Flag inconsistent application: "Students D and E have nearly identical approaches to the analysis, but received scores 2 points apart on Analytical Rigor."

This is not grading the grading — it's calibration. The faculty member makes all final decisions. The system surfaces inconsistencies for review.

**Progressive autonomy:** Should NOT advance beyond Reviewer for assessment production. Each student deserves individually considered evaluation. CAN advance for the consistency check layer (auto-flagging inconsistencies is a mechanical task).

---

### 5. Competency Assessment

**What the manager has:** Months of observations about a direct report's performance. Impressions, memories of specific incidents, a general sense of strengths and growth areas.

**What the manager needs:** A structured evaluation against a competency framework with specific evidence.

**Why the standard approach fails:** "Write Alex's performance review" is a generation prompt. The manager produces recency-biased highlights and struggles to evidence their ratings. The review reads as vague praise or vague concern.

**How Assess applies:**

**Competency framework as rubric:** The organization's competency framework IS the rubric. Dimensions might be: Technical Excellence, Collaboration, Ownership, Communication, Mentoring. Each has level-specific anchors (what does "Meets Expectations" at Senior level look like vs. Staff level?).

**Bootstrap:** Manager provides notes ("strong on technical work, struggled with cross-team alignment on the Q3 project, mentored two juniors well"). Assess generates a structured evaluation.

**Resonance in action:**

The draft says: "Alex demonstrates Senior-level Technical Excellence based on the billing migration project."

The manager reacts: "The billing migration is a good example, but the more impressive thing was how Alex identified the N+1 query problem that had been degrading performance for months. Nobody else caught it, and the fix improved p99 latency by 40%."

The draft triggered recall of a specific incident the manager knew about but didn't include in their notes. Now it's in the evaluation with specific evidence.

**Recency bias mitigation:** The draft should reference work across the entire review period, not just recent months. When the manager's notes cluster in the last quarter, Assess should ask: "Your notes focus on Q3-Q4 work. What about Q1-Q2 — were there notable contributions or challenges in the first half of the period?" This is a gap-specific inquiry that triggers recall of earlier work.

**Batch consistency:** Same rubric applied across all reports. Consistency check surfaces: scoring drift (first reviews vs. last reviews), evidence density variation (some reviews with specific quotes, others with general impressions), dimension coverage (did every review address every competency?).

---

### 6. Interview Design

**What the hiring manager has:** A job description and a sense of what makes someone succeed in this role.

**What the hiring manager needs:** A structured interview plan that reliably differentiates candidates on the competencies that matter.

**How Assess applies:**

**Extract:** "You're hiring for senior backend engineer. Based on the job description, here's what I think you need to assess: system design, debugging production issues, API design, collaboration, ownership. What's missing?"

The hiring manager corrects: "The real differentiator isn't general system design — it's designing for our specific constraints: high write volume, eventually consistent data, and external partners who can't handle breaking changes. Also, our last hire was technically strong but couldn't navigate the politics of API deprecation with partners."

**Draft:** Generate specific interview questions with scoring anchors, time estimates, and descriptions of strong vs. weak answers. Include follow-up trees: "If the candidate demonstrates strong system design, probe for the partner management angle."

**Rubric dimensions for the interview plan itself** (not for the candidate): Signal Quality (does each question differentiate?), Bias Risk (does any question favor a specific background?), Coverage (do the questions together cover all competencies?), Practicality (can this be completed in the allotted time?), Legal Compliance (no protected categories?).

**Multi-perspective verification:** Devil's Advocate checks for bias ("this system design question assumes AWS experience"). Conservative checks for legal risk. Pragmatist checks signal-to-noise ("will you actually learn something from this question that you can't learn from the resume?").

**Context expansion during review:** The hiring manager reviews the proposed questions and remembers: "For the deprecation question, make sure to include a scenario where the partner pushes back hard. Our last hire folded in that situation and agreed to maintain the old API indefinitely." This is exactly the kind of operational detail that doesn't appear in job descriptions but determines success.

---

### 7. Interview Evaluation

**What the interviewer has:** Notes from a 45-minute conversation, impressions, and a gut feeling.

**What the interviewer needs:** A structured evaluation against the competency framework that other interviewers will compare against.

**How Assess applies:**

**Bootstrap:** Interviewer provides raw notes ("good on system design, hesitated on the deprecation scenario, asked smart clarifying questions, didn't demonstrate production debugging experience").

**Draft:** Generates a structured evaluation per competency:
```
System Design: Strong (7/10)
  Evidence: Correctly identified the bottleneck in the architecture scenario.
  Proactively raised failure modes before being asked.
  
Stakeholder Management: Needs Development (4/10)
  Evidence: When presented with the partner pushback scenario, proposed
  maintaining both APIs indefinitely rather than negotiating a deprecation
  timeline.
```

**Resonance activation:** The interviewer reviews the structured evaluation. "The system design rating is right, but the evidence undersells it — what was impressive was that they brought up connection pooling as the first thing to check, which shows production experience. And for stakeholder management, it wasn't that they couldn't negotiate — they asked good questions about the partner's constraints. The issue was specifically that they didn't propose a compromise with a timeline."

The draft's structured format triggered the interviewer to provide richer, more specific evidence than their raw notes contained.

**Cross-interviewer consistency:** When multiple interviewers assess the same candidate, their evaluations (all produced through this process) are structurally comparable — same competencies, same rating scale, same evidence format. The debrief becomes productive: "We both rated system design at 7, but our evidence is different — let's discuss."

---

### 8. Feedback Writing

**What the person has:** Observations about a colleague, report, or student that they want to convert into useful feedback.

**What the person needs:** Specific, actionable, evidence-based feedback.

**How Assess applies:**

**Bootstrap:** Person provides notes. Draft generates structured feedback.

**Rubric for feedback quality:** Specificity (are concrete examples cited?), Actionability (does the feedback suggest what to do differently?), Balance (is there a mix of strengths and growth areas?), Evidence-Based (does each point reference a specific observation?), Tone (constructive and respectful?).

**The verification principle applied to feedback:** "Your feedback says 'improve communication.' Here's a more specific version: 'In the Q3 planning meeting, your proposal was technically sound but you presented it as a conclusion rather than opening it for discussion, which caused pushback from the design team. Consider framing proposals as questions: what if we tried X?' Is this what you meant?"

The person reacts: "Yes, and it happened again in the retro last week — they proposed a process change without asking if anyone had tried it before. The pattern is making assertions where they should be asking questions."

The specific feedback draft triggered recall of a second instance the person hadn't planned to mention. Now the feedback has two examples and an identified pattern, which is far more useful than "improve communication."

---

## Pedagogical Constraints

These apply to all educational use cases (portfolio building, student work, formative feedback):

### 1. Explain, Don't Replace

Proposals should teach principles, not provide finished text. The goal is the student's learning, not the artifact's quality.

```
Wrong: "Change 'The results were good' to 'The experiment demonstrated
a 23% reduction in response time (p < 0.05, n=150).'"

Right: "This paragraph claims results were 'good' without defining what
good means. In empirical writing, tie conclusions to specific measurements.
What was the actual effect size, and was it statistically significant?"
```

### 2. Preserve Voice

The final artifact must sound like the student. Proposals that would make text more polished but less authentic should be flagged. Authenticity is a rubric dimension in every educational context.

### 3. No Auto-Approve

Every proposal is a learning opportunity. Progressive autonomy defeats the purpose. The human role dial stays at Reviewer.

### 4. Productive Wrongness Over Polished Drafts

Drafts should provoke reaction, not acceptance. A draft that's "too good" short-circuits the learning process. The student should disagree with the draft and produce their own version — that's the pedagogical outcome.

### 5. Scaffolding for Novice Evaluators

When the human is learning the domain (not an expert), proposals need more explanation. "Strengthen your thesis" means nothing to a student who doesn't know what a thesis is. Include the principle, an example, and enough scaffolding for the student to apply it.

---

## Assessment Consistency Model

For any use case where the same rubric is applied across multiple people or submissions:

### Drift Detection

Score distributions should be examined across the batch. Flag when:
- Average scores shift over time (assessor fatigue)
- Score variance changes (early assessments more variable, later ones compressed)
- Specific dimensions are scored inconsistently for similar work

### Evidence Density

Every rating should be backed by evidence of similar specificity. Flag when:
- Some assessments cite specific text and others give general impressions
- Evidence length varies dramatically across assessments
- Dimensions are rated without any cited evidence

### Comparative Fairness

When two pieces of work are substantively similar but scored differently, surface the discrepancy for review. The assessor makes the final call — the system only ensures they've seen the comparison.

### Calibration Sessions

Before a batch assessment, run the rubric against 2-3 sample submissions to calibrate expectations. This is adversarial validation — a step in the rubric generation protocol (see Refine concept, Step 4) — applied to the assessment context: does the rubric reliably distinguish quality levels?

---

## What Assess Is Not

- **Not automated grading.** The system structures and supports evaluation — it doesn't replace the evaluator. Every score, every piece of feedback, every decision is ultimately the human's.
- **Not surveillance.** In competency assessment and feedback writing, the system processes what the evaluator volunteers. It doesn't independently observe or monitor the person being evaluated.
- **Not a replacement for human judgment on fit, potential, or character.** The system can structure assessment of defined competencies. It cannot assess "would this person thrive here?" or "is this student reaching their potential?" — those require irreducibly human judgment.
- **Not a shortcut for students.** In portfolio building and student work, the system scaffolds the student's thinking. It does not produce the student's work. Voice preservation, authenticity checking, and the "explain, don't replace" constraint ensure the output is the student's, not the system's.
