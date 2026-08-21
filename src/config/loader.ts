import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HUDConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';

export function getGlobalConfigDir(): string {
  const home = os.homedir();
  return path.join(home, '.gemini', 'config', 'agy-hud');
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), 'config.json');
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
