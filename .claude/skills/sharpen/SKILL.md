---
name: sharpen
description: Analyze real session logs to find how a skill performed in practice, spot patterns and friction, and suggest concrete improvements. Trigger on sharpen skill, analyze skill usage, how is this skill doing, improve skill from usage, skill performance.
user_invocable: true
argument-hint: "skill-name [--all] | --all-skills"
---

# Sharpen — Improve Skills from Real Usage

Reads Claude Code session logs to find how a skill actually performed, spots patterns and friction, and recommends concrete improvements.

## Arguments

- `<skill-name>`: Which skill to analyze (required unless `--all-skills`)
- `--all`: Re-analyze all sessions, including previously analyzed ones
- `--all-skills`: Scan every skill at once, friction-focused report
- `--deep <session-id>`: Read the full raw session for deep analysis (use after summary shows something interesting)

## Available skills

commit, doc, fact-check, implement, onboard, retrospective, review-thread, skill-dev, skills, slack, task

## Workflow

### 1. Validate skill name

Check that `.claude/skills/<skill-name>/SKILL.md` exists. If not, show available skills and ask which one.

### 2. Run the extraction script

```bash
node .claude/skills/sharpen/scripts/extract-skill-usage.mjs <skill-name>
```

Add `--all` if the user passed it. The script automatically skips sessions that were already analyzed (tracked in `.plugin-data/analyzed-sessions.json`).

If the script returns `sessionsWithSkill: 0` and `sessionsSkipped > 0`:
- "All sessions have been analyzed already. Run with `--all` to re-analyze, or wait until you've used the skill more."

If `sessionsWithSkill: 0` and `sessionsSkipped: 0`:
- "No sessions found where the {skill} skill was used. Try using it first, then come back."

### 3. Read the target skill

Read `.claude/skills/<skill-name>/SKILL.md` so you can compare what the skill *says* to do vs. what *actually happened* in the logs.

### 4. Analyze the data

Look at the summary output and identify:

| Signal | What to look for |
|---|---|
| **Corrections** | User said "no", "not that", "actually", "wrong" — the skill's instructions led Claude astray |
| **Errors** | Tool errors, command failures — the skill may be asking Claude to do something that fails |
| **Repeated patterns** | Same tools used the same way across sessions — potential for optimization |
| **Missing steps** | Skill says to do X, but sessions show X was skipped |
| **Over-engineering** | Skill is simple but sessions show lots of unnecessary tool calls |
| **Decision quality** | Claude's key decisions — are they consistent? Do they match the skill's intent? |

### 5. Present the dashboard

```markdown
# Sharpen Report: {skill-name}

## Usage Summary
- Sessions analyzed: {new} new + {skipped} previously analyzed
- Date range: {earliest} to {latest}
- Total errors: {count}
- Total corrections: {count}

## Patterns Found
{For each pattern, describe:}
- What happened
- How many sessions it appeared in
- Whether it's a problem or just an observation

## Smells
{Only if issues were found:}
- {smell 1}: {description} — appears in {N} sessions
- {smell 2}: {description} — appears in {N} sessions

## Verdict: {Clean | Minor smells | Needs attention}
```

### 6. Decide next step

Based on the verdict:

| Verdict | Action |
|---|---|
| **Clean** | "This skill is performing well. No action needed." |
| **Minor smells** | "I found some patterns worth looking at. Want me to dig deeper into a specific session?" (offer `--deep`) |
| **Needs attention** | "I found issues that could be improved. Want me to suggest specific changes to the skill?" If yes → suggest concrete edits to SKILL.md with before/after. If approved → apply edits, then suggest `/skill-dev test` to verify. |

### 7. Mark sessions as analyzed

After presenting the report, update the tracking file:

Read `.plugin-data/analyzed-sessions.json`, add the new session IDs under the skill name key, and write it back.

## All-Skills Mode (`--all-skills`)

Scans every skill at once and produces a friction-focused report. No time frame needed — the script only processes sessions that haven't been analyzed yet.

### Workflow

1. Run: `node .claude/skills/sharpen/scripts/extract-skill-usage.mjs --all-skills`
   (add `--all` to re-analyze everything)

2. The output is a JSON object with per-skill friction data: errors and corrections only (no full session dumps).

3. Present a prioritized table:

```markdown
# All-Skills Friction Report

| Skill | Sessions | Errors | Corrections | Verdict |
|---|---|---|---|---|
| skill-dev | 63 | 85 | 4 | Needs attention |
| implement | 5 | 19 | 5 | Needs attention |
| ... | ... | ... | ... | ... |
```

4. For each skill with friction, read its SKILL.md and trace each error/correction back to the root cause:
   - **Ambiguous instructions** — skill says something vague, Claude interprets it wrong
   - **Missing guardrails** — skill doesn't prevent a known failure mode
   - **Contradictory wording** — two rules conflict

5. Group findings by **pattern** (not by skill):
   - e.g., "over-engineering responses" may affect commit, doc, and implement
   - e.g., "skipping workflow steps" may affect skill-dev and retrospective

6. For each pattern, propose a **specific edit** to the relevant skill file:
   - Show the file path and line
   - Show before/after diff
   - Explain why this fix prevents the pattern

7. Ask: "Want me to apply these fixes?" If yes → apply, then suggest `/skill-dev test` for affected skills.

8. Mark all processed sessions as analyzed (per-skill).

## Deep Mode (`--deep <session-id>`)

When the user wants to investigate a specific session:

1. Run the script with `--raw --all` and pipe to extract just that session
2. Or read the session `.jsonl` file directly from `~/.claude/projects/{encoded-cwd}/{session-id}.jsonl`
3. Show the full event timeline for that session
4. Analyze against the skill's SKILL.md for specific gaps

## History

After each analysis, append to `${CLAUDE_PLUGIN_DATA}/sharpen-log.txt`:

```
{date} | {skill-name} | {verdict} | {sessions-analyzed} | {one-line summary}
```

Show past analyses when the user runs `/sharpen` on a skill that was analyzed before:
"Last analyzed on {date}: {verdict}. {N} new sessions since then."

## Rules

- Never modify session log files — they are read-only system data
- The extraction script does NOT use any LLM — it's pure JavaScript file parsing
- Summary mode is the default — only use `--raw` when deep-diving a specific session
- Track analyzed sessions per-skill, not globally (a session can be relevant to multiple skills)
- If the summary is large (>20 sessions), focus on sessions with errors or corrections first
- When suggesting skill edits, always show the specific line to change with before/after
- After applying edits, suggest `/skill-dev test` to verify the changes didn't break anything
