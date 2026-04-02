# User Notifications Spec

## Overview

This spec describes how the Digication platform sends notifications to users — including in-app alerts, email digests, and push notifications for portfolio activity.

## Goals

- Let users know when someone comments on or views their portfolio
- Support in-app, email, and (future) push channels
- Give users control over which notifications they receive
- Keep delivery reliable without overwhelming users

## Non-Goals

- Real-time chat or messaging between users
- Admin/system broadcast notifications (separate system)

## Technical Design

### Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| `portfolio.viewed` | Someone views your portfolio | In-app |
| `portfolio.comment` | Someone comments on your work | In-app, Email |
| `portfolio.shared` | Your portfolio is shared | In-app, Email |

### Delivery Architecture

Notifications are queued via a background job worker. Each notification:

1. Is written to the `notifications` table with `status: pending`
2. Picked up by the worker every 30 seconds
3. Delivered to the appropriate channel(s)
4. Marked `status: delivered` or `status: failed`

### Retry Policy

If delivery fails, the worker retries up to **3 times** with exponential backoff (30s, 2m, 10m). After all retries are exhausted, the notification is marked `status: dead` and no further attempts are made. Dead notifications are surfaced in the admin dashboard for manual inspection.

### User Preferences

Users can toggle notification types on/off per channel via Settings > Notifications. Preferences are stored in `user_notification_preferences` table.

## Decisions

- **Email delivery:** Send immediately (no batching). Daily digest may be revisited as a future enhancement.

## Open Questions

- What's the retention policy for old notifications in the database?
