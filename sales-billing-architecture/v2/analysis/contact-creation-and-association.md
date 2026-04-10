# Contact Creation & Deal Association

**Date:** 2026-04-07
**Context:** Resolves Bagas Review Issue #5 (contact-deal attribution) and the broader gap that the v2/v3 spec defined contact roles but never specified how contacts get created, deduplicated, or associated with deals.
**Status:** Decisions made by Jeff. Spec updates pending — this document is the source of truth until folded into the main v3 spec.

---

## Core Principle (NEW)

> **Every deal must have at least one associated contact, with an association label describing that contact's role on the deal.**

In the past, Digication used HubSpot deals **without** associating contacts to them. This is changing. Going forward, deal-contact association is **mandatory** and is the foundation that makes contact-level fields (`total_lifetime_spend`, `current_fy_spend`) computable and reliable.

HubSpot supports two relevant features that the new model leans on:
1. **Deal ↔ Contact associations** (already exists; we just weren't using it)
2. **Association labels** on those links (already exists; we never used it) — lets a single deal-contact link carry a role like "Decision Maker," "Billing Contact," "Renewal Contact," etc.

The association label is what lets one deal carry multiple contacts with distinct roles, and what lets one contact appear on multiple deals with potentially different roles each time.

---

## B2C: Self-Signup Deal-Contact Association

### Mechanics

When a self-signup checkout completes:

1. **Identify the buyer** — the person who actually paid via Stripe.
2. **Look up by email in HubSpot.** If a contact with that email already exists, use it. If not, create a new one.
3. **Associate the buyer with the new deal** at deal creation time.
4. **Apply the association label** identifying their role on this specific deal (see new role below).

In nearly all B2C cases, **a deal will have exactly one associated contact** — the buyer.

### New Contact Role: "Self-Pay Buyer"

The buyer in a B2C deal is fundamentally different from an officially-designated "Billing Contact" at the company level. They could be:
- A student paying for their own portfolio
- A professor expensing it personally
- An alum maintaining their work post-graduation
- Someone we know nothing about beyond their email

We need a contact role that **labels them as the person who paid for their own license** without conflating them with formal billing/renewal contacts that institutions designate at the company level.

**Proposed role name:** `Self-Pay Buyer` (or similar — final name TBD)

This becomes a new value in the `sales_role` multi-select field on Contact records. It applies broadly across B2C transactions without requiring us to know the buyer's institutional role.

### What this enables

- `total_lifetime_spend` and `current_fy_spend` on the contact become trivially computable: sum the deal amounts for deals where this contact is associated.
- Reports can filter "show me all self-pay buyers in the last fiscal year."
- We can distinguish a $30 student paying for themselves from a university's accounts-payable contact, without the data getting tangled.

---

## B2B: Digication-Managed Deal-Contact Association

### Mechanics

B2B deals are still created from Campus (per the deal flow reversal in v3 Section 2.5). The association logic differs from B2C: instead of identifying a single buyer, Campus pulls **all relevant contacts already on file at the company level**.

At deal creation time:

1. **Look up the company** the deal belongs to.
2. **Query the company's existing contacts** for any that carry these specific role values (in the `sales_role` field):
   - **Primary Contact**
   - **Renewal Contact**
   - **Decision Maker**
   - **Accounts Payable**
   - **Billing Contact**
   - **Tax Exemption** (for tax-exempt institutions)
3. **Attach every matching contact** to the new deal.
4. **Apply the matching association label** on each link (Decision Maker → "Decision Maker" label on the deal-contact link, etc.).

### Edge cases handled by this model

- **One person, multiple roles:** A small school may have one person who is the Decision Maker, Renewal Contact, Billing Contact, and AP all rolled into one. That contact gets associated to the deal once, with all their applicable labels.
- **Many people, distinct roles:** A large university may have a different person for each role. All of them get associated, each with their specific label.
- **Missing roles:** Some institutions may not have all six roles populated. We grab what exists; missing roles aren't blockers. Sales staff can add contacts/labels later.

### What this enables

- **Saves significant manual work for sales** — currently sales reps would need to remember to associate the right contacts with each new deal. The new flow does it automatically based on contact-level role data the team already maintains.
- **Renewal communications become reliable** — querying "who is the Renewal Contact for deals expiring next quarter" actually returns the right people.
- **Tax-exempt handling becomes data-driven** — any deal at a tax-exempt institution automatically pulls in the Tax Exemption contact.

### Pre-requisite

The B2B flow assumes the company-level contact roles are kept up to date. This is a soft pre-requisite (the system still works without them — it just attaches fewer contacts), but it raises the value of the existing manual contact-tagging work the sales team does.

---

## Company Creation & the Freemail Question (Bagas Issue #6 Refined)

Bagas's recommendation was to add a freemail exclusion list (Gmail, Yahoo, Outlook) to prevent self-signup with personal email addresses from triggering domain-match noise against thousands of HubSpot Companies. **The recommendation is sound but needs nuance.**

### Scenario A: Personal email + brand new institution name

A user signs up for a brand-new system using `jeff@gmail.com` and names it "Jeff Yan's Academy." This is a **legitimate signup** for a brand-new institution that simply doesn't exist yet. The correct behavior:
- **Create the company** "Jeff Yan's Academy" in HubSpot
- **Create the contact** for `jeff@gmail.com` and associate it with that company
- The fact that the email domain doesn't match the institution is fine — HubSpot allows this and we just need the linkage to work

**Don't block this.** Personal emails are common for individual instructors, micro-academies, independent educators, and so on.

### Scenario B: Personal email + existing institution name

A user signs up using `jeff@gmail.com` and tries to name the system "Boston University." Campus's existing duplicate detection should already prevent this — if BU already exists as a system, the user gets routed to "join the existing system" rather than creating a parallel one.

**No new logic needed** — Campus already handles this.

### Scenario C: Personal email + variation of an existing institution

A user signs up using `jeff@gmail.com` and names the system "Boston University - Medical School." Even if BU already exists, this is a **new system** because it's a distinct entity (e.g., the medical school operating independently). The correct behavior:
- **Create the new company** "Boston University - Medical School" in HubSpot
- **Associate the Gmail contact** with the new company
- Optionally flag for sales review if BU is already a customer (cross-sell opportunity)

### Scenario D: Institutional email + variation of existing institution

A user signs up using `jeff@bu.edu` and names the system "Boston University - Medical School." Same as Scenario C — a new system gets created, and the contact is associated with it. The contact's email domain happens to match BU, but the company-contact linkage is by **direct association**, not by domain inference. **HubSpot supports this and it's the desired behavior.**

### Implication for the freemail exclusion list

The freemail list still has value, but it's specifically for **suppressing the domain-match-against-existing-companies check**, not for blocking signups. The decision tree:

| Signup email type | Existing company match by domain? | Action |
|---|---|---|
| Institutional (`@bu.edu`) | Yes | Flag for sales review (potential dup or cross-sell) |
| Institutional (`@bu.edu`) | No | Create new company normally |
| Freemail (`@gmail.com`) | (skip the domain check entirely) | Create new company normally; do NOT flag |

The freemail list prevents Gmail/Yahoo/Outlook signups from triggering false-positive matches against thousands of unrelated companies. It does **not** prevent the signup itself.

---

## Contact Creation Triggers

A new HubSpot contact should be created when:

1. **A trial is signed up** (self-serve trial flow)
2. **A pilot is set up** (B2B pilot — modeled as a Digication-managed deal at $0 or reduced price; see v3 amendment #6)
3. **A self-signup checkout completes** (the buyer becomes a contact if they don't already exist)
4. **An abandoned cart event fires** (existing v3 spec rule: "Abandoned Cart contacts will be created for all checkout-flow entrants")
5. **Manual sales entry** (sales reps adding decision makers, renewal contacts, etc., during the B2B sales process — unchanged from today)

### Acceptable consequence: many contacts will end up "stranded"

Many trials and pilots won't convert. That means many systems — and their associated contacts — will end up closed/lapsed. **This is acceptable.** We're not optimizing to minimize contact count; we're optimizing to have a complete history of who engaged with the platform. Reports filter by company/deal state first, so stranded contacts don't pollute active customer reporting (see Contact Lifecycle below).

---

## Contact Lifecycle

The current HubSpot contact records have a status field. The question: should we transition contacts to "Past Customer" or similar when the company/deals they're associated with become deactivated?

**Decision: probably not worth the trouble.** Reasoning:

- Reporting flow is **company → deals → contacts**, not the reverse. When pulling "current customers and their contacts to email," the query starts from active companies/deals, then resolves to contacts. A contact's own status field isn't part of the filter chain.
- Maintaining a contact-status-mirrors-company-status invariant adds sync complexity for marginal benefit.
- A contact may legitimately be active in multiple roles across multiple companies (e.g., a consultant who works with multiple Digication customers). A company-status-driven contact lifecycle would mishandle this.

**Recommendation:** Leave contact status alone. Drive all customer-state filtering through company and deal state. Revisit if a concrete need surfaces.

---

## New Contact Roles to Add

The current `sales_role` multi-select field needs new values to handle self-signup and abandoned-cart concepts that didn't exist in the old model:

| Role | Source | Notes |
|---|---|---|
| **Self-Pay Buyer** (new) | Auto from B2C checkout | The person who paid for their own B2C plan. Differentiates from formal company-level billing roles. Final name TBD. |
| **Abandoned Cart** (already in v3 spec) | Auto from checkout flow | Created for all checkout entrants who didn't complete. |
| **Trial Signup** (new, optional) | Auto from trial flow | Tracks who initiated a self-serve trial. May overlap with Self-Pay Buyer if they convert. |
| **Pilot Contact** (new, optional) | Auto/manual from pilot setup | Primary contact for a B2B pilot engagement. |

The existing roles (Decision Maker, Renewal Contact, Billing Contact, Accounts Payable, Tax Exemption, Primary Contact) remain — they're the same roles the B2B deal association logic queries against.

---

## Historical Deals: Live With Imperfect Data

A prior decision considered importing all existing HubSpot deals into Campus to make Campus the single source of truth from day one. **This is being deferred.**

The reality: existing deal data in HubSpot was created under a different model (no contact associations, no consistent labels, mixed conventions across reps). A clean import would require significant data cleanup that isn't worth doing right now. Instead:

- **Old deals stay in HubSpot** as-is. Campus becomes the source of truth for **new deals** going forward.
- **No retroactive contact-association work** for historical deals.
- **Future cleanup is low priority.** If we get the basics working and there's later value in repopulating historical deals with proper structure, we can revisit. Don't block on it.

---

## Resolved & Outstanding Items

### Resolved
- **Bagas Issue #5** (contact-deal attribution) — Resolved by mandatory deal-contact association going forward.
- **Bagas Issue #6** (freemail exclusion list) — Refined with nuance: freemail list suppresses the domain-match check, not the signup itself. Personal-email signups for new institutions are legitimate and supported.
- **Contact creation triggers** — Defined: trial, pilot, checkout, abandoned cart, manual sales entry.
- **B2C deal-contact association** — Single buyer contact, looked up or created by email, attached with new "Self-Pay Buyer" role.
- **B2B deal-contact association** — Multi-contact pull from company-level role data at deal creation time.
- **Contact lifecycle** — No special handling. Drive filtering through company/deal state.
- **Historical deal import** — Deferred indefinitely. Campus is source of truth for new deals only.

### Outstanding (for next dev session)

1. **Final name for the "Self-Pay Buyer" role** — confirm the exact field value before implementation.
2. **Association label values in HubSpot** — confirm the exact label set HubSpot will use for deal-contact links: Decision Maker, Renewal Contact, Billing Contact, Accounts Payable, Tax Exemption, Primary Contact, Self-Pay Buyer. Verify these can be created as association label values in HubSpot's deal-contact association.
3. **Devs to confirm**: HubSpot API support for setting association labels at deal creation time (the B2B flow needs to write multiple deal-contact links with distinct labels in one operation).
4. **Soft pre-requisite tracking**: how do we monitor whether company-level contact roles are being kept up to date? A report showing "active enterprise companies missing a Renewal Contact" would surface gaps before they bite us at renewal time.

---

## Affected Documents

When the v3 spec body is rewritten (currently amendments block at the top is authoritative), the following sections need updates:

- **Section 2.2** (System Creation Flow) — refine domain-match logic per the freemail nuance above
- **Section 2.5** (Deal Flow Reversal) — add deal-contact association as a hard requirement; specify B2C single-buyer flow and B2B multi-contact-pull flow
- **Section 2.8** (Contact Role Model) — add "Self-Pay Buyer" (or final name) to the sales_role enumeration; document the association-label usage on deal-contact links
- **New Section 2.9** (suggested) — Contact Creation & Deal Association, lifting most of this document

## Change Log

| Date | Change |
|---|---|
| 2026-04-07 | Initial draft. Captures Jeff's decisions on B2C/B2B deal-contact association, freemail nuance, contact creation triggers, and historical deal handling. Resolves Bagas Issues #5 and #6. |
