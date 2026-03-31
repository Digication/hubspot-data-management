---
name: doc
description: Trigger on write a spec, create a document, research a topic, review a doc, update a document, approve a doc, document status, list documents, new RFC, new proposal, draft a spec, check document history, sync docs index.
metadata:
  allowed-tools: Read, Write, Edit, Glob, Grep, Agent, WebSearch, WebFetch, mcp__slack__*
---

## Arguments

- `research <slug>` -- Research a topic before writing
- `research <slug> --with-code <repo-path>` -- Research with codebase exploration
- `create <slug>` -- Start a new document
- `review <slug-or-path>` -- Review a document and produce structured feedback
- `review <slug-or-path> --with-code <repo-path>` -- Review with codebase cross-referencing
- `review <slug-or-path> --tone <technical|executive>` -- Control output tone (default: technical)
- `update <slug-or-path>` -- Apply approved feedback to create an updated version
- `approve <slug>` -- Mark a document version as approved
- `sync` -- Check and fix INDEX.md and HISTORY.md consistency
- `status <slug>` -- Show lifecycle status of a document
- `list` -- List all managed documents
- `help` -- Show usage and conventions

## Instructions

This skill manages the full lifecycle of versioned documents in the `docs/` directory. Every action follows the folder structure and naming conventions defined in [CONVENTIONS.md](references/CONVENTIONS.md).

The lifecycle flows: **research -> create -> review -> update (loop) -> approve**

### Resolving slug vs. path

Several subcommands accept either a **slug** (e.g., `sales-billing-architecture`) or a **file path** (e.g., `docs/sales-billing-architecture/v2/index.md`).

- If a **slug** is given: resolve to the latest version by reading HISTORY.md and finding the highest `v{n}` folder.
- If a **path** is given: infer the slug from the folder structure (the directory name under `docs/`).
- If resolution fails: tell the user what was tried and ask for clarification.

### Subcommand: `research`

1. Ask the user for:
   - **Topic** -- what to research (becomes the slug if no document exists yet)
   - **Author** -- who is doing the research (for HISTORY.md). If user context is available, use it as default.
   - **Sources** -- where to look. Any combination of:
     - **Web** -- search for industry practices, articles, prior art, patterns
     - **Codebase** -- explore how things work today in a specific repo (the `--with-code` flag pre-fills this; the interactive question is the canonical way to provide it)
     - **Internal docs** -- read other documents in this repo
   - **Focus questions** -- specific questions to answer (optional, helps focus the search)
2. If `docs/{slug}/research/` already exists, show the existing research summary and ask: "Add to the existing research, or start fresh?"
   - **Add**: create new reference files in `research/references/` and update `research/index.md`
   - **Start fresh**: archive existing research by renaming to `research/references/` with a date suffix, then create new `research/index.md`
3. If the document folder doesn't exist yet, create it:
   ```
   docs/{slug}/
     HISTORY.md
     research/
       index.md
   ```
4. For each source type, use the appropriate tools:
   - **Web**: Use WebSearch and WebFetch to find and read relevant articles
   - **Codebase**: Use Agent sub-agents to explore the repo (search for keywords, read relevant files, trace data flows)
   - **Internal docs**: Use Glob and Read to find and read related documents
5. Compile findings into a research brief:
   - If findings fit in one file: write everything into `research/index.md`
   - If findings are large or cover distinct topics: create `research/references/` and split into topic files (e.g., `current-billing.md`, `industry-patterns.md`), then update `index.md` as a summary with links
6. Research `index.md` should include:
   - **Summary** -- key takeaways in 3-5 bullet points
   - **Sources** -- where the information came from (URLs, file paths, repo paths)
   - **Open questions** -- things that couldn't be answered or need human input
   - **Links to references** -- if references/ exists, link to each file with a one-line description
7. Update HISTORY.md with the research event (add a new `research` row each time).
8. Notify via Slack using the `/slack notify` skill (see [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md) for message formats).

### Subcommand: `create`

1. If `docs/{slug}/` already exists with version folders, stop and tell the user: "This document already exists (currently at v{n}). Did you mean `/doc update` or `/doc review`?"
2. Ask the user for:
   - **Topic** -- what the document is about
   - **Author** -- who is writing the document (for HISTORY.md). If user context is available, use it as default.
   - **Source** -- rough notes, a Slack thread, meeting notes, or "from scratch"
   - **Template** -- if a template exists in `docs/templates/`, offer to use it
3. If research exists in `docs/{slug}/research/`, automatically read it and use it as source material. Mention this to the user.
4. Create the folder structure:
   ```
   docs/{slug}/
     HISTORY.md          (create if it doesn't exist)
     v1/
       index.md
   ```
5. If the document is large or has distinct sections, split into multiple files:
   ```
   v1/
     index.md            (overview + table of contents with links)
     references/
       01_overview.md
       02_deal-architecture.md
       03_migration-plan.md
   ```
   Use number prefixes for reading order. Only create `references/` when actually needed.
6. If source material is provided, use it to draft the document. Add section headers and structure.
7. Update `docs/INDEX.md` with the new document entry. If `docs/INDEX.md` does not exist, create it first using the format in [CONVENTIONS.md](references/CONVENTIONS.md).
8. Notify via Slack using the `/slack notify` skill (see [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md) for message formats).

### Subcommand: `review`

1. Resolve the slug or path to the document (see "Resolving slug vs. path" above).
2. Read the document's `index.md`. If it has `references/`, read all reference files too.
3. If `--with-code` is specified:
   - Use Agent sub-agents to search the codebase for evidence that supports or contradicts claims in the document.
   - Cross-reference technical proposals against actual code (entities, APIs, data models, sync logic).
4. Produce structured feedback with these sections:
   - **What the Document Gets Right** -- acknowledge strengths
   - **Issues and Suggestions** -- numbered, each with:
     - Quote from the document (with section reference)
     - What's actually true / what's missing
     - Recommendation
   - **Priority Summary** -- table with High / Medium / Low ratings
   - **Bottom Line** -- 2-3 sentence overall assessment
5. If `--tone executive` is specified:
   - Remove all code references and file paths
   - Use plain business language
   - Focus on risk and impact, not implementation details
6. Save the review to:
   ```
   docs/{slug}/{version}/reviews/review_{today}_{reviewer}.md
   ```
   - Reviewer name: ask the user, or default to "claude"
7. Update HISTORY.md with the review event:
   - Add a new row with the same version number, Author `--`, and Notes describing the review (e.g., "Reviewed by Ly: 9 findings (3 high, 3 medium, 3 low)")
   - Also update the version's original row: set Status to "In Review" (if not already)
8. Notify via Slack using the `/slack notify` skill (see [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md) for message formats).

### Subcommand: `update`

1. Resolve the slug or path to the document (see "Resolving slug vs. path" above).
2. Read the current version of the document (index.md + all references/ if they exist).
3. Read all review files for the current version.
4. Present the feedback items to the user as a checklist:
   ```
   Feedback from review_2026-03-25_ly.md:
   [ ] Issue 1: Deal flow reversal not scoped (HIGH)
   [ ] Issue 2: Auto-computation location undefined (HIGH)
   [ ] Issue 3: HubSpot sync depends on sales_status (HIGH)
   ...
   Which items should I apply? (e.g., "1, 2, 3" or "all" or "none")
   ```
5. Based on user selection, determine if changes warrant a new version. Confirm with the user before proceeding:
   - **New version** if: structural changes, new sections, scope changes
   - **In-place edit** if: typos, clarifications, minor wording
6. **Apply the changes** -- for each selected feedback item:
   a. Read the review's recommendation for that item
   b. Find the relevant section in the document (use the quote from the review to locate it)
   c. Rewrite the section to address the feedback -- follow the recommendation, preserve the document's voice and style
   d. If the recommendation adds a new section, place it in the logical position within the document structure
   e. If the document has `references/`, edit the correct reference file (not just `index.md`)
   f. After applying all items, do a consistency pass:
      - Verify internal markdown links in `index.md` resolve to actual reference files
      - Check that section titles in `index.md` TOC match headings in reference files
      - Confirm no version number or date mismatches were introduced
      - Ensure no two sections now contradict each other due to independent edits
7. If new version:
   - Create `v{n+1}/` folder
   - Copy the document structure (index.md + references/ if they exist) into the new folder, then apply changes from step 6
   - Update HISTORY.md: add new version row, mark previous version as "Superseded"
   - Update INDEX.md with new current version
8. If in-place edit:
   - Apply changes from step 6 directly to the existing files
   - Update HISTORY.md: append to the current version's Notes column (e.g., "In-place edits 2026-03-25: 3 minor clarifications from review_2026-03-25_ly.md")
   - Update INDEX.md: update the "Last Updated" date
9. Notify via Slack using the `/slack notify` skill (see [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md) for message formats).

### Subcommand: `approve`

1. Read `HISTORY.md` for the given slug.
2. Show the current version, status, and any pending reviews:
   ```
   Sales & Billing Architecture is at v2 (status: In Review)
   Reviews: review_2026-03-25_ly.md (9 findings: 3 high, 3 medium, 3 low)

   Approve v2 as final? This marks it as the official version.
   ```
3. If there are unresolved High-priority review items, warn the user before proceeding.
4. Ask who is approving (name for the record).
5. Update HISTORY.md: set the current version's status to "Approved" and fill in the "Approved By" column with the name and today's date.
6. Update INDEX.md to reflect "Approved" status.
7. Notify via Slack using the `/slack notify` skill (see [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md) for message formats).

### Subcommand: `status`

1. Read `HISTORY.md` for the given document slug.
2. Read the latest version's `reviews/` folder.
3. Check if `research/` exists and summarize research status.
4. Output:
   - Current version and date
   - Status (Draft, In Review, Approved, Superseded)
   - Research summary (if research exists)
   - Pending reviews or open feedback items
   - Timeline of activity

### Subcommand: `sync`

1. Read `docs/INDEX.md`.
2. Scan all `docs/*/HISTORY.md` files to get the current state of every document.
3. For each document, compare what INDEX.md says vs. what HISTORY.md says:
   - **Version mismatch** -- INDEX.md shows v1 but HISTORY.md shows v2 as latest
   - **Status mismatch** -- INDEX.md shows "Draft" but HISTORY.md shows "Approved"
   - **Missing entry** -- a document folder with HISTORY.md exists but isn't in INDEX.md (fix: add the entry)
   - **Orphan entry** -- INDEX.md lists a document that no longer has a folder (fix: flag for user, do not auto-remove)
   - **Owner/date mismatch** -- last updated date or owner doesn't match latest HISTORY.md entry
4. If mismatches are found:
   - Show a summary table of what's out of sync
   - Ask the user to confirm before making changes
   - Update INDEX.md to match the HISTORY.md source of truth
   - For orphan entries: ask the user whether to remove or keep (the folder may have been accidentally deleted)
5. If no mismatches: report "Everything is in sync."

### Subcommand: `list`

1. Run a silent sync first (compare INDEX.md against all HISTORY.md files).
2. If mismatches are found, fix INDEX.md automatically (no confirmation needed for read-only display).
3. Output the index table with current data.

### Subcommand: `help`

Output a summary of available commands and the document lifecycle:

```
Document Lifecycle: research -> create -> review -> update (loop) -> approve

Commands:
  /doc research <slug>                    Research a topic before writing
  /doc create <slug>                      Start a new document (v1)
  /doc review <slug> [--with-code <path>] Review and produce structured feedback
  /doc update <slug>                      Apply feedback to create a new version
  /doc approve <slug>                     Mark current version as approved
  /doc sync                               Fix INDEX.md / HISTORY.md drift
  /doc status <slug>                      Show lifecycle status
  /doc list                               List all documents

Options:
  --with-code <repo-path>    Cross-reference against a codebase (research, review)
  --tone <technical|executive>  Control output tone (review only, default: technical)

Conventions: see .claude/skills/doc/references/CONVENTIONS.md
```

## Slack Notification

After every action (research, create, review, update, approve), post a Slack notification using the `/slack notify` skill with the message formats defined in [SLACK_NOTIFICATION.md](references/SLACK_NOTIFICATION.md). For setup, connection, and error handling, see the `/slack` skill.

## Gotchas

- **Slug resolution fails silently on malformed HISTORY.md** -- if HISTORY.md has missing columns or inconsistent version numbering, the "find the highest v{n}" logic can pick the wrong version. Always validate HISTORY.md structure before trusting the resolved version.
- **`create` on an existing slug must be caught early** -- if you skip the existence check (step 1) and proceed to create `v1/`, you'll overwrite an existing document. The guard is critical.
- **`review` on Approved documents** -- reviewing a document that's already Approved will change its status to "In Review", effectively reopening the approval process. Warn the user before proceeding.
- **Research `--with-code` on large repos** -- Agent sub-agents exploring a large codebase can produce overwhelming output. Scope the exploration with specific focus questions rather than open-ended searches.
- **Slack notification failures must not block** -- if the Slack MCP call fails (not connected, permission issue), the document action itself already succeeded. Never retry or error out -- skip silently and move on.
- **`update` with no reviews** -- if `update` is called on a version that has no review files in `reviews/`, there's no feedback to present. Tell the user: "No reviews found for v{n}. Did you mean `/doc review` first?"
- **INDEX.md can drift from HISTORY.md** -- any manual edit to INDEX.md or a failed mid-action can leave them out of sync. The `sync` command exists for this reason -- suggest it when inconsistencies are detected.

## Rules

- Always follow the naming conventions in [CONVENTIONS.md](references/CONVENTIONS.md)
- Never delete previous versions -- they are the historical record
- Reviews are append-only -- never edit a review after it's created
- HISTORY.md is the source of truth for document status
- INDEX.md is the source of truth for the document inventory
- When reviewing with `--with-code`, use fresh-context Agent sub-agents to avoid bias (same principle as `/fact-check`)
- Always ask before creating a new version (don't auto-increment)
- Accept either slug or file path for review, update, and status commands; resolve using "Resolving slug vs. path" rules
- Only create `references/` folders when there are actually multiple files -- don't create empty folders
- Research files use plain descriptive names (e.g., `current-billing.md`)
- Document reference files use number prefixes for reading order (e.g., `01_overview.md`)
- Review files use `review_{date}_{reviewer}.md` format
- If `create` is called on an existing slug, refuse and suggest `update` or `review` instead
- Multiple research rounds are allowed -- each adds a new row to HISTORY.md
