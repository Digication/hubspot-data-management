# Domain Templates

Pre-built optimization templates for common domains. Each template includes a rubric, collection method, and expected results.

## Available Templates

### Tier 1: Quick Wins (20–30 min, highest ROI)

| Domain | Time | Expected Improvement | What It Optimizes |
|---|---|---|---|
| `error-messages` | 20 min | +200% | Clarity, completeness, actionability of error text |
| `help-text` | 20 min | +150% | Tooltips, inline help, guidance text |
| `code-comments` | 30 min | +250% | Function docs, inline comments, module headers |
| `onboarding-docs` | 30 min | +50% | Getting-started guides, READMEs, setup instructions |
| `changelog` | 20 min | +167% | Release notes, changelogs, version descriptions |

### Tier 2: Standard Domains

| Domain | What It Optimizes |
|---|---|
| `documentation` | General docs, guides, reference material |
| `api-specs` | API documentation, endpoint descriptions, request/response examples |
| `validation-rules` | Input validation messages, form error text |
| `cli-help` | Command-line help text, usage strings, flag descriptions |
| `logging` | Log messages, structured log formats |

### Tier 3: Specialized

| Domain | What It Optimizes |
|---|---|
| `test-names` | Test descriptions, assertion messages |
| `config-docs` | Configuration file documentation |
| `migration-notes` | Database/API migration guides |
| `security-messages` | Auth errors, permission denials, security warnings |

## Template Structure

Each template provides:
1. **Collection method** — How to find targets in your codebase (e.g., `grep -r "throw new Error" src/`)
2. **Rubric** — Evaluation criteria specific to the domain
3. **Before/after examples** — Concrete examples of improvements
4. **Expected metrics** — Typical improvement ranges

## Template & Rubric Behavior

- Templates are **type-based** (apply to all error messages, all help text, etc.), not file-based
- When the user specifies a domain (e.g., "optimize our error messages"), the template automatically applies its domain rubric to all matching patterns in the codebase
- To override: the user can provide their own rubric file (e.g., "use my-rubric.md instead")
- Default rubric is always used unless the user explicitly provides a custom rubric

## Detailed Template: Error Messages

**Collection method:** Use the Grep tool to search for error patterns: `throw new Error`, `new Error`, `.error(` in the `src/` directory. Collect all matching files and extract the error message strings for evaluation.

**Rubric criteria:**
- **Clarity** (0–10): Does the user understand what went wrong?
- **Completeness** (0–10): Does it explain why it happened?
- **Actionability** (0–10): Does it tell the user how to fix it?

**Before/after example:**
```
Before: "Invalid input"
After:  "Email address is invalid (expected format: user@example.com)"

Before: "Auth failed"
After:  "Password incorrect. Reset at /forgot-password"

Before: "Error: 403"
After:  "You don't have permission to access this resource. Contact your admin to request access."
```

**Typical results:** 2/10 → 6/10 clarity (+200%) in 1–2 cycles

## Detailed Template: Help Text & Tooltips

**Collection method:** Use the Grep tool to search for help text patterns: `tooltip`, `helpText`, `description:` in the `src/` directory. Collect matching files and extract the help text strings.

**Rubric criteria:**
- **Brevity** (0–10): Is it concise enough to scan?
- **Clarity** (0–10): Does it explain the feature simply?
- **Actionability** (0–10): Does it tell the user what to do?

**Before/after example:**
```
Before: "Configure settings"
After:  "Choose how often you receive email notifications (daily, weekly, or never)"
```

**Typical results:** 3/10 → 7/10 (+133%) in 1 cycle

## Detailed Template: Code Comments

**Collection:** Functions with missing or unclear JSDoc/docstrings

**Rubric criteria:**
- **Purpose** (0–10): Does the comment explain WHY, not just WHAT?
- **Accuracy** (0–10): Does it match the current code?
- **Completeness** (0–10): Are params, returns, and edge cases documented?

**Before/after example:**
```
Before: // process data
After:  // Transform raw API response into the format expected by the dashboard charts.
        // Filters out entries older than 30 days and groups by category.
```

**Typical results:** 2/10 → 7/10 (+250%) in 1–2 cycles

## Fallback for Templates Without Full Detail

Only `error-messages`, `help-text`, and `code-comments` have complete definitions above. For all other domains, use this fallback process:

1. **Collection method:** Use the Grep tool to search for patterns relevant to the domain:
   | Domain | Search patterns | Target directory |
   |---|---|---|
   | `onboarding-docs` | Files matching `README*`, `GETTING_STARTED*`, `SETUP*`, `INSTALL*` | project root, `docs/` |
   | `changelog` | Files matching `CHANGELOG*`, `RELEASES*`, `HISTORY*` | project root |
   | `documentation` | `*.md` files | `docs/` |
   | `api-specs` | `openapi`, `swagger`, `paths:`, `endpoints` | `docs/`, `api/`, `spec/` |
   | `validation-rules` | `validate`, `ValidationError`, `is_valid`, `zod`, `yup` | `src/` |
   | `cli-help` | `usage:`, `--help`, `commander`, `yargs`, `clap`, `argparse` | `src/`, `cli/` |
   | `logging` | `logger.`, `console.log`, `log.info`, `logging.` | `src/` |
   | `test-names` | `describe(`, `it(`, `test(`, `#[test]`, `def test_` | `test/`, `tests/`, `__tests__/`, `spec/` |
   | `config-docs` | Files matching `*.config.*`, `.env.example`, `config/README*` | project root, `config/` |
   | `migration-notes` | Files matching `MIGRATION*`, `UPGRADE*`, `migrations/` | project root, `docs/` |
   | `security-messages` | `403`, `401`, `Forbidden`, `Unauthorized`, `permission`, `denied` | `src/` |

2. **Rubric:** Generate a fresh rubric using the [Rubric Generation Protocol](RUBRIC_PROTOCOL.md) with the domain name as context. The protocol's Stakeholder Analysis and Failure Mode Analysis steps will produce appropriate dimensions for any domain.

3. **Before/after examples:** Generate one example during the discover phase based on the worst-scoring item found.

## Using Templates

Users request templates conversationally. Examples of what they might say:

- "what templates are available?" — List all templates grouped by tier
- "show me the error messages template" — Preview that template's rubric, examples, and expected results
- "optimize our error messages" — Start the full optimization cycle using the error-messages template
- "optimize help text with a custom rubric" — Start optimization using the help-text template but with a user-provided rubric
