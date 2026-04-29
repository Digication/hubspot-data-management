/**
 * One-off recovery: delete the RFP pipeline after the search index catches
 * up to the bulk deal moves. Verifies emptiness with retry.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/delete-rfp-pipeline.ts            # dry-run
 *   pnpm tsx scripts/phase2/delete-rfp-pipeline.ts --apply    # delete
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";

import { deletePipeline, search } from "./lib/hubspot";
import { ensureDir, outputPaths } from "./lib/paths";

const RFP_PIPELINE_ID = "1832625";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function countDeals(pipelineId: string): Promise<number> {
  const res = await search("deals", {
    filterGroups: [
      { filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] },
    ],
    limit: 1,
  });
  return res.total;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const paths = outputPaths();
  ensureDir(paths.root);
  const logFile = join(paths.root, "step2-pipeline-cleanup.jsonl");
  const log = (event: string, data: object = {}) =>
    appendFileSync(
      logFile,
      JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + "\n",
    );

  console.log(`Mode: ${apply ? "EXECUTE (--apply)" : "DRY-RUN"}\n`);
  console.log("Polling RFP pipeline for index consistency...");

  // Poll up to 60 seconds, checking every 5s.
  const maxAttempts = 12;
  let count = -1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    count = await countDeals(RFP_PIPELINE_ID);
    console.log(`  attempt ${attempt}/${maxAttempts}: ${count} deals`);
    if (count === 0) break;
    await sleep(5000);
  }

  if (count !== 0) {
    console.error(`\n✗ RFP still shows ${count} deals after ${maxAttempts * 5}s. Aborting.`);
    log("rfp.delete.aborted", { reason: "index_lag_persisted", count });
    process.exit(2);
  }

  console.log("\n✓ RFP pipeline confirmed empty.");

  if (!apply) {
    console.log("→ would delete RFP pipeline (id=" + RFP_PIPELINE_ID + ")");
    return;
  }

  await deletePipeline("deals", RFP_PIPELINE_ID);
  console.log(`✓ deleted RFP pipeline (id=${RFP_PIPELINE_ID})`);
  log("pipeline.deleted", { pipelineId: RFP_PIPELINE_ID, label: "RFP pipeline" });
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
