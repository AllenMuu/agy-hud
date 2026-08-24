import path from 'node:path';
import { AntigravityStdinPayload } from '../types/antigravity.js';
import { HUDConfig } from '../types/config.js';
import { HUDState, ModelGroupQuotaState } from '../types/state.js';
import { resolveTranscriptPath, scanTranscriptTail } from './transcript-tail.js';
import { getVCSState } from './vcs-collector.js';
import {
  detectModelGroup,
  getQuotaForModelGroup,
  loadQuotaCache,
  saveQuotaCache,
  QuotaCacheData,
} from './quota-collector.js';

export function aggregateState(payload: AntigravityStdinPayload, config: HUDConfig): HUDState {
  // 1. Model & Provider & Model Quota Group
  let modelName = 'Gemini';
  let provider: string | undefined;

  if (typeof payload.model === 'string') {
    modelName = payload.model;
  } else if (payload.model && typeof payload.model === 'object') {
    modelName = payload.model.display_name || payload.model.id || 'Gemini';
    provider = payload.model.provider;
  }

  const modelGroup = detectModelGroup(modelName, provider);

  // 2. Workspace
  const workspacePath = payload.workspace?.root_path || process.cwd();
  const workspaceName = payload.workspace?.workspace_name || path.basename(workspacePath) || 'workspace';

  // 3. VCS
  const vcs = getVCSState(workspacePath, config.git);

  // 4. Context Tokens (support context and context_window formats)
  const cw = payload.context_window;
  const ctx = payload.context;

  const used =
    cw?.estimated_tokens_used ??
    (cw?.current_usage
      ? (cw.current_usage.input_tokens || 0) + (cw.current_usage.output_tokens || 0)
      : undefined) ??
    ctx?.tokens_used ??
    0;

  const limit =
    cw?.context_window_size ??
    ctx?.tokens_limit ??
    (modelName.toLowerCase().includes('gemini')
      ? 1000000
      : modelName.toLowerCase().includes('gpt')
        ? 128000
        : 200000);

  let percent = 0;
  if (cw?.used_percentage !== undefined) {
    percent = Math.round(cw.used_percentage);
  } else if (cw?.remaining_percentage !== undefined) {
    percent = Math.max(0, Math.min(100, Math.round(100 - cw.remaining_percentage)));
  } else if (ctx?.tokens_percent !== undefined) {
    percent = Math.round(ctx.tokens_percent);
  } else if (limit > 0) {
    percent = Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  }

  // 5. Transcript analysis (Tail chunk scanner)
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

  // 6. Quota & Limits (Multi-model group aware)
  if (payload.quota?.gemini || payload.quota?.claude_gpt) {
    const dataToSave: QuotaCacheData = {
      updatedAt: Date.now(),
    };
    if (payload.quota.gemini) {
      const g5 = payload.quota.gemini.five_hour_percent ?? 0;
      const gw = payload.quota.gemini.weekly_percent ?? 0;
      dataToSave.gemini = {
        fiveHour: {
          remainingPercent: 100 - g5,
          usedPercent: g5,
          resetsIn: payload.quota.gemini.resets_in,
        },
        weekly: {
          remainingPercent: 100 - gw,
          usedPercent: gw,
        },
      };
    }
    if (payload.quota.claude_gpt) {
      const c5 = payload.quota.claude_gpt.five_hour_percent ?? 0;
      const cw = payload.quota.claude_gpt.weekly_percent ?? 0;
      dataToSave.claudeGpt = {
        fiveHour: {
          remainingPercent: 100 - c5,
          usedPercent: c5,
          resetsIn: payload.quota.claude_gpt.resets_in,
        },
        weekly: {
          remainingPercent: 100 - cw,
          usedPercent: cw,
        },
      };
    }
    saveQuotaCache(dataToSave);
  } else if (payload.quota?.hourly_percent !== undefined || payload.quota?.weekly_percent !== undefined) {
    const hp = payload.quota.hourly_percent ?? 0;
    const wp = payload.quota.weekly_percent ?? 0;
    const singleQuota = {
      fiveHour: {
        remainingPercent: 100 - hp,
        usedPercent: hp,
        resetsInSeconds: payload.quota.resets_in_seconds,
      },
      weekly: {
        remainingPercent: 100 - wp,
        usedPercent: wp,
      },
    };
    saveQuotaCache({
      [modelGroup === 'claude_gpt' ? 'claudeGpt' : 'gemini']: singleQuota,
      hourlyPercent: hp,
      weeklyPercent: wp,
      resetsInSeconds: payload.quota.resets_in_seconds,
    });
  }

  const cached = loadQuotaCache();
  const groupQuota = getQuotaForModelGroup(modelGroup, cached);

  let quota: ModelGroupQuotaState | undefined;
  if (groupQuota) {
    const shortTerm = groupQuota.shortTerm || groupQuota.fiveHour;
    quota = {
      group: modelGroup,
      fiveHour: groupQuota.fiveHour,
      shortTerm,
      weekly: groupQuota.weekly,
      hourlyPercent: shortTerm.usedPercent,
      weeklyPercent: groupQuota.weekly.usedPercent,
      resetsInSeconds: shortTerm.resetsInSeconds,
    };
  }

  // 7. Session duration
  const sessionDurationMs = payload.current_turn?.duration_ms;

  return {
    modelName,
    provider,
    modelGroup,
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
