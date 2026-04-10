# Multi-Plan Field Inventory: Company-Level Impact Analysis

**Date:** 2026-04-06 (updated 2026-04-07 with developer answers)
**Context:** Bagas Review Issue #9, reframed
**Status:** Working draft — incorporates Jeff's feedback and 2026-04-07 developer working session. HubSpot audit still required.

> **2026-04-07 update:** All developer questions H17–H22 have been resolved. See [`../reviews/review_2026-04-07_devs.md`](../reviews/review_2026-04-07_devs.md) for the full session notes. Key corrections in this doc: B2B/B2C is defined by **plan type, not dollar amount**; deactivation logic is **split by B2B vs B2C**; per-plan login/license tracking is feasible for **all plan types**, not enterprise only.

---

## Problem Statement

The spec assumes a 1:1 relationship between a HubSpot Company and a deal/subscription. In the new architecture, a single system (e.g., stanford.digication.com) can have multiple plans and multiple deals simultaneously — an enterprise plan, a department subscription, individual purchases, etc.

This breaks company-level fields that were designed for the 1:1 world. This document inventories every company-level field, assesses the multi-plan impact, and proposes a strategy for each.

**What this is NOT about:** Multiple Campus systems mapping to one HubSpot Company. Separate systems (stanford.digication.com vs. stanfordmedical.digication.com) are separate HubSpot Companies. No aggregation needed between them.

### B2B vs B2C Revenue Model

A key insight from Jeff: Digication effectively serves both B2B customers (Digication-managed enterprise plans) and B2C customers (self-signup individual or group plans). These have fundamentally different characteristics:

> **2026-04-07 correction:** B2B vs B2C is defined by **plan type**, not dollar amount. The earlier framing around a "$1,000 threshold" was incorrect. The classifier is the *origin and management model*:
> - **B2B (Enterprise)** = any **Digication-managed plan**, regardless of price. Includes pilots (free or reduced-price Digication-managed deals — see Pilot section in v3 spec).
> - **B2C (Self-Signup)** = any **individual or group plan** signed up for and managed by the user themselves through self-serve checkout.
>
> A $30 self-signup is B2C. A free pilot is B2B. The plan-type rule is what determines tier, applies the deactivation logic (see Deactivation section), and feeds the revenue/health summary fields.

| | B2B (Enterprise / Digication-Managed) | B2C (Self-Signup) |
|---|---|---|
| **Origin** | Created/managed by Digication staff | Self-serve checkout, user-managed |
| **Typical deal size** | $1,000–$50,000+ (but pilots can be $0) | ~$30 per user |
| **Renewal confidence** | High — relationship-based, contractual | Low — no way to predict if a $30 user renews |
| **Revenue predictability** | Stable, forecastable | Volatile, percentage-based estimates |
| **Overdue urgency** | High — large revenue at risk | Low — individual non-payment is expected churn |
| **Auto-deactivation when all deals lapse?** | **No** — sales agent decides case-by-case | **Yes** — Campus auto-deactivates B2C-only systems |

This distinction shapes how summary fields and reports should be designed. Aggregating B2B and B2C revenue into a single number obscures more than it reveals.

---

## Field Categories

Each field falls into one of three source categories:

| Category | Description | Multi-plan impact |
|---|---|---|
| **Campus system-level** | Synced from Campus; reflects the whole system, not a specific plan | Generally unaffected — these are already system-wide metrics |
| **Deal-derived** | Computed from deal data; rolled up to company level | **Most affected** — the 1:1 assumption breaks here |
| **Manual/static** | Set by staff or auto-set once | Generally unaffected |

---

## Inventory: Company Properties (Proposed in Spec)

### Auto-Computed Status Fields

| Field | Source | Old assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|---|
| `customer_tier` | Deal-derived | One deal type determines tier | A company could have Enterprise + Self-Signup deals simultaneously | **Change to multi-select.** Drop the "Hybrid" single value. Instead, show all active deal types (e.g., "Enterprise, Self-Signup"). HubSpot supports multi-select, and filtering/reporting should work. Simpler and more transparent than a synthetic value. |
| `lifecycle_stage_new` | Deal-derived | One lifecycle per company | If ANY deal is active, company = Active Customer — even if 95% of revenue churned | **Keep single-value, but supplement with revenue context.** A company with one $30 active deal is technically "Active Customer" but operationally different from one with $50K. Lifecycle alone can't capture this. The solution is deal-level reporting for revenue health, not trying to encode revenue significance into lifecycle. See Reporting section below. |
| `system_state` | Campus system | One system = one state | No impact — system state is about the system, not plans | **No change needed.** |
| `deactivation_reason` | Campus system | One reason per system | No impact | **No change needed.** |
| `lifecycle_is_override` | Campus (manual) | One override per company | No impact — overrides are at the company level | **No change needed.** |
| `primary_system_type` | Campus system | One system type | No impact (this is about the system, not plans) | **No change needed.** |
| `duplicate_review_flag` | Auto (domain match) | N/A | No impact | **No change needed.** |
| `last_synced_date` | Campus sync | N/A | No impact | **No change needed.** |

> **Jeff's feedback on `customer_tier` and `lifecycle_stage_new`:** These are the "keep but supplement" fields. Jeff needs more context on how they're currently being used before deciding the exact supplemental strategy. **Action: Jeff and Amanda to review current usage of these fields in HubSpot reports and workflows before finalizing.**

### Trial Fields

> **2026-04-07 dev resolution (H17):** Trials are correctly system-level in Campus today and should stay there. The earlier worry about per-plan trials was based on conflating two distinct concepts: **trials** (self-serve, automated) and **pilots** (sales-led, free or reduced-price Digication-managed plans). Pilots are *not* trials — they are real B2B deals modeled in the deal pipeline at $0 or reduced cost. See the Pilot section in v3 spec for details.

| Field | Source | Old assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|---|
| `trial_active` | Campus system | One trial per system | **No impact** — trials are self-serve only, system-level | **No change needed.** |
| `trial_status` | Campus system | Same | **No impact** | **No change needed.** |
| `trial_start_date` | Campus system | Same | **No impact** | **No change needed.** |
| `trial_end_date` | Campus system | Same | **No impact** | **No change needed.** |
| `trial_extension_count` | Campus system | Same | **No impact** | **No change needed.** |

**Pilots (B2B) are NOT trials.** A pilot is a real Digication-managed deal in the deal pipeline (typically zero or reduced price), governed by the same rules as any other enterprise deal. Pilots are tracked through deal-level fields, not trial fields. Example: AAC's 6-month free pilot is a real Enterprise deal with `price_per_license = 0`, not a trial.

### Legacy Field

| Field | Source | Old assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|---|
| `sales_status` | Campus (being retired) | One status per company | N/A — being retired | **Retire as planned.** |

---

## Inventory: Company Properties (Likely Existing in HubSpot Today — NEEDS AUDIT)

The spec mentions that Campus syncs "company data, usage stats" to HubSpot (Section 1.3) but does not enumerate the specific usage fields. These fields almost certainly exist in HubSpot today and are affected by this analysis.

**ACTION REQUIRED: Audit HubSpot Company properties to identify all fields currently synced from Campus.** This is part of the broader HubSpot field audit project (see Jeff & Amanda Tasks below). The fields below are educated guesses based on what the spec, reviews, and migration rules reference. The actual list may be larger.

> **Jeff's feedback on system-level fields:** Users (total/active/logged-in) confirmed as system-level and unaffected. Storage is uncertain — it sounds useful but may never have been implemented or used. Activity metrics are probably fine if they fall under system stats. **Action: Verify during HubSpot audit which of these fields actually exist and are in use.**

| Field (estimated) | Source | Old assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|---|
| Total users / active users | Campus system | System-wide count | **No impact** — system-level metric | **No change needed.** Confirmed by Jeff. |
| Users logged in (30/60/365 days) | Campus system | System-wide count | **No impact** — system-level | **No change needed.** Confirmed by Jeff. |
| Users in current subscription period | Campus + deal | Assumes one subscription period | **Breaks.** With multiple plans, there is no single "current subscription period." | **Retire at company level.** See Open Questions #1 for full discussion. |
| Storage used | Campus system | System-wide | **Uncertain** — may not be in use | **Verify during HubSpot audit.** Jeff is unsure this field exists or is being used. If it exists and is system-level, no change needed. If unused, retire it. |
| Portfolio count | Campus system | System-wide | No impact | **No change needed** (pending audit confirmation). |
| Page views / activity metrics | Campus system | System-wide | No impact if under system stats | **No change needed** (pending audit confirmation). |
| `total_active_paid_users` | Campus + billing | References "paid users" across the system | **Unaffected** at system level — counts all paid users regardless of plan | **No change needed** for the aggregate. Plan-level breakdown would be a Campus feature, not a HubSpot field. |

### Deal-Derived Fields (Existing in HubSpot — Need B2B/B2C Treatment)

These fields break in a multi-plan world AND need the B2B vs B2C lens:

| Field (estimated) | Source | Old assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|---|
| ARR / annual recurring revenue | Deal-derived | Sum of one deal | Must sum across all active deals | **Split into B2B and B2C.** See ARR section below. |
| Current FY revenue | Deal-derived | One deal in current FY | Same as ARR | **Split into B2B and B2C.** Same logic as ARR. |
| Contract value | Deal/contract | One contract | Multiple contracts possible | **Split by segment.** Enterprise contracts are real contractual commitments. Individual subscriptions aren't contracts in the traditional sense. Summing them conflates different things. |
| License count | Deal-derived | One license deal | Enterprise = 500, individual = 1 | **Move to deal-level reporting.** Summing (501 licenses) is misleading — conflates very different things. |
| License start date | Deal-derived | One start date | Multiple start dates | **Move to deal-level reporting.** "Earliest start" doesn't answer any useful question. |
| License end date | Deal-derived | One end date | Multiple end dates | **Move to deal-level reporting.** "Latest end" is misleading as "subscription end." |
| Plan name | Campus | One plan | Multiple plans | **Move to deal-level reporting.** |
| Billing cycle | Deal-derived | Annual or Monthly | Could have both simultaneously | **Move to deal-level reporting.** |
| Paid status | Deal-derived | One status | One plan could be Paid, another Overdue | **Move to deal-level reporting.** |

### ARR Complexity: Why a Simple Sum Misleads

Consider a real scenario: A school's fiscal year runs July 1 – June 30.
- Enterprise plan: $40,000/year, starts September 1, ends August 31
- Group plan: $2,000/year, starts January 1, ends December 31
- 15 individual plans: $30 each, various start dates

If you query "ARR" on March 1:
- All plans are active → ARR = $42,450
- If you query again on September 15 and 5 individuals didn't renew → ARR = $42,300
- The $150 drop is noise, but it changes the number

More importantly: the $40,000 enterprise piece is highly likely to renew (contractual relationship). The $450 in individual plans? No way to predict. Mixing them into one ARR number overstates revenue confidence.

**Proposed approach:** Split ARR into segments so each can be evaluated on its own terms:
- `enterprise_arr` — sum of ARR from **Digication-managed** (Enterprise) deals, regardless of price. Includes pilots at $0.
- `self_signup_arr` — sum of ARR from **self-signup** (individual / group) deals
- `total_arr` — the combined number, available if needed, but not the primary metric

The same logic applies to FY revenue and contract value.

> **2026-04-07 dev note:** These summary fields are likely implementable as **HubSpot rollup fields** computed from the deal-level data, which means devs may not need to build them in Campus at all. Jeff & Amanda to verify in HubSpot which can be rollups vs. requiring Campus-side support, and report back to devs only if Campus changes are needed.

---

## Inventory: Contact Properties

| Field | Source | Multi-plan impact | Proposed strategy |
|---|---|---|---|
| `total_lifetime_spend` | Deal-derived (via contact-deal association) | **Works correctly** — sum of all deals associated with the contact, regardless of how many plans exist | **No change needed.** (Dependency: every deal must be associated with a contact — already documented.) |
| `current_fy_spend` | Deal-derived | Same as above | **No change needed.** |
| `sales_role` | Manual + auto | No impact — roles are per-contact | **No change needed.** |
| `operational_role` | Manual + auto | No impact | **No change needed.** |
| `purchase_intent_level` | Auto from billing | No impact — tracks the contact's most recent purchase intent | **No change needed.** |

---

## Inventory: Reporting Fields (Section 5)

These aren't stored fields but are derived in reports. They're affected because reports currently assume company-level aggregation.

| Report | Current assumption | Multi-plan impact | Proposed strategy |
|---|---|---|---|
| Total ARR by Customer Tier | One deal per company | ARR sum works, but tier could shift when one plan churns | **Split by B2B/B2C.** Report enterprise ARR and self-signup ARR separately. The combined number is available but should not be the primary view. |
| New vs. Renewal ARR | One deal is either new or renewal | A company could have a new individual deal and a renewal enterprise deal simultaneously | **Report at deal level, not company level.** |
| At-Risk Renewals | One license_end_date to check | Multiple end dates | **Report at deal level.** Flag each deal approaching expiration. For enterprise deals, this is high-priority. For individual subscriptions, this is informational. |
| Adoption Metrics | System-level usage correlated with deal value | Usage is system-wide; can't attribute to specific plans | **Correlation is weaker but still useful** at the system level. Acknowledge that "high usage + low revenue" could mean enterprise churned but individuals remain. |
| Self-Signup Funnel | Pipeline stages per company | A company could have deals in multiple pipeline stages | **Report at deal level** through the Self-Signup Pipeline. |

---

## Summary: What Changes

| Strategy | Fields affected | Action | Status |
|---|---|---|---|
| **No change needed** | User counts (total, active, logged in), `total_active_paid_users`, system state fields, contact spend fields | System-wide or contact-specific — multi-plan doesn't affect them | Confirmed by Jeff (user fields). Others pending HubSpot audit. |
| **Verify during audit** | Storage, portfolio count, page views/activity | Jeff unsure if these exist or are in use | Pending HubSpot audit |
| **Split into B2B / B2C** | ARR, FY revenue, contract value | Simple sum misleads — enterprise and self-signup revenue have different renewal confidence and predictability | New approach — see ARR section and summary fields below |
| **Move to deal-level reporting** | License count, license dates, plan name, billing cycle, paid status, new/renewal status | Stop showing these at company level. Rebuild reports to use deal-level data. | Confirmed by Jeff. Report rebuild is part of HubSpot project. |
| **Change to multi-select** | `customer_tier` | Drop "Hybrid" value; show all active tiers (Enterprise, Self-Signup, etc.) | Decision made by Jeff |
| **Keep but supplement** | `lifecycle_stage_new` | Single value still useful for broad segmentation; supplement with deal-level revenue context | Jeff needs to review current usage before finalizing |
| **Move to deal level (trial)** | `trial_active`, `trial_status`, `trial_start_date`, `trial_end_date`, `trial_extension_count` | May need to move if trials can be per-plan, not just per-system | Pending developer input |
| **Add new summary fields** | See Proposed Summary Fields section below | Lightweight aggregates with B2B/B2C split | New approach |
| **Retire at company level; replace with deal-level metric** | "Users in current subscription period" | No longer meaningful at company level. Proposed: deal-level `enterprise_logins_in_period` for enterprise deals only. | Decision made — developer must verify feasibility. See Open Questions #1. |
| **Needs HubSpot audit** | Unknown existing fields | Must audit HubSpot to complete this inventory | Part of Jeff & Amanda HubSpot project |

---

## Proposed New Company-Level Summary Fields

These replace the deal-derived fields that can no longer live at the company level as single values. They include a B2B/B2C split where the distinction changes how you'd act on the data.

### Revenue Summary (B2B / B2C split)

| Field | Type | Logic | Purpose |
|---|---|---|---|
| `enterprise_arr` | Currency | Sum of annualized revenue from Enterprise-tier active deals | Forecastable revenue — high renewal confidence |
| `self_signup_arr` | Currency | Sum of annualized revenue from Self-Signup-tier active deals | Volatile revenue — renewal is uncertain |
| `total_arr` | Currency | `enterprise_arr` + `self_signup_arr` | Available for total view, but not the primary metric |
| `enterprise_fy_revenue` | Currency | Sum of Enterprise-tier deal revenue in current fiscal year | B2B revenue for the fiscal period |
| `self_signup_fy_revenue` | Currency | Sum of Self-Signup-tier deal revenue in current fiscal year | B2C revenue for the fiscal period |
| `enterprise_contract_value` | Currency | Sum of active Enterprise contract values | Real contractual commitments |

### Plan & Health Summary (B2B / B2C split where it matters)

| Field | Type | Logic | Purpose |
|---|---|---|---|
| `active_plan_count` | Number | Count of active deals (using the active deal definition from Section 2.4.2) | Total subscriptions at a glance |
| `enterprise_plan_count` | Number | Count of active Enterprise-tier deals | How many enterprise relationships |
| `self_signup_plan_count` | Number | Count of active Self-Signup-tier deals | Volume of individual/group subscriptions |
| `has_overdue_enterprise_deal` | Boolean | True if any Enterprise-tier deal has `paid_status = Overdue` | **High-priority alert** — large revenue at risk, finance should act |
| `has_overdue_deal` | Boolean | True if any deal has `paid_status = Overdue` | General flag — includes self-signup overdue (informational, not urgent) |
| `next_expiring_enterprise_date` | Date | Earliest `license_end_date` among active Enterprise deals | Enterprise renewal alerting — this is the one that matters for revenue |
| `next_expiring_deal_date` | Date | Earliest `license_end_date` among all active deals | General awareness — when is the next thing expiring |
| `highest_deal_tier` | Enumeration | Enterprise > Self-Signup among active deals | Quick indicator of the company's highest-value relationship |

### Plan Adoption (Deal-Level — applies to ALL plan types)

> **2026-04-07 dev resolution (H18):** Devs confirmed Campus can track logins **and** licenses granted on a **per-plan (per-deal) basis** for all plan types, not just enterprise. This is broader than originally proposed. Schools with three plans get three independent counts. Periods supported: in-period (the deal's start–end window) plus rolling 30 / 60 / 90 / 365-day windows. Deal-level numbers can be rolled up to the company level if needed.

| Field | Type | Level | Logic | Purpose |
|---|---|---|---|---|
| `plan_licenses_granted` | Number | **Deal** | Licensed user count from the deal | The denominator — what was purchased |
| `plan_logins_in_period` | Number | **Deal** | Count of unique users who logged in during the deal's subscription period AND are associated with the plan | Adoption during the actual license window |
| `plan_logins_30d` / `60d` / `90d` / `365d` | Number | **Deal** | Rolling-window login counts scoped to the plan | Recent activity trends |
| `plan_adoption_pct` | Percentage | **Deal** | `plan_logins_in_period / plan_licenses_granted` | At-a-glance adoption health: 90% = healthy, 30% = at risk of non-renewal |

**Why track for all plan types, not just enterprise:** The original "$30 individual subscribers don't need adoption tracking" framing was correct *for individuals*, but a school with a 200-seat group plan absolutely cares whether anyone is using it. Tracking per-plan covers both enterprise and group plans cleanly with one mechanism. The fields exist on every deal; whether to *report* on them is a separate decision.

### Why not split everything?

Some fields don't need a B2B/B2C split because you'd act on them the same way regardless:
- `active_plan_count` (total) — useful as a quick "how many things are going on" number
- `has_overdue_deal` (any) — the enterprise-specific flag handles urgency; this is a catch-all
- `next_expiring_deal_date` (any) — useful for general calendar awareness
- `highest_deal_tier` — already captures the B2B/B2C distinction in a single field

---

## Open Questions (Updated with Jeff's Answers)

### 1. "Users in current subscription period" — RESOLVED 2026-04-07

**Final decision:** Retire the field at the company level. With multiple plans running on different schedules, "current subscription period" has no single meaning. Replace with **per-plan (deal-level)** login and license tracking — see "Plan Adoption" fields above.

**Dev confirmation:** Devs can track logins **and** licenses granted at the deal level for **all plan types** (not just enterprise). Periods supported: in-period (deal start–end window) plus rolling 30 / 60 / 90 / 365-day windows. Deal-level numbers can be rolled up to the company level if useful.

**Why broaden beyond enterprise:** A school with a 200-seat group plan absolutely cares whether anyone is using it. Tracking per-plan covers enterprise and group plans cleanly with one mechanism. Individual self-signups still don't need the metric in practice, but the field exists on every deal.

**System-level metrics remain unaffected:** Total users, active users, users logged in (system-wide) stay where they are — they answer "how active is this system?" without trying to tie activity to a specific plan period.

### 2. Should `customer_tier` allow multi-select? — DECIDED: Yes

**Decision:** Change `customer_tier` to a multi-select field. A company with both an enterprise deal and self-signup users would show "Enterprise, Self-Signup" rather than "Hybrid."

**Impact:** Drop the "Hybrid" value from the enumeration. HubSpot supports multi-select filtering and reporting. This is more transparent and maps directly to what's actually happening.

**Spec update needed:** Section 2.4 (auto-computation logic) needs to reflect that `customer_tier` is now a multi-select populated from the set of active deal types, not a priority-based single value.

### 3. What other fields exist in HubSpot today? — Part of HubSpot audit project

**Status:** Jeff and Amanda are running a separate HubSpot field audit project. There are hundreds of Company fields, many unused or duplicated. That project will clean up fields, deduplicate data, and identify additional fields that need to be brought into this specification.

**This analysis cannot be fully completed until the audit surfaces the real field list.** The inventory above covers fields referenced in the spec; the actual list is almost certainly larger.

### 4. Report rebuild scope — Part of HubSpot audit project

**Status:** Moving 11+ fields to deal-level reporting means existing company-level reports and dashboards will break. The report rebuild is part of the broader HubSpot project. Jeff and Amanda will inventory current reports/dashboards affected and track the rebuild work.

---

## Jeff & Amanda: HubSpot & Reporting Tasks

This section tracks work that Jeff and Amanda will do in parallel with the developer implementation. These tasks involve HubSpot configuration, field management, and reporting — not code changes.

### Field Audit & Cleanup

| # | Task | Priority | Status | Notes |
|---|---|---|---|---|
| H1 | Export full HubSpot Company property list | High | Not started | Needed to complete this field inventory |
| H2 | Export full HubSpot Deal property list | High | Not started | Needed to identify deal-level fields in use |
| H3 | Identify unused Company fields for retirement | Medium | Not started | Part of broader cleanup project |
| H4 | Identify duplicate/overlapping fields | Medium | Not started | Part of broader cleanup project |
| H5 | Review current usage of `customer_tier` in reports/workflows | Medium | Not started | Needed before finalizing the "supplement" strategy |
| H6 | Review current usage of `lifecycle_stage_new` in reports/workflows | Medium | Not started | Same as above |
| H7 | Verify whether storage, portfolio count, and activity fields exist and are in use | Medium | Not started | Jeff unsure if these were ever implemented |
| H7b | Reconcile Sam's existing Contracts pipeline fields with the new Campus contract model | High | Not started | Map what Sam built in HubSpot to the proposed Campus contract data model (Section 2.7). Identify gaps in either direction. |

### Field Configuration Changes

| # | Task | Priority | Status | Depends on |
|---|---|---|---|---|
| H8 | Change `customer_tier` from single-select to multi-select | High | Not started | Decision made — drop "Hybrid," allow multiple values |
| H9 | Create new B2B/B2C summary fields (see Proposed Summary Fields) | High | Not started | H1 (need full field list first to avoid duplicates) |
| H10 | Retire "Users in current subscription period" at company level | Medium | Not started | Decision made |
| H11 | Retire `sales_status` field | Medium | Not started | After migration completes |

### Report & Dashboard Rebuild

| # | Task | Priority | Status | Depends on |
|---|---|---|---|---|
| H12 | Inventory all existing company-level reports/dashboards | High | Not started | Needed to scope the rebuild |
| H13 | Identify which reports break when fields move to deal-level | High | Not started | H12 |
| H14 | Rebuild ARR reports with B2B/B2C split | High | Not started | H9 (new fields must exist first) |
| H15 | Rebuild renewal/at-risk reports at deal level | Medium | Not started | Developer work on deal-level data |
| H16 | Rebuild adoption/usage correlation reports | Low | Not started | Existing reports may still work at system level |

### Developer Questions — RESOLVED in 2026-04-07 dev session

> Full session notes: [`../reviews/review_2026-04-07_devs.md`](../reviews/review_2026-04-07_devs.md)

| # | Question | Status | Resolution |
|---|---|---|---|
| H17 | Can trials be per-plan or only per-system? | **Resolved** | Trials stay system-level (self-serve only). New "Pilot" concept introduced for B2B free/reduced plans — pilots are real Digication-managed deals, not trials. |
| H18 | Can Campus distinguish enterprise-plan users from individual-plan users at query time? | **Resolved** | Yes, and broader than asked: per-plan login + license tracking is feasible for **all plan types**. Both `plan_licenses_granted` and `plan_logins_in_period` (plus rolling windows) are supported at the deal level. Can roll up to company. |
| H19 | What fields does Campus currently sync to HubSpot? | **Resolved (analysis pending)** | Devs maintain a tracking spreadsheet (`Campus _ Hubspot integration fields.xlsx`). Cross-reference with this inventory in a follow-up session. |
| H20 | Pre-deactivation safety check in Campus UI? | **Resolved** | Not required as a hard feature. For B2B systems, the education team owns manual lookup before deactivating. Jeff is comfortable with either (A) team responsibility or (B) Campus showing existing plans on the deactivation screen — leans toward (A). Not blocking. |
| H21 | Can Campus detect zero-active-deal systems? | **Resolved** | Yes for **B2C-only** systems (Campus auto-deactivates them). **Not needed** for systems with any B2B presence — those are handled by sales agents through an internal Digication process, not a Campus feature. |
| H22 | Auto-deactivation for single-plan systems worth automating? | **Resolved** | Yes for B2C-only. No for anything with B2B presence. The classifier is plan type, not plan count. |

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-06 | Initial draft |
| 2026-04-06 | Incorporated Jeff's feedback: B2B/B2C revenue model, trial fields review, customer_tier → multi-select, retire subscription period field, added Jeff & Amanda task tracking section |
| 2026-04-06 | Added enterprise adoption metrics (enterprise_logins_in_period), contract reconciliation task (H7b), deactivation developer questions (H20–H22) |
| 2026-04-06 | Revised subscription period decision: retire at company level but propose deal-level `enterprise_logins_in_period` metric for enterprise adoption tracking. Added Enterprise Adoption fields. Developer question H18 updated. |
| 2026-04-07 | Incorporated 2026-04-07 dev session decisions: B2B/B2C now defined by plan type (Digication-managed vs self-signup), not dollar amount. Deactivation logic split: B2C-only auto-deactivates, any B2B presence stays manual. Trials confirmed system-level; new Pilot concept added (pilots are real B2B deals, not trials). Per-plan login/license tracking confirmed for all plan types — `enterprise_logins_in_period` generalized to `plan_logins_in_period`. B2B/B2C summary fields likely become HubSpot rollups. Dev questions H17–H22 all resolved. See `../reviews/review_2026-04-07_devs.md` for full session notes. |
