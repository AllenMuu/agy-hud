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
 * Parses duration strings like "2h 15m", "165h 15m", "6d 21h", "45m", "30s", "2小时15分" into milliseconds.
 */
export function parseDurationToMs(durationStr?: string): number {
  if (!durationStr || !durationStr.trim()) return 0;
  const str = durationStr.trim().toLowerCase();

  let totalMs = 0;

  // Days: e.g. "6d", "6天", "6 days"
  const dayMatch = str.match(/(\d+)\s*(?:d|day|days|天)/i);
  if (dayMatch) {
    totalMs += parseInt(dayMatch[1], 10) * 86400 * 1000;
  }

  // Hours: e.g. "2h", "2 hours", "2小时", "2时"
  const hourMatch = str.match(/(\d+)\s*(?:h|hr|hrs|hour|hours|小时|时)/i);
  if (hourMatch) {
    totalMs += parseInt(hourMatch[1], 10) * 3600 * 1000;
  }

  // Minutes: e.g. "15m", "15 mins", "15分", "15分钟"
  const minMatch = str.match(/(\d+)\s*(?:m|min|mins|minute|minutes|分|分钟)(?![a-zA-Z])/i);
  if (minMatch) {
    totalMs += parseInt(minMatch[1], 10) * 60 * 1000;
  }

  // Seconds: e.g. "30s", "30 secs", "30秒"
  const secMatch = str.match(/(\d+)\s*(?:s|sec|secs|second|seconds|秒)/i);
  if (secMatch) {
    totalMs += parseInt(secMatch[1], 10) * 1000;
  }

  // Plain number of seconds fallback
  if (totalMs === 0 && /^\d+$/.test(str)) {
    totalMs = parseInt(str, 10) * 1000;
  }

  return totalMs;
}

/**
 * Formats milliseconds remaining into a concise human-readable reset string.
 */
export function formatRemainingMs(remainingMs: number, lang = 'en'): string {
  if (remainingMs <= 0) return '';
  const isZh = lang.startsWith('zh');

  const totalSecs = Math.ceil(remainingMs / 1000);
  if (totalSecs < 60) {
    return isZh ? `${totalSecs}秒` : `${totalSecs}s`;
  }

  const totalMins = Math.ceil(remainingMs / (60 * 1000));
  if (totalMins < 60) {
    return `${totalMins}m`;
  }

  const totalHours = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;

  if (totalHours < 24) {
    return remMins > 0 ? `${totalHours}h ${remMins}m` : `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;

  if (isZh) {
    return remHours > 0 ? `${days}天${remHours}h` : `${days}天`;
  }
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Formats quota reset time string, dynamically computing remaining time if resetTimestamp is provided.
 */
export function formatResetTime(
  resetsIn?: string,
  lang = 'en',
  resetTimestamp?: number,
  now = Date.now()
): string {
  if (resetTimestamp && resetTimestamp > 0) {
    const remainingMs = resetTimestamp - now;
    if (remainingMs <= 0) return '';
    return formatRemainingMs(remainingMs, lang);
  }

  if (!resetsIn || !resetsIn.trim()) return '';
  const clean = resetsIn.trim();
  const ms = parseDurationToMs(clean);
  if (ms > 0) {
    return formatRemainingMs(ms, lang);
  }

  return clean;
}

