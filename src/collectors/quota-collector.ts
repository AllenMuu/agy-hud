import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ModelQuotaGroup, QuotaLimitItem } from '../types/state.js';

export interface ModelGroupQuota {
  fiveHour: QuotaLimitItem;
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

/**
 * Parses raw Antigravity `/usage` text or output into structured QuotaCacheData.
 */
export function parseUsageText(text: string): QuotaCacheData {
  const result: QuotaCacheData = {
    updatedAt: Date.now(),
  };

  function parseSection(sectionText: string): ModelGroupQuota | undefined {
    let weekly: QuotaLimitItem | undefined;
    let fiveHour: QuotaLimitItem | undefined;

    // 1. Weekly Limit Block
    const weeklyBlockMatch = sectionText.match(/Weekly\s+Limit\s+Remaining([\s\S]*?)(?=Five\s+Hour|$)/i);
    if (weeklyBlockMatch) {
      const block = weeklyBlockMatch[1];
      const pctMatch = block.match(/([\d\.]+)%/);
      const refreshMatch = block.match(/Refreshes\s+in\s+([^\n\r·]+)/i);
      if (pctMatch) {
        const remaining = parseFloat(pctMatch[1]);
        weekly = {
          remainingPercent: Math.round(remaining * 100) / 100,
          usedPercent: Math.max(0, Math.min(100, Math.round((100 - remaining) * 100) / 100)),
          resetsIn: refreshMatch ? refreshMatch[1].trim() : undefined,
        };
      }
    }

    // 2. Five Hour Limit Block
    const fiveHourBlockMatch = sectionText.match(/Five\s+Hour\s+Limit\s+Remaining([\s\S]*?)(?=Weekly\s+Limit|$)/i);
    if (fiveHourBlockMatch) {
      const block = fiveHourBlockMatch[1];
      const pctMatch = block.match(/([\d\.]+)%/);
      const refreshMatch = block.match(/Refreshes\s+in\s+([^\n\r·]+)/i);
      if (pctMatch) {
        const remaining = parseFloat(pctMatch[1]);
        fiveHour = {
          remainingPercent: Math.round(remaining * 100) / 100,
          usedPercent: Math.max(0, Math.min(100, Math.round((100 - remaining) * 100) / 100)),
          resetsIn: refreshMatch ? refreshMatch[1].trim() : undefined,
        };
      }
    }

    if (weekly && fiveHour) {
      return { weekly, fiveHour };
    } else if (fiveHour || weekly) {
      return {
        fiveHour: fiveHour || { remainingPercent: 100, usedPercent: 0 },
        weekly: weekly || { remainingPercent: 100, usedPercent: 0 },
      };
    }
    return undefined;
  }

  const geminiIndex = text.search(/GEMINI\s+MODELS/i);
  const claudeIndex = text.search(/CLAUDE\s+(?:AND|&)\s+GPT\s+MODELS/i);

  if (geminiIndex !== -1) {
    const geminiText = claudeIndex > geminiIndex ? text.slice(geminiIndex, claudeIndex) : text.slice(geminiIndex);
    const geminiQuota = parseSection(geminiText);
    if (geminiQuota) {
      result.gemini = geminiQuota;
    }
  }

  if (claudeIndex !== -1) {
    const claudeText = geminiIndex > claudeIndex ? text.slice(claudeIndex, geminiIndex) : text.slice(claudeIndex);
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

export function saveQuotaCache(data: QuotaCacheData): void {
  try {
    const p = getQuotaCachePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Merge with existing cache if present
    let existing: QuotaCacheData = {};
    if (fs.existsSync(p)) {
      try {
        existing = JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch {}
    }

    const mergedGemini = existing.gemini && data.gemini
      ? {
          fiveHour:
            data.gemini.fiveHour?.resetsIn || data.gemini.fiveHour?.remainingPercent !== 100
              ? data.gemini.fiveHour
              : existing.gemini.fiveHour || data.gemini.fiveHour,
          weekly:
            data.gemini.weekly?.resetsIn || data.gemini.weekly?.remainingPercent !== 100
              ? data.gemini.weekly
              : existing.gemini.weekly || data.gemini.weekly,
        }
      : data.gemini || existing.gemini;

    const mergedClaude = existing.claudeGpt && data.claudeGpt
      ? {
          fiveHour:
            data.claudeGpt.fiveHour?.resetsIn || data.claudeGpt.fiveHour?.remainingPercent !== 100
              ? data.claudeGpt.fiveHour
              : existing.claudeGpt.fiveHour || data.claudeGpt.fiveHour,
          weekly:
            data.claudeGpt.weekly?.resetsIn || data.claudeGpt.weekly?.remainingPercent !== 100
              ? data.claudeGpt.weekly
              : existing.claudeGpt.weekly || data.claudeGpt.weekly,
        }
      : data.claudeGpt || existing.claudeGpt;

    const merged: QuotaCacheData = {
      ...existing,
      ...data,
      gemini: mergedGemini,
      claudeGpt: mergedClaude,
      updatedAt: Date.now(),
    };

    fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8');
  } catch {}
}

/**
 * Retrieves the quota specific to the currently selected model group.
 */
export function getQuotaForModelGroup(
  group: ModelQuotaGroup,
  cache: QuotaCacheData | null
): { fiveHour: QuotaLimitItem; weekly: QuotaLimitItem } | null {
  if (!cache) return null;

  if (group === 'claude_gpt' && cache.claudeGpt) {
    return cache.claudeGpt;
  }
  if (group === 'gemini' && cache.gemini) {
    return cache.gemini;
  }

  // Legacy fallback if single quota stored
  if (cache.hourlyPercent !== undefined || cache.weeklyPercent !== undefined) {
    const hp = cache.hourlyPercent ?? 0;
    const wp = cache.weeklyPercent ?? 0;
    return {
      fiveHour: {
        remainingPercent: 100 - hp,
        usedPercent: hp,
        resetsInSeconds: cache.resetsInSeconds,
      },
      weekly: {
        remainingPercent: 100 - wp,
        usedPercent: wp,
      },
    };
  }

  return null;
}
