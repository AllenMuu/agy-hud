import { ColorThresholds } from '../types/config.js';
import { colors, style } from './ansi.js';

export interface BarOptions {
  width?: number;
  filledChar?: string;
  emptyChar?: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

/**
 * Generates a colorful terminal progress bar.
 * Example: [█████░░░░░] 50%
 */
export function renderBar(percent: number, options: BarOptions = {}): string {
  const width = options.width ?? 10;
  const filledChar = options.filledChar ?? '█';
  const emptyChar = options.emptyChar ?? '░';
  const warning = options.thresholds?.warning ?? 70;
  const critical = options.thresholds?.critical ?? 85;

  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = width - filledCount;

  let barColor = colors.brightGreen;
  if (clamped >= critical) {
    barColor = colors.brightRed;
  } else if (clamped >= warning) {
    barColor = colors.brightYellow;
  }

  const filledStr = style(filledChar.repeat(filledCount), barColor);
  const emptyStr = style(emptyChar.repeat(emptyCount), colors.gray);

  return `${filledStr}${emptyStr}`;
}
