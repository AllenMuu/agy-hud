import readline from 'node:readline';
import { loadConfig, saveGlobalConfig } from '../config/loader.js';
import { HUDConfig, HUDPreset, HUDLanguage } from '../types/config.js';
import { colors, style } from '../formatters/ansi.js';
import { renderPreview } from './preview.js';

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      resolve(ans.trim());
    });
  });
}

export async function runConfigure(): Promise<void> {
  const config: HUDConfig = loadConfig();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(style('\n⚙️  Antigravity HUD (agy-hud) Interactive Configurator\n', colors.bold, colors.brightCyan));

    console.log(style('Current Preview:', colors.dim));
    console.log(style('─'.repeat(60), colors.gray));
    console.log(renderPreview(config));
    console.log(style('─'.repeat(60), colors.gray));

    // 1. Choose Preset
    console.log(style('\n[1/3] Select Preset:', colors.bold));
    console.log('  1) Full      (All features: Model, Git, Context, Tools, Agents, Tasks, Quota)');
    console.log('  2) Essential (2 lines: Model, Git, Context, Activity & Agents)');
    console.log('  3) Minimal   (1 line: Model & Context bar)');
    const presetChoice = await askQuestion(rl, style(`Enter choice (1-3) [current: ${config.preset}]: `, colors.brightYellow));

    if (presetChoice === '1') config.preset = 'full';
    else if (presetChoice === '2') config.preset = 'essential';
    else if (presetChoice === '3') config.preset = 'minimal';

    config.display.preset = config.preset;

    // 2. Choose Language
    console.log(style('\n[2/3] Select Language:', colors.bold));
    console.log('  1) 简体中文 (zh-Hans)');
    console.log('  2) 繁體中文 (zh-Hant)');
    console.log('  3) English  (en)');
    const langChoice = await askQuestion(rl, style(`Enter choice (1-3) [current: ${config.language}]: `, colors.brightYellow));

    if (langChoice === '1') config.language = 'zh-Hans';
    else if (langChoice === '2') config.language = 'zh-Hant';
    else if (langChoice === '3') config.language = 'en';

    config.display.language = config.language;

    // 3. Feature Toggles
    console.log(style('\n[3/3] Feature Toggles (Y/n):', colors.bold));

    const askToggle = async (label: string, current: boolean): Promise<boolean> => {
      const resp = await askQuestion(rl, `${label} (current: ${current ? 'ON' : 'OFF'}) [y/n]: `);
      if (resp.toLowerCase() === 'y' || resp.toLowerCase() === 'yes') return true;
      if (resp.toLowerCase() === 'n' || resp.toLowerCase() === 'no') return false;
      return current;
    };

    config.display.showGit = await askToggle('Show Git Status & Branch', config.display.showGit);
    config.display.showTools = await askToggle('Show Recent Tool Activity', config.display.showTools);
    config.display.showAgents = await askToggle('Show Running Subagents', config.display.showAgents);
    config.display.showTodos = await askToggle('Show Tasks/Todo Progress', config.display.showTodos);
    config.display.showQuota = await askToggle('Show Usage & Quota Bar', config.display.showQuota);

    // Save
    saveGlobalConfig(config);

    console.log(style('\n✓ Configuration updated successfully!\n', colors.brightGreen, colors.bold));
    console.log(style('Updated Preview:', colors.dim));
    console.log(style('─'.repeat(60), colors.gray));
    console.log(renderPreview(config));
    console.log(style('─'.repeat(60), colors.gray));
    console.log('');
  } finally {
    rl.close();
  }
}
