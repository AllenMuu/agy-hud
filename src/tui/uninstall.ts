import fs from 'node:fs';
import { getGlobalPluginDir, removeAntigravitySettings, getAntigravitySettingsPath } from '../config/loader.js';
import { colors, style } from '../formatters/ansi.js';

export async function runUninstall(): Promise<void> {
  console.log(style('\n🗑️  Antigravity HUD (agy-hud) Uninstaller\n', colors.bold, colors.brightYellow));

  const pluginDir = getGlobalPluginDir();
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
    console.log(style(`✓ Removed plugin directory: ${pluginDir}`, colors.brightGreen));
  } else {
    console.log(style(`• Plugin directory not found: ${pluginDir}`, colors.dim));
  }

  const settingsPath = getAntigravitySettingsPath();
  removeAntigravitySettings();
  console.log(style(`✓ Cleaned statusLine from ${settingsPath}`, colors.brightGreen));

  console.log(style(`\n✨ agy-hud has been uninstalled successfully.\n`, colors.bold, colors.brightGreen));
}
