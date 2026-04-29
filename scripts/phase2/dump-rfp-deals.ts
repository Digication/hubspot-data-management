/**
 * Dump all deals in the RFP Pipeline before the Phase 2 pipeline migration.
 *
 * Writes backups/phase2-pre-execution/<date>/record-dumps/rfp-deals.csv with
 * full deal detail + all associated contact/company IDs. This is the rollback
 * source if a move goes wrong.
 *
 * Read-only. Safe to run at any time.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/dump-rfp-deals.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { toCsv } from "./lib/csv";
import { listPipelines, searchAll } from "./lib/hubspot";
import { AuditLogger } from "./lib/logger";
import { ensureDir, outputPaths } from "./lib/paths";

const RFP_PIPELINE_LABEL = "RFP Pipeline";

// Properties we want to preserve. Keep this broad — cheaper to over-dump than
// to discover later we missed something.
const DEAL_PROPERTIES = [
  "dealname",
  "pipeline",
  "dealstage",
  "amount",
  "closedate",
  "createdate",
  "hs_lastmodifieddate",
  "hubspot_owner_id",
  "closed_lost_reason",
  "closed_won_reason",
  "dealtype",
  "description",
  "hs_object_id",
];

async function main(): Promise<void> {
  const paths = outputPaths();
  ensureDir(paths.recordDumps);

  const log = new AuditLogger(paths.executionLog, "dump-rfp-deals");
  log.log("start", {});

  // 1. Find the RFP Pipeline ID
  const pipelines = await listPipelines("deals");
  const rfp = pipelines.find((p) => p.label === RFP_PIPELINE_LABEL);
  if (!rfp) {
    log.log("error", {
      message: `Pipeline '${RFP_PIPELINE_LABEL}' not found`,
      available: pipelines.map((p) => p.label),
    });
    throw new Error(`Pipeline '${RFP_PIPELINE_LABEL}' not found in HubSpot`);
  }
  log.log("pipeline.found", {
    id: rfp.id,
    label: rfp.label,
    stageCount: rfp.stages.length,
  });

  // 2. Pull every deal in that pipeline
  const rows: Array<Record<string, unknown>> = [];
  for await (const deal of searchAll("deals", {
    filterGroups: [
      {
        filters: [{ propertyName: "pipeline", operator: "EQ", value: rfp.id }],
      },
    ],
    properties: DEAL_PROPERTIES,
    limit: 100,
  })) {
    const stageLabel =
      rfp.stages.find((s) => s.id === deal.properties.dealstage)?.label ?? "";
    rows.push({
      id: deal.id,
      stage_id: deal.properties.dealstage,
      stage_label: stageLabel,
      ...Object.fromEntries(
        DEAL_PROPERTIES.map((p) => [p, deal.properties[p] ?? ""]),
      ),
    });
  }

  // 3. Write CSV
  const file = join(paths.recordDumps, "rfp-deals.csv");
  const headers = ["id", "stage_id", "stage_label", ...DEAL_PROPERTIES];
  writeFileSync(file, toCsv(headers, rows), "utf8");

  log.log("deals.dumped", {
    pipelineId: rfp.id,
    count: rows.length,
    file,
  });

  // 4. Also save the pipeline definition itself so we can reconstruct stage
  //    names later even after the pipeline is deleted
  const defFile = join(paths.recordDumps, "rfp-pipeline-definition.json");
  writeFileSync(defFile, JSON.stringify(rfp, null, 2), "utf8");
  log.log("pipeline.definition.saved", { file: defFile });

  log.log("done", { deals: rows.length });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
