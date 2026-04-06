# General Improvement Protocol

> Capture cross-cutting preferences in the appropriate `CLAUDE.md` — use root `CLAUDE.md` for environment facts (package manager, language, dev setup) and `.claude/CLAUDE.md` for behavioral rules (workflow patterns, style preferences). See the "CLAUDE.md File Roles" section in `.claude/CLAUDE.md` for guidance.

## When This Applies

- Feedback applies **across multiple skills** or **no specific skill**
- Examples: "Always use TypeScript", "Ask before deleting", "We use pnpm"

For skill-specific updates -> See [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)

## Triggers

| Type              | Examples                                 |
| ----------------- | ---------------------------------------- |
| Global preference | "I always want...", "Never do X"         |
| Workflow pattern  | "Always ask before...", "Check first"    |
| Style preference  | "Use prose not bullets", "Keep it brief" |
| Environment       | "We use pnpm", "TypeScript only"         |

## Evaluate Before Saving

| Question                          | If No                                       |
| --------------------------------- | ------------------------------------------- |
| Is it cross-cutting?              | -> [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)|
| Is it correct? (no security/bugs) | Push back                                   |
| Is it persistent? (not one-off)   | Skip                                        |

## How to Propose

```markdown
I noticed a general preference:

**[Preference Title]**: [Description of preference and correct usage].

I'll add this to `[root CLAUDE.md or .claude/CLAUDE.md]`. Proceed?
```

## Save Process

1. **Determine target file** — classify the preference:
   - Environment facts (package manager, language, dev setup) → root `CLAUDE.md`
   - Behavioral rules (workflow patterns, style preferences) → `.claude/CLAUDE.md`
2. Check if the target file exists
3. **Search for duplicates** — scan **both** `CLAUDE.md` files for:
   - **Exact match**: same rule already stated → inform user ("This is already in CLAUDE.md: [quote]") and skip
   - **Semantic match**: same intent, different wording → inform user and skip (or offer to consolidate)
   - **Contradiction**: opposite instruction exists → surface both versions, ask which to keep
4. If not found (and no contradiction), propose the addition with section, content, and reason
5. Ask for approval before applying

### Example Project CLAUDE.md Structure

```markdown
# Claude Instructions

## Environment
- Package manager: pnpm
- Language: TypeScript

## Workflow
- Ask before deleting files
- Run tests after code changes

## Style
- No emojis unless requested
- Keep responses concise
```

## Quality Filter

Capture: Repeated preferences, workflow patterns, environment facts
Skip: One-time requests, contradicts best practices

**Test**: "Will this improve future conversations?"
