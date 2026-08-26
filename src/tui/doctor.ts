import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadConfig,
  getGlobalConfigPath,
  getGlobalPluginDir,
  getAntigravitySettingsPath,
} from '../config/loader.js';
import { colors, style } from '../formatters/ansi.js';
import { scanTranscriptTail, resolveTranscriptPath } from '../collectors/transcript-tail.js';

export async function runDoctor(): Promise<void> {
  console.log(style('\n🩺 Antigravity HUD (agy-hud) Diagnostics & Health Check\n', colors.bold, colors.brightCyan));

  let issues = 0;

  // 1. Node.js Environment
  const nodeVer = process.version;
  const major = parseInt(nodeVer.replace(/^v/, '').split('.')[0], 10);
  if (major >= 18) {
    console.log(`${style('✓', colors.brightGreen)} Node.js version: ${nodeVer} (Supported)`);
  } else {
    console.log(`${style('✘', colors.brightRed)} Node.js version: ${nodeVer} (Requires Node.js >= 18)`);
    issues++;
  }

  // 2. Global Config Check
  const cfgPath = getGlobalConfigPath();
  if (fs.existsSync(cfgPath)) {
    console.log(`${style('✓', colors.brightGreen)} Configuration file: ${cfgPath}`);
  } else {
    console.log(`${style('⚠', colors.brightYellow)} Configuration file not initialized yet (will use defaults)`);
  }

  // 3. Plugin Files Check
  const pluginDir = getGlobalPluginDir();
  const hookScript = path.join(pluginDir, 'hooks', 'status-line.sh');
  const bundleScript = path.join(pluginDir, 'dist', 'agy-hud.js');
  if (fs.existsSync(hookScript) && fs.existsSync(bundleScript)) {
    console.log(`${style('✓', colors.brightGreen)} Plugin files installed: ${pluginDir}`);
  } else {
    console.log(`${style('⚠', colors.brightYellow)} Plugin files not fully deployed (run \`npx @allenmuu/agy-hud install\` to install)`);
  }

  // 4. Antigravity Settings Check
  const settingsPath = getAntigravitySettingsPath();
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      if (settings.statusLine && (
        (typeof settings.statusLine === 'string' && settings.statusLine.includes('agy-hud')) ||
        (typeof settings.statusLine.command === 'string' && settings.statusLine.command.includes('agy-hud'))
      )) {
        console.log(`${style('✓', colors.brightGreen)} Antigravity settings: statusLine registered (${settingsPath})`);
      } else {
        console.log(`${style('⚠', colors.brightYellow)} Antigravity settings: statusLine not registered yet in ${settingsPath}`);
      }
    } catch {
      console.log(`${style('⚠', colors.brightYellow)} Could not parse ${settingsPath}`);
    }
  } else {
    console.log(`${style('ℹ', colors.cyan)} Antigravity settings file not found yet (${settingsPath})`);
  }

  // 5. Antigravity Brain / Transcript Path Check
  const baseDir = path.join(os.homedir(), '.gemini', 'antigravity-cli');
  const transcript = resolveTranscriptPath(undefined, baseDir);
  if (transcript) {
    console.log(`${style('✓', colors.brightGreen)} Active Transcript detected: ${transcript}`);

    // Benchmark tail scan
    const t0 = performance.now();
    const result = scanTranscriptTail(transcript, 64 * 1024, 20);
    const t1 = performance.now();
    const elapsed = (t1 - t0).toFixed(2);
    console.log(`${style('✓', colors.brightGreen)} Transcript tail read latency: ${elapsed}ms (${result.recentTools.length} tools detected)`);
  } else {
    console.log(`${style('ℹ', colors.cyan)} No active session transcript found (will activate during agent turns)`);
  }

  // 6. Git Detection
  const gitDir = path.join(process.cwd(), '.git');
  if (fs.existsSync(gitDir)) {
    console.log(`${style('✓', colors.brightGreen)} Git repository detected in current workspace`);
  }

  // Summary
  if (issues === 0) {
    console.log(style('\n🎉 Everything looks great! Your agy-hud setup is healthy.\n', colors.brightGreen, colors.bold));
  } else {
    console.log(style(`\n⚠️ Found ${issues} potential issue(s). Please review the logs above.\n`, colors.brightRed, colors.bold));
  }
}
