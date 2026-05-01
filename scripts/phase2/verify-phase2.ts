/**
 * Phase 2 Step 8 — Post-execution verification.
 *
 * Pulls the current property schemas from HubSpot and compares against
 * the manifest to verify that exactly the fields we intended to remove
 * are gone, and the HubSpot-defined ones we couldn't archive are still
 * present.
 *
 * Also writes a fresh schema snapshot to backups/schemas/<today>/ for
 * historical record.
 *
 * Read-only. Makes no changes.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/verify-phase2.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  FIELD_TARGETS,
  HUBSPOT_DEFINED_NOT_ARCHIVABLE,
  type FieldTarget,
} from "./manifest";
import { listProperties } from "./lib/hubspot";
import { repoRoot, todayStamp } from "./lib/paths";

const OBJECTS = ["contacts", "companies", "deals"] as const;
type ObjectType = (typeof OBJECTS)[number];

interface Mismatch {
  field: string;
  object: string;
  expected: "absent" | "present";
  actual: "absent" | "present";
}

async function main(): Promise<void> {
  console.log("Phase 2 verification — pulling current schemas...\n");

  // Pull current active properties for each object.
  const currentByObject: Record<ObjectType, Set<string>> = {
    contacts: new Set(),
    companies: new Set(),
    deals: new Set(),
  };
  const fullSnapshot: Record<ObjectType, unknown[]> = {
    contacts: [],
    companies: [],
    deals: [],
  };

  for (const obj of OBJECTS) {
    const props = await listProperties(obj);
    fullSnapshot[obj] = props;
    for (const p of props) currentByObject[obj].add(p.name);
    console.log(`  ${obj.padEnd(10)} → ${props.length} active properties`);
  }

  // Save fresh schema snapshot for the historical record.
  const today = todayStamp();
  const snapshotDir = join(repoRoot(), "backups", "schemas", today);
  mkdirSync(snapshotDir, { recursive: true });
  for (const obj of OBJECTS) {
    writeFileSync(
      join(snapshotDir, `${obj}-properties.json`),
      JSON.stringify(fullSnapshot[obj], null, 2),
      "utf8",
    );
  }
  console.log(`\nSchema snapshot saved → backups/schemas/${today}/`);

  // Verify: every FIELD_TARGETS entry should be ABSENT from current active.
  const mismatches: Mismatch[] = [];
  const expectedAbsent: FieldTarget[] = FIELD_TARGETS;
  for (const t of expectedAbsent) {
    if (!OBJECTS.includes(t.object as ObjectType)) continue;
    const present = currentByObject[t.object as ObjectType].has(t.name);
    if (present) {
      mismatches.push({
        field: t.name,
        object: t.object,
        expected: "absent",
        actual: "present",
      });
    }
  }

  // Verify: every HUBSPOT_DEFINED_NOT_ARCHIVABLE entry should be PRESENT
  // in current active (since we couldn't archive them).
  const notArchivable = HUBSPOT_DEFINED_NOT_ARCHIVABLE;
  for (const t of notArchivable) {
    if (!OBJECTS.includes(t.object as ObjectType)) continue;
    const present = currentByObject[t.object as ObjectType].has(t.name);
    if (!present) {
      mismatches.push({
        field: t.name,
        object: t.object,
        expected: "present",
        actual: "absent",
      });
    }
  }

  console.log("\n--- Verification ---");
  console.log(`FIELD_TARGETS expected absent:           ${expectedAbsent.length}`);
  console.log(`HUBSPOT_DEFINED expected present:        ${notArchivable.length}`);

  if (mismatches.length === 0) {
    console.log("\n✓ All checks pass. Current HubSpot state matches the manifest.");
    return;
  }

  console.error(`\n✗ ${mismatches.length} mismatches found:\n`);
  for (const m of mismatches) {
    console.error(
      `  ${m.object.padEnd(10)} ${m.field.padEnd(45)} expected ${m.expected}, actually ${m.actual}`,
    );
  }
  process.exit(2);
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
