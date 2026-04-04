# Rubric Generation Protocol

A structured 4-step process for creating evaluation rubrics that systematically avoid blind spots. Use this when creating rubrics for new domains or auditing existing ones.

## Why This Exists

Hand-crafted rubrics tend to reflect the author's perspective — typically the end user's. This causes blind spots: a rubric for error messages might check "is it clear?" but miss "does it include the value that failed?" or "is it safe to log?"

This protocol forces rubric authors to consider **all stakeholders** and **all failure modes** before selecting dimensions.

## The Protocol

### Step 1: Stakeholder Analysis

Ask: **Who are all the people who encounter this output, and what do they need from it?**

Build a table:

| Stakeholder | What they need | Example concern |
|---|---|---|
| [who] | [their need] | [specific thing they'd check] |

**Minimum 4 stakeholders.** If you can only think of 2-3, you're missing perspectives. Common stakeholders to consider:

- **End user** — understands what happened, knows what to do
- **Developer debugging** — sees the actual values, identifies the code path
- **Ops/monitoring** — can filter logs, aggregate by type, set alerts
- **Security reviewer** — no sensitive data leaked, no information disclosure
- **QA/tester** — can reproduce the issue from the output alone
- **i18n/localization team** — text can be translated, values are parameterized
- **Designer/brand** — consistent voice, appropriate tone for context
- **Legal/compliance** — meets regulatory requirements (GDPR, CAN-SPAM, WCAG)
- **Accessibility user** — screen reader announces meaningful content
- **API consumer** — machine-readable, parseable, documented error codes

Not every stakeholder applies to every domain. Pick the ones that matter.

### Step 2: Failure Mode Analysis

Ask: **What goes wrong when this output is bad? What's the real-world consequence?**

For each stakeholder need from Step 1, identify the failure:

| Bad output example | Consequence | Severity | Implied dimension |
|---|---|---|---|
| [what the bad version looks like] | [what happens in the real world] | HIGH/MED/LOW | [what rubric dimension would catch this] |

**Focus on HIGH and MEDIUM severity failures.** These become your required dimensions. LOW severity failures are nice-to-have.

### Step 3: Dimension Selection

From Steps 1-2, you'll have a list of candidate dimensions. Select **5-7 dimensions** for the rubric.

**Why 5-7?**
- Fewer than 5: likely missing stakeholder perspectives (the problem we're solving)
- More than 7: scoring becomes unreliable — evaluators lose consistency
- Sweet spot: 5-6 core dimensions + 1 domain-specific dimension

**For each dimension, define:**

1. **Name** — short, noun-based (e.g., "Runtime Context" not "Does it include runtime values?")
2. **Definition** — one sentence explaining what this measures
3. **Score anchors:**
   - **0/10**: What does total failure look like?
   - **5/10**: What does mediocre look like?
   - **10/10**: What does excellent look like?
4. **One before/after example** — concrete, from the target domain

**Template:**
```
**[Dimension Name]** (0-10): [One-sentence definition]
- 0: [example of total failure]
- 5: [example of mediocre]
- 10: [example of excellent]
- Example: "[before]" → "[after]"
```

### Step 4: Adversarial Validation

Test the rubric before using it in production.

1. Take a **deliberately bad test case** from the target domain
2. Run the optimize cycle (discover → analyze → apply) using your new rubric
3. After apply, ask these challenge questions:
   - "What improvements would a domain expert make that the rubric didn't prompt?"
   - "What stakeholder from Step 1 would still be unhappy with the output?"
   - "If I showed the before/after to a [security reviewer / ops engineer / accessibility user], what would they flag?"
4. Any gap found → add or refine a dimension, then re-test

**Convergence:** The rubric is ready when a test run produces output that satisfies all identified stakeholders with no major gaps.

## Dimension Categories

When selecting dimensions, ensure coverage across these categories:

| Category | What it covers | Example dimensions |
|---|---|---|
| **Content quality** | What the text says | Clarity, Completeness, Accuracy |
| **Operational fitness** | How it works in production | Runtime Context, Log Distinguishability, Machine Readability |
| **Stakeholder safety** | Who it could harm | Information Safety, Compliance, Accessibility |
| **System integration** | How it fits the broader system | Consistency, i18n Readiness, Brand Voice |
| **Structural efficiency** | Whether content is lean and non-redundant | Duplication (same idea in multiple places), YAGNI (sections no workflow uses), Conciseness (says in 200 words what 50 could) |

A good rubric has at least one dimension from **Content quality** and at least one from another category. If all dimensions are Content quality, the rubric has the blind spot we're trying to fix.

## Applying to Existing Rubrics (Audit Mode)

To audit an existing rubric:

1. Run Steps 1-2 (Stakeholder + Failure Mode analysis) for the domain
2. Map each existing dimension to the implied dimensions from Step 2
3. Identify dimensions from Step 2 that have NO match in the existing rubric → these are gaps
4. Add the highest-severity gaps as new dimensions (up to the 5-7 total cap)
5. Run Step 4 (Adversarial Validation) to confirm the gaps are real

## Examples

### Error Messages — Before and After Protocol

**Before (3 dimensions):**
- Clarity, Completeness, Actionability

**After protocol (6 dimensions):**
- Clarity — does the user understand what went wrong?
- Completeness — does it explain why and what the constraint is?
- Actionability — does it tell the user what to do next?
- Runtime Context — does it include the actual value that caused the failure?
- Log Distinguishability — can you tell which code path threw this from the message alone?
- Information Safety — does it avoid leaking sensitive data (IDs, internal paths, stack traces)?

**What changed:** Added 3 dimensions covering developer, ops, and security stakeholders — the blind spots our testing revealed.

### Email Templates — Generated by Protocol

**Stakeholders:** Recipient, marketing team, legal/compliance, deliverability engineer, i18n team
**Dimensions (6):**
- Clarity — subject + body communicate purpose in under 3 seconds
- Completeness — all information needed to act is present
- Tone Calibration — emotional register matches the email type
- Deliverability — subject length, spam trigger avoidance, preheader text
- Legal Compliance — CAN-SPAM/GDPR: unsubscribe link, physical address, data rights
- Variable Safety — template variables have fallback text if data is missing
