import { readStdin, parseStdinPayload } from './collectors/stdin-collector.js';
import { aggregateState } from './collectors/aggregator.js';
import { loadConfig } from './config/loader.js';
import { renderHUD } from './renderers/layout.js';
import { runSetup } from './tui/setup.js';
import { runConfigure } from './tui/configure.js';
import { runDoctor } from './tui/doctor.js';
import { renderPreview } from './tui/preview.js';

const VERSION = '1.0.0';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'statusline';

  switch (command) {
    case 'setup':
      await runSetup();
      break;

    case 'configure':
    case 'config':
      await runConfigure();
      break;

    case 'doctor':
      await runDoctor();
      break;

    case 'preview': {
      const config = loadConfig();
      console.log(renderPreview(config));
      break;
    }

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
      // Main statusline runner
      try {
        const rawStdin = await readStdin(100);
        const payload = parseStdinPayload(rawStdin);
        const config = loadConfig(payload.workspace?.root_path);
        const state = aggregateState(payload, config);
        const output = renderHUD(state, config);
        if (output) {
          process.stdout.write(output + '\n');
        }
      } catch (err) {
        // Fail silently in statusline mode so we never crash the host CLI
      }
      break;
    }
  }
}

main().catch(() => {
  process.exit(1);
});
