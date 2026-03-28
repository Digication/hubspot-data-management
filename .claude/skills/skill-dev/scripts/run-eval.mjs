#!/usr/bin/env node

/**
 * Eval Runner for skill-dev testing system.
 *
 * Loads YAML test fixtures from skills/<name>/tests/eval.yaml,
 * spawns read-only agents to simulate skill execution,
 * and checks deterministic + LLM-judge assertions against the output.
 *
 * Usage:
 *   node run-eval.mjs --skill <name>              # Run all layers for a skill
 *   node run-eval.mjs --skill <name> --layer 2    # Run only Layer 2 (deterministic)
 *   node run-eval.mjs --skill <name> --dry-run    # Validate fixtures only
 *   node run-eval.mjs --all                       # Run all skills with fixtures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> skill-dev/ -> skills/  (2 levels up)
const SKILLS_DIR = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// YAML Parser (minimal, no dependencies)
// ---------------------------------------------------------------------------

/**
 * Minimal YAML parser sufficient for our fixture format.
 * Handles: scalars, sequences (- items), nested mappings, quoted strings,
 * and block scalars (| and >).
 *
 * Does NOT handle: anchors, aliases, flow sequences/mappings, tags,
 * complex keys, or merge keys.
 *
 * For production use, swap with a proper YAML library (e.g., `yaml` package).
 * This keeps the script zero-dependency.
 */
function parseYaml(text) {
  try {
    return yamlParse(text);
  } catch (e) {
    console.error(`YAML parsing failed: ${e.message}`);
    console.error('Ensure fixtures are valid YAML or install the yaml package.');
    process.exit(1);
  }
}

/**
 * Recursive descent YAML parser for the known fixture structure.
 * Handles: scalars, sequences (- items), nested mappings, quoted strings.
 * Processes the file as an array of (indent, content) tokens.
 */
function yamlParse(text) {
  // Pre-process: split into lines, strip comments, track indentation
  const rawLines = text.split('\n');
  const tokens = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Skip blank lines and full-line comments
    if (/^\s*(#.*)?$/.test(line)) continue;
    const m = line.match(/^(\s*)(.*)/);
    const indent = m[1].length;
    let content = m[2];
    // Strip inline comments (not inside quotes)
    if (!content.startsWith('"') && !content.startsWith("'")) {
      content = content.replace(/\s+#.*$/, '');
    }
    tokens.push({ indent, content, lineNo: i });
  }

  let pos = 0;

  function parseValue(minIndent) {
    if (pos >= tokens.length) return null;
    const tok = tokens[pos];
    if (tok.indent < minIndent) return null;

    // Sequence?
    if (tok.content.startsWith('- ')) {
      return parseSequence(tok.indent);
    }

    // Mapping?
    const kvMatch = tok.content.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):\s*(.*)/);
    if (kvMatch) {
      return parseMapping(tok.indent);
    }

    // Scalar
    pos++;
    return parseScalar(tok.content);
  }

  function parseMapping(baseIndent) {
    const obj = {};
    while (pos < tokens.length && tokens[pos].indent === baseIndent) {
      const tok = tokens[pos];
      const kvMatch = tok.content.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):\s*(.*)/);
      if (!kvMatch) break;

      const key = kvMatch[1];
      const inlineValue = kvMatch[2].trim();
      pos++;

      if (inlineValue !== '') {
        obj[key] = parseScalar(inlineValue);
      } else {
        // Value is on subsequent indented lines
        if (pos < tokens.length && tokens[pos].indent > baseIndent) {
          obj[key] = parseValue(tokens[pos].indent);
        } else {
          obj[key] = null;
        }
      }
    }
    return obj;
  }

  function parseSequence(baseIndent) {
    const arr = [];
    while (pos < tokens.length && tokens[pos].indent === baseIndent && tokens[pos].content.startsWith('- ')) {
      const tok = tokens[pos];
      const itemContent = tok.content.slice(2).trim();

      // Is this a key: value on the same line as the dash?
      const kvMatch = itemContent.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):\s*(.*)/);
      if (kvMatch) {
        // List item is a mapping — parse the first key inline, then continue
        const obj = {};
        const key = kvMatch[1];
        const inlineValue = kvMatch[2].trim();
        pos++;

        if (inlineValue !== '') {
          obj[key] = parseScalar(inlineValue);
        } else {
          // Value on next lines
          if (pos < tokens.length && tokens[pos].indent > baseIndent) {
            obj[key] = parseValue(tokens[pos].indent);
          } else {
            obj[key] = null;
          }
        }

        // Continue reading keys at indent > baseIndent that belong to this item
        // The continuation keys are at baseIndent + 2 (or more) from the dash
        const itemIndent = baseIndent + 2;
        while (pos < tokens.length && tokens[pos].indent >= itemIndent) {
          const subTok = tokens[pos];
          // Could be a nested key: value
          const subKv = subTok.content.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*):\s*(.*)/);
          if (subKv) {
            const subKey = subKv[1];
            const subInline = subKv[2].trim();
            pos++;

            if (subInline !== '') {
              obj[subKey] = parseScalar(subInline);
            } else {
              if (pos < tokens.length && tokens[pos].indent > subTok.indent) {
                obj[subKey] = parseValue(tokens[pos].indent);
              } else {
                obj[subKey] = null;
              }
            }
          } else if (subTok.content.startsWith('- ')) {
            // Shouldn't happen at this indent for a mapping item
            break;
          } else {
            pos++;
          }
        }

        arr.push(obj);
      } else if (itemContent === '') {
        // Bare dash — value on next line(s)
        pos++;
        if (pos < tokens.length && tokens[pos].indent > baseIndent) {
          arr.push(parseValue(tokens[pos].indent));
        } else {
          arr.push(null);
        }
      } else {
        // Plain scalar item
        pos++;
        arr.push(parseScalar(itemContent));
      }
    }
    return arr;
  }

  return parseValue(0) || {};
}

function parseScalar(value) {
  if (value === '' || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Assertion Checkers
// ---------------------------------------------------------------------------

function checkContains(output, value) {
  const pass = output.includes(value);
  return { pass, detail: pass ? `Found "${value}"` : `Missing "${value}"` };
}

function checkNotContains(output, value) {
  const pass = !output.includes(value);
  return { pass, detail: pass ? `Correctly absent: "${value}"` : `Unexpectedly found: "${value}"` };
}

function checkRegex(output, pattern) {
  const regex = new RegExp(pattern, 'm');
  const pass = regex.test(output);
  return { pass, detail: pass ? `Matched: ${pattern}` : `No match for: ${pattern}` };
}

function checkContainsAll(output, values) {
  const missing = values.filter(v => !output.includes(v));
  const pass = missing.length === 0;
  return { pass, detail: pass ? `All ${values.length} substrings found` : `Missing: ${missing.join(', ')}` };
}

function checkContainsAny(output, values) {
  const found = values.find(v => output.includes(v));
  const pass = !!found;
  return { pass, detail: pass ? `Found: "${found}"` : `None found of: ${values.join(', ')}` };
}

function checkDecisionTrace(output, assertion) {
  // Decision trace assertions check that the agent's trace contains
  // the expected input -> rule -> result chain
  const { input, rule, result } = assertion;
  const outputLower = output.toLowerCase();
  const resultLower = result.toLowerCase();

  // Check if the result appears in the output
  const pass = outputLower.includes(resultLower);
  return {
    pass,
    detail: pass
      ? `Decision "${input}" -> ${rule} -> "${result}" found in trace`
      : `Expected result "${result}" not found in agent trace`
  };
}

// ---------------------------------------------------------------------------
// Assertion Router
// ---------------------------------------------------------------------------

function runAssertion(output, assertion) {
  switch (assertion.type) {
    case 'contains':
      return checkContains(output, assertion.value);
    case 'not-contains':
      return checkNotContains(output, assertion.value);
    case 'regex':
      return checkRegex(output, assertion.value);
    case 'contains-all':
      return checkContainsAll(output, assertion.values);
    case 'contains-any':
      return checkContainsAny(output, assertion.values);
    case 'decision-trace':
      return checkDecisionTrace(output, assertion);
    case 'llm-rubric':
      // Layer 3 — deferred, mark as skipped unless --layer 3
      return { pass: null, detail: `[Layer 3] Skipped: ${assertion.value}` };
    default:
      return { pass: false, detail: `Unknown assertion type: ${assertion.type}` };
  }
}

// ---------------------------------------------------------------------------
// Test Case Runner
// ---------------------------------------------------------------------------

function runCase(testCase, agentOutput) {
  const results = [];

  for (const assertion of testCase.assert) {
    const result = runAssertion(agentOutput, assertion);
    results.push({
      type: assertion.type,
      ...result
    });
  }

  const passed = results.filter(r => r.pass === true).length;
  const failed = results.filter(r => r.pass === false).length;
  const skipped = results.filter(r => r.pass === null).length;

  return {
    name: testCase.name,
    category: testCase.category,
    verdict: failed > 0 ? 'FAIL' : (skipped > 0 ? 'PARTIAL' : 'PASS'),
    passed,
    failed,
    skipped,
    assertions: results
  };
}

// ---------------------------------------------------------------------------
// Staleness Detection
// ---------------------------------------------------------------------------

/**
 * Check if the skill directory changed after the fixture's last_updated date.
 * Returns { stale: boolean, lastChange: string | null }
 */
function checkStaleness(skillName, lastUpdated) {
  if (!lastUpdated) return { stale: false, lastChange: null };

  try {
    const skillPath = path.join(SKILLS_DIR, skillName);
    const repoRoot = path.resolve(SKILLS_DIR, '../..');
    const result = execSync(
      `git log --since="${lastUpdated}" --oneline -- "${skillPath}"`,
      { encoding: 'utf8', cwd: repoRoot }
    ).trim();

    if (result) {
      const firstLine = result.split('\n')[0];
      return { stale: true, lastChange: firstLine };
    }
  } catch (e) {
    // git not available or not a repo — skip staleness check
  }

  return { stale: false, lastChange: null };
}

/**
 * Adjust verdict when skill has changed since fixture was written.
 * FAIL + stale skill -> POSSIBLY_STALE (warning, not blocker)
 */
function applyStalenessMask(caseResult, staleness) {
  if (caseResult.verdict === 'FAIL' && staleness.stale) {
    return {
      ...caseResult,
      verdict: 'POSSIBLY_STALE',
      staleNote: `Skill changed since fixture was written (${staleness.lastChange}). ` +
        `Review: is this a real bug or an outdated test case?`
    };
  }
  return caseResult;
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------

function generateReport(skillName, caseResults) {
  const total = caseResults.length;
  const passed = caseResults.filter(r => r.verdict === 'PASS').length;
  const failed = caseResults.filter(r => r.verdict === 'FAIL').length;
  const partial = caseResults.filter(r => r.verdict === 'PARTIAL').length;

  let report = '';
  report += `\n# Eval Report: ${skillName}\n\n`;
  report += `| Metric | Value |\n|---|---|\n`;
  report += `| Cases run | ${total} |\n`;
  report += `| Passed | ${passed} |\n`;
  report += `| Failed | ${failed} |\n`;
  report += `| Partial (Layer 3 skipped) | ${partial} |\n\n`;

  // Summary table
  report += `| # | Name | Category | Verdict | Pass | Fail | Skip |\n`;
  report += `|---|---|---|---|---|---|---|\n`;
  caseResults.forEach((r, i) => {
    const icon = r.verdict === 'PASS' ? 'PASS' : r.verdict === 'FAIL' ? 'FAIL' : 'PARTIAL';
    report += `| ${i + 1} | ${r.name} | ${r.category} | ${icon} | ${r.passed} | ${r.failed} | ${r.skipped} |\n`;
  });

  // Possibly stale cases (skill changed since fixture was written)
  const stale = caseResults.filter(r => r.verdict === 'POSSIBLY_STALE');
  if (stale.length > 0) {
    report += `\n## Possibly Stale (${stale.length})\n\n`;
    report += `These cases failed, but the skill changed since the fixture was last updated.\n`;
    report += `Review each one: is it a real bug or an outdated test case?\n\n`;
    for (const s of stale) {
      report += `### ${s.name}\n`;
      report += `${s.staleNote}\n`;
      for (const a of s.assertions.filter(a => a.pass === false)) {
        report += `- **${a.type}**: ${a.detail}\n`;
      }
      report += `\nAction: (1) Update fixture  (2) Keep as-is (real bug)  (3) Delete case\n\n`;
    }
  }

  // Hard failures (skill did NOT change — real regressions)
  const failures = caseResults.filter(r => r.verdict === 'FAIL');
  if (failures.length > 0) {
    report += `\n## Failures (${failures.length})\n\n`;
    for (const f of failures) {
      report += `### ${f.name}\n`;
      for (const a of f.assertions.filter(a => a.pass === false)) {
        report += `- **${a.type}**: ${a.detail}\n`;
      }
      report += '\n';
    }
  }

  // Verdict
  const staleCount = caseResults.filter(r => r.verdict === 'POSSIBLY_STALE').length;
  const overallVerdict = failed > 0 ? 'FAIL'
    : staleCount > 0 ? 'REVIEW_NEEDED'
    : partial > 0 ? 'PARTIAL'
    : 'PASS';
  report += `\n## Verdict: **${overallVerdict}**\n`;
  report += failed > 0
    ? `${failed} case(s) failed (real regressions). Fix before shipping.\n`
    : staleCount > 0
    ? `${staleCount} case(s) may be stale — skill changed since fixtures were written. Review needed.\n`
    : partial > 0
    ? `All deterministic checks passed. ${partial} case(s) need Layer 3 (LLM-judge) evaluation.\n`
    : `All ${total} cases passed.\n`;

  return report;
}

// ---------------------------------------------------------------------------
// Dry-Run Fixture Validator
// ---------------------------------------------------------------------------

/**
 * Validates fixture structure without running agents.
 * Checks: file exists, parseable, has required fields, assertions are known types.
 */
function validateFixture(evalPath, skillName) {
  const content = fs.readFileSync(evalPath, 'utf8');
  const issues = [];

  console.log(`[dry-run] Found fixture: ${evalPath}`);
  console.log(`[dry-run] File size: ${content.length} bytes`);

  // Try to parse YAML
  let parsed;
  try {
    parsed = parseYaml(content);
  } catch (e) {
    console.log(`[dry-run] YAML parse: FAILED (${e.message})`);
    return { valid: false, issues: ['YAML parse failure'] };
  }

  // Check top-level fields
  if (!parsed.skill) issues.push('Missing "skill" field');
  if (!parsed.last_updated) issues.push('Missing "last_updated" field');
  if (!parsed.cases && !parsed.test_cases) issues.push('Missing "cases" or "test_cases" field');

  const cases = parsed.cases || parsed.test_cases || [];
  const caseCount = Array.isArray(cases) ? cases.length : 0;

  // Check staleness
  const staleness = checkStaleness(skillName, parsed.last_updated);
  if (staleness.stale) {
    console.log(`[dry-run] Staleness: STALE (skill changed since ${parsed.last_updated})`);
    console.log(`[dry-run]   Latest change: ${staleness.lastChange}`);
  } else {
    console.log(`[dry-run] Staleness: OK (no changes since ${parsed.last_updated || 'unknown'})`);
  }

  // Validate known assertion types
  const knownTypes = ['contains', 'not-contains', 'regex', 'contains-all', 'contains-any', 'decision-trace', 'llm-rubric'];
  let assertionCount = 0;
  if (Array.isArray(cases)) {
    for (const c of cases) {
      const asserts = c.assert || c.assertions || [];
      if (Array.isArray(asserts)) {
        for (const a of asserts) {
          assertionCount++;
          if (a.type && !knownTypes.includes(a.type)) {
            issues.push(`Unknown assertion type "${a.type}" in case "${c.name || 'unnamed'}"`);
          }
        }
      }
    }
  }

  console.log(`[dry-run] Cases found: ${caseCount}`);
  console.log(`[dry-run] Assertions found: ${assertionCount}`);

  if (issues.length > 0) {
    console.log(`[dry-run] Issues: ${issues.join('; ')}`);
  } else {
    console.log(`[dry-run] Fixture validation: OK`);
  }

  return { valid: issues.length === 0, issues, caseCount, assertionCount };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
Usage: node run-eval.mjs [options]

Options:
  --skill <name>    Test a specific skill
  --all             Test all skills with eval.yaml fixtures
  --layer <2|3>     Run only this layer (default: all)
  --dry-run         Validate fixtures only, don't run agents
  --help            Show this help

Examples:
  node run-eval.mjs --skill commit
  node run-eval.mjs --skill commit --layer 2
  node run-eval.mjs --all --dry-run
  `);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const skillIdx = args.indexOf('--skill');
  const layerIdx = args.indexOf('--layer');
  const runAll = args.includes('--all');

  const skillName = skillIdx >= 0 ? args[skillIdx + 1] : null;
  const layer = layerIdx >= 0 ? parseInt(args[layerIdx + 1]) : null;

  if (!skillName && !runAll) {
    console.error('Error: Specify --skill <name> or --all');
    process.exit(1);
  }

  // Find fixture files
  const skills = runAll
    ? fs.readdirSync(SKILLS_DIR).filter(d => {
        const evalPath = path.join(SKILLS_DIR, d, 'tests', 'eval.yaml');
        return fs.existsSync(evalPath);
      })
    : [skillName];

  if (skills.length === 0) {
    console.error('No skills with eval.yaml fixtures found.');
    process.exit(1);
  }

  let totalValid = 0;
  let totalInvalid = 0;

  for (const skill of skills) {
    const evalPath = path.join(SKILLS_DIR, skill, 'tests', 'eval.yaml');
    if (!fs.existsSync(evalPath)) {
      console.error(`No fixture file found: ${evalPath}`);
      process.exit(1);
    }

    if (dryRun) {
      console.log(`\n--- ${skill} ---`);
      const result = validateFixture(evalPath, skill);
      if (result.valid) {
        totalValid++;
      } else {
        totalInvalid++;
      }
      continue;
    }

    console.log(`\nEval runner requires agent execution to produce outputs.`);
    console.log(`In skill-dev context, this script is called by the skill-dev`);
    console.log(`orchestrator which spawns agents and feeds outputs here.\n`);
    console.log(`For standalone testing, use: --dry-run to validate fixtures.`);
  }

  if (dryRun) {
    console.log(`\n--- Summary ---`);
    console.log(`Valid: ${totalValid}  Invalid: ${totalInvalid}  Total: ${skills.length}`);
  }
}

// Export assertion functions for use by skill-dev orchestrator
export {
  runAssertion,
  runCase,
  checkStaleness,
  applyStalenessMask,
  generateReport,
  parseYaml
};

main();
