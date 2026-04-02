#!/usr/bin/env node

/**
 * doc-stats — Health overview of all documents
 *
 * Usage:
 *   doc-stats [--json]
 *
 * Exit codes:
 *   0: success
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

function main() {
  const jsonMode = process.argv.includes('--json');
  const docsDir = 'docs';

  if (!fs.existsSync(docsDir)) {
    const output = jsonMode
      ? JSON.stringify({
          total: 0,
          byStatus: {},
          pendingReviews: 0,
          oldestFeedback: null,
          inactiveDocs: [],
        })
      : 'No documents yet';
    console.log(output);
    process.exit(0);
  }

  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  const stats = {
    total: 0,
    byStatus: { draft: 0, 'in-review': 0, approved: 0, archived: 0 },
    pendingReviews: 0,
    inactiveDocs: [],
  };

  entries
    .filter(e => e.isDirectory())
    .forEach(entry => {
      const metaPath = path.join(docsDir, entry.name, 'meta.yaml');
      if (!fs.existsSync(metaPath)) return;

      try {
        const content = fs.readFileSync(metaPath, 'utf-8');
        const meta = YAML.parse(content);

        stats.total++;
        stats.byStatus[meta.status || 'unknown'] = (stats.byStatus[meta.status] || 0) + 1;

        // Count reviews
        const reviewsPath = path.join(docsDir, entry.name, 'reviews');
        if (fs.existsSync(reviewsPath)) {
          const reviews = fs.readdirSync(reviewsPath).filter(f => f.startsWith('review_') && f.endsWith('.md'));
          stats.pendingReviews += reviews.length;
        }
      } catch (error) {
        // Skip malformed documents
      }
    });

  if (jsonMode) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(`Documents: ${stats.total}`);
    console.log(`  Draft: ${stats.byStatus.draft}`);
    console.log(`  In Review: ${stats.byStatus['in-review']}`);
    console.log(`  Approved: ${stats.byStatus.approved}`);
    console.log(`  Archived: ${stats.byStatus.archived}`);
    console.log(`Pending reviews: ${stats.pendingReviews}`);
  }

  process.exit(0);
}

main();
