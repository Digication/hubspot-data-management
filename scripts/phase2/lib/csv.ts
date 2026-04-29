/**
 * Minimal CSV writer. RFC 4180-compliant quoting (commas, quotes, newlines).
 *
 * Not using a library here on purpose — the output is consumed by humans
 * reviewing what's about to be deleted, and by HubSpot's own CSV import if
 * restoration is ever needed. Keep it simple and auditable.
 */

function escapeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  // Quote if it contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}
