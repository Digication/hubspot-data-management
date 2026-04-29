# Cross-Object Overlap Report

**Date:** 2026-04-10
**Purpose:** Identify fields that exist on multiple objects, are on the wrong object, have duplicates, or that the integration spec plans to retire/move/replace.

---

## 1. Fields on Multiple Objects

### `amount__c` — Amount
- **Contacts:** 0 records → **delete**
- **Companies:** 2 records (labeled "Potential Renewal Amount") → **delete (near-empty)**
- **Deals:** standard `amount` field exists natively
- **Action:** Delete from Contacts and Companies. Deal `amount` is the authoritative source.

### `imported_from_salesforce`
- **Contacts:** 0 records → **delete**
- **Companies:** 0 records → **delete**
- **Deals:** 0 records → **delete**
- **Action:** Delete from all objects. Never populated.

### Sales Pipeline % Fields (9 fields)
Present on BOTH Contacts and Deals:
- `decision_maker__c`, `demo_account__c`, `demo_presentation__c`, `identify_close_date__c`, `identify_customer_needs__c`, `identify_funding_source__c`, `pricing_info_presented__c`, `proposal_quote__c`, `start_conversation__c` / `closing__c`

| Object | Population | Notes |
|--------|-----------|-------|
| Contacts | varies | **Misplaced** — deal progress on contacts |
| Deals | 271 | Legacy Salesforce methodology |

- **Action:** Delete from Contacts (misplaced). Review on Deals — likely replaced by HubSpot deal stages.

### `annualrevenue` / `annual_revenue`
- **Contacts:** standard field (company-level data misplaced)
- **Companies:** standard field + custom `annual_revenue` + custom `annual_recurring_revenue`
- **Deals:** `annual_total_revenue` custom field + `arr` custom field
- **Action:** Clarify which is authoritative. `arr` on Deals (1,645 populated) is the actively used ARR field. Company-level revenue fields need review.

### `numberofemployees` / `numemployees`
- **Contacts:** `numberofemployees` (standard, misplaced)
- **Contacts:** `numemployees` (custom, duplicate)
- **Companies:** `numberofemployees` (standard, correct location)
- **Action:** Delete both from Contacts (company-level data). Keep on Companies.

---

## 2. Duplicate Fields (Same Object)

### Companies: None found (clean)

### Contacts:
| Field 1 | Field 2 | Notes |
|---------|---------|-------|
| `nickname_preferred_name__c` | `preferred_name` | Same concept, different origins (SF vs custom) |
| `numberofemployees` | `numemployees` | Both on Contacts, both misplaced (company data) |

### Deals:
| Field 1 | Field 2 | Notes |
|---------|---------|-------|
| `option__c` (134 records) | `options__c` (103 records) | **Duplicate!** Same concept, different names. Need to check data overlap and merge. |

---

## 3. Misplaced Fields (Wrong Object)

### Company-level data on Contacts

| Field | Should Be On | Why |
|-------|-------------|-----|
| `totalstudents__c` | Company | Student count is institution-level |
| `system_url__c` | Company | System URL is institution-level |
| `annualrevenue` | Company | Standard but company-level |
| `numberofemployees` | Company | Standard but company-level |
| `numemployees` | Company | Custom + company-level |
| `company_size` | Company | Explicit company attribute |

### Deal-level data on Contacts

| Field | Should Be On | Why |
|-------|-------------|-----|
| 9 pipeline % fields | Deals | Track deal progress, not contact attributes |
| `amount__c` | Deals | Transaction amount |

### Company-level data on Deals

| Field | Should Be On | Why |
|-------|-------------|-----|
| `active_student_users_in_subscription_yr__c` | Company | Usage metric at institution level |

---

## 4. Integration Spec: Fields Being Retired

| Field | Object | Current Pop. | Replacement |
|-------|--------|-------------|-------------|
| `sales_status` | Company | 2,215 | `customer_tier` + `lifecycle_stage_new` + `system_state` + `trial_status` (4 auto-computed fields) |
| `customer_status__c` | Company | 423 | Already archived; superseded by `sales_status`, which is itself being retired |
| `prospect_status_history__c` | Company | 153 | Already archived; legacy pipeline tracking |

---

## 5. Integration Spec: Fields Moving Between Objects

| Field | From | To | Population | Notes |
|-------|------|------|-----------|-------|
| `contract_start_date__c` | Company | Deal (`license_start_date`) | low | Deal already has `license_start_date__c` (2,493) |
| `renewal_date__c` | Company | Deal (`license_end_date`) | 86 | Deal already has `license_end_date__c` |
| `of_users_licensed` | Company | Deal (`license_count`) | varies | Deal already has `quantity__c` (1,760) |
| `contract_lengths` | Company | Deal (`contract_term`) | varies | Deal already has `license_length_in_month__c` |
| `auto_renew_setting` | Company | Deal (`auto_renewal`) | varies | Deal already has `contract_auto_renewal` |

**Key insight:** The deal-level versions already exist (as `__c` fields). The Phase 3 migration is primarily about:
1. Renaming `__c` deal fields to clean names
2. Verifying company-level values match deal-level values
3. Removing the company-level versions once deal-level is authoritative

---

## 6. Integration Spec: Fields Being Renamed

All on Deals. HubSpot internal names are immutable, so each "rename" = create → migrate → delete.

| Current Name | New Name | Population |
|-------------|----------|-----------|
| `license_start_date__c` | `license_start_date` | 2,493 |
| `license_end_date__c` | `license_end_date` | ~2,493 |
| `quantity__c` | `license_count` | 1,760 |
| `unit_price__c` | `price_per_license` | 1,648 |
| `license_length_in_month__c` | `contract_term` | varies |
| `option__c` / `options__c` | `option_type` | 134/103 |
| `options_price__c` | `option_fee` | varies |
| `contract_auto_renewal` | `auto_renewal` | varies |

---

## 7. Salesforce Fields with HubSpot-Native Equivalents

| SF Legacy Field | HubSpot Native | Object | Notes |
|----------------|---------------|--------|-------|
| `salesforceaccountid` | N/A | Company, Contact | Reference-only, no equivalent |
| `primary_sales_rep__c` | `hubspot_owner_id` | Company | 282 vs all records — redundant |
| `customer_status__c` | `lifecyclestage` | Company | Archived, replaced |
| `contact_status__c` | `lifecyclestage` | Contact | Review — may be custom |
| `income_category__c` | N/A | Contact, Deal | Empty on contacts (0), review on deals |

---

## 8. Obsolete Fields Across All Objects

| Field | Object | Population | Reason |
|-------|--------|-----------|--------|
| `googleplus_page` | Company | 0 | Google+ shut down 2019 |
| `facebookfans` | Company | 0 | Never populated |
| `kloutscoregeneral` | Contact | 0 | Klout shut down 2018 |
| `digicon_2019__c` | Contact | 320 | Obsolete 2019 event |
| `currentlyinworkflow` | Contact | 4,004 | Labeled "discontinued" — **review before deleting** |
| `imported_from_salesforce` | All 3 | 0 | Never populated on any object |
| `salesforcelastsynctime` | All 3 | varies | SF sync discontinued |

---

## 9. Summary: Priority Actions

### Immediate Deletions (Phase 2) — 0 records, safe

| Field | Object |
|-------|--------|
| `googleplus_page` | Company |
| `facebookfans` | Company |
| `amount__c` | Company (2 records) |
| `amount__c` | Contact (0 records) |
| `kloutscoregeneral` | Contact |
| `income_category__c` | Contact |
| `system_url__c` | Contact |
| `totalstudents__c` | Contact |
| `imported_from_salesforce` | Company, Contact, Deal |

### Review Then Delete (Phase 2) — has data, but obsolete/archived

| Field | Object | Pop. | Review Needed |
|-------|--------|------|---------------|
| `digicon_2019__c` | Contact | 320 | Confirm no reports reference it |
| `customer_status__c` | Company | 423 | Already archived — confirm safe |
| `prospect_status_history__c` | Company | 153 | Already archived — confirm safe |
| `currentlyinworkflow` | Contact | 4,004 | **High population — check if anything reads this** |
| Sales pipeline % fields (×9) | Contact | varies | Confirm no workflows use them |
| Sales pipeline % fields (×10) | Deal | 271 | Confirm no reports use them |

### Phase 3 Migrations

| Action | Count | Details |
|--------|-------|---------|
| Rename `__c` deal fields | 8 | Create clean names, migrate data, delete old |
| Merge duplicate options | 2→1 | `option__c` + `options__c` → `option_type` |
| Create new architecture fields | 11 | Company status fields |
| Create new deal properties | ~12 | Spec Section 2.6 |
| Create B2B/B2C summary fields | ~10 | Company rollup fields |
| Create missing time-series | ~102 | Company metrics from sync inventory |
| Retire `sales_status` | 1 | After migration to new status model |
