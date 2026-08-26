import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { HUDConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';

export function getGlobalConfigDir(): string {
  const home = os.homedir();
  return path.join(home, '.gemini', 'config', 'agy-hud');
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.json');
}

export function getGlobalPluginDir(): string {
  const home = os.homedir();
  return path.join(home, '.gemini', 'config', 'plugins', 'agy-hud');
}

export function getAntigravitySettingsPath(): string {
  const home = os.homedir();
  const p1 = path.join(home, '.gemini', 'antigravity-cli', 'settings.json');
  const p2 = path.join(home, '.gemini', 'config', 'settings.json');
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  return p1;
}

export function updateAntigravitySettings(hookCommand: string, customSettingsPath?: string): boolean {
  try {
    const settingsPath = customSettingsPath || getAntigravitySettingsPath();
    const settingsDir = path.dirname(settingsPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    let settings: Record<string, any> = {};
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      try {
        settings = JSON.parse(content);
      } catch {
        settings = {};
      }
    }

    settings.statusLine = {
      type: 'command',
      command: hookCommand,
    };

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function removeAntigravitySettings(customSettingsPath?: string): { success: boolean; modifiedFiles: string[] } {
  const home = os.homedir();
  const candidatePaths = customSettingsPath
    ? [customSettingsPath]
    : [
        path.join(home, '.gemini', 'antigravity-cli', 'settings.json'),
        path.join(home, '.gemini', 'config', 'settings.json'),
      ];

  const modifiedFiles: string[] = [];

  for (const settingsPath of candidatePaths) {
    try {
      if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);
        let modified = false;

        if (settings.statusLine) {
          const isAgyHud =
            (typeof settings.statusLine === 'string' && (settings.statusLine.includes('agy-hud') || settings.statusLine.includes('status-line.sh'))) ||
            (typeof settings.statusLine === 'object' && settings.statusLine !== null && (
              (typeof settings.statusLine.command === 'string' && (settings.statusLine.command.includes('agy-hud') || settings.statusLine.command.includes('status-line.sh')))
            ));

          if (isAgyHud) {
            delete settings.statusLine;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
            modified = true;
          }
        }

        if (modified) {
          modifiedFiles.push(settingsPath);
        }
      }
    } catch {
      // Continue checking other candidate files
    }
  }

  return { success: true, modifiedFiles };
}

export function removeGlobalPluginDir(customDir?: string): boolean {
  try {
    const dir = customDir || getGlobalPluginDir();
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function removeGlobalConfigDir(customDir?: string): boolean {
  try {
    const dir = customDir || getGlobalConfigDir();
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getPackageRootDir(): string {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    if (path.basename(currentDir) === 'dist') {
      return path.dirname(currentDir);
    }
    if (path.basename(currentDir) === 'config' && path.basename(path.dirname(currentDir)) === 'src') {
      return path.resolve(currentDir, '..', '..');
    }
    return path.resolve(currentDir, '..');
  } catch {
    return process.cwd();
  }
}

export function deployPluginFiles(targetDir: string): { success: boolean; files: string[] } {
  const pkgRoot = getPackageRootDir();
  const targetDistDir = path.join(targetDir, 'dist');
  const targetHooksDir = path.join(targetDir, 'hooks');

  fs.mkdirSync(targetDistDir, { recursive: true });
  fs.mkdirSync(targetHooksDir, { recursive: true });

  const installedFiles: string[] = [];

  // 1. Bundle
  const targetBundlePath = path.join(targetDistDir, 'agy-hud.js');
  let sourceBundle = path.join(pkgRoot, 'dist', 'agy-hud.js');
  if (!fs.existsSync(sourceBundle)) {
    try {
      const currentFile = fileURLToPath(import.meta.url);
      if (fs.existsSync(currentFile) && currentFile.endsWith('.js')) {
        sourceBundle = currentFile;
      }
    } catch {
      // ignore
    }
  }
  if (fs.existsSync(sourceBundle)) {
    fs.copyFileSync(sourceBundle, targetBundlePath);
    fs.chmodSync(targetBundlePath, 0o755);
    installedFiles.push(targetBundlePath);
  }

  // 2. Hook
  const targetHookPath = path.join(targetHooksDir, 'status-line.sh');
  const sourceHook = path.join(pkgRoot, 'hooks', 'status-line.sh');
  if (fs.existsSync(sourceHook)) {
    fs.copyFileSync(sourceHook, targetHookPath);
  } else {
    const hookContent = `#!/bin/sh\n# Wrapper script for agy-hud statusline execution\nDIR="$(cd "$(dirname "$0")/.." && pwd)"\nexec node "$DIR/dist/agy-hud.js" statusline "$@"\n`;
    fs.writeFileSync(targetHookPath, hookContent, 'utf-8');
  }
  fs.chmodSync(targetHookPath, 0o755);
  installedFiles.push(targetHookPath);

  // 3. plugin.json
  const targetPluginJson = path.join(targetDir, 'plugin.json');
  const sourcePluginJson = path.join(pkgRoot, 'plugin.json');
  if (fs.existsSync(sourcePluginJson)) {
    fs.copyFileSync(sourcePluginJson, targetPluginJson);
  } else {
    const pluginJsonContent = JSON.stringify({
      name: 'agy-hud',
      version: '1.0.0',
      description: 'Real-time, high-performance status-line HUD plugin for Antigravity CLI',
      author: 'Allen Muu',
      entry: 'dist/agy-hud.js',
      commands: [
        { name: 'agy-hud:setup', description: 'Setup and enable agy-hud status line', exec: 'node dist/agy-hud.js setup' },
        { name: 'agy-hud:configure', description: 'Interactive configuration wizard for agy-hud', exec: 'node dist/agy-hud.js configure' },
        { name: 'agy-hud:doctor', description: 'Health check and diagnostics for agy-hud', exec: 'node dist/agy-hud.js doctor' },
        { name: 'agy-hud:uninstall', description: 'Uninstall agy-hud and remove statusline configuration', exec: 'node dist/agy-hud.js uninstall' }
      ]
    }, null, 2);
    fs.writeFileSync(targetPluginJson, pluginJsonContent, 'utf-8');
  }
  installedFiles.push(targetPluginJson);

  // 4. config.example.json
  const targetConfigExample = path.join(targetDir, 'config.example.json');
  const sourceExample = path.join(pkgRoot, 'config.example.json');
  if (fs.existsSync(sourceExample)) {
    fs.copyFileSync(sourceExample, targetConfigExample);
    installedFiles.push(targetConfigExample);
  }

  return { success: true, files: installedFiles };
}

export function loadConfigFile(filePath: string): Partial<HUDConfig> | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Gracefully ignore corrupt or unreadable files
  }
  return null;
}

export function deepMerge<T extends Record<string, any>>(target: T, source?: Partial<T> | null): T {
  if (!source) return { ...target };
  const output = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== undefined &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      output[key] = sourceVal as any;
    }
  }
  return output;
}

export function loadConfig(workspaceDir?: string): HUDConfig {
  let merged: HUDConfig = { ...DEFAULT_CONFIG };

  // 1. Global config (~/.gemini/config/agy-hud/config.json)
  const globalPath = getGlobalConfigPath();
  const globalConfig = loadConfigFile(globalPath);
  if (globalConfig) {
    merged = deepMerge(merged, globalConfig);
  }

  // 2. Workspace config (.agy-hud.json or .gemini/agy-hud.json)
  if (workspaceDir) {
    const wsConfigPath1 = path.join(workspaceDir, '.agy-hud.json');
    const wsConfigPath2 = path.join(workspaceDir, '.gemini', 'agy-hud.json');
    const wsConfig = loadConfigFile(wsConfigPath1) || loadConfigFile(wsConfigPath2);
    if (wsConfig) {
      merged = deepMerge(merged, wsConfig);
    }
  }

  // Ensure top-level preset and language propagate to display
  if (merged.preset) {
    merged.display.preset = merged.preset;
  }
  if (merged.language) {
    merged.display.language = merged.language;
  }

  return merged;
}

export function saveGlobalConfig(config: Partial<HUDConfig>): void {
  const dir = getGlobalConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getGlobalConfigPath();
  const existing = loadConfigFile(filePath) || {};
  const updated = deepMerge(existing, config);
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
}
