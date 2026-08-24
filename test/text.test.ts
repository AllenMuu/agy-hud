import { describe, it, expect } from 'vitest';
import {
  stringWidth,
  truncate,
  formatTokens,
  formatDuration,
  formatResetTime,
  parseDurationToMs,
  formatRemainingMs,
} from '../src/formatters/text.js';

describe('text formatters', () => {
  it('should compute string width accurately for ASCII and CJK', () => {
    expect(stringWidth('hello')).toBe(5);
    expect(stringWidth('你好')).toBe(4);
    expect(stringWidth('hello你好')).toBe(9);
  });

  it('should truncate string properly with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
    expect(truncate('你好世界测试', 6)).toBe('你好…');
    expect(truncate('short', 10)).toBe('short');
  });

  it('should format token counts', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(45000)).toBe('45k');
    expect(formatTokens(1500000)).toBe('1.5M');
  });

  it('should format duration', () => {
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(0)).toBe('0s');
  });

  it('should parse various duration strings into milliseconds accurately', () => {
    expect(parseDurationToMs('2h 15m')).toBe((2 * 3600 + 15 * 60) * 1000);
    expect(parseDurationToMs('165h 15m')).toBe((165 * 3600 + 15 * 60) * 1000);
    expect(parseDurationToMs('6d 21h')).toBe((6 * 86400 + 21 * 3600) * 1000);
    expect(parseDurationToMs('45m')).toBe(45 * 60 * 1000);
    expect(parseDurationToMs('30s')).toBe(30 * 1000);
    expect(parseDurationToMs('3小时15分')).toBe((3 * 3600 + 15 * 60) * 1000);
    expect(parseDurationToMs('6天21小时')).toBe((6 * 86400 + 21 * 3600) * 1000);
  });

  it('should format remaining milliseconds into human readable reset time', () => {
    expect(formatRemainingMs(45 * 60 * 1000, 'en')).toBe('45m');
    expect(formatRemainingMs((2 * 3600 + 15 * 60) * 1000, 'en')).toBe('2h 15m');
    expect(formatRemainingMs((6 * 86400 + 21 * 3600) * 1000, 'zh-Hans')).toBe('6天21h');
    expect(formatRemainingMs(0, 'en')).toBe('');
  });

  it('should format reset time into days and hours', () => {
    expect(formatResetTime('165h 15m', 'zh-Hans')).toBe('6天21h');
    expect(formatResetTime('166h 2m', 'zh-Hans')).toBe('6天22h');
    expect(formatResetTime('168h', 'zh-Hans')).toBe('7天');
    expect(formatResetTime('2h 15m', 'zh-Hans')).toBe('2h 15m');
    expect(formatResetTime('165h 15m', 'en')).toBe('6d 21h');
  });
});
