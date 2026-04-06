# Assess: Use Cases

Concrete scenarios showing how Assess applies to evaluation of people and work. Each includes a walkthrough, rubric sketch, and notes on pedagogical and fairness constraints.

---

## Portfolio Building

### Student Reflects on an Internship

**Scenario:** A junior studying data science completed a summer internship at a consulting firm. They need to create a portfolio reflection for their capstone course.

**Entry:** "Help me write my portfolio reflection for my internship."

**Extract:**
- Student provides: company name, role (data analyst intern), timeframe (12 weeks), relevant courses (STAT 301, CS 220)
- Assess generates a proposed outline: skills applied, challenges faced, growth moments, connection to coursework, what you'd do differently

**Draft — intentionally wrong in specific ways:**

> During your internship at [firm], you applied statistical modeling techniques from STAT 301 to client datasets. Your primary challenge was data cleaning — reconciling inconsistent formats across multiple data sources. This experience reinforced the importance of data preprocessing, a topic covered extensively in CS 220.

The student reads this and reacts:

"No — the data cleaning wasn't the hard part. The real challenge was that the client's industry categories didn't match any standard classification system. Our models assumed SIC codes, but the client used their own internal categories that overlapped in weird ways. I had to build a mapping table manually by reading their category descriptions and matching them to the closest SIC codes. That's when I realized that the 'data preparation' step in STAT 301 was like 3% of the actual work in real projects."

**What happened:** The draft's wrong assumption (that data cleaning was the challenge) triggered recall of the actual challenge, which was far more specific and reflective. The student's correction contains:
- A concrete technical detail (SIC code mapping)
- A genuine insight (data prep in class vs. reality)
- Authentic voice (frustration with the gap between coursework and practice)

None of this would have emerged from "write about what you learned."

**Cycle 1:**
- Rubric: Depth of Reflection (3/10), Specificity of Evidence (4/10), Connection to Learning Objectives (5/10), Authenticity of Voice (7/10 — correction was authentic), Growth Articulation (3/10)
- Proposals: deepen the SIC mapping story, connect the "3% of actual work" insight to a learning objective, add what you'd do differently, add a second example from a different part of the internship
- Proposals are explanatory: "Your reflection identifies that real data prep is harder than classroom data prep, but doesn't explain what this taught you about your own skills. Consider: did this change how you approach new datasets? What would you do differently in your next role?"
- Student reviews each proposal, incorporates some, pushes back on others

**Cycle 2:**
- During review, the student remembers: "Oh — and at the end, the partner asked me to present my mapping methodology to the client, which was terrifying because I'd never presented to a non-technical audience. That's probably the biggest growth moment."
- Triggered recall: the concrete proposal about growth articulation activated a memory of the presentation experience

**Cycle 3:** Refinement. Voice check: does this still sound like the student? Convergence.

**Final artifact:** A reflective piece in the student's own voice, with specific examples, genuine insights, and clear connections to learning objectives. The student engaged with every proposal and made their own decisions throughout.

---

### Faculty Member Builds a Teaching Portfolio

**Scenario:** Professor preparing for tenure review. Needs to document teaching philosophy, evidence of student learning, and pedagogical innovation.

**Extract:** Teaching areas, courses taught, student evaluation scores, any innovations.

**Draft:** Generates a teaching narrative connecting philosophy to evidence. Makes specific claims: "Your emphasis on active learning is demonstrated by the lab redesign in BIO 301."

**Resonance:** Faculty reacts: "The lab redesign is a good example, but the stronger evidence is the longitudinal data — students who took my redesigned BIO 301 performed 15% better in BIO 401 the following year. I also implemented peer teaching in the advanced seminar, and the students' end-of-term reflections showed they understood the material more deeply than in previous years."

**What happened:** The specific (incomplete) claim about the lab redesign triggered recall of stronger evidence (longitudinal data) and a second innovation (peer teaching) that the faculty member hadn't mentioned in their notes.

---

## Student Work Assessment

### Formative Feedback on a Research Paper Draft

**Scenario:** Undergraduate submits a draft literature review for an advanced sociology course. The paper exists but needs significant improvement before final submission.

**Rubric:** Instructor-defined (ingested, not generated):
- Thesis Clarity (0-10)
- Source Integration (0-10)
- Analytical Depth (0-10)
- Argument Structure (0-10)
- Academic Voice (0-10)

**Discover:** Baseline 4.8/10. Key issues: thesis is vague, sources are summarized but not synthesized, argument follows a source-by-source structure rather than a thematic one.

**Analyze — explanatory proposals:**

| Issue | Refine-style (wrong for education) | Assess-style (correct) |
|---|---|---|
| Vague thesis | "Change 'Social media affects politics' to 'Algorithmic content curation on social media platforms reduces exposure to opposing viewpoints, weakening democratic discourse.'" | "Your thesis claims social media 'affects' politics, but doesn't specify how or why. A strong thesis makes a claim specific enough that someone could argue against it. What specific mechanism are you arguing about — addiction? polarization? information access? misinformation? Try narrowing to one mechanism and stating your position on it." |
| Source-by-source structure | (rewrite the outline) | "Your paper currently discusses one source per paragraph. This structure summarizes rather than synthesizes. Consider reorganizing by theme: what are the 3-4 main arguments in the literature, and which sources support or challenge each one? That way, multiple sources appear in each section, in conversation with each other." |

**Cycle 1:**
- Student reviews proposals, attempts to strengthen thesis: "Algorithmic content curation creates filter bubbles that reduce political polarization awareness."
- Assess evaluates the revision: "This is more specific — you've identified a mechanism (filter bubbles) and a consequence (reduced awareness). But 'political polarization awareness' is ambiguous. Are you arguing that people become less aware that polarization exists? Or less exposed to the other side's views? These are different claims."
- Student revises again — each round pushes toward greater precision

**Key dynamic:** The student is doing the intellectual work. Assess identifies where the thinking is fuzzy and asks questions that force clarity. It does NOT provide the answer.

**Cycle 2:**
- Source integration improving — student has reorganized by theme
- New issue surfaced: two sources contradict each other and the student ignored the contradiction
- Proposal: "Smith (2019) argues filter bubbles are overstated, while Jones (2021) presents them as the dominant factor. You've cited both but haven't addressed the disagreement. What's your position — does the more recent evidence resolve the dispute, or is it genuinely unsettled?"

**Cycle 3:** Quality refinement. Academic voice issues (informal language in key sections). Convergence at 7.8/10.

**What this exercises:** The full pedagogical constraint set — explanatory proposals, voice preservation, student does the writing, no auto-approve.

---

### Pre-Submission Quality Check

**Scenario:** Student has finished their essay and wants a rubric-based review before submitting.

**Entry:** "Check my essay against the rubric before I submit."

**Discover:** Score prediction against the assignment rubric. Issues ranked by severity.

**Output:**
```
Score prediction: 7.2/10

Issues found:
- [HIGH] Thesis is not clearly stated until paragraph 3. Consider moving
  your core argument to the introduction.
- [MEDIUM] Section 4 introduces a new concept (network effects) that
  isn't connected to your thesis. Either connect it or remove it.
- [LOW] Three instances of informal language ("kind of", "a lot",
  "pretty much").
- [LOW] Reference list has inconsistent formatting (APA in-text but
  MLA bibliography).

Strongest dimensions: Analytical Depth (8/10), Source Integration (7/10)
Weakest dimensions: Argument Structure (6/10), Academic Voice (6/10)
```

The student decides what to address. No replacement text provided — only identification and principles.

---

## Faculty Assessing Student Work

### Grading 30 Portfolios With Consistency

**Scenario:** Faculty member assessing 30 student portfolios for a capstone course. Each portfolio contains 3-5 reflective artifacts.

**Layer 1 — Rubric calibration:**

Before assessing, run the rubric through the generation protocol to stress-test it:

- Stakeholder analysis: student (receiving feedback), program (assessing outcomes), accreditor (evidence of competency), faculty (efficient to use 30 times)
- Failure mode analysis: "What goes wrong when this rubric is applied badly?"
  - Depth of Reflection: scoring is ambiguous between 6 and 7 — what's the concrete difference?
  - Connection to Learning Objectives: students who took different course sequences may connect to different objectives — is this penalized?
  - Growth Articulation: students from privileged backgrounds may describe "growth" more fluently without having grown more — does the rubric account for this?

Faculty reviews and adjusts: "Good catch on the course sequence issue. Let me add an anchor: any course in the program is valid, not just the ones I listed."

**Calibration run:** Score 3 sample portfolios to set expectations. Assess flags: "You scored Sample A at 6/10 on Growth Articulation and Sample B at 7/10, but Sample A provides more specific evidence of change. Can you clarify what distinguishes these?"

Faculty calibrates: "Sample B shows awareness of the growth even though the evidence is less specific. I'm valuing metacognitive awareness over raw evidence. Let me update the anchors."

**Layer 2 — Assessment production (per student):**

Faculty reads Student 1's portfolio. Notes: "Strong reflections, good use of examples, but the connection to coursework feels forced in two places."

**Bootstrap:** Assess generates a structured evaluation:
```
Depth of Reflection: 7/10
  Evidence: The internship reflection demonstrates genuine insight about
  the gap between classroom data prep and industry practice.
  
Connection to Learning Objectives: 5/10
  Evidence: Two connections feel forced — the link between the group project
  and LO3 (ethical reasoning) is stated but not developed.
```

Faculty reviews: "The depth rating is right, but I'd add that the ethical reasoning connection isn't forced — the student is referencing when their team had to decide whether to include outlier data that would make their client look bad. That IS ethical reasoning, they just didn't label it clearly."

**Context captured:** The "forced" connection was actually a genuine example that the student expressed poorly. The draft's low rating on Connection triggered the faculty member to look more closely and find the real evidence.

**Layer 3 — Batch consistency:**

After all 30 assessments:
```
Consistency check:
- Scoring drift detected: average scores decreased from 7.1 (first 10)
  to 6.3 (last 10). Are later portfolios genuinely weaker, or are you
  scoring more strictly?
  
- Evidence density: Students 1-15 have 3+ specific quotes per evaluation.
  Students 16-30 average 1.5. Consider reviewing the later assessments
  for missing evidence.

- Dimension coverage: 8 of 30 evaluations don't address Growth
  Articulation. These 8 students may not receive feedback on this
  dimension.

- Comparative flag: Students 12 and 23 have structurally similar
  reflections on their internship experiences but received scores
  2 points apart on Depth. Worth reviewing together.
```

Faculty reviews each flag and makes final decisions. Some scores are adjusted; others are intentionally different ("Student 23's reflection covers the same ground but lacks the metacognitive layer that Student 12 demonstrates in paragraph 3").

---

## Competency Assessment

### Annual Performance Review

**Scenario:** Engineering manager writing performance reviews for 6 direct reports.

**Competency framework (the rubric):** Technical Excellence, Collaboration, Ownership, Communication, Mentoring. Each has level-specific anchors (Senior vs. Staff expectations differ).

**Per-report process:**

Manager's notes on Alex: "Solid year. Owned the billing migration. Helped two juniors. The Q3 cross-team project was rocky — alignment with the platform team took forever."

**Draft evaluation:**
```
Technical Excellence: Meets Expectations (Senior level)
  Evidence: Led the billing migration project. Codebase is well-structured
  and test coverage increased from 60% to 85%.

Collaboration: Meets Expectations
  Evidence: Participated in cross-team alignment on the Q3 platform project.

Ownership: Exceeds Expectations
  Evidence: Took full ownership of the billing migration from design through
  deployment.

Communication: Meets Expectations
  Evidence: Regular updates to stakeholders during the migration.

Mentoring: Meets Expectations
  Evidence: Supported two junior engineers during the period.
```

**Resonance activation — correction by correction:**

Manager reviews Technical Excellence: "Meets is right, but the evidence misses the best part — Alex found an N+1 query that had been degrading performance for 6 months. Nobody else caught it. The fix improved p99 latency by 40%. That's more than 'meets' on technical work."

Manager reviews Collaboration: "The Q3 project wasn't just 'rocky alignment' — the platform team wanted to deprecate an API that Alex's team depended on. Alex proposed a migration path with a 6-month sunset, but the platform team wanted 2 months. Alex escalated to the VP, which was the right call but created friction. This is actually the most important piece of feedback — Alex needs to learn to negotiate timelines before escalating."

Manager reviews Mentoring: "I said 'supported' but what actually happened was more significant. One of the juniors was struggling with the ORM migration and Alex pair-programmed with them for two full days. The junior said it was the most useful learning experience they'd had. That's 'Exceeds' behavior."

**What happened:** Each draft rating — especially the vague ones — triggered the manager to provide specific evidence and reconsider ratings. Three of five competency ratings changed during review. The final evaluation is dramatically more specific and more accurate than the original notes suggested.

**Recency bias check:** "Your notes and evidence cluster in Q3-Q4. Were there notable contributions or challenges in Q1-Q2?"

Manager: "Actually, Q1 had the incident where the billing service went down at 2am and Alex coordinated the response. That's Ownership evidence I should include."

**Batch consistency (across 6 reports):**
```
Consistency check:
- Alex and Jordan both led major projects, but Alex received "Exceeds" on
  Ownership and Jordan received "Meets." Is this intentional?
  
- Communication scores are uniformly "Meets" across all 6 reports. Either
  everyone truly meets expectations, or the dimension isn't being evaluated
  with enough granularity.

- Evidence depth varies: Alex's review has 5 specific incidents. Sam's has
  2. Consider whether Sam's review has enough evidence to support its ratings.
```

---

## Interview Design

### Designing a Senior Backend Interview

**Scenario:** Hiring for a senior backend engineer who will own the API layer.

**Extract:**
- Job description analyzed: system design, API versioning, production debugging
- Hiring manager adds: "The real differentiator isn't general system design — it's designing for our constraints: high write volume, eventually consistent data, partners who can't handle breaking changes. Our last hire was technically strong but couldn't navigate deprecation politics with partners."

**Draft interview plan:**
```
Section 1: System Design (25 min)
  Scenario: Present an architecture handling 50K writes/sec with eventual
  consistency. Introduce a latency spike. Ask where they'd investigate.
  
  Strong answer: Starts with infrastructure (connection pool, queue backpressure)
  then moves to application logic. Proactively raises failure modes.
  
  Follow-up: "The latency is in application code. Infrastructure is fine. Now what?"
  
  Anchors: 7+ mentions profiling, N+1 patterns, caching invalidation.
           4-6 stays at infrastructure level only.
           <4 struggles with the scenario.

Section 2: API Versioning & Partner Management (20 min)
  Scenario: You need to deprecate an endpoint that 3 external partners depend on.
  One partner says they need 12 months. Your team says the maintenance cost is
  unsustainable past 3 months. What do you propose?
  
  Strong answer: Proposes a compromise (6-month sunset with a migration SDK,
  or a compatibility adapter). Asks about the partner's constraints before
  proposing a solution.
  
  Follow-up: "The partner pushes back hard. They say 6 months isn't enough
  and they'll escalate to your VP. What do you do?"

Section 3: Production Debugging (15 min)
  [...]

Section 4: Collaboration & Ownership (15 min)
  [...]
```

**Multi-perspective verification:**
- Devil's Advocate: "The system design scenario assumes experience with high-write-volume systems. Candidates from read-heavy domains (CDN, search) may underperform on the scenario but be equally capable. Consider an alternative scenario."
- Conservative: "The partner management follow-up ('they'll escalate to your VP') is adversarial. Some candidates may interpret this as confrontational rather than a test of conflict resolution. Soften the framing."
- Pragmatist: "Four sections in 75 minutes is tight. The API versioning section could easily run long if the candidate is engaged. Build in a 5-minute buffer."

**Hiring manager review:** Approves with modifications. During review, remembers: "For the debugging section, make sure the scenario includes a monitoring gap — our observability has blind spots and the candidate needs to handle that, not assume perfect telemetry." Context captured for next revision.

---

## Interview Evaluation

### Post-Interview Structured Write-Up

**Scenario:** After a 45-minute interview for the senior backend role, the interviewer has notes and impressions.

**Interviewer's raw notes:** "Good on system design. Hesitated on the deprecation scenario — proposed maintaining both APIs rather than negotiating. Asked smart clarifying questions. Didn't demonstrate production debugging experience."

**Draft evaluation against competency framework:**
```
System Design: Strong (7/10)
  Evidence: Correctly identified connection pool exhaustion as the first
  check. Proactively raised failure modes (circuit breaker, queue backpressure).
  
Partner Management: Needs Development (4/10)
  Evidence: Proposed maintaining both APIs indefinitely rather than negotiating
  a deprecation timeline. Did not ask about the partner's constraints.

Production Debugging: Insufficient Evidence (3/10)
  Evidence: When presented with the monitoring gap scenario, proposed adding
  more logging rather than working with available signals. Did not mention
  profiling or flame graphs.

Collaboration: Moderate (6/10)
  Evidence: Asked clarifying questions throughout, indicating collaborative
  instinct. However, responses were individual-contributor focused — didn't
  describe working with others on any problem.
```

**Interviewer's corrections:**

"System design should be higher — 8/10. What impressed me wasn't just that they found the connection pool issue, it's that they walked through their reasoning process out loud and corrected themselves twice. That's how senior engineers actually debug.

Partner management — the rating is right but the evidence is wrong. They DID ask about the partner's constraints — I forgot to write that down. But after learning the constraints, they still proposed maintaining both APIs. The issue isn't that they didn't listen, it's that they defaulted to avoiding conflict.

Production debugging — I didn't actually get to the monitoring gap scenario. We ran out of time on the partner management section. Score should be 'Not Assessed,' not 3/10.

Add: they mentioned they built a custom APM dashboard at their current company. I didn't note it but it's relevant to the debugging competency."

**What happened:** The structured draft surfaced four corrections:
1. A higher rating with richer evidence (system design)
2. A factual error in the evidence (partner management — the candidate DID ask about constraints)
3. A scoring error (debugging scored rather than marked Not Assessed)
4. Additional evidence recalled from the conversation (custom APM dashboard)

**Cross-interviewer comparison:**
When 4 interviewers produce structured evaluations for the same candidate, the debrief has a common format. Discrepancies are immediately visible: "Interviewer A rated collaboration at 8/10 based on pair debugging behavior. Interviewer B rated it at 5/10 based on individual-contributor framing. These are different observations, not a disagreement — the candidate collaborates well on technical tasks but frames problems individually."

---

## Feedback Writing

### Manager-to-Report Feedback

**Scenario:** Manager wants to give feedback on a pattern they've noticed: a senior engineer who makes technically correct proposals but alienates colleagues by presenting conclusions instead of opening discussions.

**Manager's notes:** "Taylor presents ideas as decisions, not proposals. The Q3 planning meeting and last week's retro both went sideways because of this."

**Draft feedback:**
> In recent meetings, I've noticed a pattern in how you present technical proposals. In the Q3 planning meeting, you recommended migrating to a new caching layer and presented it as a conclusion — "we should use Redis Cluster" — rather than opening it for discussion. This caused pushback from the team, not because the idea was wrong (it wasn't), but because people felt the decision was already made before they could weigh in.

**Manager's correction:** "That's accurate, and it also happened in the retrospective last week — Taylor proposed a new incident response process without asking if anyone had tried it before. The pattern is making assertions where they should be asking questions. But I want to be clear that the technical judgment is strong — the problem is delivery, not substance."

**Revised feedback incorporates:** Two specific examples (not one), an identified pattern ("assertions where questions would work better"), and an explicit acknowledgment of technical strength.

**Rubric check on the feedback itself:**
- Specificity: 8/10 — two concrete examples with dates
- Actionability: 7/10 — identifies the pattern but could suggest a specific alternative behavior
- Balance: 6/10 — acknowledges strength but could develop it more
- Evidence-Based: 9/10 — both examples are verifiable
- Tone: 8/10 — constructive, focused on behavior not character

**Proposal:** "Consider adding a concrete suggestion for what 'asking questions' looks like in practice. For example: 'Try opening with your reasoning and a question: I've been thinking about Redis Cluster for the caching layer because of X and Y — what am I missing? This invites the same technical discussion but positions it as collaborative.'"

Manager approves and adds the suggestion.

---

### Peer Feedback Scaffolding

**Scenario:** Students reviewing each other's work in a workshop. The peer reviews are shallow — "good job" and "I liked your analysis."

**How Assess helps the reviewer produce better feedback:**

Student's draft review: "Good paper. I liked the analysis in section 3. The conclusion could be stronger."

**Assess scaffolds:**

"Your review says 'good analysis in section 3.' Can you be more specific about what was good? Here are some observations I noticed about section 3:
- The comparison of two datasets uses a consistent methodology
- The author identifies a limitation (sample size) proactively
- The statistical tests are appropriate for the data type

Which of these match what you noticed? Or was it something else?"

Student responds: "The consistent methodology — I noticed they used the same statistical test on both datasets, which made the comparison fair. In my own paper I used different tests and I'm now wondering if that weakened my analysis."

**What happened:** The specific observations triggered the reviewer to articulate what "good" meant AND to reflect on their own work. The peer review went from "good analysis" to specific praise with a self-reflective comparison — which is exactly the pedagogical outcome peer review is supposed to produce.

---

## Constraint Summary

| Constraint | Where it applies | Why |
|---|---|---|
| Explain, don't replace | All student-facing scenarios | The student's learning > the artifact's quality |
| Preserve voice | Portfolio building, student work | Authenticity is a core educational value |
| No auto-approve | All educational scenarios | Human engagement IS the goal |
| Productive wrongness | Portfolio drafts, assessment drafts | Corrections carry more learning than approvals |
| Batch consistency | Faculty assessment, competency review | Fairness requires comparable evaluation |
| Recency bias mitigation | Competency assessment | Evaluators naturally overweight recent events |
| Scaffolding for novices | Student work, peer review | The human may not have expertise to verify technical proposals |
| Not automated grading | All faculty scenarios | The system supports the evaluator; it doesn't replace them |
