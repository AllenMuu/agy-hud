import { RecentToolActivity, SubagentActivity, TodoProgress } from './antigravity.js';
import { VCSState } from './vcs.js';

export interface HUDState {
  modelName: string;
  provider?: string;
  workspaceName: string;
  workspacePath: string;
  vcs: VCSState;
  contextTokens: {
    used: number;
    limit: number;
    percent: number;
  };
  quota?: {
    hourlyPercent: number;
    weeklyPercent: number;
    resetsInSeconds?: number;
  };
  recentTools: RecentToolActivity[];
  activeSubagents: SubagentActivity[];
  todoProgress?: TodoProgress;
  sessionDurationMs?: number;
}
