# HubSpot CRM Data Management Plan

## Context

Digication has years of CRM data in HubSpot (account 7162402), including data migrated from a previous Salesforce CRM. The data has become unwieldy -- fields are on wrong objects, legacy Salesforce fields clutter the system, unused pipelines add confusion, duplicate records exist across objects, and unused fields add noise.

Digication is building a major new sales and billing architecture (spec at `sales-billing-architecture/v3/index.md`, currently v3 with multiple engineering reviews). The new architecture reverses the deal flow (Campus becomes source of truth), introduces B2B vs B2C deal tracking, replaces the 19-value `sales_status` with auto-computed properties, and requires ~169 sync fields between Campus and HubSpot. The integration spec explicitly calls out the HubSpot field audit (tasks H1-H16 in `v2/analysis/multi-plan-field-inventory.md`) as a prerequisite for several decisions.

**This means Phase 1-2 of our cleanup directly unblocks the integration work.** The two efforts are tightly coupled, and should be run in parallel.

This is **not a one-time project**. After the initial cleanup, ongoing data management processes need to be established.

---

## Current State Summary

### Objects

| Object | Properties | Records | Key Issues |
|--------|-----------|---------|------------|
| **Companies** | ~280 | 4,970 | Integration hub. Many ACT:/HIST: usage-tracking fields, Kora fields, Salesforce legacy fields. New architecture adds ~11 status fields + many time-series metrics. |
| **Contacts** | 354 | 16,950 | Misplaced company/deal fields, recruiting fields mixed with customers, obsolete fields. New architecture adds mandatory deal-contact association and new roles (Self-Pay Buyer, etc.). |
| **Deals** | 366 | 3,963 | 46 Salesforce legacy fields. New architecture introduces 6 deal types, ~20 new deal properties, and per-plan adoption metrics. |
| **Tickets** | ~100 | 0 | Unused. |

### Pipelines

| Pipeline | Deals | Last Activity | Status |
|----------|-------|---------------|--------|
| **Prospects Pipeline** | 1,242 | Active (Apr 2026) | In use -- will become Enterprise Prospects Pipeline |
| **Renewal Pipeline** | 2,453 | Active (Mar 2026) | In use -- retained |
| RFP Pipeline | 11 | Mar 2025 | Unused -- clean up |
| Digi Scholars Pipeline | 92 | Apr 2023 | Unused -- clean up |
| Contracts | 165 | Dec 2025 | Deprecated -- contract tracking moves to deal-level fields |
| Hiring - Frontend Engineering | 0 | Never | Unused -- clean up |
| *Self-Signup Pipeline* | -- | -- | **New** -- needed for B2C deal tracking |

**Pipeline redesign ahead:** Per the integration spec (Section 1.2), the target pipeline structure is:
- **Enterprise Prospects Pipeline** (renamed from current Prospects)
- **Self-Signup Pipeline** (new): Sign Up > Trial > Cart Activity > Purchased > Renewal Due > Renewed / Churned
- **Renewal Pipeline** (retained for enterprise renewals)

Active pipeline stages will be redesigned after spec decisions on B2B vs B2C are finalized. Some current stages (Auto Import, Individual Student Signup, Infrequent, Non-Sales, Quota) likely need assessment against the new model.

### Integration Spec Key Findings

From the v3 spec and analysis documents:

**Sync Field Inventory (from `v3/analysis/sync-field-inventory.md`):**

| Category | Synced | Not Implemented | Missing in HS | New (Architecture) | Total |
|----------|--------|----------------|---------------|-------------------|-------|
| System Identity | 6 | 0 | 0 | 0 | 6 |
| New Architecture Status | 0 | 0 | 0 | 11 | 11 |
| KORA/Assessment | 4 | 0 | 0 | 0 | 4 |
| LMS Integration | 0 | 3 | 0 | 0 | 3 |
| User Count Totals | 5 | 0 | 0 | 0 | 5 |
| Time-Series Metrics | ~21 | ~12 | ~102 | 0 | ~135+ |
| Sync Metadata | 1 | 0 | 0 | 0 | 1 |
| **Total** | **~37** | **~15** | **~102** | **11** | **~169** |

**Critical: ~102 fields need to be created in HubSpot** for the integration to work fully.

**Key architectural decisions already made (from amendments block + dev sessions):**
- B2B vs B2C defined by plan type, not dollar amount
- `customer_tier` changes from single-select to multi-select (drop "Hybrid")
- Campus becomes source of truth for deals (deal flow reversal)
- Deal-contact association is now mandatory (was never done before)
- Deal-derived fields (license count, dates, plan name, billing cycle, paid status) move from company level to deal level
- B2B/B2C summary fields (enterprise_arr, self_signup_arr, etc.) likely become HubSpot rollups
- `sales_status` field is being retired, replaced by auto-computed `customer_tier`, `lifecycle_stage_new`, `system_state`, `trial_status`
- Per-plan login/license tracking confirmed feasible for ALL plan types

**HubSpot Audit Tasks from the spec (H1-H16):**
The multi-plan field inventory document explicitly lists tasks H1-H16 for Jeff & Amanda. Our Phase 1-2 work directly addresses H1-H7, H12-H13. This confirms the two projects should be run together.

---

## Phase 3 Approach: Option B (Parallel Tracks) -- RECOMMENDED

Given that the integration spec is substantially developed (v3 with multiple reviews, clear field inventory, architectural decisions made), **Option B is the right choice**. The spec tells us exactly what fields are coming, what's being retired, and what's changing. Running cleanup and integration prep in parallel means:

1. Phase 1 inventory directly feeds the spec's H1-H7 tasks
2. Phase 2 cleanup removes dead fields before ~102 new fields are created
3. Phase 3 field restructuring can use the spec's field naming as the target schema
4. No wasted work -- every change aligns with the integration direction

---

## Phase 0: Data Backup and Safety Net

**Goal:** Create a restorable snapshot before making any changes.

### 0.1 Full Property Schema Export
- Export all property definitions (name, label, type, description, options) for all four objects
- Store as structured files in this repo (e.g., `backups/schemas/contacts-properties.json`)
- Reference for recreating deleted fields if needed

### 0.2 Record Data Export
**Recommended approach:** Do a HubSpot native full export (Settings > Import & Export) as a safety net, plus targeted MCP snapshots before each batch of changes.

### 0.3 Backup Schedule
- Before Phase 2 (deletions): full schema + native data export
- Before Phase 2.5 (merges): snapshot of targeted records
- Before Phase 3 (restructuring): snapshot of migrated records
- After each phase: schema export to track changes

---

## Phase 1: Full Property and Pipeline Inventory (Read-Only)

**Goal:** Build a complete categorized inventory of every field and pipeline stage. Directly addresses integration spec tasks H1-H7.

### Efficient Review Method
1. Auto-categorize fields by naming pattern (`__c` = Salesforce, `hs_` = HubSpot system, `act__` = Digication activity, `hist__` = Digication historical)
2. Present summary tables per category with field name, label, data type, and record count
3. Cross-reference against the sync field inventory (`v3/analysis/sync-field-inventory.md`) to tag fields as: Currently Synced | Needs Creation | Being Retired | HubSpot-Only | Unknown
4. Output as structured documents in this repo

### 1.1 Company Object Deep Dive (Addresses H1, H3, H4, H7)
- Pull all ~280 properties with full definitions
- Categorize each field and cross-reference with the sync field inventory
- Check data population rates
- **New (from spec):** Identify which of the 11 new architecture status fields need to be created
- **New (from spec):** Identify which ~102 "Missing in HS" time-series fields should be created (priority driven by reporting needs)
- **New (from spec):** Verify which fields in the "HubSpot-Only" list (Section 4 of sync inventory) are actually in use vs dead
- **Deliverable:** Categorized Company field inventory with sync status mapping

### 1.2 Contact Object Deep Dive
- Pull all 354 properties with full definitions
- Flag misplaced fields (company-level, deal-level, recruiting)
- For each misplaced/suspicious field: count records with data
- **New (from spec):** Map existing contact roles against the new role taxonomy (Self-Pay Buyer, Abandoned Cart, Trial Signup, Pilot Contact + existing roles)
- **Deliverable:** Categorized Contact field inventory with misplacement analysis

### 1.3 Deal Object Deep Dive (Addresses H2)
- Pull all 366 properties with full definitions
- Group the 46 Salesforce fields by function
- Check data population rates
- **New (from spec):** Map existing deal properties against the ~20 new deal properties defined in spec Section 2.6 (plan_tier, billing_cycle, deal_source, new_or_renewal, etc.)
- **New (from spec):** Identify which existing fields can be reused vs. need replacement
- **New (from spec):** Map existing deal stages against the proposed pipeline structure
- **Deliverable:** Categorized Deal field inventory with integration mapping

### 1.4 Pipeline and Stage Audit
- For each pipeline: list all stages with deal counts per stage
- For active pipelines: identify which stages have deals and which are empty
- For Contracts pipeline: study the 165 deals against the new Campus contract model (spec task H7b)
- **New (from spec):** Map current pipeline stages against proposed Enterprise Prospects / Self-Signup / Renewal structure
- **Deliverable:** Pipeline/stage inventory with migration mapping

### 1.5 Reports, Automations, and Lists Impact Assessment (Addresses H12, H13)
HubSpot does not expose report/workflow/list field dependencies via API. Strategy:

**What we produce:**
- A "fields being changed" master list (every field flagged for deletion, rename, move, or retirement)
- For each field: check the "Used in" section on the HubSpot property detail page (manual, in HubSpot UI)
- A prioritized checklist for manual review of reports, workflows, and lists
- Cross-reference with the spec's report rebuild tasks (H14-H16)

**Note:** This is inherently manual work in the HubSpot UI. No API or MCP capability exists for this.

**Scope note:** The impact surface is manageable — under 10 active reports, ~10 automations (many unused/candidates for redesign), and 3-4 active lists. This means the manual review is a focused task, not a large audit.

### 1.6 Ticket Quick Assessment
- Confirm no custom properties, only HubSpot defaults
- **Deliverable:** Brief status note

### 1.7 Cross-Object Overlap Report
- Fields on multiple objects, wrong objects, duplicate pairs
- Salesforce fields with HubSpot-native equivalents
- **New (from spec):** Fields that the integration spec plans to retire (e.g., `sales_status`), move (deal-derived fields from company to deal level), or replace
- **Deliverable:** Overlap report that drives Phase 2

---

## Phase 2: Cleanup -- Remove Unused Fields, Pipelines, and Stages

**Goal:** Remove dead/unused elements to reduce noise before restructuring and before ~102 new fields are created.

### 2.1 Verify and Delete Obviously Dead Fields
- Klout Score, Google Plus Page, DigiCon 2019, `currentlyinworkflow`, fields marked "(archived)"
- Check record count; if 0 = safe to delete; if low = sample and review
- **Before each deletion:** Check impact assessment from Phase 1.5

### 2.2 Clean Up Unused Pipelines
**Pipelines to clean up:**
- **RFP Pipeline (11 deals):** Move deals or close them out
- **Digi Scholars Pipeline (92 deals):** Move deals or close them out
- **Hiring - Frontend Engineering (0 deals):** Delete directly
- **Contracts (165 deals):** Study data against new Campus contract model (spec task H7b). Migrate valuable data to deal-level contract fields, then close out pipeline.

### 2.3 Clean Up Unused Pipeline Stages
Remove stages in active pipelines that have zero deals and aren't part of the workflow. (Full pipeline redesign happens in Phase 3.)

### 2.4 Assess Recruiting Fields on Contact
- Count records with data in `candidate_*` fields
- Sample to determine if contacts are candidates vs customers
- Decision: keep, move to separate system, or delete

### 2.5 Resolve Duplicate Fields
- `numberofemployees` vs `numemployees`, `option__c` vs `options__c`
- Cross-object Amount fields: determine authoritative source

### 2.6 Execute Field Deletions
- Export field metadata as backup before each deletion
- Check impact assessment for each field
- Property deletion happens in HubSpot Settings UI
- **Deliverable:** Deletion log with pre-deletion metadata backup

---

## Phase 2.5: Duplicate Record Detection and Cleanup

**Goal:** Find and merge duplicate records before restructuring.

### Merge Capabilities

| Object | API Merge? | Method |
|--------|-----------|--------|
| **Contacts** | Yes | `POST /crm/v3/objects/contacts/merge` -- scriptable |
| **Companies** | Yes | `POST /crm/v3/objects/companies/merge` -- scriptable |
| **Deals** | No | Manual merge in HubSpot UI only |

### 2.5.1 Company Duplicate Detection
- Match by name, domain, and `system_id__c` (Digication Campus ID)
- Higher ed naming challenge: fuzzy matching needed
- **New (from spec):** The integration spec adds domain-based duplicate detection at company creation time (`duplicate_review_flag`). Our cleanup here handles the existing backlog.

### 2.5.2 Contact Duplicate Detection
- Match by email and name+company

### 2.5.3 Deal Duplicate Detection
- Match by name + associated company
- Check for cross-pipeline duplicates

### 2.5.4 Merge Execution
- Contacts/companies: scriptable via API
- Deals: manual -- we provide the list, you execute
- **Deliverable:** Duplicate report with recommended primary records + merge script

---

## Phase 3: Restructure, Integration Field Setup, and Pipeline Redesign

**Goal:** Align HubSpot schema with the integration spec. Move fields to correct objects, create new integration fields, redesign pipelines for B2B/B2C.

### 3.1 Create New Architecture Status Fields (Spec Sections 2.3-2.4)
Create in HubSpot:
- `customer_tier` -- change existing field from single-select to multi-select (spec task H8)
- `lifecycle_stage_new` -- new computed field
- `system_state` -- new field (Active/Deactivated/Sandbox)
- `deactivation_reason` -- new enumeration
- `trial_status` -- new enumeration (None/Active/Expired/Extended)
- `trial_start_date`, `trial_end_date`, `trial_extension_count`
- `primary_system_type` -- new field
- `duplicate_review_flag` -- new field
- `lifecycle_is_override` -- new boolean
- `last_synced_date` -- new field

### 3.2 Create New Deal Properties (Spec Section 2.6)
Create in HubSpot:
- `plan_tier`, `billing_cycle`, `is_trial`, `deal_source`, `new_or_renewal`, `contract_term`, `auto_renewal`
- `transaction_reference_id`, `stripe_transaction_id`, `quickbooks_invoice_id`, `contract_reference_id`
- `plan_name`, `license_count`, `price_per_license`, `option_type`, `option_fee`
- `license_start_date`, `license_end_date` (may already exist as `license_start_date__c`, `license_end_date__c`)
- `paid_status`, `billing_grace_days` (replacing `billing_grace_mode` per Ali review #7)

### 3.3 Create B2B/B2C Summary Fields (Spec task H9)
Company-level rollup fields:
- `enterprise_arr`, `self_signup_arr`, `total_arr`
- `enterprise_plan_count`, `self_signup_plan_count`, `active_plan_count`
- `has_overdue_enterprise_deal`, `has_overdue_deal`
- `next_expiring_enterprise_date`, `next_expiring_deal_date`
- `highest_deal_tier`

**Implementation note:** These are likely HubSpot rollup fields computed from deal-level data, not Campus-side work (per dev session decision).

### 3.4 Move Misplaced Fields Off Contact
- Company-level fields -> Company object (via Contact-Company association)
- Deal-level fields -> Deal object
- **Connects to spec:** Deal-derived fields (license count, dates, plan name, etc.) confirmed moving to deal level

### 3.5 Migrate Salesforce Legacy Fields
For actively-used `__c` fields:
- Map to clean names matching the integration spec (e.g., `license_start_date__c` -> `license_start_date`)
- Create new field, migrate data, delete old field
- **HubSpot limitation:** Internal property names are immutable. All "renames" = create + migrate + delete.

### 3.6 Pipeline Redesign
Based on the integration spec:
1. Rename Prospects Pipeline -> Enterprise Prospects Pipeline
2. Create new Self-Signup Pipeline with stages: Sign Up > Trial > Cart Activity > Purchased > Renewal Due > Renewed / Churned
3. Retain Renewal Pipeline for enterprise renewals
4. Close out remaining unused pipelines (after Phase 2 deal migration)
5. Add new Contact roles: Self-Pay Buyer, Abandoned Cart, Trial Signup, Pilot Contact

### 3.7 Create Missing Time-Series HubSpot Properties
Create the ~102 "Missing in HS" fields from the sync inventory. This is a large set — batch creation will be needed. No reason to delay these; create them all in Phase 3 alongside other new fields.

### 3.8 Retire `sales_status` Field (Spec task H11)
After migration to new status model is complete:
- Verify all 19 legacy values are mapped and migrated
- Archive the field (keep data for reference but stop syncing)

**Deliverable:** Clean HubSpot schema aligned with integration spec

---

## Phase 4: Data Quality Cleanup

**Goal:** Fix data values within the now-clean structure.

### 4.1 Missing Value Audit
- Priority: `system_id__c` / `digication_campus_id` on Companies, email on Contacts, deal amounts/stages
- Categorize by repopulation difficulty (easy/medium/hard)

### 4.2 Data Conflict Resolution
- Determine authoritative source where same data exists in multiple places
- Reconcile values

### 4.3 Integration Data Validation
- Every Company with a Digication instance must have a Campus ID
- Campus IDs match actual Digication systems
- URLs are valid
- Flag mismatches between HubSpot and Digication

### 4.4 Report and Dashboard Rebuild (Spec tasks H14-H16)
- Rebuild ARR reports with B2B/B2C split
- Rebuild renewal/at-risk reports at deal level
- Rebuild adoption/usage correlation reports

---

## Phase 5: Ongoing Data Management

**Goal:** Keep the CRM healthy after initial cleanup. This is not a one-time project.

### 5.1 Duplicate Prevention
- Periodic duplicate scans (monthly/quarterly) via API script
- Complement the spec's `duplicate_review_flag` for new company creation
- Data entry standards to reduce duplicates at source

### 5.2 Field Usage Monitoring
- Quarterly: check population rates of custom fields
- Flag fields at 0% population (candidates for removal)
- Flag new fields created but never populated

### 5.3 Data Quality Scoring
- Company health: Campus ID? Production URL? License dates? Active deals?
- Contact health: Email? Name? Company association? Role?
- Deal health: Amount? Stage? Company association? Contact association?

### 5.4 Integration Sync Monitoring
- Monitor sync failures between Campus and HubSpot
- Monitor data conflicts (HubSpot vs Campus values)
- Alert on new Companies in Digication without HubSpot match

### 5.5 Governance
- Document field ownership (HubSpot-managed vs Campus-managed vs manual)
- Process for proposing new fields (prevent sprawl)
- Quarterly review of pipelines, stages, and field structure

### Implementation Options
- Scripts in this repo querying HubSpot API
- Scheduled Claude Code tasks with Slack alerts
- HubSpot native workflows/reports where possible
- Third-party tools (e.g., Insycle for duplicate management)

---

## Execution Notes

### MCP Tools vs. HubSpot UI vs. API

| Action | Where |
|--------|-------|
| List/search properties | MCP: `search_properties` |
| Get full property definitions | MCP: `get_properties` |
| Count records with/without values | MCP: `search_crm_objects` + `HAS_PROPERTY` |
| Read specific records | MCP: `get_crm_objects` |
| Update record values (migration) | MCP: `manage_crm_objects` |
| Identify duplicates | MCP: `search_crm_objects` |
| Merge contacts/companies | HubSpot API: `POST /crm/v3/objects/{type}/merge` |
| Merge deals | HubSpot UI only (no API) |
| Create/delete properties | HubSpot Settings UI or Properties API |
| Delete/archive pipelines | HubSpot Settings UI |
| Check report/workflow/list field usage | HubSpot UI (manual -- no API) |
| Full data export | HubSpot Settings > Import & Export |

### Safety Rules
- Take a backup before every phase that modifies data (Phase 0)
- Never delete a field without verifying data status
- Check impact assessment (reports, workflows, lists) before each field deletion
- Sample 5-10 records before any bulk data migration
- MCP `manage_crm_objects` requires explicit confirmation
- Pipeline deletion requires moving/closing all deals first

### How We'll Work Through This
- Go object-by-object, starting with Companies (the integration hub)
- Cross-reference every decision against the integration spec
- Each step is a natural pause/resume point
- Present findings as categorized summary tables
- Ask for decisions before any changes
- All changes reversible until a property is deleted from HubSpot

### Key Reference Documents
- `sales-billing-architecture/v3/index.md` -- main integration spec (amendments block at top is authoritative)
- `sales-billing-architecture/v3/analysis/sync-field-inventory.md` -- field-by-field sync inventory
- `sales-billing-architecture/v2/analysis/multi-plan-field-inventory.md` -- company field impact analysis + H1-H16 task list
- `sales-billing-architecture/v2/analysis/contact-creation-and-association.md` -- contact model decisions

---

## Verification
- After Phase 0: Confirm backups are complete and accessible
- After Phase 1: Review inventories, confirm categorizations, verify sync status mapping
- After Phase 2: Spot-check deletions in HubSpot UI, confirm no workflows broke
- After Phase 2.5: Verify merged records in HubSpot UI
- After Phase 3: Verify new fields appear correctly, test sync with sample data, confirm pipeline redesign works
- After Phase 4: Run integration test with small batch of Companies for Campus <-> HubSpot data flow
- Phase 5: Ongoing verification built into monitoring

---

## Resolved Questions

1. **Time-series field priority:** Not the highest priority, but no reason to delay — create them in Phase 3 alongside other new fields. No strict priority ordering needed.
2. **Reports/automations volume:** Small scope — under 10 active reports, ~10 automations (many unused and candidates for redesign), 3-4 active lists that can be manually updated. This makes the Phase 1.5 impact assessment manageable.
3. **Self-Signup Pipeline timing:** Include in Phase 3 — the Campus billing system is actively being implemented, so the pipeline should be ready when it ships.
