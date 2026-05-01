# Inventory Review Decisions

**Last updated:** 2026-04-20
**Status:** All 11 reviews complete. Phase 2 execution plan drafted below. Ready to begin Session A when approved.

---

## Confirmed Deletions (96 fields + ~182 contacts + 1 pipeline) + 4 archives

> **Note (2026-04-29):** Original count was 109. During Step 1 execution, 3 fields
> (`googleplus_page`, `facebookfans`, `kloutscoregeneral`) turned out to be
> HubSpot-defined and not archivable via API (HubSpot returns
> `PROPERTY_INVALID` / "read-only definition"). They've been moved to the
> "HubSpot-defined / not archivable" section below. Same category as
> `hubspotscore`.
>
> **Note (2026-04-30):** During Step 3 execution we found one more
> HubSpot-defined field (`salesforceaccountid` on companies) — count
> dropped to 105. We also found 2 fields HubSpot refused to delete
> because they were referenced by HubSpot workflows/reports:
> `renewal_date__c` (workflow 29356620, since deleted by the team) and
> `next_licensed_renewal_date` (3 reports, kept). After review,
> `next_licensed_renewal_date` was moved to **Pending Migration** — the
> 2 populated records hold real renewal-date data that should migrate
> to a deal-level field. Count: 105 → 104.
>
> **Note (2026-04-30, Step 4):** Step 4 archived 182 candidate contacts
> (165 + 17 from a fixed filter that found ones the original missed),
> 28 fields in the first run, then 7 more after the team deleted the
> recruiting form `0-eb0923fb-...` that was blocking 7 of 10 candidate
> field deletions.
>
> Step 4 also discovered:
> - **7 more HubSpot-defined fields** (numemployees, company_size on
>   contacts, plus 5 more SF sync fields: salesforcecontactid,
>   salesforceaccountid, salesforceleadid, salesforcecampaignids,
>   salesforceopportunitystage on contacts).
> - **`contact_status__c` moved to Pending Migration** — 33 HubSpot
>   lists filter on it. Need to design a replacement and migrate the
>   lists before archival.
> - **3 fields still pending small-blocker cleanup** (1 list + 1 workflow):
>   recruiter_email, digication_open_position, position_url.
>
> Total deletes count: 104 → 96.

### Review 1: Obvious Deletions (zero or near-zero records)

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 1 | `imported_from_salesforce` | Company | 0 | Never populated |
| 2 | `imported_from_salesforce` | Contact | 0 | Never populated |
| 3 | `imported_from_salesforce` | Deal | 0 | Never populated |
| 4 | `amount__c` | Contact | 0 | Empty Salesforce legacy |
| 5 | `income_category__c` | Contact | 0 | Empty Salesforce legacy |
| 6 | `system_url__c` | Contact | 0 | Empty + misplaced (company data) |
| 7 | `totalstudents__c` | Contact | 0 | Empty + misplaced (company data) |
| 8 | `amount__c` | Company | 2 | Near-empty Salesforce legacy |

#### HubSpot-defined / not archivable

These were originally in the deletion list but HubSpot's API rejects archive
attempts. They're either invisible in HubSpot's UI or have 0 records, so the
practical impact of leaving them is minimal.

| Field | Object | Records | Discovered | Reason |
|-------|--------|---------|------------|--------|
| `googleplus_page` | Company | 0 | 2026-04-29 | Google+ shut down 2019; HubSpot-defined |
| `facebookfans` | Company | 0 | 2026-04-29 | HubSpot-defined social field |
| `kloutscoregeneral` | Contact | 0 | 2026-04-29 | Klout shut down 2018; HubSpot-defined |
| `salesforceaccountid` | Company | 426 | 2026-04-30 | HubSpot-defined SF sync field |
| `numemployees` | Contact | 0 | 2026-04-30 | HubSpot-defined contact-level employee count |
| `company_size` | Contact | 0 | 2026-04-30 | HubSpot-defined company-size field |
| `salesforcecontactid` | Contact | 807 | 2026-04-30 | HubSpot-defined SF sync field |
| `salesforceaccountid` | Contact | 0 | 2026-04-30 | HubSpot-defined SF sync field |
| `salesforceleadid` | Contact | 0 | 2026-04-30 | HubSpot-defined SF sync field |
| `salesforcecampaignids` | Contact | 0 | 2026-04-30 | HubSpot-defined SF sync field |
| `salesforceopportunitystage` | Contact | 0 | 2026-04-30 | HubSpot-defined SF sync field |

#### Blocked pending HubSpot cleanup — historical record

All blockers resolved as of 2026-05-01.

| Field | Object | Records | Was blocked by | Resolution |
|-------|--------|---------|----------------|------------|
| `renewal_date__c` | Company | 86 | Workflow `29356620` | Workflow deleted 2026-04-30 → field archived |
| `next_licensed_renewal_date` | Company | 2 | 3 reports | Reports kept; field moved to Pending Migration |
| 7 candidate fields | Contact | varies | Form `0-eb0923fb-...` | Form deleted 2026-04-30 → fields archived |
| `recruiter_email` | Contact | 0 | List `303` | List deleted 2026-05-01 → field archived |
| `digication_open_position`, `position_url` | Contact | 0 | Workflow `178668883` | Workflow deleted 2026-05-01 → fields archived |

### Review 2: Archived/Obsolete Fields

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 12 | `customer_status__c` | Company | 423 | Labeled "(archived)", replaced by sales_status |
| 13 | `prospect_status_history__c` | Company | 153 | Labeled "(archived)", legacy pipeline |
| 14 | `salesforcelastsynctime` | Company | varies | Salesforce sync discontinued |
| 15 | `salesforcelastsynctime` | Contact | varies | Salesforce sync discontinued |
| 16 | `salesforcelastsynctime` | Deal | varies | Salesforce sync discontinued |
| 17 | `currentlyinworkflow` | Contact | 4,004 | Labeled "discontinued", auto-populated by workflows, not useful |

### Review 3: Salesforce Legacy Fields (Companies)

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 18 | `renewal_date__c` | Company | 86 | Text strings ("July 1"), not real dates, stale (workflow 29356620 deleted 2026-04-30 → unblocked) |
| 19 | `primary_sales_rep__c` | Company | 282 | Redundant with HubSpot owner |
| 20 | `adoption_path__c` | Company | 259 | Concept useful but existing values not accurate. Revisit concept later. |
| 21 | `adoption_status__c` | Company | 92 | Subset of adoption_path, same decision |
| 22 | `institution_success_indicator_isi__c` | Company | 135 | No longer referenced |

#### Originally in Review 3, now elsewhere (decisions 2026-04-30)

- `salesforceaccountid` → moved to "HubSpot-defined / not archivable" below
- `next_licensed_renewal_date` → moved to "Pending Migration List" below — the 2 populated records hold meaningful renewal dates that should be migrated to a deal-level field, not discarded. The 3 reports that depend on it (`156079701`, `155303618`, `155907976`) remain in active use.

### Review 4: Misplaced Fields on Contacts

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 25 | `decision_maker__c` | Contact | 11 | Misplaced sales pipeline % |
| 26 | `demo_account__c` | Contact | 11 | Misplaced sales pipeline % |
| 27 | `demo_presentation__c` | Contact | 11 | Misplaced sales pipeline % |
| 28 | `final_negotiations__c` | Contact | 11 | Misplaced sales pipeline % |
| 29 | `identify_close_date__c` | Contact | 11 | Misplaced sales pipeline % |
| 30 | `identify_customer_needs__c` | Contact | 11 | Misplaced sales pipeline % |
| 31 | `identify_funding_source__c` | Contact | 11 | Misplaced sales pipeline % |
| 32 | `pricing_info_presented__c` | Contact | 11 | Misplaced sales pipeline % |
| 33 | `proposal_quote__c` | Contact | 11 | Misplaced sales pipeline % |
| 34 | `start_conversation_phone_email__c` | Contact | 11 | Misplaced sales pipeline % |

Note: Standard HubSpot fields (`annualrevenue`, `numberofemployees`) are kept as-is — not worth fighting HubSpot defaults. `numemployees` and `company_size` (both originally listed here) turned out to be HubSpot-defined too, moved to "HubSpot-defined / not archivable" below (discovered 2026-04-30).

### Review 5: Recruiting/Candidate Fields + Contacts

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 37 | `candidate_current_company` | Contact | 101 | Recruiting — not using HubSpot for this |
| 38 | `candidate_current_job_title` | Contact | ~101 | Recruiting |
| 39 | `candidate_info` | Contact | ~101 | Recruiting |
| 40 | `candidate_job_search_status` | Contact | ~101 | Recruiting |
| 41 | `candidate_location__city` | Contact | ~101 | Recruiting |
| 42 | `candidate_location__country` | Contact | ~101 | Recruiting |
| 43 | `candidate_online_profile` | Contact | ~101 | Recruiting |
| 44 | `recruiter_email` | Contact | 182 | Recruiting |
| 45 | `where_did_you_find_this_candidate_` | Contact | ~101 | Recruiting |
| 46 | `digication_open_position` | Contact | varies | Recruiting |
| 47 | `resume___cv` | Contact | varies | Recruiting |
| 48 | `salary_range` | Contact | varies | Recruiting |
| 49 | `position_url` | Contact | varies | Recruiting |

**Also delete ~182 candidate contact records.** Recruiting now done through breezy.hr, not HubSpot.

**Status (2026-05-01):** All 182 candidate contacts archived. **All 13 recruiting fields archived** — team deleted form `0-eb0923fb-...` (unblocked 7), then list `303` and workflow `178668883` (unblocked the last 3). Review 5 fully complete.

### Review 6: Duplicate Fields

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 50 | `option__c` | Deal | 134 | Outdated Salesforce feature options list. `options__c` (different field — pricing/discount notes) is being kept. |
| 51 | `nickname_preferred_name__c` | Contact | 583 | Data already exists in `preferred_name` — verified all 583 contacts have identical values in both fields. No migration needed. |

### Review 7: Deal-level Salesforce Fields

#### Part A — Sales Pipeline % Fields (replaced by HubSpot pipeline stages)

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 52 | `start_conversation__c` | Deal | ~271 | Salesforce methodology replaced by HubSpot stages |
| 53 | `decision_maker__c` | Deal | 271 | Same |
| 54 | `demo_account__c` | Deal | ~271 | Same |
| 55 | `demo_presentation__c` | Deal | ~271 | Same |
| 56 | `identify_close_date__c` | Deal | ~271 | Same |
| 57 | `identify_customer_needs__c` | Deal | ~271 | Same |
| 58 | `identify_funding_source__c` | Deal | ~271 | Same |
| 59 | `pricing_info_presented__c` | Deal | ~271 | Same |
| 60 | `proposal_quote__c` | Deal | ~271 | Same |
| 61 | `closing__c` | Deal | ~271 | Same |

#### Part B — Onboarding/Adoption Tracking (no longer tracked at deal level)

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 62 | `account_setup_import_integration__c` | Deal | varies | Onboarding no longer tracked per-deal |
| 63 | `system_setup__c` | Deal | varies | Same |
| 64 | `template_setup__c` | Deal | varies | Same |
| 65 | `set_up_assignments__c` | Deal | varies | Same |
| 66 | `set_up_rubrics__c` | Deal | varies | Same |
| 67 | `set_up_standards__c` | Deal | varies | Same |
| 68 | `roll_out_to_course__c` | Deal | varies | Adoption no longer tracked per-deal |
| 69 | `roll_out_to_faculty__c` | Deal | varies | Same |
| 70 | `roll_out_to_student__c` | Deal | varies | Same |
| 71 | `post_pilot_roll_out_quantity__c` | Deal | varies | Same |
| 72 | `established_pd_training__c` | Deal | varies | Same |
| 73 | `post_sales_activities__c` | Deal | varies | Same |

### Review 8: Remaining Contact Salesforce Fields

All confirmed as no longer used — old Salesforce-era data, incomplete, not referenced in current workflows.

#### Group 1 — Salesforce ID/Reference Fields

All 5 turned out to be HubSpot-defined SF sync fields (discovered 2026-04-30 during Step 4) — moved to "HubSpot-defined / not archivable" section. They cannot be archived via API.

#### Group 2 — Sales Activity Fields

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 74 | `lead__c` | Contact | 0 | Obsolete SF sales tracking |
| 75 | `next_step__c` | Contact | 0 | Replaced by HubSpot tasks |
| 76 | `next_step_date__c` | Contact | 0 | Replaced by HubSpot tasks |
| 77 | `sales_date__c` | Contact | 0 | Obsolete SF sales tracking |
| 78 | `flag_to_discuss__c` | Contact | 11 | Obsolete SF sales tracking |

`contact_status__c` was originally listed here but was deferred to **Pending Migration** during Step 4 — 33 HubSpot lists filter on it (972 records). Needs designed replacement (likely lifecycle stage migration) before archival.

#### Group 3 — Conference/Event Fields

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 85 | `conferences_workshops_attended__c` | Contact | varies | Old, incomplete data — not worth migrating |
| 86 | `contact_for_conferences__c` | Contact | varies | Old, incomplete data |

#### Group 4 — Product/Feature Interest

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 87 | `features_desired__c` | Contact | varies | Old SF data, incomplete |
| 88 | `options_desired__c` | Contact | varies | Old SF data, incomplete |
| 89 | `have_digi_account__c` | Contact | varies | Old SF data, incomplete |

#### Group 5 — Miscellaneous

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 90 | `department__c` | Contact | varies | Old SF data, incomplete |
| 91 | `email_group__c` | Contact | varies | Obsolete email grouping |
| 92 | `leadership_circle__c` | Contact | varies | Old, no longer used |
| 93 | `send_holiday_cards__c` | Contact | varies | Old, no longer used |
| 94 | `special_sf__c` | Contact | varies | Old, unknown purpose |
| 95 | `account_expiration_date__c` | Contact | varies | Old, misplaced on contact |
| 96 | `type__c` | Contact | varies | Old SF contact type |

### Review 9: Remaining Deal Salesforce Fields

#### Confirmed deletions

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 97 | `customization_specs__c` | Deal | 26 | All pre-2021, outdated |
| 98 | `features_enabled__c` | Deal | 1,511 | All pre-2021, no longer populated |
| 99 | `support_options__c` | Deal | 1,499 | All pre-2021, no longer populated |

#### Actively used — Keep (Phase 3 rename with Campus integration)

| Field | Since 2021 | Notes |
|-------|-----------|-------|
| `invoice__c` | 391 | → `quickbooks_invoice_id`. Used as recently as Apr 2026. Will evolve with Campus integration. |
| `invoice_date__c` | 398 | Used as recently as Apr 2026. |
| `type_of_invoice__c` | 511 | Used as recently as Apr 2026. |
| `due_date__c` | 373 | Used as recently as Mar 2026. |
| `options_price__c` | 17 | Actively used. Will be restructured when options get their own deals. |

### Review 10: Other Custom Fields Across Objects

#### Confirmed deletions

| # | Field | Object | Records | Reason |
|---|-------|--------|---------|--------|
| 100 | `zoom_webinar_attendance_count` | Contact | 152 | Zoom webinar experiment didn't stick |
| 101 | `zoom_webinar_attendance_average_duration` | Contact | 152 | Same |
| 102 | `zoom_webinar_registration_count` | Contact | 152 | Same |
| 103 | `zoom_webinar_joinlink` | Contact | 152 | Same |
| 104 | `rating` | Contact | 0 | Empty — no records populated |
| 105 | `submission_date` | Contact | 0 | Empty — no records populated |
| 106 | `account_fte_potential__c` | Company | low | Not useful — old SF prospect sizing |
| 107 | `account_name_abbreviation__c` | Company | low | Not useful (see new IPEDS field below) |
| 108 | `comments__c` | Company | 63 | All content is 2014–2019 era. No edits to comment content in years. |
| 109 | `email_domain__c` | Company | low | Derivable from standard `domain` field |

#### Archive (soft-remove, preserves data)

| Field | Object | Records | Reason |
|-------|--------|---------|--------|
| `account_nickname__c` | Company | low | Duplicate of `friendly_name` |
| `asana_link__c` | Company | low | Legacy Asana project links |
| `assigned_history__c` | Company | low | Old assignment log |
| `digication_sandbox_urls__c` | Company | low | Duplicate of `digication_sandbox_url` |

#### Keep as-is

| Field / Group | Object | Reason |
|---------------|--------|--------|
| `blog_digication_community_25890416137_subscription` | Contact | Drives HubSpot email sends/opt-outs (Make Learning Visible blog) |
| `blog_the_digication_blog_79039179362_subscription` | Contact | Drives email sends/opt-outs (Digication Blog) |
| Social media Insights (6 fields: `twitterhandle`, `twitterbio`, `twitterprofilephoto`, `linkedinbio`, `linkedinconnections`, `followercount`) | Contact | HubSpot auto-fills; no cost to keep |
| `hubspotscore` | Contact | Auto-managed by HubSpot — not deletable anyway |
| Zendesk metrics (5 fields: `zendesk_of_tickets_1_year_`, `zendesk_of_tickets_opened_30_days_`, `zendesk_of_tickets_sla_violation`, `zendesk_of_tickets_solved_1_year_`, `zendesk_of_tickets_solved_30_days_`) | Company | Useful for customer health. Sync status unknown; resurrect if not running. |
| `connections__c` | Company | 16 records — hold for now; may merge into other fields once full picture emerges |

---

## Pending Migration List (Do NOT delete yet — Phase 3)

| Item | What to preserve | Records | Future destination |
|------|-----------------|---------|-------------------|
| `digicon_2019__c` | Contacts who attended DigiCon 2019 | 320 | New engagement/participation field (name TBD in Phase 3) |
| Digi Scholars deals (92) | Contacts who were Digi Scholars podcast guests | 92 deals | Same engagement/participation field — tag contacts before closing pipeline |
| `contract_start_date__c` | Original customer start dates (real dates, some back to 2010) | 88 | May become `customer_since_date` or stay. Represents age of customer relationship — not derivable from individual deal dates. |
| `options__c` | Special pricing, fees, discounts (free text) | 103 | Will be transformed into structured discount/pricing field in later phase |
| `income_category__c` | QuickBooks income categorization (e.g. "5005 · Higher Education", "5030 · Custom Development") | 1,877 (all pre-2021) | Needs backfill for recent years + redesign of categories to match current business. Multi-phase project — old categories are outdated relative to where Digication is today. |
| `customer_creation_date__c` | True customer-since dates, going back to 2005 | 230 | HubSpot `createdate` is just the 2020 migration date. Merge the two into a single customer-since field. See follow-up task below. |
| `next_licensed_renewal_date` (companies) | Real renewal dates (added 2026-04-30) | 2 | Will move to a deal-level field in Phase 3. Until then, keep on companies — 3 active reports (`156079701`, `155303618`, `155907976`) depend on it. |
| `contact_status__c` (contacts) | SF-era contact status (added 2026-04-30) | 972 | 33 HubSpot lists filter on this field. Need to design a replacement (likely lifecycle stage or a new status field), migrate all 33 lists to the new field, then archive. Significant Phase 3 work. |

**Why we're waiting:** As more review happens, more things like these will surface. Better to design one right field than three wrong ones. The engagement/participation field in particular may need to cover events (DigiCon), programs (Digi Scholars), conferences (AAC&U), and more.

### Usage Metrics — Needs Deeper Conversation

Currently tracked on deals but used at company level. Plan is to formalize at deal level with potential B2B vs B2C metric split. Do NOT delete — needs design discussion.

| Field | Object | Population | Notes |
|-------|--------|-----------|-------|
| `active_student_users_in_subscription_yr__c` | Deal | varies | Possibly misplaced (company-level metric) |
| `course_quantity__c` | Deal | varies | |
| `e_portfolio_popularity__c` | Deal | varies | |
| `e_portfolio_quality__c` | Deal | varies | |
| `e_portfolio_quantity__c` | Deal | varies | |
| `e_portfolio_update_frequency__c` | Deal | varies | |

---

## Pipeline Decisions

### Delete immediately (Phase 2)
- **Hiring - Frontend Engineering** — 0 deals, never used

### Move deals then delete pipeline (Phase 2)
- **RFP Pipeline (11 deals)** — Move all to Prospects Pipeline:
  - 6 closed lost → Prospects Pipeline "Closed Lost" stage
  - University of Denver (won) → Prospects Pipeline "Invoice Paid" stage
  - 4 remaining (Purdue declined, Washtenaw stuck, Casa Grande stuck, Embry-Riddle stuck) → Prospects Pipeline "Closed Lost" stage
  - Then delete RFP Pipeline

### Pending migration then delete (Phase 3)
- **Digi Scholars Pipeline (92 deals)** — Tag associated contacts with engagement/participation field first, then close out deals, then delete pipeline

### Study further before deciding
- **Contracts Pipeline (165 deals)** — Contract tracking moving to deal-level fields per integration spec. Need to study these 165 deals against the new Campus contract model before deciding how to migrate.

### Keep with modifications
- **Renewal Pipeline (2,453 deals)** — Remove empty "Quota" stage
- **Prospects Pipeline (1,242 deals)** — Keep as-is for now. "Infrequent" stage (891 deals) = dormant prospects collected over the years. Valuable for re-engagement campaigns. Will be renamed to "Enterprise Prospects Pipeline" in Phase 3.

---

## Key Context from Jeff (for future sessions)

### On date fields
- **Deal-level `license_start_date__c` / `license_end_date__c`** describe dates for THAT specific deal only, not the overall customer relationship. A company with 10 yearly deals will have different license dates on each.
- **Company-level `contract_start_date__c`** answers "when did this customer first start with us?" — a different and valuable question.
- `license_end_date` ≠ renewal date. Multi-year prepaid deals mean the actual next renewal could be years after a deal's license end.

### On Infrequent deals
- These are dormant prospects who expressed interest at some point (ranging from initial contact to demo/negotiation) but fell through. Collected over years. Could be targets for re-engagement campaigns given new products (Kora, AI features).

### On recruiting
- Digication used HubSpot for recruiting as an experiment but now uses breezy.hr. Will not return to HubSpot for recruiting.

### On income categories
- `income_category__c` maps to QuickBooks income categorization (e.g. "5005 · Higher Education", "5030 · Custom Development").
- Current categories are outdated relative to where the business is today — need redesign.
- Recent years (2021+) were never backfilled — that's a separate project.
- This will be a multi-phase effort: redesign categories → backfill historical → integrate with Campus.

### On invoicing fields
- The 4 invoicing fields (`invoice__c`, `invoice_date__c`, `type_of_invoice__c`, `due_date__c`) are actively used.
- They originated from Salesforce but Digication adopted them into the HubSpot workflow.
- With the Campus integration, the source of truth will shift to Campus pushing values into these fields. The workflow changes, but the fields remain.

### On options pricing
- `options_price__c` and `options__c` are actively used but will eventually be restructured — options will get their own deals instead of being fields on a parent deal.

### On Digi Scholars
- A video/podcast where Digication interviewed educators from their customer base. Currently paused but may be resurrected. The contacts are educators who liked Digication enough to be guests — worth remembering.

### On post-deletion broken HubSpot artifacts (audit findings 2026-04-21)
- Step 0 Part A audits (workflows, active lists, dashboards/reports) found a small number of HubSpot artifacts that will break when their underlying fields are deleted in Phase 2.
- **None are critical.** Most weren't expected to keep working under the new structure anyway — they're already partially broken or aligned to the old Salesforce-era model.
- **Open question for Phase 3 / post-cleanup:** rebuild in HubSpot, or shift this kind of reporting/automation to Claude Code (using the HubSpot MCP) instead?
- Claude Code-driven workflows offer more power and flexibility than HubSpot's native list/dashboard tools — programmable filters, multi-source joins, custom outputs. Worth evaluating before sinking time into HubSpot UI rebuilds.
- Decision deferred until after Phase 2 execution. No action needed before deletion.

---

## Follow-up Tasks (surfaced during reviews)

### New field needed: IPEDS ID (Company)
- **What:** A new company-level field to store the institution's IPEDS ID (Integrated Postsecondary Education Data System — federally recognized ID for U.S. postsecondary institutions).
- **Why:** With IPEDS IDs in place, we can pull additional public data reported to accreditors (total FTE, enrollment, demographics, etc.) and enrich company records automatically.
- **Companion work:** Build a skill/automation to populate IPEDS IDs for existing companies (match by name/domain against the IPEDS directory).
- **Surfaced in:** Review 10 (F2 decision — `account_name_abbreviation__c` deleted, but institution-ID use case remains).

### Merge `customer_creation_date__c` with HubSpot `createdate`
- **What:** Consolidate `customer_creation_date__c` (230 records, real customer-since dates back to 2005) and HubSpot `createdate` (2020 migration date) into a single canonical customer-since field.
- **Why:** Today you have to look at two fields to answer "when did this customer first start with us?" — and `createdate` is misleading for anyone who joined pre-2020.
- **Approach (Phase 3):** Create new field (e.g. `customer_since_date`) → populate from `customer_creation_date__c` where present, else from `createdate` → delete `customer_creation_date__c` after verification.
- **Surfaced in:** Review 10 (F8 decision).

---

## Review 11 — Final Summary & Phase 2 Execution Plan

### Totals across all 10 field/record reviews

| Category | Count | Notes |
|----------|-------|-------|
| Fields to **delete** | 96 | Across Contact, Company, Deal objects (originally 109; 11 HubSpot-defined and 2 deferred to Pending Migration) |
| Fields HubSpot-defined / not archivable | 11 | 4 from Steps 1-3 + 7 more found in Step 4 — left in place |
| Fields moved to Pending Migration | 2 | `next_licensed_renewal_date` (deal-level migration) and `contact_status__c` (33 lists need migration) |
| Fields blocked pending small HubSpot UI cleanup | 0 | All resolved 2026-05-01 (list 303 + workflow 178668883 deleted by team) |
| Fields to **archive** (soft-remove) | 4 | Reversible in HubSpot — kept as escape hatch for duplicates/legacy |
| **Contacts** to delete | ~182 | Recruiting candidates (Review 5) |
| **Pipelines** to delete immediately | 1 | Hiring - Frontend Engineering (0 deals) |
| **Pipelines** to move-then-delete | 1 | RFP Pipeline (11 deals → Prospects Pipeline) |
| **Pipeline stages** to remove | 1 | Renewal Pipeline "Quota" stage (empty) |

### Held for Phase 3 (design work first)

- Usage metrics (6 deal fields) — need B2B/B2C design conversation
- `income_category__c` — needs category redesign + backfill
- `customer_creation_date__c` — merge with `createdate` into `customer_since_date`
- `contract_start_date__c` — becomes `customer_since_date` or similar
- `options__c` — will be restructured when options get their own deals
- `digicon_2019__c`, Digi Scholars deals — need engagement/participation field design first
- Contracts Pipeline (165 deals) — study against Campus contract model
- Prospects Pipeline rename → Enterprise Prospects Pipeline
- **New field: IPEDS ID** + populator skill (institution federal ID → unlocks FTE/enrollment enrichment)
- Field renames (`license_start_date__c` → `license_start_date`, etc.) — spec-driven

---

## Phase 2 Execution Plan

Phase 2 = execute every deletion/archive/pipeline change confirmed in Reviews 1–10. Phase 3 covers everything on the "Held for Phase 3" list above.

### Step 0 — Pre-flight safety (must complete before Step 1)

**Why this matters:** HubSpot field deletion is permanent. A good backup is the only rollback.

#### Part A — Manual (Jeff in HubSpot UI)

These cannot be done cleanly via API. HubSpot's native export is the authoritative backup.

1. **Full CRM export** — Settings → Import & Export → Exports → Create export
   - Export Contacts, Companies, Deals separately
   - Select "All properties" (not just visible)
   - Format: CSV (or XLSX)
   - HubSpot emails a download link when ready
   - Download and drop into `backups/phase2-pre-execution/<DATE>/hubspot-native-exports/`

2. **Workflow audit** — Automation → Workflows → filter "Contains property"
   - For each field on the deletion list, identify active workflows that reference it
   - Export or screenshot those workflows
   - **Fix or disable before deletion** — a workflow referencing a deleted field can silently break

3. **List audit** — Contacts → Lists → Active Lists filtering on any doomed field
   - Same idea: note, export, fix before deletion

4. **Dashboard / report audit** — Reporting → Dashboards
   - Scan for any report using a doomed field
   - Screenshot ones that do, plan rebuilds if needed

5. **Save everything** to `backups/phase2-pre-execution/<DATE>/` (may need gitignore + cloud storage depending on size)

#### Part B — Scripted (TypeScript in this repo)

Runs while Part A exports queue. Focused, grep-able, easy to review later.

1. **Per-field CSV dumps** — for each of the 106 fields, pull `(record_id, record_name, field_value)` → one CSV per field
2. **Schema re-snapshot** → `backups/schemas/<DATE>/` (in case anything changed since April)
3. **RFP Pipeline deals dump** — all 11 deals with full detail before move
4. **Candidate contacts dump** — all ~182 recruiting contacts before deletion

**Do not start Step 1 until both parts are complete and files are in the backup folder.**

### Step 1 — Zero-risk deletions (empty fields)

Fields with 0 populated records. Zero data loss possible. Good confidence-builder for the tooling.

- Review 1: 10 of the 11 obvious deletions (all 0-record fields — excludes `amount__c` Company which has 2)
- Review 8: 0-population contact SF legacy fields
- Review 9: any 0-record subset
- Review 10: `rating`, `submission_date` (both 0)

### Step 2 — Pipeline cleanup (move deals before deleting deal fields)

Do this before deleting deal-level fields — wrong order risks wiping data mid-migration.

1. Delete **Hiring - Frontend Engineering** pipeline (0 deals, no migration)
2. Move **11 RFP Pipeline deals** to Prospects Pipeline per mapping in the Pipeline Decisions section
3. Delete **RFP Pipeline**
4. Remove empty **"Quota" stage** from Renewal Pipeline

### Step 3 — Low-population Salesforce legacy

Fields with 0–500 records. Low stakes, mostly Salesforce ghosts.

- Review 1 remainder: `amount__c` (Company, 2 records)
- Review 3: 7 company SF legacy fields
- Review 6: `option__c` (134), `nickname_preferred_name__c` (583)
- Review 9: `customization_specs__c` (26), `features_enabled__c` (1,511), `support_options__c` (1,499)

### Step 4 — Misplaced contact fields + candidate contact cleanup

The big Contact object cleanup.

1. Delete **~182 candidate contacts first** (they're tied to recruiting fields)
2. Delete 12 misplaced company/pipeline-% fields (Review 4)
3. Delete 13 recruiting fields (Review 5 — safe now that candidates are gone)
4. Delete 23 remaining Contact SF fields (Review 8)

### Step 5 — Deal pipeline % and onboarding (Review 7)

22 fields, ~271 populated records each. Legacy Salesforce methodology, replaced by HubSpot deal stages.

- Part A: 10 sales pipeline % fields
- Part B: 12 onboarding/adoption tracking fields

### Step 6 — Review 10 (Zoom + other custom) + archives

- Delete 10 fields: 4 Zoom + 2 empty Contact (`rating`, `submission_date` if not already done in Step 1) + 4 low-pop Company (`account_fte_potential__c`, `account_name_abbreviation__c`, `comments__c`, `email_domain__c`)
- Archive 4 Company fields: `account_nickname__c`, `asana_link__c`, `assigned_history__c`, `digication_sandbox_urls__c`

### Step 7 — Obsolete/archived (Review 2)

6 fields. Notable: `currentlyinworkflow` (4,004 records, labeled "discontinued") and `customer_status__c` (423 records, labeled "archived").

### Step 8 — Post-execution verification

- Re-dump schemas → diff against pre-execution snapshot → confirm exactly the expected fields are gone
- Run key HubSpot saved views/reports to confirm nothing broke
- Spot-check 5–10 customer records for visible damage
- Mark the `backups/phase2-pre-execution/<DATE>/` folder as immutable archive

---

### Execution rhythm — 3 sessions with checkpoints

Breaking Phase 2 into sessions so any downstream damage (broken workflows, reports, integrations) surfaces between chunks, not all at once.

| Session | Steps | What it covers | Risk |
|---------|-------|----------------|------|
| **A** | 0–2 | Backups + zero-risk deletions + pipeline cleanup | Low — small blast radius, confidence-builder |
| **B** | 3–5 | Bulk field deletions (SF legacy, contacts, deal pipeline %) | Medium — most of the volume |
| **C** | 6–8 | Review 10 + archives + obsolete + full verification | Low — wrap-up |

**Wait 1–2 days between sessions** so downstream issues have time to surface.

### Execution method

**Recommended:** TypeScript script in this repo that reads from a deletion manifest (the Review 1–10 tables) and executes via HubSpot API, with:

- Dry-run mode (logs what would happen, changes nothing)
- Explicit confirmation prompt at each step boundary
- Per-action log file saved to `backups/phase2-pre-execution/<DATE>/execution-log.jsonl`
- Fails fast and loudly on any unexpected API response

Manual UI deletion for 106 fields is unrealistic. HubSpot MCP tools are designed for queries, not batch mutations.

---

## Where We Left Off

**All 11 reviews complete. Ready to begin Phase 2 when approved.**

**Immediate next actions for Jeff:**
1. Review this Phase 2 plan
2. If approved: begin Step 0 Part A (manual HubSpot exports — these take time to queue)
3. In parallel: I draft the deletion-manifest TypeScript script for Step 0 Part B

### Phase 0/1 deliverables completed:
- Schema backups: `backups/schemas/2026-04-10/` (4 files, all objects)
- Company inventory: `docs/inventory/companies-field-inventory.md`
- Contact inventory: `docs/inventory/contacts-field-inventory.md`
- Deal inventory: `docs/inventory/deals-field-inventory.md`
- Pipeline inventory: `docs/inventory/pipeline-stage-inventory.md`
- Ticket assessment: `docs/inventory/tickets-assessment.md`
- Cross-object overlap: `docs/inventory/cross-object-overlap-report.md`
