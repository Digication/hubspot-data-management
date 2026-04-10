# Review: Sales & Billing Architecture v2

**Reviewer:** Bagas (with Claude)
**Date:** 2026-03-30
**Type:** Technical
**Codebase referenced:** None

---

## What the Document Gets Right

1. **Comprehensive current state analysis** — The legacy status distribution table with actual HubSpot counts grounds the entire spec in real data, not assumptions.
2. **Clean separation of concerns** — Splitting the 19-value `sales_status` into three independent properties (Customer Tier, Lifecycle Stage, System State) is well-reasoned and eliminates the combinatorial explosion of the legacy model.
3. **Auto-computation rules are implementation-ready** — Section 2.4 is the standout addition in v2. The priority-ordered computation rules for each property are unambiguous and testable.
4. **Deal flow reversal is properly scoped** — Section 2.5 correctly identifies this as the largest build item and separates it from the property migration work.
5. **Migration plan is phased with clear dependencies** — The Campus-side / HubSpot-side split in each phase makes the work parallelizable across teams.

---

## Issues and Suggestions

### Issue 1: Race condition in auto-computation during parallel sync modes

> Section 2.4.1: "Immediate webhook" for self-signup events and "Periodic batch sync" for enterprise deals run concurrently.

If a company transitions from Self-Signup to Hybrid (e.g., sales closes an enterprise deal in HubSpot while a self-signup purchase webhook fires), the batch sync and webhook could compute conflicting Customer Tier values. The spec doesn't define which write wins or how conflicts are detected.

**Recommendation:** Define a last-write-wins policy with timestamps, or specify that the webhook always triggers a full recomputation regardless of the batch sync schedule. Add a note about conflict detection logging.

**Priority:** Low

**Reviewer note (2026-03-30):** The existing HubSpot > Campus deal sync is currently broken — no deal data is flowing. This means there's no legacy batch sync to maintain compatibility with. The deal sync can be rebuilt from scratch alongside the deal flow reversal (Section 2.5), eliminating the coexistence scenario. This reduces the risk significantly; the concern becomes an implementation detail about ensuring atomic computation in Campus rather than a spec-level issue.

---

### Issue 2: "Overdue for 90+ days" threshold in Tier computation is undefined operationally

> Section 2.4.2, step 2: "non-expired, paid_status != Overdue for 90+ days"

This introduces a 90-day grace period, but no other section defines how `paid_status` transitions to Overdue or how the 90-day clock starts. Is it 90 days from `license_end_date`? From the invoice due date? From the last payment attempt?

**Recommendation:** Add a subsection or note defining the Overdue trigger and the 90-day calculation. This affects whether a customer's tier suddenly drops.

**Priority:** High

---

### Issue 3: Validation coverage limited to enterprise; should gate Phase 3

> Section 3.2, Phase 2: "Validate: compare auto-computed values against legacy field for all 88 enterprise customers."

Validation is mentioned only for the 88 enterprise customers. The 1,040 `individual_self_signup` and 454 `individual_prospect` records are a much larger surface area and more likely to surface edge cases in the auto-computation logic. Since the new properties are written alongside the legacy `sales_status` (which stays untouched until Phase 4), incorrect computed values don't break anything during Phase 2 — but they would if workflows and reports switch to the new properties in Phase 3.

**Recommendation:** Extend validation to all segments before Phase 3 begins. Cross-check every record's new computed values against what the legacy mapping table (Section 3.1) predicts. Zero mismatches expected for records with a clear legacy mapping; records with no `sales_status` (2,741) should be manually reviewed as a sample. Phase 3 (workflow migration) should not start until validation passes across all segments.

**Priority:** Medium

---

### Issue 4: `lifecycle_stage_new` naming suggests it's temporary

> Appendix A: `lifecycle_stage_new` — Enumeration (auto-computed)

HubSpot has a built-in `lifecyclestage` property. The `_new` suffix avoids collision but reads as a temporary workaround. If this property is permanent, it should have a proper name. If it's temporary (to be migrated to the built-in property later), that migration step is missing.

**Recommendation:** Either rename to something permanent (e.g., `digication_lifecycle_stage`) or add a Phase 4 step to migrate to the built-in HubSpot lifecycle stage property and archive the `_new` version.

**Priority:** Low

---

### Issue 5: Contact `total_lifetime_spend` and `current_fy_spend` are at contact level, but deals are at company level

> Appendix A, Contact Properties: `total_lifetime_spend` — "Sum of all closed-won deal amounts"

Deals are associated with Companies, not Contacts. To compute spend per contact, you'd need contact-to-deal association or contact-to-company attribution logic. The spec doesn't define how a contact's spend is attributed when multiple contacts exist under one company.

**Recommendation:** Clarify whether these are company-level rollups (and should move to Company Properties) or contact-level (and need attribution rules). If contact-level, define the attribution logic.

**Priority:** Medium

---

### Issue 6: Domain-based matching needs a freemail exclusion list

> Section 2.2: "Email domain compared against existing HubSpot Companies. If domain match found, new Company flagged for manual review."

The case-by-case manual review is intentional — institution domain matches (e.g., `@stanford.edu`) are valuable signals for the sales team to catch duplicates or upsell opportunities. However, the spec doesn't distinguish between institutional domains and freemail providers. Matching on `@gmail.com`, `@yahoo.com`, or `@outlook.com` would flag nearly every self-signup against thousands of other companies, generating noise that drowns out the meaningful institutional matches.

**Recommendation:** Add a freemail exclusion list (Gmail, Yahoo, Outlook, Hotmail, etc.) so domain matching only triggers for institutional/corporate domains. The list can be maintained in Campus as a simple config.

**Priority:** Low

---

### Issue 7: No data retention/archival policy for deactivated systems — stale HubSpot data is a known problem

> Section 2.3, System State: "Deactivated — System is disabled; no login."

When a system is deactivated (or changes to a non-syncing status), the current implementation simply stops syncing — the HubSpot Company record remains with whatever data was last pushed. This has already caused issues: during the new billing workflow companies sheet data preparation, stale HubSpot data from systems that had stopped syncing led to incorrect reporting. The new architecture (using `system_type` + `system_state` for sync filtering) will inherit the same problem unless explicitly addressed.

**Recommendation:** When a system transitions to a non-syncing state (Deactivated or Sandbox), perform a final sync that updates HubSpot with the terminal state (e.g., `system_state = Deactivated`, `deactivation_reason` set). This ensures the HubSpot record reflects the current reality rather than freezing at the last pre-deactivation snapshot. Additionally, add a `last_synced_date` property to HubSpot Company records so reports can filter out or flag stale data.

**Priority:** Medium

---

### Issue 8: Missing error handling for Cowork QuickBooks workflow

> Section 4: "The Cowork agent handles authentication, API calls, error recovery, and reconciliation."

This is stated but not specified. What happens if Cowork fails to create a QB invoice? Is there a retry queue? A notification to Sam? A manual fallback? For ~100 invoices/year the volume is low, but a silent failure could mean revenue isn't recognized.

**Recommendation:** Add a brief error handling flow: failure notification channel, manual fallback process, and reconciliation frequency.

**Priority:** Low

---

### Issue 9: Multi-system usage sync aggregation undefined for shared HubSpot Company

> Section 2.2: "Production systems: Sync data to the parent HubSpot Company." and "Multi-department institutions: Remain under one HubSpot Company."

Multiple Campus production systems can map to the same HubSpot Company, but the spec doesn't define how usage fields (active users, storage, login frequency, trial dates) are aggregated. Are they summed? Does a "primary" system take precedence? Appendix A lists `primary_system_type` but never defines how the primary is designated when multiple production systems exist. Conflicting data (e.g., different trial dates across systems) has no resolution rule.

**Recommendation:** Define an aggregation strategy for multi-system companies: sum numeric fields, use the most recent dates, and designate a primary system selection rule (e.g., earliest created, highest usage, or manually assigned). Document which fields aggregate vs. which use primary-only.

**Priority:** Medium

---

### Issue 10: Manual override values are indistinguishable from auto-computed values in HubSpot

> Section 2.4.5: "Staff sets manual_lifecycle_override = Past Customer" and "All manual overrides should be logged with timestamp and user for audit purposes."

When a staff member overrides lifecycle to "Past Customer", the synced HubSpot value is identical to one computed automatically (Section 2.4.3, step 2). The audit log exists in Campus but doesn't survive the sync — HubSpot consumers (reports, workflows, sales team) cannot distinguish between a natural churn and a manual override. This makes it difficult to audit override frequency, build override-aware workflows, or troubleshoot unexpected status changes from the HubSpot side.

**Recommendation:** Sync the override state to HubSpot via one of: (a) a companion boolean property like `lifecycle_is_override` on the Company, (b) syncing the `manual_lifecycle_override` field itself as a separate HubSpot property, or (c) using distinct override values (e.g., "Past Customer (Override)"). Option (b) is simplest — it preserves value consistency while making the override visible.

**Priority:** High

---

### Issue 11: No one-time data migration for existing HubSpot contracts into Campus

> Section 2.7: "Sam has already set up contract-related properties in HubSpot (under the Contracts pipeline). A reconciliation of existing HubSpot contract fields with the Campus model below is needed during Phase 1."

The spec addresses field reconciliation (open item #5) but not the migration of existing contract *data* from HubSpot into Campus. If there are active contracts tracked in HubSpot's Contracts pipeline today, those records need a one-time import into the new Campus contract model. Without this, Campus launches as the "source of truth" with incomplete data, and the sales team must either maintain two systems or lose historical contract context. Additionally, the spec doesn't clarify the operational model: is there a contract creation form in Campus admin (support-only pages)? Is contract creation manual-only, or could it be auto-generated from deals?

**Recommendation:** (a) Add a Phase 1 step to audit existing HubSpot contract data and plan a one-time import into Campus. (b) Add open item #8: "Define contract creation UI and workflow in Campus admin." (c) Confirm that contract creation is manual-only and not synced inbound from any external source.

**Priority:** Medium

---

## Priority Summary

| Priority | Issue | Risk |
|----------|-------|------|
| High | #2 — Overdue threshold undefined | Customers could lose tier status unexpectedly; support escalations |
| Medium | #3 — Validation coverage limited to enterprise | Incorrect computed values could propagate when workflows switch in Phase 3 |
| High | #10 — Override indistinguishable from auto-computed in HubSpot | Cannot audit, report on, or build workflows around manual overrides from HubSpot side |
| Low | #1 — Race condition in parallel sync modes | Reduced — existing sync is broken, can rebuild from scratch |
| Medium | #5 — Contact-level spend attribution unclear | Computed properties may be wrong or uncomputable |
| Low | #6 — Domain matching needs freemail exclusion | Freemail domains (Gmail, Yahoo) would generate noise; institutional matching is intentional |
| Medium | #9 — Multi-system usage aggregation undefined | Incorrect or inconsistent data on shared HubSpot Company records |
| Medium | #11 — No contract data migration from HubSpot | Campus launches as "source of truth" with incomplete contract history |
| Low | #4 — `lifecycle_stage_new` naming | Technical debt if the name sticks permanently |
| Medium | #7 — No deactivation data policy | Stale HubSpot data after sync stops — already caused reporting issues |
| Low | #8 — Cowork QB error handling | Silent invoice creation failures |

## Bottom Line

v2 is a well-structured spec that successfully resolved all 9 issues from the v1 review. The auto-computation logic and deal flow reversal sections are strong additions. The two high-priority findings — undefined Overdue threshold (#2) and override indistinguishability in HubSpot (#10) — should be addressed before implementation begins. The medium-priority items (#3, #5, #7, #9, #11) cover validation gaps, sync behavior, and data migration that will surface as blockers during Phase 1-2 if not clarified. Notably, the existing HubSpot > Campus deal sync is currently broken, which simplifies the deal flow reversal scope (#1) since there's no legacy sync to maintain compatibility with.
