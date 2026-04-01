#!/usr/bin/env node
/**
 * generate-viewer.mjs
 *
 * Generates a self-contained HTML eval viewer from test results.
 * Opens in any browser — no server needed.
 *
 * Usage:
 *   node generate-viewer.mjs --skill <name> --results <json-path> [--baseline <json-path>] [--output <html-path>]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

  const skillName = get('--skill') || 'unknown';
  const resultsPath = get('--results');
  const baselinePath = get('--baseline');
  const outputPath = get('--output') || `${process.env.TMPDIR || '/tmp'}/eval-viewer-${skillName}-${Date.now()}.html`;

  if (!resultsPath) {
    console.error('Usage: node generate-viewer.mjs --skill <name> --results <json-path>');
    process.exit(1);
  }

  const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
  let benchmark = null;

  if (baselinePath) {
    try {
      const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
      benchmark = baseline.cases?.map(c => ({
        config: c.name,
        pass_rate: c.withSkill?.passRate || 0,
        delta: (c.withSkill?.passRate || 0) - (c.withoutSkill?.passRate || 0),
      }));
    } catch {}
  }

  const data = {
    skillName: results.skillName || skillName,
    timestamp: results.timestamp || new Date().toISOString(),
    cases: results.cases || [],
    benchmark,
  };

  const templatePath = join(__dirname, '../references/viewer-template.html');
  let template = readFileSync(templatePath, 'utf8');

  template = template
    .replaceAll('__SKILL_NAME__', data.skillName)
    .replaceAll('__TIMESTAMP__', new Date(data.timestamp).toLocaleString())
    .replace('/*__EMBEDDED_DATA__*/', `const DATA = ${JSON.stringify(data)};`);

  writeFileSync(outputPath, template);
  console.log(`Viewer written to: ${outputPath}`);
  console.log(`Open it with: open "${outputPath}"`);

  // Auto-open on macOS
  try { execSync(`open "${outputPath}"`); } catch {}
}

main();
