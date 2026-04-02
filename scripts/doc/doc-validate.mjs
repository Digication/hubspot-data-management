#!/usr/bin/env node

/**
 * doc-validate — Check documents for correctness
 *
 * Usage:
 *   doc-validate [--all] [--fix]
 *
 * Options:
 *   --all: validate all documents (default: current document if in docs/)
 *   --fix: auto-repair safe issues
 *
 * Exit codes:
 *   0: all valid
 *   1: fixable issues found (or fixed with --fix)
 *   2: fatal issues
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const VALID_STATUSES = ['draft', 'in-review', 'approved', 'archived'];
const VALID_TYPES = ['spec', 'rfc', 'adr', 'guide', 'free-form'];

function validateMetaYaml(metaPath) {
  try {
    const content = fs.readFileSync(metaPath, 'utf-8');
    const meta = YAML.parse(content);

    const errors = [];

    if (!meta.schema_version) errors.push('Missing schema_version');
    if (!meta.title) errors.push('Missing title');
    if (!meta.status || !VALID_STATUSES.includes(meta.status)) {
      errors.push(`Invalid status: ${meta.status}`);
    }
    if (!meta.owner) errors.push('Missing owner');
    if (!meta.type || !VALID_TYPES.includes(meta.type)) {
      errors.push(`Invalid type: ${meta.type}`);
    }

    return { valid: errors.length === 0, errors, meta };
  } catch (error) {
    return { valid: false, errors: [`Failed to parse: ${error.message}`], meta: null };
  }
}

function validateDocument(docPath) {
  const issues = [];

  // Check meta.yaml
  const metaPath = path.join(docPath, 'meta.yaml');
  if (!fs.existsSync(metaPath)) {
    issues.push({ type: 'error', message: 'Missing meta.yaml' });
    return issues;
  }

  const { valid, errors } = validateMetaYaml(metaPath);
  if (!valid) {
    issues.push(...errors.map(err => ({ type: 'error', message: err })));
  }

  // Check index.md
  const indexPath = path.join(docPath, 'index.md');
  if (!fs.existsSync(indexPath)) {
    issues.push({ type: 'error', message: 'Missing index.md' });
  }

  return issues;
}

function main() {
  const args = process.argv.slice(2);
  const validateAll = args.includes('--all');
  const fix = args.includes('--fix');

  let docPaths = [];

  if (validateAll) {
    // Find all documents
    const docsDir = 'docs';
    if (fs.existsSync(docsDir)) {
      const entries = fs.readdirSync(docsDir, { withFileTypes: true });
      docPaths = entries
        .filter(e => e.isDirectory() && e.name !== 'archives')
        .map(e => path.join(docsDir, e.name));
    }
  } else {
    // Validate current document if in docs/
    const cwd = process.cwd();
    const match = cwd.match(/docs\/([^/]+)$/);
    if (match) {
      docPaths = [path.join('docs', match[1])];
    }
  }

  if (docPaths.length === 0) {
    console.error('No documents found to validate');
    process.exit(1);
  }

  let hasErrors = false;
  docPaths.forEach(docPath => {
    const issues = validateDocument(docPath);
    if (issues.length > 0) {
      hasErrors = true;
      console.log(`${docPath}:`);
      issues.forEach(issue => {
        console.log(`  [${issue.type.toUpperCase()}] ${issue.message}`);
      });
    }
  });

  if (hasErrors) {
    process.exit(1);
  } else {
    console.log('✓ All documents valid');
    process.exit(0);
  }
}

main();
