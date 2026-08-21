import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface QuotaData {
  hourlyPercent: number;
  weeklyPercent: number;
  resetsInSeconds?: number;
  updatedAt?: number;
}

export function getQuotaCachePath(): string {
  return path.join(os.homedir(), '.gemini', 'config', 'agy-hud', 'quota-cache.json');
}

export function loadQuotaCache(): QuotaData | null {
  try {
    const p = getQuotaCachePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return data;
    }
  } catch {}
  return null;
}

export function saveQuotaCache(data: QuotaData): void {
  try {
    const p = getQuotaCachePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(p, JSON.stringify({ ...data, updatedAt: Date.now() }), 'utf-8');
  } catch {}
}
