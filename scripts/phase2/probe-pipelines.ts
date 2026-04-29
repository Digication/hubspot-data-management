/**
 * Step 2 — Pipeline probe (read-only).
 *
 * Surfaces everything we need to plan pipeline cleanup:
 *   - All deal pipelines and their stages (with IDs and labels)
 *   - Deal counts per pipeline (sanity-check the manifest assumptions)
 *   - For RFP Pipeline: list of every deal with its current stage
 *   - For Renewal Pipeline: confirms which stages are empty
 *
 * Read-only. Makes no changes.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/probe-pipelines.ts
 */

import { listPipelines, search, searchAll, type HubSpotPipeline } from "./lib/hubspot";

// HubSpot search API has a per-second rate limit. 250ms between calls keeps
// us comfortably under 4 req/sec.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface DealRow {
  id: string;
  name: string;
  stage: string;
  amount: string;
  closedate: string;
}

async function listDealsInPipeline(
  pipelineId: string,
  pipeline: HubSpotPipeline,
): Promise<DealRow[]> {
  const stageLabel = (id: string) =>
    pipeline.stages.find((s) => s.id === id)?.label ?? id;

  const rows: DealRow[] = [];
  for await (const d of searchAll("deals", {
    filterGroups: [
      { filters: [{ propertyName: "pipeline", operator: "EQ", value: pipelineId }] },
    ],
    properties: ["dealname", "dealstage", "amount", "closedate"],
    limit: 100,
  })) {
    rows.push({
      id: d.id,
      name: d.properties.dealname ?? "",
      stage: stageLabel(d.properties.dealstage ?? ""),
      amount: d.properties.amount ?? "",
      closedate: d.properties.closedate ?? "",
    });
  }
  return rows;
}

async function countDealsByStage(
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

async function main(): Promise<void> {
  console.log("Listing all deal pipelines...\n");
  const pipelines = await listPipelines("deals");

  // Quick overview: every pipeline with its stage count and total deals.
  for (const p of pipelines) {
    const total = await search("deals", {
      filterGroups: [{ filters: [{ propertyName: "pipeline", operator: "EQ", value: p.id }] }],
      limit: 1,
    });
    console.log(
      `  ${p.label.padEnd(35)} (id=${p.id})  — ${p.stages.length} stages, ${total.total} deals`,
    );
    await sleep(250);
  }

  // Deeper view: target pipelines for Step 2.
  const findPipeline = (label: string) =>
    pipelines.find((p) => p.label.toLowerCase() === label.toLowerCase());

  const targets = [
    "Hiring - Frontend Engineering",
    "RFP Pipeline",
    "Renewal Pipeline",
    "Prospects Pipeline",
  ];

  for (const label of targets) {
    const p = findPipeline(label);
    console.log(`\n--- ${label} ---`);
    if (!p) {
      console.log("  NOT FOUND in HubSpot — manifest may be out of date.");
      continue;
    }
    console.log(`  id: ${p.id}`);
    console.log(`  stages:`);
    for (const s of p.stages) {
      const n = await countDealsByStage(p.id, s.id);
      console.log(`    • ${s.label.padEnd(25)} (id=${s.id}) — ${n} deals`);
      await sleep(250);
    }
  }

  // RFP deals — full detail since we'll be moving them individually.
  const rfp = findPipeline("RFP Pipeline");
  if (rfp) {
    console.log("\n--- RFP Pipeline deals (full list, 11 expected) ---");
    const deals = await listDealsInPipeline(rfp.id, rfp);
    console.log(`  Total: ${deals.length}\n`);
    for (const d of deals) {
      console.log(
        `  ${d.id.padEnd(12)}  [${d.stage.padEnd(20)}]  ${d.name.padEnd(45)}  $${d.amount || "-"}  closed=${d.closedate || "-"}`,
      );
    }
  }
}

main().catch((err: Error) => {
  console.error("\n✗ Probe failed:");
  console.error(err.message);
  process.exit(1);
});
