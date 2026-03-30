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
- (no args): Greet the world

## Workflow

1. Parse the name argument (default: "World")
2. Check the greeting style using the decision table
3. Output the greeting

## Decision Table

| Condition | Formal? | Output |
|---|---|---|
| Name provided | No | "Hello, {name}!" |
| Name provided | Yes | "Good day, {name}." |
| No name | Either | "Hello, World!" |

## Gotchas

- Bare `Bash` in allowed-tools is intentional for testing — a real skill should restrict this.
- Empty name string ("") should be treated as "no name", not as a valid name.

## Rules

- Always capitalize the first letter of the name
- Never greet with "Hey" — too informal for any mode
