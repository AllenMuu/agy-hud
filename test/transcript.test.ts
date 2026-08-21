import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanTranscriptTail, readTailLines } from '../src/collectors/transcript-tail.js';

describe('transcript tail scanner', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(os.tmpdir(), `test-transcript-${Date.now()}.jsonl`);
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should scan tool calls and subagents from jsonl tail', () => {
    const lines = [
      JSON.stringify({
        step_index: 1,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'view_file',
            args: { AbsolutePath: '/foo/bar/package.json' },
            status: 'DONE',
          },
        ],
      }),
      JSON.stringify({
        step_index: 2,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        tool_calls: [
          {
            name: 'replace_file_content',
            args: { TargetFile: '/foo/bar/src/index.ts' },
            status: 'RUNNING',
          },
          {
            name: 'invoke_subagent',
            args: {
              Subagents: [{ Role: 'Code Reviewer', TypeName: 'review' }],
            },
            status: 'RUNNING',
          },
        ],
      }),
    ];

    fs.writeFileSync(tempFile, lines.join('\n'), 'utf-8');

    const result = scanTranscriptTail(tempFile, 1024 * 10, 100);
    expect(result.recentTools.length).toBeGreaterThanOrEqual(2);

    const editTool = result.recentTools.find((t) => t.name === 'Edit');
    expect(editTool).toBeDefined();
    expect(editTool?.summary).toBe('index.ts');
    expect(editTool?.status).toBe('running');

    const readTool = result.recentTools.find((t) => t.name === 'Read');
    expect(readTool).toBeDefined();
    expect(readTool?.summary).toBe('package.json');

    expect(result.activeSubagents.length).toBe(1);
    expect(result.activeSubagents[0].role).toBe('Code Reviewer');
  });
});
