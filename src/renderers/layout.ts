import { HUDState } from '../types/state.js';
import { HUDConfig } from '../types/config.js';
import { colors, style } from '../formatters/ansi.js';
import { truncate, stringWidth } from '../formatters/text.js';
import {
  formatModelBadge,
  formatWorkspaceAndGitItems,
  formatContextBar,
  formatToolItems,
  formatSubagentItems,
  formatTodoProgress,
  formatQuotaAndDurationItems,
} from './presets.js';

export function getTerminalWidth(fallbackMaxWidth: number | null = null): number {
  if (fallbackMaxWidth && fallbackMaxWidth > 0) {
    return fallbackMaxWidth;
  }
  if (process.stdout && process.stdout.columns) {
    return process.stdout.columns;
  }
  return 80; // Safe default
}

/**
 * Wraps segments into multiple lines when their combined width exceeds maxWidth.
 */
export function wrapSegments(
  segments: (string | null | undefined)[],
  maxWidth: number,
  sep = style(' │ ', colors.gray)
): string[] {
  const validSegs = segments.filter((s): s is string => Boolean(s && s.length > 0));
  if (validSegs.length === 0) return [];

  const lines: string[] = [];
  let currentLine = '';

  for (const seg of validSegs) {
    if (!currentLine) {
      currentLine = seg;
    } else {
      const candidate = `${currentLine}${sep}${seg}`;
      if (stringWidth(candidate) <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = seg;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function renderHUD(state: HUDState, config: HUDConfig): string {
  const preset = config.preset || config.display.preset || 'full';
  const termWidth = getTerminalWidth(config.display.maxWidth);
  const sep = style(' │ ', colors.gray);

  const lines: string[] = [];

  if (preset === 'minimal') {
    // Minimal preset: Single line with Model and Context bar (wrapped if exceeds width)
    const segs: string[] = [];
    if (config.display.showModel) segs.push(formatModelBadge(state));
    if (config.display.showContextBar) segs.push(formatContextBar(state, config));
    lines.push(...wrapSegments(segs, termWidth, sep));
  } else if (preset === 'essential') {
    // Essential preset: 2 sections
    // Line 1: Model + Workspace/Git + Context
    const line1Segs: string[] = [];
    if (config.display.showModel) line1Segs.push(formatModelBadge(state));
    line1Segs.push(...formatWorkspaceAndGitItems(state, config, termWidth));
    if (config.display.showContextBar) line1Segs.push(formatContextBar(state, config));
    lines.push(...wrapSegments(line1Segs, termWidth, sep));

    // Line 2: Tool Activity + Subagents (compact)
    const line2Segs: string[] = [
      ...formatToolItems(state, config),
      ...formatSubagentItems(state, config),
    ];
    if (line2Segs.length > 0) {
      lines.push(...wrapSegments(line2Segs, termWidth, sep));
    }
  } else {
    // Full preset: 3 sections
    // Line 1: Model + Workspace & Git + Context Bar
    const line1Segs: string[] = [];
    if (config.display.showModel) line1Segs.push(formatModelBadge(state));
    line1Segs.push(...formatWorkspaceAndGitItems(state, config, termWidth));
    if (config.display.showContextBar) line1Segs.push(formatContextBar(state, config));
    lines.push(...wrapSegments(line1Segs, termWidth, sep));

    // Line 2: Tools Activity & Subagents
    const line2Segs: string[] = [
      ...formatToolItems(state, config),
      ...formatSubagentItems(state, config),
    ];
    if (line2Segs.length > 0) {
      lines.push(...wrapSegments(line2Segs, termWidth, sep));
    }

    // Line 3: Tasks / Todo progress & Quota / Duration
    const line3Segs: string[] = [];
    const todos = formatTodoProgress(state, config);
    if (todos) line3Segs.push(todos);
    line3Segs.push(...formatQuotaAndDurationItems(state, config));
    if (line3Segs.length > 0) {
      lines.push(...wrapSegments(line3Segs, termWidth, sep));
    }
  }

  // Width clamping and truncation per line (safety fallback for single items exceeding termWidth)
  const formattedLines = lines.map((line) => {
    if (stringWidth(line) > termWidth) {
      return truncate(line, termWidth);
    }
    return line;
  });

  return formattedLines.join('\n');
}
