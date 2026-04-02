# Test Protocol

> Agent prompt template for simulating skill execution.

## Prompt Caching Strategy

All test agents in a run share the same skill content. To enable prompt caching (90% discount on repeated prefixes), the orchestrator **pre-loads** the skill content and embeds it in every agent prompt — agents must NOT re-read files themselves.

### How it works

1. **Before spawning any agents**, the orchestrator reads the target skill's SKILL.md + all references
2. The content is embedded in the `{skill_content_block}` placeholder below
3. Because every agent's prompt starts with the same skill content prefix, the API caches it after the first agent
4. Subsequent agents in the same run get the cached prefix at ~10% token cost

### Orchestrator pre-load step

Before Layer 2 begins, read all files in the target skill directory (excluding `tests/` and `.plugin-data/`). Format them as:

```
### {filename}
{file content}
```

Concatenate all formatted blocks into a single `{skill_content_block}`. This block is used verbatim in every agent prompt below.

## Agent Prompt Template

```
You are testing the `{skill_name}` skill by simulating execution with specific inputs.

THIS IS A DRY-RUN. Everything you need is in this prompt. Do not read any files.

## Skill Content

{skill_content_block}

## Simulated Inputs
{simulated_inputs}

## Instructions
1. Use ONLY the skill content above — do not call any tools
2. Follow the skill's workflow step by step with inputs above
3. At each decision point, show: Input → Rule matched → Result
4. Generate exact output the skill would produce
5. Flag: ambiguous instructions, multiple rule matches, no rule matches, inconsistencies

## Report Format

### Inputs
[List each input]

### Decision Trace
[Input → Rule → Result for each decision]

### Generated Output
[Exact file content that would be written]

### Settings Changes
[Key-value pairs]

### Issues Found
[Severity: Bug / Ambiguity / Gap — or "None"]

### Verdict
[PASS / FAIL / AMBIGUOUS]
```

## Review-Type Cases

When the test case simulates a **review** command (e.g., `/skill-dev review <skill>`), the agent must produce a realistic review report — not just trace the workflow. The standard template above is not sufficient for review cases.

**Additional instructions for review-type agents:**

```
## IMPORTANT: Review Simulation Rules

You are simulating a REVIEW of a real skill. You MUST:

1. READ the target skill file at {skill_path}/SKILL.md and all its references BEFORE writing any findings
2. Every finding MUST reference specific content from the file — cite the line, section, or exact text
3. NEVER use conditional language ("if the skill has...", "if this uses...") — you have the file, check it
4. Walk through EVERY section of CHECKLIST.md and state the result:
   - Metadata Validation: [each item — PASS/FAIL with evidence]
   - Structure: [each item]
   - Content Quality: [each item]
   - Decision Logic: [each item, or N/A if no decision tables]
   - Scripts: [each item, or N/A if no scripts]
   - Effectiveness: [each item]
5. For items that PASS, a one-line note is fine. For items that FAIL, explain what's wrong and how to fix it.

A review that says "could be improved" without saying how, or flags issues without verifying them, will FAIL the quality rubric.
```

**How to detect review-type cases:** If the test case's `inputs.command` contains the word `review`, or if the case's `assert` includes an `llm-rubric` with rubric name "Review Quality", use the review-specific prompt above in addition to the standard template.

## Judge Prompt Template

Layer 3 judges evaluate the **output** from a Layer 2 agent. The skill content is embedded in the judge prompt (same caching benefit), and the agent output is appended as unique content.

```
You are evaluating the quality of output from a skill test agent.

## Skill Content (pre-loaded for reference)

{skill_content_block}

## Agent Output to Evaluate

{agent_output}

## Rubric

{rubric_from_JUDGE_RUBRICS}

## Output Format

REASONING: [2-3 sentences per criterion]
VERDICT: PASS or FAIL
```

Because the `{skill_content_block}` is identical across all judge prompts in a run, it benefits from the same prompt cache as Layer 2 agents.

## Agent Model Selection

Use the cheapest model that can handle each layer's task. This compounds with prompt caching for significant cost savings.

| Layer | Default Model | When to Upgrade | Why |
|---|---|---|---|
| Layer 2 (Golden Dataset) | `haiku` | Use `sonnet` for review-type cases that need realistic report generation | Decision tracing is structured — haiku handles it well |
| Layer 3 (LLM Judge) | `sonnet` | Use `sonnet` always — judges need good reasoning for subjective evaluation | Haiku is too terse for quality rubric assessment |
| Layer 4 (Exploratory) | `sonnet` | Use `sonnet` always — discovery needs creativity and edge-case intuition | Haiku misses subtle ambiguities |

**How to set:** Pass `model: "haiku"` or `model: "sonnet"` when spawning each Agent. If omitted, agents inherit the parent's model (often `opus`), which is unnecessarily expensive for test agents.

**Cost comparison (relative to opus):**

| Model | Cost | Typical test run (12 L2 + 6 L3) |
|---|---|---|
| All opus (default) | 1× | Baseline |
| All sonnet | ~0.2× | ~80% savings |
| Haiku L2 + Sonnet L3 | ~0.1× | ~90% savings |

## Spawning

- Run independent scenarios in parallel (up to 4)
- Run state-dependent scenarios sequentially
- Each agent gets fresh context — no shared history
- **All agents in a run share the same skill content prefix** (pre-loaded by orchestrator)
- **Use the model specified in Agent Model Selection** — do not default to the parent model

## Input Format

Be explicit: `Q1 (Role): "Designer / PM"` not `"test with a beginner"`

Include existing state when relevant: `~/.claude/CLAUDE.md exists: yes/no`

## Scenario Naming

Use descriptive names: `happy-path-beginner`, `override-communication-style`, `boundary-designer-expert`
