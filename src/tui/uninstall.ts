import fs from 'node:fs';
import readline from 'node:readline';
import {
  getGlobalPluginDir,
  getGlobalConfigDir,
  removeAntigravitySettings,
  removeGlobalPluginDir,
  removeGlobalConfigDir,
} from '../config/loader.js';
import { colors, style } from '../formatters/ansi.js';

export interface UninstallOptions {
  purge?: boolean;
  force?: boolean;
  keepConfig?: boolean;
}

export async function runUninstall(options: UninstallOptions = {}): Promise<void> {
  console.log(style('\n🗑️  Antigravity HUD (agy-hud) Uninstaller\n', colors.bold, colors.brightYellow));

  // 1. Deregister statusLine from Antigravity settings
  console.log(style('[1/3] Deregistering statusLine from Antigravity settings...', colors.dim));
  const { modifiedFiles } = removeAntigravitySettings();
  if (modifiedFiles.length > 0) {
    for (const file of modifiedFiles) {
      console.log(style(`  ✓ Cleaned statusLine from ${file}`, colors.brightGreen));
    }
  } else {
    console.log(style('  • No agy-hud statusLine registration found in Antigravity settings', colors.dim));
  }

  // 2. Remove deployed plugin files
  const pluginDir = getGlobalPluginDir();
  console.log(style(`\n[2/3] Removing deployed plugin files from ${pluginDir}...`, colors.dim));
  if (fs.existsSync(pluginDir)) {
    const removed = removeGlobalPluginDir();
    if (removed) {
      console.log(style(`  ✓ Removed plugin directory`, colors.brightGreen));
    } else {
      console.log(style(`  ⚠ Could not remove plugin directory`, colors.brightYellow));
    }
  } else {
    console.log(style(`  • Plugin directory not found (already clean)`, colors.dim));
  }

  // 3. Handle user configuration and quota cache
  const configDir = getGlobalConfigDir();
  console.log(style(`\n[3/3] Handling configuration & cache directory...`, colors.dim));
  if (fs.existsSync(configDir)) {
    let shouldPurge = options.purge;

    if (!shouldPurge && !options.keepConfig && !options.force && process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await new Promise<string>((resolve) => {
        rl.question(
          style(`  ? Also remove custom configuration & quota cache (${configDir})? (y/N): `, colors.brightYellow),
          (ans) => {
            rl.close();
            resolve(ans.trim().toLowerCase());
          }
        );
      });
      shouldPurge = answer === 'y' || answer === 'yes';
    }

    if (shouldPurge) {
      removeGlobalConfigDir();
      console.log(style(`  ✓ Removed configuration & quota cache: ${configDir}`, colors.brightGreen));
    } else {
      console.log(style(`  • Preserved configuration & quota cache: ${configDir}`, colors.dim));
      console.log(style(`    (Use --purge flag to remove configuration directory)`, colors.gray));
    }
  } else {
    console.log(style(`  • Configuration directory not found (already clean)`, colors.dim));
  }

  // Summary & Next Steps
  console.log(style(`\n✨ agy-hud has been uninstalled successfully.\n`, colors.bold, colors.brightGreen));
  console.log(style('Next steps:', colors.bold));
  console.log(` • If Antigravity CLI is currently running, restart it or run slash command:`);
  console.log(style(`     /statusline off`, colors.brightYellow));
  console.log(` • To reinstall agy-hud at any time:`);
  console.log(style(`     npx @allenmuu/agy-hud install\n`, colors.brightCyan));
}

