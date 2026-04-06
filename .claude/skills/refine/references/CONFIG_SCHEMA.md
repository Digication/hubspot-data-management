# Configuration Schema

Settings for the Refine skill, stored at `.claude/refine-config.json`.

## Schema

```json
{
  "verification": "enabled | disabled",
  "confidence_threshold": 6.0,
  "auto_approve": false,
  "auto_approve_severity": [],
  "auto_approve_above_confidence": null,
  "auto_approve_after_cycle": null,
  "default_max_cycles": 3,
  "default_verbosity": "short | medium | detailed",
  "progressive_autonomy": true,
  "codex_evaluator": "auto"
}
```

## Field Definitions

### verification
- **Type:** `"enabled"` | `"disabled"`
- **Default:** `"enabled"`
- **Effect:** Controls whether the Verify phase runs between Analyze and Approve in loop mode. When disabled, proposals go directly from Analyze to Approve without confidence scoring.
- **Validation:** Must be one of the two string values.

### confidence_threshold
- **Type:** number (0.0 - 10.0)
- **Default:** `6.0`
- **Effect:** Proposals with verification confidence below this threshold are flagged for careful review. In Supervisor/Director roles, proposals below this threshold are always escalated to the human regardless of role.
- **Validation:** Must be a number between 0.0 and 10.0.

### auto_approve
- **Type:** boolean
- **Default:** `false`
- **Effect:** Blanket auto-approve for all proposals. **Not recommended** — use the graduated rules below instead. When true, overrides all graduated rules and auto-approves everything (still shows notification).
- **Validation:** Must be boolean.

### auto_approve_severity
- **Type:** array of severity strings
- **Default:** `[]` (empty — nothing auto-approved)
- **Values:** `"LOW"`, `"MEDIUM"`, `"HIGH"`
- **Effect:** Proposals matching these severities are auto-approved. Example: `["LOW"]` auto-approves LOW, prompts for MEDIUM/HIGH.
- **Validation:** Array of valid severity strings. Order doesn't matter.

### auto_approve_above_confidence
- **Type:** number (0.0 - 10.0) | null
- **Default:** `null` (disabled)
- **Effect:** Proposals with verification confidence >= this value are auto-approved. Requires verification to be enabled.
- **Validation:** Must be null or a number between 0.0 and 10.0. If verification is disabled and this is set, warn: "auto_approve_above_confidence requires verification to be enabled."

### auto_approve_after_cycle
- **Type:** number (positive integer) | null
- **Default:** `null` (disabled)
- **Effect:** Starting from this cycle number, proposals are auto-approved if the preceding cycle was fully human-approved (100% approval rate). Example: `1` means auto-approve in cycles 2+ if cycle 1 was fully approved.
- **Validation:** Must be null or a positive integer.

### default_max_cycles
- **Type:** number (positive integer)
- **Default:** `3`
- **Effect:** Default maximum cycles when the user doesn't specify. Used as the pre-selected option in the interview.
- **Validation:** Must be a positive integer between 1 and 10.

### default_verbosity
- **Type:** `"short"` | `"medium"` | `"detailed"`
- **Default:** `"medium"`
- **Effect:** Default verbosity level when the user doesn't specify.
- **Validation:** Must be one of the three string values.

### progressive_autonomy
- **Type:** boolean
- **Default:** `true`
- **Effect:** Controls whether the progressive autonomy system (Reviewer → Supervisor → Director transitions) is active. When false, the human stays as Reviewer for the entire session. Graduated auto-approve rules still apply independently.
- **Validation:** Must be boolean.

### codex_evaluator
- **Type:** `"auto"` | `"enabled"` | `"disabled"`
- **Default:** `"auto"`
- **Effect:** Controls whether Codex CLI is used as a third evaluator (alongside 2 Opus subagents) in Discover and Measure phases. Codex provides model diversity — a GPT-based model evaluating alongside Claude reduces shared blindspots.
  - `"auto"`: At the start of the first Discover phase, check for Codex CLI (`which codex`). If found, suggest using it. If not found, skip silently.
  - `"enabled"`: Always use Codex. If Codex is not installed, warn and proceed with Opus-only evaluation.
  - `"disabled"`: Never use Codex, don't check or suggest.
- **Validation:** Must be one of the three string values.
- **Invocation:** `codex exec --ephemeral --output-schema <schema> -o <output> -c 'sandbox_permissions=["disk-full-read-access"]' "<prompt>"` with 180s timeout.
- **Failure behavior:** If Codex fails or times out, log a warning and proceed with Opus-only scores. Never block a session on Codex availability.

## Graduated Auto-Approve Evaluation

When multiple graduated rules are configured, they are evaluated as follows:

1. Check `auto_approve` — if true, auto-approve (blanket override)
2. Check `auto_approve_severity` — if proposal's severity is in the list, candidate for auto-approve
3. Check `auto_approve_above_confidence` — if proposal's confidence >= threshold, candidate for auto-approve
4. Check `auto_approve_after_cycle` — if current cycle >= value and prior cycle was fully approved, candidate for auto-approve

A proposal is auto-approved if **any** rule matches (OR logic). The progressive autonomy role may add additional auto-approvals on top.

## Loading and Defaults

At the start of any Refine session:
1. Check for `.claude/refine-config.json`
2. If exists: read, validate each field, use valid values, fall back to defaults for invalid/missing fields
3. If doesn't exist: use all defaults (don't create the file)

## Error Recovery

| Issue | Recovery |
|---|---|
| File exists but is malformed JSON | Show parse error, use all defaults, offer to reset |
| Individual field invalid | Use default for that field, warn user |
| Unknown fields present | Ignore them (forward compatibility) |
