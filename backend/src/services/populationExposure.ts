/**
 * Population Exposure Service — ported from worldmonitor population-exposure.ts
 *
 * Cross-references events with WorldPop REST API (free, no API key)
 * to estimate civilian population within an event's impact radius.
 *
 * Replaces the original protobuf/gRPC client with plain fetch.
 */

import { createCircuitBreaker } from "../utils/circuitBreaker";

/* ── Circuit breaker ───────────────────────────────── */

const wpBreaker = createCircuitBreaker<number | null>({
  name: "worldpop",
  maxFailures: 5,
  cooldownMs: 5 * 60_000,
  cacheTtlMs: 30 * 60_000,
});

/* ── Types ─────────────────────────────────────────── */

export interface PopulationExposure {
  eventId: string;
  eventName: string;
  eventType: string;
  lat: number;
  lon: number;
  exposedPopulation: number;
  exposureRadiusKm: number;
}

export interface EventForExposure {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
}

/* ── Radius mapping ────────────────────────────────── */

function getRadiusForEventType(type: string): number {
  switch (type) {
    case "conflict":
    case "battle":
      return 50;
    case "earthquake":
      return 100;
    case "fire":
    case "wildfire":
      return 30;
    case "flood":
      return 100;
    case "nuclear":
      return 150;
    default:
      return 50;
  }
}

/* ── WorldPop API ──────────────────────────────────── */

const WORLDPOP_BASE = "https://api.worldpop.org/v1/services/stats";

/**
 * Fetch estimated population within a radius of (lat, lon) from WorldPop.
 * Returns null on any failure.
 */
async function fetchPopulationFromAPI(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<number | null> {
  // WorldPop /stats endpoint: pass a point + buffer
  const url = `${WORLDPOP_BASE}?dataset=wpgppop&year=2020&lat=${lat}&lon=${lon}&buffer=${radiusKm * 1000}&runasync=false`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    status: string;
    data?: { total_population?: number };
  };

  return data.data?.total_population ?? null;
}

/**
 * Fetch population exposure for a single coordinate, wrapped by circuit breaker.
 */
export async function fetchExposure(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<number | null> {
  return wpBreaker.execute(() => fetchPopulationFromAPI(lat, lon, radiusKm), null);
}

/**
 * Enrich a batch of events with population exposure data.
 * Processes up to 5 concurrently to respect WorldPop rate limits.
 */
export async function enrichEventsWithExposure(
  events: EventForExposure[],
): Promise<PopulationExposure[]> {
  const MAX_CONCURRENT = 5;
  const results: PopulationExposure[] = [];

  for (let i = 0; i < events.length; i += MAX_CONCURRENT) {
    const batch = events.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.allSettled(
      batch.map(async (event) => {
        const radius = getRadiusForEventType(event.type);
        const pop = await fetchExposure(event.lat, event.lon, radius);
        if (pop === null || pop === 0) return null;
        return {
          eventId: event.id,
          eventName: event.name,
          eventType: event.type,
          lat: event.lat,
          lon: event.lon,
          exposedPopulation: Math.round(pop),
          exposureRadiusKm: radius,
        } satisfies PopulationExposure;
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    }
  }

  return results.sort((a, b) => b.exposedPopulation - a.exposedPopulation);
}

/* ── Formatting helper ─────────────────────────────── */

export function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
