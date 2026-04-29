# Contact Object Field Inventory

**Date:** 2026-04-10
**Total Properties:** 354
**Total Records:** 16,950

---

## Summary by Category

| Category | Count | Key Finding |
|----------|-------|-------------|
| HubSpot System (`hs_`) | 199 | Auto-managed. Do not touch. |
| Standard Contact Fields | 48 | Core HubSpot contact properties |
| Salesforce Legacy (`__c` + SF IDs) | 36 | 807 contacts with SF Contact ID. Many fields empty. |
| Recruiting/Candidate | 10 | 101-182 contacts. Mixed with customer contacts. |
| Zoom Integration | 4 | 152 contacts with webinar data |
| Blog Subscriptions | 2 | Email subscription tracking |
| Digication-specific | 1 | `digication_open_position` (recruiting) |
| Other Custom | 54 | Mixed bag — sales %, pronouns, AI interest, etc. |

---

## Category 1: Salesforce Legacy — 36 fields

| Field Name | Label | Population | Recommendation |
|------------|-------|-----------|----------------|
| `salesforcecontactid` | Salesforce Contact ID | 807 | **Reference** — SF link |
| `salesforcelastsynctime` | Last Salesforce Sync Time | varies | Obsolete — SF sync discontinued |
| `salesforceaccountid` | Salesforce Account ID | varies | Reference |
| `salesforceleadid` | Salesforce Lead ID | varies | Reference |
| `salesforcecampaignids` | Salesforce Campaign IDs | varies | Reference |
| `salesforceopportunitystage` | Opportunity Stage | varies | Obsolete |
| `account_expiration_date__c` | Account Expiration Date | varies | Review |
| `amount__c` | Amount | **0** | **Empty — delete** |
| `conferences_workshops_attended__c` | Conferences and Workshops Attended | varies | Review |
| `contact_for_conferences__c` | Contact for Conferences? | varies | Review |
| `contact_status__c` | Contact Status | varies | Review |
| `decision_maker__c` | Decision Maker % | varies | **Misplaced — sales pipeline % on contact** |
| `demo_account__c` | Demo Account % | varies | **Misplaced — sales pipeline %** |
| `demo_presentation__c` | Demo Presentation % | varies | **Misplaced — sales pipeline %** |
| `department__c` | Department | varies | Review — may duplicate jobtitle |
| `digicon_2019__c` | DigiCon 2019 | 320 | **Obsolete event — candidate for deletion** |
| `email_group__c` | Email Group (old) | varies | Obsolete |
| `features_desired__c` | Features Desired | varies | Review |
| `final_negotiations__c` | Closing % | varies | **Misplaced — sales pipeline %** |
| `flag_to_discuss__c` | Flag to Discuss | varies | Review |
| `have_digi_account__c` | Have Digi Account? | varies | Review |
| `identify_close_date__c` | Identify Close Date % | varies | **Misplaced — sales pipeline %** |
| `identify_customer_needs__c` | Identify Customer Needs % | varies | **Misplaced — sales pipeline %** |
| `identify_funding_source__c` | Identify Funding Source % | varies | **Misplaced — sales pipeline %** |
| `income_category__c` | Income Category | **0** | **Empty — delete** |
| `lead__c` | Lead Report | varies | Review |
| `leadership_circle__c` | Leadership Circle | varies | Review |
| `next_step__c` | Next Step | varies | Review |
| `next_step_date__c` | Next Step Date | varies | Review |
| `nickname_preferred_name__c` | Nickname / Preferred Name | varies | Duplicate of `preferred_name` |
| `options_desired__c` | Options Desired | varies | Review |
| `pricing_info_presented__c` | Pricing Info Presented % | varies | **Misplaced — sales pipeline %** |
| `proposal_quote__c` | Proposal / Quote % | varies | **Misplaced — sales pipeline %** |
| `sales_date__c` | Sales Date | varies | Review |
| `send_holiday_cards__c` | Send Holiday Cards | varies | Review |
| `special_sf__c` | Special SF | varies | Review |
| `start_conversation_phone_email__c` | Start conversation % | varies | **Misplaced — sales pipeline %** |
| `system_url__c` | System URL | **0** | **Empty — delete** |
| `totalstudents__c` | TotalStudents | **0** | **Empty — delete. Also misplaced (company-level data)** |
| `type__c` | Type | varies | Review |
| `imported_from_salesforce` | Imported from Salesforce | **0** | **Empty — delete** |

**Key findings:**
- **9 "sales pipeline %" fields** are misplaced on contacts — these track deal progress percentages and belong on deals, not contacts. From Salesforce's old sales methodology.
- **5 fields have 0 records**: `amount__c`, `income_category__c`, `system_url__c`, `totalstudents__c`, `imported_from_salesforce` → delete
- `digicon_2019__c` (320 records) is an obsolete event field from 2019 → delete
- `totalstudents__c` is company-level data misplaced on contacts

---

## Category 2: Recruiting/Candidate — 10 fields

| Field Name | Label | Population | Notes |
|------------|-------|-----------|-------|
| `candidate_current_company` | Candidate Current Company | 101 | |
| `candidate_current_job_title` | Candidate Current Job Title | ~101 | |
| `candidate_info` | Candidate Info | ~101 | |
| `candidate_job_search_status` | Candidate Job Search Status | ~101 | |
| `candidate_location__city` | Candidate location: City | ~101 | |
| `candidate_location__country` | Candidate location: Country | ~101 | |
| `candidate_online_profile` | Candidate Online Profile | ~101 | |
| `recruiter_email` | Recruiter Email | 182 | |
| `where_did_you_find_this_candidate_` | Where did you find this candidate? | ~101 | |
| `digication_open_position` | Digication Open Position | varies | |

**Key issue:** 101-182 recruiting contacts are mixed in with 16,950 customer/prospect contacts. These should either:
1. Be moved to a separate system (ATS)
2. Be tagged and segmented with a list
3. Have a contact property to distinguish them from customers

**Integration note:** The new architecture adds contact roles (Self-Pay Buyer, Abandoned Cart, Trial Signup, Pilot Contact). A "Candidate" role or tag would complement this.

---

## Category 3: Obsolete/Dead Fields

| Field Name | Label | Population | Reason |
|------------|-------|-----------|--------|
| `kloutscoregeneral` | Klout Score | **0** | Klout shut down in 2018 |
| `amount__c` | Amount | **0** | Empty SF legacy |
| `income_category__c` | Income Category | **0** | Empty SF legacy |
| `system_url__c` | System URL | **0** | Empty SF legacy |
| `totalstudents__c` | TotalStudents | **0** | Empty + misplaced (company data) |
| `imported_from_salesforce` | Imported from Salesforce | **0** | Empty |
| `digicon_2019__c` | DigiCon 2019 | 320 | Obsolete 2019 event |
| `currentlyinworkflow` | Currently in workflow (discontinued) | 4,004 | **Labeled "discontinued" but high population** — review before deleting |

---

## Category 4: Misplaced Fields (Wrong Object)

### Company-level data on Contact object

| Field Name | Label | Should Be On | Notes |
|------------|-------|-------------|-------|
| `totalstudents__c` | TotalStudents | Company | Student count is institution-level |
| `system_url__c` | System URL | Company | System URL is institution-level |
| `annualrevenue` | Annual Revenue | Company | Standard field but company-level |
| `numberofemployees` | Number of Employees | Company | Standard field but company-level |
| `company_size` | Company size | Company | Company-level field |

### Deal-level data on Contact object

| Field Name | Label | Should Be On | Notes |
|------------|-------|-------------|-------|
| `decision_maker__c` | Decision Maker % | Deal | Sales pipeline progress |
| `demo_account__c` | Demo Account % | Deal | Sales pipeline progress |
| `demo_presentation__c` | Demo Presentation % | Deal | Sales pipeline progress |
| `final_negotiations__c` | Closing % | Deal | Sales pipeline progress |
| `identify_close_date__c` | Identify Close Date % | Deal | Sales pipeline progress |
| `identify_customer_needs__c` | Identify Customer Needs % | Deal | Sales pipeline progress |
| `identify_funding_source__c` | Identify Funding Source % | Deal | Sales pipeline progress |
| `pricing_info_presented__c` | Pricing Info Presented % | Deal | Sales pipeline progress |
| `proposal_quote__c` | Proposal / Quote % | Deal | Sales pipeline progress |
| `start_conversation_phone_email__c` | Start conversation % | Deal | Sales pipeline progress |

---

## Category 5: Other Custom Fields — 54 fields

### Actively Useful

| Field Name | Label | Notes |
|------------|-------|-------|
| `expertise` | Academic Expertise | Institution role context |
| `role` | Role | Contact role at institution |
| `vip_group` | VIP Group | VIP tracking |
| `customers` | Customers | Customer segment |
| `email_list` | Email list | Segmentation |
| `leadstatus` | Status custom | Custom lead status |
| `leadsource` | Lead Source | Lead origin |
| `preferred_name` | Preferred name | Personalization |
| `pronoun_he_she_they_` | Pronoun (he/she/they) | Personalization |
| `pronoun_him_her_them_` | Pronoun (him/her/them) | Personalization |
| `pronoun_his_hers_theirs_` | Pronoun (his/hers/theirs) | Personalization |
| `name_pronunciation` | Name pronunciation | Personalization |
| `ai_experience` | AI Experience | Product interest tracking |
| `ai_interest` | AI Interest | Product interest tracking |

### Social Media (HubSpot Insights)

| Field Name | Label | Notes |
|------------|-------|-------|
| `twitterhandle` | Twitter Username | |
| `twitterbio` | Twitter Bio | |
| `twitterprofilephoto` | Twitter Profile Photo | |
| `linkedinbio` | LinkedIn Bio | |
| `linkedinconnections` | LinkedIn Connections | |
| `followercount` | Follower Count | |

### Zoom Integration

| Field Name | Label | Population |
|------------|-------|-----------|
| `zoom_webinar_attendance_average_duration` | Average Zoom webinar attendance duration | 152 |
| `zoom_webinar_attendance_count` | Total number of Zoom webinars attended | 152 |
| `zoom_webinar_joinlink` | Last registered Zoom webinar | 152 |
| `zoom_webinar_registration_count` | Total number of Zoom webinar registrations | 152 |

### Legacy/Review Needed

| Field Name | Label | Notes |
|------------|-------|-------|
| `hubspotscore` | HubSpot Score | Legacy lead scoring |
| `rating` | Rating | Unclear purpose |
| `position_url` | Position URL | Recruiting? |
| `submission_date` | Submission date | Form submission? |
| `salary_range` | Salary Range | Recruiting field |

---

## Deletion Candidates (Phase 2)

| Field | Population | Reason |
|-------|-----------|--------|
| `kloutscoregeneral` | 0 | Klout is defunct |
| `amount__c` | 0 | Empty SF legacy |
| `income_category__c` | 0 | Empty SF legacy |
| `system_url__c` | 0 | Empty + misplaced |
| `totalstudents__c` | 0 | Empty + misplaced |
| `imported_from_salesforce` | 0 | Empty |
| `digicon_2019__c` | 320 | Obsolete 2019 event |

## Fields Requiring Decision

| Field | Population | Decision Needed |
|-------|-----------|----------------|
| `currentlyinworkflow` | 4,004 | High population but "discontinued" — is anything reading this? |
| 9 sales pipeline % fields | varies | Delete or archive — Salesforce methodology no longer used |
| 10 recruiting fields | 101-182 | Keep or move to separate system? |

## Integration Spec Impact

Per the integration spec, new contact roles need to be added:
- Self-Pay Buyer
- Abandoned Cart
- Trial Signup
- Pilot Contact

These should be tracked via a contact property or HubSpot's native "Contact role" on deal associations. The existing `role` custom field may need to be reviewed against this.
