#!/bin/bash
# Safety guard for skill-dev integration tests.
# Blocks destructive commands that should never run during testing:
# - git push (tests should never push to remote)
# - --force flags (tests should never force-overwrite)
# - rm -rf targeting non-temp directories

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# No command found — allow (non-Bash tool)
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block: git push
if echo "$COMMAND" | grep -qE '\bgit\s+push\b'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Integration tests must never push to remote"
    }
  }'
  exit 0
fi

# Block: --force flags
if echo "$COMMAND" | grep -qE '\-\-force\b'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Integration tests must not use --force flags"
    }
  }'
  exit 0
fi

# Block: rm -rf outside temp directories
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+/' && ! echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/tmp|/var/folders|\$TEMP_DIR|\$FAKE_HOME)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "rm -rf only allowed on temp directories ($TEMP_DIR, $FAKE_HOME, /tmp)"
    }
  }'
  exit 0
fi

# Allow everything else
exit 0
