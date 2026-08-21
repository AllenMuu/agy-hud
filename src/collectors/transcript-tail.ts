import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  TranscriptStep,
  RecentToolActivity,
  SubagentActivity,
  TodoProgress,
} from '../types/antigravity.js';

export interface TranscriptTailResult {
  recentTools: RecentToolActivity[];
  activeSubagents: SubagentActivity[];
  todoProgress?: TodoProgress;
}

/**
 * Resolves the transcript.jsonl path from stdin payload or system defaults.
 */
export function resolveTranscriptPath(
  transcriptPath?: string,
  appDataDir?: string,
  conversationId?: string
): string | null {
  if (transcriptPath && fs.existsSync(transcriptPath)) {
    return transcriptPath;
  }

  const baseDir = appDataDir || path.join(os.homedir(), '.gemini', 'antigravity-cli');
  if (conversationId) {
    const p = path.join(
      baseDir,
      'brain',
      conversationId,
      '.system_generated',
      'logs',
      'transcript.jsonl'
    );
    if (fs.existsSync(p)) return p;
  }

  // Fallback: search brain directory for most recently modified transcript
  try {
    const brainDir = path.join(baseDir, 'brain');
    if (fs.existsSync(brainDir)) {
      const convs = fs.readdirSync(brainDir);
      let latestTime = 0;
      let latestFile: string | null = null;
      for (const conv of convs) {
        const candidate = path.join(
          brainDir,
          conv,
          '.system_generated',
          'logs',
          'transcript.jsonl'
        );
        if (fs.existsSync(candidate)) {
          const stat = fs.statSync(candidate);
          if (stat.mtimeMs > latestTime) {
            latestTime = stat.mtimeMs;
            latestFile = candidate;
          }
        }
      }
      return latestFile;
    }
  } catch {
    // Ignore resolution errors
  }

  return null;
}

/**
 * Reads the tail of a file efficiently without reading the whole file into memory.
 */
export function readTailLines(filePath: string, maxBytes = 64 * 1024): string[] {
  let fd: number | null = null;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return [];

    fd = fs.openSync(filePath, 'r');
    const bytesToRead = Math.min(stat.size, maxBytes);
    const startPos = stat.size - bytesToRead;
    const buffer = Buffer.alloc(bytesToRead);

    fs.readSync(fd, buffer, 0, bytesToRead, startPos);
    const raw = buffer.toString('utf-8');

    const lines = raw.split('\n');
    // If we didn't read from the start of file, the first line is likely cut off
    if (startPos > 0 && lines.length > 1) {
      lines.shift();
    }
    return lines.filter((l) => l.trim().length > 0);
  } catch {
    return [];
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

/**
 * Summarizes tool arguments into a readable short string.
 */
function summarizeToolCall(name: string, args: Record<string, any> = {}): string {
  if (args.TargetFile) {
    return path.basename(args.TargetFile);
  }
  if (args.AbsolutePath) {
    return path.basename(args.AbsolutePath);
  }
  if (args.DirectoryPath) {
    return path.basename(args.DirectoryPath);
  }
  if (args.SearchPath) {
    return path.basename(args.SearchPath);
  }
  if (args.CommandLine) {
    const cmd = args.CommandLine.trim().split(/\s+/)[0];
    return cmd || 'command';
  }
  if (args.Query || args.query) {
    const q = String(args.Query || args.query).slice(0, 15);
    return `"${q}"`;
  }
  if (args.Pattern) {
    return args.Pattern;
  }
  if (args.Subagents && Array.isArray(args.Subagents)) {
    const roles = args.Subagents.map((s: any) => s.Role || s.TypeName).filter(Boolean);
    return roles.join(', ');
  }
  return '';
}

/**
 * Formats tool names cleanly (e.g. replace_file_content -> Edit, view_file -> Read).
 */
function normalizeToolName(name: string): string {
  switch (name) {
    case 'write_to_file':
      return 'Write';
    case 'replace_file_content':
      return 'Edit';
    case 'view_file':
      return 'Read';
    case 'grep_search':
      return 'Grep';
    case 'find_by_name':
      return 'Find';
    case 'list_dir':
      return 'List';
    case 'run_command':
      return 'Exec';
    case 'search_web':
    case 'read_url_content':
      return 'Web';
    case 'invoke_subagent':
      return 'Agent';
    case 'ask_question':
      return 'Ask';
    default:
      return name.replace(/^default_api:/, '').replace(/_/g, ' ');
  }
}

/**
 * Fast tail-scanner for Antigravity transcript.jsonl.
 */
export function scanTranscriptTail(
  filePath: string,
  maxBytes = 64 * 1024,
  timeoutMs = 15
): TranscriptTailResult {
  const startTime = Date.now();
  const rawLines = readTailLines(filePath, maxBytes);

  const toolActivityMap = new Map<string, RecentToolActivity>();
  const subagents: SubagentActivity[] = [];
  let todoProgress: TodoProgress | undefined;

  // Process backwards for recent-first order
  for (let i = rawLines.length - 1; i >= 0; i--) {
    if (Date.now() - startTime > timeoutMs) {
      break; // Safety break
    }

    const line = rawLines[i];
    try {
      const step = JSON.parse(line) as TranscriptStep;

      // 1. Tool calls extraction
      if (step.tool_calls && Array.isArray(step.tool_calls)) {
        for (const tc of step.tool_calls) {
          const normName = normalizeToolName(tc.name);
          const summary = summarizeToolCall(tc.name, tc.args);
          const key = `${normName}:${summary}`;

          if (toolActivityMap.has(key)) {
            const existing = toolActivityMap.get(key)!;
            existing.count += 1;
          } else if (toolActivityMap.size < 4) {
            toolActivityMap.set(key, {
              name: normName,
              summary,
              status: tc.status === 'RUNNING' ? 'running' : tc.status === 'ERROR' ? 'error' : 'done',
              count: 1,
            });
          }

          // Check for subagents in invoke_subagent args
          if (tc.name.includes('invoke_subagent') && tc.args?.Subagents) {
            for (const sub of tc.args.Subagents) {
              subagents.push({
                conversationId: '',
                role: sub.Role || sub.TypeName || 'Subagent',
                typeName: sub.TypeName || 'agent',
                state: tc.status === 'RUNNING' ? 'running' : 'done',
                elapsedMs: 0,
              });
            }
          }
        }
      }

      // 2. Extract step / todo clues from content if present
      if (!todoProgress && step.content) {
        const match = step.content.match(/\[([xX ])\]/g);
        if (match && match.length > 1) {
          const total = match.length;
          const completed = match.filter((m) => m.toLowerCase() === '[x]').length;
          todoProgress = {
            total,
            completed,
          };
        }
      }
    } catch {
      // Ignore malformed lines
    }
  }

  return {
    recentTools: Array.from(toolActivityMap.values()),
    activeSubagents: subagents.slice(0, 3),
    todoProgress,
  };
}
