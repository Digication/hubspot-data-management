# Configuration Schema

Settings for the optimize skill. Stored in `.claude/optimize-config.json`.

## Global Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `verification` | `enabled` / `disabled` | `enabled` | Enable/disable multi-LLM verification layer |
| `personas` | comma-separated list | `devil_advocate, conservative, pragmatist` | Which verification personas to use |
| `confidence-threshold` | `0.0`–`10.0` | `6.0` | Minimum confidence score to approve proposals |
| `auto-approve` | `true` / `false` | `false` | Skip human approval (NOT recommended) |
| `output-format` | `human` / `json` | `human` | Output format for results |

## Domain-Specific Overrides

Domain settings override global settings for a specific domain only.

For example, if the user says "set the confidence threshold to 6.5 for error messages", update the config file to add a domain-specific override:

```json
"domains": {
  "error-messages": {
    "confidence-threshold": 6.5
  }
}
```

This sets the confidence threshold to 6.5 for the `error-messages` domain without changing the global default.

> **Key naming rule:** Domain overrides use the same key names as global settings. For example, the global `confidence-threshold` is overridden per-domain as `confidence-threshold`, not `threshold`.

## Validation Rules

| Setting | Rule | Error on violation |
|---|---|---|
| `confidence-threshold` | Must be `0.0`–`10.0` | "Invalid confidence-threshold: {value}. Must be 0.0-10.0" |
| `personas` | Must be from: `devil_advocate`, `conservative`, `pragmatist` | "Invalid persona: {value}. Valid: devil_advocate, conservative, pragmatist" |
| `verification` | Must be `enabled` / `disabled` | "Invalid verification: {value}. Must be enabled/disabled" |
| `auto-approve` | Must be `true` / `false` | "Invalid auto-approve: {value}. Must be true/false" |

## Example Config File

```json
{
  "global": {
    "verification": "enabled",
    "personas": ["devil_advocate", "conservative", "pragmatist"],
    "confidence-threshold": 6.0,
    "auto-approve": false,
    "output-format": "human"
  },
  "domains": {
    "error-messages": {
      "confidence-threshold": 6.5
    },
    "documentation": {
      "personas": ["devil_advocate", "pragmatist"]
    }
  }
}
```

## Example Output

When the user asks "show my optimize settings" or "what are my current settings", display:

```
Current settings:

Global:
  Verification: enabled
  Personas: devil_advocate, conservative, pragmatist
  Confidence threshold: 6.0
  Auto-approve: false
  Output format: human

Domain overrides:
  error-messages:
    Confidence threshold: 6.5
  documentation:
    Personas: devil_advocate, pragmatist
```
