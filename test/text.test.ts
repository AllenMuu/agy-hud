import { describe, it, expect } from 'vitest';
import { stringWidth, truncate, formatTokens, formatDuration, formatResetTime } from '../src/formatters/text.js';

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

  it('should format reset time into days and hours', () => {
    expect(formatResetTime('165h 15m', 'zh-Hans')).toBe('6天21h');
    expect(formatResetTime('166h 2m', 'zh-Hans')).toBe('6天22h');
    expect(formatResetTime('168h', 'zh-Hans')).toBe('7天');
    expect(formatResetTime('2h 15m', 'zh-Hans')).toBe('2h 15m');
    expect(formatResetTime('165h 15m', 'en')).toBe('6d 21h');
  });
});
