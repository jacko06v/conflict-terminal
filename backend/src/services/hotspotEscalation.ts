/**
 * Hotspot Escalation Service — ported from worldmonitor hotspot-escalation.ts
 *
 * Computes a dynamic escalation score (1-5) for each INTEL_HOTSPOT by
 * blending four normalised components:
 *   - News activity (35%)
 *   - Country Instability Index contribution (25%)
 *   - Geographic convergence score (25%)
 *   - Military activity — flights/vessels nearby (15%)
 *
 * A 24 h score history is maintained for trend detection (linear-regression slope).
 */

import { INTEL_HOTSPOTS, type Hotspot } from "../data/geoStrategic";

/* ── Types ─────────────────────────────────────────── */

export type EscalationTrend = "escalating" | "de-escalating" | "stable";

export interface DynamicEscalationScore {
  hotspotId: string;
  name: string;
  staticBaseline: number;
  dynamicScore: number;
  combinedScore: number;
  trend: EscalationTrend;
  components: {
    newsActivity: number;
    ciiContribution: number;
    geoConvergence: number;
    militaryActivity: number;
  };
  history: Array<{ timestamp: number; score: number }>;
  lastUpdated: Date;
}

export interface EscalationInputs {
  newsMatches: number;
  hasBreaking: boolean;
  newsVelocity: number;
  ciiScore: number | null;
  geoAlertScore: number;
  geoAlertTypes: number;
  flightsNearby: number;
  vesselsNearby: number;
}

export interface EscalationSignalReason {
  type: "threshold_crossed" | "rapid_increase" | "critical_reached";
  oldScore: number;
  newScore: number;
  threshold?: number;
}

/* ── Constants ─────────────────────────────────────── */

const COMPONENT_WEIGHTS = {
  news: 0.35,
  cii: 0.25,
  geo: 0.25,
  military: 0.15,
};

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_POINTS = 48;
const SIGNAL_COOLDOWN_MS = 2 * 60 * 60 * 1000;

/* ── State ─────────────────────────────────────────── */

const scores = new Map<string, DynamicEscalationScore>();
const lastSignalTime = new Map<string, number>();

// Optional getter hooks — wired by scheduler
let ciiGetter: ((countryName: string) => number | null) | null = null;
let geoAlertGetter:
  | ((lat: number, lon: number, radiusKm: number) => { score: number; types: number } | null)
  | null = null;

export function setCIIGetter(fn: (countryName: string) => number | null): void {
  ciiGetter = fn;
}

export function setGeoAlertGetter(
  fn: (lat: number, lon: number, radiusKm: number) => { score: number; types: number } | null,
): void {
  geoAlertGetter = fn;
}

/* ── Normalisation helpers ─────────────────────────── */

function normalizeNewsActivity(matches: number, hasBreaking: boolean, velocity: number): number {
  return Math.min(100, matches * 15 + (hasBreaking ? 30 : 0) + velocity * 5);
}

function normalizeCII(score: number | null): number {
  return score ?? 30; // default neutral
}

function normalizeGeo(alertScore: number, alertTypes: number): number {
  if (alertScore === 0) return 0;
  return Math.min(100, alertScore + alertTypes * 10);
}

function normalizeMilitary(flights: number, vessels: number): number {
  return Math.min(100, flights * 10 + vessels * 15);
}

function calculateDynamicRaw(c: DynamicEscalationScore["components"]): number {
  return (
    c.newsActivity * COMPONENT_WEIGHTS.news +
    c.ciiContribution * COMPONENT_WEIGHTS.cii +
    c.geoConvergence * COMPONENT_WEIGHTS.geo +
    c.militaryActivity * COMPONENT_WEIGHTS.military
  );
}

function rawToScore(raw: number): number {
  return 1 + (raw / 100) * 4; // maps 0–100 → 1–5
}

function blendScores(staticBaseline: number, dynamicScore: number): number {
  return staticBaseline * 0.3 + dynamicScore * 0.7;
}

/* ── Trend detection (linear regression) ───────────── */

function pruneHistory(
  history: Array<{ timestamp: number; score: number }>,
): Array<{ timestamp: number; score: number }> {
  const cutoff = Date.now() - HISTORY_WINDOW_MS;
  const pruned = history.filter((h) => h.timestamp >= cutoff);
  return pruned.length > MAX_HISTORY_POINTS ? pruned.slice(-MAX_HISTORY_POINTS) : pruned;
}

function detectTrend(history: Array<{ timestamp: number; score: number }>): EscalationTrend {
  if (history.length < 3) return "stable";

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  let n = 0;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    if (!entry) continue;
    sumX += n;
    sumY += entry.score;
    sumXY += n * entry.score;
    sumX2 += n * n;
    n++;
  }

  if (n < 3) return "stable";
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return "stable";

  const slope = (n * sumXY - sumX * sumY) / denom;
  if (slope > 0.1) return "escalating";
  if (slope < -0.1) return "de-escalating";
  return "stable";
}

/* ── Static baseline ───────────────────────────────── */

function getStaticBaseline(hotspot: Hotspot): number {
  // Derive a 1–5 baseline from the status field
  switch (hotspot.status) {
    case "active":
      return 3.5;
    case "monitoring":
      return 2.5;
    case "stable":
      return 1.5;
    default:
      return 2;
  }
}

/* ── CII + Geo lookups via hotspot keywords ────────── */

function getCIIForHotspot(hotspot: Hotspot): number | null {
  if (!ciiGetter) return null;
  // Try each keyword — the first match wins
  for (const kw of hotspot.keywords) {
    const score = ciiGetter(kw);
    if (score !== null) return score;
  }
  return null;
}

function getGeoAlertForHotspot(hotspot: Hotspot): { score: number; types: number } | null {
  if (!geoAlertGetter) return null;
  return geoAlertGetter(hotspot.lat, hotspot.lon, 150);
}

/* ── Haversine for military proximity ──────────────── */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Military data feed ────────────────────────────── */

interface PositionedEntity {
  lat: number;
  lon: number;
}

let militaryFlights: PositionedEntity[] = [];
let militaryVessels: PositionedEntity[] = [];

export function setMilitaryData(flights: PositionedEntity[], vessels: PositionedEntity[]): void {
  militaryFlights = flights;
  militaryVessels = vessels;
}

function countMilitaryNearHotspot(
  hotspot: Hotspot,
  radiusKm = 200,
): { flights: number; vessels: number } {
  let flightCount = 0;
  let vesselCount = 0;
  for (const f of militaryFlights) {
    if (haversineKm(hotspot.lat, hotspot.lon, f.lat, f.lon) <= radiusKm) flightCount++;
  }
  for (const v of militaryVessels) {
    if (haversineKm(hotspot.lat, hotspot.lon, v.lat, v.lon) <= radiusKm) vesselCount++;
  }
  return { flights: flightCount, vessels: vesselCount };
}

/* ── Public API ────────────────────────────────────── */

/**
 * Calculate dynamic escalation score for a hotspot from explicit inputs.
 */
export function calculateDynamicScore(
  hotspotId: string,
  inputs: EscalationInputs,
): DynamicEscalationScore {
  const hotspot = INTEL_HOTSPOTS.find((h) => h.id === hotspotId);
  if (!hotspot) throw new Error(`Hotspot not found: ${hotspotId}`);

  const staticBaseline = getStaticBaseline(hotspot);
  const existing = scores.get(hotspotId);
  const now = Date.now();

  const components = {
    newsActivity: normalizeNewsActivity(inputs.newsMatches, inputs.hasBreaking, inputs.newsVelocity),
    ciiContribution: normalizeCII(inputs.ciiScore),
    geoConvergence: normalizeGeo(inputs.geoAlertScore, inputs.geoAlertTypes),
    militaryActivity: normalizeMilitary(inputs.flightsNearby, inputs.vesselsNearby),
  };

  const dynamicRaw = calculateDynamicRaw(components);
  const dynamicScore = rawToScore(dynamicRaw);
  const combinedScore = blendScores(staticBaseline, dynamicScore);

  let history = existing?.history ?? [];
  history = pruneHistory(history);
  history.push({ timestamp: now, score: combinedScore });

  const trend = detectTrend(history);

  const result: DynamicEscalationScore = {
    hotspotId,
    name: hotspot.name,
    staticBaseline,
    dynamicScore: Math.round(dynamicScore * 10) / 10,
    combinedScore: Math.round(combinedScore * 10) / 10,
    trend,
    components,
    history,
    lastUpdated: new Date(),
  };

  scores.set(hotspotId, result);
  return result;
}

/**
 * Update a single hotspot using news data + injected CII/geo/military hooks.
 */
export function updateHotspotEscalation(
  hotspotId: string,
  newsMatches: number,
  hasBreaking: boolean,
  newsVelocity: number,
): DynamicEscalationScore | null {
  const hotspot = INTEL_HOTSPOTS.find((h) => h.id === hotspotId);
  if (!hotspot) return null;

  const ciiScore = getCIIForHotspot(hotspot);
  const geoAlert = getGeoAlertForHotspot(hotspot);
  const military = countMilitaryNearHotspot(hotspot);

  return calculateDynamicScore(hotspotId, {
    newsMatches,
    hasBreaking,
    newsVelocity,
    ciiScore,
    geoAlertScore: geoAlert?.score ?? 0,
    geoAlertTypes: geoAlert?.types ?? 0,
    flightsNearby: military.flights,
    vesselsNearby: military.vessels,
  });
}

/**
 * Get current escalation score for a hotspot.
 */
export function getHotspotEscalation(hotspotId: string): DynamicEscalationScore | null {
  return scores.get(hotspotId) ?? null;
}

/**
 * Get all current escalation scores.
 */
export function getAllEscalationScores(): DynamicEscalationScore[] {
  return Array.from(scores.values());
}

/**
 * Check whether a score change should emit a signal (crosses integer boundary,
 * rapid 0.5+ jump, or reaches critical ≥4.5).
 */
export function shouldEmitSignal(
  hotspotId: string,
  oldScore: number | null,
  newScore: number,
): EscalationSignalReason | null {
  const lastSignal = lastSignalTime.get(hotspotId) ?? 0;
  if (Date.now() - lastSignal < SIGNAL_COOLDOWN_MS) return null;
  if (oldScore === null) return null;

  const oldInt = Math.floor(oldScore);
  const newInt = Math.floor(newScore);
  if (newInt > oldInt && newScore >= 2) {
    return { type: "threshold_crossed", oldScore, newScore, threshold: newInt };
  }
  if (newScore - oldScore >= 0.5) {
    return { type: "rapid_increase", oldScore, newScore };
  }
  if (newScore >= 4.5 && oldScore < 4.5) {
    return { type: "critical_reached", oldScore, newScore };
  }
  return null;
}

export function markSignalEmitted(hotspotId: string): void {
  lastSignalTime.set(hotspotId, Date.now());
}

/**
 * 24 h score change for a hotspot.
 */
export function getEscalationChange24h(
  hotspotId: string,
): { change: number; start: number; end: number } | null {
  const score = scores.get(hotspotId);
  if (!score || score.history.length < 2) return null;

  const h24Ago = Date.now() - HISTORY_WINDOW_MS;
  const oldestInWindow = score.history.find((h) => h.timestamp >= h24Ago);
  const newest = score.history[score.history.length - 1];
  if (!oldestInWindow || !newest) return null;

  return {
    change: Math.round((newest.score - oldestInWindow.score) * 10) / 10,
    start: Math.round(oldestInWindow.score * 10) / 10,
    end: Math.round(newest.score * 10) / 10,
  };
}

export function clearEscalationData(): void {
  scores.clear();
  lastSignalTime.clear();
}
