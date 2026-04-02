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

### 1b. Check history

Read `${CLAUDE_PLUGIN_DATA}/sharpen-log.txt` (if it exists). If an entry exists for this skill, show it before proceeding:
"Last analyzed on {date}: {verdict}. {N} new sessions since then."

This runs before the extraction script so the user always sees prior context, even if the script returns zero new sessions.

### 2. Run the extraction script

```bash
node .claude/skills/sharpen/scripts/extract-skill-usage.mjs <skill-name>
```

Add `--all` if the user passed it. The script automatically skips sessions that were already analyzed (tracked in `.plugin-data/analyzed-sessions.json`).

If the script returns `sessionsWithSkill: 0` and `sessionsSkipped > 0`:
- "All sessions have been analyzed already. Run with `--all` to re-analyze, or wait until you've used the skill more."
- Stop here — skip steps 3-7. Do not write a log entry (no analysis occurred, no verdict to record).

If `sessionsWithSkill: 0` and `sessionsSkipped: 0`:
- "No sessions found where the {skill} skill was used. Try using it first, then come back."
- Stop here — skip steps 3-7. Do not write a log entry.

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

Based on the verdict. Use the first matching rule (top to bottom):

| Verdict | Threshold | Action |
|---|---|---|
| **Needs attention** | Corrections in >50% of sessions, OR any pattern repeats across 2+ sessions, OR missing steps in 2+ sessions | "I found issues that could be improved. Want me to suggest specific changes to the skill?" If yes → suggest concrete edits to SKILL.md with before/after. If approved → apply edits, then suggest `/skill-dev test` to verify. |
| **Minor smells** | Any errors OR any corrections (but below Needs attention thresholds), OR over-engineering detected | "I found some patterns worth looking at. Want me to dig deeper into a specific session?" (offer `--deep` with the session IDs that had issues) |
| **Clean** | No errors, no corrections, no over-engineering | "This skill is performing well. No action needed." |

### 7. Mark sessions as analyzed

After presenting the report, update the tracking file:

Read `.plugin-data/analyzed-sessions.json`, add the new session IDs under the skill name key, and write it back.

## All-Skills Mode (`--all-skills`)

Scans every skill at once and produces a friction-focused report. No time frame needed — the script only processes sessions that haven't been analyzed yet.

### Workflow

1. Run: `node .claude/skills/sharpen/scripts/extract-skill-usage.mjs --all-skills`
   (add `--all` to re-analyze everything)

2. The output is a JSON object with per-skill friction data: errors and corrections only (no full session dumps).

3. Present a prioritized table, sorted by total friction (errors + corrections) descending. Only include skills with at least one error or correction. Skills with zero friction are omitted (no news is good news):

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

9. Write one log entry per skill to `${CLAUDE_PLUGIN_DATA}/sharpen-log.txt` (not one combined entry). The session count column = sessions analyzed this run for that skill.

## Deep Mode (`--deep <session-id>`)

Deep mode **replaces** the standard workflow (steps 1-7). It does not run the extraction script or produce a dashboard — it's a focused investigation of one session.

### Workflow

1. Validate the skill name (same as standard step 1)
2. Read the session `.jsonl` file directly from `~/.claude/projects/{encoded-cwd}/{session-id}.jsonl`
   - If the file does not exist: "Session '{session-id}' not found. Check the ID and try again."
3. Read `.claude/skills/<skill-name>/SKILL.md` for comparison
4. Show the event timeline and analyze against the skill

### Output template

```markdown
# Deep Analysis: {skill-name} / {session-id}

## Session Info
- Date: {date}
- Events: {count}
- Tools used: {tool summary}

## Event Timeline
[Chronological list of key events: tool calls, decisions, errors, corrections]

## Gap Analysis vs SKILL.md
[For each deviation: what happened → what the skill says → severity (Bug/Ambiguity/Gap)]

## Summary
{1-2 sentence assessment}
```

### Side effects

- Do **not** write a log entry to `sharpen-log.txt` (deep mode is investigation, not analysis)
- Do **not** update `analyzed-sessions.json` (the session may need re-analysis in summary mode later)

## History

After each analysis, append to `${CLAUDE_PLUGIN_DATA}/sharpen-log.txt`:

```
{date} | {skill-name} | {verdict} | {sessions-analyzed} | {one-line summary}
```

Show past analyses when the user runs `/sharpen` on a skill that was analyzed before:
"Last analyzed on {date}: {verdict}. {N} new sessions since then."

## Gotchas

- The extraction script is pure JavaScript — it does NOT use an LLM. Don't expect it to interpret meaning; it only pattern-matches for corrections and errors.
- Correction detection is keyword-based ("no,", "wrong", "actually,", etc.) and will produce false positives on longer messages or system-injected content. The script filters messages >1000 chars to reduce this, but short false positives can still slip through.
- `${CLAUDE_PLUGIN_DATA}` resolves to `.plugin-data/` inside the skill's own directory (`.claude/skills/sharpen/.plugin-data/`). Don't hardcode paths.
- The over-engineering signal depends on reading key decisions from the session summary. If key decisions are sparse or absent, over-engineering won't be detected even if tool counts are high.
- Verdict thresholds are guidelines, not absolute rules — edge cases (e.g., 1 correction that's clearly a skill bug vs. 3 corrections that are user preference) still require judgment.
- In all-skills mode, reading every friction-bearing skill's SKILL.md can be slow if many skills have issues. Focus on the top 3-5 by friction count.

## Rules

- Never modify session log files — they are read-only system data
- The extraction script does NOT use any LLM — it's pure JavaScript file parsing
- Summary mode is the default — only use `--raw` when deep-diving a specific session
- Track analyzed sessions per-skill, not globally (a session can be relevant to multiple skills)
- If the summary is large (>20 sessions), focus on sessions with errors or corrections first
- When suggesting skill edits, always show the specific line to change with before/after
- After applying edits, suggest `/skill-dev test` to verify the changes didn't break anything
