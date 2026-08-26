import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import {
  getGlobalConfigDir,
  getGlobalConfigPath,
  saveGlobalConfig,
  getGlobalPluginDir,
  deployPluginFiles,
  updateAntigravitySettings,
  getAntigravitySettingsPath,
} from '../config/loader.js';
import { colors, style } from '../formatters/ansi.js';
import { renderPreview } from './preview.js';

export async function runSetup(): Promise<void> {
  console.log(style('\n🚀 Antigravity HUD (agy-hud) One-Click Setup\n', colors.bold, colors.brightCyan));

  // 1. Ensure config directory and file exist
  const cfgDir = getGlobalConfigDir();
  const cfgPath = getGlobalConfigPath();

  if (!fs.existsSync(cfgPath)) {
    console.log(style(`[1/4] Initializing global configuration in ${cfgDir}...`, colors.dim));
    saveGlobalConfig(DEFAULT_CONFIG);
    console.log(style(`  ✓ Created ${cfgPath}`, colors.brightGreen));
  } else {
    console.log(style(`[1/4] Global configuration found: ${cfgPath}`, colors.brightGreen));
  }

  // 2. Deploy plugin bundle and hooks to Antigravity plugins directory
  const pluginDir = getGlobalPluginDir();
  console.log(style(`\n[2/4] Deploying plugin files to ${pluginDir}...`, colors.dim));
  deployPluginFiles(pluginDir);
  console.log(style(`  ✓ Deployed agy-hud bundle and status-line hook`, colors.brightGreen));

  // 3. Register statusLine in Antigravity settings.json
  console.log(style(`\n[3/4] Registering HUD in Antigravity settings...`, colors.dim));
  const hookScript = path.join(pluginDir, 'hooks', 'status-line.sh');
  const configured = updateAntigravitySettings(hookScript);
  const settingsPath = getAntigravitySettingsPath();

  if (configured) {
    console.log(style(`  ✓ Updated ${settingsPath}`, colors.brightGreen));
    console.log(style(`  ✓ statusLine configured to use ${hookScript}`, colors.brightGreen));
  } else {
    console.log(style(`  ⚠ Could not automatically update settings.json`, colors.brightYellow));
  }

  // 4. Live Preview
  console.log(style(`\n[4/4] Live HUD Preview:`, colors.dim));
  console.log(style('─'.repeat(60), colors.gray));
  console.log(renderPreview(DEFAULT_CONFIG));
  console.log(style('─'.repeat(60), colors.gray));

  console.log(style(`\n🎉 Installation Complete!\n`, colors.bold, colors.brightGreen));
  console.log(style('How to activate & customize:', colors.bold));
  console.log(` • Start or restart ${style('agy', colors.brightCyan)} in your terminal to see the live HUD!`);
  console.log(` • If Antigravity is already running, run slash command:`);
  console.log(style(`     /statusline ${hookScript}`, colors.brightYellow));
  console.log(` • To customize your HUD (preset, components, language):`);
  console.log(style(`     npx @allenmuu/agy-hud configure`, colors.brightCyan));
  console.log(` • To check diagnostics & health:`);
  console.log(style(`     npx @allenmuu/agy-hud doctor\n`, colors.brightCyan));
}
