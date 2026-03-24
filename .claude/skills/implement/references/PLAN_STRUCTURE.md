# Plan Document Structure

Reference for the files generated during Plan Mode.

## Directory Layout

```
docs/implementation-plan/<feature-name>/
├── 00-overview.md
├── 01-<phase-name>.md
├── 02-<phase-name>.md
├── ...
├── NN-<phase-name>.md
└── EXECUTION_GUIDE.md
```

## 00-overview.md

The overview is the architectural blueprint. It contains everything a reader needs to understand the full scope before diving into individual phases.

### Required Sections

```markdown
# Phase 0 — Overview

## Project Summary
[1-2 paragraph description of what is being built and why]

## Tech Stack
| Layer | Technology |
|-------|-----------|
| ...   | ...       |

## Architecture Overview
[ASCII diagram showing component relationships and data flow]

## Phase Dependency Graph
```
[ASCII graph showing phase ordering, parallel opportunities, and dependency arrows]
```

## Phase Summary
| Phase | Title | Description |
|-------|-------|-------------|
| 01    | ...   | ...         |

## Change Inventory

### Backend Files (or relevant grouping)
| Category | Files |
|----------|-------|
| Config   | `file1`, `file2` |
| ...      | ...               |

### Frontend Files
| Category | Files |
|----------|-------|
| ...      | ...   |

## Key Decisions & Assumptions
1. **Decision** — Rationale
2. ...
- [Assumption — what is taken as given and why]

## Verification Strategy
| Tier | Command | When |
|------|---------|------|
| Typecheck | `pnpm typecheck` | After every phase |
| Unit test | `pnpm test` | After phase N+ |
| ...  | ...     | ...  |
```

---

## NN-<phase-name>.md (Phase Files)

Each phase file is a self-contained work order. An agent reading only this file (and the existing codebase) must be able to complete the phase.

### Required Sections

```markdown
# Phase NN — <Title>

You are [doing X] for the [project name] project.

**Context:** [What prior phases produced. What files/APIs exist that this phase depends on. Enough for an agent starting cold to orient itself.]

## Overview

- [Bullet list of what this phase accomplishes]

## Steps

### 1. <Step title>

**Files to create:** `path/to/file.ts`
— or —
**Files to modify:** `path/to/existing-file.ts`

[Prose explanation of what to build and why]

```typescript
// Complete, copy-pasteable code
// No ellipsis, no placeholders
```

[Design notes if non-obvious decisions were made]

### 2. <Step title>
...

## Verification

```bash
# Commands to verify this phase is complete
pnpm typecheck
# Phase-specific checks...
```

Expected: [What success looks like]

## When done

Report: files created/modified (with summary per file), verification results, and any issues encountered.
```

### Phase File Quality Rules

1. **Context paragraph is mandatory.** It must explain what exists from prior phases so the agent doesn't need to read other phase files.
2. **Every step declares files first.** Before any code block, state which files are being created or modified.
3. **Code is complete.** Never use `// ...`, `/* implement */`, or other placeholders. If the code is long, that's fine — include all of it.
4. **Verification is specific.** Include exact commands and expected output. Don't just say "it should work."
5. **Source references are optional.** If the code is based on an existing file in the repo, mention it so the agent can cross-reference.

---

## EXECUTION_GUIDE.md

The execution guide tells the orchestrator (human or agent) how to run the phases.

### Required Sections

```markdown
# Execution Guide

## Execution Modes

### Mode A: Manual (human-driven)
[How to run each phase in a fresh conversation]

### Mode B: Automated (orchestrator agent)
[Sub-agent spawning pattern with code examples]

## Phase Execution Order
| Phase | Prompt File | Model | Dependencies | Can Parallelize With |
|-------|------------|-------|--------------|---------------------|
| 01    | `01-...`   | opus  | —            | —                   |

## Dependency Graph
[ASCII graph — same as overview but may include recommended execution steps]

## Recommended Execution for Maximum Parallelism
Step 1: Phase 01 (sequential)
Step 2: Phase 02 + Phase 03 (parallel)
...

## Constraints
- Fresh context per phase
- Commit after each phase
- Verification must pass before dependent phases
- No skipping phases

## Model Selection Guide
| Phase | Model | Reason |
|-------|-------|--------|
| 01    | sonnet | Straightforward setup |

## Environment Setup
[Prerequisites before running any phase]
- Shared Caddy proxy running (`docker network create web && cd ~/caddy && docker compose up -d`)
- See CADDY.md for one-time setup

## Troubleshooting
| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| ...     | ...         | ... |
```

---

## Naming Conventions

- **Feature directory:** lowercase with hyphens: `tori-vector-search`, `user-auth`, `real-time-collab`
- **Phase files:** zero-padded numbers: `01-`, `02-`, ... `11-`
- **Phase names:** lowercase with hyphens: `01-project-setup.md`, `04-ai-engine.md`
