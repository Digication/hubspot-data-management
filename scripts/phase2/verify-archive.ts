/**
 * One-off verification script.
 *
 * 1) Lists archived properties for each object directly from the HubSpot API
 *    (so we can compare against the UI count).
 * 2) Probes `kloutscoregeneral` on contacts to see what state HubSpot reports
 *    (active/archived/missing/hubspotDefined).
 *
 * Read-only.
 */

import { getProperty, listProperties } from "./lib/hubspot";

const BASE = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN!;

async function listArchived(
  objectType: string,
): Promise<Array<{ name: string; label: string }>> {
  const res = await fetch(
    `${BASE}/crm/v3/properties/${objectType}?archived=true`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const body = (await res.json()) as {
    results: Array<{ name: string; label: string }>;
  };
  return body.results.map((r) => ({ name: r.name, label: r.label }));
}

async function main(): Promise<void> {
  for (const obj of ["contacts", "companies", "deals"] as const) {
    const archived = await listArchived(obj);
    console.log(`\n${obj.toUpperCase()} — ${archived.length} archived properties:`);
    for (const p of archived) {
      console.log(`  • ${p.name.padEnd(40)} (label: "${p.label}")`);
    }
  }

  console.log("\n---");
  console.log("Probing kloutscoregeneral on contacts:");
  const active = await getProperty("contacts", "kloutscoregeneral");
  console.log("  archived=false →", active ? `FOUND (label: "${active.label}", hubspotDefined: ${active.hubspotDefined}, archivable: ${active.modificationMetadata?.archivable})` : "not found");

  // Try archived=true via direct fetch
  const archRes = await fetch(
    `${BASE}/crm/v3/properties/contacts/kloutscoregeneral?archived=true`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  if (archRes.ok) {
    const p = (await archRes.json()) as {
      label: string;
      hubspotDefined?: boolean;
      archived?: boolean;
    };
    console.log(`  archived=true  → FOUND (label: "${p.label}", hubspotDefined: ${p.hubspotDefined}, archived: ${p.archived})`);
  } else {
    console.log(`  archived=true  → ${archRes.status} ${archRes.statusText}`);
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
