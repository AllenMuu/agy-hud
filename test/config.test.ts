import { describe, it, expect } from 'vitest';
import { deepMerge } from '../src/config/loader.js';
import { DEFAULT_CONFIG } from '../src/config/defaults.js';

describe('config deepMerge', () => {
  it('should deeply merge partial configs', () => {
    const custom = {
      preset: 'minimal' as const,
      display: {
        showGit: false,
      } as any,
    };

    const merged = deepMerge(DEFAULT_CONFIG, custom);
    expect(merged.preset).toBe('minimal');
    expect(merged.display.showGit).toBe(false);
    expect(merged.display.showModel).toBe(true); // preserved default
    expect(merged.thresholds.contextWarning).toBe(70); // preserved default
  });
});
