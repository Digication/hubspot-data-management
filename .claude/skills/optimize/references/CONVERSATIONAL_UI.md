# Conversational UI for Skills

> **Purpose:** Reference note for applying conversational UI patterns to any skill. The `/optimize` skill was the first to adopt this approach — use it as a reference implementation.

## The Problem

Skills that use CLI-style parameters (`--target`, `--verify`, `--proposals`) create a learning curve. Users must remember parameter names, syntax, and valid combinations. This is especially poor for Guided/Supported tier users who shouldn't need to know any commands at all.

## The Solution: Intent-Driven Invocation

Instead of parsing flags, the skill should:

1. **Infer from natural language** — "optimize my README" → target is README.md, mode is loop
2. **Interview when ambiguous** — Use `AskUserQuestion` prompts (not inline text questions) to clarify intent
3. **Smart skip** — When intent is obvious, skip the interview and confirm defaults in one short prompt
4. **Respect user profile** — Read `.claude/user-context.md` for tier and purpose; adjust verbosity and ceremony accordingly

## Interview Design Principles

- **Use AskUserQuestion prompts**, not inline "What would you like?" text — prompts give structured choices the user can click
- **Consolidate questions** — Batch 2-4 related questions into one prompt rather than asking one at a time
- **Offer sensible defaults** — Mark the recommended option; let the user accept defaults with one click
- **Tier-aware phrasing** — Guided tier gets plain language ("How much detail do you want?"); Expert tier gets technical labels ("Verbosity: quiet / default / verbose")

## What This Replaces

| Before (parameters) | After (conversational) |
|---|---|
| `/optimize loop --target=README.md --max-cycles=3 --verbose` | "optimize README.md" → interview fills in the rest |
| `/optimize approve --verify --threshold=7` | Interview asks: "Want extra verification?" |
| `/optimize discover --domain=error-messages` | "check our error messages" → skill infers domain |

## Applying to Other Skills

When updating a skill to use conversational UI:

1. **Identify the parameters** — List all flags the skill currently accepts
2. **Classify each** — Which can be inferred from context? Which need user input? Which have sensible defaults?
3. **Design the interview** — Group the "needs user input" parameters into 1-2 AskUserQuestion prompts
4. **Add smart skip** — Define when intent is clear enough to skip the interview entirely
5. **Test with tiers** — Verify the flow works for Guided (zero jargon) and Expert (fast, no hand-holding)

## Reference Implementation

See `/optimize` SKILL.md — specifically the "Entry Point" and "Interview" sections.
