# Error Handling & Recovery

How the optimize skill handles failures at each stage. Each entry describes the trigger, what the user sees, how to recover, and how to prevent it.

## Missing Required Parameters (Discover)

**Trigger:** `optimize discover` with neither `--target` nor `--domain`
**Message:** "Error: At least one of --target or --domain is required. Use --target=<file> for a specific file, or --domain=<name> to scan matching patterns."
**Recovery:** Add `--target` for a single file, or `--domain` to use a domain template's collection method.

## File Not Found

**Trigger:** `optimize discover --target=nonexistent.md`
**Message:** "File not found: nonexistent.md"
**Recovery:** Check filename and path, retry with correct file.
**Prevention:** Verify file exists before running discover.

## Malformed Rubric

**Trigger:** Invalid YAML/JSON in rubric file
**Message:** "Invalid rubric format at line X: {error details}"
**Recovery:** Fix rubric format using `optimize config --show` for reference, then retry.
**Prevention:** Validate rubric with `--dry-run` before running analyze.

## Zero Proposals Approved

**Trigger:** User rejects or skips all proposals in approve step
**Behavior:** Apply step skips (no changes made). Measure still shows baseline quality unchanged.
**Recovery:** Run analyze again to generate different proposals, or adjust rubric. Consider modifying rejected proposals instead of rejecting outright.

## All Proposals Rejected in Loop

**Trigger:** Every cycle finds 0 approved proposals
**Message:** "No proposals approved in this cycle. Stopping to avoid infinite loop."
**Recovery:** Review rejection patterns, adjust approval criteria, then retry with `--until-convergence`.

## Git Conflicts During Apply

**Trigger:** Local git changes conflict with proposed changes
**Message:** "Git conflict detected. Cannot apply proposal X. Conflicting file: {filename}"
**Recovery:**
1. Manually resolve conflict in {filename}
2. Run `git add {filename}` to mark as resolved
3. Retry: `/optimize apply --approved=approvals.txt --resume-at=X`

**Prevention:** Ensure working directory is clean before running apply (`git status` should show no uncommitted changes).

## Missing Cross-Session State (Analyze)

**Trigger:** Running analyze in a new session without `--issues-from` after discover ran in a previous session
**Behavior:** Analyze proceeds without discover context — generates proposals from scratch based on its own analysis. No error is raised.
**Message:** None (silent). The mode runs independently.
**Recovery:** Re-run discover in the current session, or pass `--issues-from=<file>` with the discover output from the previous session.
**Prevention:** When running a multi-step workflow across sessions, always pass the explicit file flags (`--issues-from`, `--proposals`, `--approved`, `--before-score`).

## Baseline Not Found (Measure)

**Trigger:** Running measure without prior discover in same session
**Message:** "No baseline found. Use `--before-score=X` to provide manually, or run discover first."
**Recovery:** Either pass `--before-score=5.2` or re-run discover to establish baseline.
**Prevention:** Always run discover first in a cycle.

## Invalid Configuration

**Trigger:** `optimize config --set confidence-threshold=15`
**Message:** "Invalid confidence-threshold: 15. Must be 0.0-10.0"
**Recovery:** Correct the value and re-run `config --set`.
**Prevention:** Review constraints via `optimize config --show`.

## Convergence Takes Too Long

**Trigger:** Loop reaches `--max-cycles` (or 10-cycle safety cap when using `--until-convergence` alone) without convergence
**Message:** "Maximum cycles (N) reached. Current improvement trend: {trend}. Continue? (Y/N)"
**Note:** This prompt always requires human input, even when `--auto-approve` is active — the safety cap cannot be bypassed.
**Recovery:** Review trend and decide: continue with higher `--max-cycles`, or accept current quality.
**Prevention:** Start with `--max-cycles=3`, increase if improvements are still declining. If no convergence after 4 cycles, consider adjusting the rubric or restructuring the target.

## Invalid --max-cycles Value

**Trigger:** `--max-cycles=0`, `--max-cycles=-1`, or non-numeric value
**Message:** "Invalid --max-cycles: {value}. Must be a positive integer (≥ 1)."
**Recovery:** Use a value of 1 or higher.

## Conflicting Global Flags

**Trigger:** `--verbose` and `--quiet` both provided
**Behavior:** `--verbose` takes precedence. A warning is shown: "Both --verbose and --quiet specified; using --verbose."

## Dirty Working Directory (Apply)

**Trigger:** Running apply when `git status` shows uncommitted changes
**Message:** "Warning: uncommitted changes detected. Apply creates commits per proposal — existing changes may cause conflicts. Commit or stash first, or proceed at your own risk."
**Recovery:** Run `git stash` or commit current changes, then retry apply.
**Prevention:** Always start apply with a clean working directory.

## Proposal Text Too Large (Verify)

**Trigger:** Proposal exceeds verify mode limits (~1000 tokens / ~750 words)
**Message:** "Proposal too large. Summarize to under 1000 tokens and retry."
**Recovery:** Split into multiple proposals or summarize the proposal text.
**Prevention:** Verify targets concise proposals — one improvement idea per proposal.
