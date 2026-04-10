# Review: Sales & Billing Architecture v2 + v3 — Developer Session Summary

**Reviewer:** Dev Team (prep by Jeff Yan)
**Date:** 2026-04-09
**Type:** Technical
**Scope:** Pre-meeting summary of all changes since last developer session, remaining issues, and next steps

---

## Changes Since Last Developer Session

### 1. Ali Review of v3 (2026-04-08)

Ali reviewed the full v3 spec and identified 11 findings (2 high, 5 medium, 4 low). See `review_2026-04-08_ali.md` for details.

**6 of 11 findings have been applied to the spec:**

| # | Title | Priority | Status |
|---|-------|----------|--------|
| 1 | Override to Past Customer — cascading side effects | HIGH | Applied. Added "Force Churn Workflow" to Section 2.4.5. |
| 4 | Conflicting deal data flow direction | HIGH | Applied. Added Deal Data Ownership Model table to Section 2.5.2. |
| 2 | No path from Past Customer back to Prospect | MEDIUM | Applied. Added 2-year decay rule to Section 2.4.3. |
| 3 | `trial_active` redundant with `trial_status` | MEDIUM | Applied. Removed `trial_active` throughout; rewritten to use `trial_status IN (Active, Extended)`. |
| 5 + 10 | HubSpot-only data + post-migration HubSpot role | MEDIUM | Applied. Combined into new Section 2.9 "Sync Inventory" and Section 2.10 "Post-Migration System Responsibilities". |

### 2. Developer Working Session Decisions (2026-04-07)

Resolved all 6 open technical questions (H17–H22) from the multi-plan field inventory. Full notes in `v2/reviews/review_2026-04-07_devs.md`.

Key decisions:

1. **B2B vs B2C** defined by plan type (Digication-managed vs self-signup), not dollar amount
2. **Multiple Education Managed Plans** per system supported — data model must not assume 1:1
3. **Deactivation split** — B2C-only systems auto-deactivate; any B2B presence stays manual
4. **`customer_tier`** becomes multi-select; "Hybrid" value dropped
5. **Trials** stay system-level; **Pilots** are a new concept — real B2B deals at $0/reduced price (not trials)
6. **Per-plan login/license tracking** confirmed feasible for all plan types (not just enterprise)
7. **New sync rule** — sync deals where `license_start_date ≤ today ≤ license_end_date` AND not Closed Lost (replaces `sales_status`-based sync)
8. **Deal-derived fields** (license count, dates, plan name, billing cycle, etc.) move from company to deal level
9. **B2B/B2C summary fields** likely become HubSpot rollups, not Campus dev work
10. **Closed deal = money received** — B2B closing is manual (staff updates `paid_status`); B2C closing is automatic (Stripe webhook)

### 3. Contact Creation & Deal Association (2026-04-07)

New analysis doc: `v2/analysis/contact-creation-and-association.md`. Resolves Bagas Issues #5 and #6.

Headlines:

- **Deal-contact association is now mandatory** (was not done before)
- **B2C deals:** attach the buyer as single contact with "Self-Pay Buyer" role
- **B2B deals:** pull all company-level contacts by role (Primary, Renewal, Decision Maker, Accounts Payable, Billing, Tax Exemption) at deal creation
- **Freemail exclusion** refined — suppresses domain-match check only; personal-email signups for new institutions still valid
- **Contact lifecycle** stays as-is — reports filter through company/deal state
- **Historical deal import** deferred indefinitely

---

## Outstanding Issues

### Ali Review — 5 Remaining (Medium/Low)

| # | Title | Priority | What's Needed |
|---|-------|----------|---------------|
| 7 | `billing_grace_mode` too blunt | MEDIUM | Convert boolean to `billing_grace_days` integer (self-expiring). Update Sections 2.4.2, 2.6, Appendix A. |
| 8 | Multi-year contract pricing gap | MEDIUM | Document one-deal-per-year model linked by `contract_reference_id`. Add to Section 2.7. |
| 6 | Group plan not in Deal Type list | LOW | One-line clarification in Section 2.6: "Self-Signup License covers Individual and Group, differentiated by `plan_tier`." |
| 9 | `system_type` missing event/seminar | LOW | Clarifying note in Section 2.2. Likely: event systems are production with short lifecycle, not a separate type. |
| 11 | `lifecycle_is_override` missing from v3 | LOW | Already in Section 2.9.1; still needs addition to Section 2.4.5 and Appendix A. |

### Contact Model — Open Items

1. **Final name for "Self-Pay Buyer" role** — confirm exact field value before implementation
2. **HubSpot API batch association labels** — verify API can write multiple deal-contact links with distinct labels in one operation
3. **Contact role monitoring** — how to track whether company-level contact roles stay up to date

### HubSpot Audit — Jeff & Amanda Tasks

| Task | Priority |
|------|----------|
| Export full HubSpot Company & Deal property lists | HIGH |
| Identify unused/duplicate fields | MEDIUM |
| Change `customer_tier` to multi-select | HIGH |
| Create new B2B/B2C summary fields | HIGH |
| Inventory all existing company-level reports/dashboards | HIGH |
| Rebuild ARR reports with B2B/B2C split | HIGH |
| Rebuild renewal/at-risk reports at deal level | MEDIUM |
| Reconcile existing Contracts pipeline with new Campus contract model | HIGH |

### Spec Maintenance

- **Amendments block** at top of `v3/index.md` is authoritative for developer session decisions, but the full spec body has not been rewritten to match
- Risk of inconsistency between amendments and spec body text
- Recommend full rewrite or detailed mapping of amendments to affected sections

---

## Key Architectural Changes (Quick Reference)

| Change | Before | After |
|--------|--------|-------|
| Sync trigger | `sales_status` field | Deal date range valid + not Closed Lost |
| Customer tier | Single value with "Hybrid" | Multi-select showing all active deal types |
| B2C deactivation | Manual | Auto-deactivate when all deals closed |
| B2B deactivation | Manual | Stays manual (any B2B presence) |
| Contact-deal association | Not done | Mandatory — every deal gets contacts |
| Pilots | Not modeled | Real B2B deals at $0/reduced price |
| Deal-derived fields | Company level | Deal level |
| Revenue reporting | Single ARR | Split: `enterprise_arr` + `self_signup_arr` |
| Login/license tracking | Enterprise only | All plan types |
| Historical deals | Assumed importable | Deferred indefinitely |
