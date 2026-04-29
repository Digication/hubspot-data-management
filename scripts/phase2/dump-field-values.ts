/**
 * Per-field value dump. For each field in the deletion manifest, query every
 * populated record and write (id, name, value) to a CSV at
 * backups/phase2-pre-execution/<date>/field-dumps/<object>/<field>.csv.
 *
 * These are the "if someone later asks what was in that field" records.
 *
 * Read-only. Can take a while (one search per field; many fields have a few
 * hundred records). Progress is logged.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/dump-field-values.ts            # dump all
 *   pnpm tsx scripts/phase2/dump-field-values.ts companies  # one object only
 *   pnpm tsx scripts/phase2/dump-field-values.ts --only <name>  # one field only
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  FIELD_TARGETS,
  type FieldTarget,
  type HubSpotObjectType,
} from "./manifest";
import { toCsv } from "./lib/csv";
import { searchAll } from "./lib/hubspot";
import { AuditLogger } from "./lib/logger";
import { ensureDir, outputPaths } from "./lib/paths";

// Name property per object — what we use for the "name" column in the CSV
const NAME_PROP: Record<HubSpotObjectType, string[]> = {
  contacts: ["firstname", "lastname", "email"],
  companies: ["name", "domain"],
  deals: ["dealname"],
};

function parseArgs(): { object?: HubSpotObjectType; only?: string } {
  const args = process.argv.slice(2);
  const out: { object?: HubSpotObjectType; only?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--only" && args[i + 1]) {
      out.only = args[++i];
    } else if (a === "contacts" || a === "companies" || a === "deals") {
      out.object = a;
    }
  }
  return out;
}

async function dumpOne(
  target: FieldTarget,
  outDir: string,
  log: AuditLogger,
): Promise<void> {
  const nameProps = NAME_PROP[target.object];
  const props = [target.name, ...nameProps];

  const rows: Array<Record<string, unknown>> = [];
  for await (const rec of searchAll(target.object, {
    filterGroups: [
      { filters: [{ propertyName: target.name, operator: "HAS_PROPERTY" }] },
    ],
    properties: props,
    limit: 200,
  })) {
    const p = rec.properties;
    rows.push({
      id: rec.id,
      name: nameProps.map((k) => p[k]).filter(Boolean).join(" ").trim(),
      value: p[target.name],
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    });
  }

  const csvDir = join(outDir, target.object);
  ensureDir(csvDir);
  // Two fields can share a name across objects (e.g. amount__c) — but we're
  // already scoping by object subfolder, so the field name alone is unique.
  const file = join(csvDir, `${target.name}.csv`);
  writeFileSync(
    file,
    toCsv(["id", "name", "value", "createdAt", "updatedAt"], rows),
    "utf8",
  );

  log.log("field.dumped", {
    object: target.object,
    field: target.name,
    action: target.action,
    review: target.review,
    records: rows.length,
    file,
  });
}

async function main(): Promise<void> {
  const args = parseArgs();
  const paths = outputPaths();
  ensureDir(paths.fieldDumps);

  const log = new AuditLogger(paths.executionLog, "dump-field-values");
  log.log("start", { filter: args, outputDir: paths.fieldDumps });

  let targets = FIELD_TARGETS;
  if (args.object) targets = targets.filter((t) => t.object === args.object);
  if (args.only) targets = targets.filter((t) => t.name === args.only);

  log.log("targets.selected", { count: targets.length });

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    log.log("field.start", {
      progress: `${i + 1}/${targets.length}`,
      object: t.object,
      field: t.name,
    });
    try {
      await dumpOne(t, paths.fieldDumps, log);
    } catch (err) {
      log.log("field.error", {
        object: t.object,
        field: t.name,
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue — one bad field shouldn't abort the whole dump
    }
  }

  log.log("done", { dumped: targets.length });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
