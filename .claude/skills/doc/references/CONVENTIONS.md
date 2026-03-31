# Document Conventions

## Folder Structure

```
docs/
  INDEX.md                                              # Document inventory
  templates/                                            # Optional: reusable templates
    rfc-template.md
    spec-template.md
  {slug}/                                               # One folder per document topic
    HISTORY.md                                          # Version log + approval tracking
    research/                                           # Optional: pre-writing research
      index.md                                          # Summary + links to references
      references/                                       # Optional: only if multiple research files
        current-billing.md
        industry-patterns.md
    v1/
      index.md                                          # The document (or table of contents)
      references/                                       # Optional: only if multi-part document
        01_overview.md
        02_deal-architecture.md
      reviews/
        review_{date}_{reviewer}.md                     # Feedback files
    v2/
      index.md
      references/
        01_overview.md
        02_deal-architecture.md
      reviews/
        review_{date}_{reviewer}.md
```

## Naming Conventions

### Folder Names

| Type | Format | Example |
|------|--------|---------|
| Topic folder | `{slug}/` | `sales-billing-architecture/` |
| Version folder | `v{n}/` | `v1/`, `v2/`, `v3/` |
| Research folder | `research/` | Always lowercase, one per topic |
| References folder | `references/` | Always lowercase, inside research/ or v{n}/ |
| Reviews folder | `reviews/` | Always lowercase, always inside a version folder |

- Slugs: lowercase, hyphenated, no underscores in folder names
- Version numbers: incrementing integers starting at 1
- Only create `references/` when there are multiple files -- don't create empty folders

### File Names

| Type | Format | Example |
|------|--------|---------|
| Document entry point | `index.md` | Always the main file in research/ or v{n}/ |
| Research reference | `{descriptive-name}.md` | `current-billing.md`, `industry-patterns.md` |
| Document reference | `{nn}_{descriptive-name}.md` | `01_overview.md`, `02_deal-architecture.md` |
| Review | `review_{date}_{reviewer}.md` | `review_2026-03-25_ly.md` |
| History | `HISTORY.md` | Always uppercase, one per document topic |
| Index | `INDEX.md` | Always uppercase, one per `docs/` root |

- `index.md` is always the entry point -- for simple docs, it contains everything; for complex docs, it links to references
- Research references: plain descriptive names, no prefixes (they're a collection, not a sequence)
- Document references: number prefix for reading order (`01_`, `02_`, `03_`)
- Dates: ISO 8601 format `YYYY-MM-DD`
- Reviewer names: lowercase, short identifier (first name or handle)

### When to Split into References

| Situation | Structure |
|-----------|-----------|
| Short document (fits in one file) | Just `index.md`, no references/ |
| Long document with distinct sections | `index.md` (overview + links) + `references/` with numbered files |
| Single research topic | Just `research/index.md`, no references/ |
| Multiple research topics | `research/index.md` (summary + links) + `research/references/` with topic files |

## HISTORY.md Format

```markdown
# {Document Title} -- Version History

| Version | Date | Author | Status | Approved By | Notes |
|---------|------|--------|--------|-------------|-------|
| research | 2026-03-18 | Ly | -- | -- | Researched current billing system and industry patterns |
| research | 2026-03-22 | Ly | -- | -- | Added HubSpot integration research |
| v1 | 2026-03-20 | Amanda | Superseded | -- | Initial draft |
| v1 | 2026-03-25 | -- | In Review | -- | Reviewed by Ly: 9 findings (3 high, 3 medium, 3 low) |
| v2 | 2026-03-26 | Amanda | Approved | Jeff, 2026-04-01 | Revised per v1 feedback |
| v2 | 2026-03-26 | -- | -- | -- | In-place edits: 3 minor clarifications from review_2026-03-26_jeff.md |
```

### HISTORY.md Row Rules

- **Each event gets its own row** -- do not modify existing rows (append-only)
- **Version rows**: created by `research`, `create`, or `update`. Set the Author and Status.
- **Review rows**: created by `review`. Use the same version number. Author is `--` (the reviewer is in the Notes). Status is updated to "In Review" on the version's original row.
- **In-place edit rows**: created by `update` (minor changes). Use the same version number. Author is `--`. Notes describe what changed.
- **Multiple research rounds**: each gets its own `research` row with a new date and notes.

### Status Values

| Status | Meaning |
|--------|---------|
| Draft | Work in progress, not ready for review |
| In Review | Sent for feedback, reviews pending or in progress |
| Revision Needed | Reviews complete, author needs to address feedback |
| Approved | Stakeholders have signed off |
| Superseded | Replaced by a newer version |
| Archived | No longer active or relevant |

## INDEX.md Format

```markdown
# Document Index

| Document | Current Version | Status | Owner | Last Updated |
|----------|----------------|--------|-------|--------------|
| [Sales & Billing Architecture](sales-billing-architecture/) | v2 | In Review | Amanda | 2026-03-25 |
```

## Review File Format

```markdown
# Review: {Document Title} v{n}

**Reviewer:** {name}
**Date:** {date}
**Type:** {Technical | Executive | Code-Aware}
**Codebase referenced:** {repo path or "None"}

---

## What the Document Gets Right

1. ...

## Issues and Suggestions

### Issue 1: {title}

> {quote from document with section reference}

{what's actually true / what's missing}

**Recommendation:** {what to do}

**Priority:** {High | Medium | Low}

---

## Priority Summary

| Priority | Issue | Risk |
|----------|-------|------|
| High | ... | ... |

## Bottom Line

{2-3 sentence overall assessment}
```

## Research Index Format

```markdown
# Research: {Topic}

**Date:** {date}
**Researcher:** {name}
**Sources:** {Web | Codebase | Internal docs | combination}

---

## Summary

- Key takeaway 1
- Key takeaway 2
- Key takeaway 3

## References

- [Current Billing](references/current-billing.md) -- How the billing system works today
- [Industry Patterns](references/industry-patterns.md) -- How other companies handle this

## Open Questions

- Question that couldn't be answered
- Thing that needs human input
```

## Version Increment Rules

| Situation | Action |
|-----------|--------|
| Initial creation | v1 |
| Major revision (scope change, new sections, structural rework) | New version (v2, v3...) |
| Minor revision (typos, clarifications, small wording edits) | Edit in place, log in HISTORY.md |
| Approved by stakeholders | Mark current version as Approved in HISTORY.md |
| Reopened after approval (new requirements, corrections) | New version |
