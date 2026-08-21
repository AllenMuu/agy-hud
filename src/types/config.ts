export type HUDPreset = 'full' | 'essential' | 'minimal';
export type HUDLanguage = 'en' | 'zh' | 'zh-Hans' | 'zh-Hant';
export type ContextValueFormat = 'percent' | 'tokens' | 'remaining' | 'both';
export type LineLayout = 'expanded' | 'compact';

export interface GitStatusConfig {
  enabled: boolean;
  showDirty: boolean;
  showAheadBehind: boolean;
  showFileStats: boolean;
}

export interface DisplayConfig {
  preset: HUDPreset;
  language: HUDLanguage;
  lineLayout: LineLayout;
  showModel: boolean;
  showWorkspace: boolean;
  showGit: boolean;
  showContextBar: boolean;
  contextValue: ContextValueFormat;
  showTools: boolean;
  showAgents: boolean;
  showTodos: boolean;
  showQuota: boolean;
  showDuration: boolean;
  barWidth: number;
  pathLevels: number | 'full';
  maxWidth: number | null;
}

export interface ColorThresholds {
  contextWarning: number; // e.g. 70 (%)
  contextCritical: number; // e.g. 85 (%)
  quotaWarning: number; // e.g. 75 (%)
  quotaCritical: number; // e.g. 90 (%)
}

export interface HUDConfig {
  preset: HUDPreset;
  language: HUDLanguage;
  display: DisplayConfig;
  git: GitStatusConfig;
  thresholds: ColorThresholds;
  advanced?: {
    transcriptTailBytes?: number;
    transcriptTimeoutMs?: number;
  };
}
