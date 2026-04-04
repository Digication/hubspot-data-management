# Error Handling & Recovery

How the optimize skill handles failures at each stage. This skill uses conversational invocation — users never type flags or commands. Each entry describes what triggers the error, what the user sees, and how to recover.

## No Target Provided (Discover)

**Trigger:** User says "optimize" without specifying a file or domain, and the interview fails to resolve a target.
**What to do:** Run the interview flow (see SKILL.md Interview section) to ask the user what they want to optimize. Never show a flag-based error message.

## File Not Found

**Trigger:** The file the user referenced does not exist.
**What to say:** "I can't find that file — could you check the path?"
**Recovery:** Ask the user to confirm the filename and path. Use glob search to suggest similar files if possible.

## Malformed Rubric

**Trigger:** A user-provided rubric file has invalid YAML/JSON syntax.
**What to say:** "The rubric file has a formatting issue at line X: {error details}. Want me to fix it?"
**Recovery:** Offer to fix the syntax automatically, or ask the user to correct it and retry.

## Zero Proposals Approved

**Trigger:** User rejects or skips all proposals in the approve step.
**Behavior:** Apply step skips (no changes made). Measure still shows baseline quality unchanged.
**Recovery:** Offer to run analyze again with a different approach, or suggest adjusting the rubric. Remind the user they can modify proposals instead of rejecting them outright.

## All Proposals Rejected in Loop

**Trigger:** Every cycle produces 0 approved proposals.
**What to say:** "No proposals were approved this cycle. I'll stop here to avoid going in circles."
**Recovery:** Ask the user to review what they're looking for. Suggest adjusting the rubric or narrowing the scope.

## Git Conflicts During Apply

**Trigger:** Local git changes conflict with proposed changes.
**What to say:** "There's a conflict in {filename} — my proposed changes overlap with your uncommitted work."
**Recovery:**
1. Ask the user to resolve the conflict in {filename}
2. After resolution, retry applying the remaining proposals
**Prevention:** The apply phase checks `git status` first and warns if uncommitted changes exist.

## Missing Cross-Session State (Analyze)

**Trigger:** Running analyze in a new session when discover ran in a previous (now-closed) session.
**Behavior:** Analyze runs independently — it generates proposals from scratch based on its own analysis. No error is raised; it works fine but won't reference prior discover results.
**Recovery:** Re-run discover in the current session to get fresh issues, or point to the saved JSON from the previous session's `./tmp/<topic>-<timestamp>/` folder.

## Baseline Not Found (Measure)

**Trigger:** Running measure without a prior discover step in the same session.
**What to say:** "I don't have a baseline score to compare against. Want me to run a quick discover first, or do you have a score from a previous run?"
**Recovery:** Run discover to establish the baseline, or ask the user to provide a previous score manually.

## Invalid Configuration Value

**Trigger:** User asks to set a config value outside its valid range (e.g., confidence threshold of 15).
**What to say:** "That value is out of range — confidence threshold must be between 0.0 and 10.0."
**Recovery:** Ask for a corrected value.

## Convergence Takes Too Long

**Trigger:** Loop reaches the configured max cycles (default 3, safety cap 10) without convergence.
**What to say:** "We've hit {N} cycles without fully converging. The trend is {trend}. Want to keep going or stop here?"
**Note:** This prompt always requires human input — the safety cap cannot be bypassed even if the user previously chose to approve all proposals.
**Recovery:** User decides: continue with more cycles, accept current quality, or adjust the rubric.

## Partial Apply Failure

**Trigger:** Some proposals apply successfully but one or more fail (e.g., the target text was modified since analyze, a file was deleted, or an edit conflicts with an earlier proposal in the same batch).
**What to say:** "I applied {N} of {M} proposals. {K} failed — here's what happened:"
Then list each failed proposal with its index, title, and reason (e.g., "Proposal #3 'Add prerequisites': target text not found — the section may have been edited since analysis").
**Recovery:**
1. **Successfully applied proposals remain in place** — do not roll back edits that worked.
2. **For each failed proposal**, offer options via `AskUserQuestion`:
   - "Skip it" — mark as skipped, continue to measure
   - "Show me the conflict" — display the expected text vs. actual file content so the user can apply manually
   - "Re-analyze this section" — re-read the current file content and generate a fresh proposal for the same issue
3. Proceed to measure with whatever was successfully applied.

## Dirty Working Directory (Apply)

**Trigger:** Running apply when `git status` shows uncommitted changes.
**What to say:** "You have uncommitted changes that might conflict with the edits I'm about to make. Want me to proceed anyway, or would you rather commit/stash your current work first?"
**Recovery:** Offer to stash or suggest committing, then retry apply.

## Subagent Failure (Discover / Measure)

**Trigger:** The `Agent` tool call fails, times out, or returns an error during the discover or measure phase (e.g., model unavailable, context too large, network issue).
**What to say:** "The evaluation step failed — I'll retry once automatically. If it fails again, I'll run a simpler evaluation in the main session instead."
**Recovery:**
1. **Retry once** with the same prompt. Transient failures (timeouts, rate limits) often resolve on retry.
2. **If retry fails:** Fall back to running the evaluation in the current conversation model (typically Sonnet) instead of Opus. This produces slightly less thorough rubric evaluation but keeps the workflow moving.
3. **Log the failure:** When verbosity is medium or detailed, note: "Subagent unavailable — used fallback evaluation with [model name]."
**Prevention:** Keep subagent prompts under the 50K token limit (see Context Window Management in SKILL.md). For very large files, summarize before sending to the subagent.

## Proposal Text Too Large (Verify)

**Trigger:** A proposal exceeds verify mode limits (~1000 tokens / ~750 words).
**What to do:** Automatically split the proposal into smaller pieces or summarize it before sending to verification personas.
**Prevention:** Generate concise proposals — one improvement idea per proposal.
