import { stripAnsi } from './ansi.js';

/**
 * Computes display width in terminal columns, handling fullwidth East Asian characters.
 */
export function stringWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Control characters
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }
    // Fullwidth / CJK ranges / emojis
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Truncates a string to fit within maxWidth terminal columns.
 */
export function truncate(str: string, maxWidth: number, ellipsis = '…'): number extends never ? string : string {
  const currentWidth = stringWidth(str);
  if (currentWidth <= maxWidth) {
    return str;
  }

  const ellipsisWidth = stringWidth(ellipsis);
  if (maxWidth <= ellipsisWidth) {
    return ellipsis.slice(0, maxWidth);
  }

  const targetWidth = maxWidth - ellipsisWidth;
  let accumulated = 0;
  let result = '';

  for (const char of str) {
    const charW = stringWidth(char);
    if (accumulated + charW > targetWidth) {
      break;
    }
    accumulated += charW;
    result += char;
  }

  return result + ellipsis;
}

/**
 * Formats token count (e.g. 1500 -> 1.5k, 1200000 -> 1.2M).
 */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}k`;
  }
  return count.toString();
}

/**
 * Formats milliseconds into human-readable duration (e.g. 1m 20s).
 */
export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
