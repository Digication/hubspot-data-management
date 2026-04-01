# Skill Improvement Protocol

> Update a specific skill based on usage and feedback.

## When This Applies

- Feedback is **specific to one skill**
- Examples: "The commit skill should ask for scope", "review skill should check for tests"

For cross-cutting preferences -> See [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md)

## Triggers

| Type       | Examples                                     |
| ---------- | -------------------------------------------- |
| Correction | "No, use X instead", "That's wrong"          |
| Preference | "I prefer...", "Always do X for this"        |
| Failure    | Skill approach failed, alternative worked    |
| Explicit   | "Update this skill", "Remember this"         |

## Evaluate Before Updating

| Question                          | If No                                            |
| --------------------------------- | ------------------------------------------------ |
| Is it correct? (no security/bugs) | Push back                                        |
| Is it skill-specific?             | -> [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md) |
| Is it general? (helps most users) | -> [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md) |

## Dual-Route Learnings

When a correction applies to **one specific skill** AND reflects a **general principle** that should guide all future work, do both routes:

1. **GENERAL_IMPROVEMENT** — add the general rule to `CLAUDE.md` so it applies everywhere
2. **SKILL_IMPROVEMENT** — add a skill-specific implementation note to the triggering skill

**Example:** "Always run tests before committing" (triggered after the commit skill committed without running tests)
- CLAUDE.md gets: "Run tests before committing code changes."
- commit SKILL.md gets: a specific step to check test results before creating the commit

**Dual-route proposal template:**

```markdown
I found a learning that applies both specifically to the `/[skill]` skill and more broadly:

**General rule** → `CLAUDE.md`: [description of general principle]
**Skill-specific** → `/[skill]` skill: [description of implementation detail]

Want me to apply both?
```

## How to Propose

```markdown
I noticed a potential improvement to the `/[skill]` skill:

**[Title]**: [Description of preference/correction]

Should I update the skill?
```

## Update Process

1. Locate skill files in `.claude/skills/[skill-name]/`
2. Propose the specific edit with file, section, change, and reason
3. Ask for approval before applying
4. Apply the edit
5. **Validate the result:**
   ```bash
   node .claude/skills/skill-dev/scripts/validate-skill.mjs .claude/skills/[skill-name]/
   ```
   - If validation **passes**: proceed to step 6
   - If validation **fails**: report the errors, fix them immediately (don't leave the skill broken), re-validate
   - If `tests/eval.yaml` exists: recompute and update `skill_hash` — editing skill files makes the existing hash stale
6. **Suggest follow-up:** "Edit applied and validated. Want me to run `/skill-dev test [skill-name]` to verify the change works as expected?"

### Where Changes Go

| Change Type | Location |
|-------------|----------|
| Core behavior | `SKILL.md` main instructions |
| Detailed rules | `references/[topic].md` |
| New workflow step | `SKILL.md` workflow section |

## Quality Filter

Capture: Specific errors, platform differences, workflow issues
Skip: One-off flukes, temporary issues, fails evaluation

**Test**: "Would this help in future conversations with this skill?"
