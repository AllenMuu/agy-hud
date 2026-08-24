import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import { deepMerge, deployPluginFiles } from '../src/config/loader.js';
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

describe('plugin deployment', () => {
  const tmpDir = path.join(os.tmpdir(), `agy-hud-test-${Date.now()}`);

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should deploy plugin files and hook scripts to target directory', () => {
    const result = deployPluginFiles(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'hooks', 'status-line.sh'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'plugin.json'))).toBe(true);

    const hookContent = fs.readFileSync(path.join(tmpDir, 'hooks', 'status-line.sh'), 'utf-8');
    expect(hookContent).toContain('statusline');
  });
});
