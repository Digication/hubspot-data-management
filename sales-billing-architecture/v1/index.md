

**Sales & Billing Architecture**  
**Specification Document**

Version 2.0  |  March 20, 2026  
Prepared for Jeff Yan, Digication  
*Revised based on comments from Jeff Yan and Amanda Larson*

**Document Purpose**  
This document defines the new data architecture for Digication's sales and billing systems, covering the restructured relationship between Digication Campus, HubSpot CRM, Stripe, and QuickBooks. It addresses the transition from the legacy 19-value sales\_status field to a modern, auto-computed model that supports both enterprise (managed) and self-signup sales channels.

**Scope**

* **Company-to-System mapping:** how HubSpot Companies relate to Digication Campus Systems

* **New Company Status model:** replacing the legacy sales\_status field with auto-computed, separated concerns

* **Deal architecture:** new deal types, properties, and relationship to contracts, invoices, and Stripe transactions

* **Contact roles:** new role taxonomy for the self-signup world

* **Contract tracking:** new first-class contract management in Campus

* **Pipeline restructuring:** new Self-Signup Pipeline and consolidation of legacy pipelines

* **Migration plan:** mapping from the 19 legacy statuses to the new model, with current record counts

# **1\. Current State Analysis**

## **1.1 Legacy Sales Status Distribution**

The current sales\_status field on HubSpot Company records contains 19 possible values. Based on live **HubSpot** data (not Campus data) as of March 20, 2026, the distribution is:

*Note: These counts reflect HubSpot Company records only. The actual number of Campus systems may differ, as not all systems have a corresponding HubSpot Company, and some companies may have multiple systems.*

| Status Value | Label | Count | Notes |
| :---- | :---- | :---- | :---- |
| trial\_prospect | Trial (Prospect) | 27 | Active trial prospects |
| trial\_google | Trial (Google Workspace) | 0 | Unused; can be retired |
| enterprise\_current | Enterprise (Current Customer) | 88 | Core paying enterprise customers |
| enterprise\_sponsor | Enterprise (Sponsor) | 12 | Sponsored enterprise accounts |
| enterprise\_partner | Enterprise (Partner) | 0 | Unused; can be retired |
| hybrid\_current | Hybrid (Current Customer) | 4 | Enterprise \+ individual mix |
| individual\_current | Individual (Current Customer) | 1 | Manually managed individual |
| individual\_self\_signup | Individual (Self-signed up) | 1,040 | Largest active segment |
| individual\_google | Individual (Google Workspace) | 451 | Google Workspace sign-ups |
| individual\_past\_enterprise | Individual (Past Enterprise) | 133 | Downgraded from enterprise |
| individual\_prospect | Individual (Prospect) | 454 | Trial-to-individual pipeline |
| deactivated\_past\_customer | Deactivated (Past Customer) | 0 | Unused |
| deactivated\_prospect | Deactivated (Prospect) | 1 | Nearly unused |
| deactivated\_partner | Deactivated (Partner) | 0 | Unused |
| deactivated\_unqualified\_signup | Deactivated (Unqualified) | 0 | Unused |
| deactivated\_internal | Deactivated (Internal) | 0 | Unused |
| deactivated\_duplicate | Deactivated (Duplicate) | 1 | Nearly unused |
| sandbox | Sandbox (Customer) | 0 | Unused in HubSpot |
| internal | Sandbox (Internal) | 0 | Unused in HubSpot |
| (no value set) | (No sales status) | 2,741 | Majority of records have no status |

## **1.2 Current HubSpot Deal Structure**

Deals are distributed across six pipelines. The two primary sales pipelines are:

| Pipeline | Total Deals | Purpose |
| :---- | :---- | :---- |
| Prospects Pipeline | 1,235 | New business acquisition, from initial contact through invoice payment |
| Renewal Pipeline | 2,449 | Annual renewals for existing customers |
| RFP Pipeline | (varies) | Formal RFP response tracking |
| Contracts | (varies) | Contract lifecycle tracking |
| Digi Scholars Pipeline | (varies) | VIP/scholars event management |
| Hiring Pipeline | (varies) | Non-sales; recruitment tracking |

Pipeline Restructuring Recommendation: The legacy pipelines should be cleaned up over time. Critically, a new Self-Signup Pipeline should be created to handle the self-service sales channel, which will use a light-touch approach (automated email reminders, nudges to purchase online directly) rather than the hands-on stages of the Prospects Pipeline. The Hiring Pipeline should be removed from the deals object entirely. The Digi Scholars Pipeline should be evaluated for continued relevance.

**Proposed Pipeline Structure going forward:**

* **Enterprise Prospects Pipeline:** For managed enterprise sales (replaces current Prospects Pipeline)

* **Self-Signup Pipeline:** New pipeline for self-service customers. Stages: Sign Up \> Trial \> Cart Activity \> Purchased \> Renewal Due \> Renewed / Churned. Designed for automated, light-touch follow-up.

* **Renewal Pipeline:** Retained for enterprise renewals.

* **Contracts Pipeline:** Retained for contract lifecycle tracking.

## **1.3 Problems with the Current Model**

The legacy model has several structural issues that the new architecture must solve:

* **Conflated concerns:** The sales\_status field mixes product tier (enterprise/individual), lifecycle stage (current/past/prospect), and system state (active/deactivated) into a single field. This makes reporting unreliable and requires manual updates.

* **No self-signup support:** The new billing system creates systems and processes payments automatically, but has no way to set the legacy sales\_status field correctly.

* **No contract tracking:** Contracts are not structured data in either system. There is no log of amendments, no PDF storage, and no linkage between contracts and the deals they govern.

* **1:1 Company-System assumption:** The current sync logic cannot handle companies with multiple production systems or shared sandbox systems cleanly.

* **No AI credit tracking:** There is no deal type, pipeline stage, or property structure for AI credit purchases.

* **Manual status management:** Status changes require manual updates in Campus, then sync to HubSpot. This is error-prone and does not scale with self-signup volume.

* **No self-signup pipeline:** Self-signup deals are forced into pipelines designed for enterprise sales, making light-touch automated follow-up impractical.

# **2\. New Architecture**

## **2.1 Design Principles**

* **Separation of concerns:** Product tier, lifecycle stage, and system state are tracked as independent properties, not conflated into one field.

* **Auto-computed status:** The company-level status is derived from active deals and plans. No manual updates required for standard lifecycle transitions.

* **One deal per transaction type:** Each financial line item (license, AI credits, setup fee) is its own deal, linked to a shared transaction/invoice reference. This enables clean ARR, deferred revenue, and financial reporting.

* **Campus as source of truth:** Digication Campus owns system data, contracts, and billing state. HubSpot receives synced data for sales and reporting.

* **Domain-based matching for self-signups:** New self-signup systems create a new HubSpot Company by default. Email domain matching flags potential duplicates for manual review.

* **No automated upgrade gating:** Self-signup customers can purchase as many accounts as they want at self-serve pricing. There is no automated threshold that forces an enterprise conversation. If a customer wants to move to enterprise pricing (which would be cheaper at scale), they request it manually and the sales team handles the transition.

## **2.2 Company-to-System Relationship**

**Model: One Company, potentially many Systems**

A HubSpot Company record represents a single institution (e.g., Boston University). That institution may have multiple Campus systems: one or more production systems, plus sandboxes. The rules are:

* **Production systems:** Sync data to the parent HubSpot Company. A new Campus field 'system\_type' (production/sandbox/internal) determines sync eligibility. Only production systems sync.

* **Sandbox systems:** Tracked in Campus only. They link to the parent Company via system\_id\_\_c but do not push data to HubSpot.

* **Multi-department institutions:** When different departments at the same university want separate systems, they remain under one HubSpot Company. Differentiation is handled through the Campus plan name field. For example, an enterprise plan can be named 'Department of Engineering' or 'Medical School,' and this plan name syncs to HubSpot as the deal name. This provides context without requiring a separate department field.

**Self-Signup Company Creation**

When a new user self-signs up through the billing system:

* 1\. A new Campus system is created automatically.

* 2\. A new HubSpot Company record is always created (never auto-merged into an existing company).

* 3\. The system compares the user's email domain against existing HubSpot Company domains.

* 4\. If a domain match is found, the new Company is flagged for manual review (potential duplicate).

* 5\. A sales team member reviews and decides whether to merge or keep separate.

## **2.3 New Company Status Model**

The legacy 19-value sales\_status field is replaced by three independent properties on each HubSpot Company record:

**Property 1: Customer Tier (auto-computed)**

This replaces the product-tier dimension of the old field. It is auto-computed based on the highest-value active deal/plan associated with the company.

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Enterprise | Has at least one active Enterprise License deal | enterprise\_current, enterprise\_sponsor, enterprise\_partner |
| Hybrid | Has both Enterprise and Self-Signup active deals | hybrid\_current |
| Self-Signup | Has active Self-Signup deals only (no enterprise) | individual\_current, individual\_self\_signup, individual\_google |
| Sponsor | Manually tagged; enterprise deal funded by third party | enterprise\_sponsor (manual override) |
| Internal | Manually tagged; Digication-owned system | internal, sandbox |

**Property 2: Lifecycle Stage (auto-computed)**

This replaces the lifecycle dimension. It is auto-computed based on deal history and current state. Trial status has been removed from this property and moved to a dedicated Trial Status property (see below), since trial is better understood as a time-bound state that overlaps with Prospect rather than a separate lifecycle stage. Past Customer and Churned have been merged into a single value, since the distinction can be inferred from the most recent deal outcome.

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Active Customer | Has at least one active (paid, non-expired) deal | All '\*\_current' statuses |
| Prospect | Has a Contact or signup activity but no closed-won deal. May or may not be in trial. | trial\_prospect, trial\_google, individual\_prospect |
| Past Customer | Had deals previously, all now expired/churned with no active renewal | individual\_past\_enterprise, deactivated\_past\_customer, Churned |
| Unknown | No deal history, no trial, no activity (e.g., auto-created from Zendesk) | Companies with no sales\_status |

**Property 2b: Trial Status (separate from Lifecycle Stage)**

Trial is tracked as its own set of properties at the system level in Campus, synced to HubSpot. This allows a Prospect to be in an active trial, an expired trial, or no trial at all, without conflating trial state with lifecycle stage.

| Property | Type | Description |
| :---- | :---- | :---- |
| trial\_active | Boolean | Whether the system currently has an active trial |
| trial\_status | Enumeration | None, Active, Expired, Extended \-- provides granular trial state |
| trial\_start\_date | Date | When the trial began |
| trial\_end\_date | Date | When the trial expires or expired |
| trial\_extension\_count | Number | How many times the trial has been extended (0 \= never) |

At the company level, if any associated system has trial\_active \= Yes, the company can be filtered as 'Prospect (in trial)' in reports without needing a separate lifecycle stage value.

**Property 3: System State (synced from Campus)**

| Value | Logic | Replaces |
| :---- | :---- | :---- |
| Active | System is operational; users can log in | Default for all active systems |
| Deactivated | System is disabled; no one can log in. Separate 'deactivation\_reason' field captures why. | All deactivated\_\* statuses |
| Sandbox | System is a non-production sandbox | sandbox |

New field: Deactivation Reason \-- When System State \= Deactivated, a separate enumeration captures the reason: Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, or Other.

## **2.4 Deal Architecture**

**Core Principle: One deal per transaction type, linked by a shared reference.**

When a customer makes a purchase (whether through self-signup checkout or an enterprise agreement), each distinct product/service becomes its own deal in HubSpot. For example, a single Stripe checkout where a customer buys 30 licenses \+ $2,000 integration fee \+ $300 AI credits produces three separate deals. All three deals share a transaction\_reference\_id.

The transaction\_reference\_id links related deals across multiple systems. For Stripe-based purchases, this is the Stripe transaction/checkout session ID. For manually invoiced enterprise deals, this is an internal batch ID. For QuickBooks, the QuickBooks invoice ID should also be captured, since a single QuickBooks invoice may group multiple deals as line items. Each of these references (Stripe, QuickBooks, internal) should be stored as separate properties on the deal so that full traceability exists across all systems.

This separation is critical because:

* License deals generate ARR (annual recurring revenue) and require deferred revenue calculations.

* One-time fees (setup, integration) are recognized immediately; no deferred revenue.

* AI credit deals behave like prepaid cards with a two-year expiry window and are not traditional ARR.

* Each product type can define its own revenue recognition model. For example, a license product defaults to deferred ARR, but a particular add-on product might be recognized as a one-time fee. The revenue treatment is driven by the deal type and can be further refined by product-level configuration in Campus.

**Deal Type (enumeration property)**

| Deal Type | Description | Revenue Treatment |
| :---- | :---- | :---- |
| Enterprise License | Managed enterprise license deal (200+ accounts) | ARR; deferred revenue |
| Self-Signup License | Self-service individual or group license purchase | ARR; deferred revenue |
| AI Credits | Prepaid AI usage credits with expiry | Deferred; recognized on usage or expiry (up to 2 years) |
| One-Time Fee | Setup, integration, training, or other non-recurring charges | Recognized immediately |
| Partnership | Revenue from partner relationships | Varies by agreement |
| Sponsorship | Sponsored/subsidized accounts | Varies by agreement |

**Deal Properties**

| Property | Type | Values / Description |
| :---- | :---- | :---- |
| plan\_tier | Enumeration | Enterprise, Group, Individual |
| billing\_cycle | Enumeration | Annual, Monthly |
| is\_trial | Boolean | Yes/No \-- indicates this deal originated from or is associated with a trial. Useful for filtering but does not roll up to company lifecycle stage (trial tracking lives on the system level). |
| deal\_source | Enumeration | Managed (enterprise sales), Self-Signup (automated checkout) |
| new\_or\_renewal | Enumeration | New Business, Renewal, Expansion |
| contract\_term | Enumeration | Single Year, Multi-Year |
| auto\_renewal | Boolean | Yes/No |
| transaction\_reference\_id | String | Internal batch ID linking deals from the same purchase event |
| stripe\_transaction\_id | String | Stripe payment/checkout session ID |
| quickbooks\_invoice\_id | String | QuickBooks invoice ID when this deal appears as a line item on a QB invoice |
| contract\_reference\_id | String | Campus contract ID governing this deal |
| plan\_name | String | The plan/deal name from Campus (e.g., 'Enterprise \- Dept of Engineering'). Free text, synced from Campus. |
| license\_count | Number | Number of licenses in this deal |
| price\_per\_license | Currency | Per-license fee |
| option\_type | String | Description of any options/add-ons included |
| option\_fee | Currency | Fee for options/add-ons |
| license\_start\_date | Date | Start of the license period |
| license\_end\_date | Date | End of the license period |
| paid\_status | Enumeration | Unpaid, Paid, Partial, Overdue, Waived |

## **2.5 Contract Management**

Contracts become a first-class entity in Digication Campus (source of truth), with metadata synced to HubSpot for reporting.

Note: Sam has already set up contract-related properties in HubSpot (under the Contracts pipeline and related fields). The new contract model in Campus should incorporate and extend those existing HubSpot fields rather than replacing them from scratch. A reconciliation of the existing HubSpot contract fields with the Campus model below is needed during implementation.

**Contract Data Model (Campus)**

| Field | Type | Description |
| :---- | :---- | :---- |
| contract\_id | Auto-generated | Unique identifier for the contract |
| company\_id / system\_id | Reference | Links to the Campus system and HubSpot Company |
| contract\_type | Enumeration | New Agreement, Amendment, Extension, Renewal |
| effective\_date | Date | When the contract takes effect |
| expiration\_date | Date | When the contract expires |
| total\_term\_length | String | e.g., '3 years' \-- for display and reporting |
| auto\_renewal | Boolean | Whether the contract auto-renews at expiration |
| total\_contract\_value | Currency | Sum of all years / all deal values under this contract |
| contract\_pdf | File attachment | Uploaded PDF of the signed contract |
| amendment\_history | List of references | Links to prior contracts/amendments that this contract modifies |
| status | Enumeration | Draft, Active, Expired, Terminated |
| notes | Text | Free-text notes about the contract |

Contracts govern one or more deals. A three-year contract with different student counts per year produces three annual license deals, each referencing the same contract\_reference\_id. Not all deals require contracts; self-signup purchases typically have no contract.

## **2.6 Contact Role Model**

The new billing system significantly expands who becomes a Contact in HubSpot. The principle is: anyone who interacts with Digication's commercial surface should have a Contact record, tagged appropriately.

**Contact roles should be split into two separate multi-select fields to keep sales activity distinct from operational/academic roles:**

**Field 1: Sales Role (new field)**  
Focused on commercial/purchasing activity. This is the primary field for sales team workflows and reporting.

| Role | Description | Source |
| :---- | :---- | :---- |
| Decision Maker | Has authority to approve purchases for the institution | Manual tagging by sales team |
| Renewal Contact | Primary contact for annual renewal communications | Manual tagging by sales team |
| Self-Signup Purchaser | Purchased licenses through the self-signup checkout | Auto-created from billing system |
| Group Admin | Manages a group plan (multiple users under one purchaser) | Auto-created from billing system |
| Individual User | Has their own individual paid plan | Auto-created from billing system |
| Abandoned Cart | Started checkout flow but did not complete purchase | Auto-created from billing system |
| Tax Exempt Contact | Handles tax exemption documentation | Manual tagging |

**Field 2: Operational Role (existing field, extended)**  
Covers non-sales roles such as system administration, technical contacts, and academic roles. The existing HubSpot contact roles field can be extended for this purpose.

| Role | Description | Source |
| :---- | :---- | :---- |
| System Admin (Active) | Campus admin who is actively using admin features | Auto-synced from Campus |
| System Admin (Inactive) | Has admin role but low/no recent activity | Auto-synced from Campus |
| LTI/SSO Contact | Technical contact for integration setup | Manual tagging |
| Assessment Lead | Leads assessment/portfolio initiatives | Manual tagging |
| Department Chair | Academic department leadership | Manual tagging |
| Support Contact | Created from Zendesk interactions | Auto-created from Zendesk sync |

Regarding Abandoned Cart contacts: these will be created in HubSpot for all users who enter the checkout flow but do not complete purchase, even though this will add volume. The rationale is that if a person holds a significant role at an institution (e.g., a department chair exploring group purchasing), that signal is valuable for sales follow-up. In the near term, this data will not be part of day-to-day sales operations. Longer term, AI-driven automation will be used to identify high-value abandoned cart contacts and trigger personalized follow-up. Noise management strategies (filtering, segmentation) will be developed as volume grows.

For self-signup purchasers, the system should also track aggregate spend data: total lifetime spend, current fiscal year spend, ARR contribution, and non-recurring spend.

# **3\. Migration Plan**

## **3.1 Status Migration Mapping**

Each of the 19 legacy sales\_status values maps to the new model as follows. Note: Trial is no longer a lifecycle stage; trial state is captured in the dedicated Trial Status properties at the system level.

| Legacy Status | Count | New Tier | New Lifecycle | New State | Trial Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| trial\_prospect | 27 | Self-Signup | Prospect | Active | Check Campus for active/expired |
| trial\_google | 0 | (retire) | (retire) | (retire) | n/a |
| enterprise\_current | 88 | Enterprise | Active Customer | Active | None |
| enterprise\_sponsor | 12 | Sponsor | Active Customer | Active | None |
| enterprise\_partner | 0 | (retire) | (retire) | (retire) | n/a |
| hybrid\_current | 4 | Hybrid | Active Customer | Active | None |
| individual\_current | 1 | Self-Signup | Active Customer | Active | None |
| individual\_self\_signup | 1,040 | Self-Signup | Active Customer\* | Active | None |
| individual\_google | 451 | Self-Signup | Active Customer\* | Active | None |
| individual\_past\_enterprise | 133 | Self-Signup | Past Customer | Active | None |
| individual\_prospect | 454 | Self-Signup | Prospect | Active | Check Campus |
| deactivated\_past\_customer | 0 | (from deals) | Past Customer | Deactivated | None |
| deactivated\_prospect | 1 | (none) | Prospect | Deactivated | Expired |
| deactivated\_partner | 0 | (retire) | (retire) | (retire) | n/a |
| deactivated\_unqualified\_signup | 0 | (none) | Unknown | Deactivated | None |
| deactivated\_internal | 0 | Internal | (n/a) | Deactivated | n/a |
| deactivated\_duplicate | 1 | (merge) | (merge) | (merge) | n/a |
| sandbox | 0 | Internal | (n/a) | Sandbox | n/a |
| internal | 0 | Internal | (n/a) | Active | n/a |
| (no status) | 2,741 | (compute) | (compute) | Active | Check Campus |

\* For individual\_self\_signup and individual\_google, the lifecycle should be verified against actual deal data. Some may be Prospect (never paid) rather than Active Customer.

## **3.2 Migration Phases**

**Phase 1: Preparation (Week 1-2)**

* Create the new Company properties (Customer Tier, Lifecycle Stage, System State, Deactivation Reason) in HubSpot.

* Create the Trial Status properties (trial\_active, trial\_status, trial\_start\_date, trial\_end\_date, trial\_extension\_count) on the Company object.

* Create new Deal properties (plan\_tier, billing\_cycle, is\_trial, deal\_source, new\_or\_renewal, transaction\_reference\_id, stripe\_transaction\_id, quickbooks\_invoice\_id, plan\_name, etc.).

* Add the new Deal Type values to the existing dealtype enumeration.

* Create the two Contact role fields: Sales Role (new) and Operational Role (extend existing).

* Audit existing HubSpot workflows that reference sales\_status. Document each workflow and its trigger conditions.

* Create the new Self-Signup Pipeline with stages: Sign Up \> Trial \> Cart Activity \> Purchased \> Renewal Due \> Renewed / Churned.

* Reconcile Sam's existing contract-related HubSpot properties with the new Campus contract model.

**Phase 2: Parallel Run (Week 3-4)**

* Run migration script to populate the new properties based on the mapping table above. The legacy sales\_status field remains in place.

* Build Campus sync logic to push system\_type, trial status, and deactivation state to HubSpot.

* Build auto-computation workflow in HubSpot: when deals are created/updated, recompute Customer Tier and Lifecycle Stage.

* Update the new billing system to create deals with the new properties when self-signup purchases occur.

* Route self-signup deals into the new Self-Signup Pipeline.

* Begin syncing self-signup Contacts with appropriate roles.

* Validate: compare auto-computed values against the legacy field for all 88 enterprise customers and a sample of self-signup records.

**Phase 3: Workflow Migration (Week 5-6)**

* Recreate each existing workflow that depends on sales\_status to use the new properties instead.

* Build new reporting dashboards using the new property model: ARR by Customer Tier, pipeline by Lifecycle Stage, churn analysis.

* Build new reports for AI credits, self-signup revenue, and blended revenue views.

* Set up the contract data model in Campus and begin entering contracts for the top enterprise customers.

* Backfill existing Renewal Pipeline deals (2,449) and Prospects Pipeline deals (1,235) with new properties (plan\_tier, deal\_source, new\_or\_renewal, plan\_name, etc.). Cowork automation skills can assist with this backfill work.

**Phase 4: Cutover (Week 7-8)**

* Stop setting the legacy sales\_status field on new records.

* Remove legacy trial logic from Campus (the old auto-filtering from self-signup to trial to individual\_prospect).

* Handle remaining trial systems: move active trials to the new trial properties; deactivate expired trials.

* Mark the legacy sales\_status field as 'archived' in HubSpot (do not delete; keep for historical reference).

* Merge or clean up the 1 deactivated\_duplicate record.

# **4\. Invoice and QuickBooks Integration**

The deal-to-invoice relationship is many-to-one: multiple deals can appear as line items on a single invoice. The intended workflow is:

* 1\. Deals are created in HubSpot (either automatically from self-signup/Stripe or manually for enterprise sales).

* 2\. When an invoice needs to be generated, an automation (Cowork or similar) identifies all deals for the same company that should be grouped on one invoice.

* 3\. The automation creates a QuickBooks invoice with each deal as a line item, mapping the deal type to the appropriate QuickBooks income category.

* 4\. The QuickBooks invoice ID is written back to each deal's quickbooks\_invoice\_id field.

Important: Implementing this deal-to-invoice automation will require changes to Digication's current finance processes. This is the right long-term direction for scalability and accuracy, but Sam and Jeff should plan for a transition period where both old and new invoicing processes may run in parallel. The QuickBooks income categories below are suggestions and must be validated against the actual chart of accounts.

**Deal Type to QuickBooks Income Category Mapping**

| Deal Type | Suggested QB Income Category | Revenue Recognition |
| :---- | :---- | :---- |
| Enterprise License | Subscription Revenue \- Enterprise | Deferred, recognized monthly over license period |
| Self-Signup License | Subscription Revenue \- Self-Serve | Deferred, recognized monthly over license period |
| AI Credits | Prepaid Credits Revenue | Deferred, recognized on usage or at expiry |
| One-Time Fee | Professional Services Revenue | Recognized at time of payment |
| Partnership | Partnership Revenue | Per agreement terms |
| Sponsorship | Sponsorship Revenue | Per agreement terms |

For Stripe-processed payments (self-signup), the Stripe transaction ID should be recorded on both the HubSpot deals and the QuickBooks invoice to enable full traceability across all three systems.

# **5\. Reporting Requirements**

The new architecture must support these report categories from day one:

**5.1 ARR / Revenue Reports**

* **Total ARR:** Sum of arr across all active license deals (Enterprise \+ Self-Signup). Filter by Customer Tier to see enterprise vs. self-serve ARR.

* **New vs. Renewal ARR:** Filter by new\_or\_renewal property.

* **Deferred Revenue Schedule:** For each license deal, calculate monthly recognition based on license\_start\_date and license\_end\_date. For AI credits, track balance and recognize on usage.

* **Revenue by Billing Cycle:** Annual vs. Monthly subscription revenue breakdown.

**5.2 Pipeline / Forecast Reports**

* **Weighted Pipeline:** Open deals by stage, weighted by probability. Separate views for enterprise prospects vs. self-signup conversion.

* **Renewal Forecast:** Deals in the Renewal Pipeline grouped by expected close quarter.

* **Self-Signup Conversion Funnel:** Tracked through the new Self-Signup Pipeline stages: Sign Up \> Trial \> Cart Activity \> Purchased.

**5.3 Customer Health Reports**

* **Active vs. Churned:** Companies by Lifecycle Stage. Trend over time.

* **At-Risk Renewals:** Enterprise customers whose license\_end\_date is within 90 days and renewal deal is not in 'Confirmed Renewal' or later stage.

* **Adoption Metrics:** Usage properties synced from Campus correlated with Customer Tier and deal value.

* **Self-Signup Aggregate View:** Total number of self-signup companies, aggregate revenue, average deal size, distribution by plan\_tier.

* **Trial Analytics:** Companies with active trials, average trial duration, trial-to-paid conversion rate, expired trials by age.

# **6\. Open Items and Decisions Needed**

The following items require further discussion or decisions before implementation. Items \#4, \#5, \#7, and \#8 from v1 have been resolved based on feedback and are no longer listed as open.

| \# | Item | Context | Decision Needed |
| :---- | :---- | :---- | :---- |
| 1 | AI credit pricing model | AI credits behave like prepaid phone cards with a 2-year expiry. Exact pricing, packaging, and top-up mechanics are still being finalized. | Finalize AI credit SKUs and pricing tiers before building the deal template. |
| 2 | Workflow audit | There are active HubSpot workflows that trigger on the legacy sales\_status field. These must be identified and migrated. | Jeff and Sam to audit and document all workflows referencing sales\_status. |
| 3 | Deactivation and deal closure | When a production system is deactivated, it likely makes sense to auto-close associated open deals. Sandbox deactivation should not affect deals. | Confirm: auto-close deals only for production system deactivation, not sandboxes. |
| 4 | QuickBooks income categories | The suggested QB category mapping needs validation against your actual chart of accounts. | Sam/Jeff to confirm QB income categories and create any new ones needed. |
| 5 | Contract field reconciliation | Sam has existing contract-related properties in HubSpot. These need to be mapped against the new Campus contract model to avoid duplication. | Sam to provide a list of current contract fields and their usage. |
| 6 | Cowork migration skills | Several migration tasks (backfill, data sync, status computation) could be automated as Cowork skills. | Prioritize which migration tasks to build as Cowork skills first. |

**Resolved Items (from v1)**

| Former \# | Item | Resolution |
| :---- | :---- | :---- |
| 4 | Self-signup to enterprise upgrade path | No automated threshold. Self-signup customers can purchase unlimited accounts at self-serve pricing. Enterprise upgrade is manual, on customer request only. |
| 5 | Google Sheet mapping | The original Google Sheet is being abandoned. This spec document is the authoritative reference. |
| 7 | Historical deal backfill | Confirmed: all existing deals will be backfilled with new properties. Cowork automation will assist. |
| 8 | Multi-department field design | Resolved as free text (plan\_name), sourced from the Campus plan/deal name. |

# **Appendix A: New HubSpot Properties Summary**

**Company Properties (new)**

| Property Name | Type | Values |
| :---- | :---- | :---- |
| customer\_tier | Enumeration (auto-computed) | Enterprise, Hybrid, Self-Signup, Sponsor, Internal |
| lifecycle\_stage\_new | Enumeration (auto-computed) | Active Customer, Prospect, Past Customer, Unknown |
| system\_state | Enumeration (synced from Campus) | Active, Deactivated, Sandbox |
| deactivation\_reason | Enumeration | Past Customer, Expired Trial, Duplicate, Unqualified Signup, Internal Cleanup, Other |
| primary\_system\_type | Enumeration (synced) | Production, Sandbox, Internal |
| duplicate\_review\_flag | Boolean | Flags self-signup companies matching an existing domain |
| trial\_active | Boolean (synced from Campus) | Whether any associated system has an active trial |
| trial\_status | Enumeration (synced) | None, Active, Expired, Extended |
| trial\_start\_date | Date (synced) | When the trial began |
| trial\_end\_date | Date (synced) | When the trial expires/expired |
| trial\_extension\_count | Number (synced) | Number of trial extensions |

**Deal Properties (new)**

| Property Name | Type | Values / Format |
| :---- | :---- | :---- |
| plan\_tier | Enumeration | Enterprise, Group, Individual |
| billing\_cycle | Enumeration | Annual, Monthly |
| is\_trial | Boolean | Yes, No (deal-level flag; does not roll up to company lifecycle) |
| deal\_source | Enumeration | Managed, Self-Signup |
| new\_or\_renewal | Enumeration | New Business, Renewal, Expansion |
| contract\_term | Enumeration | Single Year, Multi-Year |
| transaction\_reference\_id | String | Internal batch ID linking deals from the same purchase |
| stripe\_transaction\_id | String | Stripe payment/checkout session ID |
| quickbooks\_invoice\_id | String | QuickBooks invoice ID |
| contract\_reference\_id | String | Campus contract ID governing this deal |
| plan\_name | String | Free text; Campus plan/deal name |
| price\_per\_license | Currency | Per-license fee amount |
| option\_type | String | Description of options/add-ons |
| option\_fee | Currency | Fee for options/add-ons |
| paid\_status | Enumeration | Unpaid, Paid, Partial, Overdue, Waived |

**Contact Properties (new/modified)**

| Property Name | Type | Values / Format |
| :---- | :---- | :---- |
| sales\_role | Multi-select enumeration (new) | Decision Maker, Renewal Contact, Self-Signup Purchaser, Group Admin, Individual User, Abandoned Cart, Tax Exempt Contact |
| operational\_role | Multi-select enumeration (extend existing) | System Admin (Active), System Admin (Inactive), LTI/SSO Contact, Assessment Lead, Department Chair, Support Contact |
| total\_lifetime\_spend | Currency (auto-computed) | Sum of all closed-won deal amounts for this contact |
| current\_fy\_spend | Currency (auto-computed) | Sum of closed-won deals in current fiscal year (Jul 1 \- Jun 30\) |
| purchase\_intent\_level | Enumeration | None, Browsed Plans, Started Checkout, Completed Purchase |

