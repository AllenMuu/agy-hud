import { readStdin, parseStdinPayload } from './collectors/stdin-collector.js';
import { aggregateState } from './collectors/aggregator.js';
import { loadConfig } from './config/loader.js';
import { renderHUD } from './renderers/layout.js';
import { runSetup } from './tui/setup.js';
import { runConfigure } from './tui/configure.js';
import { runDoctor } from './tui/doctor.js';
import { runUninstall } from './tui/uninstall.js';
import { runMenu } from './tui/menu.js';
import { renderPreview } from './tui/preview.js';
import { colors, style } from './formatters/ansi.js';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`
${style('agy-hud', colors.bold, colors.brightCyan)} - Real-Time HUD Statusline for Google Antigravity CLI

${style('Usage:', colors.bold)}
  npx agy-hud                Run interactive setup & management menu
  npx agy-hud setup          One-click install and enable HUD statusline
  npx agy-hud configure      Interactive visual configuration wizard
  npx agy-hud doctor         Check environment, transcripts, and statusline health
  npx agy-hud preview        Preview current HUD layout and colors
  npx agy-hud update-quota   Update cached quota limits from Antigravity /usage
  npx agy-hud quota          Display cached quota information
  npx agy-hud uninstall      Remove agy-hud plugin and disable statusline
  npx agy-hud --version      Show current version
  npx agy-hud --help         Show this help message

${style('Documentation:', colors.bold)}
  https://github.com/AllenMuu/agy-hud
`);
}

async function runStatusline(): Promise<void> {
  try {
    const rawStdin = await readStdin(100);
    const payload = parseStdinPayload(rawStdin);
    const config = loadConfig(payload.workspace?.root_path);
    const state = aggregateState(payload, config);
    const output = renderHUD(state, config);
    if (output) {
      process.stdout.write(output + '\n');
    }
  } catch {
    // Fail silently in statusline mode so we never crash the host CLI
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    if (process.stdin.isTTY) {
      await runMenu();
    } else {
      await runStatusline();
    }
    return;
  }

  switch (command) {
    case 'setup':
    case 'install':
    case 'init':
      await runSetup();
      break;

    case 'configure':
    case 'config':
      await runConfigure();
      break;

    case 'doctor':
      await runDoctor();
      break;

    case 'uninstall':
    case 'remove':
      await runUninstall();
      break;

    case 'preview': {
      const config = loadConfig();
      console.log(renderPreview(config));
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    case 'version':
    case '-v':
    case '--version':
      console.log(`agy-hud v${VERSION}`);
      break;

    case 'update-quota':
    case 'sync-quota': {
      let text = args.slice(1).join(' ');
      if (!text.trim()) {
        text = await readStdin(1000);
      }
      if (text.trim()) {
        const { parseUsageText, saveQuotaCache } = await import('./collectors/quota-collector.js');
        const parsed = parseUsageText(text);
        saveQuotaCache(parsed);
        console.log('✔ Quota cache updated successfully:');
        if (parsed.gemini) {
          console.log(`  • Gemini: 5h: ${parsed.gemini.fiveHour.remainingPercent}% rem. (${parsed.gemini.fiveHour.resetsIn || 'N/A'}), Weekly: ${parsed.gemini.weekly.remainingPercent}% rem. (${parsed.gemini.weekly.resetsIn || 'N/A'})`);
        }
        if (parsed.claudeGpt) {
          console.log(`  • Claude & GPT: 5h: ${parsed.claudeGpt.fiveHour.remainingPercent}% rem. (${parsed.claudeGpt.fiveHour.resetsIn || 'N/A'}), Weekly: ${parsed.claudeGpt.weekly.remainingPercent}% rem. (${parsed.claudeGpt.weekly.resetsIn || 'N/A'})`);
        }
      } else {
        console.log('Usage: agy-hud update-quota "<paste /usage output here>" or pipe text via stdin');
      }
      break;
    }

    case 'quota': {
      const { loadQuotaCache } = await import('./collectors/quota-collector.js');
      const cache = loadQuotaCache();
      if (!cache || (!cache.gemini && !cache.claudeGpt)) {
        console.log('No quota cached yet. Run /usage or `agy-hud update-quota` to sync.');
      } else {
        console.log('Cached Antigravity Quota Status:');
        if (cache.gemini) {
          console.log(`  • Gemini Models:`);
          console.log(`      5-Hour Limit Remaining: ${cache.gemini.fiveHour.remainingPercent}% (${cache.gemini.fiveHour.resetsIn || 'N/A'})`);
          console.log(`      Weekly Limit Remaining: ${cache.gemini.weekly.remainingPercent}% (${cache.gemini.weekly.resetsIn || 'N/A'})`);
        }
        if (cache.claudeGpt) {
          console.log(`  • Claude & GPT Models:`);
          console.log(`      5-Hour Limit Remaining: ${cache.claudeGpt.fiveHour.remainingPercent}% (${cache.claudeGpt.fiveHour.resetsIn || 'N/A'})`);
          console.log(`      Weekly Limit Remaining: ${cache.claudeGpt.weekly.remainingPercent}% (${cache.claudeGpt.weekly.resetsIn || 'N/A'})`);
        }
      }
      break;
    }

    case 'statusline':
    default: {
      await runStatusline();
      break;
    }
  }
}

main().catch(() => {
  process.exit(1);
});
