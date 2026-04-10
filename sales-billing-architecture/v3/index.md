**Sales & Billing Architecture**
**Specification Document**

Version 3.0 | April 1, 2026
Prepared for Jeff Yan, Digication

*v3: Adds migration rules engine (Sections 3.3–3.6), replacing the manual spreadsheet approach with rules-based migration for ~7,500 Campus systems*

> ## 📋 Amendments from 2026-04-07 Developer Session
>
> The following decisions from the [2026-04-07 developer working session](../v2/reviews/review_2026-04-07_devs.md) override the relevant sections of this spec. The full spec text below has not yet been rewritten — treat this amendments block as authoritative until the body is updated.
>
> 1. **B2B vs B2C is defined by plan type, not dollar amount.** B2B = any **Digication-managed plan** (regardless of price, including pilots at $0). B2C = any **self-signup individual or group plan**. References below to a "$1,000 threshold" are obsolete.
>
> 2. **Multiple Education Managed Plans per system are supported.** Campus can technically host more than one enterprise plan on a single system. Discouraged in practice but the data model and computation rules must not assume a 1:1 constraint. Anywhere this spec says "the enterprise plan" (singular), read it as "the set of active enterprise plans."
>
> 3. **Customer Tier — multi-select, not single value.** `customer_tier` is now a multi-select. Drop the **Hybrid** value entirely. A company with both Enterprise and Self-Signup deals shows `["Enterprise", "Self-Signup"]`. Section 2.4.2 rules below must be updated: replace the priority-ordered single-value computation with "compute the set of active deal types."
>
> 4. **Deactivation logic — split by B2B vs B2C presence.**
>    - **B2C-only systems** (system has only ever had self-signup deals, all now closed/lapsed) → **Campus auto-deactivates**. No human review.
>    - **Any B2B presence** (any Digication-managed plan, ever or current) → **no auto-deactivation**. Owned by sales agent / education team via internal Digication process. Not a Campus feature.
>    - Manual deactivation UX for the B2B path is open: either (A) education team looks up plans before deactivating, or (B) Campus shows existing plans on the deactivation screen. Jeff leans (A). Not blocking.
>
> 5. **New deal sync rule — replaces `sales_status`-driven sync.** Sync a deal (and its associated company/contact data) when both: (a) the deal's `license_start_date` ≤ today ≤ `license_end_date`, **and** (b) the deal's pipeline state is **not Closed Lost**. Closed Won is still synced (closing in HubSpot means money received, which usually happens early in the license window). Section 1.3 ("sync uses sales\_status to filter") and the migration steps that talk about sync filtering must be updated.
>
> 6. **Trial fields stay system-level. Pilot is a NEW concept and is NOT a trial.**
>    - **Trial** = self-serve, automated signup. Tracked via system-level trial fields (Section 2.4.4). No change.
>    - **Pilot** = sales-led B2B engagement, given as a real **Digication-managed deal** at $0 or reduced price (e.g., AAC's 6-month free pilot). Modeled as an Enterprise deal in the deal pipeline with `price_per_license = 0` (or reduced). Pilots count as B2B for tier, lifecycle, deactivation, and reporting. They do **not** use the trial fields.
>    - A short Pilot subsection should be added near 2.6 (Deal Architecture) or 2.7 (Contract Management).
>
> 7. **Per-plan login + license tracking is feasible for ALL plan types** (not just enterprise). Devs confirmed Campus can track `plan_licenses_granted` and `plan_logins_in_period` (plus rolling 30/60/90/365-day windows) at the deal level for every plan. The earlier "enterprise-only adoption metric" framing in the field inventory is broadened. Deal-level numbers can be rolled up to the company level.
>
> 8. **Closed-deal semantics (clarification, not a change).**
>    - License `start_date` / `end_date` describe when the license is valid (and may extend beyond, e.g., AI credits).
>    - "Closed" in HubSpot = money received, not contract signed.
>    - **B2B closing:** manual — staff updates `paid_status` in Campus admin when payment lands.
>    - **B2C closing:** automatic — Stripe payment closes the deal via the checkout webhook.
>
> 9. **B2B/B2C summary fields are likely HubSpot rollups, not Campus work.** `enterprise_arr`, `self_signup_arr`, `enterprise_plan_count`, `has_overdue_enterprise_deal`, etc., should be implemented as HubSpot rollup fields computed from the deal-level data. Devs likely don't need to build them in Campus. Jeff & Amanda to verify in HubSpot and report back only if Campus changes are required.
>
> 10. **Field sync inventory.** Devs maintain a tracking spreadsheet of what Campus syncs to HubSpot today (`Campus _ Hubspot integration fields.xlsx`, in Jeff's Dropbox). Cross-reference with the field inventory in a follow-up session.
>
> 11. **Contact creation & deal-contact association — RESOLVED 2026-04-07.** Full decisions captured in [`../v2/analysis/contact-creation-and-association.md`](../v2/analysis/contact-creation-and-association.md). Headlines:
>     - **Mandatory deal-contact association going forward.** Past Digication usage did not associate contacts with deals; new model requires it. This is the foundation that makes contact-level fields (`total_lifetime_spend`, `current_fy_spend`) computable.
>     - **HubSpot association labels** on deal-contact links carry the role (Decision Maker, Renewal Contact, Billing Contact, etc.). Already exists in HubSpot; we just weren't using it.
>     - **B2C flow:** the buyer (paying person) becomes the single contact on the deal. Look up by email; create if missing. New contact role **"Self-Pay Buyer"** (final name TBD) labels them — distinct from formal company-level billing roles. Typically one contact per B2C deal.
>     - **B2B flow:** at deal creation time, Campus pulls all company-level contacts that carry any of these roles — Primary Contact, Renewal Contact, Decision Maker, Accounts Payable, Billing Contact, Tax Exemption — and attaches each one to the deal with the matching association label. One person with multiple roles = one association with multiple labels. Saves significant manual work for sales.
>     - **Bagas Issue #5 (contact spend attribution) — RESOLVED.** Mandatory association makes the math trivial.
>     - **Bagas Issue #6 (freemail exclusion) — REFINED, not blocked.** Personal-email signups for legitimate new institutions ("Jeff Yan's Academy" with `jeff@gmail.com`) are valid and supported. The freemail list suppresses the *domain-match-against-existing-companies check*, not the signup itself. Cross-institution scenarios (Gmail user creating "Boston University - Medical School" or BU email creating the medical school as a separate entity) are all supported by HubSpot's contact-company association model.
>     - **Contact creation triggers:** trial signup, pilot setup, completed checkout, abandoned cart, manual sales entry. Many will end up stranded on closed/lapsed systems — acceptable.
>     - **Contact lifecycle:** no special handling. Reports filter through company/deal state; contact status field stays as-is.
>     - **Historical deal import:** deferred indefinitely. Existing HubSpot deals stay as-is; Campus is source of truth for new deals only. Future cleanup is low priority.
>     - **New contact roles to add to `sales_role` field:** Self-Pay Buyer (B2C buyer), plus the existing Abandoned Cart already in v3 spec. Trial Signup and Pilot Contact optional.
>
> All H17–H22 developer questions from the v2 field inventory are now resolved. Bagas Issues #5 and #6 are resolved. See the linked review file and contact analysis doc for full details.


**Document Purpose**
This document defines the new data architecture for Digication's sales and billing systems, covering the restructured relationship between Digication Campus, HubSpot CRM, Stripe, and QuickBooks. It addresses the transition from the legacy 19-value sales\_status field to a modern, auto-computed model that supports both enterprise (managed) and self-signup sales channels.

**Scope**

* **Company-to-System mapping:** how HubSpot Companies relate to Campus Systems
* **New Company Status model:** replacing the legacy sales\_status field with auto-computed, separated concerns
* **Auto-computation logic:** detailed rules for how Customer Tier, Lifecycle Stage, and Trial Status are computed, including manual override points
* **Integration architecture:** the deal flow reversal (Campus > HubSpot) and sync infrastructure changes
* **Deal architecture:** new deal types, properties, pipelines, and relationship to contracts and invoices
* **Contact roles:** new role taxonomy for the self-signup world
* **Contract tracking:** new first-class contract management in Campus
* **Migration plan:** mapping from the 19 legacy statuses to the new model, with Campus-side and HubSpot-side steps for each phase

# 1. Current State Analysis

## 1.1 Legacy Sales Status Distribution

The current sales\_status field originates in the Campus database and is synced to HubSpot Company records. It is used in Campus to control sync eligibility, system access, and trial logic. It contains 19 possible values. Based on live HubSpot data (not Campus data) as of March 2026:

*Note: These counts reflect HubSpot Company records only. The actual number of Campus systems may differ. Additionally, Campus uses this field for operational logic (e.g., determining which systems sync to HubSpot and which are excluded), so retiring it requires replacing that logic first.*

| Internal Value | Display Label | HS Count | Notes |
| :---- | :---- | :---- | :---- |
| trial\_prospect | Trial (Prospect) | 27 | Active trial prospects |
| trial\_google | Trial (Google Workspace) | 0 | Unused; retire |
| enterprise\_current | Enterprise (Current Customer) | 88 | Core paying enterprise customers |
| enterprise\_sponsor | Enterprise (Sponsor) | 12 | Sponsored enterprise accounts |
| enterprise\_partner | Enterprise (Partner) | 0 | Unused; retire |
| hybrid\_current | Hybrid (Current Customer) | 4 | Enterprise + individual mix |
| individual\_current | Individual (Current Customer) | 1 | Manually managed individual |
| individual\_self\_signup | Individual (Self-signed up) | 1,040 | Largest active segment |
| individual\_google | Individual (Google Workspace) | 451 | Google Workspace sign-ups |
| individual\_past\_enterprise | Individual (Past Enterprise) | 133 | Downgraded from enterprise |
| individual\_prospect | Individual (Prospect) | 454 | Trial-to-individual pipeline |
| deactivated\_past\_customer | Deactivated (Past Customer) | 0 | Unused |
| deactivated\_prospect | Deactivated (Prospect) | 1 | Nearly unused |
| deactivated\_partner | Deactivated (Partner) | 0 | Unused; retire |
| deactivated\_unqualified\_signup | Deactivated (Unqualified) | 0 | Unused |
| deactivated\_internal | Deactivated (Internal) | 0 | Unused |
| deactivated\_duplicate | Deactivated (Duplicate) | 1 | Nearly unused |
| sandbox | Sandbox (Customer) | 0 | Internal value is 'sandbox' |
| internal | Sandbox (Internal) | 0 | Internal value is 'internal' |
| (no value) | (No sales status set) | 2,741 | Majority of records |

## 1.2 Current HubSpot Deal Structure and Pipelines

Deals are distributed across six pipelines:

| Pipeline | Deals | Purpose |
| :---- | :---- | :---- |
| Prospects Pipeline | 1,235 | New business acquisition |
| Renewal Pipeline | 2,449 | Annual renewals |
| RFP Pipeline | (varies) | Formal RFP responses |
| Contracts | (varies) | Contract lifecycle |
| Digi Scholars Pipeline | (varies) | VIP/scholars events |
| Hiring Pipeline | (varies) | Non-sales; recruitment |

Pipeline Restructuring Recommendation: Legacy pipelines should be cleaned up. A new Self-Signup Pipeline is needed for light-touch automated follow-up. Proposed structure:

* **Enterprise Prospects Pipeline:** Managed enterprise sales
* **Self-Signup Pipeline:** Stages: Sign Up > Trial > Cart Activity > Purchased > Renewal Due > Renewed / Churned
* **Renewal Pipeline:** Retained for enterprise renewals
* **Contracts Pipeline:** Retained for contract lifecycle

## 1.3 Current Integration Architecture

Understanding the current data flow is critical for planning the new architecture:

* **Campus > HubSpot (existing):** Campus syncs company data, usage stats, and sales\_status to HubSpot on a periodic batch schedule. The sync uses sales\_status to filter which systems are eligible (deactivated and sandbox systems are excluded). **[2026-04-07 amendment: this is being replaced. Sync is now deal-driven — sync any deal whose `license_start_date ≤ today ≤ license_end_date` AND whose pipeline state is not Closed Lost. Closed Won is still synced. See amendment #5 at the top of this document.]**
* **HubSpot > Campus (existing):** Deal data flows from HubSpot down to Campus in read-only mode. The sales team creates deals in HubSpot, and Campus downloads them for reference.
* **Stripe (WIP):** The new billing system processes self-signup payments through Stripe. This is new infrastructure with no current connection to HubSpot.
* **QuickBooks (none):** There is currently no QuickBooks API integration in the codebase. QuickBooks invoicing will be handled through Cowork's sales agent at the workflow level (see Section 4).

## 1.4 WIP Billing System Entity Mapping

The billing system under development already includes plan management, license allocation, AI credit tracking with expiry, Stripe subscriptions, and invoice records. The following table maps these existing billing entities to the proposed HubSpot deal types. **Developers: please review and complete this mapping with the actual entity/model names from the codebase.**

| Spec Deal Type | Billing System Entity | What Exists | What Needs Wiring |
| :---- | :---- | :---- | :---- |
| Enterprise License | \[Developer: entity name\] | \[Developer: describe current state\] | Push deal to HubSpot on creation; sync license count, dates, pricing |
| Self-Signup License | \[Developer: entity name\] | \[Developer: describe current state\] | Push deal to HubSpot after Stripe checkout completes |
| AI Credits | \[Developer: entity name\] | \[Developer: describe current state\] | Push deal to HubSpot on purchase; balance tracked in Campus only |
| One-Time Fee | \[Developer: entity name\] | \[Developer: describe current state\] | Push deal to HubSpot as part of the same transaction batch |
| Partnership | N/A (manual) | Not in billing system | Created manually in HubSpot by sales team |
| Sponsorship | N/A (manual) | Not in billing system | Created manually in HubSpot by sales team |

# 2. New Architecture

## 2.1 Design Principles

* **Separation of concerns:** Product tier, lifecycle stage, and system state are tracked as independent properties.
* **Auto-computed status:** Company-level status is derived from active deals and plans. No manual updates for standard lifecycle transitions.
* **One deal per transaction type:** Each financial line item is its own deal, linked by a shared transaction reference.
* **Campus as source of truth:** Campus owns system data, contracts, and billing state. HubSpot receives synced data.
* **Domain-based matching:** Self-signup systems create new HubSpot Companies; email domain matching flags duplicates for review.
* **No automated upgrade gating:** Self-signup has no upper limit. Enterprise upgrade is manual on request.

## 2.2 Company-to-System Relationship

**Model: One Company, potentially many Systems**

A HubSpot Company record represents a single institution. That institution may have multiple Campus systems.

* **Production systems:** Sync data to the parent HubSpot Company. A new Campus field 'system\_type' (production/sandbox/internal) determines sync eligibility. This field does not exist today and must be created (see Migration Phase 1). Currently, sync eligibility is inferred from sales\_status.
* **Sandbox systems:** Tracked in Campus only; do not push data to HubSpot.
* **Multi-department institutions:** Remain under one HubSpot Company. Differentiation via Campus plan name field (e.g., 'Department of Engineering').

**Self-Signup Company Creation**

* 1\. New Campus system created automatically.
* 2\. New HubSpot Company always created (never auto-merged).
* 3\. Email domain compared against existing HubSpot Companies.
* 4\. If domain match found, new Company flagged for manual review.
* 5\. Sales team reviews and decides to merge or keep separate.

## 2.3 New Company Status Model

The legacy 19-value sales\_status field is replaced by three independent properties:

**Property 1: Customer Tier (auto-computed)**

**[2026-04-07 amendment: `customer_tier` is now MULTI-SELECT. Drop the "Hybrid" value. A company with both deal types shows `["Enterprise", "Self-Signup"]`. See amendment #3 at the top of this document.]**

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Enterprise | Has at least one active **Digication-managed** deal (any price, including pilots at $0) | enterprise\_current, enterprise\_sponsor, enterprise\_partner |
| ~~Hybrid~~ | ~~Has both Enterprise and Self-Signup active deals~~ **[Removed — use multi-select with both values instead]** | hybrid\_current |
| Self-Signup | Has at least one active **self-signup** (individual or group) deal | individual\_current, individual\_self\_signup, individual\_google |
| Sponsor | Manually tagged; enterprise deal funded by third party | enterprise\_sponsor (manual override) |
| Internal | Manually tagged; Digication-owned system | internal, sandbox |

**Property 2: Lifecycle Stage (auto-computed)**

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Active Customer | Has at least one active (paid, non-expired) deal | All '\*\_current' statuses |
| Prospect | Has contact/signup activity but no closed-won deal | trial\_prospect, trial\_google, individual\_prospect |
| Past Customer | Had deals previously, all now expired/churned | individual\_past\_enterprise, deactivated\_past\_customer |
| Unknown | No deal history, no activity | Companies with no sales\_status |

**Property 2b: Trial Status (separate from Lifecycle Stage)**

Trial is tracked as its own set of properties at the system level in Campus, synced to HubSpot.

| Property | Type | Status |
| :---- | :---- | :---- |
| trial\_start\_date | Date | Already exists in Campus |
| trial\_end\_date | Date | Already exists in Campus |
| trial\_status | Enumeration | New -- None, Active, Expired, Extended (replaces the need for a separate boolean; `Active` or `Extended` = trial is active) |
| trial\_extension\_count | Number | New -- count of extensions (0 = never) |

**Property 3: System State (synced from Campus)**

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Active | System is operational; users can log in | Default for all active systems |
| Deactivated | System is disabled; no login. Deactivation\_reason captures why. | All deactivated\_\* statuses |
| Sandbox | Non-production sandbox | sandbox |

New field: Deactivation Reason -- When System State = Deactivated, a separate enumeration captures the reason: Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, or Other.

## 2.4 Auto-Computation Logic

This section defines where and how the auto-computed properties are calculated. This was identified as a critical architectural gap in the engineering review.

### 2.4.1 Computation Location

All auto-computation runs in Campus (testable, version-controlled, debuggable). Results are synced to HubSpot. The sync operates in two modes:

* **Immediate webhook:** When a self-signup purchase completes, or when a billing event changes a system's status (e.g., trial expires, payment received), Campus fires an API call to HubSpot to update the affected Company properties immediately.
* **Periodic batch sync:** For enterprise deals (which are currently managed in HubSpot and synced down to Campus), the existing batch sync continues to run on its current schedule. As the deal flow reversal is implemented, enterprise deals will also move to immediate webhook sync.

### 2.4.2 Customer Tier Computation Rules

**Overdue status definition**

A deal's `paid_status` is set to `Overdue` automatically when today's date passes the invoice due date without a recorded payment. Staff can also set or clear this status manually at any time.

**Billing grace mode**

`billing_grace_mode` is a boolean flag on each deal (default: off), set by staff in Campus admin. It is intended for high-trust customers with known late payment patterns -- for example, a large institution that consistently pays 60 days after the invoice due date.

When `billing_grace_mode = true` on a deal:

* The deal is still treated as active for tier computation, regardless of how long it has been Overdue.
* No access restrictions are applied to the associated system.
* No payment-related messages are shown to end users.
* The Overdue status remains visible to Digication staff in Campus admin for internal tracking.

**Active deal definition (for tier computation purposes)**

A deal is considered active if all of the following are true:

* `license_end_date >= today` (not expired), AND
* `paid_status` has not been Overdue for 90 or more days (measured from the invoice due date), OR `billing_grace_mode = true` on the deal

**Computation rules**

Evaluated whenever a deal is created, updated, or expires for a given Company/System:

* 1\. If the company has a manual override flag (Sponsor or Internal), use that value. Manual overrides take precedence.
* 2\. Query all active deals associated with the company (using the active deal definition above).
* 3\. ~~If any active deal has deal\_type = Enterprise License, and any other deal has deal\_type = Self-Signup License, tier = Hybrid.~~ **[2026-04-07 amendment: `customer_tier` is now multi-select. Drop the "Hybrid" value entirely. Replace rules 3–5 with: "tier = the set of distinct deal types across all active deals," e.g., `["Enterprise", "Self-Signup"]`. See amendment #3 at the top.]**
* 4\. ~~If any active deal has deal\_type = Enterprise License (and no Self-Signup), tier = Enterprise.~~
* 5\. ~~If active deals exist but none are Enterprise, tier = Self-Signup.~~
* 6\. If no active deals exist, tier is cleared (null/empty set) and lifecycle stage determines the display.

### 2.4.3 Lifecycle Stage Computation Rules

* 1\. If any deal associated with the company has paid\_status = Paid and license\_end\_date >= today, stage = Active Customer.
* 2\. If no active deals but the company has at least one historical deal (any deal that was ever closed-won), AND the most recent deal's `license_end_date` is less than 2 years ago, stage = Past Customer.
* 3\. If no active deals and the company's most recent deal `license_end_date` is 2+ years ago, stage = Prospect. This allows long-churned companies re-entering the funnel to appear as Prospects rather than permanently stuck as Past Customer.
* 4\. If the company has contacts, signup activity, or an associated system, but no deal history, stage = Prospect.
* 5\. Otherwise, stage = Unknown.

*Re-engagement note:* A company that churned recently (within 2 years) remains as Past Customer — this is correct because their history is relevant for renewal/win-back workflows. After 2 years with no activity, they decay to Prospect, allowing them to re-enter the standard funnel. Staff can also use `manual_lifecycle_override` to force a company to Prospect at any time if re-engagement begins before the 2-year decay.

### 2.4.4 Trial Status Computation Rules

* 1\. trial\_status = Active if trial\_end\_date >= today AND there is no active paid deal for the system.
* 2\. trial\_status = Extended if trial\_end\_date >= today AND trial\_extension\_count > 0 AND no active paid deal exists.
* 3\. trial\_status = Expired if trial\_end\_date < today AND no paid deal exists.
* 4\. trial\_status = None if the system never had a trial or has an active paid deal (trial no longer relevant).

*Note: The separate `trial_active` boolean property was removed to avoid redundancy. Use `trial_status IN (Active, Extended)` for any logic that needs to check whether a trial is currently active.*

### 2.4.5 Manual Override Points

Auto-computation handles the standard lifecycle, but Digication staff must be able to override certain values in Campus. The following override scenarios are supported:

| Scenario | Override Action | Effect on Computation |
| :---- | :---- | :---- |
| Extend a prospect's trial | Staff edits trial\_end\_date and increments trial\_extension\_count in Campus admin | trial\_status remains Active (or changes to Extended); lifecycle stays Prospect; system is not deactivated when the original date passes |
| Tag a company as Sponsor | Staff sets manual\_tier\_override = Sponsor in Campus admin | Customer Tier computation is skipped; Sponsor value syncs to HubSpot |
| Tag a system as Internal | Staff sets manual\_tier\_override = Internal in Campus admin | System excluded from customer reports; tier = Internal |
| Force a company to Past Customer | Staff sets manual\_lifecycle\_override = Past Customer | Overrides the computed lifecycle. Triggers the "force churn" workflow (see below). Useful when a known-churned customer's deals haven't been formally closed yet |
| Reactivate a deactivated system | Staff changes system\_state back to Active in Campus admin | System becomes syncable again; lifecycle re-evaluated based on deal state |

**Force Churn Workflow (Override to Past Customer)**

When staff sets `manual_lifecycle_override = Past Customer`, the following cascading changes are applied automatically in Campus:

| Area | Action |
| :---- | :---- |
| Active deals | All active deals for this company are set to `paid_status = Waived` and `license_end_date = today`. Deals are not deleted — they remain for historical reporting with their original values preserved in deal history. |
| Customer tier | Tier is cleared (null), since no active deals remain. |
| Trial status | Any active trial is set to `trial_status = Expired` and `trial_end_date = today`. |
| System state | System state is **not** changed automatically. Staff must deactivate systems separately if access should be revoked. This is intentional — some churned customers retain read-only access during a wind-down period. |
| Sync behavior | A final sync push is triggered to HubSpot (per the deactivation sync requirement). After this push, the company continues to appear in future syncs with its Past Customer status. |
| Reversal | Clearing the `manual_lifecycle_override` field returns the company to auto-computed lifecycle. However, deals modified by the force churn workflow are not automatically restored — staff must reactivate deals manually if the override was set in error. |

All manual overrides should be logged with timestamp and user for audit purposes. An override can be cleared to return to auto-computed behavior.

## 2.5 Integration Architecture: Deal Flow Reversal

This section addresses the most significant infrastructure change in the new architecture. Today, deals flow only from HubSpot to Campus (read-only). The new system requires the reverse: Campus creates deals and pushes them to HubSpot. This is a major new integration that must be scoped and built as a dedicated workstream.

### 2.5.1 Current State

* HubSpot > Campus: Sales team creates deals in HubSpot. Campus downloads deal data on a batch schedule for reference. Campus never creates or modifies deals in HubSpot.
* This integration was previously built to push deals from HubSpot to Campus; that direction will be deprecated.

### 2.5.2 Target State

* **Self-signup deals (Campus > HubSpot):** When a self-signup customer completes a Stripe checkout, Campus creates the deal(s) in HubSpot via the HubSpot API. Each product in the checkout (license, AI credits, setup fee) becomes a separate deal. This happens in real-time via API call, not batch sync.
* **Enterprise deals (HubSpot, managed manually):** During the transition period, enterprise deals continue to be created by the sales team in HubSpot. Over time, as contract management moves to Campus, enterprise deals may also originate in Campus.
* **Coexistence:** Both workflows must run in parallel. The system must handle deals created from either direction without conflicts or duplicates. The deal\_source property (Managed vs. Self-Signup) identifies the origin.

**Deal Data Ownership Model**

During coexistence and post-migration, each deal type has exactly one system of record. A deal is only editable in its source system; the other system receives a read-only sync copy.

| Deal Type | Created in | Editable in | Synced to (read-only) |
| :---- | :---- | :---- | :---- |
| Self-Signup License | Campus | Campus only | HubSpot |
| Enterprise License (transition period) | HubSpot | HubSpot only | Campus |
| Enterprise License (post-migration) | Campus | Campus only | HubSpot |
| AI Credits | Campus | Campus only | HubSpot |
| One-Time Fee | Campus | Campus only | HubSpot |
| Partnership | HubSpot | HubSpot only | Campus |
| Sponsorship | HubSpot | HubSpot only | Campus |

**Conflict resolution:** If a deal exists in both systems (e.g., due to a sync failure and manual re-creation), the source system's version wins. The `deal_source` property identifies the authoritative system. Duplicate detection uses `transaction_reference_id` (for Campus-originated deals) or the HubSpot deal ID (for HubSpot-originated deals).

*Note: Section 1.3 describes the current state ("deal data flows from HubSpot down to Campus in read-only mode"). Section 2.5.2 describes the target state where Campus also creates deals. Both statements are correct for their respective timeframes. The table above clarifies ownership during the coexistence period.*

### 2.5.3 Technical Requirements

* HubSpot API integration for deal creation (POST /crm/v3/objects/deals)
* Association API to link new deals to the correct Company and Contact
* Error handling and retry logic for API failures
* Idempotency: if a Stripe webhook fires twice, the system must not create duplicate deals
* Transaction grouping: all deals from the same checkout share a transaction\_reference\_id
* Webhook or callback from Campus to HubSpot for immediate Company property updates after deal creation

This integration is the single largest new development effort in this spec. It should be estimated and tracked separately from the property migration work.

## 2.6 Deal Architecture

**Core Principle: One deal per transaction type, linked by a shared reference.**

When a customer makes a purchase, each distinct product/service becomes its own deal in HubSpot. The transaction\_reference\_id links related deals. For Stripe purchases, this is the Stripe session ID. For QuickBooks, the invoice ID is captured separately. Each reference (Stripe, QuickBooks, internal) is a separate property for full traceability.

**Deal Type (enumeration property)**

| Deal Type | Description | Revenue Treatment |
| :---- | :---- | :---- |
| Enterprise License | Managed enterprise license (200+ accounts) | ARR; deferred revenue |
| Self-Signup License | Self-service individual or group license | ARR; deferred revenue |
| AI Credits | Prepaid AI usage credits with expiry | Deferred; recognized on usage or expiry (up to 2 years) |
| One-Time Fee | Setup, integration, training, non-recurring | Recognized immediately |
| Partnership | Revenue from partner relationships | Varies by agreement |
| Sponsorship | Sponsored/subsidized accounts | Varies by agreement |

Each product type can define its own revenue recognition model. Revenue treatment is driven by deal type and can be refined by product-level configuration in Campus.

**Deal Properties**

| Property | Type | Values / Description |
| :---- | :---- | :---- |
| plan\_tier | Enumeration | Enterprise, Group, Individual |
| billing\_cycle | Enumeration | Annual, Monthly |
| is\_trial | Boolean | Deal-level flag; does not roll up to company lifecycle |
| deal\_source | Enumeration | Managed (enterprise), Self-Signup (automated checkout) |
| new\_or\_renewal | Enumeration | New Business, Renewal, Expansion |
| contract\_term | Enumeration | Single Year, Multi-Year |
| auto\_renewal | Boolean | Yes/No |
| transaction\_reference\_id | String | Internal batch ID linking deals from same purchase |
| stripe\_transaction\_id | String | Stripe payment/checkout session ID |
| quickbooks\_invoice\_id | String | QuickBooks invoice ID |
| contract\_reference\_id | String | Campus contract ID governing this deal |
| plan\_name | String | Free text; Campus plan/deal name |
| license\_count | Number | Number of licenses |
| price\_per\_license | Currency | Per-license fee |
| option\_type | String | Description of options/add-ons |
| option\_fee | Currency | Fee for options/add-ons |
| license\_start\_date | Date | Start of license period |
| license\_end\_date | Date | End of license period |
| paid\_status | Enumeration | Unpaid, Paid, Partial, Overdue, Waived |
| billing\_grace\_mode | Boolean | When enabled, Overdue status is tracked internally but not enforced: no tier change, no access restriction, no user-facing messages. Set by staff in Campus admin. Default: off. |

## 2.7 Contract Management

Contracts become a first-class entity in Digication Campus (source of truth), with metadata synced to HubSpot.

Note: Sam has already set up contract-related properties in HubSpot (under the Contracts pipeline). The new Campus contract model should incorporate those existing fields. A reconciliation of existing HubSpot contract fields with the Campus model below is needed during Phase 1.

**Contract Data Model (Campus)**

| Field | Type | Description |
| :---- | :---- | :---- |
| contract\_id | Auto-generated | Unique identifier |
| company\_id / system\_id | Reference | Links to Campus system and HubSpot Company |
| contract\_type | Enumeration | New Agreement, Amendment, Extension, Renewal |
| effective\_date | Date | When contract takes effect |
| expiration\_date | Date | When contract expires |
| total\_term\_length | String | e.g., '3 years' |
| auto\_renewal | Boolean | Whether contract auto-renews |
| total\_contract\_value | Currency | Sum of all years/deal values |
| contract\_pdf | File attachment | Uploaded signed contract PDF |
| amendment\_history | List of references | Links to prior contracts/amendments |
| status | Enumeration | Draft, Active, Expired, Terminated |
| notes | Text | Free-text notes |

Contracts govern one or more deals. Not all deals require contracts; self-signup purchases typically have no contract.

## 2.8 Contact Role Model

Contact roles split into two separate fields:

**Field 1: Sales Role (new field)**

| Role | Description | Source |
| :---- | :---- | :---- |
| Decision Maker | Authority to approve purchases | Manual |
| Renewal Contact | Primary renewal communications contact | Manual |
| Self-Signup Purchaser | Purchased licenses via self-signup | Auto from billing |
| Group Admin | Manages a group plan | Auto from billing |
| Individual User | Has own individual paid plan | Auto from billing |
| Abandoned Cart | Started checkout but didn't complete | Auto from billing |
| Tax Exempt Contact | Handles tax exemption docs | Manual |

**Field 2: Operational Role (extend existing field)**

| Role | Description | Source |
| :---- | :---- | :---- |
| System Admin (Active) | Active admin user | Auto from Campus |
| System Admin (Inactive) | Admin with low/no activity | Auto from Campus |
| LTI/SSO Contact | Technical integration contact | Manual |
| Assessment Lead | Leads assessment initiatives | Manual |
| Department Chair | Academic department leadership | Manual |
| Support Contact | From Zendesk interactions | Auto from Zendesk |

Abandoned Cart contacts will be created for all checkout-flow entrants. AI-driven follow-up will be developed later to identify high-value abandoned carts.

## 2.9 Sync Inventory

This section defines every field that flows between Campus and HubSpot, organized by entity. Each field has a **sync method**:

* **Push** — real-time API call triggered by a specific event (e.g., payment completed, plan created). Used for transactional data where timeliness matters.
* **Batch** — periodic cron sync (daily or configurable). Used for aggregated metrics and usage data where near-real-time is sufficient.
* **Manual** — entered by sales team directly in HubSpot. Not synced to Campus.

### 2.9.1 Entity: Company / System

Campus `tSystem` ↔ HubSpot Company. Identified by `salesCrmId` (Campus) / HubSpot Company ID.

*Full field-by-field inventory with SQL queries, HubSpot internal names, and trigger frequencies: see [sync-field-inventory.md](analysis/sync-field-inventory.md).*

**Campus → HubSpot (Batch — existing daily/configurable cron)**

Each field's **Data Origin** indicates whether the value is read directly from a stored Campus column (**Stored**) or computed at sync time via a query or logic (**Calculated**).

**A. System Identity Fields**

| HubSpot Property | Campus Source | Data Origin | Freq | Status |
| :---- | :---- | :---- | :---- | :---- |
| Company Name | `tSystem.systemname` | Stored | Daily | Synced |
| Domain | `tSystem.website` | Stored | Daily | Synced |
| system\_id\_\_c | `tSystem.id` | Stored | Daily | Synced |
| Timezone | `tSystem.timezonekey` | Stored | Daily | Synced |
| Production URL | `tSystem.systemkey` via `getSystemUrl` | Calculated | Daily | Synced |
| sales\_status | `tSystem.salesStatus` | Stored | Daily | Synced → **Archive** |
| CSV import log | Last 10 entries from `import` table | Calculated (metadata) | Daily | Synced |

**B. New Architecture Status Fields** (replace sales\_status)

| HubSpot Property | Campus Source | Data Origin | Freq | Status |
| :---- | :---- | :---- | :---- | :---- |
| customer\_tier | Section 2.4.2 rules against deal data | Calculated | Push + Daily | **New** |
| lifecycle\_stage\_new | Section 2.4.3 rules against deal + activity data | Calculated | Push + Daily | **New** |
| system\_state | `tSystem.state` → Active/Deactivated/Sandbox | Stored (mapped) | Push + Daily | **New** |
| deactivation\_reason | \[Developer: new column or derived from state transition\] | **TBD** | Push + Daily | **New** |
| trial\_status | Section 2.4.4 rules against trial dates + deal data | Calculated | Push + Daily | **New** |
| trial\_start\_date | `tSystem.trialStartDate` | Stored | Daily | Existing (not synced yet) |
| trial\_end\_date | `tSystem.trialEndDate` | Stored | Push + Daily | Existing (not synced yet) |
| trial\_extension\_count | \[Developer: new column on tSystem\] | Stored (new) | Daily | **New** |
| primary\_system\_type | \[Developer: new `system_type` column on tSystem\] | Stored (new) | Daily | **New** |
| duplicate\_review\_flag | Domain matching logic | Calculated | On creation | **New** |
| lifecycle\_is\_override | Boolean flag when manual override is active | Stored | Daily | **New** |

**C. KORA / Assessment Fields**

| HubSpot Property | Campus Source | Data Origin | Freq | Status |
| :---- | :---- | :---- | :---- | :---- |
| KORA system option | `tSystem.options` JSON → `enableKAMS` | Stored (parsed) | Daily | Synced |
| KORA per-user override | `tSystem.options` JSON → `allowUserOverrideEnableKAMS` | Stored (parsed) | Daily | Synced |
| KORA number of courses | `kams_container` WHERE type='course' | Calculated (query) | Daily | Synced |
| KORA users with access | `kams_container_member` DISTINCT users | Calculated (query) | Daily | Synced |

**D. LMS Integration Fields**

| HubSpot Property | Campus Source | Data Origin | Freq | Status |
| :---- | :---- | :---- | :---- | :---- |
| LMS | `lti_platform` table — LMS types per system | Calculated (query) | Daily | Defined, **not implemented** |
| LMS integration details | `lti_platform` — name, URL, type, sandbox/prod, active per platform | Calculated (query) | Daily | Defined, **not implemented** |
| LMS URL | `lti_platform` — URL(s), may be multiple | Calculated (query) | Daily | Defined, **not implemented** |

*Note: Enum values exist in `HubspotDynamicFieldName`; code throws "is not supported" error. The `lti_platform` table is the data source. A separate manual `lms` enum field exists in HubSpot for sales team entry.*

**E. User Count Totals**

All Calculated (query) from `tUser` + `tRole` tables. Synced daily. Role detection: admin = roletype=1 + visiblef=0; faculty = roletype=2 + visiblef=1; alumni = roletype=3 + visiblef=1; students = everyone else.

| HubSpot Property | Status |
| :---- | :---- |
| Total number of users / students / faculty / admin / alumni | Synced (5 fields) |

**F. Time-Series Metrics**

Time-series metrics follow a standard pattern across 7 time windows per metric. All are Calculated (query) from `tUser`, `tRole`, and `tLogActivity` tables.

Time windows:
- **ACT: 30d** — rolling last 30 days, runs daily
- **ACT: 1yr** — rolling last year, runs daily
- **HIST: Month** — previous calendar month, runs 1st of each month
- **HIST: Quarter** — previous quarter, runs 1st of Jan/Apr/Jul/Oct
- **HIST: Year** — previous fiscal year (Jul-Jun), runs 1st of Jul
- **HIST: Sub Period** — previous subscription period, runs at period end. **Requires deal/plan dates.**
- **ACT: Current Sub Period** — current subscription period to date, runs daily. **Requires deal/plan dates.**

*Subscription period fields are currently blocked because the HubSpot→Campus deal sync is broken. With the new architecture (Campus as source of truth for deals/plans), subscription period dates will be available directly from the Campus plan entity, unblocking all subscription-period metrics.*

**F1. New Users by Role** (based on `tUser.createdts`)

| Role | ACT: 30d | ACT: 1yr | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Cur. Sub |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Users | Synced | Synced | Synced | Synced | Synced | Blocked (deal data) | Blocked (deal data) |
| Students | Synced | — | Synced | Synced | Synced | Blocked (deal data) | Blocked (deal data) |
| Admins | Not impl. | — | Not impl. | Not impl. | Not impl. | Not impl. | Not impl. |
| Faculty | Not impl. | — | Not impl. | Not impl. | Not impl. | Not impl. | Not impl. |

"Not impl." = enum defined in `HubspotDynamicFieldName`, SQL queries defined in spreadsheet, but code throws error. "—" = not defined in enum or HubSpot.

**F2. Active Users by Role** (based on `tUser.logindts`)

| Role | ACT: 30d | ACT: 1yr | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Cur. Sub |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Users | Synced | Synced | Synced | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Students | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Admins | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Faculty | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Alumni | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |

"Missing in HS" = Campus can calculate the value (SQL defined), but HubSpot property not yet created. Needs: property creation + sync config + `getDynamicFieldValues.ts` implementation.

**F3. Total Logins by Role** (based on `tLogActivity` where activitytype=0, `COUNT(userid)`)

| Role | ACT: 30d | ACT: 1yr | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Cur. Sub |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Users | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Students | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Admins | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Faculty | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| Alumni | Missing in HS | — | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |

**F4. Unique Logins by Role** (`COUNT(DISTINCT userid)` from `tLogActivity`)

All fields: Missing in HubSpot. Same 5 roles × 6 time windows = ~30 fields. SQL queries defined in spreadsheet.

**F5. ePortfolio Metrics**

All fields: Missing in HubSpot. All Calculated (query).

| Metric | ACT: 30d | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Cur. Sub | Total |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| New ePortfolios | Missing | Missing | Missing | Missing | Missing | Missing | Missing |
| Edited ePortfolios | Missing | Missing | Missing | Missing | Missing | Missing | — |
| New pages | Missing | Missing | Missing | Missing | Missing | Missing | — |
| Edited pages | Missing | Missing | Missing | Missing | Missing | Missing | — |
| Total ePortfolios | — | — | — | — | — | — | Missing |
| Total ePortfolio pages | — | — | — | — | — | — | Missing |
| Total ePortfolio page views | — | — | — | — | — | — | Missing |

**F6. Future Metrics (Not Reviewed)**

These metrics were identified but not yet designed. They would follow the same time-series pattern:
- Courses, Assignments, Submissions (count by time window)
- System-level outcomes planned / assessed (by faculty, self, peers)
- Course-level outcomes planned / assessed (by faculty, self, peers)

**Field Count Summary**

| Category | Synced | Not Impl. | Missing in HS | Blocked | New | Total |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| System Identity + Metadata | 7 | 0 | 0 | 0 | 0 | 7 |
| New Architecture Status | 0 | 0 | 0 | 0 | 11 | 11 |
| KORA / Assessment | 4 | 0 | 0 | 0 | 0 | 4 |
| LMS Integration | 0 | 3 | 0 | 0 | 0 | 3 |
| User Count Totals | 5 | 0 | 0 | 0 | 0 | 5 |
| Time-Series: New Users | 14 | ~12 | 0 | ~4 | 0 | ~30 |
| Time-Series: Active Users | 5 | 0 | ~25 | 0 | 0 | ~30 |
| Time-Series: Total Logins | 2 | 0 | ~28 | 0 | 0 | ~30 |
| Time-Series: Unique Logins | 0 | 0 | ~30 | 0 | 0 | ~30 |
| ePortfolio Metrics | 0 | 0 | ~19 | 0 | 0 | ~19 |
| **Total** | **~37** | **~15** | **~102** | **~4** | **11** | **~169** |

**Campus → HubSpot (Push — new, event-triggered)**

| HubSpot Property | Trigger Event | Data Origin | Status | Notes |
| :---- | :---- | :---- | :---- | :---- |
| customer\_tier | Deal created/updated/expired | Calculated (re-run Section 2.4.2 rules) | **New** | Re-computed and pushed immediately |
| lifecycle\_stage\_new | Deal created/updated/expired | Calculated (re-run Section 2.4.3 rules) | **New** | Re-computed and pushed immediately |
| trial\_status | Trial started/expired/extended | Calculated (re-run Section 2.4.4 rules) | **New** | |
| trial\_end\_date | Trial extended | Stored (`tSystem.trialEndDate`) | **New** | |
| system\_state | System deactivated/reactivated | Stored (`tSystem.state`, mapped) | **New** | Includes final sync on deactivation |

*Note: Push sync supplements batch sync — both update the same HubSpot properties. Push provides immediate updates for transactional events; batch ensures consistency and catches anything push missed.*

**HubSpot → Campus: None for Companies.** Campus is the source of truth. Company data flows one direction only.

**Sync exclusions:** Systems with duplicate `salesCrmId` values are excluded from ALL sync operations — multi-system companies lose all metric sync, not just the conflicting fields. This is existing behavior in `HubspotSync.ts:128-140`. Must be resolved before migration (see Bagas review Issue #9 / multi-plan field inventory).

**HubSpot-only Company fields (not synced to Campus):** ~150+ fields exist in HubSpot that are not synced from Campus. These include HubSpot analytics (auto-managed), company demographics (HubSpot Insights), sales team manual fields (accreditation, institution properties, programs, engagement, adoption status, campus health), Salesforce legacy fields, social media, and Zendesk ticket counts (planned but not synced). Full list in [sync-field-inventory.md](analysis/sync-field-inventory.md) Section 4.

### 2.9.2 Entity: Deal / Plan

Campus Plan/Billing entities ↔ HubSpot Deal. This is the **deal flow reversal** described in Section 2.5.

**Campus → HubSpot (Push — new)**

Self-signup and (post-migration) enterprise deals are created by Campus and pushed to HubSpot in real-time.

| HubSpot Property | Campus Source | Data Origin | Trigger | Status |
| :---- | :---- | :---- | :---- | :---- |
| Deal Name | Plan name / generated | Stored / Calculated | Stripe checkout complete OR enterprise deal created | **New** |
| Deal Type | Mapped from plan type | Calculated (mapped from plan entity) | Same | **New** |
| Deal Stage | Mapped to pipeline stage | Calculated (mapped from payment state) | Same | **New** |
| Amount | Plan price | Stored (plan entity) | Same | **New** |
| plan\_tier | Plan tier (Enterprise/Group/Individual) | Stored (plan entity) | Same | **New** |
| billing\_cycle | Plan billing cycle | Stored (plan entity) | Same | **New** |
| is\_trial | Boolean | Stored (plan entity) | Same | **New** |
| deal\_source | Managed / Self-Signup | Calculated (from creation context) | Same | **New** |
| new\_or\_renewal | New Business / Renewal / Expansion | Calculated (based on deal history for company) | Same | **New** |
| contract\_term | Single Year / Multi-Year | Stored (contract entity) | Same | **New** |
| transaction\_reference\_id | Internal batch ID | Stored (generated at checkout) | Same | **New** |
| stripe\_transaction\_id | Stripe session ID | Stored (from Stripe webhook) | Same | **New** |
| contract\_reference\_id | Campus contract ID | Stored (contract entity) | Same | **New** |
| plan\_name | Campus plan name | Stored (plan entity) | Same | **New** |
| license\_count | Plan license count | Stored (plan entity) | Same | **New** |
| price\_per\_license | Amount / license\_count | Calculated | Same | **New** |
| option\_type | Add-on description | Stored (plan entity) | Same | **New** |
| option\_fee | Add-on fee | Stored (plan entity) | Same | **New** |
| license\_start\_date | Plan start date | Stored (plan entity) | Same | **New** |
| license\_end\_date | Plan end date | Stored (plan entity) | Same | **New** |
| paid\_status | Payment state | Stored (updated by payment events) | Payment received / overdue / etc. | **New** |
| billing\_grace\_mode | Grace flag | Stored (set by staff in Campus admin) | Staff sets in Campus | **New** |
| Company association | `salesCrmId` mapping | Stored (system → company link) | Same | **New** — via HubSpot Association API |
| Contact association | Purchaser email / user ID | Stored (user entity) | Same | **New** — via HubSpot Association API |

**Campus → HubSpot (Push — updates to existing deals)**

| HubSpot Property | Data Origin | Trigger | Notes |
| :---- | :---- | :---- | :---- |
| paid\_status | Stored (updated by payment events) | Payment received, overdue threshold, manual change | Updates existing deal |
| Deal Stage | Calculated (mapped from payment/renewal state) | Renewal, expiry | Moves deal through pipeline |
| license\_end\_date | Stored (plan entity) | Renewal extends end date | |
| quickbooks\_invoice\_id | Stored (written by Cowork) | Cowork writes invoice ID back | Written by Cowork agent, not Campus directly |

**HubSpot → Campus (Batch — existing daily cron, currently broken)**

During the transition period, enterprise deals created in HubSpot still need to sync down to Campus.

| Campus Field | HubSpot Source | Status | Notes |
| :---- | :---- | :---- | :---- |
| HubspotDealEntity.name | `dealname` | Existing (**broken**) | Schema exists, sync not functional |
| HubspotDealEntity.stage | `dealstage` | Existing (**broken**) | Same |
| HubspotDealEntity.licenseStartDate | `license_start_date__c` | Existing (**broken**) | Same |
| HubspotDealEntity.licenseEndDate | `license_end_date__c` | Existing (**broken**) | Same |
| HubspotDealEntity.licensedStudentAccounts | `quantity__c` | Existing (**broken**) | Same |

*Developer action required:* The existing HubSpot→Campus deal sync (`hubspot-deals-sync` lambda, daily CRON at 12:00 UTC) must be fixed or replaced. During the transition, both directions will coexist: HubSpot-originated enterprise deals sync down, Campus-originated self-signup deals push up. The `deal_source` property disambiguates.

### 2.9.3 Entity: Contact

Campus User ↔ HubSpot Contact. Contact sync is largely **new** — the current system does not sync individual contacts.

**Campus → HubSpot (Push — new)**

| HubSpot Property | Campus Source | Data Origin | Trigger | Status |
| :---- | :---- | :---- | :---- | :---- |
| Email | User email | Stored (user entity) | Self-signup purchase / cart activity | **New** |
| First Name, Last Name | User profile | Stored (user entity) | Same | **New** |
| sales\_role: Self-Signup Purchaser | Billing event | Calculated (from checkout event) | Stripe checkout complete | **New** |
| sales\_role: Group Admin | Plan role assignment | Stored (role entity) | Group plan created | **New** |
| sales\_role: Individual User | Billing event | Calculated (from checkout event) | Individual plan purchased | **New** |
| sales\_role: Abandoned Cart | Cart event | Calculated (from cart state) | Checkout started but not completed | **New** |
| purchase\_intent\_level | Cart/purchase funnel | Calculated (from funnel position) | Browsed / Started Checkout / Completed | **New** |
| Deal association | Transaction reference | Stored (transaction\_reference\_id) | Same as deal push | **New** |
| Company association | System → Company mapping | Stored (salesCrmId link) | Same | **New** |

**Campus → HubSpot (Batch — new)**

| HubSpot Property | Campus Source | Data Origin | Notes |
| :---- | :---- | :---- | :---- |
| operational\_role: System Admin (Active/Inactive) | Campus role + activity tables | Calculated (query: `tRole` roletype=1 + login activity) | Admin users with activity status |
| operational\_role: Support Contact | Zendesk integration | **TBD** | \[Developer: verify Zendesk data source\] |
| total\_lifetime\_spend | Sum of closed-won deals | Calculated (query: sum deal amounts by contact) | Requires deal-contact associations |
| current\_fy\_spend | Sum of current FY deals | Calculated (query: sum deals in current FY window) | FY = Jul 1 – Jun 30 |

**HubSpot only (Manual — not synced to Campus)**

| HubSpot Property | Set by | Notes |
| :---- | :---- | :---- |
| sales\_role: Decision Maker | Sales team | Relationship knowledge |
| sales\_role: Renewal Contact | Sales team | Primary renewal comms |
| sales\_role: Tax Exempt Contact | Sales team | Tax exemption handling |
| operational\_role: LTI/SSO Contact | Sales/support team | Technical integration |
| operational\_role: Assessment Lead | Sales team | Academic initiative |
| operational\_role: Department Chair | Sales team | Academic leadership |

### 2.9.4 Entity: Contract

Campus Contract ↔ HubSpot (synced metadata). Contracts are a **new** entity — no current sync exists.

**Campus → HubSpot (Push — new)**

All contract fields are **Stored** — they are read directly from the new Campus contract entity. No calculated fields at the contract level.

| HubSpot Property | Campus Source | Trigger | Status |
| :---- | :---- | :---- | :---- |
| contract\_reference\_id | `contract.contract_id` | Contract created/updated | **New** |
| contract\_type | `contract.contract_type` | Same | **New** |
| effective\_date | `contract.effective_date` | Same | **New** |
| expiration\_date | `contract.expiration_date` | Same | **New** |
| total\_term\_length | `contract.total_term_length` | Same | **New** |
| auto\_renewal | `contract.auto_renewal` | Same | **New** |
| total\_contract\_value | `contract.total_contract_value` | Same | **New** |
| status | `contract.status` | Status change | **New** |
| Company association | `contract.system_id` → `salesCrmId` | Same | **New** |
| Deal associations | `contract_reference_id` on deals | Same | **New** — links contract to its governed deals |

**HubSpot → Campus: None.** Campus is the source of truth for contracts. Sam's existing HubSpot contract fields will be reconciled during Phase 1 (Open Item #5), then replaced by Campus-synced data.

### 2.9.5 HubSpot-Only Data (Not Synced to Campus)

The following data lives exclusively in HubSpot. Campus should not be assumed to have a complete picture of these items.

| Data | Where in HubSpot | Why HubSpot-only |
| :---- | :---- | :---- |
| Partnership deals | Deals (Enterprise Prospects / Contracts pipeline) | Created manually by sales team; no billing system equivalent |
| Sponsorship deals | Deals (Enterprise Prospects / Contracts pipeline) | Created manually by sales team; no billing system equivalent |
| Enterprise deals (transition period) | Deals (Renewal / Prospects pipeline) | Sales team manages in HubSpot until deal flow reversal is complete |
| Pipeline stage movements | Deal pipeline stages | HubSpot-native sales process |
| Manual contact roles (see 2.9.3) | Contact properties | Assigned by sales team |
| Sales workflows and sequences | HubSpot Workflows | Sales automation within HubSpot |
| Notes, emails, and activity timeline | HubSpot Activity feed | CRM interaction history |
| Reporting dashboards | HubSpot Reports | Consume synced data; authored in HubSpot |

*Post-migration:* Enterprise deals will also originate in Campus, reducing this list. Partnership and Sponsorship deals remain HubSpot-only unless a future phase brings them into Campus.

## 2.10 Post-Migration System Responsibilities

After full implementation, the relationship between Campus and HubSpot changes significantly. This table summarizes the before/after for the sales team:

| Operation | Before (current) | After (post-migration) |
| :---- | :---- | :---- |
| Self-signup deal creation | N/A | Campus (auto-synced to HubSpot) |
| Enterprise deal creation | HubSpot | HubSpot (transition) → Campus (future) |
| Company status management | HubSpot (manual via sales\_status) | Campus (auto-computed, synced to HubSpot) |
| Contract management | HubSpot (Contracts pipeline) | Campus (synced to HubSpot) |
| Pipeline management | HubSpot | HubSpot (unchanged) |
| Sales workflows/sequences | HubSpot | HubSpot (unchanged) |
| Reporting/dashboards | HubSpot (manual data entry) | HubSpot (consuming auto-synced data from Campus) |
| Trial management | Campus (dates only) | Campus (full trial lifecycle, synced to HubSpot) |
| Invoice creation | Manual | Cowork agent (HubSpot → QuickBooks) |

*Key change for the sales team:* Company status is no longer manually maintained in HubSpot. The sales\_status field is archived. Customer Tier, Lifecycle Stage, and System State are auto-computed in Campus and appear in HubSpot as read-only synced properties. The sales team consumes this data for reporting and workflows but does not edit it directly.

# 3. Migration Plan

## 3.1 Status Migration Mapping

| Legacy Status | Count | New Tier | New Lifecycle | New State | Trial Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| trial\_prospect | 27 | Self-Signup | Prospect | Active | Check Campus dates |
| trial\_google | 0 | (retire) | (retire) | (retire) | n/a |
| enterprise\_current | 88 | Enterprise | Active Customer | Active | None |
| enterprise\_sponsor | 12 | Sponsor | Active Customer | Active | None |
| enterprise\_partner | 0 | (retire) | (retire) | (retire) | n/a |
| hybrid\_current | 4 | Hybrid | Active Customer | Active | None |
| individual\_current | 1 | Self-Signup | Active Customer | Active | None |
| individual\_self\_signup | 1,040 | Self-Signup | Active Customer\* | Active | None |
| individual\_google | 451 | Self-Signup | Active Customer\* | Active | None |
| individual\_past\_ent. | 133 | Self-Signup | Past Customer | Active | None |
| individual\_prospect | 454 | Self-Signup | Prospect | Active | Check Campus |
| deactivated\_past\_cust. | 0 | (from deals) | Past Customer | Deactivated | None |
| deactivated\_prospect | 1 | (none) | Prospect | Deactivated | Expired |
| deactivated\_partner | 0 | (retire) | (retire) | (retire) | n/a |
| deactivated\_unqual. | 0 | (none) | Unknown | Deactivated | None |
| deactivated\_internal | 0 | Internal | (n/a) | Deactivated | n/a |
| deactivated\_duplicate | 1 | (merge) | (merge) | (merge) | n/a |
| sandbox | 0 | Internal | (n/a) | Sandbox | n/a |
| internal | 0 | Internal | (n/a) | Active | n/a |
| (no value) | 2,741 | (compute) | (compute) | Active | Check Campus |

\* For individual\_self\_signup and individual\_google, lifecycle should be verified against actual deal data.

## 3.2 Migration Phases

**Phase 1: Preparation (Week 1-2)**

**Campus-side:**
* Create the system\_type field in the Campus database (production/sandbox/internal).
* Populate system\_type from existing sales\_status values: sandbox/internal values map accordingly; all others default to production.
* Create the two new trial fields (trial\_status, trial\_extension\_count). trial\_start\_date and trial\_end\_date already exist.
* Build the manual override fields (manual\_tier\_override, manual\_lifecycle\_override) in Campus admin.
* Reconcile Sam's existing contract-related HubSpot properties with the Campus contract model.

**HubSpot-side:**
* Create new Company properties: customer\_tier, lifecycle\_stage\_new, system\_state, deactivation\_reason, trial\_status, trial\_start\_date, trial\_end\_date, trial\_extension\_count.
* Create new Deal properties: plan\_tier, billing\_cycle, is\_trial, deal\_source, new\_or\_renewal, transaction\_reference\_id, stripe\_transaction\_id, quickbooks\_invoice\_id, contract\_reference\_id, plan\_name, paid\_status.
* Add new Deal Type values to dealtype enumeration.
* Create Sales Role and Operational Role contact fields.
* Create Self-Signup Pipeline with stages.
* Audit existing workflows that reference sales\_status.

**Phase 2: Parallel Run (Week 3-4)**

**Campus-side:**
* Implement auto-computation logic (Section 2.4) for Customer Tier, Lifecycle Stage, and Trial Status.
* Build Campus > HubSpot deal push API integration for self-signup deals (Section 2.5). This is the largest build item.
* Build webhook/API call to update HubSpot Company properties immediately after deal creation or status change.
* Migrate sync filter logic: replace sales\_status-based filtering with the **deal-driven sync rule** (sync any deal where `license_start_date ≤ today ≤ license_end_date` AND pipeline state ≠ Closed Lost). System\_type + system\_state still filter at the system layer (sandbox/internal exclusion), but deal state is the primary driver. This must be done before sales\_status can be archived. **[2026-04-07 amendment #5]**

**HubSpot-side:**
* Run migration script to populate new Company properties from the mapping table.
* Route self-signup deals into the Self-Signup Pipeline.
* Begin syncing self-signup Contacts with Sales Role tags.
* Validate: compare auto-computed values against legacy field for all 88 enterprise customers.

**Phase 3: Workflow Migration (Week 5-6)**

**Campus-side:**
* Complete testing of deal flow reversal. Verify self-signup purchases create correct deals in HubSpot.
* Verify sync filter logic works correctly with system\_type + system\_state (no systems incorrectly included or excluded).
* Set up contract data model in Campus. Begin entering contracts for top enterprise customers.

**HubSpot-side:**
* Recreate workflows that depend on sales\_status to use new properties.
* Build new reporting dashboards: ARR by Customer Tier, pipeline by Lifecycle Stage, churn analysis.
* Backfill existing deals (2,449 renewal + 1,235 prospects) with new properties. Cowork can assist.

**Phase 4: Cutover (Week 7-8)**

**Campus-side:**
* Stop writing to the sales\_status field on new/updated systems.
* Remove legacy trial auto-filtering logic.
* Verify all sync paths use system\_type + system\_state, not sales\_status.

**HubSpot-side:**
* Archive sales\_status field (do not delete; keep for historical reference).
* Handle remaining trial systems: active trials get new trial properties; expired trials get deactivated.
* Merge/clean the 1 deactivated\_duplicate record.
* Final validation of all dashboards and reports against the new property model.

## 3.3 Migration Rules Engine

### 3.3.1 Why Rules Replace the Spreadsheet

The original migration approach used a spreadsheet with one row per Campus system (~7,500 rows). Jeff and Amanda would manually decide, for each system, what the new field values should be. This approach has proven unsustainable for three reasons:

1. **Scale.** 7,500 manual decisions is too many. After months of work, the hardest fields (plan type, licensing terms, payment terms) were less than 1% complete.
2. **Fragility.** Every time the spec changes — a new field is added, a mapping rule is refined, a status value is renamed — all prior manual work must be re-evaluated. The spreadsheet has no way to propagate a rule change across thousands of rows.
3. **Opacity.** When a value in the spreadsheet is wrong, there is no way to tell whether it was a bad rule or a bad exception. The reasoning is not captured.

The replacement approach is a **rules engine**: an ordered set of rules that take existing Campus data as input and produce new field values as output. Each rule captures the *reasoning* ("systems with this sales status and these characteristics should get these values"), not just the result.

### 3.3.2 How It Works

1. **Define rules.** Each rule has a condition (which systems it matches) and an assignment (what new values to set). Rules are ordered by priority: more specific rules first, broader catch-alls last. A system is assigned values by the first rule whose condition matches.
2. **Run rules against live Campus data.** A script (or SQL procedure) queries the Campus database, evaluates each system against the rule set, and produces a preview table showing every system with its proposed new values and which rule matched.
3. **Review by summary, not by row.** Jeff and Amanda review the output grouped by rule. Instead of scanning 7,500 rows, they review ~20 rule groups and check: did the right systems land in the right bucket? Are the counts what we expected?
4. **Handle exceptions as rules.** When a system does not fit any existing rule, a new rule is created for it (even if it matches only one system by ID). This preserves the reasoning and ensures the exception survives future re-runs.
5. **Re-run when specs change.** When the architecture evolves — a new field is added, a tier definition changes, a plan structure is updated — update the affected rules and re-run. All 7,500 systems get re-evaluated automatically.

### 3.3.3 Relationship to Other Sections

The migration rules engine operationalizes decisions made elsewhere in this document:

* **Section 3.1 (Status Migration Mapping)** defines the high-level mapping from legacy sales\_status to the new tier/lifecycle/state model. The rules engine encodes these mappings as executable rules and extends them to cover additional fields not in the mapping table (plan type, licensing terms, system settings).
* **Section 3.2 (Migration Phases)** defines *when* migration happens. The rules engine defines *what values* get written at each phase.
* **Section 2.4 (Auto-Computation Logic)** defines how tier, lifecycle, and trial status are computed going forward. The rules engine handles the *initial seeding* of these values for existing systems. After migration, the auto-computation logic takes over.

When Ly or Bagas change something in the sales status architecture (Section 2.3 or 2.4), the corresponding migration rule should be updated here to stay in sync.

## 3.4 Migration Rule Set

Rules are evaluated top-to-bottom. The first matching rule wins. Each rule specifies: a condition, the new field values to assign, and the reasoning.

*Note on counts: The counts below are based on Campus data as of February 2026 (7,571 systems). Actual counts at migration time will differ. The rules match on conditions, not counts — the counts are included for review purposes only.*

### Rule Group A: Deactivated Systems (~4,536 systems)

These systems are already inactive. They need new field values for the status model but do not need plan or billing fields.

**Rule A1: Deactivated past customers**
* Condition: `sales_status = deactivated_past_customer`
* Count: ~2,716
* Assignments:
  * system\_type = production
  * system\_state = Deactivated
  * deactivation\_reason = Past Customer
  * customer\_tier = (null — no active deals)
  * lifecycle\_stage = Past Customer
  * trial\_status = None
  * All plan/billing fields = (skip — no active plan)
  * Free license flags = all No
* Reasoning: These were once customers. Their systems are already disabled. They retain Past Customer lifecycle for historical reporting.

**Rule A2: Deactivated prospects**
* Condition: `sales_status = deactivated_prospect`
* Count: ~1,334
* Assignments:
  * system\_type = production
  * system\_state = Deactivated
  * deactivation\_reason = Expired Trial (if trial\_end\_date exists and is past) OR Unqualified Signup (otherwise)
  * customer\_tier = (null)
  * lifecycle\_stage = Prospect
  * trial\_status = Expired (if trial\_end\_date exists) OR None
  * All plan/billing fields = (skip)
  * Free license flags = all No
* Reasoning: These signed up but never became customers. The deactivation reason depends on whether they had a trial.

**Rule A3: Deactivated duplicates**
* Condition: `sales_status = deactivated_duplicate`
* Count: ~353
* Assignments:
  * system\_type = production
  * system\_state = Deactivated
  * deactivation\_reason = Duplicate
  * customer\_tier = (null)
  * lifecycle\_stage = Unknown
  * trial\_status = None
  * All plan/billing fields = (skip)
  * Free license flags = all No
* Reasoning: These are duplicate records. They are kept deactivated for historical reference. No billing assignment needed.

**Rule A4: Deactivated internal**
* Condition: `sales_status = deactivated_internal`
* Count: ~100
* Assignments:
  * system\_type = internal
  * system\_state = Deactivated
  * deactivation\_reason = Internal Cleanup
  * customer\_tier = Internal
  * lifecycle\_stage = (n/a — internal)
  * trial\_status = None
  * All plan/billing fields = (skip)
  * Free license flags = all No
* Reasoning: Internal systems that were retired. Marked as Internal tier so they are excluded from customer reports.

**Rule A5: Deactivated partners**
* Condition: `sales_status = deactivated_partner`
* Count: ~10
* Assignments:
  * system\_type = production
  * system\_state = Deactivated
  * deactivation\_reason = Past Customer
  * customer\_tier = (null)
  * lifecycle\_stage = Past Customer
  * trial\_status = None
  * All plan/billing fields = (skip)
  * Free license flags = all No
* Reasoning: Former partner accounts, now inactive. Treated same as past customers.

**Rule A6: Deactivated unqualified signups**
* Condition: `sales_status = deactivated_unqualified_signup`
* Count: ~23
* Assignments:
  * system\_type = production
  * system\_state = Deactivated
  * deactivation\_reason = Unqualified Signup
  * customer\_tier = (null)
  * lifecycle\_stage = Unknown
  * trial\_status = None
  * All plan/billing fields = (skip)
  * Free license flags = all No
* Reasoning: Signups that were determined to be unqualified (spam, test accounts, etc.).

### Rule Group B: Internal and Sandbox Systems (~268 systems)

**Rule B1: Active internal systems**
* Condition: `sales_status = internal`
* Count: ~175
* Assignments:
  * system\_type = internal
  * system\_state = Active
  * customer\_tier = Internal (manual override)
  * lifecycle\_stage = (n/a — internal)
  * trial\_status = None
  * Default plan = (exempt — internal use)
  * Free license flags = carry over from existing settings (most are Yes for all roles)
* Reasoning: Digication-owned systems (demo instances, internal tools). Excluded from customer metrics. Retain their existing settings.

**Rule B2: Sandbox systems**
* Condition: `sales_status = sandbox`
* Count: ~93
* Assignments:
  * system\_type = sandbox
  * system\_state = Sandbox
  * customer\_tier = Internal
  * lifecycle\_stage = (n/a — sandbox)
  * trial\_status = None
  * Default plan = (exempt — sandbox)
  * Free license flags = carry over existing settings
* Reasoning: Customer sandboxes. Per Section 2.2, sandboxes are tracked in Campus only and do not sync to HubSpot.

### Rule Group C: Enterprise Customers (~136 systems)

These are the highest-value accounts and need the most careful handling. Many will require per-system review of contract and plan details.

**Rule C1: Active enterprise customers**
* Condition: `sales_status = enterprise_current`
* Count: ~94
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Enterprise
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Plan payment terms = (requires per-system review — pull from existing contracts/HubSpot deals)
  * Licensing plan name = (requires per-system review)
  * License count = (requires per-system review)
  * License end date = (requires per-system review)
  * Auto-renewal = (requires per-system review)
  * Free license flags = carry over existing settings
* Reasoning: Core paying enterprise customers. Plan and contract details vary per customer and must be confirmed against existing records. This is one of the groups where Jeff/Amanda manual review is still needed — but only for ~94 systems, not 7,500.
* **Action item:** During Phase 1, pull existing contract data from HubSpot deals and Campus records to pre-populate these fields. Manual review confirms or corrects.

**Rule C2: Enterprise sponsors**
* Condition: `sales_status IN (enterprise_sponsor, 'Enterprise (Sponsored)')`
* Count: ~34 (18 + 16 with variant label)
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Sponsor (manual override)
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Plan/billing fields = same approach as C1 (per-system review using contract data)
  * Free license flags = carry over existing settings
* Reasoning: Sponsored accounts funded by a third party. Same treatment as enterprise but with the Sponsor tier override.

**Rule C3: Enterprise partners**
* Condition: `sales_status = enterprise_partner`
* Count: ~4
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Enterprise
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Plan/billing fields = per-system review
  * Free license flags = carry over existing settings
* Reasoning: Active partner accounts. Small enough to review individually.

**Rule C4: Hybrid customers**
* Condition: `sales_status = hybrid_current`
* Count: ~4
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Hybrid
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Plan/billing fields = per-system review (these have both enterprise and self-signup components)
  * Free license flags = carry over existing settings
* Reasoning: Customers with both enterprise licenses and self-signup activity. Small count; review individually.

### Rule Group D: Self-Signup Active Systems (~1,813 systems)

**Rule D1: Self-signup with active paid users**
* Condition: `sales_status = individual_self_signup` AND `total_active_paid_users > 0`
* Count: ~51
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Self-Signup
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Default plan = (carry over current plan from billing system)
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No (paid plans do not include free licenses by default)
* Reasoning: These systems have people actively paying. Their current plan details should be pulled from the billing system at migration time.

**Rule D2: Self-signup with no active paid users**
* Condition: `sales_status = individual_self_signup` AND `total_active_paid_users = 0`
* Count: ~1,240
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Self-Signup
  * lifecycle\_stage = Prospect (no active paid activity)
  * trial\_status = check Campus trial dates — if trial\_end\_date exists and is past, Expired; if current, Active; if none, None
  * Default plan = free tier
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: These signed up for self-signup but have no active paid users. They are effectively prospects using the free tier. Lifecycle may be refined once deal data is checked.

**Rule D3: Individual Google Workspace signups**
* Condition: `sales_status = individual_google`
* Count: ~471
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Self-Signup
  * lifecycle\_stage = check paid users — if `total_active_paid_users > 0`, Active Customer; otherwise Prospect
  * trial\_status = check Campus trial dates
  * Default plan = carry over current (if paid) or free tier (if not)
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: Same as individual\_self\_signup but via Google Workspace. The distinction is historical and does not affect the new model.

**Rule D4: Individual current (manually managed)**
* Condition: `sales_status = individual_current`
* Count: ~1
* Assignments:
  * Same as D1 (active paid)
* Reasoning: Legacy manually-managed individual account. Only 1 system; treat as self-signup active customer.

### Rule Group E: Prospects and Trials (~714 systems)

**Rule E1: Individual prospects**
* Condition: `sales_status = individual_prospect`
* Count: ~698
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = (null — no active deals)
  * lifecycle\_stage = Prospect
  * trial\_status = check Campus trial dates
  * Default plan = free tier
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: In the trial-to-individual pipeline. No active paid deals yet.

**Rule E2: Trial prospects**
* Condition: `sales_status = trial_prospect`
* Count: ~16
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = (null)
  * lifecycle\_stage = Prospect
  * trial\_status = check Campus trial dates — most should be Active or Expired
  * Default plan = free tier (trial)
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: Active trial prospects. Trial status is determined by dates in Campus.

### Rule Group F: Former Enterprise, Now Individual (~154 systems)

**Rule F1: Past enterprise with active self-signup activity**
* Condition: `sales_status = individual_past_enterprise` AND `total_active_paid_users > 0`
* Count: (check at migration time)
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = Self-Signup
  * lifecycle\_stage = Active Customer
  * trial\_status = None
  * Default plan = carry over current self-signup plan
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: These were enterprise customers who downgraded. Some still have active paid users under self-signup plans.

**Rule F2: Past enterprise with no active paid users**
* Condition: `sales_status = individual_past_enterprise` AND `total_active_paid_users = 0`
* Count: (check at migration time)
* Assignments:
  * system\_type = production
  * system\_state = Active
  * customer\_tier = (null)
  * lifecycle\_stage = Past Customer
  * trial\_status = None
  * Default plan = free tier
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: Former enterprise customers with no current paid activity. Retained as Past Customer for win-back reporting.

*Note: 49 systems in this group were flagged in the spreadsheet as "Need dev feedback" — these should be reviewed individually during the rule validation step and may need additional exception rules.*

### Rule Group Z: Catch-All

**Rule Z1: Systems with no sales status**
* Condition: `sales_status IS NULL` or empty
* Count: ~2,494 (based on spreadsheet NaN count)
* Assignments:
  * system\_type = production (default)
  * system\_state = Active
  * customer\_tier = compute from deal data (if any deals exist) or null
  * lifecycle\_stage = compute from deal data and activity — if has active paid users, Active Customer; if has any users, Prospect; otherwise Unknown
  * trial\_status = check Campus trial dates
  * Default plan = compute from billing system (if plan exists) or free tier
  * Free license flags = Admin: No, Faculty: No, Alumni: No, Student: No
* Reasoning: These systems were never assigned a sales status. Many are older systems that predate the sales status field. The rule uses available data (paid users, deal history, trial dates) to infer the correct values.

## 3.5 Exception Handling Process

Some systems will not fit cleanly into the rules above. The process for handling exceptions:

1. **Run rules, review the "unconfident" bucket.** After the rules engine runs, any system where the rule produced a value marked "requires per-system review" or where the input data is ambiguous (e.g., conflicting signals between sales status and actual paid users) is flagged for manual review.

2. **Create exception rules, not spreadsheet overrides.** When Jeff or Amanda makes a decision about a specific system (e.g., "BU should be Enterprise tier with annual billing, 500 licenses"), that decision is encoded as a new rule:

   *Example exception rule:*
   * Condition: `system_id = 42` (Boston University)
   * Assignments: customer\_tier = Enterprise, plan\_payment\_terms = Annual, license\_count = 500, license\_end\_date = 2027-06-30
   * Reasoning: Confirmed by Jeff per contract review, 2026-04-01

   By encoding exceptions as rules (rather than spreadsheet cells), the reasoning is preserved and the exception survives future re-runs. If the spec changes in a way that affects BU, the exception rule can be updated with clear context about why the original decision was made.

3. **Group exceptions by pattern.** Before creating per-system rules, look for patterns among the exceptions. If 30 of the 49 "need dev feedback" individual\_past\_enterprise systems all have the same characteristics (e.g., zero users, deactivated URL), create one rule for the pattern rather than 30 individual rules.

4. **Expected exception volume.** Based on the spreadsheet analysis:
   * ~94 enterprise\_current systems need plan/contract detail review (Rule C1)
   * ~34 enterprise\_sponsor systems need similar review (Rule C2)
   * ~49 individual\_past\_enterprise systems flagged for dev feedback
   * ~4 hybrid\_current systems need individual review
   * Estimated total manual review: **~180 systems** (2.4% of total), down from 7,571

## 3.6 Execution Process

### 3.6.1 Pre-Migration

1. **Encode rules as executable logic.** The rules in Section 3.4 should be translated into a SQL script or Campus migration module that can run against the production database. The rule conditions become WHERE clauses; the assignments become SET values.
2. **Run against a staging copy.** Execute the rules against a copy of the production database. Produce a summary report grouped by rule, showing: rule name, number of systems matched, sample of 3-5 systems per rule with their before/after values.
3. **Jeff and Amanda review the summary.** Review focuses on: Did the right number of systems match each rule? Do the sample before/after values look correct? Are there any systems in the catch-all (Rule Z1) that should have matched a more specific rule?
4. **Iterate.** If the review finds problems, update rules, re-run, re-review. This loop is fast because it is automated — unlike the spreadsheet, where a change required re-evaluating thousands of rows by hand.

### 3.6.2 Migration Execution

1. **Lock.** Freeze the relevant Campus tables (or run during a maintenance window) to prevent changes during migration.
2. **Run the rules engine** against production. Each system gets its new field values written.
3. **Run the deployment SQL** from the existing Migrations sheet (the staging table approach in the spreadsheet). The rules engine output feeds into this pipeline — the rules engine *replaces the CSV import step* (Step 2 in the Migrations sheet), but the downstream SQL steps (UPDATE tSystem, UPDATE system\_configuration, INSERT/UPDATE system\_license\_policy, validations, cleanup) remain as-is.
4. **Validate.** Run the verification queries from the Migrations sheet (Step 7). Additionally, run a comparison: for every system, compare the rules engine output against what was actually written. Any mismatch is a bug.

### 3.6.3 Post-Migration

1. **Auto-computation takes over.** After migration, the rules in Section 2.4 (auto-computation logic) manage tier, lifecycle, and trial status going forward. The migration rules engine is no longer needed for those fields.
2. **Plan/billing fields evolve with the billing system.** As the new billing system rolls out, plan details will be managed through the normal product workflow, not migration rules.
3. **Archive the rules.** Keep the migration rule set in version control as a record of the decisions made. If a post-migration issue is found ("why does system X have this tier?"), the rule set provides the answer.

# 4. Invoice and QuickBooks Integration

The deal-to-invoice relationship is many-to-one: multiple deals can appear as line items on a single invoice.

**Important: QuickBooks integration approach.** There is currently no QuickBooks API integration in the codebase, and none will be built as part of this project. QuickBooks invoicing will be handled entirely through Cowork's built-in sales agent at the workflow level. This means:

* Cowork identifies deals in HubSpot that should be grouped into an invoice.
* Cowork pulls the relevant deal properties (amount, type, dates, etc.) from HubSpot.
* Cowork creates the invoice in QuickBooks, with each deal as a line item.
* Cowork writes the QuickBooks invoice ID back to each deal's quickbooks\_invoice\_id field in HubSpot.

This approach avoids building and maintaining a coded QuickBooks integration. The Cowork agent handles authentication, API calls, error recovery, and reconciliation. The trade-off is that invoice creation is not fully automated in real-time, but operates as an agent-assisted workflow.

This will require changes to current finance processes. Sam and Jeff should plan for a transition period.

**Deal Type to QuickBooks Income Category Mapping**

| Deal Type | Suggested QB Category | Revenue Recognition |
| :---- | :---- | :---- |
| Enterprise License | Subscription Revenue - Enterprise | Deferred monthly over license period |
| Self-Signup License | Subscription Revenue - Self-Serve | Deferred monthly over license period |
| AI Credits | Prepaid Credits Revenue | Deferred; recognized on usage or expiry |
| One-Time Fee | Professional Services Revenue | Recognized at payment |
| Partnership | Partnership Revenue | Per agreement |
| Sponsorship | Sponsorship Revenue | Per agreement |

For Stripe-processed payments, the Stripe transaction ID should be recorded on both the HubSpot deals and the QuickBooks invoice for full traceability.

# 5. Reporting Requirements

## 5.1 ARR / Revenue Reports

* **Total ARR:** Sum across all active license deals (Enterprise + Self-Signup). Filter by Customer Tier.
* **New vs. Renewal ARR:** Filter by new\_or\_renewal property.
* **Deferred Revenue Schedule:** Monthly recognition based on license dates. AI credits tracked by balance/usage.
* **Revenue by Billing Cycle:** Annual vs. Monthly breakdown.

## 5.2 Pipeline / Forecast Reports

* **Weighted Pipeline:** Open deals by stage, weighted by probability.
* **Renewal Forecast:** Renewal Pipeline deals by expected close quarter.
* **Self-Signup Funnel:** Tracked through Self-Signup Pipeline stages.

## 5.3 Customer Health Reports

* **Active vs. Churned:** Companies by Lifecycle Stage, trended over time.
* **At-Risk Renewals:** Enterprise customers with license\_end\_date within 90 days and no confirmed renewal deal.
* **Adoption Metrics:** Campus usage data correlated with tier and deal value.
* **Self-Signup Aggregate:** Total self-signup companies, revenue, average deal size.
* **Trial Analytics:** Active trials, duration, conversion rate, expired trials by age.

# 6. Open Items

| # | Item | Context | Owner |
| :---- | :---- | :---- | :---- |
| 1 | AI credit pricing model | Exact pricing, packaging, and top-up mechanics not yet finalized | Jeff / Product |
| 2 | Workflow audit | Active HubSpot workflows referencing sales\_status must be documented before migration | Jeff / Sam |
| 3 | Deactivation + deal closure | Confirm: auto-close deals only for production system deactivation, not sandboxes | Jeff |
| 4 | QB income categories | Suggested categories need validation against actual chart of accounts | Sam |
| 5 | Contract field reconciliation | Sam's existing HubSpot contract fields must be mapped to new Campus model | Sam |
| 6 | Billing system entity mapping | Table in Section 1.4 needs developer input to complete | Dev team |
| 7 | Deal flow reversal estimation | Section 2.5 describes a major new integration; needs separate scope/estimate | Dev team |
| 8 | Enterprise plan detail review | ~94 enterprise\_current + ~34 sponsor systems need per-system plan/contract review (Rules C1, C2 in Section 3.4). Pull existing data from HubSpot deals first to pre-populate. | Jeff / Amanda |
| 9 | individual\_past\_enterprise dev feedback | 49 systems flagged for dev feedback in the migration spreadsheet (Rule F2 in Section 3.4). Determine whether these should be Past Customer or reclassified. | Jeff / Dev team |
| 10 | Migration rules implementation | Translate rules in Section 3.4 into executable SQL or Campus migration module. Integrate with existing deployment runbook (Section 3.6.2). | Dev team |

**Resolved Items (from prior versions)**

| Item | Resolution |
| :---- | :---- |
| Self-signup to enterprise upgrade | No automated threshold. Manual upgrade on request. |
| Google Sheet mapping | Superseded by the migration rules engine (Sections 3.3–3.6). The spreadsheet ([source](https://docs.google.com/spreadsheets/d/1H46pFHMbKb0vZxhen2AypIq9fhgsMMndTTIhN5ZmIs0)) was used for initial data analysis; its deployment SQL runbook is retained and integrated into the rules engine execution process. |
| Historical deal backfill | Confirmed. Cowork will assist. |
| Multi-department field | Resolved as plan\_name (free text from Campus). |
| QuickBooks integration scope | Handled via Cowork sales agent, not coded automation. |

# Appendix A: New HubSpot Properties Summary

**Company Properties (new)**

| Property Name | Type | Values |
| :---- | :---- | :---- |
| customer\_tier | Enumeration (auto-computed) | Enterprise, Hybrid, Self-Signup, Sponsor, Internal |
| lifecycle\_stage\_new | Enumeration (auto-computed) | Active Customer, Prospect, Past Customer, Unknown |
| system\_state | Enumeration (synced from Campus) | Active, Deactivated, Sandbox |
| deactivation\_reason | Enumeration | Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, Other |
| primary\_system\_type | Enumeration (synced) | Production, Sandbox, Internal |
| duplicate\_review\_flag | Boolean | Flags self-signup companies matching an existing domain |
| trial\_status | Enumeration (synced from Campus) | None, Active, Expired, Extended |
| trial\_start\_date | Date (synced) | When the trial began |
| trial\_end\_date | Date (synced) | When the trial expires/expired |
| trial\_extension\_count | Number (synced) | Number of trial extensions |

**Deal Properties (new)**

| Property Name | Type | Values / Format |
| :---- | :---- | :---- |
| plan\_tier | Enumeration | Enterprise, Group, Individual |
| billing\_cycle | Enumeration | Annual, Monthly |
| is\_trial | Boolean | Yes, No |
| deal\_source | Enumeration | Managed, Self-Signup |
| new\_or\_renewal | Enumeration | New Business, Renewal, Expansion |
| contract\_term | Enumeration | Single Year, Multi-Year |
| transaction\_reference\_id | String | Internal batch ID |
| stripe\_transaction\_id | String | Stripe payment/checkout session ID |
| quickbooks\_invoice\_id | String | QuickBooks invoice ID |
| contract\_reference\_id | String | Campus contract ID |
| plan\_name | String | Free text; Campus plan/deal name |
| price\_per\_license | Currency | Per-license fee |
| option\_type | String | Options/add-ons description |
| option\_fee | Currency | Fee for options/add-ons |
| paid\_status | Enumeration | Unpaid, Paid, Partial, Overdue, Waived |
| billing\_grace\_mode | Boolean | When enabled, Overdue status is not enforced for this deal. No tier change, access restriction, or user-facing messages. Set by staff in Campus admin. |

**Contact Properties (new/modified)**

| Property Name | Type | Values / Format |
| :---- | :---- | :---- |
| sales\_role | Multi-select enumeration (new) | Decision Maker, Renewal Contact, Self-Signup Purchaser, Group Admin, Individual User, Abandoned Cart, Tax Exempt Contact |
| operational\_role | Multi-select enumeration (extend existing) | System Admin (Active), System Admin (Inactive), LTI/SSO Contact, Assessment Lead, Department Chair, Support Contact |
| total\_lifetime\_spend | Currency (auto-computed) | Sum of all closed-won deal amounts |
| current\_fy\_spend | Currency (auto-computed) | Sum of closed-won deals in current fiscal year (Jul 1 - Jun 30) |
| purchase\_intent\_level | Enumeration | None, Browsed Plans, Started Checkout, Completed Purchase |
