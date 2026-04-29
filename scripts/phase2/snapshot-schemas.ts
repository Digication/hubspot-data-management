/**
 * Re-snapshot current property schemas for contacts, companies, and deals.
 * Writes each to backups/phase2-pre-execution/<date>/schemas/<object>.json.
 *
 * Run this on execution day so the schema baseline reflects whatever state
 * HubSpot was actually in at execution time (new fields, label changes,
 * archivals, etc. might have happened since April 10).
 *
 * Read-only. Safe to run at any time.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/snapshot-schemas.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { listProperties, listPipelines } from "./lib/hubspot";
import { AuditLogger } from "./lib/logger";
import { ensureDir, outputPaths } from "./lib/paths";

const OBJECTS = ["contacts", "companies", "deals"] as const;

async function main(): Promise<void> {
  const paths = outputPaths();
  ensureDir(paths.schemas);

  const log = new AuditLogger(paths.executionLog, "snapshot-schemas");
  log.log("start", { outputDir: paths.schemas });

  for (const obj of OBJECTS) {
    const props = await listProperties(obj);
    const file = join(paths.schemas, `${obj}-properties.json`);
    writeFileSync(file, JSON.stringify(props, null, 2), "utf8");
    log.log("properties.snapshot", {
      object: obj,
      count: props.length,
      file,
    });
  }

  // Pipelines snapshot (deals only — it's the one we're mutating)
  const pipelines = await listPipelines("deals");
  const pipelineFile = join(paths.schemas, "deals-pipelines.json");
  writeFileSync(pipelineFile, JSON.stringify(pipelines, null, 2), "utf8");
  log.log("pipelines.snapshot", {
    object: "deals",
    count: pipelines.length,
    file: pipelineFile,
  });

  log.log("done", {});
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
