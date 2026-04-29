# Pipeline and Stage Inventory

**Date:** 2026-04-10
**Total Pipelines:** 6
**Total Deals:** 3,963

---

## Pipeline Summary

| Pipeline | ID | Deals | Status | Target (per spec) |
|----------|------|-------|--------|-------------------|
| **Prospects Pipeline** | `default` | 1,242 | Active | Rename → Enterprise Prospects Pipeline |
| **Renewal Pipeline** | `c7452b5c-...` | 2,453 | Active | Retained |
| RFP Pipeline | `1832625` | 11 | Unused | Clean up |
| Digi Scholars Pipeline | `4653960` | 92 | Unused | Clean up |
| Contracts | `13421804` | 165 | Deprecated | Study → close out |
| Hiring - Frontend Engineering | `4970497` | 0 | Unused | Delete |
| *Self-Signup Pipeline* | — | — | **New** | Create in Phase 3 |

---

## Active Pipeline 1: Prospects Pipeline (1,242 deals)

**Target:** Rename to "Enterprise Prospects Pipeline"

| Stage | ID | Deals | % of Pipeline | Notes |
|-------|------|-------|---------------|-------|
| Auto Import | `1832728` | 42 | 3.4% | Auto-created records |
| Initial Contact | `appointmentscheduled` | 1 | 0.1% | Low — early funnel |
| Schedule Demo | `qualifiedtobuy` | 3 | 0.2% | |
| Post Demo Follow Up | `presentationscheduled` | 21 | 1.7% | |
| Create Agreement | `decisionmakerboughtin` | 5 | 0.4% | |
| Create Invoice | `contractsent` | 2 | 0.2% | |
| Invoice Paid | `closedwon` | 63 | 5.1% | Closed won |
| Closed Lost | `closedlost` | 14 | 1.1% | |
| **Individual Student Signup** | `7597951` | **186** | **15.0%** | **Review: fits B2C self-signup model** |
| **Infrequent** | `2083449` | **891** | **71.7%** | **Review: largest stage — what are these?** |
| Non-Sales | `2121545` | 14 | 1.1% | Non-revenue records |

**Key findings:**
- **72% of deals are in "Infrequent" stage** (891 deals) — this is by far the largest concentration. These need review to understand what they represent and whether they should be in a different pipeline or stage.
- **"Individual Student Signup" (186 deals)** aligns with the new B2C Self-Signup Pipeline concept from the integration spec. These should move to the new pipeline in Phase 3.
- The active sales funnel (Initial Contact → Invoice Paid) holds only **95 deals** (8% of pipeline).
- **Closed Won (63) + Closed Lost (14)** = 77 deals with terminal status.

**Stages to assess against new model:**
- `Auto Import` — keep? Rename? These are auto-created from Campus sync.
- `Individual Student Signup` — move to Self-Signup Pipeline.
- `Infrequent` — needs investigation. May be a catch-all for low-value or dormant prospects.
- `Non-Sales` — review purpose. May overlap with "Deactivated" concepts in new model.

---

## Active Pipeline 2: Renewal Pipeline (2,453 deals)

**Target:** Retained for enterprise renewals.

| Stage | ID | Deals | % of Pipeline | Notes |
|-------|------|-------|---------------|-------|
| Fragile / Unlikely Renewal | `a0f6b370-...` | 5 | 0.2% | At-risk renewals |
| Need Confirmation / Likely Renewal | `4e7911aa-...` | 32 | 1.3% | Pending confirmation |
| Confirmed Renewal | `13299831` | 14 | 0.6% | Confirmed, not yet paid |
| Awaiting Renewal Payment | `c1cbe412-...` | 59 | 2.4% | Invoice sent |
| **Closed Won 100%** | `0906b08a-...` | **2,035** | **83.0%** | Successfully renewed |
| **Closed Lost 0%** | `cc131f27-...` | **308** | **12.6%** | Did not renew |
| Quota | `b53312d1-...` | **0** | 0% | **Empty — candidate for removal** |

**Key findings:**
- **83% Closed Won + 12.6% Closed Lost** = 95.6% of deals are in terminal stages. Only ~110 deals (4.4%) are in the active renewal funnel.
- **Quota stage is empty** — candidate for deletion.
- Pipeline is functioning as designed — most deals flow through to terminal stages.

---

## Unused Pipeline 3: RFP Pipeline (11 deals)

| Stage | ID | Deals |
|-------|------|-------|
| Received RFP invitation | `1832626` | ? |
| RFP questions | `1832627` | ? |
| RFP initial response | `1832628` | ? |
| RFP submission | `1832629` | ? |
| RFP demo presentation | `1832630` | ? |
| Closed won, send to prospects pipeline | `1832631` | ? |
| Closed lost | `1832632` | ? |
| Declined | `30711575` | ? |

**Recommendation:** Only 11 deals. Move any active deals to Prospects Pipeline, then delete pipeline. Last activity was Mar 2025.

---

## Unused Pipeline 4: Digi Scholars Pipeline (92 deals)

| Stage | ID | Deals |
|-------|------|-------|
| Proposed as VIP | `4653961` | ? |
| Accepted as VIP | `4653962` | ? |
| Invite VIP to participate | `4653963` | ? |
| Event preparation | `4653964` | ? |
| Event scheduled and confirmed | `4653965` | ? |
| Post event follow up to VIP | `4653966` | ? |
| Post event production planning | `4654386` | ? |
| Post event production draft | `4654387` | ? |
| Post event production approval | `4654388` | ? |
| Publish production | `4654389` | ? |
| Rejected by Digication | `4653967` | ? |
| Rejected by VIP | `4654390` | ? |

**Recommendation:** 92 deals from a past program (last activity Apr 2023). Archive deals, delete pipeline.

---

## Deprecated Pipeline 5: Contracts (165 deals)

| Stage | ID | Deals |
|-------|------|-------|
| Review Contract | `13421805` | ? |
| Draft Contract | `13421806` | ? |
| Waiting for Signature | `13421807` | ? |
| Signed Contract (Auto-renewal) | `13421808` | ? |
| Signed Contract (Manual Renewal) | `13421809` | ? |
| No Contract | `20527655` | ? |
| Archived Contracts | `13903860` | ? |

**Decision:** Per management plan, contract tracking moves to deal-level fields. These 165 deals need study against the new Campus contract model (spec task H7b). Migrate valuable data to deal-level contract fields, then close out pipeline.

---

## Unused Pipeline 6: Hiring - Frontend Engineering (0 deals)

No stages with deals. **Delete immediately.**

---

## New Pipeline (Phase 3): Self-Signup Pipeline

Per integration spec Section 1.2:

| Stage | Purpose |
|-------|---------|
| Sign Up | New self-signup account created |
| Trial | Active trial period |
| Cart Activity | User has items in cart |
| Purchased | Payment completed |
| Renewal Due | Approaching renewal date |
| Renewed | Successfully renewed |
| Churned | Did not renew |

**Source:** 186 "Individual Student Signup" deals from Prospects Pipeline should seed this.

---

## Phase 2 Cleanup Actions

| Action | Pipeline | Details |
|--------|----------|---------|
| **Delete** | Hiring - Frontend Engineering | 0 deals, never used |
| **Close out** | RFP Pipeline | Move 11 deals, delete pipeline |
| **Close out** | Digi Scholars Pipeline | Archive 92 deals, delete pipeline |
| **Study then close** | Contracts | Migrate 165 deals' contract data, close pipeline |
| **Remove stage** | Renewal Pipeline | Delete empty "Quota" stage |
| **Review stages** | Prospects Pipeline | Assess Infrequent (891), Individual Student Signup (186), Non-Sales (14), Auto Import (42) against new model |

## Phase 3 Pipeline Redesign Actions

| Action | Details |
|--------|---------|
| **Rename** | Prospects → Enterprise Prospects Pipeline |
| **Create** | Self-Signup Pipeline (7 stages) |
| **Move deals** | Individual Student Signup deals → Self-Signup Pipeline |
| **Add contact roles** | Self-Pay Buyer, Abandoned Cart, Trial Signup, Pilot Contact |
