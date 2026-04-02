# Document Management Scripts

TypeScript scripts that support the `/doc` skill. These are deterministic engines that Claude calls to enforce correctness and manage document lifecycle.

## Scripts

### `doc-scaffold`

Creates a new document with type template.

```bash
doc-scaffold <slug> --owner <name> --type <type>
```

**Args:**
- `slug`: document identifier (e.g., `payment-processing`)
- `--owner`: document owner name
- `--type`: `spec` | `rfc` | `adr` | `guide` | `free-form`

**Creates:**
```
docs/<slug>/
  index.md    (template based on type)
  meta.yaml   (status: draft, owner, type)
```

**Exit codes:**
- `0`: success
- `1`: fixable issue (e.g., slug exists)
- `2`: fatal error (invalid type)

### `doc-validate`

Checks documents for correctness.

```bash
doc-validate [--all] [--fix]
```

**Options:**
- `--all`: validate all documents (default: current document if in docs/)
- `--fix`: auto-repair safe issues

**Checks:**
- `meta.yaml` structure and required fields
- Review file naming conventions
- Document index consistency
- Cross-references

**Exit codes:**
- `0`: all valid
- `1`: fixable issues found
- `2`: fatal issues

### `doc-index`

Rebuilds `docs/index.md` from folder state and `meta.yaml` files.

```bash
doc-index [--check]
```

**Options:**
- `--check`: validation-only mode for CI (exit code only)

**Generates:**
A markdown table listing all documents with their status, owner, type, and version.

**Exit codes:**
- `0`: index is current or was rebuilt successfully
- `1`: differences found (in check mode) or rebuild completed with warnings
- `2`: fatal error

### `doc-status`

Shows lifecycle status of a document.

```bash
doc-status <slug>
```

**Output:**
- Document title, type, status
- Owner and contributors
- Current version
- Number of pending reviews

**Exit codes:**
- `0`: success
- `1`: document not found
- `2`: fatal error

### `doc-stats`

Health overview of all documents.

```bash
doc-stats [--json]
```

**Output:**
- Total document count by status
- Pending reviews across all documents
- Documents inactive for 30+ days

**Options:**
- `--json`: output as JSON

**Exit codes:**
- `0`: success

### `doc-import`

Imports existing markdown files into the document structure.

```bash
doc-import <path> --type <type> --owner <name>
doc-import --scan [--filter <pattern>]
```

**Args:**
- `path`: path to markdown file
- `--type`: document type
- `--owner`: document owner
- `--filter`: glob pattern (with --scan)

**Options:**
- `--scan`: discover markdown files outside `docs/`

**Exit codes:**
- `0`: success
- `1`: fixable issue (missing sections)
- `2`: fatal error

## Exit Codes (Standard)

- `0`: success, no action needed
- `1`: fixable issue, action taken or suggested
- `2`: fatal error, cannot proceed

## Dependencies

Scripts require `yaml` package. Install with:

```bash
npm install yaml
```

or

```bash
pnpm install yaml
```

## Testing Scripts

Each script can be tested independently:

```bash
# Create a test document
node scripts/doc/doc-scaffold.mjs test-doc --owner ly --type spec

# Validate all documents
node scripts/doc/doc-validate.mjs --all

# Rebuild index
node scripts/doc/doc-index.mjs

# Show status of test document
node scripts/doc/doc-status.mjs test-doc

# Show stats
node scripts/doc/doc-stats.mjs
```

## Implementation Status

These scripts are **working stubs** that implement core functionality:
- ✅ Document creation with templates
- ✅ Metadata validation
- ✅ Index generation
- ✅ Status reporting
- ⏳ Import functionality (partial)
- ⏳ Git operations (stub)

Future enhancements:
- Full `doc-import` with bulk scanning
- Git operations for versioning and stashing
- Schema migration logic
- Comprehensive error recovery paths
