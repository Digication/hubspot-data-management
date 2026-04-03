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
- When you use `--domain=error-messages`, the template automatically applies its rubric to all matching patterns in your codebase
- To override: `optimize template --domain=error-messages --custom-rubric=my-rubric.md`
- Default rubric is always used unless you explicitly provide `--custom-rubric`

## Detailed Template: Error Messages

**Collection:** `grep -r "throw new Error\|new Error\|\.error(" src/`

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

**Collection:** `grep -r "tooltip\|helpText\|description:" src/`

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

## Using Templates

```
# List available templates
/optimize template --list

# Preview a template's rubric and examples
/optimize template --domain=error-messages --show

# Apply a template and start the optimization cycle
/optimize template --domain=error-messages --apply
```
