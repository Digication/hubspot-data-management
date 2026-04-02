---
name: skills
description: List and describe available skills. Use when the user asks what skills are available, what a specific skill does, what they can do, or wants to understand a skill. Trigger on list skills, what skills, what can I do, tell me about [skill], what is [skill]. Do NOT trigger on "help" (built-in CLI command).
metadata:
  allowed-tools: Read, Glob
---

## Instructions

Show the user what skills are available and what each one does. Operates in two modes based on arguments.

## Mode Detection

First match wins:

| Condition | Mode |
|---|---|
| No arguments | **List** — show all skills with short descriptions |
| Skill name provided (e.g., `commit`) | **Detail** — show detailed info about that specific skill |

## Tier Detection

Read the user's tier from `.claude/user-context.md` (`<!-- onboard:tier -->` section). Fallback: infer from `~/.claude/CLAUDE.md` About Me section — "new to coding" → Guided, "building my skills" → Supported, "comfortable with code" → Standard, empty → Expert.

## List Mode (no arguments)

1. Scan `.claude/skills/*/SKILL.md` to find all project skills
2. For each skill, read the `name` and `description` from frontmatter
3. Also include system-level skills — read these from the environment context (the skill list injected into conversations via `<system-reminder>`). Common system-level skills include `claude-api`, `update-config`, `keybindings-help`, `loop`, `schedule`, `update-pr-description`, `simplify` — but always prefer the environment list over this fallback.
4. Sort all skills alphabetically by name
5. Present the list adapted to tier:

### Guided / Supported

Group skills by purpose with plain-language descriptions. Use everyday language — no jargon.

**Category grouping** (assign each discovered skill to the best-fit category):

| Category | What belongs here |
|---|---|
| Building & Creating | Skills for planning, building, scaffolding, or working with APIs |
| Saving & Managing Your Work | Skills for committing, branching, task switching, workspace safety |
| Quality & Review | Skills for code review, fact-checking, conversation review |
| Documentation & Communication | Skills for writing docs, sending messages, updating PRs |
| Learning & Memory | Skills for onboarding, retrospectives, skill discovery |
| Advanced | Skills for skill development, config, keybindings, scheduling, automation |

Within each category, list skills alphabetically.

**Format for each skill:**
```
- **{name}** — {1-sentence plain-language description derived from the skill's frontmatter description}
```

Descriptions must be a single plain-language sentence (max ~15 words). If the frontmatter description is long or trigger-focused, summarize what the skill *does* instead of copying it verbatim.

End with: "Want to know more about any of these? Just ask!"

### Standard / Expert

Compact table format, one row per skill, sorted alphabetically. Read descriptions live from frontmatter — but summarize to one concise sentence (max ~15 words). Do not copy verbose trigger lists verbatim.

```
| Skill | What it does |
|---|---|
| `{name}` | {concise summary of what the skill does} |
```

End with: `` `/skills <name>` for details on any skill. ``

## Detail Mode (skill name provided)

### Step 1: Resolve skill name

Apply fuzzy matching against the combined pool of project skills AND system-level skills:

1. **Exact match** — skill name matches a project directory or system-level skill name exactly → use it
2. **Substring match** — case-insensitive substring check against all skill names:
   - **One match** → use it
   - **Multiple matches** → list the matches and ask (see Multiple Match Format below)
   - **Zero matches** → not found (see Not Found Format below)

### Step 2: Read skill info

- If the skill has a file at `.claude/skills/<name>/SKILL.md`, read it for full details (arguments, modes, workflow)
- If it's a system-level skill (no SKILL.md file), use the description from the environment context. System-level skills typically have limited info — no arguments or modes to extract.

### Step 3: Present details adapted to tier

#### Guided / Supported

```
## [Skill Name]

**What it does:** [1-2 sentence plain-language explanation]

**When to use it:** [Describe the situations where this skill helps, in everyday terms]

**What you can tell it:**
- [argument/mode 1 — plain description]
- [argument/mode 2 — plain description]
(Omit this section entirely if no arguments/modes are available — e.g., for system-level skills with limited info)

**Example:**
[A simple, concrete example of when you'd use this skill]
```

#### Standard / Expert

```
## [Skill Name]

[Description from frontmatter]

**Modes/Arguments:**
- [argument] — [what it does]
(Omit this section if no arguments/modes are available)

**Triggers:** [trigger phrases from description]
```

### Multiple Match Format

When fuzzy matching finds multiple skills, adapt to tier:

**Guided / Supported:**
```
I found a few skills that match "[query]":
- **{name1}** — {one-line description}
- **{name2}** — {one-line description}

Which one would you like to know about?
```

**Standard / Expert:**
```
Multiple skills match "[query]": `{name1}`, `{name2}`, `{name3}`.
Which one? `/skills <name>` with the full name.
```

### Not Found Format

When no skill matches (exact or fuzzy), adapt to tier:

**Guided / Supported:**
```
I don't have a skill called "[query]". Here's what's available:

[Full List Mode output for Guided/Supported — same grouped format as List Mode]
```

**Standard / Expert:**
```
No skill matching "[query]". Available skills:

[Full List Mode output for Standard/Expert — same table format as List Mode]
```

## Gotchas

- System-level skills (like `claude-api`, `simplify`, etc.) don't have files in `.claude/skills/` — they're configured in the Claude Code environment. Don't fail if you can't find a SKILL.md for them; use the description from the environment context instead.
- System-level skills typically lack structured argument/mode info. Omit the "Modes/Arguments" or "What you can tell it" section rather than showing an empty section or guessing.

## Rules

- Read skill files live each time — don't rely on cached/hardcoded descriptions, since skills can change
- For system-level skills (not in `.claude/skills/`), use the descriptions from the skill list in the environment context
- If a requested skill doesn't exist, say so and list available skills (see Not Found Format)
- Never suggest the user type slash commands for Guided/Supported tiers — just describe capabilities naturally
- Keep the list current — if a new skill directory appears in `.claude/skills/`, include it
- Summarize verbose frontmatter descriptions to ~15 words for List Mode — don't dump trigger lists into the table
