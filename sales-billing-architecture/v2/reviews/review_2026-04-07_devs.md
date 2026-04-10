# Review: Sales & Billing Architecture v2/v3 — Developer Working Session

**Reviewers:** Digication development team (with Jeff Yan)
**Date:** 2026-04-07
**Type:** Technical / decision-making
**Source:** Live working session covering open developer questions from the v2 field inventory (H17–H22), Bagas review items, and outstanding v3 questions

This review captures developer responses to outstanding questions from `v2/analysis/multi-plan-field-inventory.md` and the v2 Bagas review. Decisions here override prior assumptions in both the v2 spec and the field inventory document. The field inventory and v3 spec are being updated in-place to reflect these decisions.

---

## Decisions

### 1. B2B vs B2C is defined by plan type, not dollar amount

**Prior assumption (incorrect):** Deals above ~$1,000 are B2B; below are B2C.

**Correct definition:**
- **B2B (Enterprise):** Any **Digication-managed plan**. Created and managed by Digication staff. Includes pilots (see Decision #5).
- **B2C (Self-Signup):** Any **individual or group plan** signed up for and managed by the user themselves through the self-serve checkout flow.

**Why this matters:** A $30 self-signup is B2C. A free pilot worth $0 is B2B. The classifier is the *origin and management model*, not the price tag. Reports, summary fields, and the auto-deactivation rule (Decision #3) all key off this distinction.

**Implication for the field inventory:** All references to a "$1,000 threshold" must be replaced with "Digication-managed vs. self-signup plan type." The `customer_tier` multi-select values still hold (Enterprise, Self-Signup) — only the *rule* for assigning them changes.

---

### 2. Multiple Education Managed Plans per system are now supported

**Prior assumption:** A system can have at most one Education Managed (enterprise) plan.

**Correct:** Campus can technically support multiple Education Managed Plans on a single system. In practice, Digication will discourage this — most enterprise customers will continue to have one — but the data model and auto-computation rules must not assume a 1:1 constraint.

**Implication for the spec:** Anywhere v2/v3 says "the enterprise plan" (singular) for a system, treat it as "the set of active enterprise plans." This is consistent with the multi-plan reframing already underway in the field inventory.

---

### 3. Deactivation logic — split by B2B vs B2C

**Prior assumption (incorrect):** Auto-closing deals on deactivation is too dangerous; require case-by-case review for everything.

**Correct logic:**
- **B2C-only systems:** When all deals on a system are closed/lapsed and the system has **only ever had B2C plans**, Campus should **automatically deactivate** the system. No human review. This is the trial/individual/group lapse path — happens at scale, not worth manual touch.
- **Any B2B presence:** If a system has **any B2B (Digication-managed) plans at all**, Campus does **not** auto-deactivate. Deactivation is owned by the responsible sales agent / education team and handled case-by-case through an internal Digication process (not a Campus feature).

**Manual deactivation UX (B2B path):** Jeff is comfortable with either:
- (A) Onus on the education team to look up plans in Campus and HubSpot before deactivating, or
- (B) Campus shows all existing plans on the deactivation screen before confirming.

Jeff leans toward (A) — less dev work, acceptable risk if the team is trained. Final UX decision deferred but **not blocking**.

**Implication:** Resolves H20, H21, H22. Cancels the proposed "pre-deactivation safety check" as a hard requirement. Campus doesn't need to detect zero-deal systems for B2B — only for B2C-only.

---

### 4. Customer tier — multi-select approach confirmed

Devs confirmed: changing `customer_tier` to multi-select with values drawn from active deal types is fine. No technical blockers. Drop the "Hybrid" value.

---

### 5. Trial fields stay system-level — and a new concept: **Pilot**

**Prior question (H17):** Are trials per-system or per-plan?

**Answer:** Trials are **system-level** in Campus today, and that's correct. But Digication wants to formalize a distinction the old model conflated:

| | Trial | Pilot |
|---|---|---|
| **Origin** | Self-serve, automated signup | Sales-led, B2B process |
| **Customer interaction** | None — kicking the tires | Active sales conversation |
| **Duration** | Short (typical trial period) | Often longer — 30 days, 6 months, etc. |
| **Cost to customer** | Free | Free or reduced (e.g., AAC: 6-month free pilot) |
| **Modeled as** | The current trial system fields | A real **Digication-managed plan** at $0 or reduced rate |
| **Considered B2B?** | No | **Yes** — counts as enterprise for tier, lifecycle, and deactivation rules |

**Key insight:** A pilot is *not* a trial. A pilot is a real deal (just with custom pricing or zero cost). It belongs in the deal model with everything else, classified as Enterprise (B2B). Trial fields should remain at the system level and reflect *only* self-serve trials.

**Implication:** H17 resolved. Trial fields stay where they are. The spec needs a new short section (or note in 2.6 / contract management) introducing the Pilot concept and explaining that pilots are modeled as zero/reduced-price Digication-managed deals, not as trials.

---

### 6. Per-plan login & license tracking — confirmed feasible (better than expected)

**Prior question (H18):** Can Campus distinguish enterprise-plan users from individual-plan users at query time?

**Answer:** Yes — and the capability is broader than the field inventory assumed. Devs can track, **per plan (deal)**:
- **Licenses granted** — the denominator (e.g., "8,000 seats")
- **Logins in period** — the numerator (e.g., "7,200 unique logins during the deal's subscription window")

These are tracked **for every plan**, not only enterprise. Schools with three plans get three independent counts. Periods supported: in-period (the deal's start–end window), and the standard rolling windows (30 / 60 / 90 / 365 days).

**Roll-up:** The deal-level numbers can be rolled up to the company level if needed, but the deal-level data is the source of truth.

**Implication:**
- The proposed `enterprise_logins_in_period` field is no longer enterprise-only — extend it to all plan types. Rename to `plan_logins_in_period` (or similar) at the deal level.
- Add a corresponding `plan_licenses_granted` deal-level field.
- The "users in current subscription period" company-level field can still be retired, replaced by deal-level fields plus optional company rollups.
- Resolves H18.

---

### 7. New deal sync rule — replaces sales_status-driven sync

**Prior model:** Whether Campus continues to sync a customer was driven by `sales_status`.

**New model:** Sync is driven by **deal state**. Sync a deal (and the associated company/contact data) when:
1. The deal's start date and end date span the current date (license is currently valid), **AND**
2. The deal is **not** Closed Lost.

A Closed Won deal is *still synced* — closing in HubSpot terms means "money received," which typically happens early in the license period. Closed Lost means the plan is dead, the customer can't log in, and there's no reason to keep syncing.

**Implication:** This replaces the `sales_status`-based sync filter throughout v3. Section 2.4 / 2.5 / 3.x need a sweep to remove sales_status references in the sync logic and replace them with the deal-state rule.

---

### 8. Deal-derived fields moving to deal level — confirmed, no concerns

Devs confirmed: moving license count, license dates, plan name, billing cycle, paid status, new/renewal status, and related fields from company level to deal level is straightforward. No data model objections.

---

### 9. B2B/B2C summary fields — likely HubSpot rollups, not dev work

The new `enterprise_arr`, `self_signup_arr`, `enterprise_plan_count`, `has_overdue_enterprise_deal`, etc., should probably be implemented as **HubSpot rollup fields** computed from the deal-level data. Devs likely don't need to build them in Campus at all.

**Action for Jeff & Amanda:** Verify in HubSpot which of these can be implemented as rollup fields and which (if any) need Campus-side support. Report back to devs only if Campus changes are required.

---

### 10. Campus → HubSpot field sync inventory — devs have a spreadsheet

The H19 question (what does Campus currently sync to HubSpot?) is answered: devs maintain a tracking spreadsheet. Jeff has the file (`Campus _ Hubspot integration fields.xlsx`) in Dropbox. To be analyzed and cross-referenced with the field inventory in a follow-up session.

**H19 status:** Resolved in principle; analysis work pending.

---

### 11. Closed-deal semantics (clarification, not a change)

For everyone's reference, devs confirmed how a deal's "closed" state should be interpreted:

- **Start/end dates** describe when the license is valid. For non-license deals (e.g., AI credits), these dates can extend beyond the typical license window.
- **Closed in HubSpot = money received**, not "contract signed." HubSpot tracks the earlier pipeline stages (demo, contract, signing, PO, invoiced, awaiting payment), but a *closed* deal specifically means cash in the bank.
- **B2B closing:** Manual. When payment lands, a Digication staff member updates the deal in Campus admin (mark paid / closed).
- **B2C closing:** Automatic. Stripe payment closes the deal as part of the checkout webhook flow.

**Implication:** No spec change required, but this should be documented somewhere (likely a short note in Section 2.6 or alongside the `paid_status` field definition).

---

## Question Status After This Session

| ID | Question | Status | Resolution |
|---|---|---|---|
| H17 | Trials per-system or per-plan? | **Resolved** | System-level. New "Pilot" concept introduced for B2B free/reduced plans. |
| H18 | Can Campus distinguish enterprise vs individual users at query time? | **Resolved** | Yes — and broader: per-plan login + license tracking confirmed for all plan types. |
| H19 | What fields does Campus sync to HubSpot today? | **Resolved (analysis pending)** | Devs have a tracking spreadsheet; Jeff to analyze. |
| H20 | Pre-deactivation safety check in Campus UI? | **Resolved** | Not required. Education team owns manual lookup for B2B path. |
| H21 | Can Campus detect zero-active-deal systems? | **Partially resolved** | Yes for B2C-only (auto-deactivates). Not needed for B2B (sales-agent driven). |
| H22 | Auto-deactivation for single-plan systems worth automating? | **Resolved** | Yes for B2C-only. No for anything with B2B presence. |

---

## Open Items Still to Address

1. ~~**Bagas Issue #5 (contact spend attribution)**~~ — **RESOLVED 2026-04-07 (later in same day).** Decisions captured in [`../analysis/contact-creation-and-association.md`](../analysis/contact-creation-and-association.md). Mandatory deal-contact association going forward; B2C uses single buyer with new "Self-Pay Buyer" role; B2B pulls company-level contacts by role at deal creation time. Bagas Issue #6 (freemail) also resolved with nuance (personal-email signups remain valid).
2. **Field sync spreadsheet analysis** — Cross-reference Dropbox xlsx against the field inventory; identify gaps in either direction. Devs will review on their own and propose adjustments, especially around company-vs-deal-level associations.
3. **HubSpot rollup verification** — Confirm which proposed B2B/B2C summary fields can be HubSpot rollups vs. requiring Campus computation.
4. **Pilot concept** — Add a short section to v3 (likely near 2.6 Deal Architecture or 2.7 Contract Management) formalizing how pilots are modeled.
5. **Manual B2B deactivation UX** — Decide between option (A) education-team lookup vs. (B) Campus pre-deactivation plan list. Not blocking.
6. **Self-Pay Buyer role — final name** — confirm the exact value to add to the `sales_role` enumeration.
7. **HubSpot association label support** — devs to confirm the API can write multiple deal-contact links with distinct association labels in one operation (needed for the B2B contact pull).

---

## Affected Documents (in-place updates following this review)

- `v2/analysis/multi-plan-field-inventory.md` — B2B/B2C definition, deactivation logic, trial vs pilot, per-plan tracking, dev question table updates
- `v3/index.md` — multiple plans per system, deactivation rule, sync rule, deal sync logic, new pilot concept
- `HISTORY.md` — entry for this review session
