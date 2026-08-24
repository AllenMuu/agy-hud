import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ModelQuotaGroup, QuotaLimitItem } from '../types/state.js';
import { parseDurationToMs, formatRemainingMs } from '../formatters/text.js';

export interface ModelGroupQuota {
  fiveHour: QuotaLimitItem;
  shortTerm?: QuotaLimitItem;
  weekly: QuotaLimitItem;
}

export interface QuotaCacheData {
  updatedAt?: number;
  gemini?: ModelGroupQuota;
  claudeGpt?: ModelGroupQuota;
  // Legacy / fallback fields
  hourlyPercent?: number;
  weeklyPercent?: number;
  resetsInSeconds?: number;
}

export function getQuotaCachePath(): string {
  return path.join(os.homedir(), '.gemini', 'config', 'agy-hud', 'quota-cache.json');
}

/**
 * Detects whether the model belongs to GEMINI or CLAUDE/GPT group.
 */
export function detectModelGroup(modelName?: string, provider?: string): ModelQuotaGroup {
  const m = (modelName || '').toLowerCase();
  const p = (provider || '').toLowerCase();

  if (
    m.includes('claude') ||
    m.includes('sonnet') ||
    m.includes('opus') ||
    m.includes('haiku') ||
    m.includes('gpt') ||
    m.includes('openai') ||
    m.includes('anthropic') ||
    m.includes('o1') ||
    m.includes('o3') ||
    p.includes('anthropic') ||
    p.includes('openai')
  ) {
    return 'claude_gpt';
  }
  return 'gemini';
}

function parseLimitBlock(
  blockText: string,
  defaultWindowHours?: number,
  baseTimestamp: number = Date.now()
): QuotaLimitItem | undefined {
  const pctMatch = blockText.match(/([\d\.]+)%/);
  const refreshMatch = blockText.match(
    /(?:Refreshes|Resets)\s+in\s+([^\n\r·]+)|将在\s*([^\n\r·]+?)\s*后(?:刷新|重置)|重置时间[:：]\s*([^\n\r·]+)/i
  );

  if (pctMatch) {
    const rawPct = parseFloat(pctMatch[1]);
    const isUsed = /used|已用/i.test(blockText) && !/remaining|余/i.test(blockText);
    const remaining = isUsed ? 100 - rawPct : rawPct;
    const resetsInRaw = refreshMatch
      ? (refreshMatch[1] || refreshMatch[2] || refreshMatch[3] || '').trim()
      : undefined;

    const durationMs = resetsInRaw ? parseDurationToMs(resetsInRaw) : 0;
    const resetsInSeconds = durationMs > 0 ? Math.ceil(durationMs / 1000) : undefined;
    const resetTimestamp = durationMs > 0 ? baseTimestamp + durationMs : undefined;

    return {
      remainingPercent: Math.max(0, Math.min(100, Math.round(remaining * 100) / 100)),
      usedPercent: Math.max(0, Math.min(100, Math.round((100 - remaining) * 100) / 100)),
      resetsIn: resetsInRaw,
      resetsInSeconds,
      resetTimestamp,
      windowHours: defaultWindowHours,
      label: defaultWindowHours ? (defaultWindowHours >= 24 ? 'Wk' : `${defaultWindowHours}h`) : undefined,
    };
  }
  return undefined;
}

/**
 * Parses raw Antigravity `/usage` text or output into structured QuotaCacheData.
 */
export function parseUsageText(text: string, baseTimestamp: number = Date.now()): QuotaCacheData {
  const result: QuotaCacheData = {
    updatedAt: baseTimestamp,
  };

  function parseSection(sectionText: string): ModelGroupQuota | undefined {
    let weekly: QuotaLimitItem | undefined;
    let shortTerm: QuotaLimitItem | undefined;

    // 1. Weekly Limit Block
    const weeklyMatch = sectionText.match(
      /(?:Weekly|Week|7[\s-]*Day|周|每周)\s*(?:Limit|限额)[\s\S]*?(?=(?:(?:Five|Six|Seven|Eight|5|6|7|8|\d+)\s*(?:-|–)?\s*(?:Hour|小时|h)|Hourly|小时|Daily|日|Short[\s-]*Term|短期|Rolling)\s*(?:Limit|限额)|$)/i
    );
    if (weeklyMatch) {
      weekly = parseLimitBlock(weeklyMatch[0], 168, baseTimestamp);
      if (weekly) {
        weekly.windowHours = 168;
        weekly.label = 'Wk';
      }
    }

    // 2. Short-term (5-Hour / 6-Hour / Hourly) Limit Block
    const shortTermMatch = sectionText.match(
      /(?:(?:Five|Six|Seven|Eight|5|6|7|8|\d+)\s*(?:-|–)?\s*(?:Hour|小时|h)|Hourly|小时|Daily|日|Short[\s-]*Term|短期|Rolling)\s*(?:Limit|限额)[\s\S]*?(?=(?:Weekly|Week|7[\s-]*Day|周|每周)\s*(?:Limit|限额)|$)/i
    );
    if (shortTermMatch) {
      const block = shortTermMatch[0];
      let windowHours = 5;
      if (/(?:Six|6\s*Hour|6-Hour|6h|6小时)/i.test(block)) {
        windowHours = 6;
      } else if (/(?:Five|5\s*Hour|5-Hour|5h|5小时)/i.test(block)) {
        windowHours = 5;
      } else {
        const numMatch = block.match(/(\d+)\s*(?:Hour|小时|h)/i);
        if (numMatch) {
          windowHours = parseInt(numMatch[1], 10);
        }
      }

      shortTerm = parseLimitBlock(block, windowHours, baseTimestamp);
      if (shortTerm) {
        shortTerm.windowHours = windowHours;
        shortTerm.label = `${windowHours}h`;
      }
    }

    if (weekly && shortTerm) {
      return { weekly, fiveHour: shortTerm, shortTerm };
    } else if (shortTerm || weekly) {
      const fallbackShort: QuotaLimitItem = shortTerm || {
        remainingPercent: 100,
        usedPercent: 0,
        windowHours: 5,
        label: '5h',
      };
      const fallbackWeekly: QuotaLimitItem = weekly || {
        remainingPercent: 100,
        usedPercent: 0,
        windowHours: 168,
        label: 'Wk',
      };
      return {
        fiveHour: fallbackShort,
        shortTerm: fallbackShort,
        weekly: fallbackWeekly,
      };
    }
    return undefined;
  }

  const geminiIndex = text.search(/GEMINI\s+MODELS|GEMINI/i);
  const claudeIndex = text.search(/CLAUDE\s+(?:AND|&)\s+GPT\s+MODELS|CLAUDE/i);

  if (geminiIndex !== -1) {
    const geminiText =
      claudeIndex > geminiIndex ? text.slice(geminiIndex, claudeIndex) : text.slice(geminiIndex);
    const geminiQuota = parseSection(geminiText);
    if (geminiQuota) {
      result.gemini = geminiQuota;
    }
  }

  if (claudeIndex !== -1) {
    const claudeText =
      geminiIndex > claudeIndex ? text.slice(claudeIndex, geminiIndex) : text.slice(claudeIndex);
    const claudeQuota = parseSection(claudeText);
    if (claudeQuota) {
      result.claudeGpt = claudeQuota;
    }
  }

  // Fallback: if no specific group headers, try parsing as generic
  if (!result.gemini && !result.claudeGpt) {
    const generic = parseSection(text);
    if (generic) {
      result.gemini = generic;
      result.claudeGpt = generic;
    }
  }

  return result;
}

export function loadQuotaCache(): QuotaCacheData | null {
  try {
    const p = getQuotaCachePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return data;
    }
  } catch {}
  return null;
}

function ensureItemTimestamps(item?: QuotaLimitItem, updatedAt: number = Date.now()): QuotaLimitItem | undefined {
  if (!item) return undefined;
  if (!item.resetTimestamp && item.resetsIn) {
    const durMs = parseDurationToMs(item.resetsIn);
    if (durMs > 0) {
      item.resetTimestamp = updatedAt + durMs;
      item.resetsInSeconds = Math.ceil(durMs / 1000);
    }
  }
  return item;
}

export function saveQuotaCache(data: QuotaCacheData): void {
  try {
    const p = getQuotaCachePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = data.updatedAt || Date.now();

    // Merge with existing cache if present
    let existing: QuotaCacheData = {};
    if (fs.existsSync(p)) {
      try {
        existing = JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch {}
    }

    // Guard: do not overwrite a newer cache with older historical data
    if (existing.updatedAt && now < existing.updatedAt) {
      return;
    }

    if (data.gemini) {
      ensureItemTimestamps(data.gemini.fiveHour, now);
      ensureItemTimestamps(data.gemini.shortTerm, now);
      ensureItemTimestamps(data.gemini.weekly, now);
    }

    if (data.claudeGpt) {
      ensureItemTimestamps(data.claudeGpt.fiveHour, now);
      ensureItemTimestamps(data.claudeGpt.shortTerm, now);
      ensureItemTimestamps(data.claudeGpt.weekly, now);
    }

    const mergedGemini = data.gemini || existing.gemini;
    const mergedClaude = data.claudeGpt || existing.claudeGpt;

    const merged: QuotaCacheData = {
      ...existing,
      ...data,
      gemini: mergedGemini,
      claudeGpt: mergedClaude,
      updatedAt: now,
    };

    fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {}
}

/**
 * Retrieves the quota specific to the currently selected model group with real-time countdown & auto-refresh.
 */
export function getQuotaForModelGroup(
  group: ModelQuotaGroup,
  cache: QuotaCacheData | null,
  now: number = Date.now()
): { fiveHour: QuotaLimitItem; shortTerm: QuotaLimitItem; weekly: QuotaLimitItem } | null {
  if (!cache) return null;

  let groupQuota: ModelGroupQuota | undefined;
  if (group === 'claude_gpt' && cache.claudeGpt) {
    groupQuota = cache.claudeGpt;
  } else if (group === 'gemini' && cache.gemini) {
    groupQuota = cache.gemini;
  }

  if (groupQuota) {
    const rawShort = groupQuota.shortTerm || groupQuota.fiveHour;
    const shortTermItem: QuotaLimitItem = { ...rawShort };
    const weeklyItem: QuotaLimitItem = { ...groupQuota.weekly };

    // Dynamic countdown & auto-refresh for Short-Term / 5h / 6h Quota
    let shortResetTimestamp = shortTermItem.resetTimestamp;
    if (!shortResetTimestamp && shortTermItem.resetsIn && cache.updatedAt) {
      const dur = parseDurationToMs(shortTermItem.resetsIn);
      if (dur > 0) {
        shortResetTimestamp = cache.updatedAt + dur;
      }
    }

    if (shortResetTimestamp && shortResetTimestamp > 0) {
      const remainingMs = shortResetTimestamp - now;
      if (remainingMs <= 0) {
        // Window has expired -> auto reset to 100% ready
        shortTermItem.remainingPercent = 100;
        shortTermItem.usedPercent = 0;
        shortTermItem.resetsIn = undefined;
        shortTermItem.resetsInSeconds = 0;
        shortTermItem.resetTimestamp = undefined;
      } else {
        shortTermItem.resetTimestamp = shortResetTimestamp;
        shortTermItem.resetsInSeconds = Math.ceil(remainingMs / 1000);
        shortTermItem.resetsIn = formatRemainingMs(remainingMs);
      }
    }

    // Dynamic countdown & auto-refresh for Weekly Quota
    let weeklyResetTimestamp = weeklyItem.resetTimestamp;
    if (!weeklyResetTimestamp && weeklyItem.resetsIn && cache.updatedAt) {
      const dur = parseDurationToMs(weeklyItem.resetsIn);
      if (dur > 0) {
        weeklyResetTimestamp = cache.updatedAt + dur;
      }
    }

    if (weeklyResetTimestamp && weeklyResetTimestamp > 0) {
      const remainingMs = weeklyResetTimestamp - now;
      if (remainingMs <= 0) {
        weeklyItem.remainingPercent = 100;
        weeklyItem.usedPercent = 0;
        weeklyItem.resetsIn = undefined;
        weeklyItem.resetsInSeconds = 0;
        weeklyItem.resetTimestamp = undefined;
      } else {
        weeklyItem.resetTimestamp = weeklyResetTimestamp;
        weeklyItem.resetsInSeconds = Math.ceil(remainingMs / 1000);
        weeklyItem.resetsIn = formatRemainingMs(remainingMs);
      }
    }

    return {
      fiveHour: shortTermItem,
      shortTerm: shortTermItem,
      weekly: weeklyItem,
    };
  }

  // Legacy fallback if single quota stored
  if (cache.hourlyPercent !== undefined || cache.weeklyPercent !== undefined) {
    const hp = cache.hourlyPercent ?? 0;
    const wp = cache.weeklyPercent ?? 0;
    const shortFallback: QuotaLimitItem = {
      remainingPercent: 100 - hp,
      usedPercent: hp,
      resetsInSeconds: cache.resetsInSeconds,
      windowHours: 5,
      label: '5h',
    };
    return {
      fiveHour: shortFallback,
      shortTerm: shortFallback,
      weekly: {
        remainingPercent: 100 - wp,
        usedPercent: wp,
        windowHours: 168,
        label: 'Wk',
      },
    };
  }

  return null;
}
