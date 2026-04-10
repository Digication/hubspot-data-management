**Sales & Billing Architecture**
**Specification Document**

Version 2.0 | March 25, 2026
Prepared for Jeff Yan, Digication

*v2: Incorporates engineering review feedback (9 issues addressed)*

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

* **Campus > HubSpot (existing):** Campus syncs company data, usage stats, and sales\_status to HubSpot on a periodic batch schedule. The sync uses sales\_status to filter which systems are eligible (deactivated and sandbox systems are excluded).
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

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Enterprise | Has at least one active Enterprise License deal | enterprise\_current, enterprise\_sponsor, enterprise\_partner |
| Hybrid | Has both Enterprise and Self-Signup active deals | hybrid\_current |
| Self-Signup | Has active Self-Signup deals only | individual\_current, individual\_self\_signup, individual\_google |
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
| trial\_active | Boolean (computed) | New -- derived from trial\_end\_date >= today |
| trial\_status | Enumeration | New -- None, Active, Expired, Extended |
| trial\_extension\_count | Number | New -- count of extensions (0 = never) |

**Property 3: System State (synced from Campus)**

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Active | System is operational; users can log in | Default for all active systems |
| Deactivated | System is disabled; no login. Deactivation\_reason captures why. | All deactivated\_\* statuses |
| Sandbox | Non-production sandbox | sandbox |

New field: Deactivation Reason -- When System State = Deactivated, a separate enumeration captures the reason: Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, or Other.

**Required: Final sync on deactivation.** When a system transitions to Deactivated (or any non-syncing state), Campus must perform one final sync push to HubSpot before excluding the system from future syncs. This push updates `system_state`, `deactivation_reason`, and any other changed fields so that the HubSpot record reflects the terminal state. Without this, HubSpot retains the last pre-deactivation snapshot permanently (confirmed in codebase review — current sync silently drops deactivated systems). A `last_synced_date` property on the HubSpot Company record allows reports to identify and filter stale data.

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
* 3\. If any active deal has deal\_type = Enterprise License, and any other deal has deal\_type = Self-Signup License, tier = Hybrid.
* 4\. If any active deal has deal\_type = Enterprise License (and no Self-Signup), tier = Enterprise.
* 5\. If active deals exist but none are Enterprise, tier = Self-Signup.
* 6\. If no active deals exist, tier is cleared (null) and lifecycle stage determines the display.

### 2.4.3 Lifecycle Stage Computation Rules

* 1\. If any deal associated with the company has paid\_status = Paid and license\_end\_date >= today, stage = Active Customer.
* 2\. If no active deals but the company has at least one historical deal (any deal that was ever closed-won), stage = Past Customer.
* 3\. If the company has contacts, signup activity, or an associated system, but no deal history, stage = Prospect.
* 4\. Otherwise, stage = Unknown.

### 2.4.4 Trial Status Computation Rules

* 1\. trial\_active = true if trial\_end\_date >= today AND there is no active paid deal for the system.
* 2\. trial\_status = Active if trial\_active is true.
* 3\. trial\_status = Expired if trial\_end\_date < today AND no paid deal exists.
* 4\. trial\_status = Extended if trial\_extension\_count > 0 AND trial\_active is true.
* 5\. trial\_status = None if the system never had a trial or has an active paid deal (trial no longer relevant).

### 2.4.5 Manual Override Points

Auto-computation handles the standard lifecycle, but Digication staff must be able to override certain values in Campus. The following override scenarios are supported:

| Scenario | Override Action | Effect on Computation |
| :---- | :---- | :---- |
| Extend a prospect's trial | Staff edits trial\_end\_date and increments trial\_extension\_count in Campus admin | trial\_status remains Active (or changes to Extended); lifecycle stays Prospect; system is not deactivated when the original date passes |
| Tag a company as Sponsor | Staff sets manual\_tier\_override = Sponsor in Campus admin | Customer Tier computation is skipped; Sponsor value syncs to HubSpot |
| Tag a system as Internal | Staff sets manual\_tier\_override = Internal in Campus admin | System excluded from customer reports; tier = Internal |
| Force a company to Past Customer | Staff sets manual\_lifecycle\_override = Past Customer | Overrides the computed lifecycle; useful when a known-churned customer's deals haven't been formally closed yet |
| Reactivate a deactivated system | Staff changes system\_state back to Active in Campus admin | System becomes syncable again; lifecycle re-evaluated based on deal state |

All manual overrides should be logged with timestamp and user for audit purposes. An override can be cleared to return to auto-computed behavior.

**Override visibility in HubSpot**

When any manual override is active, Campus sets the `lifecycle_is_override` boolean to true on the corresponding HubSpot Company record. This allows HubSpot reports and workflows to distinguish between auto-computed and manually overridden values without syncing the full audit trail (which stays in Campus admin). When the override is cleared, `lifecycle_is_override` resets to false.

## 2.5 Integration Architecture: Deal Flow Reversal

This section addresses the most significant infrastructure change in the new architecture. Today, deals flow only from HubSpot to Campus (read-only). The new system requires the reverse: Campus creates deals and pushes them to HubSpot. This is a major new integration that must be scoped and built as a dedicated workstream.

### 2.5.1 Current State

* HubSpot > Campus: Sales team creates deals in HubSpot. Campus downloads deal data on a batch schedule for reference. Campus never creates or modifies deals in HubSpot.
* This integration was previously built to push deals from HubSpot to Campus; that direction will be deprecated.

### 2.5.2 Target State

* **Self-signup deals (Campus > HubSpot):** When a self-signup customer completes a Stripe checkout, Campus creates the deal(s) in HubSpot via the HubSpot API. Each product in the checkout (license, AI credits, setup fee) becomes a separate deal. This happens in real-time via API call, not batch sync.
* **Enterprise deals (HubSpot, managed manually):** During the transition period, enterprise deals continue to be created by the sales team in HubSpot. Over time, as contract management moves to Campus, enterprise deals may also originate in Campus.
* **Coexistence:** Both workflows must run in parallel. The system must handle deals created from either direction without conflicts or duplicates. The deal\_source property (Managed vs. Self-Signup) identifies the origin.

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
* Create the three new trial fields (trial\_active, trial\_status, trial\_extension\_count). trial\_start\_date and trial\_end\_date already exist.
* Build the manual override fields (manual\_tier\_override, manual\_lifecycle\_override) in Campus admin.
* Reconcile Sam's existing contract-related HubSpot properties with the Campus contract model.
* Audit existing contract and deal data in HubSpot's Contracts pipeline. Plan a one-time import of active contract records into the new Campus contract model so that Campus launches as the source of truth with complete data. Owner: Sam + dev team.

**HubSpot-side:**
* Create new Company properties: customer\_tier, lifecycle\_stage\_new, system\_state, deactivation\_reason, lifecycle\_is\_override, last\_synced\_date, trial\_active, trial\_status, trial\_start\_date, trial\_end\_date, trial\_extension\_count.
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
* Migrate sync filter logic: replace sales\_status-based filtering with system\_type + system\_state filtering. This must be done before sales\_status can be archived.

**HubSpot-side:**
* Run migration script to populate new Company properties from the mapping table.
* Route self-signup deals into the Self-Signup Pipeline.
* Begin syncing self-signup Contacts with Sales Role tags.
* Validate: compare auto-computed values against legacy field for **all segments** — not just the 88 enterprise customers. Cross-check every record's new computed values against the mapping table (Section 3.1). Zero mismatches expected for records with a clear legacy mapping. The 2,741 records with no `sales_status` should be manually reviewed as a sample. **Phase 3 must not begin until validation passes across all segments.**

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

| # | Item | Context | Owner | Status |
| :---- | :---- | :---- | :---- | :---- |
| 1 | AI credit pricing model | Exact pricing, packaging, and top-up mechanics not yet finalized | Jeff / Product | Open — waiting on product team |
| 2 | Workflow audit | Active HubSpot workflows referencing sales\_status must be documented before migration | Jeff / Amanda | Open — part of HubSpot audit project |
| 3 | Deactivation + deal closure | B2C deals: auto-close on expiration, auto-deactivate when all deals closed. B2B deals: always manual, with pre-deactivation safety check. See detailed analysis below. | Jeff + Dev team | Direction set — needs developer input on implementation (grace period, UI, deal type detection) |
| 4 | QB income categories | Suggested categories need validation against actual chart of accounts. Likely creating new categories as business model evolves; requires bookkeeper/accountant approval. | Jeff / Amanda | Deferred — will address when ready |
| 5 | Contract field reconciliation | Sam's existing HubSpot contract fields must be mapped to new Campus contract model. Part of the broader HubSpot field audit project. | Jeff / Amanda | Open — part of HubSpot audit project |
| 6 | Billing system entity mapping | Table in Section 1.4 needs developer input to complete | Dev team | Open — developer task |
| 7 | Deal flow reversal estimation | Section 2.5 describes a major new integration; needs separate scope/estimate | Dev team | Open — developer task |
| 8 | Contract creation UI/workflow in Campus | Define whether contracts are created manually in Campus admin (support-only), auto-generated from deals, or synced inbound. Clarify the operational model for the sales team. | Jeff / Amanda | Open |

**Resolved Items (from prior versions)**

| Item | Resolution |
| :---- | :---- |
| Self-signup to enterprise upgrade | No automated threshold. Manual upgrade on request. |
| Google Sheet mapping | Abandoned. This spec is the authoritative reference. |
| Historical deal backfill | Confirmed. Cowork will assist. |
| Multi-department field | Resolved as plan\_name (free text from Campus). |
| QuickBooks integration scope | Handled via Cowork sales agent, not coded automation. |

## Open Item #3 Detail: Deactivation + Deal Closure Analysis

**Conclusion: Deactivation and deal closure rules should follow the B2B/B2C split.** B2C deals can be automated. B2B deals require human judgment.

### Background

The original question was "should deals auto-close when a system is deactivated?" Jeff's analysis reveals the answer depends on the deal type. The B2B vs B2C distinction that shapes revenue reporting also shapes operational rules:

- **B2C deals** (individual self-signup, group plans) are transactional. The lifecycle is predictable: subscribe → use → renew or don't. There's no relationship to manage, and making case-by-case decisions on each $30 subscription is busywork nobody wants.
- **B2B deals** (enterprise contracts) are relationship-driven. The same system might keep running for months after a deal ends because of ongoing negotiations, individual subscribers, or just goodwill. These need human judgment.

### B2C rules (automated)

**Deal closure:**
- Subscription end date passes + no renewal + no outstanding payment → **auto-close the deal as Closed Lost (Churned)**
- Subscription end date passes + payment still outstanding → **keep deal open in Overdue state** (collections, not closure)

**System deactivation:**
- All B2C deals on a system are closed AND no B2B deals exist → **auto-deactivate the system**
- This is the clean case: a standalone group or set of individuals, all subscriptions expired, nobody paying. Turn off the lights.

**Why this is safe to automate:** The deal values are small, the lifecycle is well-defined, and there's no relationship nuance. If a $30 subscriber didn't renew, there's nothing to discuss.

### B2B rules (human judgment, case-by-case)

**Deal closure:**
- Enterprise deals are **never auto-closed**. Staff marks them as Closed Lost/Closed Won manually.
- Even when a deal's end date passes, it may be in renewal negotiation, awaiting payment, or transitioning to a different contract structure.

**System deactivation — pre-deactivation safety check:**

When staff attempts to deactivate a production system that has (or has had) B2B deals, Campus should display a check showing:
- All active B2B deals (paid, current subscription period)
- All unpaid/overdue B2B deals (end date passed, payment not received)
- Count and status of active B2C deals on the same system
- Warning: "X users will lose access"

Staff then decides:
- If there are active paid B2B deals → **Block deactivation** unless staff explicitly overrides (e.g., security incident)
- If there are only expired/unpaid B2B deals → **Allow deactivation** but keep deals open for collections
- If all B2B deals are closed but B2C deals remain → **Block deactivation** (B2C auto-rules will handle it when those subscriptions end)

**Why B2B can't be automated:** A system can be deactivated while deals remain open (hacked system, but still collecting payment). A deal can close while the system stays active (enterprise deal lost, but 50 individual subscribers still paying). Digication has historically kept systems running long after enterprise deals end — this is intentional, not a bug.

**A deal's end date can pass without the deal being "done."** Example: A deal ended on April 1, but the customer hasn't paid yet. The deal is expired but not closed — it's in a collections state. Deactivating the system doesn't resolve the payment, and closing the deal prematurely signals write-off.

### Mixed B2B + B2C systems

Many systems will have both enterprise and individual/group deals. The rules compose:

| System has... | B2C auto-rules | B2B manual rules | System deactivation |
|---|---|---|---|
| Only B2C deals | Apply normally | N/A | Auto-deactivate when all B2C deals close |
| Only B2B deals | N/A | Apply normally | Manual decision with pre-deactivation check |
| Both B2B + B2C | B2C deals auto-close independently | B2B deals require manual action | Manual decision — B2B deals keep the system "protected" from auto-deactivation even if all B2C deals close |

The key rule: **If any B2B deal has ever existed on a system, that system requires manual deactivation review.** The presence of an enterprise relationship, even a past one, means there's context that automation can't capture.

### Sandboxes

No deals should ever be associated with sandbox systems. Deactivation has no deal implications.

### Developer questions

1. What does the deactivation UI in Campus look like today? Is there room to add a pre-deactivation deal check?
2. Can Campus reliably detect when a system has zero remaining active deals or paying users? (Needed for B2C auto-deactivation trigger.)
3. Can Campus distinguish B2B from B2C deals for the purpose of applying different closure rules? (This likely maps to deal type / customer tier.)
4. What's the right grace period for B2C auto-closure? Immediate on expiration, or a buffer (e.g., 30 days) to allow late renewals?

# Appendix A: New HubSpot Properties Summary

**Company Properties (new)**

| Property Name | Type | Values |
| :---- | :---- | :---- |
| customer\_tier | Enumeration (auto-computed) | Enterprise, Hybrid, Self-Signup, Sponsor, Internal |
| lifecycle\_stage\_new | Enumeration (auto-computed) | Active Customer, Prospect, Past Customer, Unknown |
| system\_state | Enumeration (synced from Campus) | Active, Deactivated, Sandbox |
| deactivation\_reason | Enumeration | Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, Other |
| primary\_system\_type | Enumeration (synced) | Production, Sandbox, Internal |
| lifecycle\_is\_override | Boolean (synced from Campus) | True when any manual override (tier or lifecycle) is active; allows HubSpot reports/workflows to distinguish overridden values from auto-computed ones |
| duplicate\_review\_flag | Boolean | Flags self-signup companies matching an existing domain |
| trial\_active | Boolean (synced from Campus) | Whether any associated system has an active trial |
| trial\_status | Enumeration (synced) | None, Active, Expired, Extended |
| trial\_start\_date | Date (synced) | When the trial began |
| trial\_end\_date | Date (synced) | When the trial expires/expired |
| trial\_extension\_count | Number (synced) | Number of trial extensions |
| last\_synced\_date | Date (synced from Campus) | Timestamp of most recent Campus-to-HubSpot sync for this Company; enables filtering/flagging stale records |

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
| total\_lifetime\_spend | Currency (auto-computed) | Sum of all closed-won deal amounts associated with the contact |
| current\_fy\_spend | Currency (auto-computed) | Sum of closed-won deals in current fiscal year (Jul 1 - Jun 30) associated with the contact |

**Dependency for contact-level spend:** These properties are computed from deals associated with the contact in HubSpot. Every deal — whether created by Campus (self-signup) or by the sales team (enterprise) — must be associated with both a Company and a Contact at creation time. If a deal has no contact association, its amount will not appear in any contact's spend totals. This is a hard requirement for the deal creation workflow in both Section 2.5 (deal flow reversal) and the manual enterprise deal process.
| purchase\_intent\_level | Enumeration | None, Browsed Plans, Started Checkout, Completed Purchase |
