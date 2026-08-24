import { RecentToolActivity, SubagentActivity, TodoProgress } from './antigravity.js';
import { VCSState } from './vcs.js';

export type ModelQuotaGroup = 'gemini' | 'claude_gpt';

export interface QuotaLimitItem {
  remainingPercent: number;
  usedPercent: number;
  resetsIn?: string;
  resetsInSeconds?: number;
  resetTimestamp?: number;
  windowHours?: number;
  label?: string;
}

export interface ModelGroupQuotaState {
  group: ModelQuotaGroup;
  fiveHour?: QuotaLimitItem;
  shortTerm?: QuotaLimitItem;
  weekly?: QuotaLimitItem;
  // Legacy backward compatibility
  hourlyPercent: number;
  weeklyPercent: number;
  resetsInSeconds?: number;
}

export interface HUDState {
  modelName: string;
  provider?: string;
  modelGroup: ModelQuotaGroup;
  workspaceName: string;
  workspacePath: string;
  vcs: VCSState;
  contextTokens: {
    used: number;
    limit: number;
    percent: number;
  };
  quota?: ModelGroupQuotaState;
  recentTools: RecentToolActivity[];
  activeSubagents: SubagentActivity[];
  todoProgress?: TodoProgress;
  sessionDurationMs?: number;
}

