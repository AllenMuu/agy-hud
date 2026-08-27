import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { promisify } from 'node:util';
import { ModelQuotaGroup, QuotaLimitItem } from '../types/state.js';
import { QuotaCacheData, saveQuotaCache, loadQuotaCache, detectModelGroup } from './quota-collector.js';
import { formatRemainingMs } from '../formatters/text.js';

const execFileAsync = promisify(execFile);

interface LocalModelQuotaInfo {
  remainingFraction?: number;
  resetTime?: string;
}

interface ClientModelConfig {
  label?: string;
  modelName?: string;
  quotaInfo?: LocalModelQuotaInfo;
}

interface GetUserStatusResponse {
  userStatus?: {
    planStatus?: {
      planInfo?: {
        planName?: string;
      };
    };
    cascadeModelConfigData?: {
      clientModelConfigs?: ClientModelConfig[];
    };
  };
}

/**
 * Discovers local TCP listening ports used by Antigravity or language_server.
 */
export async function discoverLocalPorts(): Promise<number[]> {
  try {
    const { stdout: psOut } = await execFileAsync('ps', ['aux'], { encoding: 'utf8' });
    const pids: string[] = [];

    for (const line of psOut.split('\n')) {
      if ((line.includes('language_server') || /(^|\s)(?:\/\S+\/)?agy(\s|$)/.test(line)) && !line.includes('grep')) {
        const parts = line.trim().split(/\s+/);
        if (parts[1] && /^\d+$/.test(parts[1])) {
          pids.push(parts[1]);
        }
      }
    }

    if (pids.length === 0) {
      return [];
    }

    const ports = new Set<number>();
    for (const pid of pids) {
      try {
        const { stdout: lsofOut } = await execFileAsync('lsof', ['-nP', '-iTCP', '-a', '-p', pid], { encoding: 'utf8' });
        for (const line of lsofOut.split('\n')) {
          if (line.includes('LISTEN')) {
            const match = line.match(/(?:127\.0\.0\.1|localhost|\*|\[::1\]):(\d+)\b/);
            if (match) {
              ports.add(Number(match[1]));
            }
          }
        }
      } catch {}
    }

    return [...ports];
  } catch {
    return [];
  }
}

/**
 * Sends a lightweight loopback Connect RPC request to GetUserStatus.
 */
async function queryPort(port: number): Promise<GetUserStatusResponse | null> {
  const endpoint = '/exa.language_server_pb.LanguageServerService/GetUserStatus';
  const postData = '{}';

  for (const mod of [https, http]) {
    try {
      const res = await new Promise<GetUserStatusResponse | null>((resolve) => {
        const req = mod.request(
          {
            protocol: mod === https ? 'https:' : 'http:',
            hostname: '127.0.0.1',
            port,
            path: endpoint,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Connect-Protocol-Version': '1',
            },
            rejectUnauthorized: false,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  resolve(JSON.parse(data));
                } catch {
                  resolve(null);
                }
              } else {
                resolve(null);
              }
            });
          }
        );

        req.setTimeout(2000, () => {
          req.destroy();
          resolve(null);
        });

        req.on('error', () => resolve(null));
        req.write(postData);
        req.end();
      });

      if (res && res.userStatus) {
        return res;
      }
    } catch {}
  }

  return null;
}

/**
 * Probes the running local Antigravity server and extracts live cross-device model quota.
 */
export async function probeLocalAntigravityQuota(): Promise<QuotaCacheData | null> {
  const ports = await discoverLocalPorts();
  if (ports.length === 0) {
    return null;
  }

  let statusResponse: GetUserStatusResponse | null = null;
  for (const port of ports) {
    statusResponse = await queryPort(port);
    if (statusResponse && statusResponse.userStatus) {
      break;
    }
  }

  if (!statusResponse || !statusResponse.userStatus) {
    return null;
  }

  const configs = statusResponse.userStatus.cascadeModelConfigData?.clientModelConfigs || [];
  if (configs.length === 0) {
    return null;
  }

  const now = Date.now();
  const existing = loadQuotaCache() || {};

  let geminiMinFraction = 1.0;
  let geminiResetTime: string | undefined;
  let claudeMinFraction = 1.0;
  let claudeResetTime: string | undefined;

  for (const item of configs) {
    const label = item.label || item.modelName || '';
    const quotaInfo = item.quotaInfo;
    if (!label || !quotaInfo) continue;

    const group = detectModelGroup(label);
    const frac = typeof quotaInfo.remainingFraction === 'number' ? quotaInfo.remainingFraction : 1.0;
    const rTime = quotaInfo.resetTime;

    if (group === 'gemini') {
      if (frac <= geminiMinFraction) {
        geminiMinFraction = frac;
        if (rTime) geminiResetTime = rTime;
      }
    } else {
      if (frac <= claudeMinFraction) {
        claudeMinFraction = frac;
        if (rTime) claudeResetTime = rTime;
      }
    }
  }

  function createQuotaItem(fraction: number, isoResetTime?: string): QuotaLimitItem {
    const remainingPct = Math.round(fraction * 10000) / 100;
    const usedPct = Math.max(0, Math.min(100, Math.round((100 - remainingPct) * 100) / 100));

    let resetTimestamp: number | undefined;
    let resetsIn: string | undefined;
    let resetsInSeconds: number | undefined;

    if (isoResetTime) {
      const t = new Date(isoResetTime).getTime();
      if (!isNaN(t) && t > now) {
        resetTimestamp = t;
        const durMs = t - now;
        resetsInSeconds = Math.ceil(durMs / 1000);
        resetsIn = formatRemainingMs(durMs);
      }
    }

    return {
      remainingPercent: remainingPct,
      usedPercent: usedPct,
      resetsIn,
      resetsInSeconds,
      resetTimestamp,
      windowHours: 5,
      label: '5h',
    };
  }

  const gemini5h = createQuotaItem(geminiMinFraction, geminiResetTime);
  const claude5h = createQuotaItem(claudeMinFraction, claudeResetTime);

  const updatedData: QuotaCacheData = {
    updatedAt: now,
    gemini: {
      fiveHour: gemini5h,
      shortTerm: gemini5h,
      weekly: existing.gemini?.weekly || {
        remainingPercent: 100,
        usedPercent: 0,
        windowHours: 168,
        label: 'Wk',
      },
    },
    claudeGpt: {
      fiveHour: claude5h,
      shortTerm: claude5h,
      weekly: existing.claudeGpt?.weekly || {
        remainingPercent: 100,
        usedPercent: 0,
        windowHours: 168,
        label: 'Wk',
      },
    },
  };

  saveQuotaCache(updatedData);
  return updatedData;
}

// Throttle background probe to at most once every 30 seconds
let lastBackgroundProbeTime = 0;
const BACKGROUND_PROBE_INTERVAL_MS = 30 * 1000;

/**
 * Triggers background quota synchronization without blocking the UI rendering.
 */
export function triggerBackgroundQuotaSync(): void {
  const now = Date.now();
  if (now - lastBackgroundProbeTime < BACKGROUND_PROBE_INTERVAL_MS) {
    return;
  }

  // Cross-process throttle check using cached updatedAt
  const existing = loadQuotaCache();
  if (existing?.updatedAt && now - existing.updatedAt < BACKGROUND_PROBE_INTERVAL_MS) {
    lastBackgroundProbeTime = existing.updatedAt;
    return;
  }

  lastBackgroundProbeTime = now;
  // Mark updatedAt in cache to avoid concurrent redundant probes across CLI runs
  saveQuotaCache({ updatedAt: now });

  try {
    const entry = process.argv[1];
    if (entry && fs.existsSync(entry) && !process.stdin.isTTY) {
      // In statusline mode, spawn detached background child so statusline exits immediately (<10ms)
      const child = spawn(process.execPath, [entry, 'refresh-quota'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return;
    }
  } catch {}

  // Fallback: in-process detached background promise
  probeLocalAntigravityQuota().catch(() => {});
}
