import { HUDState } from '../types/state.js';
import { HUDConfig } from '../types/config.js';
import { colors, style } from '../formatters/ansi.js';
import { renderBar } from '../formatters/bar.js';
import { formatDuration, formatTokens } from '../formatters/text.js';
import { getTranslations } from '../formatters/i18n.js';

export function formatModelBadge(state: HUDState): string {
  const name = state.modelName;
  const provider = state.provider ? `${state.provider} | ` : '';
  return style(`[${provider}${name}]`, colors.bold, colors.brightCyan);
}

export function formatWorkspaceAndGit(state: HUDState, config: HUDConfig): string {
  const parts: string[] = [];

  if (config.display.showWorkspace && state.workspaceName) {
    parts.push(style(state.workspaceName, colors.bold, colors.white));
  }

  if (config.display.showGit && state.vcs.type === 'git' && state.vcs.branch) {
    let gitStr = `git:(${state.vcs.branch}`;
    if (config.git.showDirty && state.vcs.isDirty) {
      gitStr += style('*', colors.brightYellow);
    }
    gitStr += ')';

    if (config.git.showAheadBehind && (state.vcs.ahead > 0 || state.vcs.behind > 0)) {
      const syn: string[] = [];
      if (state.vcs.ahead > 0) syn.push(`↑${state.vcs.ahead}`);
      if (state.vcs.behind > 0) syn.push(`↓${state.vcs.behind}`);
      gitStr += ` [${syn.join(' ')}]`;
    }

    parts.push(style(gitStr, colors.magenta));
  } else if (config.display.showGit && state.vcs.type === 'jj') {
    parts.push(style(`jj:(${state.vcs.branch})`, colors.magenta));
  }

  return parts.join(' ');
}

export function formatContextBar(state: HUDState, config: HUDConfig): string {
  const t = getTranslations(config.language);
  const percent = state.contextTokens.percent;
  const bar = renderBar(percent, {
    width: config.display.barWidth || 10,
    thresholds: {
      warning: config.thresholds.contextWarning,
      critical: config.thresholds.contextCritical,
    },
  });

  let valStr = `${percent}%`;
  if (config.display.contextValue === 'tokens') {
    valStr = `${formatTokens(state.contextTokens.used)}/${formatTokens(state.contextTokens.limit)}`;
  } else if (config.display.contextValue === 'both') {
    valStr = `${percent}% (${formatTokens(state.contextTokens.used)}/${formatTokens(state.contextTokens.limit)})`;
  } else if (config.display.contextValue === 'remaining') {
    valStr = `${100 - percent}% ${t.remaining}`;
  }

  let color = colors.brightGreen;
  if (percent >= config.thresholds.contextCritical) color = colors.brightRed;
  else if (percent >= config.thresholds.contextWarning) color = colors.brightYellow;

  return `${style(t.context, colors.dim)} ${bar} ${style(valStr, colors.bold, color)}`;
}

export function formatToolActivity(state: HUDState, config: HUDConfig): string | null {
  if (!config.display.showTools || !state.recentTools.length) {
    return null;
  }

  const items = state.recentTools.map((t) => {
    const icon = t.status === 'running' ? '◐' : t.status === 'error' ? '✘' : '✓';
    const color =
      t.status === 'running'
        ? colors.brightYellow
        : t.status === 'error'
          ? colors.brightRed
          : colors.brightGreen;
    const countStr = t.count > 1 ? ` ×${t.count}` : '';
    const detail = t.summary ? `: ${t.summary}` : '';
    return `${style(icon, color)} ${style(t.name + detail, colors.white)}${countStr}`;
  });

  return items.join(style(' │ ', colors.gray));
}

export function formatSubagents(state: HUDState, config: HUDConfig): string | null {
  if (!config.display.showAgents || !state.activeSubagents.length) {
    return null;
  }

  const items = state.activeSubagents.map((sub) => {
    const icon = sub.state === 'running' ? '◐' : '✓';
    const role = sub.role || sub.typeName;
    return `${style(icon, colors.brightCyan)} ${style(`[${role}]`, colors.cyan)}`;
  });

  return items.join(style(' │ ', colors.gray));
}

export function formatTodoProgress(state: HUDState, config: HUDConfig): string | null {
  if (!config.display.showTodos || !state.todoProgress) {
    return null;
  }

  const t = getTranslations(config.language);
  const { total, completed } = state.todoProgress;
  const pct = Math.round((completed / total) * 100);
  return `${style('▸', colors.brightYellow)} ${style(`${t.todos} [${completed}/${total}]`, colors.bold, colors.white)} ${style(`(${pct}%)`, colors.gray)}`;
}

export function formatQuotaAndDuration(state: HUDState, config: HUDConfig): string | null {
  const parts: string[] = [];
  const t = getTranslations(config.language);

  if (config.display.showQuota && state.quota) {
    const qBar = renderBar(state.quota.hourlyPercent, {
      width: 8,
      thresholds: {
        warning: config.thresholds.quotaWarning,
        critical: config.thresholds.quotaCritical,
      },
    });
    parts.push(
      `${style(t.usage, colors.dim)} ${qBar} ${style(`${state.quota.hourlyPercent}%`, colors.bold)}`
    );
  }

  if (config.display.showDuration && state.sessionDurationMs !== undefined) {
    parts.push(
      `${style(t.time, colors.dim)} ${style(formatDuration(state.sessionDurationMs), colors.white)}`
    );
  }

  return parts.length ? parts.join(style(' │ ', colors.gray)) : null;
}
