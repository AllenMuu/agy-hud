import { HUDState } from '../types/state.js';
import { HUDConfig } from '../types/config.js';
import { renderHUD } from '../renderers/layout.js';

export function createMockState(): HUDState {
  return {
    modelName: 'Gemini 3.7 Flash',
    provider: 'Google',
    modelGroup: 'gemini',
    workspaceName: 'agy-hud',
    workspacePath: process.cwd(),
    vcs: {
      type: 'git',
      branch: 'main',
      isDirty: true,
      ahead: 1,
      behind: 0,
      untracked: 1,
      modified: 2,
      staged: 0,
    },
    contextTokens: {
      used: 45000,
      limit: 1000000,
      percent: 45,
    },
    quota: {
      group: 'gemini',
      fiveHour: {
        remainingPercent: 77,
        usedPercent: 23,
        resetsIn: '2h 15m',
      },
      weekly: {
        remainingPercent: 96,
        usedPercent: 4,
        resetsIn: '165h 15m',
      },
      hourlyPercent: 23,
      weeklyPercent: 4,
      resetsInSeconds: 8100,
    },
    recentTools: [
      { name: 'Edit', summary: 'layout.ts', status: 'running', count: 1 },
      { name: 'Read', summary: 'package.json', status: 'done', count: 3 },
      { name: 'Grep', summary: '"statusLine"', status: 'done', count: 2 },
    ],
    activeSubagents: [
      {
        conversationId: 'mock-1',
        role: 'Codebase Researcher',
        typeName: 'research',
        state: 'running',
        elapsedMs: 25000,
      },
    ],
    todoProgress: {
      total: 5,
      completed: 2,
    },
    sessionDurationMs: 90000,
  };
}

export function renderPreview(config: HUDConfig): string {
  const mockState = createMockState();
  return renderHUD(mockState, config);
}
