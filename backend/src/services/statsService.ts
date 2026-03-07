import { query, queryOne } from "../db/client";
import { EventFilters, StatsResult } from "../types";
import { parseBbox } from "../utils/geo";

export async function getStats(filters: EventFilters): Promise<StatsResult> {
  const conditions: string[] = ["e.is_active = true"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.country) {
    conditions.push(`e.country ILIKE $${idx++}`);
    params.push(`%${filters.country}%`);
  }
  if (filters.start) {
    conditions.push(`e.occurred_at >= $${idx++}`);
    params.push(filters.start);
  }
  if (filters.end) {
    conditions.push(`e.occurred_at <= $${idx++}`);
    params.push(filters.end);
  }
  if (filters.eventType) {
    conditions.push(`e.event_type = $${idx++}`);
    params.push(filters.eventType);
  }
  if (filters.bbox) {
    const bbox = parseBbox(filters.bbox);
    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      conditions.push(
        `e.geom && ST_MakeEnvelope($${idx++}, $${idx++}, $${idx++}, $${idx++}, 4326)`
      );
      params.push(minLon, minLat, maxLon, maxLat);
    }
  }

  const where = conditions.join(" AND ");

  const row = await queryOne<{
    total_events: string;
    high_confidence_events: string;
    missile_drone_events: string;
    countries_affected: string;
    last_event_at: string | null;
  }>(
    `SELECT
       COUNT(*)::text AS total_events,
       COUNT(*) FILTER (WHERE e.confidence_score >= 80)::text AS high_confidence_events,
       COUNT(*) FILTER (WHERE e.event_type IN ('missile','drone'))::text AS missile_drone_events,
       COUNT(DISTINCT e.country)::text AS countries_affected,
       MAX(e.occurred_at)::text AS last_event_at
     FROM events e
     WHERE ${where}`,
    params
  );

  // Hotspots: locations with >= 3 events within 25km
  const hotspotsRow = await queryOne<{ hotspots_count: string }>(
    `SELECT COUNT(DISTINCT cluster_id)::text AS hotspots_count
     FROM (
       SELECT e1.id,
         (SELECT e2.id FROM events e2
          WHERE e2.id != e1.id AND e2.is_active = true
            AND ST_DWithin(e1.geom::geography, e2.geom::geography, 25000)
          LIMIT 1) AS cluster_id
       FROM events e1
       WHERE e1.is_active = true
     ) sub
     WHERE cluster_id IS NOT NULL`,
    []
  );

  return {
    total_events: parseInt(row?.total_events ?? "0"),
    high_confidence_events: parseInt(row?.high_confidence_events ?? "0"),
    missile_drone_events: parseInt(row?.missile_drone_events ?? "0"),
    countries_affected: parseInt(row?.countries_affected ?? "0"),
    hotspots_count: parseInt(hotspotsRow?.hotspots_count ?? "0"),
    last_event_at: row?.last_event_at ?? null,
  };
}
