#!/usr/bin/env node

/**
 * extract-skill-usage.mjs
 *
 * Reads Claude Code session logs (.jsonl files) and extracts
 * everything related to skill usage.
 *
 * Usage:
 *   node extract-skill-usage.mjs <skill-name> [--all] [--raw]
 *   node extract-skill-usage.mjs --all-skills [--all]
 *
 * Options:
 *   --all          Process all sessions, even previously analyzed ones
 *   --raw          Output full events instead of summaries
 *   --all-skills   Scan all skills at once, friction-focused output
 *
 * Output: JSON summary of skill usage across sessions
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// --- Config ---
const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const allSkillsMode = args.includes('--all-skills');
const skillName = args.find(a => !a.startsWith('--'));

if (!skillName && !allSkillsMode) {
  console.error('Usage: node extract-skill-usage.mjs <skill-name> [--all] [--raw]');
  console.error('       node extract-skill-usage.mjs --all-skills [--all]');
  process.exit(1);
}

// Find the project sessions directory
// Claude stores sessions at ~/.claude/projects/<encoded-project-path>/
const claudeDir = join(homedir(), '.claude', 'projects');
const cwd = process.cwd();
const encodedPath = cwd.replace(/\//g, '-');
const sessionsDir = join(claudeDir, encodedPath);

if (!existsSync(sessionsDir)) {
  console.error(`Sessions directory not found: ${sessionsDir}`);
  process.exit(1);
}

// Load already-analyzed sessions
const pluginDataDir = join(cwd, '.claude', 'skills', 'sharpen', '.plugin-data');
const analyzedFile = join(pluginDataDir, 'analyzed-sessions.json');

let analyzedSessions = {};
if (existsSync(analyzedFile)) {
  try {
    analyzedSessions = JSON.parse(readFileSync(analyzedFile, 'utf-8'));
  } catch {
    analyzedSessions = {};
  }
}

// For --all-skills mode, discover available skills
const skillsDir = join(cwd, '.claude', 'skills');
const allSkillNames = allSkillsMode
  ? readdirSync(skillsDir).filter(d => {
      try { return statSync(join(skillsDir, d, 'SKILL.md')).isFile(); } catch { return false; }
    })
  : [skillName];

// Get the list of analyzed session IDs for this specific skill
const alreadyAnalyzed = new Set(analyzedSessions[skillName] || []);

// Find all .jsonl session files
const sessionFiles = readdirSync(sessionsDir)
  .filter(f => f.endsWith('.jsonl'))
  .map(f => ({
    name: f,
    id: f.replace('.jsonl', ''),
    path: join(sessionsDir, f),
    mtime: statSync(join(sessionsDir, f)).mtime,
  }))
  .sort((a, b) => b.mtime - a.mtime); // newest first

// --- Parsing logic ---

/**
 * Check if a session contains usage of the target skill.
 * Looks for:
 * 1. Skill tool calls with matching skill name
 * 2. command-name tags matching the skill
 * 3. References to the skill's directory in tool calls
 */
function extractSkillUsage(filePath, targetSkill = skillName) {
  const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const entries = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }

  const skillEvents = [];
  let sessionHasSkill = false;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const type = entry.type;

    // Check user messages for skill invocations (slash commands)
    if (type === 'user') {
      const content = getContent(entry);
      if (content.includes(`<command-name>/${targetSkill}</command-name>`)) {
        sessionHasSkill = true;
        skillEvents.push({
          type: 'invocation',
          timestamp: entry.timestamp,
          userMessage: extractUserMessage(content),
          args: extractCommandArgs(content),
        });
      }
    }

    // Check assistant messages for skill-related tool calls and text
    if (type === 'assistant') {
      const msg = entry.message || {};
      const content = msg.content || [];

      if (!Array.isArray(content)) continue;

      for (const block of content) {
        // Capture text responses (Claude's explanations and decisions)
        if (block.type === 'text' && sessionHasSkill) {
          skillEvents.push({
            type: 'assistant_text',
            timestamp: entry.timestamp,
            text: block.text?.substring(0, 500), // first 500 chars
          });
        }

        // Capture tool calls made during skill execution
        if (block.type === 'tool_use' && sessionHasSkill) {
          const toolName = block.name;
          const input = block.input || {};

          skillEvents.push({
            type: 'tool_call',
            timestamp: entry.timestamp,
            tool: toolName,
            summary: summarizeToolCall(toolName, input),
          });
        }

        // Check if this is a Skill tool call for our target
        if (block.type === 'tool_use' && block.name === 'Skill') {
          const input = block.input || {};
          if (input.skill === targetSkill || input.skill?.startsWith(targetSkill + ':')) {
            sessionHasSkill = true;
            skillEvents.push({
              type: 'skill_tool_call',
              timestamp: entry.timestamp,
              skill: input.skill,
              args: input.args,
            });
          }
        }
      }
    }

    // Capture tool results when skill is active
    if (type === 'user' && sessionHasSkill) {
      const msg = entry.message || {};
      const content = msg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_result') {
            const resultText = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content);
            skillEvents.push({
              type: 'tool_result',
              timestamp: entry.timestamp,
              preview: resultText?.substring(0, 300),
              isError: block.is_error || false,
            });
          }
        }
      }
    }
  }

  if (!sessionHasSkill) return null;

  // Extract user corrections / feedback
  const corrections = [];
  for (const entry of entries) {
    if (entry.type === 'user') {
      const content = getContent(entry);
      // Skip system-injected content (skill definitions, command payloads, etc.)
      if (content.includes('<command-name>') ||
          content.includes('Base directory for this skill') ||
          content.includes('<system-reminder>') ||
          content.includes('<local-command-caveat>') ||
          content.length > 1000) {
        continue;
      }
      const lower = content.toLowerCase();
      // Look for correction signals in short, direct user messages
      if (lower.includes('no,') || lower.includes('no ') && lower.indexOf('no ') === 0 ||
          lower.includes('not that') || lower.includes("don't") ||
          lower.includes('wrong') || lower.includes('instead') ||
          lower.includes('actually,') || lower.includes('stop') ||
          lower.includes('why did you') || lower.includes('that\'s not') ||
          lower.includes('i meant') || lower.includes('try again')) {
        corrections.push({
          timestamp: entry.timestamp,
          message: content.substring(0, 200),
        });
      }
    }
  }

  return {
    events: skillEvents,
    corrections,
    totalMessages: entries.filter(e => e.type === 'user' || e.type === 'assistant').length,
  };
}

// --- Helper functions ---

function getContent(entry) {
  const msg = entry.message || {};
  if (typeof msg === 'string') return msg;
  const content = msg.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(b => {
      if (typeof b === 'string') return b;
      if (b.type === 'text') return b.text || '';
      return '';
    }).join('\n');
  }
  return '';
}

function extractUserMessage(content) {
  // Strip XML tags to get the plain user message
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);
}

function extractCommandArgs(content) {
  const match = content.match(/<command-args>([\s\S]*?)<\/command-args>/);
  return match ? match[1].trim() : null;
}

function summarizeToolCall(toolName, input) {
  switch (toolName) {
    case 'Bash':
      return input.command?.substring(0, 100);
    case 'Read':
      return input.file_path;
    case 'Edit':
      return `${input.file_path} (edit)`;
    case 'Write':
      return `${input.file_path} (write)`;
    case 'Grep':
      return `grep: ${input.pattern}`;
    case 'Glob':
      return `glob: ${input.pattern}`;
    case 'Agent':
      return `agent: ${input.description}`;
    default:
      return toolName;
  }
}

// --- Summary mode ---
// Compresses raw events into a per-session digest that's small enough
// for an LLM to read (target: <30KB for any skill)

function summarizeSession(session) {
  const { events, corrections, totalMessages } = session;

  // Count tool usage
  const toolCounts = {};
  const errors = [];
  const assistantDecisions = [];

  for (const e of events) {
    if (e.type === 'tool_call') {
      toolCounts[e.tool] = (toolCounts[e.tool] || 0) + 1;
    }
    if (e.type === 'tool_result' && e.isError) {
      errors.push(e.preview?.substring(0, 150));
    }
    if (e.type === 'assistant_text' && e.text) {
      // Keep only decision-like text (short, meaningful statements)
      const text = e.text;
      if (text.length < 300 && text.length > 10) {
        assistantDecisions.push(text);
      }
    }
  }

  // Keep only the most informative assistant messages (first 5)
  const keyDecisions = assistantDecisions.slice(0, 5);

  return {
    date: session.date,
    sessionId: session.sessionId,
    totalMessages,
    eventCount: events.length,
    toolsUsed: toolCounts,
    errors,
    corrections,
    keyDecisions,
  };
}

// --- Main ---

const summaryMode = !args.includes('--raw');

if (allSkillsMode) {
  // --all-skills: scan every skill, friction-focused output
  const report = {
    mode: 'all-skills',
    analyzedAt: new Date().toISOString(),
    sessionsScanned: sessionFiles.length,
    skills: {},
  };

  for (const skill of allSkillNames) {
    const analyzed = new Set(analyzedSessions[skill] || []);
    const skillResult = {
      sessionsFound: 0,
      sessionsSkipped: 0,
      newSessionIds: [],
      errors: [],
      corrections: [],
    };

    for (const file of sessionFiles) {
      if (!includeAll && analyzed.has(file.id)) {
        skillResult.sessionsSkipped++;
        continue;
      }

      const usage = extractSkillUsage(file.path, skill);
      if (usage) {
        skillResult.sessionsFound++;
        skillResult.newSessionIds.push(file.id);

        const summary = summarizeSession({
          sessionId: file.id,
          date: file.mtime.toISOString().split('T')[0],
          ...usage,
        });

        // Only keep friction signals (errors + corrections)
        for (const err of summary.errors) {
          skillResult.errors.push({
            sessionId: file.id,
            date: file.mtime.toISOString().split('T')[0],
            error: err,
          });
        }
        for (const corr of summary.corrections) {
          skillResult.corrections.push({
            sessionId: file.id,
            date: file.mtime.toISOString().split('T')[0],
            ...corr,
          });
        }
      }
    }

    // Only include skills that had usage
    if (skillResult.sessionsFound > 0 || skillResult.sessionsSkipped > 0) {
      report.skills[skill] = skillResult;
    }
  }

  console.log(JSON.stringify(report, null, 2));

} else {
  // Single skill mode (original behavior)
  const results = {
    skillName,
    analyzedAt: new Date().toISOString(),
    sessionsScanned: 0,
    sessionsWithSkill: 0,
    sessionsSkipped: 0,
    newSessionsAnalyzed: [],
    sessions: [],
  };

  for (const file of sessionFiles) {
    if (!includeAll && alreadyAnalyzed.has(file.id)) {
      results.sessionsSkipped++;
      continue;
    }

    results.sessionsScanned++;

    const usage = extractSkillUsage(file.path);
    if (usage) {
      results.sessionsWithSkill++;
      results.newSessionsAnalyzed.push(file.id);

      const sessionData = {
        sessionId: file.id,
        date: file.mtime.toISOString().split('T')[0],
        ...usage,
      };

      results.sessions.push(summaryMode ? summarizeSession(sessionData) : sessionData);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}
