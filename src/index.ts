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

declare const __CLI_VERSION__: string | undefined;
const VERSION = typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : '1.0.0';

function printHelp(): void {
  console.log(`
${style('agy-hud', colors.bold, colors.brightCyan)} - Real-Time HUD Statusline for Google Antigravity CLI

${style('Usage:', colors.bold)}
  npx @allenmuu/agy-hud                Run interactive setup & management menu
  npx @allenmuu/agy-hud install        One-click install and enable HUD statusline
  npx @allenmuu/agy-hud setup          One-click install and enable HUD statusline
  npx @allenmuu/agy-hud configure      Interactive visual configuration wizard
  npx @allenmuu/agy-hud doctor         Check environment, transcripts, and statusline health
  npx @allenmuu/agy-hud preview        Preview current HUD layout and colors
  npx @allenmuu/agy-hud update-quota   Update cached quota limits from Antigravity /usage
  npx @allenmuu/agy-hud quota          Display cached quota information
  npx @allenmuu/agy-hud uninstall      Remove agy-hud plugin and disable statusline (use --purge to remove config)
  npx @allenmuu/agy-hud --version      Show current version
  npx @allenmuu/agy-hud --help         Show this help message

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

    // Trigger non-blocking background quota sync (auto cross-device sync)
    const { triggerBackgroundQuotaSync } = await import('./collectors/local-probe.js');
    triggerBackgroundQuotaSync();
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
    case 'remove': {
      const purge = args.includes('--purge') || args.includes('-p') || args.includes('--all');
      const force = args.includes('--force') || args.includes('-f') || args.includes('-y') || args.includes('--yes');
      const keepConfig = args.includes('--keep-config');
      await runUninstall({ purge, force, keepConfig });
      break;
    }

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

    case 'refresh-quota':
    case 'probe': {
      const { probeLocalAntigravityQuota } = await import('./collectors/local-probe.js');
      console.log('Probing local Antigravity server for live cross-device quota...');
      const probed = await probeLocalAntigravityQuota();
      if (probed) {
        console.log('✔ Live quota successfully probed from local Antigravity server:');
        if (probed.gemini) {
          const s = probed.gemini.fiveHour;
          console.log(`  • Gemini: ${s.remainingPercent}% rem. (${s.resetsIn || 'Ready'})`);
        }
        if (probed.claudeGpt) {
          const s = probed.claudeGpt.fiveHour;
          console.log(`  • Claude & GPT: ${s.remainingPercent}% rem. (${s.resetsIn || 'Ready'})`);
        }
      } else {
        console.log('✖ Could not probe local Antigravity server. Make sure Antigravity is running, or use `agy-hud update-quota` to sync via /usage output.');
      }
      break;
    }

    case 'update-quota':
    case 'sync-quota': {
      let text = args.slice(1).join(' ');
      if (!text.trim() && !process.stdin.isTTY) {
        text = await readStdin(1000);
      }
      if (text.trim()) {
        const { parseUsageText, saveQuotaCache } = await import('./collectors/quota-collector.js');
        const parsed = parseUsageText(text);
        saveQuotaCache(parsed);
        console.log('✔ Quota cache updated successfully:');
        if (parsed.gemini) {
          const s = parsed.gemini.shortTerm || parsed.gemini.fiveHour;
          const sLabel = s.label || `${s.windowHours || 5}h`;
          console.log(`  • Gemini: ${sLabel}: ${s.remainingPercent}% rem. (${s.resetsIn || 'Ready'}), Weekly: ${parsed.gemini.weekly.remainingPercent}% rem. (${parsed.gemini.weekly.resetsIn || 'Ready'})`);
        }
        if (parsed.claudeGpt) {
          const s = parsed.claudeGpt.shortTerm || parsed.claudeGpt.fiveHour;
          const sLabel = s.label || `${s.windowHours || 5}h`;
          console.log(`  • Claude & GPT: ${sLabel}: ${s.remainingPercent}% rem. (${s.resetsIn || 'Ready'}), Weekly: ${parsed.claudeGpt.weekly.remainingPercent}% rem. (${parsed.claudeGpt.weekly.resetsIn || 'Ready'})`);
        }
      } else {
        // If no text passed, attempt live auto-probe first
        const { probeLocalAntigravityQuota } = await import('./collectors/local-probe.js');
        console.log('No text provided. Attempting live auto-probe from local Antigravity server...');
        const probed = await probeLocalAntigravityQuota();
        if (probed) {
          console.log('✔ Live quota successfully probed from local Antigravity server:');
          if (probed.gemini) {
            console.log(`  • Gemini: 5h: ${probed.gemini.fiveHour.remainingPercent}% rem. (${probed.gemini.fiveHour.resetsIn || 'Ready'}), Weekly: ${probed.gemini.weekly.remainingPercent}% rem.`);
          }
          if (probed.claudeGpt) {
            console.log(`  • Claude & GPT: 5h: ${probed.claudeGpt.fiveHour.remainingPercent}% rem. (${probed.claudeGpt.fiveHour.resetsIn || 'Ready'}), Weekly: ${probed.claudeGpt.weekly.remainingPercent}% rem.`);
          }
        } else {
          console.log('Usage: agy-hud update-quota "<paste /usage output here>" or pipe text via stdin');
        }
      }
      break;
    }

    case 'quota': {
      const { loadQuotaCache, getQuotaForModelGroup } = await import('./collectors/quota-collector.js');
      const cache = loadQuotaCache();
      if (!cache || (!cache.gemini && !cache.claudeGpt)) {
        console.log('No quota cached yet. Run /usage or `agy-hud update-quota` to sync.');
      } else {
        const geminiQuota = getQuotaForModelGroup('gemini', cache);
        const claudeQuota = getQuotaForModelGroup('claude_gpt', cache);
        console.log('Cached Antigravity Quota Status (Real-time):');
        if (geminiQuota) {
          const s = geminiQuota.shortTerm || geminiQuota.fiveHour;
          const sLabel = s.windowHours ? `${s.windowHours}-Hour` : 'Short-Term';
          console.log(`  • Gemini Models:`);
          console.log(`      ${sLabel} Limit Remaining: ${s.remainingPercent}% (${s.resetsIn ? `Refreshes in ${s.resetsIn}` : 'Ready / 100%'})`);
          console.log(`      Weekly Limit Remaining: ${geminiQuota.weekly.remainingPercent}% (${geminiQuota.weekly.resetsIn ? `Refreshes in ${geminiQuota.weekly.resetsIn}` : 'Ready / 100%'})`);
        }
        if (claudeQuota) {
          const s = claudeQuota.shortTerm || claudeQuota.fiveHour;
          const sLabel = s.windowHours ? `${s.windowHours}-Hour` : 'Short-Term';
          console.log(`  • Claude & GPT Models:`);
          console.log(`      ${sLabel} Limit Remaining: ${s.remainingPercent}% (${s.resetsIn ? `Refreshes in ${s.resetsIn}` : 'Ready / 100%'})`);
          console.log(`      Weekly Limit Remaining: ${claudeQuota.weekly.remainingPercent}% (${claudeQuota.weekly.resetsIn ? `Refreshes in ${claudeQuota.weekly.resetsIn}` : 'Ready / 100%'})`);
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
