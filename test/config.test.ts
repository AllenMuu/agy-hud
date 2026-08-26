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

describe('uninstall & settings cleanup', () => {
  const tmpDir = path.join(os.tmpdir(), `agy-hud-uninstall-test-${Date.now()}`);
  const testSettingsPath = path.join(tmpDir, 'settings.json');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should remove agy-hud statusLine command object from settings', async () => {
    const { removeAntigravitySettings } = await import('../src/config/loader.js');
    const initialSettings = {
      theme: 'dark',
      autoSave: true,
      statusLine: {
        type: 'command',
        command: '/Users/test/.gemini/config/plugins/agy-hud/hooks/status-line.sh',
      },
    };
    fs.writeFileSync(testSettingsPath, JSON.stringify(initialSettings, null, 2), 'utf-8');

    const result = removeAntigravitySettings(testSettingsPath);
    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain(testSettingsPath);

    const updated = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
    expect(updated.statusLine).toBeUndefined();
    expect(updated.theme).toBe('dark');
    expect(updated.autoSave).toBe(true);
  });

  it('should remove string statusLine referencing agy-hud', async () => {
    const { removeAntigravitySettings } = await import('../src/config/loader.js');
    const initialSettings = {
      statusLine: 'node /path/to/plugins/agy-hud/dist/agy-hud.js statusline',
      otherSetting: 123,
    };
    fs.writeFileSync(testSettingsPath, JSON.stringify(initialSettings, null, 2), 'utf-8');

    const result = removeAntigravitySettings(testSettingsPath);
    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain(testSettingsPath);

    const updated = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
    expect(updated.statusLine).toBeUndefined();
    expect(updated.otherSetting).toBe(123);
  });

  it('should NOT remove unrelated custom statusLine', async () => {
    const { removeAntigravitySettings } = await import('../src/config/loader.js');
    const initialSettings = {
      statusLine: {
        type: 'command',
        command: '/usr/local/bin/custom-status-bar.sh',
      },
    };
    fs.writeFileSync(testSettingsPath, JSON.stringify(initialSettings, null, 2), 'utf-8');

    const result = removeAntigravitySettings(testSettingsPath);
    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toHaveLength(0);

    const updated = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
    expect(updated.statusLine).toBeDefined();
    expect(updated.statusLine.command).toBe('/usr/local/bin/custom-status-bar.sh');
  });

  it('should handle updateAntigravitySettings and subsequent removeAntigravitySettings', async () => {
    const { updateAntigravitySettings, removeAntigravitySettings } = await import('../src/config/loader.js');
    const hookPath = '/home/user/.gemini/config/plugins/agy-hud/hooks/status-line.sh';
    const updated = updateAntigravitySettings(hookPath, testSettingsPath);
    expect(updated).toBe(true);

    const saved = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
    expect(saved.statusLine.command).toBe(hookPath);

    const result = removeAntigravitySettings(testSettingsPath);
    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain(testSettingsPath);

    const afterRemove = JSON.parse(fs.readFileSync(testSettingsPath, 'utf-8'));
    expect(afterRemove.statusLine).toBeUndefined();
  });

  it('should remove directories via directory helpers', async () => {
    const { removeGlobalPluginDir, removeGlobalConfigDir } = await import('../src/config/loader.js');
    const dummyPluginDir = path.join(tmpDir, 'plugins', 'agy-hud');
    const dummyConfigDir = path.join(tmpDir, 'config', 'agy-hud');

    fs.mkdirSync(dummyPluginDir, { recursive: true });
    fs.mkdirSync(dummyConfigDir, { recursive: true });

    expect(fs.existsSync(dummyPluginDir)).toBe(true);
    expect(fs.existsSync(dummyConfigDir)).toBe(true);

    expect(removeGlobalPluginDir(dummyPluginDir)).toBe(true);
    expect(fs.existsSync(dummyPluginDir)).toBe(false);

    expect(removeGlobalConfigDir(dummyConfigDir)).toBe(true);
    expect(fs.existsSync(dummyConfigDir)).toBe(false);

    expect(removeGlobalPluginDir(dummyPluginDir)).toBe(false);
    expect(removeGlobalConfigDir(dummyConfigDir)).toBe(false);
  });
});
