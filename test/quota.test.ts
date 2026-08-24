import { describe, it, expect } from 'vitest';
import { detectModelGroup, parseUsageText, getQuotaForModelGroup, QuotaCacheData } from '../src/collectors/quota-collector.js';
import { aggregateState } from '../src/collectors/aggregator.js';
import { renderHUD } from '../src/renderers/layout.js';
import { DEFAULT_CONFIG } from '../src/config/defaults.js';
import { stripAnsi } from '../src/formatters/ansi.js';

describe('Quota and Multi-Model Group Support', () => {
  const sampleUsageOutput = `
 Models & Quota

  Account: allenqiao666@gmail.com

GEMINI MODELS
  Models within this group: Gemini Flash, Gemini Pro

  Weekly Limit Remaining
    [████████████████████████████████████████████████░░] 96.03%
    96% remaining · Refreshes in 165h 15m

  Five Hour Limit Remaining
    [██████████████████████████████████████░░░░░░░░░░░░] 76.75%
    77% remaining · Refreshes in 2h 15m


CLAUDE AND GPT MODELS
  Models within this group: Claude Opus, Claude Sonnet, GPT-OSS

  Weekly Limit Remaining
    [████████████████████████████████████░░░░░░░░░░░░░░] 72.77%
    73% remaining · Refreshes in 166h 2m

  Five Hour Limit Remaining
    [█████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 18.32%
    18% remaining · Refreshes in 3h 2m
`;

  it('detects model groups correctly', () => {
    expect(detectModelGroup('Gemini 3.7 Flash')).toBe('gemini');
    expect(detectModelGroup('Gemini 2.5 Pro')).toBe('gemini');
    expect(detectModelGroup('gemini-1.5-flash')).toBe('gemini');

    expect(detectModelGroup('Claude 3.7 Sonnet')).toBe('claude_gpt');
    expect(detectModelGroup('Claude 3.5 Haiku')).toBe('claude_gpt');
    expect(detectModelGroup('claude-3-opus')).toBe('claude_gpt');
    expect(detectModelGroup('GPT-4o')).toBe('claude_gpt');
    expect(detectModelGroup('GPT-OSS')).toBe('claude_gpt');
    expect(detectModelGroup('o3-mini')).toBe('claude_gpt');
  });

  it('parses Antigravity /usage output for both model groups', () => {
    const parsed = parseUsageText(sampleUsageOutput);

    expect(parsed.gemini).toBeDefined();
    expect(parsed.gemini?.fiveHour.remainingPercent).toBe(76.75);
    expect(parsed.gemini?.fiveHour.usedPercent).toBe(23.25);
    expect(parsed.gemini?.fiveHour.resetsIn).toBe('2h 15m');
    expect(parsed.gemini?.weekly.remainingPercent).toBe(96.03);
    expect(parsed.gemini?.weekly.usedPercent).toBe(3.97);
    expect(parsed.gemini?.weekly.resetsIn).toBe('165h 15m');

    expect(parsed.claudeGpt).toBeDefined();
    expect(parsed.claudeGpt?.fiveHour.remainingPercent).toBe(18.32);
    expect(parsed.claudeGpt?.fiveHour.usedPercent).toBe(81.68);
    expect(parsed.claudeGpt?.fiveHour.resetsIn).toBe('3h 2m');
    expect(parsed.claudeGpt?.weekly.remainingPercent).toBe(72.77);
    expect(parsed.claudeGpt?.weekly.usedPercent).toBe(27.23);
    expect(parsed.claudeGpt?.weekly.resetsIn).toBe('166h 2m');
  });

  it('switches quota dynamically based on active model in aggregateState', () => {
    const quotaCache: QuotaCacheData = parseUsageText(sampleUsageOutput);

    // 1. Gemini Model
    const geminiPayload = {
      model: { id: 'gemini-3.7-flash', display_name: 'Gemini 3.7 Flash' },
    };
    const geminiState = aggregateState(geminiPayload, DEFAULT_CONFIG);
    expect(geminiState.modelGroup).toBe('gemini');

    // 2. Claude Model
    const claudePayload = {
      model: { id: 'claude-3-7-sonnet', display_name: 'Claude 3.7 Sonnet' },
    };
    const claudeState = aggregateState(claudePayload, DEFAULT_CONFIG);
    expect(claudeState.modelGroup).toBe('claude_gpt');
  });

  it('renders both 5h limit and weekly limit in HUD', () => {
    const quotaCache: QuotaCacheData = parseUsageText(sampleUsageOutput);
    const geminiQuota = getQuotaForModelGroup('gemini', quotaCache)!;
    const claudeQuota = getQuotaForModelGroup('claude_gpt', quotaCache)!;

    const geminiState = {
      modelName: 'Gemini 3.7 Flash',
      modelGroup: 'gemini' as const,
      workspaceName: 'agy-hud',
      workspacePath: process.cwd(),
      vcs: { type: 'none' as const, branch: '', isDirty: false, ahead: 0, behind: 0, untracked: 0, modified: 0, staged: 0 },
      contextTokens: { used: 1000, limit: 1000000, percent: 1 },
      quota: {
        group: 'gemini' as const,
        fiveHour: geminiQuota.fiveHour,
        weekly: geminiQuota.weekly,
        hourlyPercent: geminiQuota.fiveHour.usedPercent,
        weeklyPercent: geminiQuota.weekly.usedPercent,
      },
      recentTools: [],
      activeSubagents: [],
    };

    const outputEn = stripAnsi(renderHUD(geminiState, DEFAULT_CONFIG));
    expect(outputEn).toContain('5h');
    expect(outputEn).toContain('77%rem.');
    expect(outputEn).toContain('(2h 15m)');
    expect(outputEn).toContain('Wk');
    expect(outputEn).toContain('96%rem.');
    expect(outputEn).toContain('(6d 21h)');

    // Zh-Hans config
    const zhConfig = {
      ...DEFAULT_CONFIG,
      language: 'zh-Hans' as const,
      display: { ...DEFAULT_CONFIG.display, language: 'zh-Hans' as const },
    };
    const outputZh = stripAnsi(renderHUD(geminiState, zhConfig));
    expect(outputZh).toContain('5h');
    expect(outputZh).toContain('77%余');
    expect(outputZh).toContain('周');
    expect(outputZh).toContain('(6天21h)');

    // Claude model
    const claudeState = {
      ...geminiState,
      modelName: 'Claude 3.7 Sonnet',
      modelGroup: 'claude_gpt' as const,
      quota: {
        group: 'claude_gpt' as const,
        fiveHour: claudeQuota.fiveHour,
        weekly: claudeQuota.weekly,
        hourlyPercent: claudeQuota.fiveHour.usedPercent,
        weeklyPercent: claudeQuota.weekly.usedPercent,
      },
    };

    const outputClaude = stripAnsi(renderHUD(claudeState, DEFAULT_CONFIG));
    expect(outputClaude).toContain('5h');
    expect(outputClaude).toContain('18%rem.');
    expect(outputClaude).toContain('(3h 2m)');
    expect(outputClaude).toContain('Wk');
    expect(outputClaude).toContain('73%rem.');
    expect(outputClaude).toContain('(6d 22h)');
  });
});
