/**
 * Temporal baseline & anomaly detection service.
 * Adapted from worldmonitor's temporal-baseline.ts.
 *
 * Uses Welford's online algorithm to maintain running mean/variance
 * for (eventType, region) buckets. When the current count deviates
 * significantly from the baseline, emits a TemporalAnomaly.
 *
 * Server-side implementation: in-memory state with optional DB persistence.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TemporalAnomaly {
  id: string;
  bucket: string;
  eventType: string;
  region: string;
  currentCount: number;
  mean: number;
  stddev: number;
  zScore: number;
  severity: "critical" | "high" | "medium" | "low";
  detectedAt: number;
  message: string;
}

interface WelfordState {
  n: number;
  mean: number;
  m2: number;
  lastValue: number;
  lastUpdated: number;
}

interface BucketConfig {
  eventType: string;
  region: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BUCKET_INTERVAL_MS = 60 * 60 * 1000; // 1 hour buckets
const MIN_SAMPLES = 24; // Need ≥24 hours of data before alerting
const Z_SCORE_CRITICAL = 4.0;
const Z_SCORE_HIGH = 3.0;
const Z_SCORE_MEDIUM = 2.5;
const ANOMALY_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h between anomalies for same bucket
const MAX_BUCKETS = 500;

// ─── State ──────────────────────────────────────────────────────────────────

const baselines = new Map<string, WelfordState>();
const lastAnomalyTime = new Map<string, number>();
const pendingAnomalies: TemporalAnomaly[] = [];
let anomalySeq = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function bucketKey(eventType: string, region: string): string {
  return `${eventType}::${region}`.toLowerCase();
}

function getVariance(state: WelfordState): number {
  if (state.n < 2) return 0;
  return state.m2 / (state.n - 1);
}

function getStdDev(state: WelfordState): number {
  return Math.sqrt(getVariance(state));
}

function getSeverity(zScore: number): "critical" | "high" | "medium" | "low" {
  const abs = Math.abs(zScore);
  if (abs >= Z_SCORE_CRITICAL) return "critical";
  if (abs >= Z_SCORE_HIGH) return "high";
  if (abs >= Z_SCORE_MEDIUM) return "medium";
  return "low";
}

function formatAnomalyMessage(
  eventType: string,
  region: string,
  current: number,
  mean: number,
  zScore: number,
  severity: string
): string {
  const direction = current > mean ? "spike" : "drop";
  const pct = mean > 0 ? Math.round(((current - mean) / mean) * 100) : 0;
  return `[${severity.toUpperCase()}] ${eventType} ${direction} in ${region}: ` +
    `${current} events (baseline ${mean.toFixed(1)}, ${pct > 0 ? "+" : ""}${pct}%, z=${zScore.toFixed(2)})`;
}

function generateAnomalyId(): string {
  return `ta_${++anomalySeq}_${Date.now()}`;
}

// ─── Welford's Algorithm ────────────────────────────────────────────────────

function welfordUpdate(state: WelfordState, value: number): void {
  state.n += 1;
  const delta = value - state.mean;
  state.mean += delta / state.n;
  const delta2 = value - state.mean;
  state.m2 += delta * delta2;
  state.lastValue = value;
  state.lastUpdated = Date.now();
}

function createWelfordState(): WelfordState {
  return { n: 0, mean: 0, m2: 0, lastValue: 0, lastUpdated: Date.now() };
}

// ─── Core logic ─────────────────────────────────────────────────────────────

function pruneOldBuckets(): void {
  if (baselines.size <= MAX_BUCKETS) return;
  const sorted = Array.from(baselines.entries())
    .sort(([, a], [, b]) => a.lastUpdated - b.lastUpdated);
  for (const [key] of sorted) {
    if (baselines.size <= MAX_BUCKETS) break;
    baselines.delete(key);
    lastAnomalyTime.delete(key);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a count for a (eventType, region) bucket and check for anomalies.
 * Typically called periodically (e.g., every hour) with the count for that period.
 */
export function updateAndCheck(
  eventType: string,
  region: string,
  currentCount: number
): TemporalAnomaly | null {
  const key = bucketKey(eventType, region);
  let state = baselines.get(key);
  if (!state) {
    state = createWelfordState();
    baselines.set(key, state);
  }

  const now = Date.now();
  const prevMean = state.mean;
  const prevStdDev = getStdDev(state);

  // Update baseline
  welfordUpdate(state, currentCount);

  // Not enough data to detect anomalies
  if (state.n < MIN_SAMPLES) return null;

  // Check for anomaly using pre-update stats
  if (prevStdDev < 0.5) return null; // too little variation

  const zScore = (currentCount - prevMean) / prevStdDev;
  if (Math.abs(zScore) < Z_SCORE_MEDIUM) return null;

  // Cooldown check
  const lastAnomaly = lastAnomalyTime.get(key) ?? 0;
  if (now - lastAnomaly < ANOMALY_COOLDOWN_MS) return null;

  const severity = getSeverity(zScore);
  const message = formatAnomalyMessage(eventType, region, currentCount, prevMean, zScore, severity);

  const anomaly: TemporalAnomaly = {
    id: generateAnomalyId(),
    bucket: key,
    eventType,
    region,
    currentCount,
    mean: prevMean,
    stddev: prevStdDev,
    zScore,
    severity,
    detectedAt: now,
    message,
  };

  lastAnomalyTime.set(key, now);
  pendingAnomalies.push(anomaly);
  pruneOldBuckets();

  return anomaly;
}

/**
 * Drain pending anomalies for broadcast.
 */
export function drainAnomalies(): TemporalAnomaly[] {
  return pendingAnomalies.splice(0, pendingAnomalies.length);
}

/**
 * Get baseline stats for a bucket.
 */
export function getBaselineStats(eventType: string, region: string): {
  samples: number;
  mean: number;
  stddev: number;
  lastValue: number;
} | null {
  const state = baselines.get(bucketKey(eventType, region));
  if (!state) return null;
  return {
    samples: state.n,
    mean: state.mean,
    stddev: getStdDev(state),
    lastValue: state.lastValue,
  };
}

/**
 * Get all tracked bucket keys.
 */
export function getTrackedBuckets(): string[] {
  return Array.from(baselines.keys());
}

/**
 * Seed a baseline from historical data.
 * Useful for bootstrapping from DB after restart.
 */
export function seedBaseline(eventType: string, region: string, historicalCounts: number[]): void {
  const key = bucketKey(eventType, region);
  const state = createWelfordState();
  for (const count of historicalCounts) {
    welfordUpdate(state, count);
  }
  baselines.set(key, state);
}

/**
 * Export baselines for DB persistence.
 */
export function exportBaselines(): Array<{
  eventType: string;
  region: string;
  n: number;
  mean: number;
  m2: number;
  lastValue: number;
  lastUpdated: number;
}> {
  const result: Array<{
    eventType: string;
    region: string;
    n: number;
    mean: number;
    m2: number;
    lastValue: number;
    lastUpdated: number;
  }> = [];
  for (const [key, state] of baselines) {
    const [eventType, region] = key.split("::");
    result.push({ eventType, region, n: state.n, mean: state.mean, m2: state.m2, lastValue: state.lastValue, lastUpdated: state.lastUpdated });
  }
  return result;
}

/**
 * Import baselines from DB.
 */
export function importBaselines(data: Array<{
  eventType: string;
  region: string;
  n: number;
  mean: number;
  m2: number;
  lastValue: number;
  lastUpdated: number;
}>): void {
  for (const row of data) {
    const key = bucketKey(row.eventType, row.region);
    baselines.set(key, {
      n: row.n,
      mean: row.mean,
      m2: row.m2,
      lastValue: row.lastValue,
      lastUpdated: row.lastUpdated,
    });
  }
}
