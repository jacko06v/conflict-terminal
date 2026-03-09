/**
 * Circuit Breaker — resilience pattern for external API calls.
 * Adapted from worldmonitor for server-side Node.js use.
 *
 * Features:
 *  - Max failures → cooldown period
 *  - In-memory cache with TTL
 *  - Stale-while-revalidate
 *  - Global breaker registry for status reporting
 */

interface CircuitState {
  failures: number;
  cooldownUntil: number;
  lastError?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export type BreakerDataMode = "live" | "cached" | "unavailable";

export interface BreakerDataState {
  mode: BreakerDataMode;
  timestamp: number | null;
}

export interface CircuitBreakerOptions {
  name: string;
  maxFailures?: number;
  cooldownMs?: number;
  cacheTtlMs?: number;
}

const DEFAULT_MAX_FAILURES = 2;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class CircuitBreaker<T> {
  private state: CircuitState = { failures: 0, cooldownUntil: 0 };
  private cache: CacheEntry<T> | null = null;
  private name: string;
  private maxFailures: number;
  private cooldownMs: number;
  private cacheTtlMs: number;
  private lastDataState: BreakerDataState = { mode: "unavailable", timestamp: null };
  private backgroundRefreshPromise: Promise<void> | null = null;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  isOnCooldown(): boolean {
    if (Date.now() < this.state.cooldownUntil) {
      return true;
    }
    if (this.state.cooldownUntil > 0) {
      this.state = { failures: 0, cooldownUntil: 0 };
    }
    return false;
  }

  getCooldownRemaining(): number {
    return Math.max(0, Math.ceil((this.state.cooldownUntil - Date.now()) / 1000));
  }

  getStatus(): string {
    if (this.isOnCooldown()) {
      return `temporarily unavailable (retry in ${this.getCooldownRemaining()}s)`;
    }
    return "ok";
  }

  getDataState(): BreakerDataState {
    return { ...this.lastDataState };
  }

  getCached(): T | null {
    if (this.cache && Date.now() - this.cache.timestamp < this.cacheTtlMs) {
      return this.cache.data;
    }
    return null;
  }

  getCachedOrDefault(defaultValue: T): T {
    return this.cache?.data ?? defaultValue;
  }

  recordSuccess(data: T): void {
    this.state = { failures: 0, cooldownUntil: 0 };
    this.cache = { data, timestamp: Date.now() };
    this.lastDataState = { mode: "live", timestamp: Date.now() };
  }

  clearCache(): void {
    this.cache = null;
    this.backgroundRefreshPromise = null;
  }

  recordFailure(error?: string): void {
    this.state.failures++;
    this.state.lastError = error;
    if (this.state.failures >= this.maxFailures) {
      this.state.cooldownUntil = Date.now() + this.cooldownMs;
      console.warn(
        `[${this.name}] On cooldown for ${this.cooldownMs / 1000}s after ${this.state.failures} failures`
      );
    }
  }

  async execute<R extends T>(fn: () => Promise<R>, defaultValue: R): Promise<R> {
    if (this.isOnCooldown()) {
      console.log(`[${this.name}] Currently unavailable, ${this.getCooldownRemaining()}s remaining`);
      const cachedFallback = this.getCached();
      if (cachedFallback !== null) {
        this.lastDataState = { mode: "cached", timestamp: this.cache?.timestamp ?? null };
        return cachedFallback as R;
      }
      this.lastDataState = { mode: "unavailable", timestamp: null };
      return this.getCachedOrDefault(defaultValue) as R;
    }

    const cached = this.getCached();
    if (cached !== null) {
      this.lastDataState = { mode: "cached", timestamp: this.cache?.timestamp ?? null };
      return cached as R;
    }

    // Stale-while-revalidate: return stale data if available, refresh in background
    if (this.cache !== null && this.cacheTtlMs > 0) {
      this.lastDataState = { mode: "cached", timestamp: this.cache.timestamp };
      if (!this.backgroundRefreshPromise) {
        this.backgroundRefreshPromise = fn()
          .then((result) => {
            this.recordSuccess(result);
          })
          .catch((e) => {
            console.warn(`[${this.name}] Background refresh failed:`, e);
            this.recordFailure(String(e));
          })
          .finally(() => {
            this.backgroundRefreshPromise = null;
          });
      }
      return this.cache.data as R;
    }

    try {
      const result = await fn();
      this.recordSuccess(result);
      return result;
    } catch (e) {
      const msg = String(e);
      console.error(`[${this.name}] Failed:`, msg);
      this.recordFailure(msg);
      this.lastDataState = { mode: "unavailable", timestamp: null };
      return defaultValue;
    }
  }
}

// ── Global registry ────────────────────────────────────────────────────

const breakers = new Map<string, CircuitBreaker<unknown>>();

export function createCircuitBreaker<T>(options: CircuitBreakerOptions): CircuitBreaker<T> {
  const breaker = new CircuitBreaker<T>(options);
  breakers.set(options.name, breaker as CircuitBreaker<unknown>);
  return breaker;
}

export function getCircuitBreakerStatus(): Record<string, string> {
  const status: Record<string, string> = {};
  breakers.forEach((breaker, name) => {
    status[name] = breaker.getStatus();
  });
  return status;
}

export function isCircuitBreakerOnCooldown(name: string): boolean {
  const breaker = breakers.get(name);
  return breaker ? breaker.isOnCooldown() : false;
}
