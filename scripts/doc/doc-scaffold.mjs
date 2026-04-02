#!/usr/bin/env node

/**
 * doc-scaffold — Create a new document with type template
 *
 * Usage:
 *   doc-scaffold <slug> --owner <name> --type <type>
 *
 * Args:
 *   slug: document identifier (e.g., payment-processing)
 *   --owner: document owner name
 *   --type: spec | rfc | adr | guide | free-form
 *
 * Exit codes:
 *   0: success
 *   1: fixable issue (e.g., slug exists)
 *   2: fatal error (e.g., invalid type)
 */

import fs from 'fs';
import path from 'path';

const TEMPLATES = {
  spec: `# {TITLE}

## Overview
<!-- What is this document about? What problem does it solve? -->

## Goals
<!-- What are we trying to achieve? -->

## Non-Goals
<!-- What is explicitly out of scope? -->

## Technical Design
<!-- The detailed design — architecture, data flow, APIs, etc. -->

## Alternatives Considered
<!-- What other approaches were evaluated and why they were rejected? -->

## Open Questions
<!-- Unresolved decisions or unknowns -->
`,

  rfc: `# {TITLE}

## Summary
<!-- One-paragraph summary of the proposal -->

## Motivation
<!-- Why is this change needed? -->

## Proposal
<!-- The detailed proposal -->

## Alternatives Considered
<!-- What other approaches were evaluated? -->

## Impact
<!-- What systems, teams, or processes are affected? -->

## Open Questions
<!-- Unresolved decisions -->
`,

  adr: `# {TITLE}

## Context
<!-- What situation requires a decision? -->

## Decision
<!-- What was decided? -->

## Consequences
<!-- Positive and negative outcomes of this decision -->
`,

  guide: `# {TITLE}

## Overview
<!-- What does this guide cover? Who is it for? -->

## Prerequisites
<!-- What does the reader need before starting? -->

## Steps
<!-- Step-by-step instructions -->

## Troubleshooting
<!-- Common problems and solutions -->
`,

  'free-form': `# {TITLE}

<!-- Your content here -->
`,
};

function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: doc-scaffold <slug> --owner <name> --type <type>');
    process.exit(2);
  }

  const slug = args[0];
  let owner = null;
  let type = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--owner' && i + 1 < args.length) {
      owner = args[i + 1];
      i++;
    }
    if (args[i] === '--type' && i + 1 < args.length) {
      type = args[i + 1];
      i++;
    }
  }

  if (!owner || !type) {
    console.error('Missing --owner or --type');
    process.exit(2);
  }

  if (!TEMPLATES[type]) {
    console.error(`Invalid type: ${type}. Must be one of: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(2);
  }

  const docPath = path.join('docs', slug);
  if (fs.existsSync(docPath)) {
    console.error(`Document already exists: ${docPath}`);
    process.exit(1);
  }

  // Create folder structure
  try {
    fs.mkdirSync(docPath, { recursive: true });

    // Create index.md
    const template = TEMPLATES[type];
    const indexContent = template.replace('{TITLE}', slug);
    fs.writeFileSync(path.join(docPath, 'index.md'), indexContent);

    // Create meta.yaml
    const metaContent = `schema_version: 1
title: ${slug}
status: draft
owner: ${owner}
contributors: [${owner}]
tags: []
type: ${type}
current_version: null
`;
    fs.writeFileSync(path.join(docPath, 'meta.yaml'), metaContent);

    console.log(`Created: ${docPath}/`);
    console.log(`  index.md    (${type} template)`);
    console.log(`  meta.yaml   (status: draft, owner: ${owner})`);
    process.exit(0);
  } catch (error) {
    console.error(`Error creating document: ${error.message}`);
    process.exit(2);
  }
}

main();
