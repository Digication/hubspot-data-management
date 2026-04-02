#!/usr/bin/env node

/**
 * doc-import — Import existing markdown files into document structure
 *
 * Usage:
 *   doc-import <path> --type <type> --owner <name>
 *   doc-import --scan [--filter <pattern>]
 *
 * Options:
 *   --type: spec | rfc | adr | guide | free-form
 *   --owner: document owner name
 *   --filter: glob pattern for --scan (default: **\/*.md)
 *
 * Exit codes:
 *   0: success
 *   1: fixable issue (e.g., missing sections)
 *   2: fatal error (e.g., file not found)
 */

import fs from 'fs';
import path from 'path';

const REQUIRED_SECTIONS = {
  spec: ['Overview', 'Goals', 'Technical Design'],
  rfc: ['Summary', 'Motivation', 'Proposal'],
  adr: ['Context', 'Decision', 'Consequences'],
  guide: ['Overview', 'Steps'],
  'free-form': [],
};

function extractSections(content) {
  const sections = [];
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      sections.push(match[1].trim());
    }
  });
  return sections;
}

function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--scan') {
    console.log('Scanning for markdown files...');
    // For now, just report that scan mode is available
    console.log('Found no markdown files outside docs/ (scan mode stub)');
    process.exit(0);
  }

  const filePath = args[0];
  let type = null;
  let owner = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--type' && i + 1 < args.length) {
      type = args[i + 1];
      i++;
    }
    if (args[i] === '--owner' && i + 1 < args.length) {
      owner = args[i + 1];
      i++;
    }
  }

  if (!filePath || !type || !owner) {
    console.error('Usage: doc-import <path> --type <type> --owner <name>');
    process.exit(2);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(2);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const sections = extractSections(content);
  const required = REQUIRED_SECTIONS[type] || [];
  const missing = required.filter(s => !sections.includes(s));

  if (missing.length > 0) {
    console.log(`Warning: Missing sections for ${type}:`);
    missing.forEach(s => console.log(`  - ${s}`));
  }

  // For now, just report what would be done
  const slug = path.basename(filePath, '.md');
  console.log(`Would import: ${filePath} → docs/${slug}/`);
  console.log(`Detected sections: ${sections.join(', ')}`);

  if (missing.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
