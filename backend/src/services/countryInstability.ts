/**
 * Country instability index service.
 *
 * Computes a composite instability score (0-100) per country based on:
 *   - Recent event counts by category (conflict, unrest, cyber, etc.)
 *   - Severity-weighted event scoring
 *   - Trend detection (accelerating vs. decelerating)
 *   - Sanction status and baseline risk
 *
 * Fed by ingested events. The index is recalculated periodically.
 */

import { CONFLICT_ZONES } from "../data/geoStrategic.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CountryInstability {
  country: string;
  score: number;
  level: "critical" | "high" | "elevated" | "moderate" | "low";
  components: {
    eventIntensity: number;
    severityWeight: number;
    trendScore: number;
    baselineRisk: number;
  };
  topCategories: Array<{ category: string; count: number }>;
  recentEventCount: number;
  trend: "accelerating" | "stable" | "decelerating";
  updatedAt: number;
}

interface EventSignal {
  country: string;
  category: string;
  severity: number; // 1-5
  timestamp: number;
}

interface CountryBucket {
  events: EventSignal[];
  hourlyHistory: number[]; // rolling 7 * 24 hourly counts
  lastHourReset: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ROLLING_WINDOW_MS = 7 * DAY_MS;
const MAX_COUNTRIES = 250;

// Severity multipliers
const SEVERITY_WEIGHTS: Record<number, number> = {
  5: 5.0,
  4: 3.0,
  3: 1.5,
  2: 0.8,
  1: 0.3,
};

// Category risk multipliers (higher = more destabilizing)
const CATEGORY_RISK: Record<string, number> = {
  conflict: 3.0,
  terrorism: 3.0,
  nuclear: 4.0,
  cyber: 1.5,
  unrest: 2.0,
  political: 1.2,
  economic: 1.0,
  natural_disaster: 0.8,
  health: 0.7,
  military: 2.5,
  displacement: 1.8,
  infrastructure: 1.3,
  general: 0.5,
};

// Baseline risk for sanctioned countries (map ISO codes to known names)
const SANCTIONED_NAMES = new Set([
  "north korea", "dprk", "syria", "iran", "russia", "belarus",
  "venezuela", "cuba", "south sudan", "sudan",
]);

// Countries in active conflict zones
const conflictCountries = new Set<string>();
for (const zone of CONFLICT_ZONES) {
  for (const party of zone.parties) {
    conflictCountries.add(party.toLowerCase());
  }
}

// ─── State ──────────────────────────────────────────────────────────────────

const buckets = new Map<string, CountryBucket>();
const cachedScores = new Map<string, CountryInstability>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalize(country: string): string {
  return country.trim().toLowerCase();
}

function getOrCreateBucket(country: string): CountryBucket {
  const key = normalize(country);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { events: [], hourlyHistory: [], lastHourReset: Date.now() };
    buckets.set(key, bucket);
  }
  return bucket;
}

function scoreToLevel(score: number): "critical" | "high" | "elevated" | "moderate" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "elevated";
  if (score >= 20) return "moderate";
  return "low";
}

function detectTrend(hourlyHistory: number[]): "accelerating" | "stable" | "decelerating" {
  if (hourlyHistory.length < 48) return "stable"; // need ≥2 days
  const recentHalf = hourlyHistory.slice(-24);
  const olderHalf = hourlyHistory.slice(-48, -24);
  const recentAvg = recentHalf.reduce((s, v) => s + v, 0) / recentHalf.length;
  const olderAvg = olderHalf.reduce((s, v) => s + v, 0) / olderHalf.length;
  const ratio = olderAvg > 0 ? recentAvg / olderAvg : (recentAvg > 0 ? 2 : 1);
  if (ratio > 1.3) return "accelerating";
  if (ratio < 0.7) return "decelerating";
  return "stable";
}

// ─── Core logic ─────────────────────────────────────────────────────────────

function pruneEvents(bucket: CountryBucket, now: number): void {
  bucket.events = bucket.events.filter((e) => now - e.timestamp <= ROLLING_WINDOW_MS);
  // Keep hourly history to 7 * 24 entries
  while (bucket.hourlyHistory.length > 7 * 24) {
    bucket.hourlyHistory.shift();
  }
}

function computeScore(country: string, bucket: CountryBucket, now: number): CountryInstability {
  pruneEvents(bucket, now);
  const key = normalize(country);

  // Count events per category
  const catCounts = new Map<string, number>();
  let totalSeverityWeighted = 0;
  for (const ev of bucket.events) {
    catCounts.set(ev.category, (catCounts.get(ev.category) ?? 0) + 1);
    const sWeight = SEVERITY_WEIGHTS[ev.severity] ?? 1;
    const cRisk = CATEGORY_RISK[ev.category] ?? 1;
    totalSeverityWeighted += sWeight * cRisk;
  }

  // Event intensity (normalized 0-40)
  const eventCount = bucket.events.length;
  const eventIntensity = Math.min(40, (eventCount / 50) * 40);

  // Severity weight (normalized 0-30)
  const severityWeight = Math.min(30, (totalSeverityWeighted / 150) * 30);

  // Trend score (−10 to +10)
  const trend = detectTrend(bucket.hourlyHistory);
  const trendScore = trend === "accelerating" ? 10 : trend === "decelerating" ? -5 : 0;

  // Baseline risk (0-20)
  let baselineRisk = 0;
  if (SANCTIONED_NAMES.has(key)) baselineRisk += 10;
  if (conflictCountries.has(key)) baselineRisk += 10;

  const raw = eventIntensity + severityWeight + trendScore + baselineRisk;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const topCategories = Array.from(catCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    country,
    score,
    level: scoreToLevel(score),
    components: { eventIntensity, severityWeight, trendScore, baselineRisk },
    topCategories,
    recentEventCount: eventCount,
    trend,
    updatedAt: now,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record an event signal for instability tracking.
 */
export function recordEventSignal(signal: EventSignal): void {
  if (!signal.country?.trim()) return;
  const bucket = getOrCreateBucket(signal.country);
  bucket.events.push(signal);
}

/**
 * Record a batch of event signals.
 */
export function recordEventSignals(signals: EventSignal[]): void {
  for (const signal of signals) recordEventSignal(signal);
}

/**
 * Tick hourly counters. Call this every hour from the scheduler.
 */
export function tickHourlyCounters(): void {
  const now = Date.now();
  for (const bucket of buckets.values()) {
    const eventsThisHour = bucket.events.filter(
      (e) => now - e.timestamp <= HOUR_MS
    ).length;
    bucket.hourlyHistory.push(eventsThisHour);
    while (bucket.hourlyHistory.length > 7 * 24) {
      bucket.hourlyHistory.shift();
    }
    bucket.lastHourReset = now;
  }
}

/**
 * Recalculate instability scores for all tracked countries.
 * Call periodically (e.g., every 15 min).
 */
export function recalculateAll(): Map<string, CountryInstability> {
  const now = Date.now();
  cachedScores.clear();
  for (const [key, bucket] of buckets) {
    const result = computeScore(key, bucket, now);
    cachedScores.set(key, result);
  }

  // Prune empty countries
  for (const [key, bucket] of buckets) {
    if (bucket.events.length === 0 && bucket.hourlyHistory.every((h) => h === 0)) {
      buckets.delete(key);
      cachedScores.delete(key);
    }
  }

  // Cap countries
  if (buckets.size > MAX_COUNTRIES) {
    const sorted = Array.from(cachedScores.entries())
      .sort(([, a], [, b]) => a.score - b.score);
    for (const [key] of sorted) {
      if (buckets.size <= MAX_COUNTRIES) break;
      buckets.delete(key);
      cachedScores.delete(key);
    }
  }

  return cachedScores;
}

/**
 * Get instability ranking (top N most unstable countries).
 */
export function getInstabilityRanking(limit = 20): CountryInstability[] {
  if (cachedScores.size === 0) recalculateAll();
  return Array.from(cachedScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get instability for a specific country.
 */
export function getCountryInstability(country: string): CountryInstability | null {
  const key = normalize(country);
  return cachedScores.get(key) ?? null;
}

/**
 * Get number of tracked countries.
 */
export function getTrackedCountryCount(): number {
  return buckets.size;
}
