/**
 * Phase 2 Step 4a — Delete (archive) the recruiting candidate contacts.
 *
 * Re-fetches the candidate list using the same filter as
 * dump-candidate-contacts.ts (any contact with at least one
 * candidate_X / recruiter_email / etc. property populated), then
 * batch-archives them via HubSpot's API.
 *
 * "Archive" = soft delete. Recoverable from HubSpot's Recently Deleted
 * view for ~90 days. After that, permanent.
 *
 * Defaults to dry-run.
 *
 * Usage:
 *   pnpm tsx scripts/phase2/delete-candidate-contacts.ts            # dry-run
 *   pnpm tsx scripts/phase2/delete-candidate-contacts.ts --apply    # archive
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";

import { CANDIDATE_CONTACT_PROPERTIES } from "./manifest";
import { batchArchiveObjects, searchAll } from "./lib/hubspot";
import { ensureDir, outputPaths } from "./lib/paths";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH_SIZE = 100;

interface CandidateContact {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  lifecyclestage: string;
  num_associated_deals: number;
}

async function fetchCandidates(): Promise<CandidateContact[]> {
  // Find every contact with ANY candidate-indicator property populated.
  //
  // HubSpot search ANDs filters within a filterGroup and ORs across groups,
  // capped at 5 filterGroups per call. To OR across N properties, we need
  // each property in its own filterGroup. With more than 5 properties, we
  // do multiple search passes and dedupe by ID.
  //
  // (The original implementation here packed 6 properties into one
  // filterGroup, accidentally requiring all 6 to be populated — which
  // missed contacts that had only some of those properties set. That
  // bug caused us to miss 17 candidates on the first run.)
  const props = [...CANDIDATE_CONTACT_PROPERTIES];
  const PASS_SIZE = 5;
  const seen = new Map<string, CandidateContact>();

  for (let i = 0; i < props.length; i += PASS_SIZE) {
    const chunk = props.slice(i, i + PASS_SIZE);
    const filterGroups = chunk.map((p) => ({
      filters: [{ propertyName: p, operator: "HAS_PROPERTY" }],
    }));
    for await (const c of searchAll("contacts", {
      filterGroups,
      properties: [
        "firstname",
        "lastname",
        "email",
        "lifecyclestage",
        "num_associated_deals",
      ],
      limit: 100,
    })) {
      if (seen.has(c.id)) continue;
      const p = c.properties;
      seen.set(c.id, {
        id: c.id,
        firstname: p.firstname ?? "",
        lastname: p.lastname ?? "",
        email: p.email ?? "",
        lifecyclestage: p.lifecyclestage ?? "",
        num_associated_deals: Number(p.num_associated_deals ?? "0"),
      });
    }
  }

  return Array.from(seen.values());
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const paths = outputPaths();
  ensureDir(paths.root);
  const logFile = join(paths.root, "delete-candidates.jsonl");
  const log = (event: string, data: object = {}) =>
    appendFileSync(
      logFile,
      JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + "\n",
    );

  console.log(`\nMode: ${apply ? "EXECUTE (--apply)" : "DRY-RUN"}\n`);
  log("run.start", { apply });

  console.log("Fetching candidate contacts via HAS_PROPERTY filter...");
  const candidates = await fetchCandidates();
  console.log(`Found ${candidates.length} candidate contacts.\n`);

  // Hard safety re-check: refuse to delete anyone with deals or "customer"
  // lifecycle. The user has approved deletion of "opportunity"-stage
  // contacts because that was a default lifecycle assignment from the
  // recruiting workflow, not a real sales opportunity.
  const dangerous = candidates.filter(
    (c) =>
      c.num_associated_deals > 0 || c.lifecyclestage.toLowerCase() === "customer",
  );
  if (dangerous.length > 0) {
    console.error(`✗ ${dangerous.length} candidates have deals or lifecycle=customer.`);
    console.error("  These are NOT safe to delete. Aborting.");
    for (const d of dangerous.slice(0, 10)) {
      console.error(
        `    ${d.id} ${d.firstname} ${d.lastname} (${d.email}) — deals=${d.num_associated_deals} stage=${d.lifecyclestage}`,
      );
    }
    log("aborted.dangerous_candidates_found", { count: dangerous.length });
    process.exit(2);
  }

  console.log("✓ Hard safety check passed (no deals, no customer lifecycle).\n");

  if (!apply) {
    console.log("Would archive these contacts (sample of first 10):");
    for (const c of candidates.slice(0, 10)) {
      console.log(
        `  ${c.id.padEnd(13)} ${c.firstname.padEnd(15)} ${c.lastname.padEnd(20)} ${c.email}`,
      );
    }
    console.log(`  ... and ${Math.max(0, candidates.length - 10)} more.\n`);
    console.log(`(Full list dumped earlier to candidate-contacts.csv)\n`);
    log("dry_run.complete", { count: candidates.length });
    return;
  }

  // Apply mode: batch archive in chunks of 100.
  const ids = candidates.map((c) => c.id);
  let archived = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ids.length / BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches}: archiving ${batch.length} contacts...`);
    try {
      await batchArchiveObjects("contacts", batch);
      archived += batch.length;
      log("batch.archived", { batchNum, count: batch.length, ids: batch });
      console.log(`  ✓ archived (${archived}/${ids.length})`);
    } catch (err) {
      const msg = (err as Error).message;
      console.error(`  ✗ batch failed: ${msg}`);
      log("batch.error", { batchNum, error: msg, ids: batch });
      throw err; // halt — partial state needs manual review
    }
    if (i + BATCH_SIZE < ids.length) await sleep(500);
  }

  console.log(`\n✓ ${archived} candidate contacts archived.`);
  console.log(`  Recoverable from HubSpot UI → Contacts → Recently Deleted (~90 days).`);
  console.log(`Audit log: ${logFile}`);
  log("run.complete", { archived });
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
