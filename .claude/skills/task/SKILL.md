---
name: task
description: Manages workspace safety and context switching — saves uncommitted work, creates branches, shows project status dashboard, pauses/resumes work. The entry point before building anything. Use when starting a new task, resuming previous work, switching context, or checking what's in progress.
metadata:
  allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Task — Workspace Safety & Context Switching

The workspace manager. Handles everything about **where you are** and **what's safe** before building starts. Prevents lost work when switching between tasks across Claude Code sessions.

This skill is the **entry point** for the development workflow. It prepares the workspace, then hands off to `implement` for actual building.

```
User says what they want
        │
        ▼
   ┌─────────┐
   │  task    │  ← saves work, creates branch, restores context
   └────┬────┘
        │ workspace ready
        ▼
   ┌──────────┐
   │ implement │  ← evaluates complexity, plans, builds
   └──────────┘
```

## Arguments

- (no args) or `status`: Show project status dashboard — all branches, plans, stashes, stale work
- `start "description"`: Start a new task — safely handles dirty state, creates branch
- `pause`: Save current work and return to a clean state
- `resume`: List available work and switch to it
- `list`: Show all active branches

---

## `status` (default) — Project Dashboard

The dashboard reads git state on the spot — no tracking files, no database. Git is the single source of truth.

### Data gathering

Run these commands to build the dashboard:

```bash
git branch --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)|%(subject)'
git stash list
git log main --merges --oneline -10
git status --porcelain
git branch --show-current
ls docs/implementation-plan/ 2>/dev/null
```

### Dashboard format

Organize into sections:

**IN PROGRESS** — branches with recent commits (within last 2 weeks), not merged to main:
- Branch name, last activity date, last commit message
- If a plan exists in `docs/implementation-plan/` matching the branch topic: show phase progress (e.g., "Plan: phase 3/5 complete")
- Mark current branch with `← you are here`

**STASHED WORK** — entries from `git stash list`:
- Stash description and date
- Parse branch name from stash message if available

**POSSIBLY STALE** — branches with no commits in 2+ weeks, not merged:
- Branch name, last activity date, commit count

**RECENTLY COMPLETED** — branches merged to main in the last 2 weeks:
- Branch name and merge date

### Tier adaptation

| Tier | Dashboard style |
|---|---|
| **Guided** | Plain language, no git terminology. "Here's what's going on with your project." |
| **Supported** | Plain language with brief branch name references |
| **Standard/Expert** | Compact table format with branch names and commands |

If there are uncommitted changes on the current branch, note them at the top.

**Guided tier field mapping** — translate git concepts to plain language:
- Section headers: "Active work" (not "IN PROGRESS"), "Saved work" (not "STASHED WORK"), "Finished work" (not "RECENTLY COMPLETED")
- Branch names: show the topic, not the prefix — `feat/payment-flow` → "Payment flow"
- Stash entries: show context — "You saved work on: Payment form"
- Avoid: "branch", "stash", "merge", "HEAD", "not merged"
- Use: "what you were working on", "last touched X days ago", "saved for later"

---

## `start "description"` — Begin New Work

**Step 1 — Check dirty state**

Run `git status --porcelain`.

- If working tree is clean (no modified/staged/untracked files): skip to Step 3
- If dirty (any changes): proceed to Step 2

> Note: Stash presence alone does NOT trigger Step 2 — only uncommitted working tree changes do.

**Step 2 — Handle uncommitted changes**

Adapt the prompt to the user's tier:

**Guided tier:**

Use **AskUserQuestion**:
- **Question**: "You have unsaved work from before. Want me to save it so nothing gets lost?"
- **Header**: "Unsaved Work"
- **Options**: "Yes, save it" / "No, throw it away" / "Keep it — it's part of what I'm doing next"

Actions:
- **Yes, save it**: `git stash push -u -m "task: {current_branch} - {brief_description}"`
- **No, throw it away**: Confirm once more ("Are you sure? This cannot be undone."), then `git checkout -- . && git clean -fd`
- **Keep it**: Proceed to Step 3 with changes intact

**Supported tier:** Same as Guided, but add a one-line summary of what the unsaved changes are (e.g., "3 files changed in the login component").

**Standard / Expert tier:**

Use **AskUserQuestion**:
- **Question**: "You have uncommitted changes. What should we do with them?"
- **Header**: "Uncommitted Work"

| Option | Description |
|---|---|
| Stash them | Save changes to git stash — you can resume later |
| Commit as WIP | Create a work-in-progress commit on the current branch |
| They're related | Keep them — these changes are part of the new task |
| Discard them | Throw away uncommitted changes (cannot be undone) |

Actions:
- **Stash**: `git stash push -u -m "task: {current_branch} - {brief_description}"`
- **Commit as WIP**: Stage all and commit with message `wip: {current_branch_context}` — do NOT push. Derive `{current_branch_context}` from: the task description if provided → otherwise the current branch name → otherwise `uncommitted work`.
- **Related**: Keep changes, proceed to Step 3. When creating the branch in Step 3, `git checkout -b` automatically carries uncommitted changes to the new branch — no extra steps needed. Mention this to the user: "Your current changes will move to the new branch automatically."
- **Discard**: Confirm once more, then `git checkout -- . && git clean -fd`

**Step 3 — Create branch**

Derive a branch name from the description using conventional prefixes:

| Description contains | Prefix | Example |
|---|---|---|
| "fix", "bug", "broken", "issue", "error" | `fix/` | `fix/login-blank-screen` |
| "refactor", "clean up", "reorganize" | `refactor/` | `refactor/auth-middleware` |
| Everything else (features, new work) | `feat/` | `feat/user-dashboard` |

Use **AskUserQuestion** to confirm:

- **Question**: "Start on a new branch?"
- **Header**: "New Branch"

| Option | Description |
|---|---|
| Create `{prefix}/{name}` | Branch from current HEAD |
| Create from main | Start fresh from main branch |
| Stay on current branch | No branch — just work here |

Create the branch if requested: `git checkout -b {prefix}/{name}` (or `git checkout -b {prefix}/{name} main`)

**Step 4 — Hand off**

The workspace is now ready. Proceed with the user's original request. If the user described something to build, the conversation continues into `implement` (complexity evaluation → plan or direct build). Task does not call implement directly — the contextual routing in CLAUDE.md handles the transition.

Confirm based on tier:
- **Guided/Supported**: "All set. Let's get started."
- **Standard/Expert**: "On `{branch}`. Ready to build."

---

## `pause` — Save Work

Save current work and return to a clean state.

1. Check `git status --porcelain` — if clean, say "Nothing to save — working tree is clean."
2. If dirty, use **AskUserQuestion**:

**Guided tier:**
- **Question**: "Want me to save your current work?"
- **Options**: "Yes" / "No, I'll come back to it" (explain that "saving" means git will remember it)

**Standard/Expert tier:**
- **Question**: "How should we save your current work?"
- **Header**: "Pause Task"

| Option | Description |
|---|---|
| Stash | Save to git stash — lightweight, easy to resume |
| Commit as WIP | Create a WIP commit on this branch |

3. Execute the chosen action:
   - **Stash**: `git stash push -u -m "task: {branch} - {brief_context}"`
   - **WIP commit**: Stage all, commit `wip: {brief_context_from_recent_changes}` — do NOT push
   - **No (Guided tier)**: Acknowledge and close: "No problem — your changes are still there. Whenever you're ready, just say 'resume' or 'come back to this'."

4. Stash messages must carry enough context to be useful later. Include:
   - Branch name
   - Brief description of what was being worked on
   - If an implementation plan exists, note the current phase

5. Optionally ask if they want to switch to main: "Switch back to main branch?"
6. Confirm: "Work saved. When you're ready to come back, just say 'resume' or 'go back to {topic}'."

---

## `resume` — Restore Previous Work

List available work and switch to it.

1. Gather ALL feature/fix/refactor branches (not just a single prefix):
   ```bash
   git branch --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)|%(subject)'
   ```
2. Gather stashes: `git stash list`
3. If nothing found: "No paused work found. What would you like to build?"
4. Present combined list with **AskUserQuestion**:

- **Question**: "Which work do you want to continue?"
- **Header**: "Resume Work"

Options built from:
- Active branches (with last commit message and date)
- Stash entries (with stash message and date)

5. Resume the selected work:
   - **Branch selected**: `git checkout {branch}`. If a stash exists with a matching branch name in the message prefix, ask if they want to restore it too.
   - **Stash selected**: Parse the originating branch from the stash message (the `task: {branch}` prefix). Checkout that branch first, THEN pop the stash. Both steps are required — never pop a stash without first being on the correct branch. If the branch no longer exists locally, ask the user: "The branch this work came from no longer exists. Want me to (a) create it from main, or (b) restore the work onto your current branch?"

6. Run `git status` and show current state

7. **Detect implementation plans**: Check `docs/implementation-plan/` for a plan matching the branch topic. If found:
   - Check git log for phase commits to determine progress
   - Report: "You have an implementation plan for this — phase {N} of {total} is next."
   - For Guided/Supported: "There's a step-by-step plan for this work. Want me to continue building where we left off?"
   - For Standard/Expert: "Plan found at `docs/implementation-plan/{name}/`. Phase {N}/{total} next. Continue execution?"

8. Confirm: "Resumed. Here's where you left off: [brief state summary]"

---

## `list` — Show All Active Work

1. Show ALL non-main branches sorted by recent activity:
   ```bash
   git branch --sort=-committerdate --format='%(refname:short)|%(committerdate:relative)|%(subject)'
   ```
2. Show any stashes
3. For each branch, check if a matching implementation plan exists and note progress
4. Highlight current branch
5. If no branches besides main: "No active work found."

---

## Branch Naming

- Use conventional prefixes: `feat/`, `fix/`, `refactor/`
- Format: kebab-case, derived from description
- Max length: 50 chars for the suffix
- Examples: `feat/user-dashboard`, `fix/login-blank-screen`, `refactor/auth-middleware`

---

## Rules

- **Never discard changes without explicit double-confirmation** — this is the skill's #1 safety guarantee
- **Always show what will be affected** before stashing, committing, or discarding
- **Stash messages must be descriptive** — include branch name and context so resume is useful
- **Don't force branch creation** — some tasks are fine on the current branch
- **WIP commits should never be pushed** — they're local-only placeholders
- **Git is the database** — do not write tracking files, memory files, or any persistent store for task state. All context comes from git: branch names, commit messages, stash messages, and plan docs in the repo.
- **Use the user's tier language** — Guided: plain language, explain git concepts. Expert: terse, use git terminology.
- **Scan all branches** — don't limit to a single prefix. Users may have branches from other tools, manual creation, or GitHub.
