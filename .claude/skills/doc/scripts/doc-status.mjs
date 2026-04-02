#!/usr/bin/env node

/**
 * doc-status — Show lifecycle status of a document
 *
 * Usage:
 *   doc-status <slug>
 *
 * Exit codes:
 *   0: success
 *   1: document not found
 *   2: fatal error
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: doc-status <slug>');
    process.exit(2);
  }

  const docPath = path.join('docs', slug);
  const metaPath = path.join(docPath, 'meta.yaml');

  if (!fs.existsSync(metaPath)) {
    console.error(`Document not found: ${slug}`);
    process.exit(1);
  }

  try {
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const meta = YAML.parse(metaContent);

    console.log(`${meta.title} (${meta.type}, ${meta.status})`);
    console.log(`  Owner: ${meta.owner} | Contributors: ${(meta.contributors || []).join(', ')}`);
    console.log(`  Version: ${meta.current_version ? `v${meta.current_version}` : 'draft'}`);
    console.log(`  Tags: ${(meta.tags || []).join(', ') || 'none'}`);

    // Count reviews
    const reviewsPath = path.join(docPath, 'reviews');
    let pendingCount = 0;
    if (fs.existsSync(reviewsPath)) {
      const reviews = fs.readdirSync(reviewsPath).filter(f => f.startsWith('review_') && f.endsWith('.md'));
      pendingCount = reviews.length;
    }

    if (pendingCount > 0) {
      console.log(`  Pending reviews: ${pendingCount}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error reading document: ${error.message}`);
    process.exit(2);
  }
}

main();
