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

/**
 * Formats quota reset time string (e.g. "165h 15m" -> "6天21h" / "6d 21h", "2h 15m" -> "2h 15m").
 */
export function formatResetTime(resetsIn?: string, lang = 'en'): string {
  if (!resetsIn || !resetsIn.trim()) return '';

  const clean = resetsIn.trim();
  const isZh = lang.startsWith('zh');

  // If it already has days like "6d 21h" or "6天21h"
  if (clean.includes('d') || clean.includes('天') || clean.includes('day')) {
    return clean;
  }

  // Parse hours and minutes
  const hMatch = clean.match(/(\d+)\s*h/i);
  const mMatch = clean.match(/(\d+)\s*m/i);

  if (hMatch) {
    const totalHours = parseInt(hMatch[1], 10);
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;

    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remHours = totalHours % 24;

      if (isZh) {
        return remHours > 0 ? `${days}天${remHours}h` : `${days}天`;
      } else {
        return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
      }
    } else {
      if (mins > 0) {
        return `${totalHours}h ${mins}m`;
      }
      return `${totalHours}h`;
    }
  }

  return clean;
}

