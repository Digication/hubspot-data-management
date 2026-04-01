---
name: retrospective
description: Captures learnings from conversation review or direct feedback — skill corrections, user preferences, or new skill opportunities. Use when the user corrects your approach, says "remember this", asks to save a preference, gives direct feedback to save, reflects on what worked, or after completing significant work. Also auto-triggered by Contextual Skill Routing when corrections or successful non-obvious workflows are detected.
metadata:
  allowed-tools: Read, Glob, Grep, Edit, Write, Bash(node .claude/skills/skill-dev/scripts/validate-skill.mjs:*)
---

## Skill Resources

- `references/SKILL_IMPROVEMENT.md` - Protocol for updating existing skills
- `references/GENERAL_IMPROVEMENT.md` - Protocol for saving cross-cutting preferences
- `references/SKILL_CREATION.md` - Protocol for creating new skills
- `references/MEMORY_CAPTURE.md` - Protocol for saving personal/temporary learnings to auto memory

Resolve paths relative to this skill's base path.

## Instructions

This skill operates in two modes based on arguments:

### Mode Detection

| Condition | Mode | What happens |
|---|---|---|
| Args contain feedback (a statement, preference, or correction) | **Direct Feedback** | Classify, route, and apply the feedback |
| No args, or args are a question (e.g., "what did we learn?") | **Conversation Review** | Scan the conversation for learnings |

## Direct Feedback Mode

When the user provides feedback directly (e.g., `/retrospective always use pnpm` or `/retrospective the commit skill should not use emojis`):

### Workflow

1. **Parse** the feedback from the arguments
2. **Classify** it into a routing destination using this priority (first match wins):

   | Question | If Yes | Route to |
   |---|---|---|
   | Is it about how a specific skill behaved? | Yes | [SKILL_IMPROVEMENT](references/SKILL_IMPROVEMENT.md) |
   | Is it a team standard everyone should follow? | Yes | [GENERAL_IMPROVEMENT](references/GENERAL_IMPROVEMENT.md) |
   | Is it personal to this user? | Yes | [MEMORY_CAPTURE](references/MEMORY_CAPTURE.md) |
   | Is it temporary project context? | Yes | [MEMORY_CAPTURE](references/MEMORY_CAPTURE.md) |
   | Is it a pointer to an external system? | Yes | [MEMORY_CAPTURE](references/MEMORY_CAPTURE.md) |

3. **Propose** the change using the template for the matched route
4. **Wait for approval** before applying
5. **Apply** following the matched route's save/update process

### Ambiguous Feedback

If the feedback could reasonably go to more than one destination, present the options:

```markdown
Your feedback could be applied in two ways:

1. **Skill-specific** → update the `/[skill]` skill: [what would change]
2. **General rule** → add to `CLAUDE.md`: [what would change]

Which do you prefer? (Or I can do both — see "Dual-Route Learnings" in the skill improvement protocol.)
```

## Conversation Review Mode

When no direct feedback is provided, review the current conversation for potential workflow improvements.

### Check For

1. **Skill corrections** - A skill was used but needed adjustment
   -> Follow [SKILL_IMPROVEMENT](references/SKILL_IMPROVEMENT.md)
   -> If the correction is also cross-cutting, apply both routes (see "Dual-Route Learnings" in SKILL_IMPROVEMENT)

2. **General preferences** - User expressed cross-cutting team standards
   -> Follow [GENERAL_IMPROVEMENT](references/GENERAL_IMPROVEMENT.md)

3. **Personal learnings** - User preferences, project context, or external references that don't belong in project files
   -> Follow [MEMORY_CAPTURE](references/MEMORY_CAPTURE.md)

4. **New skill opportunity** - No skill existed but approach worked well
   -> Follow [SKILL_CREATION](references/SKILL_CREATION.md)

5. **Script or command execution issues** - A command behaved unexpectedly: failed due to permissions, needed a workaround (e.g., `dangerouslyDisableSandbox`), produced unintended side effects on retry, or required manual intervention that the skill should have handled automatically
   -> These are always worth capturing — the skill or script that owns the command should be updated so it handles the failure gracefully without user involvement
   -> Route to the skill that owns the command ([SKILL_IMPROVEMENT](references/SKILL_IMPROVEMENT.md))

## Multiple Learnings

When a conversation contains more than one learning:

1. Identify **all** learnings before proposing any
2. Present them as a numbered list with the routing destination for each
3. Ask for approval on the full set before applying any

**Template:**

```markdown
I found [N] learnings from this conversation:

1. **[Title]** → [destination: `/[skill]` skill / `CLAUDE.md` / memory]
   [one-line description]

2. **[Title]** → [destination]
   [one-line description]

Want me to apply all of these, or go through them one by one?
```

Process each learning independently through its routing path after approval.

## Nothing Found (Conversation Review Mode Only)

When no learnings are detected after reviewing the conversation, say:

```markdown
I reviewed our conversation but didn't find any learnings to capture — no corrections,
preferences, new patterns, or skill opportunities. This is normal for straightforward tasks.
```

Do NOT:
- Suggest edits to skills, CLAUDE.md, or memory files
- Propose vague "improvements" just to have something to show
- Fabricate learnings that aren't supported by the conversation

## Examples

### After a Correction (Skill Improvement)

```
User: /commit
Agent: [creates commit with emoji in message]
User: No, I don't want emojis in commit messages
Agent: [fixes it]
User: /retrospective
Agent: I noticed a potential improvement to the `/commit` skill:
       **No emojis**: You prefer commits without emojis.
       Should I update the skill?
```

### After Expressing a Team Standard (General Improvement)

```
User: Install the new lodash-es package
Agent: [runs npm install lodash-es]
User: No, we use pnpm in this project, not npm
User: /retrospective
Agent: I noticed a general preference:
       **Package manager**: This project uses pnpm, not npm.
       I'll save this to the project CLAUDE.md.
```

### After a Personal Preference or Project Context (Memory Capture)

```
User: I'm a designer, not a developer — keep the explanations simple
User: /retrospective
Agent: I noticed something worth remembering for next time:
       **User background**: You're a designer who prefers simple explanations.
       This is personal to you, so I'll save it to memory (not project files). OK?
```

```
User: We're freezing all merges after Thursday for the mobile release
User: /retrospective
Agent: I noticed temporary project context worth remembering:
       **Merge freeze**: Begins 2026-03-26 for mobile release.
       This is temporary, so I'll save it to memory rather than project files. OK?
```

### After a Successful New Workflow (Skill Creation)

```
User: Check the status of PRs #421, #425, and #430
Agent: [launches parallel gh api calls]
Agent: PR #421: all passed ...
User: Perfect, that was fast
User: /retrospective
Agent: I didn't have a skill for batch PR status checks. The approach worked:
       1. Parse PR numbers from request
       2. Fetch check runs in parallel
       3. Aggregate and summarize results
       Save as a new skill?
```

### Direct Feedback: Skill-Specific

```
User: /retrospective the commit skill should always run tests before committing
Agent: I'll update the `/commit` skill to always run tests before creating a commit.

       **Run tests before commit**: Add a step to execute the project's test suite
       and abort the commit if tests fail.

       Should I update the skill?
```

### Direct Feedback: General Preference

```
User: /retrospective always run tests before pushing to main
Agent: I noticed a general preference:

       **Run tests before push**: Always run the test suite before pushing to main.

       I'll add this to the project CLAUDE.md. Proceed?
```

### Direct Feedback: Personal / Memory

```
User: /retrospective I'm a designer, keep code explanations visual
Agent: I noticed something worth remembering for next time:

       **User background**: You're a designer who prefers visual code explanations.

       This is personal to you, so I'll save it to memory rather than editing
       project files. OK?
```

### Direct Feedback: Ambiguous Routing

```
User: /retrospective always use TypeScript strict mode
Agent: Your feedback could be applied in two ways:

       1. **Skill-specific** → update the `/implement` skill: add strict mode to project scaffolding defaults
       2. **General rule** → add to `CLAUDE.md`: "Use TypeScript strict mode in all projects"

       Which do you prefer? (Or I can do both.)
```
