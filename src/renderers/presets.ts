import { HUDState } from '../types/state.js';
import { HUDConfig } from '../types/config.js';
import { colors, style } from '../formatters/ansi.js';
import { renderBar, renderRemainingBar } from '../formatters/bar.js';
import { formatDuration, formatResetTime, formatTokens, stringWidth } from '../formatters/text.js';
import { getTranslations } from '../formatters/i18n.js';

export function formatModelBadge(state: HUDState): string {
  const name = state.modelName;
  const provider = state.provider ? `${state.provider} | ` : '';
  return style(`[${provider}${name}]`, colors.bold, colors.brightCyan);
}

export function formatWorkspaceAndGitItems(
  state: HUDState,
  config: HUDConfig,
  maxWidth?: number
): string[] {
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

  if (parts.length <= 1) {
    return parts;
  }

  const combined = parts.join(' ');
  if (maxWidth && stringWidth(combined) > maxWidth) {
    return parts;
  }
  return [combined];
}

export function formatWorkspaceAndGit(state: HUDState, config: HUDConfig): string {
  const items = formatWorkspaceAndGitItems(state, config);
  return items.join(' ');
}

export function formatContextBar(state: HUDState, config: HUDConfig): string {
  const t = getTranslations(config.language);
  const percent = state.contextTokens.percent;
  const isOverflow = percent > 100;

  const bar = renderBar(Math.min(100, percent), {
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
    valStr = isOverflow
      ? `0% ${t.remaining} (+${percent - 100}%)`
      : `${100 - percent}% ${t.remaining}`;
  }

  if (isOverflow) {
    valStr += ` [${config.language.startsWith('zh') ? '已超限' : 'OVERFLOW'}]`;
  }

  let color = colors.brightGreen;
  if (percent >= config.thresholds.contextCritical || isOverflow) color = colors.brightRed;
  else if (percent >= config.thresholds.contextWarning) color = colors.brightYellow;

  return `${style(t.context, colors.dim)} ${bar} ${style(valStr, colors.bold, color)}`;
}

export function formatToolItems(state: HUDState, config: HUDConfig): string[] {
  if (!config.display.showTools || !state.recentTools.length) {
    return [];
  }

  return state.recentTools.map((t) => {
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
}

export function formatToolActivity(state: HUDState, config: HUDConfig): string | null {
  const items = formatToolItems(state, config);
  return items.length ? items.join(style(' │ ', colors.gray)) : null;
}

export function formatSubagentItems(state: HUDState, config: HUDConfig): string[] {
  if (!config.display.showAgents || !state.activeSubagents.length) {
    return [];
  }

  return state.activeSubagents.map((sub) => {
    const icon = sub.state === 'running' ? '◐' : '✓';
    const role = sub.role || sub.typeName;
    return `${style(icon, colors.brightCyan)} ${style(`[${role}]`, colors.cyan)}`;
  });
}

export function formatSubagents(state: HUDState, config: HUDConfig): string | null {
  const items = formatSubagentItems(state, config);
  return items.length ? items.join(style(' │ ', colors.gray)) : null;
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

export function formatQuotaAndDurationItems(state: HUDState, config: HUDConfig): string[] {
  const parts: string[] = [];
  const t = getTranslations(config.language);

  if (config.display.showQuota && state.quota) {
    const isRemaining = config.display.quotaDisplayMode !== 'used';
    const quota = state.quota;

    // 1. Short-Term Limit Quota (5-Hour / 6-Hour / Hourly)
    const shortTermQuota = quota.shortTerm || quota.fiveHour;
    const showShort =
      config.display.showShortTermQuota !== false && config.display.showFiveHourQuota !== false;

    if (showShort && shortTermQuota) {
      const val = isRemaining ? shortTermQuota.remainingPercent : shortTermQuota.usedPercent;
      const qBar = isRemaining
        ? renderRemainingBar(val, 6)
        : renderBar(val, {
            width: 6,
            thresholds: {
              warning: config.thresholds.quotaWarning,
              critical: config.thresholds.quotaCritical,
            },
          });

      const unit = isRemaining ? t.remaining : '';
      let numColor = colors.brightGreen;
      if (isRemaining) {
        if (val <= 20) numColor = colors.brightRed;
        else if (val <= 40) numColor = colors.brightYellow;
      } else {
        if (val >= config.thresholds.quotaCritical) numColor = colors.brightRed;
        else if (val >= config.thresholds.quotaWarning) numColor = colors.brightYellow;
      }

      const label =
        shortTermQuota.label ||
        (shortTermQuota.windowHours === 6
          ? t.sixHour
          : shortTermQuota.windowHours === 5
            ? t.fiveHour
            : shortTermQuota.windowHours
              ? `${shortTermQuota.windowHours}h`
              : t.fiveHour);

      const resetTime = formatResetTime(
        shortTermQuota.resetsIn,
        config.language,
        shortTermQuota.resetTimestamp
      );
      const resetStr = resetTime ? ` (${resetTime})` : '';
      parts.push(
        `${style(label, colors.dim)} ${qBar} ${style(`${Math.round(val)}%${unit}`, colors.bold, numColor)}${style(resetStr, colors.gray)}`
      );
    }

    // 2. Weekly Limit Quota
    if (config.display.showWeeklyQuota !== false && quota.weekly) {
      const val = isRemaining ? quota.weekly.remainingPercent : quota.weekly.usedPercent;
      const qBar = isRemaining
        ? renderRemainingBar(val, 6)
        : renderBar(val, {
            width: 6,
            thresholds: {
              warning: config.thresholds.quotaWarning,
              critical: config.thresholds.quotaCritical,
            },
          });

      const unit = isRemaining ? t.remaining : '';
      let numColor = colors.brightGreen;
      if (isRemaining) {
        if (val <= 20) numColor = colors.brightRed;
        else if (val <= 40) numColor = colors.brightYellow;
      } else {
        if (val >= config.thresholds.quotaCritical) numColor = colors.brightRed;
        else if (val >= config.thresholds.quotaWarning) numColor = colors.brightYellow;
      }

      const resetTime = formatResetTime(
        quota.weekly.resetsIn,
        config.language,
        quota.weekly.resetTimestamp
      );
      const resetStr = resetTime ? ` (${resetTime})` : '';
      parts.push(
        `${style(t.weekly, colors.dim)} ${qBar} ${style(`${Math.round(val)}%${unit}`, colors.bold, numColor)}${style(resetStr, colors.gray)}`
      );
    }
  }

  if (config.display.showDuration && state.sessionDurationMs !== undefined) {
    parts.push(
      `${style(t.time, colors.dim)} ${style(formatDuration(state.sessionDurationMs), colors.white)}`
    );
  }

  return parts;
}

export function formatQuotaAndDuration(state: HUDState, config: HUDConfig): string | null {
  const parts = formatQuotaAndDurationItems(state, config);
  return parts.length ? parts.join(style(' │ ', colors.gray)) : null;
}
