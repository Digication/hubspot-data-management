# Document Type Templates

## Spec

Required: Overview, Goals, Technical Design
Optional: Non-Goals, Alternatives Considered, Open Questions

```markdown
# {Title}

## Overview
<!-- What is this document about? What problem does it solve? -->

## Goals
<!-- What are we trying to achieve? -->

## Non-Goals
<!-- What is explicitly out of scope? -->

## Technical Design
<!-- The detailed design — architecture, data flow, APIs, etc. -->

## Alternatives Considered
<!-- What other approaches were evaluated and why they were rejected? -->

## Open Questions
<!-- Unresolved decisions or unknowns -->
```

## RFC (Request for Comments)

Required: Summary, Motivation, Proposal
Optional: Alternatives Considered, Impact, Open Questions

```markdown
# {Title}

## Summary
<!-- One-paragraph summary of the proposal -->

## Motivation
<!-- Why is this change needed? -->

## Proposal
<!-- The detailed proposal -->

## Alternatives Considered
<!-- What other approaches were evaluated? -->

## Impact
<!-- What systems, teams, or processes are affected? -->

## Open Questions
<!-- Unresolved decisions -->
```

## ADR (Architecture Decision Record)

Required: Context, Decision, Consequences

```markdown
# {Title}

## Context
<!-- What situation requires a decision? -->

## Decision
<!-- What was decided? -->

## Consequences
<!-- Positive and negative outcomes of this decision -->
```

## Guide

Required: Overview, Steps
Optional: Prerequisites, Troubleshooting

```markdown
# {Title}

## Overview
<!-- What does this guide cover? Who is it for? -->

## Prerequisites
<!-- What does the reader need before starting? -->

## Steps
<!-- Step-by-step instructions -->

## Troubleshooting
<!-- Common problems and solutions -->
```

## Free-form

No template, no completeness check. Write whatever fits your needs.

---

## Completeness Checks

When approving a document, Claude validates that required sections are present:

- **Spec**: Overview (not empty), Goals (not empty), Technical Design (not empty)
- **RFC**: Summary (not empty), Motivation (not empty), Proposal (not empty)
- **ADR**: Context (not empty), Decision (not empty), Consequences (not empty)
- **Guide**: Overview (not empty), Steps (not empty)
- **Free-form**: No checks

Claude also flags:
- Thin sections (< 100 words when a detailed section is expected)
- Unresolved markers: `TODO`, `TBD`, `???`, `[FIXME]`
- Stale language: "next quarter", "soon", "coming soon", "we'll decide later"
- Broken markdown links to non-existent files
- Missing sections referenced in table of contents
