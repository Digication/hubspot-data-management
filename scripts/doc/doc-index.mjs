#!/usr/bin/env node

/**
 * doc-index — Rebuild docs/index.md from folder state and meta.yaml files
 *
 * Usage:
 *   doc-index [--check]
 *
 * Options:
 *   --check: validation-only mode for CI (exit code only, no changes)
 *
 * Exit codes:
 *   0: index is current or was rebuilt successfully
 *   1: differences found (in check mode) or rebuild successful with warnings
 *   2: fatal error (e.g., malformed meta.yaml)
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

function generateIndex() {
  const docsDir = 'docs';
  if (!fs.existsSync(docsDir)) {
    return `# Documents\n\nNo documents yet.\n`;
  }

  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  const documents = [];

  entries
    .filter(e => e.isDirectory() && e.name !== 'archives')
    .forEach(entry => {
      const metaPath = path.join(docsDir, entry.name, 'meta.yaml');
      if (fs.existsSync(metaPath)) {
        try {
          const content = fs.readFileSync(metaPath, 'utf-8');
          const meta = YAML.parse(content);
          documents.push({
            slug: entry.name,
            title: meta.title || entry.name,
            status: meta.status || 'unknown',
            owner: meta.owner || '?',
            type: meta.type || '?',
            version: meta.current_version || '—',
          });
        } catch (error) {
          console.error(`Warning: Failed to parse ${metaPath}: ${error.message}`);
        }
      }
    });

  // Sort by status, then by title
  documents.sort((a, b) => {
    const statusOrder = { draft: 0, 'in-review': 1, approved: 2, archived: 3 };
    const aDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (aDiff !== 0) return aDiff;
    return a.title.localeCompare(b.title);
  });

  // Generate markdown table
  let indexContent = `# Documents\n\n`;
  indexContent += `| Title | Type | Status | Owner | Version |\n`;
  indexContent += `|-------|------|--------|-------|----------|\n`;

  documents.forEach(doc => {
    indexContent += `| [${doc.title}](${doc.slug}/) | ${doc.type} | ${doc.status} | ${doc.owner} | ${doc.version} |\n`;
  });

  indexContent += `\n[View archived documents](archives/)\n`;

  return indexContent;
}

function main() {
  const checkMode = process.argv.includes('--check');
  const indexPath = path.join('docs', 'index.md');

  const newContent = generateIndex();
  const oldContent = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, 'utf-8')
    : null;

  if (checkMode) {
    if (oldContent !== newContent) {
      console.log('docs/index.md is out of sync');
      process.exit(1);
    } else {
      console.log('✓ docs/index.md is current');
      process.exit(0);
    }
  } else {
    // Write the new index
    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync(indexPath, newContent);
    if (oldContent !== newContent) {
      console.log('Updated docs/index.md');
      process.exit(1); // Signal that changes were made
    } else {
      console.log('✓ docs/index.md is current');
      process.exit(0);
    }
  }
}

main();
