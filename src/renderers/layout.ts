import { HUDState } from '../types/state.js';
import { HUDConfig } from '../types/config.js';
import { colors, style } from '../formatters/ansi.js';
import { truncate, stringWidth } from '../formatters/text.js';
import {
  formatModelBadge,
  formatWorkspaceAndGit,
  formatContextBar,
  formatToolActivity,
  formatSubagents,
  formatTodoProgress,
  formatQuotaAndDuration,
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

export function renderHUD(state: HUDState, config: HUDConfig): string {
  const preset = config.preset || config.display.preset || 'full';
  const termWidth = getTerminalWidth(config.display.maxWidth);
  const sep = style(' │ ', colors.gray);

  const lines: string[] = [];

  if (preset === 'minimal') {
    // Minimal preset: Single line with Model and Context bar
    const segs: string[] = [];
    if (config.display.showModel) segs.push(formatModelBadge(state));
    if (config.display.showContextBar) segs.push(formatContextBar(state, config));
    lines.push(segs.join(sep));
  } else if (preset === 'essential') {
    // Essential preset: 2 lines
    // Line 1: Model + Workspace/Git + Context
    const line1Segs: string[] = [];
    if (config.display.showModel) line1Segs.push(formatModelBadge(state));
    const wsGit = formatWorkspaceAndGit(state, config);
    if (wsGit) line1Segs.push(wsGit);
    if (config.display.showContextBar) line1Segs.push(formatContextBar(state, config));
    lines.push(line1Segs.join(sep));

    // Line 2: Tool Activity + Subagents (compact)
    const line2Segs: string[] = [];
    const tools = formatToolActivity(state, config);
    if (tools) line2Segs.push(tools);
    const subagents = formatSubagents(state, config);
    if (subagents) line2Segs.push(subagents);

    if (line2Segs.length > 0) {
      lines.push(line2Segs.join(sep));
    }
  } else {
    // Full preset: 3 - 4 lines
    // Line 1: Model + Workspace & Git + Context Bar
    const line1Segs: string[] = [];
    if (config.display.showModel) line1Segs.push(formatModelBadge(state));
    const wsGit = formatWorkspaceAndGit(state, config);
    if (wsGit) line1Segs.push(wsGit);
    if (config.display.showContextBar) line1Segs.push(formatContextBar(state, config));
    lines.push(line1Segs.join(sep));

    // Line 2: Tools Activity & Subagents
    const line2Segs: string[] = [];
    const tools = formatToolActivity(state, config);
    if (tools) line2Segs.push(tools);
    const subagents = formatSubagents(state, config);
    if (subagents) line2Segs.push(subagents);
    if (line2Segs.length > 0) {
      lines.push(line2Segs.join(sep));
    }

    // Line 3: Tasks / Todo progress & Quota / Duration
    const line3Segs: string[] = [];
    const todos = formatTodoProgress(state, config);
    if (todos) line3Segs.push(todos);
    const quotaDur = formatQuotaAndDuration(state, config);
    if (quotaDur) line3Segs.push(quotaDur);
    if (line3Segs.length > 0) {
      lines.push(line3Segs.join(sep));
    }
  }

  // Width clamping and truncation per line
  const formattedLines = lines.map((line) => {
    if (stringWidth(line) > termWidth) {
      return truncate(line, termWidth);
    }
    return line;
  });

  return formattedLines.join('\n');
}
