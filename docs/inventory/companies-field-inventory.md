# Company Object Field Inventory

**Date:** 2026-04-10
**Total Properties:** 247
**Total Records:** 4,970

---

## Summary by Category

| Category | Count | Populated | Key Finding |
|----------|-------|-----------|-------------|
| Digication Activity (ACT:) | 12 | ~2,204 | Actively synced from Campus. Rolling windows. |
| Digication Historical (HIST:) | 16 | ~2,206 | Actively synced from Campus. Period snapshots. |
| Digication System/Identity | 8 | ~2,224 | Core integration fields. `system_id__c` is the key. |
| Digication Usage Totals | 5 | ~2,208 | Synced daily from Campus user counts. |
| Kora/Assessment | 8 | ~2,563 | 4 synced, 4 manual tracking fields. |
| Salesforce Legacy (`__c`) | 18 | 0–423 | Most are low-population Salesforce imports. |
| HubSpot System (`hs_`) | ~100 | varies | Auto-managed by HubSpot. Do not touch. |
| Sales/Finance (manual) | 15 | varies | Manually entered by sales team. |
| Institution/Program (manual) | 12 | varies | Jeff-created fields for institution tracking. |
| Social Media | 8 | 0–3,271 | Twitter has data (HS Insights). Google+/Facebook = dead. |
| Zendesk Integration | 5 | varies | Support ticket metrics. |
| Tax/Billing | 7 | varies | Tax exemption and billing fields. |
| QuickBooks | 1 | 325 | QuickBooks Customer ID link. |
| Pipeline/Lifecycle | 5 | varies | HubSpot-native pipeline tracking. |
| Other/Misc | 27 | varies | Mixed bag of one-off fields. |

---

## Category 1: Digication Activity Metrics (ACT:) — 12 fields

These are rolling-window activity metrics synced daily from Campus via batch sync.

| Field Name | Label | Population | Sync Status |
|------------|-------|-----------|-------------|
| `act__active_students_in_the_last_year` | ACT: Active students in the last year | ~2,204 | Synced |
| `act__active_users_in_current_subscription_period` | ACT: Active users in current subscription period | ~2,204 | Needs deal data |
| `act__active_users_in_the_last_30_days` | ACT: Active users in the last 30 days | ~2,204 | Synced |
| `act__active_users_in_the_last_year` | ACT: Active users in the last year | ~2,204 | Synced |
| `act__new_admins_in_current_subscription_period` | ACT: New admins in current subscription period | ~2,204 | Needs deal data |
| `act__new_admins_in_the_last_30_days` | ACT: New admins in the last 30 days | ~2,204 | Not implemented |
| `act__new_faculty_in_current_subscription_period` | ACT: New faculty in current subscription period | ~2,204 | Needs deal data |
| `act__new_faculty_in_the_last_30_days` | ACT: New faculty in the last 30 days | ~2,204 | Not implemented |
| `act__new_students_in_current_subscription_period` | ACT: New students in current subscription period | ~2,204 | Needs deal data |
| `act__new_students_in_the_last_30_days` | ACT: New students in the last 30 days | ~2,204 | Synced |
| `act__new_users_in_current_subscription_period` | ACT: New users in current subscription period | ~2,204 | Synced |
| `act__new_users_in_the_last_30_days` | ACT: New users in the last 30 days | ~2,204 | Synced |

**Integration note:** ~102 additional time-series fields need to be created in HubSpot for full coverage (active users by month/quarter/year per role, logins, ePortfolio metrics). See sync field inventory Sections 1.7–1.10.

---

## Category 2: Digication Historical Metrics (HIST:) — 16 fields

Period-boundary snapshots synced from Campus. Stored with HubSpot field history enabled.

| Field Name | Label | Population | Sync Status |
|------------|-------|-----------|-------------|
| `hist__active_users_by_month` | HIST: Active users by month | ~2,206 | Synced |
| `hist__active_users_by_quarter` | HIST: Active users by quarter | ~2,206 | Missing in HS |
| `hist__active_users_by_subscription_period` | HIST: Active users by subscription period | ~2,206 | Missing in HS |
| `hist__active_users_by_year` | HIST: Active users by year | ~2,206 | Missing in HS |
| `hist__new_admins_by_month` | HIST: New admins by month | ~2,206 | Not implemented |
| `hist__new_admins_by_quarter` | HIST: New admins by quarter | ~2,206 | Not implemented |
| `hist__new_admins_by_subscription_period` | HIST: New admins by subscription period | ~2,206 | Not implemented |
| `hist__new_admins_by_year` | HIST: New admins by year | ~2,206 | Not implemented |
| `hist__new_faculty_by_month` | HIST: New faculty by month | ~2,206 | Not implemented |
| `hist__new_faculty_by_quarter` | HIST: New faculty by quarter | ~2,206 | Not implemented |
| `hist__new_faculty_by_subscription_period` | HIST: New faculty by subscription period | ~2,206 | Not implemented |
| `hist__new_faculty_by_year` | HIST: New faculty by year | ~2,206 | Not implemented |
| `hist__new_students_by_month` | HIST: New students by month | ~2,206 | Synced |
| `hist__new_students_by_quarter` | HIST: New students by quarter | ~2,206 | Synced |
| `hist__new_students_by_subscription_period` | HIST: New students by subscription period | ~2,206 | Needs deal data |
| `hist__new_students_by_year` | HIST: New students by year | ~2,206 | Synced |
| `hist__new_users_by_month` | HIST: New users by month | ~2,206 | Synced |
| `hist__new_users_by_quarter` | HIST: New users by quarter | ~2,206 | Synced |
| `hist__new_users_by_subscription_period` | HIST: New users by subscription period | ~2,206 | Synced |
| `hist__new_users_by_year` | HIST: New users by year | ~2,206 | Synced |

---

## Category 3: Digication System/Identity — 8 fields

Core fields linking companies to Digication Campus instances.

| Field Name | Label | Type | Population | Sync Status |
|------------|-------|------|-----------|-------------|
| `system_id__c` | Campus ID (Production) | number | 2,224 (45%) | Synced — **primary integration key** |
| `sales_status` | Sales Status | enumeration (19 values) | 2,215 (45%) | Synced → **Being retired** (replaced by customer_tier, lifecycle_stage_new, system_state, trial_status) |
| `digication_production_url` | Digication Production URL | string | ~2,224 | Synced |
| `digication_sandbox_url` | Digication Sandbox URL | string | varies | HubSpot-only (manual) |
| `digication_sandbox_urls__c` | Digication Sandbox URLs | string | varies | Salesforce legacy |
| `csv_import` | CSV Import | string | varies | HubSpot-only |
| `csv_import_log` | CSV Import Log | string | varies | Synced |
| `site` | Site | string | varies | HubSpot-only |

**`sales_status` values (19):** trial_prospect, trial_google, enterprise_current, enterprise_sponsor, enterprise_partner, hybrid_current, individual_current, individual_self_signup, individual_google, individual_past_enterprise, individual_prospect, deactivated_past_customer, deactivated_prospect, deactivated_partner, deactivated_unqualified_signup, deactivated_internal, deactivated_duplicate, sandbox, internal

**Integration note:** `sales_status` is being retired per spec. Will be replaced by 4 auto-computed fields (customer_tier, lifecycle_stage_new, system_state, trial_status) in Phase 3.

---

## Category 4: Digication Usage Totals — 5 fields

User/role counts synced daily from Campus `tUser` table.

| Field Name | Label | Population | Sync Status |
|------------|-------|-----------|-------------|
| `total_number_of_users` | Total number of users | 2,208 | Synced |
| `total_number_of_students` | Total number of students | ~2,208 | Synced |
| `total_number_of_faculty` | Total number of faculty | ~2,208 | Synced |
| `total_number_of_admin` | Total number of admin | ~2,208 | Synced |
| `total_number_of_alumni` | Total number of alumni | ~2,208 | Synced |

---

## Category 5: Kora/Assessment — 8 fields

| Field Name | Label | Population | Sync Status |
|------------|-------|-----------|-------------|
| `kora_system_option` | Kora system option | 2,563 | Synced |
| `kora_per_user_override` | Kora per user override | ~2,563 | Synced |
| `kora_number_of_courses` | Kora number of courses | ~2,563 | Synced |
| `kora_number_of_users_with_kora_access` | Kora number of users with Kora access | ~2,563 | Synced |
| `kora_full_upgrade_date` | Kora Full Upgrade Date | varies | Manual (do not sync) |
| `kora_full_upgrade_status` | Kora Full Upgrade Status | varies | Manual (do not sync) |
| `kora_partial_upgrade_date` | Kora Partial Upgrade Date | varies | Manual (do not sync) |
| `kora_partial_upgrade_status` | Kora Partial Upgrade Status | varies | Manual (do not sync) |

---

## Category 6: Salesforce Legacy (`__c` suffix) — 18 fields

Fields migrated from Salesforce. Most have low population.

| Field Name | Label | Type | Population | Recommendation |
|------------|-------|------|-----------|----------------|
| `account_fte_potential__c` | Account FTE (Potential) | number | low | Review — may have useful data |
| `account_name_abbreviation__c` | Account Name Abbreviation | string | low | Review — useful for reporting? |
| `account_nickname__c` | Account Nickname | string | low | Likely duplicate of friendly_name |
| `adoption_path__c` | Adoption Path | enumeration (6 values) | 259 | **Active** — used for tracking adoption journey |
| `adoption_status__c` | Adoption Status | enumeration (4 values) | 92 | Low population — review against adoption_path |
| `amount__c` | Potential Renewal Amount | number | 2 | **Near-empty — candidate for deletion** |
| `asana_link__c` | Asana Link | string | low | Legacy — Asana link tracking |
| `assigned_history__c` | Assigned history | string | low | Legacy — review |
| `comments__c` | Comments | string | low | Legacy — review |
| `connections__c` | Connections | enumeration (5 values) | low | Legacy referral tracking |
| `contract_start_date__c` | Contract Start Date | date | low | Moving to deal-level per spec |
| `customer_creation_date__c` | Customer Creation Date | date | low | Review against HS createdate |
| `customer_status__c` | Customer Status (archived) | enumeration (11 values) | 423 | **Archived label** — replaced by sales_status → being retired |
| `digication_sandbox_urls__c` | Digication Sandbox URLs | string | low | Duplicate of digication_sandbox_url |
| `email_domain__c` | Email Domain | string | low | Review — may be useful or derivable from domain |
| `institution_success_indicator_isi__c` | Institution Success Indicator (ISI) | number | 135 | Moderate population — review usefulness |
| `primary_sales_rep__c` | Primary Sales Rep | enumeration (6 values) | 282 | **Active** — but redundant with hubspot_owner_id |
| `prospect_status_history__c` | Prospect Status history (archived) | enumeration (6 values) | 153 | **Archived label** — legacy pipeline tracking |
| `renewal_date__c` | Renewal Date | string | 86 | Low — moving to deal-level per spec |
| `salesforceaccountid` | Salesforce Account ID | string | 426 | **Reference only** — Salesforce link |
| `salesforcelastsynctime` | Last Salesforce Sync Time | datetime | varies | Obsolete — Salesforce sync discontinued |
| `imported_from_salesforce` | Imported from Salesforce | enumeration | 0 (with true) | **Empty — candidate for deletion** |

**Key findings:**
- `amount__c` (2 records) and `imported_from_salesforce` (0 with "true") are nearly empty → deletion candidates
- `customer_status__c` (423) and `prospect_status_history__c` (153) are explicitly archived
- `contract_start_date__c` and `renewal_date__c` are moving to deal-level per integration spec
- `primary_sales_rep__c` (282) overlaps with HubSpot's native `hubspot_owner_id`

---

## Category 7: Sales/Finance (manual) — 15 fields

Fields manually entered by the sales team for business tracking.

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `accounting_income_type` | Accounting Income Type | varies | |
| `annual_recurring_revenue` | Annual recurring revenue | varies | |
| `annual_revenue` | Annual revenue | varies | |
| `annualrevenue` | Annual Revenue | varies | HubSpot Insights field |
| `auto_renew_setting` | Auto Renew Setting | varies | |
| `contract_lengths` | Contract lengths | varies | |
| `contract_type` | Contract type | varies | |
| `fiscal_year_by_license_start_date` | Fiscal Year - By license start date | varies | Digication FY: 7/1 - 6/30 |
| `invoice_frequency` | Invoice frequency | varies | |
| `next_licensed_renewal_date` | Next licensed renewal date | varies | |
| `non_renewal_notice_window` | Non-Renewal Notice Window | varies | |
| `of_students_licensed_current_` | % of students licensed (current) | varies | |
| `of_students_licensed_future_` | % of students licensed (future) | varies | |
| `of_users_licensed` | # of users licensed | varies | |
| `onsite_training_days` | Onsite training days | varies | |

**Integration note:** Many of these fields (contract lengths, renewal dates, license counts) are moving to the deal level per the integration spec. These company-level fields may become rollup summaries.

---

## Category 8: Institution/Program (manual) — 12 fields

Custom fields for tracking institutional details, mostly created by Jeff.

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `accreditation` | Accreditation | varies | |
| `campus_adoption_` | Campus Adoption % | varies | |
| `campus_health__c` | Campus Health | varies | Enumeration: User growth, Potential growth, etc. |
| `competing_ep_systems` | Competing eP systems | varies | |
| `engagement` | Engagement | varies | |
| `institution_properties` | Institution Properties | varies | |
| `lost_to_ep_system_past_customers_or_prospects_only_` | Lost to eP system | varies | Past customers/prospects only |
| `prior_ep_systems` | Prior eP systems | varies | |
| `program` | Program | varies | |
| `total_of_students` | Total enrollment | varies | |
| `use_case_narrative` | Use case | varies | |
| `use_case_narrative_text` | Use case narrative | varies | |

---

## Category 9: Social Media — 8 fields

| Field Name | Label | Population | Recommendation |
|------------|-------|-----------|----------------|
| `twitterhandle` | Twitter Handle | 3,271 | HubSpot Insights — keep |
| `twitterbio` | Twitter Bio | varies | HubSpot Insights — keep |
| `twitterfollowers` | Twitter Followers | varies | HubSpot Insights — keep |
| `facebook_company_page` | Facebook Company Page | varies | HubSpot Insights — keep |
| `facebookfans` | Facebook Fans | **0** | **Empty — candidate for deletion** |
| `linkedin_company_page` | LinkedIn Company Page | varies | HubSpot Insights — keep |
| `linkedinbio` | LinkedIn Bio | varies | HubSpot Insights — keep |
| `googleplus_page` | Google Plus Page | **0** | **Empty — Google+ is defunct. Delete.** |

---

## Category 10: Zendesk Integration — 5 fields

| Field Name | Label | Notes |
|------------|-------|-------|
| `zendesk_of_tickets_1_year_` | Zendesk # of tickets opened (1 year) | |
| `zendesk_of_tickets_opened_30_days_` | Zendesk # of tickets opened (30 days) | |
| `zendesk_of_tickets_sla_violation` | Zendesk # of tickets SLA violation | |
| `zendesk_of_tickets_solved_1_year_` | Zendesk # of tickets solved (1 year) | |
| `zendesk_of_tickets_solved_30_days_` | Zendesk # of tickets solved (30 days) | |

---

## Category 11: Tax/Billing — 7 fields

| Field Name | Label | Notes |
|------------|-------|-------|
| `billing_address_match_tax_exempt_certificate` | Billing Address Match Tax Exempt Certificate | |
| `certificate_expiration_date` | Tax Certificate Expiration Date | |
| `sales_tax_percentage` | Sales Tax Percentage | Based on billing address |
| `tax_exempt_status` | Tax Exempt Status | |
| `tax_exemption_certificate__pdf_or_image_` | Tax Exemption Certificate (PDF or Image) | |
| `tax_id` | Tax ID | |
| `quickbooks_customer_id` | Quickbooks Customer ID | 325 companies linked |

---

## Category 12: Pipeline/Lifecycle (HubSpot-native) — 5 fields

| Field Name | Label | Notes |
|------------|-------|-------|
| `lifecyclestage` | Lifecycle Stage | Standard HubSpot pipeline (8 stages) |
| `hs_lead_status` | Lead Status | 8 values: New, Open, In Progress, etc. |
| `prospects_customer_status__c` | Prospects / Customer / Vendor Status | 1,386 populated. Salesforce-origin but actively used. |
| `hs_is_target_account` | Target Account | ABM field |
| `hs_ideal_customer_profile` | Ideal Customer Profile Tier | Tier 1-3 fit scoring |

---

## Category 13: HubSpot System Fields (`hs_` prefix) — ~100 fields

These are auto-managed by HubSpot. **Do not modify or delete.** Includes:
- Analytics tracking (first/last seen, sessions, page views, traffic source)
- Lifecycle stage timing (date entered/exited each stage, cumulative time)
- Internal metadata (object ID, source, created/updated by user ID)
- Predictive scoring, intent signals
- Meeting/call/email activity tracking
- Enrichment data (keywords, industry group, employee range, revenue range)

---

## Deletion Candidates (Phase 2)

| Field | Population | Reason |
|-------|-----------|--------|
| `googleplus_page` | 0 | Google+ is defunct |
| `facebookfans` | 0 | Empty, never populated |
| `amount__c` | 2 | Near-empty Salesforce legacy |
| `imported_from_salesforce` | 0 (true) | Never populated |

## Archived Fields (Review for Deletion)

| Field | Population | Reason |
|-------|-----------|--------|
| `customer_status__c` | 423 | Explicitly labeled "(archived)" — replaced by sales_status |
| `prospect_status_history__c` | 153 | Explicitly labeled "(archived)" — legacy pipeline |
| `salesforcelastsynctime` | varies | Salesforce sync discontinued |

## Fields Moving to Deal Level (Phase 3)

Per integration spec, these company-level fields are being moved to deal-level properties:

| Field | Current Population | New Location |
|-------|-------------------|--------------|
| `contract_start_date__c` | low | Deal: `license_start_date` |
| `renewal_date__c` | 86 | Deal: `license_end_date` |
| `of_users_licensed` | varies | Deal: `license_count` |
| `contract_lengths` | varies | Deal: `contract_term` |
| `auto_renew_setting` | varies | Deal: `auto_renewal` |

## New Fields Needed (Phase 3)

Per integration spec, these 11 new architecture status fields need to be created:

| Field | Type | Purpose |
|-------|------|---------|
| `customer_tier` | multi-select | Replaces single-select + "Hybrid" removal |
| `lifecycle_stage_new` | enumeration | Auto-computed lifecycle |
| `system_state` | enumeration | Active/Deactivated/Sandbox |
| `deactivation_reason` | enumeration | Why system was deactivated |
| `trial_status` | enumeration | None/Active/Expired/Extended |
| `trial_start_date` | date | Trial period start |
| `trial_end_date` | date | Trial period end |
| `trial_extension_count` | number | Extensions granted |
| `primary_system_type` | enumeration | New system type field |
| `duplicate_review_flag` | boolean | Domain-based duplicate detection |
| `lifecycle_is_override` | boolean | Manual override active |

---

## Cross-Reference: Sync Field Inventory

| Sync Category | Fields in HS | Synced | Not Implemented | Missing in HS | New (Arch) |
|---------------|-------------|--------|----------------|---------------|------------|
| System Identity | 6 | 6 | 0 | 0 | 0 |
| Architecture Status | 0 | 0 | 0 | 0 | 11 |
| KORA/Assessment | 4 | 4 | 0 | 0 | 0 |
| LMS Integration | 3 | 0 | 3 | 0 | 0 |
| User Count Totals | 5 | 5 | 0 | 0 | 0 |
| Time-Series Metrics | ~33 | ~14 | ~12 | ~102 | 0 |
| Sync Metadata | 1 | 1 | 0 | 0 | 0 |
| **Total** | **~52** | **~30** | **~15** | **~102** | **11** |
