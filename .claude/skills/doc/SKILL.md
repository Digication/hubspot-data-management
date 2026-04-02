---
name: doc
description: Manage documents conversationally. Trigger on creating specs, RFCs, architecture decisions, guides, or proposals. Use for managing document reviews, approvals, versioning, archiving, or when you need to organize and track design documents with feedback.
metadata:
  allowed-tools: Read, Write, Edit, Glob, Grep, Agent, WebSearch, WebFetch, Bash(git:*), mcp__slack__authenticate, mcp__slack__*
---

## Overview

A conversational document lifecycle tool powered by Claude Code. Users interact through `/doc` — no commands to remember, no conventions to learn. Claude guides every interaction.

### Design Principles

1. **Git is the engine.** Git already tracks history, diffs, versions, and integrity. Don't rebuild it. Use commit hashes in `meta.yaml` for versioning.
2. **Minimal files.** A document is two files: content (`index.md`) and metadata (`meta.yaml`). Everything else is created on demand.
3. **Conversational first.** Users never need to remember commands, arguments, or naming conventions. Claude guides every interaction.
4. **Scripts enforce correctness.** Claude is the friendly UI; scripts are the deterministic engine underneath.

## Folder Structure

```
docs/
  index.md                          # auto-generated catalog of all documents
  archives/                         # archived documents move here
  <slug>/
    index.md                        # the document — pure markdown, no metadata
    meta.yaml                       # status, owner, type, version, tags
    research/                       # (created on first use)
      index.md                      # research summary
      references/                   # source materials
    reviews/                        # (created on first use)
      review_<NNN>_<date>_<author>.md
      archives/                     # addressed feedback moves here
```

A new document starts with just `index.md` and `meta.yaml`. The `research/` and `reviews/` folders appear only when needed.

## Document Metadata (`meta.yaml`)

```yaml
schema_version: 1
title: Sales & Billing Architecture
status: draft                    # draft | in-review | approved | archived
owner: ly
contributors: [ly, jeff]
tags: [architecture, billing]
type: spec                       # spec | rfc | adr | guide | free-form
current_version: null            # set on approval: 1, 2, 3...
versions: {}                     # populated on approval, e.g. { 1: { commit: "abc1234", approved_at: "2026-03-15", approved_by: "ly" } }
```

`meta.yaml` tracks what git can't: status, ownership, document type, and approved version history. Everything git can track (history, diffs, content integrity) is left to git.

## Document Types and Templates

Each type has required and optional sections.

**Spec** — Required: Overview, Goals, Technical Design | Optional: Non-Goals, Alternatives Considered, Open Questions

**RFC** — Required: Summary, Motivation, Proposal | Optional: Alternatives Considered, Impact, Open Questions

**ADR** — Required: Context, Decision, Consequences

**Guide** — Required: Overview, Steps | Optional: Prerequisites, Troubleshooting

**Free-form** — No template, no completeness check.

See [DOCUMENT_TYPES.md](references/DOCUMENT_TYPES.md) for full templates.

## Document Lifecycle

```
draft ←→ in-review → approved → archived
                ↑         |          |
                └─────────┘          |
          draft ←────────────────────┘
```

Approval is always an explicit owner decision. On approval, Claude records the commit hash in `meta.yaml` (`versions` field) so the approved state is permanently retrievable.

## Permissions

**Evaluation order: First match wins** — Check if user is owner first, then contributor, then anyone.

| Role | Who | Can do |
|------|-----|--------|
| **Owner** | Single person in `meta.yaml` | Everything: edit, change status, address feedback, archive, transfer |
| **Contributor** | Listed in `meta.yaml` | Edit content, add research |
| **Anyone** | Any team member | Give feedback, ask questions, view history |

## Review Workflow

### Review File Format

```markdown
---
based_on_commit: a1b2c3d
author: jeff
date: 2026-03-26
---

### 1. Retry logic doesn't handle idempotency [HIGH]
Status: pending

> "The system retries failed charges automatically" — Technical Design

The retry logic doesn't account for the payment provider's idempotency model. Without idempotency keys, retries could create duplicate charges.

**Recommendation:** Add a subsection on idempotency key management.

---

### 2. Missing error codes table [MEDIUM]
Status: pending

> "Errors are returned to the caller" — Error Handling

The document mentions errors but doesn't list them. Consumers need a reference.

**Recommendation:** Add a table of error codes with descriptions.
```

Each feedback item has:
- **Title + priority:** `[HIGH]`, `[MEDIUM]`, `[LOW]`
- **Status:** `pending`, `accepted`, `won't-fix`, `needs-clarification`
- **Quote + section:** What part of the document is referenced
- **Description:** What's wrong and why it matters
- **Recommendation:** What the reviewer suggests
- **Discussion:** Back-and-forth when clarifying (added on demand)
- **Resolution:** What was actually done (added when addressed)

`based_on_commit` records which git commit the reviewer was looking at. If the document changes after the review, Claude diffs the base commit against HEAD to flag stale items.

### Addressing Feedback

Owner presents items sorted by priority. Four actions per item:

**Accept** — Claude applies the change, records the resolution.

**Won't fix** — Owner explains why, Claude records it.

**Need clarification** — Owner doesn't understand; Claude explains or asks reviewer via Slack/discussion thread.

**Modify** — Owner agrees with intent but wants to do it differently; Claude records the owner's approach.

Items with `needs-clarification` are blocked — Claude skips them and moves to the next item. Once all non-blocked items are resolved: if blocked items remain, Claude reports status. Once ALL items resolved: review files archived to `reviews/archives/`.

## Conversational Interface

```
User: /doc
Claude: What would you like to do?
        1. Create a new document
        2. Work on an existing document
        3. See all documents
        4. Import an existing file
```

Power users can shortcut: `/doc create sales-billing`. Nobody has to memorize commands.

## Document Intelligence

Claude answers questions by reading `meta.yaml`, review files, and git history.

### Smart Queries

- "What's the recent activity?" → Shows who did what and when
- "What changed since last week?" → Summarizes edits
- "Who's been working on this?" → Lists contributors
- "What's the next step?" → Suggests what to do based on document state
- "What am I missing?" → Checks for incomplete sections
- "Show me v1" → Retrieves content at the approved commit hash
- "Compare v1 to current" → Diffs versions
- "Bring me up to speed" → Full briefing

### Next Step Engine

**Evaluation order: Top-to-bottom, first match wins** — Check conditions in this order to find the best suggestion.

Claude proactively suggests when a document is opened:

| State | Suggestion |
|-------|------------|
| `draft`, empty | "Want to start writing? Here's your template." |
| `draft`, has content | "Ready to submit for review?" |
| `in-review`, no reviews | "Nobody's responded. Notify someone?" |
| `in-review`, pending reviews | "N reviews to address. Start?" |
| `in-review`, partially addressed | "Pick up where you left off?" |
| `in-review`, all addressed | "All resolved. Ready to approve?" |
| `approved`, 30+ days inactive | "Still current?" |

**"Empty" vs "has content":** A document is "empty" if it contains only template scaffolding — headings with placeholder comments like `<!-- ... -->` or no text beyond the title. "Has content" means at least one required section for the document type has substantive text beyond placeholders.

### Fresh-Eyes Review (Pre-Approval Gate)

When approving, Claude runs a cold review:

```
Claude: Before I approve, a quick check:
        ✓ All required sections filled
        ✗ "Error Handling" references a non-existent diagram
        ✗ "Timeline" says "next quarter" — could go stale
        
        Fix these first, or approve as-is?
```

Checks: template completeness, internal consistency, stale language ("next quarter", "soon"), thin sections, unresolved markers (`TODO`, `TBD`), broken cross-references. Non-blocking.

## Interview Mode

A conversational mode where Claude asks questions to extract, clarify, or validate information. Used before creating, requesting reviews, doing research, or when clarifying edit requests.

Claude shifts into question mode — short, focused questions, one at a time. It summarizes what it's learned periodically and asks "Did I get that right?" before proceeding.

Interview results feed directly into whatever workflow triggered it (a draft, review request, research plan, etc.).

## Workflows

### Create

1. Claude asks for topic, suggests slug, asks for type
2. If user is unsure about scope: Claude offers an interview to clarify before writing
3. Create folder structure with `index.md` + `meta.yaml`
4. If document is large (50+ pages), support splitting into `references/` sub-files
5. Claude commits

### Research

1. Claude asks for sources (web, codebase, internal docs) and focus questions
2. Findings saved to `research/index.md`, sources to `research/references/`
3. Supports `--with-code` for codebase exploration using Agent sub-agents

### Edit

Owner or contributors. Claude commits before making changes (safety net). Updates timestamp in `meta.yaml`.

### Give Feedback

Anyone. Reviewer talks naturally — Claude structures it into prioritized items with quotes and recommendations. One file per person per round.

### Request a Review

Owner asks for someone to review. Claude interviews the owner first:

```
Claude: Who should review this?
User:   Jeff and Sarah

Claude: What kind of feedback do you need?
        1. General — catch anything I missed
        2. Specific expertise — I need someone who knows this area
        3. Validation — does this match the requirements?
        4. All of the above
```

Claude then:
1. Sets status to `in-review` if not already
2. Sends Slack notification to requested reviewers with:
   - Link to the document
   - What kind of review is needed
   - Specific focus areas from the interview
   - Context the reviewer needs
3. Logs the request in git commit

### Address Feedback

Owner. Claude presents items by priority. Four actions per item: accept, modify, won't fix, need clarification. Blocked items are skipped and revisited later. Archives resolved reviews when all items done.

### Approve

1. Owner chooses to approve
2. Fresh-eyes review runs
3. Update `meta.yaml`: `current_version` bumped, `status: approved`
4. `git commit` the meta change
5. Record the commit hash: after the commit succeeds, capture its hash (e.g. via `git rev-parse HEAD`) and add it to `meta.yaml`'s `versions` map: `{ <N>: { commit: "<hash>", approved_at: "<date>", approved_by: "<owner>" } }`. Then commit the updated `meta.yaml`.

### Archive

Claude warns about incoming cross-references. Document moved to `docs/archives/<slug>/`. Index updated.

### Rename

Claude scans all docs for cross-references, shows affected files, updates on confirmation, commits.

### Transfer Ownership

1. **Owner-initiated transfer:** Owner names the new owner. Claude updates `meta.yaml` (owner field), commits with reason, optionally notifies via Slack.
2. **Team member claim:** Any team member can claim an unresponsive owner's document. Claude asks for a reason (self-asserted — no verification required), updates `meta.yaml`, and commits with the reason recorded in the commit message. The previous owner is mentioned in the commit so the change is visible in git history.

Note: The Permissions table restricts "Anyone" to feedback and viewing, but this workflow is an explicit exception for ownership continuity. Claims are always allowed when a reason is provided — "unavailable" is determined by the claimant's assertion, not system detection.

## Concurrency & Edge Cases

**Evaluation order: Use git as the source of truth** — When a conflict arises, git state takes precedence over in-memory state.

| Scenario | Resolution |
|----------|-----------|
| Two people edit simultaneously | Git merge conflict resolution |
| Two people review simultaneously | Separate review files — no conflict |
| Edit while someone reviews | `based_on_commit` detects stale feedback |
| New feedback during addressing | Queued for next round |
| Review on outdated content | `based_on_commit` enables stale detection via git diff |
| Contradictory feedback | Claude reads all pending items across review files, identifies items targeting the same document section with opposing recommendations, and presents them side-by-side. Owner decides which approach to follow. |
| Feedback not understood | Owner picks "need clarification"; Claude asks reviewer |
| Clarification never comes | Item stays `needs-clarification`; next step engine reminds |
| Reviewer responds via Slack | Claude captures and adds to review file discussion thread |
| Document edited outside tool | `git status` detects; Claude offers to commit or revert |
| Owner unavailable | Any team member can claim (committed with reason) |

## Slack Notifications

After key events (create, review, approve, status change), Claude posts to Slack using the `/slack` skill. If Slack MCP is not connected, skip silently — never block a workflow.

## Error Handling & Recovery

When any operation fails, follow this strategy:

**Git Operations** — If `git status`, `git commit` fails:
1. Describe what failed in plain language: "I tried to save your changes but hit a git error..."
2. Show the error (don't hide it)
3. Offer options: retry, skip and continue, abort the workflow
4. If user chooses skip, note in the git commit message: "Partial operation — [reason]"

**File Operations** — If reading or writing document files fails:
1. Check `git status` to see if the problem is untracked/uncommitted changes
2. If yes, offer to commit or stash before continuing
3. If no, report the error and suggest checking file permissions or disk space

**Slack Notifications** — If MCP call fails:
1. Log the failure internally (mention it to user but don't block workflow)
2. Example: "Saved the document. (Note: couldn't notify Jeff via Slack — MCP not connected.)"
3. Never retry the notification or error out — the document operation already succeeded

**Meta.yaml Validation** — If `meta.yaml` is malformed or missing:
1. If missing: create a default with `status: draft`, `owner: [current user]`
2. If malformed: show the parse error and ask user to fix, or offer to rebuild from git history
3. If outdated schema: run schema migration and warn user

**Script Failures** — If `doc-scaffold`, `doc-validate`, etc. fail:
1. Report the error message from the script
2. Exit code 1 (fixable): offer to retry or diagnose
3. Exit code 2 (fatal): explain the issue and suggest next steps (e.g., "Folder already exists. Did you mean `/doc update`?")

## Gotchas

### 1. **Git Operations Can Silently Fail in Merge Conflicts**
When addressing feedback and editing documents, a `git commit` can fail if the user manually edited files outside the skill (creating local changes). Claude won't know until the commit fails.

**Prevention**: Always run `git status` before making changes. If there are uncommitted changes, ask the user whether to commit them first or stash them.

**Recovery**: If commit fails with "Committing is not possible because...": offer to stash the conflicting changes and retry, or ask the user to manually resolve.

### 2. **Slug Resolution Breaks on Malformed Document Folders**
If a folder under `docs/` exists but has no `meta.yaml`, or `meta.yaml` is invalid YAML, the folder won't be recognized as a document. This can happen if the user manually created a folder or if a past operation was interrupted.

**Prevention**: Run `doc-validate --all` periodically to catch orphaned folders. Mention this in "next steps" if a long time has passed.

**Recovery**: If `doc-validate` finds orphaned folders, ask the user what to do with them: archive, fix, or delete.

### 3. **Review File Naming Creates Duplicates**
The review file format `review_<NNN>_<date>_<author>.md` uses a sequence number (NNN) to avoid conflicts. If the user manually renames or duplicates files, the sequence breaks and the next review might overwrite an existing one.

**Prevention**: Always use `doc-validate` to check file naming. Never allow manual editing of review file names.

**Recovery**: If duplicates are found, ask the user which one to keep and archive the others.

### 4. **Stale `based_on_commit` Hashes Can't Be Recovered**
If a review references `based_on_commit: a1b2c3d` but the commit history was force-pushed or rebased, that commit no longer exists. The review becomes orphaned.

**Prevention**: Warn users: "Force-pushing or rebasing will break any active reviews. Finish addressing feedback before rebasing." Include this in the "Before You Start" section.

**Recovery**: If a review is orphaned, ask the user: merge it manually, re-do the review, or discard it.

### 5. **Multiple Reviewers in Parallel Create Race Conditions**
If two reviewers create feedback files simultaneously (same date, same author), the files might have the same name. When Claude tries to write the second review, it overwrites the first.

**Prevention**: Encourage serial review when possible (one reviewer at a time). If parallel reviews are needed, add a UUID or timestamp to file names.

**Recovery**: If a review is overwritten, check git history and restore it: `git show HEAD~1:.claude/skills/doc/reviews/review_001_...`.

## Before You Start

This skill assumes:
- A `docs/` directory exists at project root (or will be created on first use)
- Git is initialized and configured for the project
- User has write access to the docs folder and can run git commands
- Optional: Slack MCP is configured (notifications will silently fail if not connected)

---

## Core Principles

- Git handles all version history and integrity — no custom snapshot folders or activity logs
- `meta.yaml` records metadata git can't track
- Review files are append-only — never edit after creation
- HISTORY captured via git log — `meta.yaml` is source of truth for current state and version history
- No manual versioning — commit hashes in `meta.yaml` `versions` field are the record
- When reviewing with code cross-reference, use fresh-context Agent sub-agents to avoid bias
- Always ask before creating a new version
- Accept either slug or file path; resolve using git folder structure

## Conversational Guidance

- **Never assume** the user knows what they want to write. Ask clarifying questions via interview mode.
- **Guide every action.** Explain what will happen before committing.
- **Show next steps.** When a workflow completes, proactively suggest what's next based on document state.
- **Use plain language.** Translate git concepts into everyday terms.
- **Respect ownership.** Only the owner can change status; anyone can give feedback.

See [IMPLEMENTATION_NOTES.md](references/IMPLEMENTATION_NOTES.md) for TypeScript script details and testing approach.
