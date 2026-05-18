import axios, { type AxiosRequestConfig } from "axios";
import { fetchJsonWithCors } from "./cors-fetch";
import { getCached, setCached } from "./cache";
import { sleep } from "./utils";

/**
 * HTTP statuses that indicate a permanent host-level block (geo-restriction,
 * IP ban, hard rate-limit). Retrying these in quick succession is pointless
 * and just produces console spam — break out of the retry loop instead.
 */
const PERMANENT_BLOCK_STATUSES = new Set([403, 418, 429, 451]);

function isPermanentlyBlocked(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { response?: { status?: number; headers?: Record<string, string> } };
  const status = e.response?.status;
  if (status && PERMANENT_BLOCK_STATUSES.has(status)) return true;
  // /api/proxy explicitly tags geo-blocked responses with this header.
  return e.response?.headers?.["x-proxy-geo-blocked"] === "1";
}

function shouldUseSameOriginProxy(url: string): boolean {
  if (typeof window === "undefined") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

interface ProviderState {
  failures: number;
  lastFailure: number;
  cooldownUntil: number;
}

const providerHealth = new Map<string, ProviderState>();
const requestQueue: Array<() => void> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 12;

async function throttle(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => requestQueue.push(resolve));
  activeRequests++;
}

function releaseThrottle(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();
}

function isProviderHealthy(provider: string): boolean {
  const state = providerHealth.get(provider);
  if (!state) return true;
  return Date.now() > state.cooldownUntil;
}

function markFailure(provider: string): void {
  const state = providerHealth.get(provider) ?? {
    failures: 0,
    lastFailure: 0,
    cooldownUntil: 0,
  };
  state.failures++;
  state.lastFailure = Date.now();
  const backoff = Math.min(60_000, 1000 * 2 ** state.failures);
  state.cooldownUntil = Date.now() + backoff;
  providerHealth.set(provider, state);
}

function markSuccess(provider: string): void {
  providerHealth.set(provider, {
    failures: 0,
    lastFailure: 0,
    cooldownUntil: 0,
  });
}

export interface FetchWithFallbackOptions<T> {
  cacheKey?: string;
  cacheTtl?: number;
  providers: Array<{
    name: string;
    fetch: () => Promise<T>;
  }>;
  /**
   * Value returned when ALL providers fail. Only used if `allowErrorFallback`
   * is true. Intended for non-price data where a neutral/empty default is OK
   * (e.g. Fear & Greed, news). NEVER use for prices/candles/futures — those
   * should surface the error so the UI can show a loading/error state instead
   * of silently displaying stale demo numbers.
   */
  errorFallback?: () => T;
  /** Opt in to using `errorFallback` on all-providers-failed (default false). */
  allowErrorFallback?: boolean;
}

export async function fetchWithFallback<T>(
  options: FetchWithFallbackOptions<T>
): Promise<T> {
  const {
    cacheKey,
    cacheTtl = 60_000,
    providers,
    errorFallback,
    allowErrorFallback = false,
  } = options;

  if (cacheKey) {
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const errors: string[] = [];

  for (const provider of providers) {
    if (!isProviderHealthy(provider.name)) {
      errors.push(`${provider.name}: cooling down`);
      continue;
    }

    let attempt = 0;
    while (attempt < 3) {
      try {
        await throttle();
        const data = await provider.fetch();
        markSuccess(provider.name);
        releaseThrottle();

        if (cacheKey) await setCached(cacheKey, data, cacheTtl);
        return data;
      } catch (err) {
        releaseThrottle();
        markFailure(provider.name);
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}: ${msg}`);
        if (isPermanentlyBlocked(err)) {
          // Geo-block / forbidden / rate-limited at the host level — retrying
          // hits the same wall and just floods the console. Skip to next
          // provider immediately and keep this one in cooldown.
          break;
        }
        attempt++;
        await sleep(500 * 2 ** attempt);
      }
    }
  }

  if (allowErrorFallback && errorFallback) return errorFallback();
  throw new Error(`All providers failed: ${errors.join("; ")}`);
}

export async function axiosGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  if (shouldUseSameOriginProxy(url)) {
    return fetchJsonWithCors<T>(url, config);
  }
  const res = await axios.get<T>(url, {
    timeout: 15_000,
    ...config,
  });
  return res.data;
}

export function getProviderHealthMap(): Map<string, ProviderState> {
  return new Map(providerHealth);
}
