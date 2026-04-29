/**
 * Phase 2 — Property archival script.
 *
 * Reads deletion targets from manifest.ts, runs safety checks, and
 * archives them via HubSpot's API. Defaults to dry-run.
 *
 * HubSpot "delete" = soft archive. Anything archived here is recoverable
 * from Settings → Properties → Archived for ~90 days.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/delete-properties.ts step1            # dry-run
 *   pnpm tsx scripts/phase2/delete-properties.ts step1 --apply    # actually archive
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";

import { FIELD_TARGETS, FieldTarget } from "./manifest";
import {
  archiveProperty,
  countWithProperty,
  getProperty,
} from "./lib/hubspot";
import { ensureDir, outputPaths } from "./lib/paths";

interface StepDef {
  name: string;
  description: string;
  filter: (f: FieldTarget) => boolean;
  /** Pre-deletion population check: max records allowed to still delete */
  maxAllowedPopulation: number;
}

const STEPS: Record<string, StepDef> = {
  step1: {
    name: "step1",
    description: "Zero-risk deletions (fields with 0 records)",
    filter: (f) => f.action === "delete" && f.approxRecords === 0,
    maxAllowedPopulation: 0,
  },
};

type Status =
  | "archived"
  | "would_archive"
  | "skipped_missing"
  | "skipped_populated"
  | "skipped_not_archivable"
  | "error";

interface Result {
  field: string;
  object: string;
  status: Status;
  populationCount?: number;
  error?: string;
}

async function processField(
  target: FieldTarget,
  step: StepDef,
  apply: boolean,
): Promise<Result> {
  // 1. Verify property still exists in HubSpot.
  const prop = await getProperty(target.object, target.name);
  if (!prop) {
    return {
      field: target.name,
      object: target.object,
      status: "skipped_missing",
    };
  }

  // 2. Detect HubSpot-defined properties that the API refuses to archive.
  // Catches things like googleplus_page, facebookfans, kloutscoregeneral —
  // legacy social/integration fields HubSpot still ships and won't let go of.
  // Note: kloutscoregeneral reports `archivable: true` despite being unarchivable,
  // so we also check `hubspotDefined === true` as a more reliable signal.
  if (
    prop.modificationMetadata?.archivable === false ||
    prop.hubspotDefined === true
  ) {
    return {
      field: target.name,
      object: target.object,
      status: "skipped_not_archivable",
    };
  }

  // 3. Population safety check — guards against the manifest going stale.
  const count = await countWithProperty(target.object, target.name);
  if (count > step.maxAllowedPopulation) {
    return {
      field: target.name,
      object: target.object,
      status: "skipped_populated",
      populationCount: count,
    };
  }

  // 4. Dry-run vs apply.
  if (!apply) {
    return {
      field: target.name,
      object: target.object,
      status: "would_archive",
      populationCount: count,
    };
  }

  try {
    await archiveProperty(target.object, target.name);
    return {
      field: target.name,
      object: target.object,
      status: "archived",
      populationCount: count,
    };
  } catch (err) {
    return {
      field: target.name,
      object: target.object,
      status: "error",
      error: (err as Error).message,
    };
  }
}

function formatResult(r: Result): string {
  const icon: Record<Status, string> = {
    archived: "✓",
    would_archive: "→",
    skipped_missing: "·",
    skipped_populated: "⚠",
    skipped_not_archivable: "🔒",
    error: "✗",
  };
  const target = `${r.object.padEnd(10)} ${r.field.padEnd(40)}`;
  switch (r.status) {
    case "archived":
      return `  ${icon.archived} ${target}  archived (was ${r.populationCount} records)`;
    case "would_archive":
      return `  ${icon.would_archive} ${target}  would archive — ${r.populationCount} records`;
    case "skipped_missing":
      return `  ${icon.skipped_missing} ${target}  not found (already archived?)`;
    case "skipped_populated":
      return `  ${icon.skipped_populated} ${target}  STOPPED — ${r.populationCount} records (expected 0)`;
    case "skipped_not_archivable":
      return `  ${icon.skipped_not_archivable} ${target}  HubSpot-defined, not archivable — skipping`;
    case "error":
      return `  ${icon.error} ${target}  ERROR — ${r.error}`;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const stepName = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");

  if (!stepName || !STEPS[stepName]) {
    console.error("Usage: tsx delete-properties.ts <step> [--apply]");
    console.error(`Steps available: ${Object.keys(STEPS).join(", ")}`);
    process.exit(1);
  }

  const step = STEPS[stepName];
  const targets = FIELD_TARGETS.filter(step.filter);

  console.log("");
  console.log(`Mode:        ${apply ? "EXECUTE (--apply)" : "DRY-RUN"}`);
  console.log(`Step:        ${step.name} — ${step.description}`);
  console.log(`Targets:     ${targets.length} fields`);
  console.log(`Pop check:   must have ≤ ${step.maxAllowedPopulation} records to proceed`);
  console.log("");

  const paths = outputPaths();
  ensureDir(paths.root);
  const logFile = join(paths.root, "deletions.jsonl");
  const logEntry = (event: object) =>
    appendFileSync(
      logFile,
      JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n",
    );

  logEntry({
    event: "run.start",
    step: step.name,
    apply,
    count: targets.length,
  });

  const results: Result[] = [];
  for (const target of targets) {
    const r = await processField(target, step, apply);
    console.log(formatResult(r));
    logEntry({ event: "field.processed", ...r });
    results.push(r);
  }

  const counts = {
    archived: results.filter((r) => r.status === "archived").length,
    would_archive: results.filter((r) => r.status === "would_archive").length,
    skipped_missing: results.filter((r) => r.status === "skipped_missing").length,
    skipped_populated: results.filter((r) => r.status === "skipped_populated").length,
    skipped_not_archivable: results.filter((r) => r.status === "skipped_not_archivable").length,
    error: results.filter((r) => r.status === "error").length,
  };

  console.log("");
  console.log("Summary:");
  if (apply) {
    console.log(`  archived:           ${counts.archived}`);
  } else {
    console.log(`  would archive:      ${counts.would_archive}`);
  }
  console.log(`  already missing:    ${counts.skipped_missing}`);
  console.log(`  blocked (pop > 0):  ${counts.skipped_populated}`);
  console.log(`  not archivable:     ${counts.skipped_not_archivable}`);
  console.log(`  errors:             ${counts.error}`);
  console.log("");
  console.log(`Audit log: ${logFile}`);

  logEntry({ event: "run.end", ...counts });

  if (counts.skipped_populated > 0 || counts.error > 0) {
    process.exit(2); // Attention required.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
