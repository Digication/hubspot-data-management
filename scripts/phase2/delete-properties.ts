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
  step3: {
    name: "step3",
    description:
      "Low-population SF legacy deletions (Reviews 1-remainder, 3, 6, 9)",
    filter: (f) =>
      f.action === "delete" &&
      ((f.review === 1 && f.approxRecords !== 0) ||
        f.review === 3 ||
        f.review === 6 ||
        f.review === 9),
    // Highest manifest expectation is 1,511 (features_enabled__c). 10,000
    // gives ~6.5x headroom — catches a field that's been silently
    // reactivated (suggesting our deletion decision is now wrong) without
    // being so strict that ordinary growth trips it.
    maxAllowedPopulation: 10000,
  },
  step4: {
    name: "step4",
    description:
      "Contact-object field cleanup (Reviews 4, 5, 8) — run AFTER candidate contacts are archived",
    filter: (f) =>
      f.action === "delete" &&
      (f.review === 4 || f.review === 5 || f.review === 8),
    // Highest manifest expectation is 807 (salesforcecontactid). 10,000
    // catches surprises but allows ordinary populations through.
    maxAllowedPopulation: 10000,
  },
  step5: {
    name: "step5",
    description:
      "Deal-level Salesforce legacy fields (Review 7: pipeline % + onboarding/adoption)",
    filter: (f) => f.action === "delete" && f.review === 7,
    // Highest manifest expectation is 271 (sales pipeline % fields).
    // 10,000 catches reactivation surprises.
    maxAllowedPopulation: 10000,
  },
  step6: {
    name: "step6",
    description:
      "Review 10: Zoom fields + other low-pop custom fields + 4 'archive' duplicates",
    // Includes both action=delete and action=archive — HubSpot's API
    // treats them identically (soft archive, recoverable). The action
    // distinction in the manifest reflects intent, not execution.
    // rating + submission_date will show as already-archived; they were
    // picked up by step1's zero-record filter.
    filter: (f) => f.review === 10,
    maxAllowedPopulation: 10000,
  },
};

type Status =
  | "archived"
  | "would_archive"
  | "skipped_missing"
  | "skipped_populated"
  | "skipped_not_archivable"
  | "skipped_in_use"
  | "error";

interface BlockingArtifact {
  type: string; // WORKFLOW, REPORT, etc.
  id: string;
}

/**
 * Parses HubSpot's CANNOT_DELETE_PROPERTY_IN_USE error body to extract
 * which workflows/reports/etc. are blocking the deletion.
 */
function parseInUseError(
  errBody: string,
): BlockingArtifact[] | null {
  try {
    const parsed = JSON.parse(errBody) as {
      subCategory?: string;
      errors?: Array<{
        subCategory?: string;
        context?: { parentDisplayType?: string[]; parentName?: string[] };
      }>;
    };
    if (
      parsed.subCategory !==
      "PropertyValidationError.CANNOT_DELETE_PROPERTY_IN_USE"
    ) {
      return null;
    }
    const artifacts: BlockingArtifact[] = [];
    for (const e of parsed.errors ?? []) {
      const type = e.context?.parentDisplayType?.[0] ?? "UNKNOWN";
      const id = e.context?.parentName?.[0] ?? "?";
      artifacts.push({ type, id });
    }
    return artifacts;
  } catch {
    return null;
  }
}

interface Result {
  field: string;
  object: string;
  status: Status;
  populationCount?: number;
  blockingArtifacts?: BlockingArtifact[];
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
    const errAny = err as { body?: string; message: string };

    // Detect HubSpot's "in use" error and route it to its own status —
    // the property is referenced by a workflow/report/etc. and HubSpot
    // refuses to delete until that's cleaned up.
    const blocking = errAny.body ? parseInUseError(errAny.body) : null;
    if (blocking) {
      return {
        field: target.name,
        object: target.object,
        status: "skipped_in_use",
        populationCount: count,
        blockingArtifacts: blocking,
      };
    }

    // Detect PROPERTY_INVALID — HubSpot rejecting archive of a property it
    // considers internally-managed (Zoom integration fields, certain SF
    // sync fields). The metadata pre-check above doesn't always catch
    // these because hubspotDefined isn't always set to true on them.
    if (errAny.body && errAny.body.includes("PROPERTY_INVALID")) {
      return {
        field: target.name,
        object: target.object,
        status: "skipped_not_archivable",
      };
    }

    return {
      field: target.name,
      object: target.object,
      status: "error",
      error: errAny.message,
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
    skipped_in_use: "⛔",
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
    case "skipped_in_use": {
      const refs = (r.blockingArtifacts ?? [])
        .map((a) => `${a.type} ${a.id}`)
        .join(", ");
      return `  ${icon.skipped_in_use} ${target}  blocked — in use by ${refs}`;
    }
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
    skipped_in_use: results.filter((r) => r.status === "skipped_in_use").length,
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
  console.log(`  in use (blocked):   ${counts.skipped_in_use}`);
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
