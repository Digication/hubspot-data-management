#!/usr/bin/env node
/**
 * Skill Validator - Validates skills against the specification.
 *
 * Usage:
 *   node validate-skill.mjs /path/to/skill/
 *   node validate-skill.mjs /path/to/skill/SKILL.md
 */

import fs from 'node:fs';
import path from 'node:path';

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(msg) {
    this.errors.push(`ERROR: ${msg}`);
  }

  addWarning(msg) {
    this.warnings.push(`WARNING: ${msg}`);
  }

  addInfo(msg) {
    this.info.push(`INFO: ${msg}`);
  }

  get passed() {
    return this.errors.length === 0;
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('SKILL VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.errors.length > 0) {
      console.log('\nERRORS (must fix):');
      this.errors.forEach(e => console.log(`  ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log('\nWARNINGS (should fix):');
      this.warnings.forEach(w => console.log(`  ${w}`));
    }

    if (this.info.length > 0) {
      console.log('\nINFO:');
      this.info.forEach(i => console.log(`  ${i}`));
    }

    console.log('\n' + '-'.repeat(60));
    console.log(this.passed ? 'VALIDATION PASSED' : 'VALIDATION FAILED');
    console.log('-'.repeat(60) + '\n');
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return [null, content];
  }

  const endMatch = content.slice(3).match(/\n---\s*\n/);
  if (!endMatch) {
    return [null, content];
  }

  const frontmatterText = content.slice(3, endMatch.index + 3);
  const body = content.slice(endMatch.index + endMatch[0].length + 3);

  const frontmatter = {};
  let currentParent = null;
  frontmatterText.split('\n').forEach(line => {
    if (line.startsWith('#') || line.trim() === '') {
      currentParent = null;
      return;
    }

    const indented = line.match(/^(\s+)(\S.*)$/);
    if (indented && currentParent) {
      // Nested key under current parent (e.g., metadata.allowed-tools)
      const nested = indented[2];
      if (nested.includes(':')) {
        const colonIndex = nested.indexOf(':');
        const key = nested.slice(0, colonIndex).trim();
        let value = nested.slice(colonIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (typeof frontmatter[currentParent] !== 'object') {
          frontmatter[currentParent] = {};
        }
        frontmatter[currentParent][key] = value;
      }
      return;
    }

    line = line.trim();
    if (line.includes(':') && !line.startsWith('#')) {
      const colonIndex = line.indexOf(':');
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      if (value === '') {
        // Parent key with nested children (e.g., metadata:)
        currentParent = key;
        frontmatter[key] = {};
        return;
      }

      currentParent = null;
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  });

  return [frontmatter, body];
}

// ---------------------------------------------------------------------------
// Check functions — each returns { errors: [], warnings: [], info: [] }
// ---------------------------------------------------------------------------

function checkName(name, dirName) {
  const results = { errors: [], warnings: [], info: [] };

  if (!name) {
    results.errors.push('name field is required but missing');
    return results;
  }

  if (name.length > 64) {
    results.errors.push(`name exceeds 64 characters (has ${name.length})`);
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    results.errors.push('name must contain only lowercase letters, numbers, and hyphens');
  }

  if (name.startsWith('-')) results.errors.push('name cannot start with a hyphen');
  if (name.endsWith('-')) results.errors.push('name cannot end with a hyphen');
  if (name.includes('--')) results.errors.push('name cannot contain consecutive hyphens');

  if (name !== dirName) {
    results.errors.push(`name '${name}' must match parent directory '${dirName}'`);
  }

  return results;
}

function checkDescription(description) {
  const results = { errors: [], warnings: [], info: [] };

  if (!description) {
    results.errors.push('description field is required but missing');
    return results;
  }

  if (description.length > 1024) {
    results.errors.push(`description exceeds 1024 characters (has ${description.length})`);
  }

  if (description.length < 50) {
    results.warnings.push('description seems too short - consider adding more detail');
  }

  const descLower = description.toLowerCase();

  for (const phrase of ['i can', 'i will', 'i help', "i'm"]) {
    if (descLower.includes(phrase)) {
      results.warnings.push(`description uses first person ('${phrase}') - prefer third person`);
      break;
    }
  }

  const triggerPhrases = ['use when', 'use for', 'use this', 'when the user', 'if the user', 'when asked', 'trigger on'];
  if (!triggerPhrases.some(phrase => descLower.includes(phrase))) {
    results.warnings.push("description should include 'when to use' indicators for discovery");
  }

  // Check if description reads like a summary vs trigger phrases
  const sentences = description.split(/[.!]/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
  if (sentences.length <= 2 && avgSentenceLen > 15) {
    results.warnings.push('description may be a summary rather than trigger phrases - consider listing specific phrases users might say');
  }

  return results;
}

function checkAllowedTools(metadata) {
  const results = { errors: [], warnings: [], info: [] };

  // Check in both top-level and nested metadata
  const tools = metadata['allowed-tools']
    || (metadata.metadata && metadata.metadata['allowed-tools'])
    || '';

  if (!tools) return results;

  // Flag bare "Bash" without command restriction
  const toolList = tools.split(',').map(t => t.trim());
  for (const tool of toolList) {
    if (tool === 'Bash') {
      results.warnings.push('allowed-tools includes bare "Bash" (too permissive) - use Bash(command:*) for specific commands');
    }
  }

  return results;
}

function checkBody(body) {
  const results = { errors: [], warnings: [], info: [] };

  const lineCount = body.split('\n').length;
  results.info.push(`SKILL.md body has ${lineCount} lines`);

  if (lineCount > 500) {
    results.warnings.push(`SKILL.md has ${lineCount} lines - consider keeping under 500`);
  }

  // Check for Gotchas section
  if (/^##\s+Gotchas/m.test(body)) {
    results.info.push('Gotchas section found');
  } else {
    results.warnings.push('No ## Gotchas section found - consider adding real failure patterns Claude has hit');
  }

  return results;
}

function checkReferences(body, skillPath) {
  const results = { errors: [], warnings: [], info: [] };

  // Find all markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const linkText = match[1];
    const linkPath = match[2];

    // Skip external URLs, anchor links, and shell variable references
    if (linkPath.startsWith('http') || linkPath.startsWith('#') || linkPath.startsWith('$')) continue;

    // Resolve relative to skill directory
    const resolvedPath = path.resolve(path.dirname(skillPath), linkPath);

    if (!fs.existsSync(resolvedPath)) {
      results.errors.push(
        `Broken link: [${linkText}](${linkPath}) — file not found at ${resolvedPath}`
      );
    }
  }

  return results;
}

function checkDecisionTables(body) {
  const results = { errors: [], warnings: [], info: [] };

  // Detect markdown tables (lines starting with |)
  const lines = body.split('\n');
  const tables = [];
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!currentTable) {
        currentTable = { startLine: i + 1, rows: [] };
      }
      currentTable.rows.push(line);
    } else if (currentTable) {
      // Check if table has enough rows to be a decision table (header + separator + 2+ data rows)
      if (currentTable.rows.length >= 4) {
        tables.push(currentTable);
      }
      currentTable = null;
    }
  }
  // Don't forget the last table if file ends with one
  if (currentTable && currentTable.rows.length >= 4) {
    tables.push(currentTable);
  }

  if (tables.length > 0) {
    results.info.push(`Found ${tables.length} table(s) with 2+ data rows`);

    // Check if body contains evaluation order keywords near any table
    const orderKeywords = [
      'first match wins',
      'top to bottom',
      'evaluated in order',
      'precedence',
      'priority order',
      'first matching',
      'evaluation order'
    ];

    const hasOrderSpec = orderKeywords.some(kw =>
      body.toLowerCase().includes(kw)
    );

    if (!hasOrderSpec && tables.length > 0) {
      results.warnings.push(
        `${tables.length} decision table(s) found but no evaluation order specified. ` +
        `Add "first match wins" or similar near tables that represent decision logic.`
      );
    }
  }

  return results;
}

function checkSafetyHooks(metadata, body) {
  const results = { errors: [], warnings: [], info: [] };
  const allowedTools = metadata?.metadata?.['allowed-tools'] || metadata?.['allowed-tools'] || '';

  // Destructive git patterns that should have hooks
  const destructivePatterns = [
    'git commit',
    'git push',
    'git checkout --',
    'git clean',
    'git reset --hard',
    'rm -rf',
    'rm -r'
  ];

  const matchedPatterns = destructivePatterns.filter(pattern =>
    allowedTools.includes(pattern)
  );

  if (matchedPatterns.length > 0) {
    // Check if hooks section exists in body
    const hasHooks = body.includes('hooks:') &&
                     body.includes('PreToolUse:');
    // Also check if the parsed frontmatter has hooks
    const frontmatterHasHooks = metadata?.hooks?.PreToolUse;

    if (!hasHooks && !frontmatterHasHooks) {
      results.warnings.push(
        `Skill uses destructive tools (${matchedPatterns.join(', ')}) ` +
        `but has no PreToolUse hook. Consider adding a safety guard.`
      );
    }
  }

  return results;
}

function checkTransitions(body) {
  const results = { errors: [], warnings: [], info: [] };

  // Find transition phrases that imply a choice/prompt
  const transitionPatterns = [
    /(?:ask|offer|prompt).*?["']([^"']+)["']/gi,
    /(?:if.*?yes|if.*?no)\s*[→>]/gi,
    /\(yes\/no\)/gi,
    /want to:.*?\n(?:\s*\([0-9]\)|\s*-\s)/gi
  ];

  let transitionCount = 0;
  for (const pattern of transitionPatterns) {
    const matches = body.match(pattern);
    if (matches) transitionCount += matches.length;
  }

  if (transitionCount > 0) {
    results.info.push(`Found ${transitionCount} transition/prompt point(s)`);

    // Check for unmatched "if yes" without corresponding "if no"
    const yesCount = (body.match(/if\s+\*?\*?yes\*?\*?\s*[→:—]/gi) || []).length;
    const noCount = (body.match(/if\s+\*?\*?no\*?\*?\s*[→:—]/gi) || []).length;

    if (yesCount > 0 && noCount === 0) {
      results.warnings.push(
        `Found ${yesCount} "if yes" transition(s) but no corresponding "if no" path. ` +
        `Specify what happens when the user declines.`
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Structure check (directory layout)
// ---------------------------------------------------------------------------

function checkStructure(skillDir) {
  const results = { errors: [], warnings: [], info: [] };

  for (const dirName of ['scripts', 'references', 'assets']) {
    const dirPath = path.join(skillDir, dirName);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      results.info.push(`Found ${dirName}/ directory`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helper: merge a plain {errors, warnings, info} result into ValidationResult
// ---------------------------------------------------------------------------

function mergeInto(result, checks) {
  checks.errors.forEach(e => result.addError(e));
  checks.warnings.forEach(w => result.addWarning(w));
  checks.info.forEach(i => result.addInfo(i));
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

function computeStats(skillDir) {
  const stats = {
    skillMd: { lines: 0, chars: 0, tokens: 0 },
    references: { count: 0, chars: 0, tokens: 0, files: [] },
    scripts: { count: 0, chars: 0, files: [] },
    tests: { caseCount: 0, rubricCount: 0, hasEvalYaml: false },
    totals: { instructionChars: 0, instructionTokens: 0, allFiles: 0 },
    complexity: { decisionTables: 0, transitions: 0, gotchas: false, sections: 0 }
  };

  // SKILL.md
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    stats.skillMd.lines = content.split('\n').length;
    stats.skillMd.chars = content.length;
    stats.skillMd.tokens = Math.ceil(content.length / 4);
    stats.totals.allFiles++;

    // Complexity from SKILL.md
    const tableMatches = content.match(/\|[^|]+\|[^|]+\|[^|]+\|/g);
    // Count distinct table blocks (groups of consecutive | rows)
    let inTable = false;
    for (const line of content.split('\n')) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) { stats.complexity.decisionTables++; inTable = true; }
      } else {
        inTable = false;
      }
    }

    const transitionPatterns = [
      /(?:ask|offer|prompt).*?["']([^"']+)["']/gi,
      /\(yes\/no\)/gi
    ];
    for (const pattern of transitionPatterns) {
      const matches = content.match(pattern);
      if (matches) stats.complexity.transitions += matches.length;
    }

    stats.complexity.gotchas = /## Gotchas/i.test(content);
    const sectionMatches = content.match(/^##\s/gm);
    stats.complexity.sections = sectionMatches ? sectionMatches.length : 0;
  }

  // References — only .md files (agents read these as instructions)
  // Non-.md files (e.g., viewer-template.html) are assets used by scripts, not loaded by agents
  const refsDir = path.join(skillDir, 'references');
  if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
    for (const file of fs.readdirSync(refsDir)) {
      const filePath = path.join(refsDir, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        stats.references.count++;
        stats.references.chars += content.length;
        stats.references.files.push({ name: file, chars: content.length, tokens: Math.ceil(content.length / 4) });
        stats.totals.allFiles++;
      }
    }
    stats.references.tokens = Math.ceil(stats.references.chars / 4);
  }

  // Scripts
  const scriptsDir = path.join(skillDir, 'scripts');
  if (fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory()) {
    for (const file of fs.readdirSync(scriptsDir)) {
      const filePath = path.join(scriptsDir, file);
      if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        stats.scripts.count++;
        stats.scripts.chars += content.length;
        stats.scripts.files.push({ name: file, chars: content.length });
        stats.totals.allFiles++;
      }
    }
  }

  // Tests
  const evalYamlPath = path.join(skillDir, 'tests', 'eval.yaml');
  if (fs.existsSync(evalYamlPath)) {
    stats.tests.hasEvalYaml = true;
    const content = fs.readFileSync(evalYamlPath, 'utf-8');
    const caseMatches = content.match(/^\s*- name:/gm);
    stats.tests.caseCount = caseMatches ? caseMatches.length : 0;
    const rubricMatches = content.match(/type:\s*llm-rubric/g);
    stats.tests.rubricCount = rubricMatches ? rubricMatches.length : 0;
  }

  // Totals — instruction size = SKILL.md + references (what agents must load)
  stats.totals.instructionChars = stats.skillMd.chars + stats.references.chars;
  stats.totals.instructionTokens = Math.ceil(stats.totals.instructionChars / 4);

  return stats;
}

function printStats(skillDir, stats) {
  const name = path.basename(skillDir);
  console.log('\n' + '='.repeat(60));
  console.log(`SKILL STATS: ${name}`);
  console.log('='.repeat(60));

  console.log('\n── Instruction Size (what agents load) ──');
  console.log(`  SKILL.md:        ${stats.skillMd.chars.toLocaleString()} chars  (~${stats.skillMd.tokens.toLocaleString()} tokens, ${stats.skillMd.lines} lines)`);
  if (stats.references.count > 0) {
    console.log(`  References:      ${stats.references.chars.toLocaleString()} chars  (~${stats.references.tokens.toLocaleString()} tokens, ${stats.references.count} files)`);
    for (const f of stats.references.files) {
      console.log(`    ${f.name}: ${f.chars.toLocaleString()} chars (~${f.tokens.toLocaleString()} tokens)`);
    }
  } else {
    console.log('  References:      (none)');
  }
  console.log(`  ────────────────`);
  console.log(`  Total:           ${stats.totals.instructionChars.toLocaleString()} chars  (~${stats.totals.instructionTokens.toLocaleString()} tokens)`);

  if (stats.scripts.count > 0) {
    console.log(`\n── Scripts (not loaded by agents) ──`);
    console.log(`  ${stats.scripts.count} files, ${stats.scripts.chars.toLocaleString()} chars`);
  }

  console.log('\n── Complexity ──');
  console.log(`  Sections:        ${stats.complexity.sections}`);
  console.log(`  Decision tables: ${stats.complexity.decisionTables}`);
  console.log(`  Transitions:     ${stats.complexity.transitions}`);
  console.log(`  Gotchas section: ${stats.complexity.gotchas ? 'yes' : 'no'}`);

  if (stats.tests.hasEvalYaml) {
    console.log('\n── Test Coverage ──');
    console.log(`  Test cases:      ${stats.tests.caseCount}`);
    console.log(`  LLM rubrics:     ${stats.tests.rubricCount}`);
    // Estimate test cost
    const l2Agents = stats.tests.caseCount;
    const l3Agents = stats.tests.rubricCount * 2; // 2+1 strategy, best case
    const totalAgents = l2Agents + l3Agents;
    const estTokens = (totalAgents * stats.totals.instructionTokens) + (totalAgents * 500); // prefix + unique
    console.log(`  Est. agents:     ${totalAgents} (L2: ${l2Agents}, L3: ~${l3Agents})`);
    console.log(`  Est. tokens:     ~${estTokens.toLocaleString()} (without caching)`);
  }

  // Warnings
  const warnings = [];
  if (stats.totals.instructionTokens > 20000) {
    warnings.push(`Instruction size (${stats.totals.instructionTokens.toLocaleString()} tokens) is large — agents will be slow and expensive. Consider splitting references.`);
  } else if (stats.totals.instructionTokens > 10000) {
    warnings.push(`Instruction size (${stats.totals.instructionTokens.toLocaleString()} tokens) is moderate — prompt caching is important for test runs.`);
  }
  if (stats.complexity.decisionTables > 8) {
    warnings.push(`${stats.complexity.decisionTables} decision tables — this skill is complex. Ensure test coverage matches.`);
  }
  if (stats.tests.hasEvalYaml && stats.tests.caseCount < stats.complexity.decisionTables) {
    warnings.push(`Fewer test cases (${stats.tests.caseCount}) than decision tables (${stats.complexity.decisionTables}) — coverage may be incomplete.`);
  }

  if (warnings.length > 0) {
    console.log('\n── Warnings ──');
    for (const w of warnings) {
      console.log(`  ⚠️  ${w}`);
    }
  }

  console.log('\n' + '-'.repeat(60));

  // Output JSON for programmatic use
  return stats;
}

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

function validateSkill(skillPath) {
  const result = new ValidationResult();
  let resolvedPath = path.resolve(skillPath);

  const stat = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;
  let skillDir, skillMd;

  if (stat && stat.isFile() && path.basename(resolvedPath) === 'SKILL.md') {
    skillDir = path.dirname(resolvedPath);
    skillMd = resolvedPath;
  } else if (stat && stat.isDirectory()) {
    skillDir = resolvedPath;
    skillMd = path.join(resolvedPath, 'SKILL.md');
  } else {
    result.addError(`Invalid path: ${skillPath}`);
    return result;
  }

  if (!fs.existsSync(skillMd)) {
    result.addError(`SKILL.md not found in ${skillDir}`);
    return result;
  }

  result.addInfo(`Validating: ${skillDir}`);

  let content;
  try {
    content = fs.readFileSync(skillMd, 'utf-8');
  } catch (e) {
    result.addError(`Failed to read SKILL.md: ${e.message}`);
    return result;
  }

  const [frontmatter, body] = parseFrontmatter(content);

  if (frontmatter === null) {
    result.addError('SKILL.md must start with YAML frontmatter (---)');
    return result;
  }

  const dirName = path.basename(skillDir);

  // Run all checks and merge results
  mergeInto(result, checkName(frontmatter.name || '', dirName));
  mergeInto(result, checkDescription(frontmatter.description || ''));
  mergeInto(result, checkAllowedTools(frontmatter));
  mergeInto(result, checkBody(body));
  mergeInto(result, checkReferences(body, skillMd));
  mergeInto(result, checkDecisionTables(body));
  mergeInto(result, checkSafetyHooks(frontmatter, content));
  mergeInto(result, checkTransitions(body));
  mergeInto(result, checkStructure(skillDir));

  return result;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node validate-skill.mjs /path/to/skill/');
    console.log('       node validate-skill.mjs --stats /path/to/skill/');
    console.log('       node validate-skill.mjs --stats --json /path/to/skill/');
    process.exit(1);
  }

  const isStats = args.includes('--stats');
  const isJson = args.includes('--json');
  const skillPath = args.filter(a => !a.startsWith('--'))[0];

  if (!skillPath) {
    console.log('Error: No skill path provided');
    process.exit(1);
  }

  if (isStats) {
    let resolvedPath = path.resolve(skillPath);
    const stat = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;
    let skillDir;
    if (stat && stat.isFile() && path.basename(resolvedPath) === 'SKILL.md') {
      skillDir = path.dirname(resolvedPath);
    } else if (stat && stat.isDirectory()) {
      skillDir = resolvedPath;
    } else {
      console.log(`Error: Invalid path: ${skillPath}`);
      process.exit(1);
    }
    const stats = computeStats(skillDir);
    if (isJson) {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      printStats(skillDir, stats);
    }
    process.exit(0);
  }

  const result = validateSkill(skillPath);
  result.printReport();
  process.exit(result.passed ? 0 : 1);
}

main();
