import { describe, it, expect } from 'vitest';
import { renderHUD, wrapSegments } from '../src/renderers/layout.js';
import { DEFAULT_CONFIG } from '../src/config/defaults.js';
import { createMockState } from '../src/tui/preview.js';
import { stripAnsi } from '../src/formatters/ansi.js';

describe('renderHUD', () => {
  it('should render Minimal preset on 1 line when width is sufficient', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      display: { ...DEFAULT_CONFIG.display, preset: 'minimal' as const, maxWidth: 120 },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Gemini');
    expect(lines[0]).toContain('45%');
  });

  it('should render Essential preset on 2 lines when width is sufficient', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      preset: 'essential' as const,
      display: { ...DEFAULT_CONFIG.display, preset: 'essential' as const, maxWidth: 120 },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('Gemini');
    expect(lines[0]).toContain('git:(main*)');
    expect(lines[0]).toContain('Context');
    expect(lines[1]).toContain('Edit: layout.ts');
  });

  it('should render Full preset with 3 lines when width is sufficient', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      language: 'en' as const,
      preset: 'full' as const,
      display: { ...DEFAULT_CONFIG.display, language: 'en' as const, preset: 'full' as const, maxWidth: 120 },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('Gemini');
    expect(lines[0]).toContain('git:(main*)');
    expect(lines[0]).toContain('Context');
    expect(lines[1]).toContain('Edit: layout.ts');
    expect(lines[2]).toContain('Tasks [2/5]');
  });

  it('should wrap line 1 onto a new line when info is too long, displaying full content without truncation', () => {
    const state = createMockState();
    // Simulate long workspace name and git branch
    state.workspaceName = 'very-long-workspace-project-name';
    state.vcs.branch = 'feature/very-long-descriptive-branch-name-12345';

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'essential' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'essential' as const,
        maxWidth: 80,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');

    // Should wrap line 1 into multiple lines because width exceeds 80
    expect(lines.length).toBeGreaterThan(2);

    // Verify all parts of Line 1 are fully present and not truncated
    expect(output).toContain('Google | Gemini 3.7 Flash');
    expect(output).toContain('very-long-workspace-project-name');
    expect(output).toContain('feature/very-long-descriptive-branch-name-12345');
    expect(output).toContain('Context');
    expect(output).toContain('45%');

    // Verify each rendered line does not exceed maxWidth
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it('wrapSegments wraps long segments across multiple lines correctly', () => {
    const segs = ['[Gemini 1.5 Pro]', 'my-workspace git:(main*)', 'Context [████░░░░░░] 45% (90k/200k)'];
    // Total joined width is approx 18 + 3 + 24 + 3 + 35 = 83 cols
    // When maxWidth is 50, seg1 + seg2 = 45 cols <= 50, seg3 = 35 cols -> wraps to 2 lines
    const wrapped = wrapSegments(segs, 50, ' │ ');
    expect(wrapped.length).toBe(2);
    expect(wrapped[0]).toBe('[Gemini 1.5 Pro] │ my-workspace git:(main*)');
    expect(wrapped[1]).toBe('Context [████░░░░░░] 45% (90k/200k)');

    // When maxWidth is 30, each segment is on its own line -> 3 lines
    const wrappedNarrow = wrapSegments(segs, 30, ' │ ');
    expect(wrappedNarrow.length).toBe(3);
    expect(wrappedNarrow[0]).toBe('[Gemini 1.5 Pro]');
    expect(wrappedNarrow[1]).toBe('my-workspace git:(main*)');
    expect(wrappedNarrow[2]).toBe('Context [████░░░░░░] 45% (90k/200k)');
  });

  it('should wrap minimal preset when model name or context bar is too long for terminal', () => {
    const state = createMockState();
    state.modelName = 'very-long-custom-fine-tuned-model-v2-preview-experimental';
    state.provider = 'CustomProviderWithVeryLongName';

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        maxWidth: 60,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('CustomProviderWithVeryLongName');
    expect(lines[1]).toContain('Context');
    expect(lines[1]).toContain('45%');
  });

  it('should handle CJK fullwidth characters correctly when wrapping', () => {
    const state = createMockState();
    state.workspaceName = '我的前端项目工程仓库';
    state.vcs.branch = '功能/用户认证与权限系统重构';

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'essential' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'essential' as const,
        maxWidth: 60,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('我的前端项目工程仓库');
    expect(output).toContain('功能/用户认证与权限系统重构');
    expect(output).toContain('Context');
  });

  it('should format context bar with contextValue: both correctly', () => {
    const state = createMockState();
    state.contextTokens = {
      used: 87000,
      limit: 1000000,
      percent: 9,
    };

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        contextValue: 'both' as const,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('Context');
    expect(output).toContain('9% (87k/1.0M)');
  });

  it('should format context bar with contextValue: tokens correctly', () => {
    const state = createMockState();
    state.contextTokens = {
      used: 87000,
      limit: 1000000,
      percent: 9,
    };

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        contextValue: 'tokens' as const,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('87k/1.0M');
    expect(output).not.toContain('9%');
  });

  it('should format context bar with contextValue: remaining correctly', () => {
    const state = createMockState();
    state.contextTokens = {
      used: 87000,
      limit: 1000000,
      percent: 9,
    };

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      language: 'en' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        language: 'en' as const,
        contextValue: 'remaining' as const,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('91% rem.');
  });

  it('should display OVERFLOW indicator when context tokens exceed 100% (en)', () => {
    const state = createMockState();
    state.contextTokens = {
      used: 1200000,
      limit: 1000000,
      percent: 120,
    };

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      language: 'en' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        language: 'en' as const,
        contextValue: 'both' as const,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('120% (1.2M/1.0M) [OVERFLOW]');
  });

  it('should display 已超限 indicator when context tokens exceed 100% (zh)', () => {
    const state = createMockState();
    state.contextTokens = {
      used: 1200000,
      limit: 1000000,
      percent: 120,
    };

    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      language: 'zh-Hans' as const,
      display: {
        ...DEFAULT_CONFIG.display,
        preset: 'minimal' as const,
        language: 'zh-Hans' as const,
        contextValue: 'percent' as const,
      },
    };

    const output = stripAnsi(renderHUD(state, config));
    expect(output).toContain('120% [已超限]');
  });
});

