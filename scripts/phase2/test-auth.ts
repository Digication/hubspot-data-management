/**
 * One-shot read-only auth test for the HubSpot Service Key.
 *
 * Calls listProperties() against contacts, companies, and deals — the three
 * objects we'll be deleting properties from in Phase 2. If all three succeed,
 * your key + scopes are correctly configured.
 *
 * Read-only. Makes no changes to HubSpot.
 */

import { listProperties } from "./lib/hubspot";

async function main(): Promise<void> {
  console.log("Testing HubSpot Service Key auth...\n");

  const objects = ["contacts", "companies", "deals"] as const;
  for (const obj of objects) {
    const props = await listProperties(obj);
    console.log(`  ✓ ${obj.padEnd(10)} — ${props.length} active properties visible`);
  }

  console.log("\n✓ All three reads succeeded. Auth is working.");
}

main().catch((err: Error) => {
  console.error("\n✗ Auth test failed:\n");
  console.error(err.message);
  console.error(
    "\nCommon causes:\n" +
      "  • Key not pasted correctly in .env (check for extra spaces/quotes)\n" +
      "  • Missing scope on the Service Key (re-check the 9 required scopes)\n" +
      "  • Service Key was disabled or rotated in HubSpot",
  );
  process.exit(1);
});
