/**
 * Append-only audit logger. Writes one JSON line per event to
 * execution-log.jsonl in the Phase 2 output folder.
 *
 * Used by every Phase 2 script so post-execution we have a complete
 * chronological record of what happened.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface LogEvent {
  ts: string;
  script: string;
  action: string;
  detail: Record<string, unknown>;
}

export class AuditLogger {
  constructor(
    private readonly logPath: string,
    private readonly scriptName: string,
  ) {
    mkdirSync(dirname(logPath), { recursive: true });
  }

  log(action: string, detail: Record<string, unknown> = {}): void {
    const event: LogEvent = {
      ts: new Date().toISOString(),
      script: this.scriptName,
      action,
      detail,
    };
    appendFileSync(this.logPath, JSON.stringify(event) + "\n", "utf8");
    // Mirror to console for interactive use
    // eslint-disable-next-line no-console
    console.log(`[${event.ts}] ${this.scriptName}: ${action}`, detail);
  }
}
