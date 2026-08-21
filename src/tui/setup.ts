import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import { getGlobalConfigDir, getGlobalConfigPath, saveGlobalConfig } from '../config/loader.js';
import { colors, style } from '../formatters/ansi.js';
import { renderPreview } from './preview.js';

export async function runSetup(): Promise<void> {
  console.log(style('\n🚀 Antigravity HUD (agy-hud) Setup Wizard\n', colors.bold, colors.brightCyan));

  // 1. Ensure config directory and file exist
  const cfgDir = getGlobalConfigDir();
  const cfgPath = getGlobalConfigPath();

  if (!fs.existsSync(cfgPath)) {
    console.log(style(`[1/3] Initializing global configuration in ${cfgDir}...`, colors.dim));
    saveGlobalConfig(DEFAULT_CONFIG);
    console.log(style(`✓ Created ${cfgPath}`, colors.brightGreen));
  } else {
    console.log(style(`[1/3] Configuration already exists at ${cfgPath}`, colors.brightGreen));
  }

  // 2. Determine hook / runner path
  console.log(style(`\n[2/3] Configuring StatusLine hook...`, colors.dim));
  const home = os.homedir();
  const defaultPluginHook = path.join(home, '.gemini', 'config', 'plugins', 'agy-hud', 'hooks', 'status-line.sh');

  console.log(style(`To enable agy-hud inside Antigravity CLI, run this slash command:`, colors.bold));
  console.log(style(`\n  /statusline ${defaultPluginHook}\n`, colors.bold, colors.brightYellow));

  // 3. Live Preview
  console.log(style(`[3/3] Live HUD Preview:`, colors.dim));
  console.log(style('─'.repeat(60), colors.gray));
  console.log(renderPreview(DEFAULT_CONFIG));
  console.log(style('─'.repeat(60), colors.gray));

  console.log(style(`\n✨ Setup complete! You can run 'agy-hud configure' anytime to customize your HUD.\n`, colors.brightGreen));
}
