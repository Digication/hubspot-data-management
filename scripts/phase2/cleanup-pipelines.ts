/**
 * Phase 2 Step 2 — Pipeline cleanup.
 *
 * Four operations, each with a re-verification step before mutating:
 *   1. Move 11 RFP Pipeline deals into Prospects Pipeline:
 *        - "Closed won, send to prospects pipeline" → Prospects "Invoice Paid"
 *        - everything else → Prospects "Closed Lost"
 *   2. Delete the empty "Hiring - Frontend Engineering" pipeline.
 *   3. Delete the now-empty RFP Pipeline.
 *   4. Remove the empty "Quota" stage from the Renewal Pipeline.
 *
 * Defaults to dry-run. --apply makes it real.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/cleanup-pipelines.ts            # dry-run all 4
 *   pnpm tsx scripts/phase2/cleanup-pipelines.ts --apply    # execute all 4
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";

import {
  deletePipeline,
  deletePipelineStage,
  listPipelines,
  search,
  searchAll,
  updateObject,
  type HubSpotPipeline,
} from "./lib/hubspot";
import { ensureDir, outputPaths } from "./lib/paths";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pipeline & stage IDs verified by probe-pipelines.ts on 2026-04-29.
const RFP_PIPELINE_ID = "1832625";
const RFP_PIPELINE_LABEL = "RFP pipeline";
const HIRING_PIPELINE_ID = "4970497";
const HIRING_PIPELINE_LABEL = "Hiring - Frontend Engineering";
const RENEWAL_PIPELINE_ID = "c7452b5c-8baa-48ec-8c4d-0689ac66dac5";
const RENEWAL_QUOTA_STAGE_ID = "b53312d1-1366-4535-8b97-4d13f03d1c98";
const PROSPECTS_PIPELINE_ID = "default";
const PROSPECTS_INVOICE_PAID_STAGE = "closedwon";
const PROSPECTS_CLOSED_LOST_STAGE = "closedlost";

// Mapping rule: the one "won" RFP deal (University of Denver) goes to
// Prospects Invoice Paid; every other RFP deal goes to Prospects Closed Lost.
const RFP_WON_STAGE_ID = "1832631"; // "Closed won, send to prospects pipeline"

interface AuditLogger {
  log(event: string, data?: object): void;
}

function makeLogger(): AuditLogger {
  const paths = outputPaths();
  ensureDir(paths.root);
  const file = join(paths.root, "step2-pipeline-cleanup.jsonl");
  return {
    log(event, data = {}) {
      appendFileSync(
        file,
        JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + "\n",
      );
    },
  };
}

async function fetchRfpDeals(): Promise<
  Array<{ id: string; name: string; currentStage: string }>
> {
  const deals: Array<{ id: string; name: string; currentStage: string }> = [];
  for await (const d of searchAll("deals", {
    filterGroups: [
      {
        filters: [
          { propertyName: "pipeline", operator: "EQ", value: RFP_PIPELINE_ID },
        ],
      },
    ],
    properties: ["dealname", "dealstage"],
    limit: 100,
  })) {
    deals.push({
      id: d.id,
      name: d.properties.dealname ?? "(unnamed)",
      currentStage: d.properties.dealstage ?? "",
    });
  }
  return deals;
}

function destinationStageFor(rfpStageId: string): string {
  return rfpStageId === RFP_WON_STAGE_ID
    ? PROSPECTS_INVOICE_PAID_STAGE
    : PROSPECTS_CLOSED_LOST_STAGE;
}

async function step1MoveRfpDeals(
  apply: boolean,
  log: AuditLogger,
): Promise<{ moved: number; errors: number }> {
  console.log("\n━━━ 1. Move RFP deals to Prospects Pipeline ━━━\n");
  const deals = await fetchRfpDeals();
  console.log(`Found ${deals.length} deals in RFP Pipeline (expected 11).`);
  if (deals.length !== 11) {
    console.error(
      `⚠ Deal count drift: expected 11, got ${deals.length}. Aborting move.`,
    );
    return { moved: 0, errors: 1 };
  }

  let moved = 0;
  let errors = 0;
  for (const d of deals) {
    const destStage = destinationStageFor(d.currentStage);
    const destLabel =
      destStage === PROSPECTS_INVOICE_PAID_STAGE ? "Invoice Paid" : "Closed Lost";

    if (!apply) {
      console.log(
        `  → ${d.id.padEnd(12)} ${d.name.padEnd(45)} → Prospects "${destLabel}"`,
      );
      continue;
    }

    try {
      await updateObject("deals", d.id, {
        pipeline: PROSPECTS_PIPELINE_ID,
        dealstage: destStage,
      });
      console.log(`  ✓ ${d.id.padEnd(12)} ${d.name.padEnd(45)} → "${destLabel}"`);
      log.log("rfp.deal.moved", {
        id: d.id,
        name: d.name,
        from: { pipeline: RFP_PIPELINE_ID, stage: d.currentStage },
        to: { pipeline: PROSPECTS_PIPELINE_ID, stage: destStage },
      });
      moved++;
      await sleep(250);
    } catch (err) {
      console.error(`  ✗ ${d.id} ${d.name} — ${(err as Error).message}`);
      log.log("rfp.deal.error", { id: d.id, error: (err as Error).message });
      errors++;
    }
  }
  return { moved, errors };
}

/**
 * Polls until the pipeline reports 0 deals or maxAttempts is reached.
 *
 * HubSpot's search index lags PATCH writes by 10–30 seconds. After bulk
 * deal moves the verification needs to wait or the count looks stale.
 */
async function verifyPipelineEmpty(
  pipelineId: string,
  { maxAttempts = 12, intervalMs = 5000 } = {},
): Promise<number> {
  let count = -1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await search("deals", {
      filterGroups: [
        { filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] },
      ],
      limit: 1,
    });
    count = res.total;
    if (count === 0 || maxAttempts === 1) return count;
    await sleep(intervalMs);
  }
  return count;
}

async function verifyStageEmpty(
  pipelineId: string,
  stageId: string,
): Promise<number> {
  const res = await search("deals", {
    filterGroups: [
      {
        filters: [
          { propertyName: "pipeline", operator: "EQ", value: pipelineId },
          { propertyName: "dealstage", operator: "EQ", value: stageId },
        ],
      },
    ],
    limit: 1,
  });
  return res.total;
}

async function step2DeletePipeline(
  pipelineId: string,
  label: string,
  apply: boolean,
  log: AuditLogger,
): Promise<{ deleted: boolean; reason?: string }> {
  console.log(`\n━━━ Delete "${label}" pipeline ━━━\n`);
  // Only poll for index consistency in apply mode (after we just made changes).
  // In dry-run, fail fast on a non-zero count.
  const count = await verifyPipelineEmpty(pipelineId, {
    maxAttempts: apply ? 12 : 1,
  });
  console.log(`  Deal count in pipeline: ${count}`);
  if (count !== 0) {
    const reason = `Pipeline still has ${count} deals — refusing to delete`;
    console.error(`  ⚠ ${reason}`);
    log.log("pipeline.delete.skipped", { pipelineId, label, reason, count });
    return { deleted: false, reason };
  }

  if (!apply) {
    console.log(`  → would delete pipeline "${label}" (id=${pipelineId})`);
    return { deleted: false };
  }

  try {
    await deletePipeline("deals", pipelineId);
    console.log(`  ✓ deleted pipeline "${label}"`);
    log.log("pipeline.deleted", { pipelineId, label });
    return { deleted: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`  ✗ delete failed — ${msg}`);
    log.log("pipeline.delete.error", { pipelineId, label, error: msg });
    return { deleted: false, reason: msg };
  }
}

async function step3RemoveQuotaStage(
  apply: boolean,
  log: AuditLogger,
): Promise<{ removed: boolean; reason?: string }> {
  console.log(`\n━━━ Remove "Quota" stage from Renewal Pipeline ━━━\n`);
  const count = await verifyStageEmpty(RENEWAL_PIPELINE_ID, RENEWAL_QUOTA_STAGE_ID);
  console.log(`  Deal count in Quota stage: ${count}`);
  if (count !== 0) {
    const reason = `Quota stage has ${count} deals — refusing to remove`;
    console.error(`  ⚠ ${reason}`);
    return { removed: false, reason };
  }

  if (!apply) {
    console.log(`  → would remove "Quota" stage (id=${RENEWAL_QUOTA_STAGE_ID})`);
    return { removed: false };
  }

  try {
    await deletePipelineStage(
      "deals",
      RENEWAL_PIPELINE_ID,
      RENEWAL_QUOTA_STAGE_ID,
    );
    console.log(`  ✓ removed "Quota" stage`);
    log.log("stage.removed", {
      pipelineId: RENEWAL_PIPELINE_ID,
      stageId: RENEWAL_QUOTA_STAGE_ID,
    });
    return { removed: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`  ✗ stage removal failed — ${msg}`);
    log.log("stage.remove.error", {
      pipelineId: RENEWAL_PIPELINE_ID,
      stageId: RENEWAL_QUOTA_STAGE_ID,
      error: msg,
    });
    return { removed: false, reason: msg };
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const log = makeLogger();

  console.log("");
  console.log(`Mode:  ${apply ? "EXECUTE (--apply)" : "DRY-RUN"}`);
  console.log("");
  log.log("run.start", { apply });

  // Phase 1: move 11 RFP deals
  const moveResult = await step1MoveRfpDeals(apply, log);
  if (apply && moveResult.errors > 0) {
    console.error(
      "\nDeal moves had errors. Aborting subsequent steps to avoid leaving things half-done.",
    );
    process.exit(2);
  }

  // Phase 2: delete Hiring - Frontend Engineering
  await step2DeletePipeline(HIRING_PIPELINE_ID, HIRING_PIPELINE_LABEL, apply, log);

  // Phase 3: delete RFP Pipeline (only after the deals have moved off it)
  await step2DeletePipeline(RFP_PIPELINE_ID, RFP_PIPELINE_LABEL, apply, log);

  // Phase 4: remove Quota stage from Renewal Pipeline
  await step3RemoveQuotaStage(apply, log);

  console.log("");
  console.log(apply ? "All Step 2 phases attempted." : "Dry-run complete.");
  console.log(`Audit log: ${join(outputPaths().root, "step2-pipeline-cleanup.jsonl")}`);
  log.log("run.end", { apply });
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
