---
name: fake-skill
description: Frozen test fixture for skill-dev tests. Do not modify for functional reasons.
metadata:
  allowed-tools: Read, Glob, Grep, Bash
---

# Fake Skill — Test Fixture

> FROZEN: This skill exists only as a stable target for skill-dev eval.yaml.
> Do not change this file unless updating the test contract.

## Arguments

- `greet <name>`: Say hello to the given name
- `greet --formal`: Use formal greeting style
- `greet --greeting <text>`: Override the default greeting prefix (e.g., `--greeting "Yo"` produces "Yo, World!")
- (no args): Greet the world

## Workflow

1. Parse the name argument (default: "World")
2. If `--greeting` provided, use it as prefix (overrides formal/casual default)
3. Otherwise, check the greeting style using the decision table
4. Output the greeting

## Decision Table

| Condition | Formal? | --greeting | Output |
|---|---|---|---|
| Name provided | No | Not set | "Hello, {name}!" |
| Name provided | Yes | Not set | "Good day, {name}." |
| No name | Either | Not set | "Hello, World!" |
| Any | Any | Set to X | "{X}, {name}!" (override) |

## Gotchas

- Bare `Bash` in allowed-tools is intentional for testing — a real skill should restrict this.
- Empty name string ("") should be treated as "no name", not as a valid name.
- `--greeting ""` (empty string) is invalid — use the default instead, don't produce ", World!".
- `--greeting` overrides `--formal` — if both are set, `--greeting` wins.

## Rules

- Always capitalize the first letter of the name
- Never greet with "Hey" — too informal for any mode
- The `--greeting` override bypasses the formal/casual decision entirely
