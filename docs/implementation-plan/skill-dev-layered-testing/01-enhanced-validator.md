# Phase 01 — Enhanced Structural Validator

You are enhancing the existing `validate-skill.mjs` script for the skill-dev skill in the claude-blueprint project.

**Context:** The script at `.claude/skills/skill-dev/scripts/validate-skill.mjs` already validates YAML frontmatter (name, description, allowed-tools format). This phase adds new deterministic checks that catch issues the current script misses — things that were previously only caught by LLM agents reading the skill.

## Overview

- Add check: all markdown links in SKILL.md resolve to real files
- Add check: decision tables have explicit evaluation order ("first match wins" or similar)
- Add check: skills with `Bash(git commit:*)` or `Bash(git push:*)` in allowed-tools have a PreToolUse hook
- Add check: `allowed-tools` is under `metadata:` (not top-level)
- Add check: gotchas section present for non-trivial skills (>50 lines body)
- Add check: transition keywords ("offer to", "ask if", "then proceed") have matching outcome documentation
- Refactor existing checks into a modular structure (one function per check category)

## Steps

### 1. Read the existing script

**Files to modify:** `.claude/skills/skill-dev/scripts/validate-skill.mjs`

Read the current script to understand its structure, then refactor into modular check functions. The current script has all checks inline — split into:

```javascript
// Check categories — each returns { errors: [], warnings: [], info: [] }
function checkName(name, dirName) { ... }
function checkDescription(description) { ... }
function checkAllowedTools(metadata, body) { ... }
function checkBody(body, skillPath) { ... }
function checkReferences(body, skillPath) { ... }    // NEW
function checkDecisionTables(body) { ... }            // NEW
function checkSafetyHooks(metadata, body) { ... }     // NEW
function checkTransitions(body) { ... }               // NEW
```

### 2. Add reference file existence check

New function `checkReferences(body, skillPath)`:

```javascript
function checkReferences(body, skillPath) {
  const results = { errors: [], warnings: [], info: [] };

  // Find all markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(body)) !== null) {
    const linkText = match[1];
    const linkPath = match[2];

    // Skip external URLs and anchor links
    if (linkPath.startsWith('http') || linkPath.startsWith('#')) continue;

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
```

### 3. Add decision table evaluation order check

New function `checkDecisionTables(body)`:

```javascript
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
```

### 4. Add safety hook check for destructive tools

New function `checkSafetyHooks(metadata, body)`:

```javascript
function checkSafetyHooks(metadata, body) {
  const results = { errors: [], warnings: [], info: [] };
  const allowedTools = metadata?.['allowed-tools'] || '';

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

  const hasDestructiveTools = destructivePatterns.some(pattern =>
    allowedTools.includes(pattern)
  );

  if (hasDestructiveTools) {
    // Check if hooks section exists in frontmatter
    const hasHooks = body.includes('hooks:') &&
                     body.includes('PreToolUse:');
    // Also check if the YAML frontmatter has hooks
    const frontmatterHasHooks = metadata?.hooks?.PreToolUse;

    if (!hasHooks && !frontmatterHasHooks) {
      results.warnings.push(
        `Skill uses destructive tools (${destructivePatterns.filter(p => allowedTools.includes(p)).join(', ')}) ` +
        `but has no PreToolUse hook. Consider adding a safety guard.`
      );
    }
  }

  return results;
}
```

### 5. Add transition completeness check

New function `checkTransitions(body)`:

```javascript
function checkTransitions(body) {
  const results = { errors: [], warnings: [], info: [] };

  // Find transition phrases that imply a choice/prompt
  const transitionPatterns = [
    /(?:ask|offer|prompt).*?["']([^"']+)["']/gi,
    /(?:if.*?yes|if.*?no)\s*[→→]/gi,
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
```

### 6. Wire up new checks in main function

In the main validation function, call all new check functions and merge their results:

```javascript
// After existing checks...
const refResults = checkReferences(body, skillPath);
const tableResults = checkDecisionTables(body);
const hookResults = checkSafetyHooks(parsedMetadata, rawContent);
const transResults = checkTransitions(body);

// Merge results
errors.push(...refResults.errors, ...tableResults.errors, ...hookResults.errors, ...transResults.errors);
warnings.push(...refResults.warnings, ...tableResults.warnings, ...hookResults.warnings, ...transResults.warnings);
info.push(...refResults.info, ...tableResults.info, ...hookResults.info, ...transResults.info);
```

## Verification

```bash
# Test against a known-good skill
node .claude/skills/skill-dev/scripts/validate-skill.mjs .claude/skills/commit/

# Test against skill-dev itself (should find its own decision tables)
node .claude/skills/skill-dev/scripts/validate-skill.mjs .claude/skills/skill-dev/

# Test with a broken link (create a temp skill with a bad reference)
# Expect: error about broken link
```

Expected:
- commit skill: PASS with warnings about missing gotchas and safety hooks
- skill-dev skill: PASS with info about decision tables found
- No crashes or unhandled exceptions

## When done

Report: files modified (validate-skill.mjs), new checks added, verification results for 2+ skills, and any issues encountered.
