/**
 * Dump the ~182 recruiting-candidate contacts before deletion.
 *
 * Filter: any contact where ANY candidate_* field OR `recruiter_email` is
 * populated. Output CSV contains full contact detail + a flag for each
 * candidate indicator field so we can see WHY the contact was picked up.
 *
 * Also runs a safety sanity-check: verifies none of these contacts have
 * associated deals or a customer lifecycle stage. If any do, they're
 * flagged in a separate CSV and the script exits non-zero. Jeff manually
 * reviews flagged records before any deletion.
 *
 * Read-only. Safe to run at any time.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/dump-candidate-contacts.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { CANDIDATE_CONTACT_PROPERTIES } from "./manifest";
import { toCsv } from "./lib/csv";
import { searchAll } from "./lib/hubspot";
import { AuditLogger } from "./lib/logger";
import { ensureDir, outputPaths } from "./lib/paths";

const CONTACT_CORE = [
  "firstname",
  "lastname",
  "email",
  "jobtitle",
  "company",
  "lifecyclestage",
  "hs_lead_status",
  "num_associated_deals",
  "createdate",
  "lastmodifieddate",
];

async function main(): Promise<void> {
  const paths = outputPaths();
  ensureDir(paths.recordDumps);

  const log = new AuditLogger(paths.executionLog, "dump-candidate-contacts");
  log.log("start", {});

  // Build the filter: OR across all candidate indicator properties.
  // HubSpot search supports up to 5 filterGroups (ORed together), with up to
  // 6 filters per group (ANDed). We have ~11 indicator properties, so split
  // into 3 filterGroups of up to 6 filters each.
  const props = [...CANDIDATE_CONTACT_PROPERTIES];
  const filterGroups: Array<{
    filters: Array<{ propertyName: string; operator: string }>;
  }> = [];
  for (let i = 0; i < props.length; i += 6) {
    filterGroups.push({
      filters: props.slice(i, i + 6).map((p) => ({
        propertyName: p,
        operator: "HAS_PROPERTY",
      })),
    });
  }

  const searchProps = [...CONTACT_CORE, ...props];
  const rows: Array<Record<string, unknown>> = [];
  const flagged: Array<Record<string, unknown>> = [];

  for await (const c of searchAll("contacts", {
    filterGroups,
    properties: searchProps,
    limit: 100,
  })) {
    const p = c.properties;

    // Build an indicator map so we know which candidate field triggered the match
    const indicators: Record<string, string> = {};
    for (const pn of CANDIDATE_CONTACT_PROPERTIES) {
      indicators[`has_${pn}`] = p[pn] ? "1" : "";
    }

    const row = {
      id: c.id,
      ...Object.fromEntries(CONTACT_CORE.map((k) => [k, p[k] ?? ""])),
      ...indicators,
      ...Object.fromEntries(
        CANDIDATE_CONTACT_PROPERTIES.map((k) => [k, p[k] ?? ""]),
      ),
    };

    // Safety flag: any contact with deals or a customer-ish lifecycle stage
    // should NOT be silently deleted. Surface them separately.
    const numDeals = Number(p.num_associated_deals ?? "0");
    const stage = (p.lifecyclestage ?? "").toLowerCase();
    const dangerous =
      numDeals > 0 || stage === "customer" || stage === "opportunity";

    if (dangerous) {
      flagged.push({
        ...row,
        _flag_reason:
          numDeals > 0 ? `has_${numDeals}_deals` : `lifecyclestage=${stage}`,
      });
    }
    rows.push(row);
  }

  const headers = [
    "id",
    ...CONTACT_CORE,
    ...CANDIDATE_CONTACT_PROPERTIES.map((p) => `has_${p}`),
    ...CANDIDATE_CONTACT_PROPERTIES,
  ];

  const file = join(paths.recordDumps, "candidate-contacts.csv");
  writeFileSync(file, toCsv(headers, rows), "utf8");
  log.log("candidates.dumped", { count: rows.length, file });

  if (flagged.length > 0) {
    const flagFile = join(paths.recordDumps, "candidate-contacts-FLAGGED.csv");
    writeFileSync(
      flagFile,
      toCsv([...headers, "_flag_reason"], flagged),
      "utf8",
    );
    log.log("candidates.flagged", {
      count: flagged.length,
      file: flagFile,
      message:
        "These contacts match the candidate filter BUT also have deals or a customer stage. Review before deletion.",
    });
    // eslint-disable-next-line no-console
    console.error(
      `\n⚠️  ${flagged.length} candidate contacts have deals or customer lifecycle stage.\n` +
        `    Review ${flagFile} before Phase 2 deletion.\n`,
    );
    process.exitCode = 2; // Non-zero: attention required
  }

  log.log("done", { total: rows.length, flagged: flagged.length });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
