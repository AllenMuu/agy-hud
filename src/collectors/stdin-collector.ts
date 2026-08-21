import { AntigravityStdinPayload } from '../types/antigravity.js';

/**
 * Reads standard input asynchronously with an optional timeout.
 */
export async function readStdin(timeoutMs = 100): Promise<string> {
  return new Promise<string>((resolve) => {
    let data = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(data.trim());
      }
    }, timeoutMs);

    if (process.stdin.isTTY) {
      clearTimeout(timer);
      return resolve('');
    }

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(data.trim());
      }
    });

    process.stdin.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(data.trim());
      }
    });

    // Resume stdin in case it was paused
    process.stdin.resume();
  });
}

/**
 * Parses the raw stdin string into AntigravityStdinPayload.
 */
export function parseStdinPayload(raw: string): AntigravityStdinPayload {
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as AntigravityStdinPayload;
  } catch {
    return {};
  }
}
