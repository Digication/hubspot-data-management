/**
 * Phase 2 Deletion Manifest
 *
 * Source of truth for everything being deleted, archived, or moved during
 * Phase 2 execution. Derived from decisions recorded in
 * docs/inventory/review-decisions.md (Reviews 1-10).
 *
 * Read-only at runtime. Any change here should be reflected back in
 * review-decisions.md and vice versa.
 */

export type HubSpotObjectType = "contacts" | "companies" | "deals";

export interface FieldTarget {
  /** Internal property name in HubSpot (what the API uses) */
  name: string;
  /** Which object this field lives on */
  object: HubSpotObjectType;
  /** Review number this decision came from (1-10) */
  review: number;
  /** Approximate record count at time of decision (for reporting) */
  approxRecords: number | "varies" | "low";
  /** Short justification — matches the "Reason" column in review-decisions.md */
  reason: string;
  /** Execution action */
  action: "delete" | "archive";
}

// -----------------------------------------------------------------------------
// Review 1 — Obvious Deletions (zero or near-zero records)
//
// Note: 3 fields originally listed here turned out to be HubSpot-defined and
// not archivable via the API (PROPERTY_INVALID, "read-only definition").
// They've been moved to HUBSPOT_DEFINED_NOT_ARCHIVABLE below. Discovery date:
// 2026-04-29 during Step 1 execution.
// -----------------------------------------------------------------------------
const review1: FieldTarget[] = [
  { name: "imported_from_salesforce",   object: "companies", review: 1, approxRecords: 0, reason: "Never populated",                 action: "delete" },
  { name: "imported_from_salesforce",   object: "contacts",  review: 1, approxRecords: 0, reason: "Never populated",                 action: "delete" },
  { name: "imported_from_salesforce",   object: "deals",     review: 1, approxRecords: 0, reason: "Never populated",                 action: "delete" },
  { name: "amount__c",                  object: "contacts",  review: 1, approxRecords: 0, reason: "Empty Salesforce legacy",         action: "delete" },
  { name: "income_category__c",         object: "contacts",  review: 1, approxRecords: 0, reason: "Empty Salesforce legacy",         action: "delete" },
  { name: "system_url__c",              object: "contacts",  review: 1, approxRecords: 0, reason: "Empty + misplaced (company data)", action: "delete" },
  { name: "totalstudents__c",           object: "contacts",  review: 1, approxRecords: 0, reason: "Empty + misplaced (company data)", action: "delete" },
  { name: "amount__c",                  object: "companies", review: 1, approxRecords: 2, reason: "Near-empty Salesforce legacy",    action: "delete" },
];

/**
 * HubSpot-defined properties that we'd ideally remove but cannot — the API
 * rejects archive attempts with PROPERTY_INVALID ("read-only definition").
 * Documented here so future sessions don't re-attempt them.
 */
export const HUBSPOT_DEFINED_NOT_ARCHIVABLE: Array<
  Omit<FieldTarget, "action"> & { discoveredOn: string }
> = [
  { name: "googleplus_page",     object: "companies", review: 1, approxRecords: 0,   reason: "Google+ shut down 2019; HubSpot-defined, not archivable", discoveredOn: "2026-04-29" },
  { name: "facebookfans",        object: "companies", review: 1, approxRecords: 0,   reason: "HubSpot-defined social field, not archivable",            discoveredOn: "2026-04-29" },
  { name: "kloutscoregeneral",   object: "contacts",  review: 1, approxRecords: 0,   reason: "Klout shut down 2018; HubSpot-defined, not archivable",   discoveredOn: "2026-04-29" },
  { name: "salesforceaccountid", object: "companies", review: 3, approxRecords: 426, reason: "Salesforce chapter closed; HubSpot-defined SF sync field, not archivable", discoveredOn: "2026-04-30" },
];

/**
 * Fields HubSpot refuses to delete because they're still referenced by
 * workflows, reports, lists, or other HubSpot artifacts. To delete these,
 * the referencing artifact has to be removed/edited in the HubSpot UI first.
 *
 * Field stays in FIELD_TARGETS (we still intend to delete it) — this list
 * just records what's blocking and the IDs to clean up.
 */
export interface BlockedField {
  name: string;
  object: HubSpotObjectType;
  blockingArtifacts: Array<{
    type: "WORKFLOW" | "REPORT" | "LIST" | "DASHBOARD" | "OTHER";
    id: string;
  }>;
  discoveredOn: string;
}

export const BLOCKED_PENDING_HUBSPOT_CLEANUP: BlockedField[] = [
  {
    name: "renewal_date__c",
    object: "companies",
    blockingArtifacts: [{ type: "WORKFLOW", id: "29356620" }],
    discoveredOn: "2026-04-30",
  },
  {
    name: "next_licensed_renewal_date",
    object: "companies",
    blockingArtifacts: [
      { type: "REPORT", id: "156079701" },
      { type: "REPORT", id: "155303618" },
      { type: "REPORT", id: "155907976" },
    ],
    discoveredOn: "2026-04-30",
  },
];

// -----------------------------------------------------------------------------
// Review 2 — Archived/Obsolete Fields
// -----------------------------------------------------------------------------
const review2: FieldTarget[] = [
  { name: "customer_status__c",         object: "companies", review: 2, approxRecords: 423,  reason: "Labeled '(archived)', replaced by sales_status",     action: "delete" },
  { name: "prospect_status_history__c", object: "companies", review: 2, approxRecords: 153,  reason: "Labeled '(archived)', legacy pipeline",              action: "delete" },
  { name: "salesforcelastsynctime",     object: "companies", review: 2, approxRecords: "varies", reason: "Salesforce sync discontinued",                    action: "delete" },
  { name: "salesforcelastsynctime",     object: "contacts",  review: 2, approxRecords: "varies", reason: "Salesforce sync discontinued",                    action: "delete" },
  { name: "salesforcelastsynctime",     object: "deals",     review: 2, approxRecords: "varies", reason: "Salesforce sync discontinued",                    action: "delete" },
  { name: "currentlyinworkflow",        object: "contacts",  review: 2, approxRecords: 4004, reason: "Labeled 'discontinued', auto-populated by workflows", action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 3 — Salesforce Legacy Fields (Companies)
//
// Discovered during Step 3 execution (2026-04-30):
// - salesforceaccountid is HubSpot-defined → moved to HUBSPOT_DEFINED_NOT_ARCHIVABLE
//   (removed from this array — cannot be deleted via API)
// - renewal_date__c and next_licensed_renewal_date are blocked by workflow
//   and report references → still here (we still intend to delete them) but
//   ALSO listed in BLOCKED_PENDING_HUBSPOT_CLEANUP. Re-running step3 after
//   the HubSpot UI cleanup will retry them.
// -----------------------------------------------------------------------------
const review3: FieldTarget[] = [
  { name: "renewal_date__c",                            object: "companies", review: 3, approxRecords: 86,  reason: "Text strings, not real dates, stale (blocked by workflow 29356620)",        action: "delete" },
  { name: "next_licensed_renewal_date",                 object: "companies", review: 3, approxRecords: 2,   reason: "Never adopted, renewal tracking moving to deal level (blocked by 3 reports)", action: "delete" },
  { name: "primary_sales_rep__c",                       object: "companies", review: 3, approxRecords: 282, reason: "Redundant with HubSpot owner",                      action: "delete" },
  { name: "adoption_path__c",                           object: "companies", review: 3, approxRecords: 259, reason: "Concept useful but values not accurate; revisit later", action: "delete" },
  { name: "adoption_status__c",                         object: "companies", review: 3, approxRecords: 92,  reason: "Subset of adoption_path, same decision",            action: "delete" },
  { name: "institution_success_indicator_isi__c",       object: "companies", review: 3, approxRecords: 135, reason: "No longer referenced",                              action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 4 — Misplaced Fields on Contacts
// -----------------------------------------------------------------------------
const review4: FieldTarget[] = [
  { name: "numemployees",                         object: "contacts", review: 4, approxRecords: "varies", reason: "Custom duplicate of standard field; company-level",   action: "delete" },
  { name: "company_size",                         object: "contacts", review: 4, approxRecords: "varies", reason: "Company-level data",                                   action: "delete" },
  { name: "decision_maker__c",                    object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "demo_account__c",                      object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "demo_presentation__c",                 object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "final_negotiations__c",                object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "identify_close_date__c",               object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "identify_customer_needs__c",           object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "identify_funding_source__c",           object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "pricing_info_presented__c",            object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "proposal_quote__c",                    object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
  { name: "start_conversation_phone_email__c",    object: "contacts", review: 4, approxRecords: "varies", reason: "Misplaced sales pipeline %",                           action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 5 — Recruiting/Candidate Fields
// (Note: ~182 candidate CONTACTS are also deleted as part of this review —
//  tracked separately in CANDIDATE_CONTACTS_FILTER below, not in this array.)
// -----------------------------------------------------------------------------
const review5: FieldTarget[] = [
  { name: "candidate_current_company",            object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting — Digication uses breezy.hr now", action: "delete" },
  { name: "candidate_current_job_title",          object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "candidate_info",                       object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "candidate_job_search_status",          object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "candidate_location__city",             object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "candidate_location__country",          object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "candidate_online_profile",             object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "recruiter_email",                      object: "contacts", review: 5, approxRecords: 182, reason: "Recruiting",                                   action: "delete" },
  { name: "where_did_you_find_this_candidate_",   object: "contacts", review: 5, approxRecords: 101, reason: "Recruiting",                                   action: "delete" },
  { name: "digication_open_position",             object: "contacts", review: 5, approxRecords: "varies", reason: "Recruiting",                              action: "delete" },
  { name: "resume___cv",                          object: "contacts", review: 5, approxRecords: "varies", reason: "Recruiting",                              action: "delete" },
  { name: "salary_range",                         object: "contacts", review: 5, approxRecords: "varies", reason: "Recruiting",                              action: "delete" },
  { name: "position_url",                         object: "contacts", review: 5, approxRecords: "varies", reason: "Recruiting",                              action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 6 — Duplicate Fields
// -----------------------------------------------------------------------------
const review6: FieldTarget[] = [
  { name: "option__c",                            object: "deals",    review: 6, approxRecords: 134, reason: "Outdated Salesforce options list; `options__c` kept",    action: "delete" },
  { name: "nickname_preferred_name__c",           object: "contacts", review: 6, approxRecords: 583, reason: "Data already exists in `preferred_name` (verified identical)", action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 7 — Deal-level Salesforce Fields
// -----------------------------------------------------------------------------
const review7A: FieldTarget[] = [ // Sales Pipeline % fields
  { name: "start_conversation__c",              object: "deals", review: 7, approxRecords: 271, reason: "Salesforce methodology replaced by HubSpot stages", action: "delete" },
  { name: "decision_maker__c",                  object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "demo_account__c",                    object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "demo_presentation__c",               object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "identify_close_date__c",             object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "identify_customer_needs__c",         object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "identify_funding_source__c",         object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "pricing_info_presented__c",          object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "proposal_quote__c",                  object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
  { name: "closing__c",                         object: "deals", review: 7, approxRecords: 271, reason: "Same",                                               action: "delete" },
];

const review7B: FieldTarget[] = [ // Onboarding/Adoption Tracking
  { name: "account_setup_import_integration__c", object: "deals", review: 7, approxRecords: "varies", reason: "Onboarding no longer tracked per-deal",  action: "delete" },
  { name: "system_setup__c",                     object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "template_setup__c",                   object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "set_up_assignments__c",               object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "set_up_rubrics__c",                   object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "set_up_standards__c",                 object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "roll_out_to_course__c",               object: "deals", review: 7, approxRecords: "varies", reason: "Adoption no longer tracked per-deal",    action: "delete" },
  { name: "roll_out_to_faculty__c",              object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "roll_out_to_student__c",              object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "post_pilot_roll_out_quantity__c",     object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "established_pd_training__c",          object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
  { name: "post_sales_activities__c",            object: "deals", review: 7, approxRecords: "varies", reason: "Same",                                   action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 8 — Remaining Contact Salesforce Fields
// -----------------------------------------------------------------------------
const review8: FieldTarget[] = [
  // Group 1 — Salesforce ID/Reference
  { name: "salesforcecontactid",       object: "contacts", review: 8, approxRecords: 807,       reason: "Salesforce discontinued",              action: "delete" },
  { name: "salesforceaccountid",       object: "contacts", review: 8, approxRecords: "varies",  reason: "Salesforce discontinued",              action: "delete" },
  { name: "salesforceleadid",          object: "contacts", review: 8, approxRecords: "varies",  reason: "Salesforce discontinued",              action: "delete" },
  { name: "salesforcecampaignids",     object: "contacts", review: 8, approxRecords: "varies",  reason: "Salesforce discontinued",              action: "delete" },
  { name: "salesforceopportunitystage",object: "contacts", review: 8, approxRecords: "varies",  reason: "Salesforce discontinued",              action: "delete" },
  // Group 2 — Sales Activity
  { name: "contact_status__c",         object: "contacts", review: 8, approxRecords: "varies",  reason: "Replaced by HubSpot lifecycle/activity", action: "delete" },
  { name: "lead__c",                   object: "contacts", review: 8, approxRecords: "varies",  reason: "Obsolete SF sales tracking",            action: "delete" },
  { name: "next_step__c",              object: "contacts", review: 8, approxRecords: "varies",  reason: "Replaced by HubSpot tasks",             action: "delete" },
  { name: "next_step_date__c",         object: "contacts", review: 8, approxRecords: "varies",  reason: "Replaced by HubSpot tasks",             action: "delete" },
  { name: "sales_date__c",             object: "contacts", review: 8, approxRecords: "varies",  reason: "Obsolete SF sales tracking",            action: "delete" },
  { name: "flag_to_discuss__c",        object: "contacts", review: 8, approxRecords: "varies",  reason: "Obsolete SF sales tracking",            action: "delete" },
  // Group 3 — Conference/Event
  { name: "conferences_workshops_attended__c", object: "contacts", review: 8, approxRecords: "varies", reason: "Old, incomplete data", action: "delete" },
  { name: "contact_for_conferences__c",        object: "contacts", review: 8, approxRecords: "varies", reason: "Old, incomplete data", action: "delete" },
  // Group 4 — Product/Feature Interest
  { name: "features_desired__c",       object: "contacts", review: 8, approxRecords: "varies",  reason: "Old SF data, incomplete",               action: "delete" },
  { name: "options_desired__c",        object: "contacts", review: 8, approxRecords: "varies",  reason: "Old SF data, incomplete",               action: "delete" },
  { name: "have_digi_account__c",      object: "contacts", review: 8, approxRecords: "varies",  reason: "Old SF data, incomplete",               action: "delete" },
  // Group 5 — Miscellaneous
  { name: "department__c",             object: "contacts", review: 8, approxRecords: "varies",  reason: "Old SF data, incomplete",               action: "delete" },
  { name: "email_group__c",            object: "contacts", review: 8, approxRecords: "varies",  reason: "Obsolete email grouping",               action: "delete" },
  { name: "leadership_circle__c",      object: "contacts", review: 8, approxRecords: "varies",  reason: "Old, no longer used",                   action: "delete" },
  { name: "send_holiday_cards__c",     object: "contacts", review: 8, approxRecords: "varies",  reason: "Old, no longer used",                   action: "delete" },
  { name: "special_sf__c",             object: "contacts", review: 8, approxRecords: "varies",  reason: "Old, unknown purpose",                  action: "delete" },
  { name: "account_expiration_date__c",object: "contacts", review: 8, approxRecords: "varies",  reason: "Old, misplaced on contact",             action: "delete" },
  { name: "type__c",                   object: "contacts", review: 8, approxRecords: "varies",  reason: "Old SF contact type",                   action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 9 — Remaining Deal Salesforce Fields
// -----------------------------------------------------------------------------
const review9: FieldTarget[] = [
  { name: "customization_specs__c",    object: "deals", review: 9, approxRecords: 26,   reason: "All pre-2021, outdated",                  action: "delete" },
  { name: "features_enabled__c",       object: "deals", review: 9, approxRecords: 1511, reason: "All pre-2021, no longer populated",       action: "delete" },
  { name: "support_options__c",        object: "deals", review: 9, approxRecords: 1499, reason: "All pre-2021, no longer populated",       action: "delete" },
];

// -----------------------------------------------------------------------------
// Review 10 — Other Custom Fields
// -----------------------------------------------------------------------------
const review10Deletes: FieldTarget[] = [
  { name: "zoom_webinar_attendance_count",            object: "contacts",  review: 10, approxRecords: 152, reason: "Zoom webinar experiment didn't stick", action: "delete" },
  { name: "zoom_webinar_attendance_average_duration", object: "contacts",  review: 10, approxRecords: 152, reason: "Same",                                  action: "delete" },
  { name: "zoom_webinar_registration_count",          object: "contacts",  review: 10, approxRecords: 152, reason: "Same",                                  action: "delete" },
  { name: "zoom_webinar_joinlink",                    object: "contacts",  review: 10, approxRecords: 152, reason: "Same",                                  action: "delete" },
  { name: "rating",                                   object: "contacts",  review: 10, approxRecords: 0,   reason: "Empty — no records populated",          action: "delete" },
  { name: "submission_date",                          object: "contacts",  review: 10, approxRecords: 0,   reason: "Empty — no records populated",          action: "delete" },
  { name: "account_fte_potential__c",                 object: "companies", review: 10, approxRecords: "low", reason: "Not useful — old SF prospect sizing", action: "delete" },
  { name: "account_name_abbreviation__c",             object: "companies", review: 10, approxRecords: "low", reason: "Not useful (see new IPEDS field planned for Phase 3)", action: "delete" },
  { name: "comments__c",                              object: "companies", review: 10, approxRecords: 63,  reason: "All content 2014-2019 era; no recent edits", action: "delete" },
  { name: "email_domain__c",                          object: "companies", review: 10, approxRecords: "low", reason: "Derivable from standard `domain` field", action: "delete" },
];

const review10Archives: FieldTarget[] = [
  { name: "account_nickname__c",        object: "companies", review: 10, approxRecords: "low", reason: "Duplicate of friendly_name",                action: "archive" },
  { name: "asana_link__c",              object: "companies", review: 10, approxRecords: "low", reason: "Legacy Asana project links",                action: "archive" },
  { name: "assigned_history__c",        object: "companies", review: 10, approxRecords: "low", reason: "Old assignment log",                        action: "archive" },
  { name: "digication_sandbox_urls__c", object: "companies", review: 10, approxRecords: "low", reason: "Duplicate of digication_sandbox_url",       action: "archive" },
];

// -----------------------------------------------------------------------------
// Combined manifest
// -----------------------------------------------------------------------------
export const FIELD_TARGETS: FieldTarget[] = [
  ...review1,
  ...review2,
  ...review3,
  ...review4,
  ...review5,
  ...review6,
  ...review7A,
  ...review7B,
  ...review8,
  ...review9,
  ...review10Deletes,
  ...review10Archives,
];

// -----------------------------------------------------------------------------
// Record-level deletions
// -----------------------------------------------------------------------------

/**
 * Candidate contacts (Review 5) — ~182 recruiting contacts to delete.
 * Verified: zero overlap with customers (no deals, no customer lifecycle stage).
 *
 * The filter used to identify them: any contact where ANY candidate_* field is
 * populated OR `recruiter_email` is populated. The dump script uses this filter
 * to produce the authoritative list before deletion.
 */
export const CANDIDATE_CONTACT_PROPERTIES = [
  "candidate_current_company",
  "candidate_current_job_title",
  "candidate_info",
  "candidate_job_search_status",
  "candidate_location__city",
  "candidate_location__country",
  "candidate_online_profile",
  "candidate_job_search_status",
  "recruiter_email",
  "where_did_you_find_this_candidate_",
  "digication_open_position",
] as const;

// -----------------------------------------------------------------------------
// Pipeline changes
// -----------------------------------------------------------------------------

export interface PipelineDeletion {
  label: string;
  object: "deals";
  reason: string;
  dealCount: number;
  action: "delete_immediately" | "move_then_delete";
}

export const PIPELINE_CHANGES: PipelineDeletion[] = [
  {
    label: "Hiring - Frontend Engineering",
    object: "deals",
    reason: "0 deals, never used",
    dealCount: 0,
    action: "delete_immediately",
  },
  {
    label: "RFP Pipeline",
    object: "deals",
    reason: "11 deals migrate to Prospects Pipeline; see review-decisions.md for stage mapping",
    dealCount: 11,
    action: "move_then_delete",
  },
];

// -----------------------------------------------------------------------------
// Sanity-check totals at module load (dev-time safeguard)
// -----------------------------------------------------------------------------
const deleteCount = FIELD_TARGETS.filter((f) => f.action === "delete").length;
const archiveCount = FIELD_TARGETS.filter((f) => f.action === "archive").length;

// These numbers must match the summary in review-decisions.md Review 11.
// If they drift, someone edited the manifest without updating the doc (or vice versa).
//
// 2026-04-29: Reduced from 109 to 106 after discovering 3 HubSpot-defined
// properties (googleplus_page, facebookfans, kloutscoregeneral) cannot be
// archived via the API. See HUBSPOT_DEFINED_NOT_ARCHIVABLE above.
// 2026-04-30: Reduced 106 → 105 after discovering salesforceaccountid
// (companies) is also HubSpot-defined. Two other fields (renewal_date__c,
// next_licensed_renewal_date) remain in the count — they'll be deleted
// once their HubSpot workflow/report dependencies are cleaned up. See
// BLOCKED_PENDING_HUBSPOT_CLEANUP above.
const EXPECTED_DELETES = 105;
const EXPECTED_ARCHIVES = 4;

if (deleteCount !== EXPECTED_DELETES || archiveCount !== EXPECTED_ARCHIVES) {
  // eslint-disable-next-line no-console
  console.warn(
    `[manifest] drift detected: ${deleteCount} deletes / ${archiveCount} archives ` +
      `(expected ${EXPECTED_DELETES}/${EXPECTED_ARCHIVES}). ` +
      `Sync with docs/inventory/review-decisions.md.`,
  );
}
