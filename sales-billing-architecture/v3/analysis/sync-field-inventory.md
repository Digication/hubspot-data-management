# Sync Field Inventory: Campus ↔ HubSpot

**Source:** HubSpot sync config spreadsheet (Campus/HubSpot integration fields), codebase at `digication-monorepo`, and spec Sections 2.3–2.9.
**Purpose:** Complete field-by-field inventory of all data that syncs (or should sync) between Campus and HubSpot Company records, plus new entity syncs (Deal, Contact, Contract) defined in the new architecture.

---

## 1. Campus → HubSpot Company (Batch Sync)

These fields are synced from Campus to HubSpot Company records via the existing batch sync infrastructure (CSV import via `imports.coreApi.create`). The sync is configurable per field (daily, monthly, quarterly, etc.) via `HubspotSyncConfig`.

### 1.1 System Identity Fields

| HubSpot Field | Internal Name | Data Origin | Campus Source | Sync Freq | Status | Config Field Name |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Company Name | (mapped to HS name) | Stored | `tSystem.systemname` | Daily | Synced | COMPANY_NAME |
| Domain | (mapped to HS domain) | Stored | `tSystem.website` | Daily | Synced | (static field) |
| Campus ID (Production) | `system_id__c` | Stored | `tSystem.id` | Daily | Synced | (static field) |
| Timezone | (mapped to HS timezone) | Stored | `tSystem.timezonekey` | Daily | Synced | COMPANY_TIMEZONE |
| Digication Production URL | `digication_production_url` | Calculated | Derived from `tSystem.systemkey` via `getSystemUrl` helper | Daily | Synced | DIGICATION_PRODUCTION_URL |
| Sales Status | `sales_status` | Stored | `tSystem.salesStatus` | Daily | Synced → **Archive** | SALES_STATUS |
| CSV Import Log | `csv_import_log` | Calculated (metadata) | Last 10 import log entries from `import` table | Daily | Synced | CSV_IMPORT_LOG |

### 1.2 New Architecture Status Fields

These fields are defined in the new architecture (Section 2.3) and do not exist in Campus or HubSpot today. They replace `sales_status`.

| HubSpot Field | Internal Name | Data Origin | Campus Source | Sync Freq | Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Customer Tier | `customer_tier` | Calculated | Section 2.4.2 rules against deal data | Push + Daily | **New** |
| Lifecycle Stage | `lifecycle_stage_new` | Calculated | Section 2.4.3 rules against deal + activity data | Push + Daily | **New** |
| System State | `system_state` | Stored (mapped) | `tSystem.state` → Active/Deactivated/Sandbox | Push + Daily | **New** |
| Deactivation Reason | `deactivation_reason` | TBD (new column or derived) | New enum on tSystem | Push + Daily | **New** |
| Trial Status | `trial_status` | Calculated | Section 2.4.4 rules against trial dates + deal data | Push + Daily | **New** |
| Trial Start Date | `trial_start_date` | Stored | `tSystem.trialStartDate` | Daily | Existing (not synced yet) |
| Trial End Date | `trial_end_date` | Stored | `tSystem.trialEndDate` | Push + Daily | Existing (not synced yet) |
| Trial Extension Count | `trial_extension_count` | TBD (new column) | New field on tSystem | Daily | **New** |
| Primary System Type | `primary_system_type` | Stored (new column) | New `system_type` field on tSystem | Daily | **New** |
| Duplicate Review Flag | `duplicate_review_flag` | Calculated | Domain matching against existing Companies | On creation | **New** |
| Lifecycle Is Override | `lifecycle_is_override` | Stored | Boolean flag when manual override is active | Daily | **New** |

### 1.3 KORA / Assessment Fields

| HubSpot Field | Internal Name | Data Origin | Campus Source | Sync Freq | Status | Config Field Name |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| KORA system option | `kora_system_option` | Stored (parsed from JSON) | `tSystem.options` → `enableKAMS` | Daily | Synced | KORA_SYSTEM_OPTION |
| KORA per user override | `kora_per_user_override` | Stored (parsed from JSON) | `tSystem.options` → `allowUserOverrideEnableKAMS` | Daily | Synced | KORA_PER_USER_OVERRIDE |
| KORA number of courses | `kora_number_of_courses` | Calculated (query) | `SELECT COUNT(*) FROM kams_container WHERE type='course' AND systemId=?` | Daily | Synced | KORA_NUMBER_OF_COURSES |
| KORA users with access | `kora_number_of_users_with_kora_access` | Calculated (query) | `SELECT COUNT(DISTINCT cm.sourceValue) FROM kams_container kc INNER JOIN kams_container_member cm ON kc.id=cm.containerId WHERE kc.systemId=? AND cm.sourceType='USER'` | Daily | Synced | KORA_NUMBER_OF_USERS_WITH_KORA_ACCESS |

*Note: KORA full/partial upgrade date and status fields (`kora_full_upgrade_date`, `kora_full_upgrade_status`, `kora_partial_upgrade_date`, `kora_partial_upgrade_status`) exist in HubSpot but are marked "Do not sync" — these are manual tracking fields set by Jeff in HubSpot forms.*

### 1.4 LMS Integration Fields

| HubSpot Field | Internal Name | Data Origin | Campus Source | Sync Freq | Status | Config Field Name |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| LMS | `lms` | TBD | LTI platform setup page — need to read from `lti_platform` table | Daily | Defined, **not implemented** | LMS_INTEGRATION |
| LMS integration details | `lms_integration_details` | Calculated (query) | `SELECT * FROM lti_platform WHERE systemId=?` — name, URL, LMS type, sandbox/production, active status per platform | Daily | Defined, **not implemented** | LMS_INTEGRATION_DETAILS |
| LMS URL | `lms_url` | Calculated (query) | URL(s) from `lti_platform` table — may be multiple per system | Daily | Defined, **not implemented** | LMS_URL |

*Note: These enum values exist in `HubspotDynamicFieldName` but the implementation throws "is not supported" error. The campus data source is the `lti_platform` table. A separate `lms` enum field also exists in HubSpot (created by Jeff) for manual entry — the synced version would replace or supplement it.*

### 1.5 User Count Totals

All fields are Calculated (query) against `tUser` and `tRole` tables. Synced daily.

| HubSpot Field | Internal Name | Campus Query Logic | Status | Config Field Name |
| :---- | :---- | :---- | :---- | :---- |
| Total number of users | `total_number_of_users` | `SELECT COUNT(userid) FROM tUser WHERE systemid=?` | Synced | TOTAL_NUMBER_OF_USERS |
| Total number of students | `total_number_of_students` | Count users NOT in admin (roletype=1, visiblef=0), faculty (roletype=2, visiblef=1), or alumni (roletype=3, visiblef=1) roles | Synced | TOTAL_NUMBER_OF_STUDENTS |
| Total number of faculty | `total_number_of_faculty` | Count users with roletype=2, visiblef=1, excluding admins | Synced | TOTAL_NUMBER_OF_FACULTY |
| Total number of admin | `total_number_of_admin` | Count users with roletype=1, visiblef=0 | Synced | TOTAL_NUMBER_OF_ADMIN |
| Total number of alumni | `total_number_of_alumni` | Count users with roletype=3, visiblef=1, excluding admins and faculty | Synced | TOTAL_NUMBER_OF_ALUMNI |

### 1.6 Time-Series Metrics: New Users by Role

Each metric follows a standard pattern across 7 time windows. All are Calculated (query) from `tUser` + `tRole` tables.

**Trigger types:**
- **ACT** (Activity): Runs daily, shows rolling window (e.g., last 30 days). Stored in Digication Log Table: Yes.
- **HIST** (Historical): Runs at period boundary (1st of month/quarter/year or end of subscription period). Stored in Digication Log Table: Yes. HubSpot field history: Yes.

**Subscription period fields** require deal/plan data to determine the start/end of the current subscription. These are currently blocked because the HubSpot→Campus deal sync is broken. With the new architecture (Campus as deal source of truth), these can be calculated entirely from Campus.

| Role | ACT: 30d | HIST: Month | HIST: Quarter | ACT: 1yr | HIST: Year | HIST: Sub Period | ACT: Current Sub Period |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Users** | Synced | Synced | Synced | Synced | Synced | Needs deal data | Needs deal data |
| **Students** | Synced | Synced | Synced | (missing) | Synced | Needs deal data | Needs deal data |
| **Admins** | Not impl. | Not impl. | Not impl. | (missing) | Not impl. | Not impl. | Not impl. |
| **Faculty** | Not impl. | Not impl. | Not impl. | (missing) | Not impl. | Not impl. | Not impl. |

Config field name pattern: `NEW_{ROLE}_IN_THE_LAST_30_DAYS`, `NEW_{ROLE}_BY_MONTH`, `NEW_{ROLE}_BY_QUARTER`, `NEW_{ROLE}_IN_THE_LAST_YEAR`, `NEW_{ROLE}_BY_YEAR`, `NEW_{ROLE}_BY_SUBSCRIPTION_PERIOD`, `NEW_{ROLE}_IN_CURRENT_SUBSCRIPTION_PERIOD`

Status legend:
- **Synced**: Code implemented, HubSpot property exists, sync running
- **Not impl.**: Enum defined in `HubspotDynamicFieldName`, code throws error, queries defined in spreadsheet
- **Needs deal data**: Queries defined but require subscription period dates from deal/plan data
- **(missing)**: ACT: 1yr variant not defined for students/admins/faculty in enum or HubSpot

### 1.7 Time-Series Metrics: Active Users by Role

Same pattern as 1.6 but based on `logindts` (last login timestamp) from `tUser` table.

| Role | ACT: 30d | HIST: Month | HIST: Quarter | ACT: 1yr | HIST: Year | HIST: Sub Period | ACT: Current Sub Period |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Users** | Synced | Synced | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS |
| **Students** | Missing in HS | Missing in HS | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS |
| **Admins** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |
| **Faculty** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |
| **Alumni** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |

Config field name pattern: `ACTIVE_{ROLE}_IN_THE_LAST_30_DAYS`, `ACTIVE_{ROLE}_BY_MONTH`, etc.

Status: "Missing in HS" = Campus can calculate the value (query defined in spreadsheet), but the HubSpot property has not been created yet. These need HubSpot property creation + sync wiring.

### 1.8 Time-Series Metrics: Total Logins by Role

Based on `tLogActivity` table where `activitytype=0` (login events). Count of total login events (not unique users).

| Role | ACT: 30d | HIST: Month | HIST: Quarter | ACT: 1yr | HIST: Year | HIST: Sub Period | ACT: Current Sub Period |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Users** | Missing in HS | Missing in HS | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS |
| **Students** | Missing in HS | Missing in HS | Missing in HS | Synced | Missing in HS | Missing in HS | Missing in HS |
| **Admins** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |
| **Faculty** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |
| **Alumni** | Missing in HS | Missing in HS | Missing in HS | (missing) | Missing in HS | Missing in HS | Missing in HS |

Config field name pattern: `TOTAL_{ROLE}_LOGINS_IN_THE_LAST_30_DAYS`, `TOTAL_{ROLE}_LOGINS_BY_MONTH`, etc.

### 1.9 Time-Series Metrics: Unique Logins by Role

Same as 1.8 but `COUNT(DISTINCT userid)` instead of `COUNT(userid)`. All are Missing in HubSpot.

| Role | ACT: 30d | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Current Sub Period |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Users** | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| **Students** | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| **Admins** | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| **Faculty** | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |
| **Alumni** | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS | Missing in HS |

Config field name pattern: `UNIQUE_{ROLE}_LOGINS_IN_THE_LAST_30_DAYS`, `UNIQUE_{ROLE}_LOGINS_BY_MONTH`, etc.

### 1.10 ePortfolio Metrics

All Missing in HubSpot. All Calculated (query). These track content creation and engagement at the system level.

| Metric | ACT: 30d | HIST: Month | HIST: Quarter | HIST: Year | HIST: Sub Period | ACT: Current Sub Period | ACT: Total |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| New ePortfolios | Missing | Missing | Missing | Missing | Missing | Missing | Missing |
| Edited ePortfolios | Missing | Missing | Missing | Missing | Missing | Missing | — |
| New pages | Missing | Missing | Missing | Missing | Missing | Missing | — |
| Edited pages | Missing | Missing | Missing | Missing | Missing | Missing | — |
| Total ePortfolios | — | — | — | — | — | — | Missing |
| Total eP pages | — | — | — | — | — | — | Missing |
| Total eP page views | — | — | — | — | — | — | Missing |

### 1.11 Future Metrics (Not Reviewed)

These metrics were identified in the spreadsheet but have not been reviewed or designed yet. They would follow the same time-series pattern (30d, 90d, 12 months).

- Number of courses
- Number of assignments
- Number of submissions
- System-level outcomes planned
- Course-level outcomes planned
- System-level outcomes assessed (by faculty / by self / by peers)
- Course-level outcomes assessed (by faculty / by self / by peers)

---

## 2. Field Count Summary

| Category | Synced | Not Implemented | Missing in HS | Needs Deal Data | New (Architecture) | Total |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| System Identity | 6 | 0 | 0 | 0 | 0 | 6 |
| New Architecture Status | 0 | 0 | 0 | 0 | 11 | 11 |
| KORA/Assessment | 4 | 0 | 0 | 0 | 0 | 4 |
| LMS Integration | 0 | 3 | 0 | 0 | 0 | 3 |
| User Count Totals | 5 | 0 | 0 | 0 | 0 | 5 |
| New Users (time-series) | 14 | 12 | 0 | 4 | 0 | 30+ |
| Active Users (time-series) | 5 | 0 | ~25 | 0 | 0 | ~30 |
| Total Logins (time-series) | 2 | 0 | ~28 | 0 | 0 | ~30 |
| Unique Logins (time-series) | 0 | 0 | ~30 | 0 | 0 | ~30 |
| ePortfolio Metrics | 0 | 0 | ~19 | 0 | 0 | ~19 |
| Sync Metadata | 1 | 0 | 0 | 0 | 0 | 1 |
| **Total** | **~37** | **~15** | **~102** | **~4** | **11** | **~169** |

---

## 3. Key Blockers and Dependencies

### 3.1 Subscription Period Metrics Blocked by Deal Sync

Fields with "Needs deal data" (e.g., `NEW_USERS_BY_SUBSCRIPTION_PERIOD`, `NEW_USERS_IN_CURRENT_SUBSCRIPTION_PERIOD`) require knowing the start and end dates of the current subscription period for a given system. Currently, this data comes from HubSpot deals (`license_start_date__c`, `license_end_date__c`), but the HubSpot→Campus deal sync is broken.

**Resolution with new architecture:** Once Campus is the source of truth for deals/plans, subscription period dates will be available directly from the Campus plan entity. All subscription-period metrics can then be calculated entirely within Campus without depending on the HubSpot deal sync. This unblocks ~4 currently blocked fields and enables subscription-period variants for all other roles.

### 3.2 ~102 Fields Missing in HubSpot

Many time-series metrics have been designed and have SQL queries defined (in the spreadsheet), but the corresponding HubSpot properties have not been created yet. These need:
1. HubSpot property creation (via API or admin UI)
2. Sync config entries in `HubspotSyncConfig`
3. Implementation in `getDynamicFieldValues.ts`

Priority should be driven by Jeff/sales team's reporting needs. The existing "Synced" fields cover the most critical user/student counts and activity metrics.

### 3.3 Admin/Faculty Time-Series Not Implemented

The `NEW_ADMINS_*` and `NEW_FACULTY_*` fields exist as enum values in `HubspotDynamicFieldName` but calling them throws "is not supported" error. The SQL queries are defined in the spreadsheet and follow the same pattern as the student/user queries. Implementation requires adding cases to `getDynamicFieldValues.ts`.

### 3.4 Duplicate salesCrmId Exclusion

Systems sharing a `salesCrmId` are excluded from ALL sync operations (see `HubspotSync.ts:128-140`). This means multi-system companies lose ALL metric sync, not just the conflicting fields. This must be resolved before migration — see Bagas review Issue #9 and multi-plan field inventory.

---

## 4. HubSpot-Only Fields (Do Not Sync)

These fields exist in HubSpot but are not synced from Campus. They are either HubSpot-managed (analytics, internal), manually entered by the sales team, or legacy fields from Salesforce migration.

### 4.1 HubSpot Analytics (auto-managed by HubSpot)
- Days to Close, Time First Seen, First Touch Converting Campaign, Time of First Session, Time Last Seen, Last Touch Converting Campaign, Time of Last Session, Number of Pageviews, Number of Sessions, Original Source Type/Data, Latest Source/Data/Timestamp

### 4.2 Company Information (manual, HubSpot Insights, or sales-entered)
- About Us, Street Address/2, City, Country/Region, Create Date, Description, Company Domain Name, Friendly Name, Phone Number, Postal Code, State/Region, Website URL, Year Founded, Industry, Number of Employees, Is Public, Type, Company owner

### 4.3 Sales & Finance (manual, sales-entered)
- Accounting Income Type, Fiscal Year (by license start date), Next Licensed Renewal Date, % of Students Licensed (current/future)

### 4.4 Institution/Program Information (manual, Jeff-created)
- Accreditation, Engagement, Institution Properties, Program, Competing eP Systems, Prior eP Systems, Lost to eP System, Total Enrollment, Campus Adoption %, Campus Health

### 4.5 System Information (manual or legacy)
- Digication Sandbox URL, SIS, SSO, API, CSV Import config, Test Accounts for Support, LMS (manual enum), Need KORA Transition Support

### 4.6 Salesforce Legacy (imported, not maintained)
- Account FTE, Account Name Abbreviation, Account Nickname, Adoption Path/Status, Potential Renewal Amount, Asana Link, Assigned History, Comments, Connections, Contract Start Date, Customer Creation Date, Customer Status (archived), Salesforce Account ID, etc.

### 4.7 Sales CRM / Pipeline
- Lifecycle Stage (HubSpot-native), Lead Status, Prospects/Customer/Vendor Status, Target Account, Ideal Customer Profile Tier, Number of Decision Makers/Blockers/Buying Roles

### 4.8 Social Media
- Facebook/LinkedIn/Twitter/Google Plus pages, bios, follower counts

### 4.9 Unused/Calculated by HubSpot
- Annual Revenue, Close Date, Total Revenue, Recent Deal Amount/Close Date, Number of Open/Associated Deals, Total Open Deal Value, etc.

### 4.10 Zendesk (planned but not synced)
- Zendesk # of tickets opened (1 year / 30 days), tickets solved (1 year / 30 days), tickets SLA violation

---

## 5. HubSpot → Campus (Deal Sync, Currently Broken)

| Campus Field | HubSpot Source | Internal Name | Status |
| :---- | :---- | :---- | :---- |
| HubspotDealEntity.name | Deal Name | `dealname` | Broken |
| HubspotDealEntity.stage | Deal Stage | `dealstage` | Broken |
| HubspotDealEntity.licenseStartDate | License Start Date | `license_start_date__c` | Broken |
| HubspotDealEntity.licenseEndDate | License End Date | `license_end_date__c` | Broken |
| HubspotDealEntity.licensedStudentAccounts | Licensed Student Accounts | `quantity__c` | Broken |

Sync runs via `hubspot-deals-sync` lambda, daily CRON at 12:00 UTC. Only processes deals in specific allowed pipeline stages (Renewal, Prospects, Contracts).

**With new architecture:** Campus becomes the source of truth for deals. The HubSpot→Campus deal sync will only be needed during the transition period for enterprise deals still created in HubSpot. Self-signup deals originate in Campus and push to HubSpot (see Section 2.9.2 in main spec).
