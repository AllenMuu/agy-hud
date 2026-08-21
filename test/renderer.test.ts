import { describe, it, expect } from 'vitest';
import { renderHUD } from '../src/renderers/layout.js';
import { DEFAULT_CONFIG } from '../src/config/defaults.js';
import { createMockState } from '../src/tui/preview.js';
import { stripAnsi } from '../src/formatters/ansi.js';

describe('renderHUD', () => {
  it('should render Minimal preset on 1 line', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      preset: 'minimal' as const,
      display: { ...DEFAULT_CONFIG.display, preset: 'minimal' as const },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('Gemini');
    expect(lines[0]).toContain('45%');
  });

  it('should render Essential preset on 2 lines', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      preset: 'essential' as const,
      display: { ...DEFAULT_CONFIG.display, preset: 'essential' as const },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('Gemini');
    expect(lines[0]).toContain('git:(main*)');
    expect(lines[1]).toContain('Edit: layout.ts');
  });

  it('should render Full preset with 3 lines', () => {
    const state = createMockState();
    const config = {
      ...DEFAULT_CONFIG,
      language: 'en' as const,
      preset: 'full' as const,
      display: { ...DEFAULT_CONFIG.display, language: 'en' as const, preset: 'full' as const },
    };

    const output = stripAnsi(renderHUD(state, config));
    const lines = output.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('Gemini');
    expect(lines[1]).toContain('Edit: layout.ts');
    expect(lines[2]).toContain('Tasks [2/5]');
  });
});
