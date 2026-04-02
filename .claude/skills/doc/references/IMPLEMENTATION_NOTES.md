# Implementation Notes

This document outlines the TypeScript scripts that support the `/doc` skill and provides guidance for implementation.

## TypeScript Scripts

The `/doc` skill relies on TypeScript scripts in `scripts/doc/` to enforce correctness. Claude calls them automatically as part of workflows.

### `doc-scaffold`

Creates a new document with type template.

```bash
doc-scaffold <slug> --owner <name> --type <type>
```

Creates:
```
docs/<slug>/
  index.md    (document template based on type)
  meta.yaml   (status: draft, owner: specified owner)
```

Implementation notes:
- Read the appropriate template from `DOCUMENT_TYPES.md`
- Create folder and files with proper permissions
- Initialize git tracking (first commit will be handled by Claude)
- Exit code 0 on success

### `doc-import`

Imports existing markdown files into the document structure.

```bash
doc-import <path/to/file.md> --type <type> --owner <name>
doc-import --scan [--filter <pattern>]
```

Behavior:
- `--scan` discovers markdown files outside `docs/` for bulk import
- Extracts existing frontmatter into `meta.yaml`
- Detects sections and warns if required sections are missing
- Preserves original content

Exit codes:
- 0: success
- 1: fixable issue (e.g., missing required sections)
- 2: fatal error (e.g., file not found)

### `doc-validate`

Checks documents for correctness.

| Check | What it catches |
|-------|-----------------|
| `meta.yaml` valid | Missing fields, invalid status, unknown schema version |
| Review file naming | Doesn't match `review_NNN_date_author.md` |
| Index in sync | Document on disk but not in `docs/index.md`, or vice versa |
| Cross-references | References to non-existent or archived documents |
| Git tag consistency | `current_version` in meta.yaml doesn't match git tags |

Usage:
```bash
doc-validate [--all] [--fix]
```

- `--all`: validate all documents (default: current document if in docs/)
- `--fix`: auto-repair safe issues

Exit codes:
- 0: all valid
- 1: fixable issues found (and fixed if `--fix` provided)
- 2: fatal issues that require manual intervention

For legacy documents missing `meta.yaml`, `--fix` infers metadata from git history.

### `doc-index`

Rebuilds `docs/index.md` from folder state and `meta.yaml` files.

```bash
doc-index [--check]
```

- `--check`: validation-only mode for CI (exit code only)
- Generates a scannable index with all documents, status, owner, type

Exit codes:
- 0: index is current or was rebuilt successfully
- 1: differences found (in check mode) or rebuild successful with warnings
- 2: fatal error (e.g., malformed meta.yaml)

### `doc-status`

Generates a smart summary from `meta.yaml`, `git log`, and review files.

```bash
doc-status <slug>
```

Output includes:
- Document title, type, and status
- Owner and contributors
- Current version (with approval date if applicable)
- Pending reviews and feedback items
- Last activity and activity timeline
- Next recommended step
- Completeness percentage (for typed documents)

### `doc-stats`

Health overview of all documents.

```bash
doc-stats [--json]
```

Output:
- Total document count by status
- Pending reviews across all documents
- Oldest unaddressed feedback
- Documents inactive for 30+ days
- Documents with incomplete required sections

Use for periodic audits and spotting stale work.

## Schema Versioning

All YAML files include `schema_version: 1`. When the schema evolves:

1. Update `schema_version` to 2, 3, etc.
2. `doc-validate --fix` runs migrations automatically
3. Migration logic is embedded in the script (version-specific upgrade functions)

Example migration:
```typescript
// Version 1 → 2: rename 'owner' field to 'owner_id'
if (meta.schema_version === 1) {
  meta.owner_id = meta.owner;
  delete meta.owner;
  meta.schema_version = 2;
}
```

## Script Orchestration

Claude invokes scripts at specific points in workflows:

| Interaction | Scripts |
|-------------|---------|
| Create | `doc-scaffold` → `doc-index` → `doc-validate` |
| Import | `doc-import` → `doc-validate` → `doc-index` |
| Any change | git commit → `doc-validate` → `doc-index` |
| Open document | `doc-status` |
| CI / pre-commit | `doc-validate --all` → `doc-index --check` |

## Error Handling

Scripts use exit codes:
- `0`: success
- `1`: fixable issue
- `2`: fatal error

If something fails mid-workflow, `doc-validate` detects inconsistencies on the next run. Claude reports and offers recovery.

## Testing Approach

For skill-dev testing:

1. **Unit tests** (per script):
   - Validate `meta.yaml` parsing and schema migrations
   - Test folder structure creation
   - Test git tag reading

2. **Integration tests**:
   - Create a document end-to-end (scaffold → validate → index)
   - Import an existing document
   - Simulate a review workflow (create reviews, validate file naming)
   - Validate stale detection on edited documents

3. **Behavioral tests**:
   - Conversational flow: user creates doc, adds content, requests review
   - Smart suggestions trigger at appropriate states
   - Slack notifications fire (mock the MCP call)
   - Next step engine suggests correct action based on state

## Implementation Checklist

- [ ] Create `scripts/doc/` directory structure
- [ ] Implement `doc-scaffold` with all template types
- [ ] Implement `doc-import` with section detection
- [ ] Implement `doc-validate` with all checks and migrations
- [ ] Implement `doc-index` for catalog generation
- [ ] Implement `doc-status` for smart summaries
- [ ] Implement `doc-stats` for health overview
- [ ] Write unit tests for each script
- [ ] Test end-to-end workflows
- [ ] Test Slack MCP integration (graceful fallback if not connected)
- [ ] Document all error scenarios and recovery paths
- [ ] Test with large documents (50+ pages) to verify split behavior

## Notes on Architecture

- Scripts are **deterministic** — given the same input files, they produce the same output
- Claude provides the **conversational UI** — scripts are the engine underneath
- **Git is the single source of truth** for version history and content integrity
- **`meta.yaml` is the source of truth** for document status, ownership, and type
- Scripts are **append-only** for reviews — never edit or delete feedback items
- **Slack notifications are optional** — they enhance but don't block workflows
