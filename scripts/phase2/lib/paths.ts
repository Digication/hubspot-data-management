/**
 * Output directory helpers. All Phase 2 backup outputs go to
 * `backups/phase2-pre-execution/<date>/`, which is gitignored.
 *
 * Why the env override: tests can point to a temp dir; CI can isolate
 * different runs to different folders.
 */

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export function repoRoot(): string {
  // scripts/phase2/lib/paths.ts → repo root is three levels up
  return resolve(__dirname, "..", "..", "..");
}

/** YYYY-MM-DD of today, in the local timezone. */
export function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface OutputPaths {
  root: string; // backups/phase2-pre-execution/<date>
  fieldDumps: string; // <root>/field-dumps/<object>/<field>.csv
  schemas: string; // <root>/schemas/
  recordDumps: string; // <root>/record-dumps/
  executionLog: string; // <root>/execution-log.jsonl
}

export function outputPaths(date: string = todayStamp()): OutputPaths {
  const override = process.env.PHASE2_OUTPUT_DIR;
  const base = override
    ? resolve(override)
    : join(repoRoot(), "backups", "phase2-pre-execution", date);
  return {
    root: base,
    fieldDumps: join(base, "field-dumps"),
    schemas: join(base, "schemas"),
    recordDumps: join(base, "record-dumps"),
    executionLog: join(base, "execution-log.jsonl"),
  };
}

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}
