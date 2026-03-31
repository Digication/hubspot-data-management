# Doc Notification Templates

Message templates for document lifecycle notifications sent via the `/slack` skill.

For setup, connection troubleshooting, and general Slack usage, see the `/slack` skill (`skills/slack/SKILL.md`).

## Templates

All messages use Slack mrkdwn syntax. Post via `/slack notify <channel> <message>`.

### Research Completed

```
:microscope: *Research Completed*
*Topic:* {document title}
*Researcher:* {who}
*Sources:* {Web, Codebase, Internal docs}
*Findings:* {count} references compiled
*Path:* `docs/{slug}/research/index.md`
```

### Document Created

```
:page_facing_up: *New Document Created*
*Title:* {document title}
*Version:* v1
*Author:* {who}
*Path:* `docs/{slug}/v1/index.md`
```

### Review Completed

```
:mag: *Document Review Completed*
*Title:* {document title} v{n}
*Reviewer:* {who}
*Findings:* {count} items ({high} high, {medium} medium, {low} low)
*Path:* `docs/{slug}/v{n}/reviews/review_{date}_{reviewer}.md`
```

### Document Updated (New Version)

```
:pencil2: *Document Updated*
*Title:* {document title}
*New Version:* v{n+1} (was v{n})
*Updated by:* {who}
*Changes:* {count} feedback items applied
*Path:* `docs/{slug}/v{n+1}/index.md`
```

### Document Updated (In-Place Edit)

```
:pencil2: *Document Edited In-Place*
*Title:* {document title} v{n}
*Edited by:* {who}
*Changes:* {count} minor items (typos, clarifications)
*Path:* `docs/{slug}/v{n}/index.md`
```

### Document Approved

```
:white_check_mark: *Document Approved*
*Title:* {document title} v{n}
*Approved by:* {who}
*Date:* {date}
```
