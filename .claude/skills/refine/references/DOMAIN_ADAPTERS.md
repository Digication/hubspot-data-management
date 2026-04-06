# Domain Adapters

Domain-specific configuration for the Refine engine. Each adapter tells the engine how to find, evaluate, and improve a specific type of artifact across multiple files.

## The Adapter Contract

Every domain adapter follows this structure:

```
Domain Adapter:
  Name:             <identifier>
  Description:      <what this domain covers>
  Audience:         <who encounters the output>
  Risk level:       LOW | MEDIUM | HIGH
  Collection:       <how to find matching files/content>
  Rubric:           <dimensions with 0/5/10 anchors>
  Pre-checks:       <deterministic checks to run before LLM evaluation>
  Apply strategy:   per-file | per-instance | whole-file
  Examples:         <before/after for each dimension>
```

Adding a new domain = filling in this template. No engine knowledge required.

## Built-In Adapters

### error-messages

**Description:** Error messages scattered across code — user-facing, developer-facing, and log messages.

**Audience:** Developer + end user

**Risk level:** MEDIUM

**Collection:**
```
grep patterns in src/:
  - throw new Error(
  - .status(4xx)
  - .status(5xx)
  - ValidationError
  - new AppError(
  - res.json({ error:
```

**Rubric (6 dimensions):**

| Dimension | 0/10 | 5/10 | 10/10 |
|---|---|---|---|
| Clarity | "Error" | "Invalid input" | "Email must be a valid address (got: empty string)" |
| Runtime Context | No variable data | Has the field name | Has field name, received value, and expected format |
| Actionability | No guidance | "Try again" | "Check the email format and resubmit — must contain @ and a domain" |
| Log Distinguishability | Same message for 5 errors | Unique per handler | Unique per handler + includes error code (ERR_AUTH_001) |
| Consistency | Random format | Same structure, different wording | Same structure, same wording patterns, same error code format |
| Information Safety | Leaks stack traces/IDs | Leaks internal paths | No internal details exposed; sensitive values masked |

**Pre-checks:** Duplicate message detection, stack trace exposure scan.

**Apply strategy:** per-instance (each error message is independent).

### documentation

**Description:** Markdown documentation files — READMEs, guides, tutorials, reference docs.

**Audience:** Human reader (default) or developer

**Risk level:** LOW

**Collection:**
```
glob patterns:
  - docs/**/*.md
  - README.md
  - CONTRIBUTING.md
  - CHANGELOG.md
```

**Rubric (6 dimensions):**

| Dimension | 0/10 | 5/10 | 10/10 |
|---|---|---|---|
| Clarity | Jargon-heavy, no definitions | Clear but verbose | Plain language, scannable, jargon defined on first use |
| Completeness | Missing critical sections | Has basics, gaps in edge cases | All sections present, edge cases covered, prerequisites listed |
| Accuracy | Outdated commands/paths | Mostly correct, some stale refs | Every command tested, every path verified, every link works |
| Scannability | Wall of text | Some headings | Clear hierarchy, TOC, code blocks, bullet points for lists |
| Prerequisites | None listed | Partial list | Complete with versions, links, and verification commands |
| Troubleshooting | None | FAQ section | Common errors with solutions, diagnostic commands, escalation path |

**Pre-checks:** Broken links, heading hierarchy, empty sections, image references.

**Apply strategy:** per-file.

### skill-files

**Description:** Claude Code skill files (SKILL.md) — instructions for AI agents.

**Audience:** AI agent

**Risk level:** MEDIUM

**Collection:**
```
glob: .claude/skills/*/SKILL.md
```

**Rubric (7 dimensions):**

| Dimension | 0/10 | 5/10 | 10/10 |
|---|---|---|---|
| Unambiguity | Prose that can be interpreted multiple ways | Mostly clear, some ambiguous phrases | Decision tables, explicit conditions, no room for interpretation |
| Completeness | Missing phases or error handling | Core flow covered, gaps in edge cases | Every phase, every error, every edge case documented |
| Phase Sequencing | Unclear order, missing transitions | Phases listed but transitions implicit | Explicit flow with decision points and conditions for each transition |
| Error Recovery | No error handling | Generic "handle errors" | Per-phase error recovery with specific fallback actions |
| Tool Usage | References tools but no parameters | Tool names with partial params | Exact tool calls with all parameters specified |
| Testability | No way to verify behavior | Some test scenarios | Concrete test scenarios with expected inputs and outputs |
| Human Interaction | No interaction points | Some prompts | Every human touchpoint specified with exact prompt format and options |

**Pre-checks:** Required section presence (Entry Point, Phases, Error Handling), AskUserQuestion format validation.

**Apply strategy:** per-file.

## Creating Custom Adapters

Users can define custom adapters for their domain. The workflow:

1. User says "refine our [domain]" where [domain] doesn't match a built-in adapter
2. Ask: "I don't have a built-in template for [domain]. Want me to create one?"
3. If yes:
   - Ask for collection method (how to find matching files)
   - Run the Rubric Generation Protocol for the domain
   - Package as an adapter
   - Offer to save to `.claude/refine-adapters/<domain>.json`

### Custom Adapter Storage

```json
{
  "name": "email-templates",
  "description": "Transactional and marketing email templates",
  "audience": "end user + deliverability engineer",
  "risk_level": "MEDIUM",
  "collection": {
    "type": "glob",
    "patterns": ["templates/email/**/*.html", "templates/email/**/*.mjml"]
  },
  "rubric": {
    "dimensions": [
      {
        "name": "Clarity",
        "definition": "Subject + body communicate purpose in under 3 seconds",
        "anchors": {
          "0": "Unclear subject, buried CTA",
          "5": "Clear subject, CTA visible but not prominent",
          "10": "Subject matches content, single clear CTA above the fold"
        }
      }
    ]
  },
  "pre_checks": ["html_validation", "spam_trigger_scan"],
  "apply_strategy": "per-file"
}
```

## Domain Sweep Execution

When running a domain sweep:

1. **Collect:** Use the adapter's collection method to find all matching files
2. **Quick scan:** Categorize files by estimated issue density
3. **User constraints:** Ask if any files should be excluded ("skip security-facing messages")
4. **Single rubric:** Generate or load one rubric for the entire domain
5. **Batch processing:**
   - Process files in batches of 5-10
   - Prioritize worst files first
   - Cross-batch deduplication for pattern issues
6. **Batch proposals:** Group similar fixes across files ("Fix 14 generic error messages" as one proposal with examples)
7. **Apply:** Per the adapter's apply strategy

### User Constraint Handling

When the user excludes files or categories:
- Record the exclusion as a constraint annotation
- Filter collection results before processing
- Note excluded count: "47 matches found, 8 excluded per your filter → 39 to process"
