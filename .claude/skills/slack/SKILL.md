---
name: slack
description: Send messages, search conversations, and interact with Slack workspaces via the Slack MCP server. Trigger on send slack message, post to slack, notify slack, search slack, read slack channel, slack notification.
metadata:
  allowed-tools: Read, Glob, Grep, mcp__slack__*
---

## Arguments

- `send <channel> <message>` -- Send a message to a Slack channel
- `send-thread <channel> <thread_ts> <message>` -- Reply to a thread in a channel
- `search <query>` -- Search Slack messages
- `read <channel>` -- Read recent messages from a channel
- `notify <channel> <message>` -- Post a formatted notification (used by other skills)
- `help` -- Show usage

## Instructions

This skill provides a general-purpose interface to Slack via the Slack MCP server. It is used directly by users and also called by other skills (like `/doc`) for notifications.

### Prerequisites

The Slack MCP server must be configured in `.mcp.json` at the project root. On first use, you will be prompted to authenticate via OAuth (sign in with your Slack account).

If Slack MCP tools are unavailable, detect the cause in this order:

1. **No `.mcp.json` at project root**: Tell the user: "The Slack MCP server isn't configured for this project. You'll need a `.mcp.json` file in the project root — check the project README or ask a teammate."
2. **`.mcp.json` exists but `mcp__slack__*` tools are not in the tool list**: Tell the user: "The Slack MCP server isn't loaded. Try restarting Claude Code so it picks up the `.mcp.json` config."
3. **Tools are in the tool list but a call returns an auth error**: Tell the user: "Slack isn't connected yet. You should see an OAuth prompt to sign in — check your browser."

Do not retry automatically. Let the user complete any sign-in flow.

### Subcommand: `send`

1. Identify the target channel:
   - If a channel ID is given (starts with `C`), use it directly.
   - If a channel name is given (like `#general`), use the Slack MCP tools to look up the channel ID.
2. Format the message using Slack's mrkdwn syntax (see Formatting section below).
3. Send the message using the Slack MCP `send_message` or equivalent tool.
4. Confirm to the user: "Message sent to #channel-name." If only a channel ID was provided (no name lookup occurred), use the ID in the confirmation: "Message sent to channel {ID}."

### Subcommand: `send-thread`

1. Same as `send`, but include the `thread_ts` (thread timestamp) to reply within an existing thread.
2. **Validate `thread_ts` format**: a valid Slack timestamp matches the pattern `\d+\.\d+` (e.g., `1712345678.123456`). If the value in the `thread_ts` position does not match this pattern, treat it as the message text and consider `thread_ts` missing.
3. If `thread_ts` is missing or invalid, ask the user for it or offer to send as a new message instead.

### Subcommand: `search`

1. Use the Slack MCP search tool with the user's query.
2. If zero results are returned, tell the user: "No messages found for '{query}'. Try different keywords or check the channel name."
3. Present results in a readable format, sorted by most recent first:
   - Channel name, author, date
   - Message snippet
   - Link to the message (if available)
4. Limit results to 10 unless the user asks for more. If more than 10 results exist, add: "Showing 10 of {N} results — ask for more to see the rest."

### Subcommand: `read`

1. Identify the channel (by ID or name lookup).
2. Use the Slack MCP tool to fetch recent channel history.
3. Present messages in chronological order (oldest first) with:
   - Author name
   - Timestamp
   - Message content (truncate messages longer than 300 characters with "..." and a note)
4. Default to the last 20 messages unless the user specifies otherwise.

### Subcommand: `notify`

This is the programmatic entry point used by other skills (like `/doc`) to post formatted notifications. It follows the same flow as `send` but:
- Does not ask for user confirmation before sending (the calling skill already confirmed the action).
- If the Slack MCP is not connected, skip silently and return `{ success: false, reason: "mcp_unavailable" }` so the calling skill can handle it. On success, return `{ success: true }`.
- Formats messages using the notification templates (see Formatting section).

### Subcommand: `help`

Output:
```
Slack Commands:
  /slack send <channel> <message>              Send a message to a channel
  /slack send-thread <channel> <ts> <message>  Reply in a thread
  /slack search <query>                        Search Slack messages
  /slack read <channel>                        Read recent channel messages
  /slack notify <channel> <message>            Post a notification (used by other skills)

Channel can be a name (#general) or ID (C0ADFDX96MR).
Requires Slack MCP server configured in .mcp.json.
```

## Formatting

Use Slack's mrkdwn syntax for all messages:
- `*bold*` for emphasis
- `_italic_` for secondary info
- `` `code` `` for inline code
- ` ```code block``` ` for multi-line code
- `>` for block quotes
- `:emoji_name:` for emoji (e.g., `:white_check_mark:`, `:warning:`, `:microscope:`)
- `<#CHANNEL_ID>` to link to a channel
- `<@USER_ID>` to mention a user

### Notification Templates

When other skills call `notify`, they may provide pre-formatted messages. If not, use these defaults:

**Generic notification:**
```
:bell: *Notification*
{message content}
```

**Success notification:**
```
:white_check_mark: *{title}*
{details}
```

**Warning notification:**
```
:warning: *{title}*
{details}
```

## Error Handling

- **MCP not connected**: Skip silently when called via `notify` (return `{ success: false, reason: "mcp_unavailable" }`). When called directly by the user, follow the detection steps in Prerequisites to show the appropriate message.
- **Channel not found**: Tell the user the channel name/ID didn't match anything. Suggest checking the name.
- **Permission denied**: Tell the user the Slack bot may not have access to that channel. Suggest inviting the bot.
- **Rate limited**: Wait and retry once. If it fails again, tell the user to try again in a moment.
- **Message too long**: Slack has a ~4000 character limit per message. If the message is longer:
  1. **Before sending**, tell the user: "This message is {N} characters — Slack's limit is ~4000. I'll split it into {count} messages."
  2. Split at the nearest line break before the 4000-character boundary. If no line break exists, split at the nearest space. Never split mid-word.
  3. Send part 1 as a top-level message, then send subsequent parts as thread replies to part 1 (to avoid flooding the channel).
  4. After sending, confirm: "Message split into {count} parts and sent to #channel (parts 2+ are in a thread)."

## Rules

- Never send messages without user intent (explicit request, or a skill workflow that includes notification)
- When called via `notify` by another skill, trust the calling skill's intent — don't re-confirm
- Always use mrkdwn formatting for readability
- Channel IDs are preferred over names to avoid ambiguity
- If Slack MCP tools are unavailable, never fall back to webhook URLs or curl commands — inform the user about the MCP setup instead
- Keep notification messages concise — Slack is for quick updates, not full documents
