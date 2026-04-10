# Review: Sales & Billing Architecture v3

**Reviewer:** Ali  
**Date:** 2026-04-08  
**Scope:** 11 questions covering override behavior, data flow clarity, property design, and missing specifications

---

## What the Document Gets Right

- The three-property separation (Customer Tier, Lifecycle Stage, System State) is well-defined and covers the full legacy status space.
- The migration rules engine (Sections 3.3-3.6) is a major improvement over the spreadsheet approach, with clear rule groupings and reasoning preserved per rule.
- Auto-computation logic (Section 2.4) is detailed with explicit rules for tier, lifecycle, and trial status.
- The manual override table (Section 2.4.5) addresses the right scenarios for staff intervention.

---

## Issues and Suggestions

### Issue 1: Forcing Past Customer — cascading side effects undefined

**Section:** 2.4.5 (Override Points)a

**Quote:** "Staff sets manual_lifecycle_override = Past Customer — Overrides the computed lifecycle; useful when a known-churned customer's deals haven't been formally closed yet"

**Problem:** The override only describes the lifecycle change. It does not address:

- Whether active deals are closed, expired, or left as-is (creating a contradictory state: Past Customer lifecycle + active Enterprise tier)
- Whether an active trial continues (trial_active could still compute as true)
- Whether the system is deactivated or remains accessible
- Whether sync behavior changes

**Recommendation:** Add a "side effects" column to the override table, or define a "force churn" workflow that specifies the full set of field changes when a company is manually moved to Past Customer. At minimum, document whether the override is display-only or triggers downstream changes.

**Priority:** HIGH

---

### Issue 2: No path from Past Customer back to Prospect

**Section:** 2.4.3 (Lifecycle Stage Computation Rules)

**Quote:** Rule 2: "If no active deals but the company has at least one historical deal (any deal that was ever closed-won), stage = Past Customer." Rule 3: "If the company has contacts, signup activity, or an associated system, but no deal history, stage = Prospect."

**Problem:** Rule 2 always takes priority over Rule 3 when deal history exists. A company that churned years ago and re-enters the funnel as a fresh prospect cannot auto-compute to Prospect — they will always be Past Customer until they close a new deal (jumping directly to Active Customer). The Prospect stage is skipped entirely for returning companies.

**Recommendation:** Decide whether this is acceptable. If returning prospects should appear as Prospects during re-engagement, either: (a) add a time-based decay rule (e.g., "if last deal closed-won >2 years ago, treat as Prospect"), or (b) allow clearing the override to reset lifecycle. Document the intended re-engagement path.

**Priority:** MEDIUM

---

### Issue 3: `trial_active` is redundant with `trial_status`

**Section:** 2.3 (Property 2b), 2.4.4, Appendix A

**Quote:** "`trial_active` — Boolean (computed) — derived from trial_end_date >= today" and "`trial_status` — Enumeration — None, Active, Expired, Extended"

**Problem:** `trial_active = true` is equivalent to `trial_status IN (Active, Extended)`. Having both creates a redundant property that can go stale if sync fails. The previous review discussion indicated a preference for removing such direct derived attributes.

**Recommendation:** Remove `trial_active` from the property model. Use `trial_status` for all filtering and workflow logic. This reduces the sync surface and eliminates staleness risk.

**Priority:** MEDIUM

---

### Issue 4: Conflicting deal data flow direction

**Section:** 1.3, 2.5

**Quote (1.3):** "Deal data flows from HubSpot down to Campus in read-only mode."  
**Quote (2.5.2):** "Campus creates the deal(s) in HubSpot via the HubSpot API."

**Problem:** The document describes both directions without a clear data ownership model. During coexistence, it's unclear:

- Which system is source of truth for each deal type?
- Can the same deal be edited in both systems?
- What conflict resolution applies if both systems modify a shared deal?

**Recommendation:** Add a data ownership table:

| Deal Type                   | Created in | Editable in  | Synced to           |
| --------------------------- | ---------- | ------------ | ------------------- |
| Self-Signup                 | Campus     | Campus only  | HubSpot (read-only) |
| Enterprise (transition)     | HubSpot    | HubSpot only | Campus (read-only)  |
| Enterprise (post-migration) | Campus     | Campus only  | HubSpot (read-only) |
| Partnership/Sponsorship     | HubSpot    | HubSpot only | Campus (read-only)  |

**Priority:** HIGH

---

### Issue 5: No explicit list of HubSpot-only data

**Section:** Throughout — implied but never stated

**Problem:** The document establishes "Campus as source of truth" (Section 2.1) but never explicitly lists what data is added or edited solely in HubSpot. The following appear to be HubSpot-only based on context:

- Partnership and Sponsorship deals (Section 1.4: "Created manually in HubSpot by sales team")
- Manual contact roles: Decision Maker, Renewal Contact, Tax Exempt Contact (Section 2.8)
- Enterprise deals during the transition period (Section 2.5.2)
- Pipeline stage movements for enterprise deals

**Recommendation:** Add a section or table explicitly listing data that lives only in HubSpot and will not be synced back to Campus. This prevents assumptions about Campus having a complete picture.

**Priority:** MEDIUM

---

### Issue 6: Group plan not visible in Deal Type enumeration

**Section:** 2.6 (Deal Architecture)

**Quote:** Deal Type values: "Enterprise License, Self-Signup License, AI Credits, One-Time Fee, Partnership, Sponsorship"

**Problem:** "Group" plans are not represented in Deal Type. They appear only in the `plan_tier` property (Enterprise, Group, Individual) at the deal level, and via the "Group Admin" contact role. A reader scanning Deal Types would not realize group plans exist.

**Recommendation:** Add a clarifying note under the Deal Type table: "Self-Signup License covers both Individual and Group plans, differentiated by the `plan_tier` property." Alternatively, consider whether Group License deserves its own deal type if the billing or revenue treatment differs.

**Priority:** LOW

---

### Issue 7: `billing_grace_mode` as boolean is a blunt instrument

**Section:** 2.4.2

**Quote:** "`billing_grace_mode` is a boolean flag on each deal (default: off) ... The deal is still treated as active for tier computation, regardless of how long it has been Overdue."

**Problem:** A boolean grace mode means "infinite grace" — once enabled, a deal stays active forever regardless of overdue duration. This risks a forgotten flag keeping a dead deal active indefinitely with no natural expiry.

**Recommendation:** Convert to `billing_grace_days` (integer, default: null/0). When set, the deal remains active for that many days past the invoice due date, then becomes inactive normally. Example: `billing_grace_days = 60` for a customer known to pay 60 days late. This is more deterministic, more auditable, and self-expiring. Provide a default value (e.g., 60 or 90 days) that staff can override per deal.

**Priority:** MEDIUM

---

### Issue 8: Multi-year contract with variable yearly pricing

**Section:** 2.7 (Contract Management)

**Quote:** "`total_contract_value` — Currency — Sum of all years/deal values"

**Problem:** For a multi-year contract where each year has different pricing (e.g., Year 1 = $10k, Year 2 = $12k, Year 3 = $15k), there is no field to capture per-year breakdowns. The total is stored, but the distribution is lost.

**Recommendation:** Clarify the intended pattern: multi-year contracts should create one deal per year (each with its own dates and pricing), all linked via `contract_reference_id`. The contract holds the total; the deals hold the per-year detail. Document this explicitly so staff know how to enter multi-year agreements. If a per-year breakdown is needed at the contract level, consider adding a `yearly_values` JSON or line-item sub-table.

**Priority:** MEDIUM

---

### Issue 9: `system_type` does not cover event/seminar systems

**Section:** 2.2

**Quote:** "A new Campus field 'system_type' (production/sandbox/internal) determines sync eligibility."

**Problem:** Systems created for short-term events (seminars, workshops, conferences) don't fit the three existing values cleanly. They are external-facing (not sandbox or internal) but are not long-term institutional deployments (not typical production). Under the current spec, they default to "production" and sync to HubSpot like any other system.

**Recommendation:** Decide whether this is acceptable. If event systems should behave differently (e.g., excluded from customer health reports, different trial rules, auto-expire after event), add an `event` system type. If they're just short-lived production systems, document that explicitly so there's no ambiguity.

**Priority:** LOW

---

### Issue 10: Post-migration HubSpot role not summarized

**Section:** Throughout — scattered across sections

**Problem:** After full implementation, HubSpot's role changes significantly (from source of truth to CRM view). The document describes what moves to Campus but never summarizes what remains in HubSpot. This makes it hard for the sales team to understand their new workflow.

**Recommendation:** Add a summary section (e.g., "2.9 Post-Migration System Responsibilities") with a before/after table:

| Operation                 | Before           | After                                  |
| ------------------------- | ---------------- | -------------------------------------- |
| Self-signup deal creation | N/A              | Campus (auto-synced to HubSpot)        |
| Enterprise deal creation  | HubSpot          | HubSpot (transition) → Campus (future) |
| Company status            | HubSpot (manual) | Campus (auto-computed, synced)         |
| Contract management       | HubSpot          | Campus (synced)                        |
| Pipeline management       | HubSpot          | HubSpot (unchanged)                    |
| Sales workflows/sequences | HubSpot          | HubSpot (unchanged)                    |
| Reporting/dashboards      | HubSpot          | HubSpot (consuming synced data)        |

**Priority:** MEDIUM

---

### Issue 11: `lifecycle_is_override` from prior review not found in v3

**Section:** N/A

**Problem:** The HISTORY.md notes that a prior in-place edit added `lifecycle_is_override` boolean to Company properties (Bagas Issue #10). However, this property does not appear in the v3 document text or Appendix A.

**Recommendation:** Verify whether this was intended to carry forward into v3. If yes, add it to the Company Properties in Section 2.4.5 and Appendix A. If it was replaced by the `manual_lifecycle_override` field, note that in HISTORY.md.

**Priority:** LOW

---

## Priority Summary

| #   | Issue                                                        | Priority |
| --- | ------------------------------------------------------------ | -------- |
| 1   | Override to Past Customer — cascading side effects undefined | HIGH     |
| 4   | Conflicting deal data flow direction — no ownership table    | HIGH     |
| 2   | No path from Past Customer back to Prospect                  | MEDIUM   |
| 3   | `trial_active` redundant with `trial_status`                 | MEDIUM   |
| 5   | No explicit list of HubSpot-only data                        | MEDIUM   |
| 7   | `billing_grace_mode` boolean vs. days-based duration         | MEDIUM   |
| 8   | Multi-year contract per-year pricing not documented          | MEDIUM   |
| 10  | Post-migration HubSpot role not summarized                   | MEDIUM   |
| 6   | Group plan not visible in Deal Type enumeration              | LOW      |
| 9   | `system_type` missing event/seminar value                    | LOW      |
| 11  | `lifecycle_is_override` missing from v3                      | LOW      |

---

## Bottom Line

The v3 document is architecturally sound — the rules engine is a strong addition and the three-property model is well-designed. The main gaps are around **override behavior** (what happens downstream when you force a status change) and **data flow ownership** (who owns what during the coexistence period). These are the kind of details that become critical during implementation and should be resolved before development starts.
