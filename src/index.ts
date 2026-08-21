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
