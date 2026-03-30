---
name: commit
description: Creates a Conventional Commits message and commits changes. Use when the user asks to commit, craft a commit message, or manage git commit/branching.
metadata:
  allowed-tools: Read, Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git checkout:*), Bash(git branch:*), Bash(git remote:*), Bash(git config:*)
hooks:
  PreToolUse:
    - matcher: Bash
      condition: "command contains 'git commit' or 'git checkout -b'"
      action: ask_user
---

## Arguments
- `scope`: Optional. The commit scope. If not provided, infer from changed files.

## Workflow

1. Run `git status` to see all changes
2. If no changes, stop and tell the user the working tree is clean
3. Run `git diff` (unstaged) and `git diff --staged` (staged) to understand changes
4. Run `git log --oneline -5` to match the repo's existing commit style
5. Determine the commit type:
   - `feat`: New feature
   - `fix`: Bug fix
   - `refactor`: Code change that neither fixes a bug nor adds a feature
   - `docs`: Documentation only
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks
   - Optional: `perf`, `build`, `ci`, `style`, `revert`
6. If user requests a new branch:
   - Detect the default/base branch: run `git remote show origin` or `git config --get init.defaultBranch`
   - Create the branch off the current branch: `git checkout -b <branch-name>`
   - Suggest a branch name: `type/short-description` (e.g., `feat/add-user-auth`)
   - If the suggested name already exists, find the smallest integer N ≥ 2 where `name-N` is available (e.g., if `feat/add-mfa` and `feat/add-mfa-2` both exist, use `feat/add-mfa-3`)
7. Decide staging behavior:
   - If staged AND unstaged changes exist: list both groups, ask whether to commit only staged or include unstaged files too
   - If staged changes exist AND nothing is unstaged: skip the staging question — go straight to presenting the commit message
   - If nothing is staged: propose which files to stage and ask for approval
   - If user declines staging: stop and tell the user to stage files manually first
8. Present the proposed commit message (and branch name if applicable)
9. Ask the user for approval before proceeding
10. Stage the approved files and create the commit

## Rules

- Keep the description to 72 characters or fewer
- Use imperative mood ("add" not "added")
- No period at the end
- Use lowercase with hyphens for branch names
- If the user includes unstaged files after the staging question, re-evaluate the commit type and description to reflect all staged content

### Scope inference

When no `scope` argument is provided, infer scope from changed file paths:

1. Find the deepest common directory of all changed files (ignoring `src/` prefix)
2. Use that directory name as the scope (e.g., `src/auth/login.js` + `src/auth/logout.js` → `auth`)
3. If files are at the project root (e.g., `README.md`, `package.json`), omit the scope
4. If files span multiple top-level directories with no common parent, omit the scope

### Mixed commit types

When changes span multiple types (e.g., a feature + docs update + test fix):

1. Use the type that represents the primary intent of the change
2. Priority order when unclear: `feat` > `fix` > `refactor` > `docs` > `test` > `chore`
3. If changes are truly unrelated, suggest splitting into separate commits

## Gotchas

- `git diff --staged` is covered by the `Bash(git diff:*)` tool pattern — no separate entry needed
- Scope inference can produce surprising results for monorepo layouts — when in doubt, ask the user
- The PreToolUse hook will prompt the user before `git commit` and `git checkout -b` — do not add a second confirmation on top of the hook prompt
- Root-level files like `README.md` or `package.json` have no natural scope — always omit scope for these
- When the git log is empty (brand new repo), fall back to standard Conventional Commits style without trying to match history
