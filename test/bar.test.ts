import { describe, it, expect } from 'vitest';
import { renderBar } from '../src/formatters/bar.js';
import { stripAnsi } from '../src/formatters/ansi.js';

describe('renderBar', () => {
  it('should render correct proportion of filled vs empty chars', () => {
    const bar50 = stripAnsi(renderBar(50, { width: 10 }));
    expect(bar50).toBe('█████░░░░░');

    const bar100 = stripAnsi(renderBar(100, { width: 10 }));
    expect(bar100).toBe('██████████');

    const bar0 = stripAnsi(renderBar(0, { width: 10 }));
    expect(bar0).toBe('░░░░░░░░░░');
  });

  it('should clamp values outside 0-100', () => {
    const barNeg = stripAnsi(renderBar(-10, { width: 10 }));
    expect(barNeg).toBe('░░░░░░░░░░');

    const barOver = stripAnsi(renderBar(150, { width: 10 }));
    expect(barOver).toBe('██████████');
  });
});
