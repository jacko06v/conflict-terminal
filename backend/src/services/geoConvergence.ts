/**
 * Geographic convergence detection service.
 * Adapted from worldmonitor's geo-convergence.ts.
 *
 * Detects when multiple types of events (news, military flights, vessels,
 * earthquakes) converge in the same geographic cell within 24h.
 *
 * Uses 1°×1° grid cells and requires ≥3 distinct event types to trigger.
 */

import {
  CONFLICT_ZONES,
  STRATEGIC_WATERWAYS,
  INTEL_HOTSPOTS,
} from "../data/geoStrategic";

export type GeoEventType =
  | "news"
  | "military_flight"
  | "military_vessel"
  | "earthquake"
  | "fire";

interface GeoCell {
  id: string;
  lat: number;
  lon: number;
  events: Map<GeoEventType, { count: number; lastSeen: Date }>;
  firstSeen: Date;
}

const cells = new Map<string, GeoCell>();
const WINDOW_MS = 24 * 60 * 60 * 1000;
const CONVERGENCE_THRESHOLD = 3;

export function getCellId(lat: number, lon: number): string {
  return `${Math.floor(lat)},${Math.floor(lon)}`;
}

/**
 * Ingest a single geo event into the convergence grid.
 */
export function ingestGeoEvent(
  lat: number,
  lon: number,
  type: GeoEventType,
  timestamp: Date = new Date()
): void {
  const cellId = getCellId(lat, lon);

  let cell = cells.get(cellId);
  if (!cell) {
    cell = {
      id: cellId,
      lat: Math.floor(lat) + 0.5,
      lon: Math.floor(lon) + 0.5,
      events: new Map(),
      firstSeen: timestamp,
    };
    cells.set(cellId, cell);
  }

  const existing = cell.events.get(type);
  cell.events.set(type, {
    count: (existing?.count ?? 0) + 1,
    lastSeen: timestamp,
  });
}

/**
 * Batch ingest multiple events.
 */
export function ingestEvents(
  events: Array<{ lat: number; lon: number; type: GeoEventType; time?: Date }>
): void {
  for (const e of events) {
    ingestGeoEvent(e.lat, e.lon, e.type, e.time);
  }
}

function pruneOldEvents(): void {
  const cutoff = Date.now() - WINDOW_MS;

  for (const [cellId, cell] of cells) {
    for (const [type, data] of cell.events) {
      if (data.lastSeen.getTime() < cutoff) {
        cell.events.delete(type);
      }
    }
    if (cell.events.size === 0) {
      cells.delete(cellId);
    }
  }
}

// ─── Convergence Alert ─────────────────────────────────────────────────────

export interface GeoConvergenceAlert {
  cellId: string;
  lat: number;
  lon: number;
  types: GeoEventType[];
  totalEvents: number;
  score: number;
  locationName: string;
}

const seenAlerts = new Set<string>();

/**
 * Detect convergence — cells with ≥3 distinct event types in 24h.
 */
export function detectGeoConvergence(): GeoConvergenceAlert[] {
  pruneOldEvents();

  const alerts: GeoConvergenceAlert[] = [];

  for (const [cellId, cell] of cells) {
    if (cell.events.size >= CONVERGENCE_THRESHOLD) {
      if (seenAlerts.has(cellId)) continue;

      const types = Array.from(cell.events.keys());
      const totalEvents = Array.from(cell.events.values()).reduce(
        (sum, d) => sum + d.count,
        0
      );

      const typeScore = cell.events.size * 25;
      const countBoost = Math.min(25, totalEvents * 2);
      const score = Math.min(100, typeScore + countBoost);

      alerts.push({
        cellId,
        lat: cell.lat,
        lon: cell.lon,
        types,
        totalEvents,
        score,
        locationName: getLocationName(cell.lat, cell.lon),
      });
      seenAlerts.add(cellId);
    }
  }

  return alerts.sort((a, b) => b.score - a.score);
}

/**
 * Check for convergence near a specific location.
 */
export function getAlertsNearLocation(
  lat: number,
  lon: number,
  radiusKm: number
): { score: number; types: number } | null {
  pruneOldEvents();

  let maxScore = 0;
  let maxTypes = 0;

  for (const cell of cells.values()) {
    const dist = haversineKm(lat, lon, cell.lat, cell.lon);
    if (dist <= radiusKm && cell.events.size >= 2) {
      const types = cell.events.size;
      const totalEvents = Array.from(cell.events.values()).reduce(
        (sum, d) => sum + d.count,
        0
      );
      const typeScore = types * 25;
      const countBoost = Math.min(25, totalEvents * 2);
      const score = Math.min(100, typeScore + countBoost);

      if (score > maxScore) {
        maxScore = score;
        maxTypes = types;
      }
    }
  }

  return maxScore > 0 ? { score: maxScore, types: maxTypes } : null;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<GeoEventType, string> = {
  news: "news events",
  military_flight: "military flights",
  military_vessel: "naval vessels",
  earthquake: "seismic activity",
  fire: "satellite fire detections",
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reverse geocode coordinates to human-readable location.
 */
export function getLocationName(lat: number, lon: number): string {
  // Check conflict zones first
  for (const zone of CONFLICT_ZONES) {
    const [zoneLon, zoneLat] = zone.center;
    const dist = haversineKm(lat, lon, zoneLat, zoneLon);
    if (dist < 300) return zone.name;
  }

  // Check strategic waterways
  for (const waterway of STRATEGIC_WATERWAYS) {
    const dist = haversineKm(lat, lon, waterway.lat, waterway.lon);
    if (dist < 200) return waterway.name;
  }

  // Check intel hotspots
  let nearest: { name: string; dist: number } | null = null;
  for (const hotspot of INTEL_HOTSPOTS) {
    const dist = haversineKm(lat, lon, hotspot.lat, hotspot.lon);
    if (dist < 150 && (!nearest || dist < nearest.dist)) {
      nearest = { name: hotspot.name, dist };
    }
  }
  if (nearest) return nearest.name;

  // Regional fallback
  if (lat >= 25 && lat <= 40 && lon >= 25 && lon <= 75) return "Middle East";
  if (lat >= 30 && lat <= 45 && lon >= 100 && lon <= 145) return "East Asia";
  if (lat >= -10 && lat <= 25 && lon >= 90 && lon <= 130) return "Southeast Asia";
  if (lat >= 35 && lat <= 70 && lon >= -10 && lon <= 40) return "Europe";
  if (lat >= 44 && lat <= 75 && lon >= 20 && lon <= 180) return "Russia";
  if (lat >= -35 && lat <= 35 && lon >= -20 && lon <= 55) return "Africa";
  if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -65) return "North America";
  if (lat >= -60 && lat <= 15 && lon >= -80 && lon <= -30) return "South America";

  return `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`;
}

export function getCellCount(): number {
  return cells.size;
}

export function clearCells(): void {
  cells.clear();
  seenAlerts.clear();
}
