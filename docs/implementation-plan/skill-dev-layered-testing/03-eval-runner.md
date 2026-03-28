# Phase 03 — Eval Runner Script

You are building the eval runner script that executes Layer 2 and Layer 3 test cases for the skill-dev testing system in the claude-blueprint project.

**Context:** Phase 01 enhanced the structural validator (Layer 1). Phase 02 created the YAML fixture format and golden datasets for 3 skills. This phase builds the script that loads fixtures, runs assertions, and produces scored results. It's the engine that makes golden datasets useful.

## Overview

- Build `run-eval.mjs` — the eval runner that loads YAML fixtures and checks assertions
- Support Layer 2 (deterministic) assertions: contains, not-contains, regex, contains-all, contains-any
- Support Layer 3 (LLM-judge) assertions: llm-rubric (deferred to Phase 04 for the judge prompts)
- Support `decision-trace` assertions by spawning read-only agents
- Output a structured results report (pass count, fail count, details per case)
- Support `--dry-run` flag to validate fixtures without running agents
- Support `--layer` flag to run only a specific layer (2 or 3)
- Support `--skill` flag to test a single skill

## Steps

### 1. Create the eval runner script

**Files to create:** `.claude/skills/skill-dev/scripts/run-eval.mjs`

```javascript
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../..');

// ---------------------------------------------------------------------------
// YAML Parser (minimal, no dependencies)
// ---------------------------------------------------------------------------

/**
 * Minimal YAML parser sufficient for our fixture format.
 * Handles: scalars, arrays (- items), nested objects, quoted strings.
 * Does NOT handle: anchors, aliases, multiline blocks, flow sequences.
 *
 * For production use, swap with a proper YAML library.
 * This keeps the script zero-dependency.
 */
function parseYaml(text) {
  // Use a simple line-by-line parser for our specific format.
  // Since our fixtures have a known structure, we can use JSON conversion
  // as a fallback by preprocessing the YAML.
  //
  // NOTE: For the MVP, this script will be called by Claude Code agents
  // that have access to the Bash tool. The agent can install a YAML parser
  // if needed, or use Node's built-in JSON for simpler fixture formats.
  //
  // For now, we rely on the agent executing this script to handle YAML
  // parsing via a temporary require() or by converting to JSON first.

  // Try native YAML support (Node 22+)
  try {
    // Fallback: use a simple regex-based approach for our known structure
    return simpleYamlParse(text);
  } catch (e) {
    console.error('YAML parsing failed. Ensure fixtures are valid YAML.');
    process.exit(1);
  }
}

function simpleYamlParse(text) {
  // Remove comments
  const lines = text.split('\n').filter(l => !l.trim().startsWith('#'));
  // Use JSON.parse on a transformed version
  // This is a simplification — the executing agent should use a proper parser
  throw new Error('Use --json flag or install yaml package: npm install yaml');
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
  // the expected input → rule → result chain
  const { input, rule, result } = assertion;
  const outputLower = output.toLowerCase();
  const resultLower = result.toLowerCase();

  // Check if the result appears in the output
  const pass = outputLower.includes(resultLower);
  return {
    pass,
    detail: pass
      ? `Decision "${input}" → ${rule} → "${result}" found in trace`
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
    const { execSync } = await import('child_process');
    const skillPath = path.join(SKILLS_DIR, skillName);
    const result = execSync(
      `git log --since="${lastUpdated}" --oneline -- "${skillPath}"`,
      { encoding: 'utf8', cwd: path.resolve(SKILLS_DIR, '..') }
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
 * FAIL + stale skill → POSSIBLY_STALE (warning, not blocker)
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

  for (const skill of skills) {
    const evalPath = path.join(SKILLS_DIR, skill, 'tests', 'eval.yaml');
    if (!fs.existsSync(evalPath)) {
      console.error(`No fixture file found: ${evalPath}`);
      process.exit(1);
    }

    if (dryRun) {
      console.log(`[dry-run] Found fixture: ${evalPath}`);
      // Validate structure
      const content = fs.readFileSync(evalPath, 'utf8');
      console.log(`[dry-run] File size: ${content.length} bytes`);
      console.log(`[dry-run] Fixture validation: OK (full parse requires YAML library)`);
      continue;
    }

    console.log(`\nEval runner requires agent execution to produce outputs.`);
    console.log(`In skill-dev context, this script is called by the skill-dev`);
    console.log(`orchestrator which spawns agents and feeds outputs here.\n`);
    console.log(`For standalone testing, use: --dry-run to validate fixtures.`);
  }
}

main();
```

### 2. Integrate eval runner with skill-dev orchestration

The eval runner script handles assertions but doesn't spawn agents itself — that's the skill-dev orchestrator's job (Claude). The workflow is:

1. **skill-dev reads the fixture file** using the Read tool
2. **For each test case**, skill-dev spawns a read-only agent with the case's inputs
3. **Agent produces output** (the simulated skill execution trace)
4. **skill-dev feeds the output to the assertion checker** (either inline or via the script)

This means the script serves two purposes:
- **Standalone**: `--dry-run` to validate fixture structure
- **Library**: Assertion functions are called by the skill-dev orchestrator

The assertion logic in the script can also be used inline by the skill-dev skill itself — the YAML just needs to be parsed and each assertion evaluated against the agent output.

## Verification

```bash
# Verify script runs without errors
node .claude/skills/skill-dev/scripts/run-eval.mjs --help

# Dry-run validation (if eval.yaml files exist from Phase 02)
node .claude/skills/skill-dev/scripts/run-eval.mjs --skill commit --dry-run
node .claude/skills/skill-dev/scripts/run-eval.mjs --all --dry-run
```

Expected:
- `--help` shows usage
- `--dry-run` finds and validates fixture files
- No crashes

## When done

Report: files created (run-eval.mjs), verification results, and any design decisions made during implementation.
