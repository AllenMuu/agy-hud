import path from 'node:path';
import { AntigravityStdinPayload } from '../types/antigravity.js';
import { HUDConfig } from '../types/config.js';
import { HUDState } from '../types/state.js';
import { resolveTranscriptPath, scanTranscriptTail } from './transcript-tail.js';
import { getVCSState } from './vcs-collector.js';
import { loadQuotaCache, saveQuotaCache } from './quota-collector.js';

export function aggregateState(payload: AntigravityStdinPayload, config: HUDConfig): HUDState {
  // 1. Model & Provider
  let modelName = 'Gemini';
  let provider: string | undefined;

  if (typeof payload.model === 'string') {
    modelName = payload.model;
  } else if (payload.model && typeof payload.model === 'object') {
    modelName = payload.model.display_name || payload.model.id || 'Gemini';
    provider = payload.model.provider;
  }

  // 2. Workspace
  const workspacePath = payload.workspace?.root_path || process.cwd();
  const workspaceName = payload.workspace?.workspace_name || path.basename(workspacePath) || 'workspace';

  // 3. VCS
  const vcs = getVCSState(workspacePath, config.git);

  // 4. Context Tokens
  const used = payload.context?.tokens_used || 0;
  const limit = payload.context?.tokens_limit || 1000000;
  const percent =
    payload.context?.tokens_percent !== undefined
      ? payload.context.tokens_percent
      : limit > 0
        ? Math.round((used / limit) * 100)
        : 0;

  // 5. Quota & Limits
  let quota: HUDState['quota'] = payload.quota
    ? {
        hourlyPercent: payload.quota.hourly_percent ?? 0,
        weeklyPercent: payload.quota.weekly_percent ?? 0,
        resetsInSeconds: payload.quota.resets_in_seconds,
      }
    : undefined;

  if (quota) {
    saveQuotaCache(quota);
  } else {
    const cached = loadQuotaCache();
    if (cached) {
      quota = {
        hourlyPercent: cached.hourlyPercent,
        weeklyPercent: cached.weeklyPercent,
        resetsInSeconds: cached.resetsInSeconds,
      };
    }
  }

  // 6. Transcript analysis (Tail chunk scanner)
  const transcriptPath = resolveTranscriptPath(
    payload.transcript_path,
    payload.app_data_dir,
    payload.conversation_id
  );

  let recentTools: HUDState['recentTools'] = [];
  let activeSubagents: HUDState['activeSubagents'] = [];
  let todoProgress: HUDState['todoProgress'] | undefined;

  if (transcriptPath) {
    const tailBytes = config.advanced?.transcriptTailBytes || 64 * 1024;
    const timeoutMs = config.advanced?.transcriptTimeoutMs || 15;
    const result = scanTranscriptTail(transcriptPath, tailBytes, timeoutMs);
    recentTools = result.recentTools;
    activeSubagents = result.activeSubagents;
    todoProgress = result.todoProgress;
  }

  // 7. Session duration
  const sessionDurationMs = payload.current_turn?.duration_ms;

  return {
    modelName,
    provider,
    workspaceName,
    workspacePath,
    vcs,
    contextTokens: {
      used,
      limit,
      percent,
    },
    quota,
    recentTools,
    activeSubagents,
    todoProgress,
    sessionDurationMs,
  };
}
