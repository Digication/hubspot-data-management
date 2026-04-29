# Phase 2 — CRM Cleanup Scripts

Read-only backup scripts that run BEFORE any deletion. Each pulls data from
HubSpot and writes it to `backups/phase2-pre-execution/<today>/` (gitignored).

## What's in here

| File | Purpose |
|------|---------|
| `manifest.ts` | Typed source of truth for all 109 deletions + 4 archives + pipeline changes, derived from `docs/inventory/review-decisions.md` |
| `snapshot-schemas.ts` | Re-pulls contact/company/deal property schemas + deal pipeline definitions |
| `dump-field-values.ts` | For each field in the manifest, exports every populated record to a per-field CSV |
| `dump-rfp-deals.ts` | Exports all 11 RFP Pipeline deals with stage labels and properties, before they get moved |
| `dump-candidate-contacts.ts` | Exports the ~182 recruiting-candidate contacts, with a safety check for any that have deals or customer lifecycle stage |
| `lib/` | Shared HubSpot client, CSV writer, output paths, audit logger |

**None of these scripts delete or modify anything in HubSpot.** They only read.

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create a HubSpot private app and get a read-only token
#    See .env.example for step-by-step instructions.
cp .env.example .env
# Edit .env and paste your token

# 3. Verify it works (pulls fresh schemas in ~5 seconds)
pnpm phase2:snapshot-schemas
```

## Running the full backup

Execute all four scripts in order:

```bash
pnpm phase2:backup-all
```

This takes ~10-30 minutes depending on HubSpot API responsiveness. Progress
streams to the console and to `backups/phase2-pre-execution/<date>/execution-log.jsonl`.

## Running individual scripts

```bash
pnpm phase2:snapshot-schemas      # re-snapshot current HubSpot schemas
pnpm phase2:dump-rfp              # dump 11 RFP Pipeline deals
pnpm phase2:dump-candidates       # dump ~182 candidate contacts (with safety check)
pnpm phase2:dump-fields           # per-field value CSVs (the long one)

# dump-field-values variants
pnpm tsx scripts/phase2/dump-field-values.ts companies       # one object only
pnpm tsx scripts/phase2/dump-field-values.ts --only amount__c   # one field only
```

## Output layout

```
backups/phase2-pre-execution/2026-04-21/     (gitignored)
├── execution-log.jsonl                       # chronological audit log
├── schemas/
│   ├── contacts-properties.json
│   ├── companies-properties.json
│   ├── deals-properties.json
│   └── deals-pipelines.json
├── field-dumps/
│   ├── contacts/
│   │   ├── candidate_current_company.csv
│   │   ├── kloutscoregeneral.csv
│   │   └── ...
│   ├── companies/
│   │   └── ...
│   └── deals/
│       └── ...
└── record-dumps/
    ├── rfp-deals.csv
    ├── rfp-pipeline-definition.json
    ├── candidate-contacts.csv
    └── candidate-contacts-FLAGGED.csv     # only if dangerous matches found
```

## Safety notes

- **Read-only scope.** The token instructions in `.env.example` only request
  read scopes. These scripts cannot delete or modify HubSpot data even if
  you wanted them to.
- **Non-zero exit code = attention required.** If `dump-candidate-contacts`
  finds contacts that match the candidate filter but also have deals or a
  customer lifecycle stage, it writes them to `candidate-contacts-FLAGGED.csv`
  and exits with code 2. Review those records manually before any deletion.
- **Idempotent.** Re-running a script overwrites the same-day output files.
  If you need to preserve a prior run, rename the folder first.
- **Rate limits.** HubSpot enforces ~100 requests/10 seconds on most endpoints.
  The scripts don't explicitly throttle — if you hit a 429, rerun. Search
  paginates with 100-200 record pages so the total request count is low.

## After Phase 2 completes

Delete the HubSpot private app and remove the token from `.env`. These
scripts should not be left with live credentials after their one-time use.
