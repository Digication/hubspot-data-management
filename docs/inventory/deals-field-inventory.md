# Deal Object Field Inventory

**Date:** 2026-04-10
**Total Properties:** 367
**Total Records:** 3,963

---

## Summary by Category

| Category | Count | Key Finding |
|----------|-------|-------------|
| HubSpot System (`hs_`) | 280 | Auto-managed. Do not touch. |
| Salesforce Legacy (`__c`) | 46 | Many actively used for license/pricing. Also has SF pipeline % fields. |
| Digication Custom | 4 | ARR, AI fee, contract auto-renewal, multi-year subscription |
| Standard Deal Fields | 10 | Core HubSpot deal properties |
| Other Custom | 27 | Fiscal year, recurring revenue, closed reasons, etc. |

---

## Category 1: Salesforce Legacy — 46 fields

### Actively Used (High Population)

These Salesforce-origin fields are core to the current deal tracking. The integration spec plans to rename/replace them with clean names.

| Field Name | Label | Population | Spec Target |
|------------|-------|-----------|-------------|
| `license_start_date__c` | License Start Date | **2,493** (63%) | → `license_start_date` |
| `license_end_date__c` | License End Date | ~2,493 | → `license_end_date` |
| `quantity__c` | Licensed Student Accounts | **1,760** (44%) | → `license_count` |
| `unit_price__c` | Unit Price | **1,648** (42%) | → `price_per_license` |
| `license_length_in_month__c` | License Length (in Months) | varies | → `contract_term` |
| `amount_per_year__c` | Amount Per Year | varies | Related to ARR |
| `invoice__c` | Invoice # | varies | → `quickbooks_invoice_id` |
| `invoice_date__c` | Invoice Date | varies | Keep |
| `type_of_invoice__c` | Type of Invoice | varies | Review |
| `due_date__c` | Due Date | varies | Keep |

### Duplicate Fields — Options

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `option__c` | Options | **134** | **Duplicate pair** |
| `options__c` | Options | **103** | **Duplicate pair** |
| `options_price__c` | Options Price | varies | Related to options |

**Action:** Merge `option__c` and `options__c` into a single clean field (`option_type` per spec). Check if records overlap or are distinct.

### Sales Pipeline % Fields (Salesforce Methodology)

Same pattern as contacts — these track deal progress as percentages. Legacy Salesforce approach.

| Field Name | Label | Population | Recommendation |
|------------|-------|-----------|----------------|
| `start_conversation__c` | Start Conversation % | ~271 | Legacy — review |
| `decision_maker__c` | Decision Maker % | 271 | Legacy — review |
| `demo_account__c` | Demo Account % | ~271 | Legacy |
| `demo_presentation__c` | Demo Presentation % | ~271 | Legacy |
| `identify_close_date__c` | Identify Close Date % | ~271 | Legacy |
| `identify_customer_needs__c` | Identify Customer Needs % | ~271 | Legacy |
| `identify_funding_source__c` | Identify Funding Source % | ~271 | Legacy |
| `pricing_info_presented__c` | Pricing Info Presented % | ~271 | Legacy |
| `proposal_quote__c` | Proposal / Quote % | ~271 | Legacy |
| `closing__c` | Closing % | ~271 | Legacy |

**Note:** These exist on BOTH contacts (misplaced) and deals. The contact versions should be deleted; the deal versions need review — they may be replaced by HubSpot's native deal stages.

### Onboarding/Adoption Tracking

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `account_setup_import_integration__c` | Account setup (import / integration) | varies | Onboarding step |
| `system_setup__c` | System setup | varies | Onboarding step |
| `template_setup__c` | Template setup | varies | Onboarding step |
| `set_up_assignments__c` | Set up assignments | varies | Onboarding step |
| `set_up_rubrics__c` | Set up rubrics | varies | Onboarding step |
| `set_up_standards__c` | Set up standards | varies | Onboarding step |
| `roll_out_to_course__c` | Roll out to course | varies | Adoption step |
| `roll_out_to_faculty__c` | Roll out to faculty | varies | Adoption step |
| `roll_out_to_student__c` | Roll out to student | varies | Adoption step |
| `post_pilot_roll_out_quantity__c` | Post-pilot roll out quantity | varies | Adoption metric |
| `established_pd_training__c` | Established PD / training | varies | Training step |
| `post_sales_activities__c` | Post Sales Activities | varies | Post-sale tracking |

### Usage Metrics (on Deals)

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `active_student_users_in_subscription_yr__c` | Active Student Users in Subscription Yr | varies | **Misplaced?** — company-level metric on deal |
| `course_quantity__c` | Course quantity | varies | |
| `e_portfolio_popularity__c` | e-Portfolio popularity | varies | |
| `e_portfolio_quality__c` | e-Portfolio quality | varies | |
| `e_portfolio_quantity__c` | e-Portfolio quantity | varies | |
| `e_portfolio_update_frequency__c` | e-Portfolio update frequency | varies | |

### Other SF Legacy

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `customization_specs__c` | Customization Specs | varies | |
| `features_enabled__c` | Features Enabled | varies | |
| `income_category__c` | Income Category | varies | |
| `support_options__c` | Support Options | varies | |
| `salesforcelastsynctime` | Last Salesforce Sync Time | varies | Obsolete |

---

## Category 2: Digication Custom — 4 fields

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `arr` | ARR | **1,645** (42%) | Annual Recurring Revenue — **actively used, well-defined** |
| `ai_initial_fee` | AI Initial Fee | low | New — one-time AI fee |
| `contract_auto_renewal` | Contract auto-renewal | varies | Maps to spec `auto_renewal` |
| `multi_year_subscription_pre_paid` | multi_year_subscription_pre_paid | varies | Multi-year tracking |

---

## Category 3: Other Custom — 27 fields

### Business Logic

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `closed_lost_reason` | Closed Lost Reason | varies | Active |
| `closed_won_reason` | Closed Won Reason | varies | Active |
| `contract_year__current_` | Contract year (current/total) | varies | Active |
| `fiscal_year` | Fiscal Year - By license start date | varies | Active |
| `fiscal_year_by_invoice_date` | Fiscal Year - By invoice due date | varies | Active |
| `fiscal_year_by_payment_date` | Fiscal Year - By payment received date | varies | Active |
| `of_years_to_clone` | # of Years to Clone | varies | Used for deal cloning |
| `annual_total_revenue` | Annual total revenue | varies | May overlap with ARR |
| `recurring_revenue_amount` | Recurring revenue amount | varies | HubSpot recurring revenue |
| `recurring_revenue_deal_type` | Recurring revenue deal type | varies | HubSpot recurring revenue |
| `recurring_revenue_inactive_date` | Recurring revenue inactive date | varies | HubSpot recurring revenue |
| `recurring_revenue_inactive_reason` | Recurring revenue inactive reason | varies | HubSpot recurring revenue |
| `imported_from_salesforce` | Imported from Salesforce | **0** | **Empty — delete** |

### HubSpot Activity Tracking

| Field Name | Label | Notes |
|------------|-------|-------|
| `days_to_close` | Days to close | Auto-calculated |
| `num_associated_contacts` | Number of Associated Contacts | **Only 799 of 3,963 (20%) have contacts** |
| `num_contacted_notes` | Number of times contacted | Activity |
| `num_notes` | Number of Sales Activities | Activity |
| Standard engagement fields | Meeting booked dates/campaigns | Auto-tracked |

---

## Critical Integration Findings

### 1. Deal-Contact Association Gap

**Only 20% of deals (799 of 3,963) have associated contacts.** The integration spec makes deal-contact association mandatory. This is a major data quality issue that needs resolution in Phase 4.

### 2. Fields to Rename (Phase 3)

Per the integration spec, these Salesforce `__c` fields map to clean new names:

| Current Field | New Name | Population |
|---------------|----------|-----------|
| `license_start_date__c` | `license_start_date` | 2,493 |
| `license_end_date__c` | `license_end_date` | ~2,493 |
| `quantity__c` | `license_count` | 1,760 |
| `unit_price__c` | `price_per_license` | 1,648 |
| `license_length_in_month__c` | `contract_term` | varies |
| `option__c` / `options__c` | `option_type` | 134/103 |
| `options_price__c` | `option_fee` | varies |
| `contract_auto_renewal` | `auto_renewal` | varies |

**HubSpot limitation:** Internal names are immutable. Each "rename" = create new field → migrate data → delete old field.

### 3. New Fields Needed (Phase 3)

Per spec Section 2.6:

| Field | Type | Purpose |
|-------|------|---------|
| `plan_tier` | enumeration | Enterprise/Individual/Trial plan tier |
| `billing_cycle` | enumeration | Monthly/Annual/Multi-year |
| `is_trial` | boolean | Whether this is a trial deal |
| `deal_source` | enumeration | Campus/HubSpot/Manual |
| `new_or_renewal` | enumeration | New business vs renewal |
| `transaction_reference_id` | string | Campus transaction reference |
| `stripe_transaction_id` | string | Stripe payment reference |
| `quickbooks_invoice_id` | string | QBO invoice reference |
| `contract_reference_id` | string | Contract tracking |
| `plan_name` | string | Display name of the plan |
| `paid_status` | enumeration | Paid/Unpaid/Overdue/Grace |
| `billing_grace_days` | number | Grace period in days |

---

## Deletion Candidates (Phase 2)

| Field | Population | Reason |
|-------|-----------|--------|
| `imported_from_salesforce` | 0 | Empty |
| `salesforcelastsynctime` | varies | Obsolete — SF sync discontinued |

## Fields Requiring Decision

| Issue | Fields | Decision Needed |
|-------|--------|----------------|
| **Duplicate options fields** | `option__c` (134) vs `options__c` (103) | Merge into one? Check overlap. |
| **10 sales pipeline % fields** | `decision_maker__c`, etc. | Archive/delete — replaced by deal stages |
| **Misplaced usage metrics** | `active_student_users_in_subscription_yr__c` | Move to company level? |
| **Onboarding tracking fields** (12) | `system_setup__c`, etc. | Keep on deals or move to separate tracking? |
