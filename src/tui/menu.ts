import readline from 'node:readline';
import { colors, style } from '../formatters/ansi.js';
import { runSetup } from './setup.js';
import { runConfigure } from './configure.js';
import { runDoctor } from './doctor.js';
import { runUninstall } from './uninstall.js';
import { renderPreview } from './preview.js';
import { loadConfig } from '../config/loader.js';

export async function runMenu(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
  };

  try {
    console.log(style('\n🚀 Antigravity HUD (agy-hud) Interactive Manager\n', colors.bold, colors.brightCyan));
    console.log('  1) ⚡ Quick Install / Setup (One-Click)');
    console.log('  2) ⚙️  Configure HUD (Preset, Language, Components)');
    console.log('  3) 🩺 Diagnostics & Health Check (Doctor)');
    console.log('  4) 👁️  Preview Current HUD');
    console.log('  5) 🗑️  Uninstall agy-hud');
    console.log('  0) 🚪 Exit\n');

    const choice = await ask(style('Enter choice (0-5) [default: 1]: ', colors.brightYellow));
    rl.close();

    switch (choice) {
      case '2':
        await runConfigure();
        break;
      case '3':
        await runDoctor();
        break;
      case '4': {
        const config = loadConfig();
        console.log(style('\nCurrent HUD Preview:', colors.bold));
        console.log(style('─'.repeat(60), colors.gray));
        console.log(renderPreview(config));
        console.log(style('─'.repeat(60), colors.gray));
        console.log('');
        break;
      }
      case '5':
        await runUninstall();
        break;
      case '0':
        console.log('Goodbye!');
        break;
      case '1':
      default:
        await runSetup();
        break;
    }
  } finally {
    rl.close();
  }
}
