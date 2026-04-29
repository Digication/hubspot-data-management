# Ticket Object Quick Assessment

**Date:** 2026-04-10
**Total Properties:** 107
**Total Records:** 0

---

## Summary

The Ticket object is **completely unused**. Zero records exist.

All 107 properties are HubSpot system defaults (all prefixed with `hs_` or standard ticket fields). There are **no custom properties** — only the standard HubSpot ticket fields (pipeline stages, SLA tracking, feedback scores, agent metrics, etc.).

## Properties Breakdown

- **Standard HubSpot fields:** subject, content, closed_date, createdate, source_type, last_reply_date, etc.
- **Pipeline tracking:** Support Pipeline with 4 stages (New, Waiting on contact, Waiting on us, Closed)
- **SLA/metrics:** Time to close, time to first response, CX scores, sentiment analysis
- **Activity tracking:** Last activity, last contacted, number of touches

## Recommendation

No action needed. The Ticket object can be ignored for the CRM cleanup project. If Digication decides to use HubSpot for ticketing in the future (currently using Zendesk), the default schema is clean and ready.
