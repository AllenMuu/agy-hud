import { HUDConfig } from '../types/config.js';

export const DEFAULT_CONFIG: HUDConfig = {
  preset: 'full',
  language: 'en',
  display: {
    preset: 'full',
    language: 'en',
    lineLayout: 'expanded',
    showModel: true,
    showWorkspace: true,
    showGit: true,
    showContextBar: true,
    contextValue: 'percent',
    showTools: true,
    showAgents: true,
    showTodos: true,
    showQuota: true,
    showFiveHourQuota: true,
    showWeeklyQuota: true,
    quotaDisplayMode: 'remaining',
    showDuration: true,
    barWidth: 10,
    pathLevels: 1,
    maxWidth: null,
  },
  git: {
    enabled: true,
    showDirty: true,
    showAheadBehind: true,
    showFileStats: false,
  },
  thresholds: {
    contextWarning: 70,
    contextCritical: 85,
    quotaWarning: 75,
    quotaCritical: 90,
  },
  advanced: {
    transcriptTailBytes: 64 * 1024, // 64KB tail
    transcriptTimeoutMs: 15, // 15ms timeout guard
  },
};
