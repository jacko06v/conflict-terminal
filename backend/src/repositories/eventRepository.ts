import { pool, query, queryOne } from "../db/client";
import { Event, EventFilters, EventWithSources, Source } from "../types";
import { parseBbox } from "../utils/geo";

export async function findEvents(filters: EventFilters): Promise<Event[]> {
  const conditions: string[] = ["e.is_active = true"];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.country) {
    conditions.push(`e.country ILIKE $${idx++}`);
    params.push(`%${filters.country}%`);
  }
  if (filters.region) {
    conditions.push(`e.region ILIKE $${idx++}`);
    params.push(`%${filters.region}%`);
  }
  if (filters.city) {
    conditions.push(`e.city ILIKE $${idx++}`);
    params.push(`%${filters.city}%`);
  }
  if (filters.eventType) {
    conditions.push(`e.event_type = $${idx++}`);
    params.push(filters.eventType);
  }
  if (filters.verificationStatus) {
    conditions.push(`e.verification_status = $${idx++}`);
    params.push(filters.verificationStatus);
  }
  if (filters.minConfidence !== undefined) {
    conditions.push(`e.confidence_score >= $${idx++}`);
    params.push(filters.minConfidence);
  }
  if (filters.start) {
    conditions.push(`e.occurred_at >= $${idx++}`);
    params.push(filters.start);
  }
  if (filters.end) {
    conditions.push(`e.occurred_at <= $${idx++}`);
    params.push(filters.end);
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

  const limit = Math.min(filters.limit ?? 200, 500);
  const offset = filters.offset ?? 0;

  const sql = `
    SELECT
      e.id, e.external_id, e.title, e.summary, e.description,
      e.event_type, e.severity, e.confidence_score,
      e.verification_status, e.geolocation_precision,
      e.latitude, e.longitude, e.location_radius_km,
      e.country, e.region, e.city,
      e.occurred_at, e.first_seen_at, e.last_updated_at,
      e.is_active, e.created_at, e.updated_at,
      COUNT(es.source_id) AS source_count
    FROM events e
    LEFT JOIN event_sources es ON es.event_id = e.id
    WHERE ${conditions.join(" AND ")}
    GROUP BY e.id
    ORDER BY e.occurred_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  return query<Event>(sql, params);
}

export async function findEventById(id: string): Promise<EventWithSources | null> {
  const event = await queryOne<Event>(
    `SELECT
       e.id, e.external_id, e.title, e.summary, e.description,
       e.event_type, e.severity, e.confidence_score,
       e.verification_status, e.geolocation_precision,
       e.latitude, e.longitude, e.location_radius_km,
       e.country, e.region, e.city,
       e.occurred_at, e.first_seen_at, e.last_updated_at,
       e.is_active, e.created_at, e.updated_at
     FROM events e WHERE e.id = $1`,
    [id]
  );
  if (!event) return null;

  const sources = await query<Source>(
    `SELECT s.* FROM sources s
     JOIN event_sources es ON es.source_id = s.id
     WHERE es.event_id = $1
     ORDER BY s.reliability_score DESC`,
    [id]
  );

  const sourceCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM event_sources WHERE event_id = $1`,
    [id]
  );

  return {
    ...event,
    sources,
    source_count: parseInt(sourceCount?.count ?? "0"),
  };
}

export async function findNearbyEvents(
  latitude: number,
  longitude: number,
  radiusKm: number,
  excludeId: string,
  limit = 5
): Promise<Event[]> {
  return query<Event>(
    `SELECT e.*, COUNT(es.source_id) AS source_count
     FROM events e
     LEFT JOIN event_sources es ON es.event_id = e.id
     WHERE e.id != $1
       AND e.is_active = true
       AND ST_DWithin(
         e.geom::geography,
         ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
         $4
       )
     GROUP BY e.id
     ORDER BY e.occurred_at DESC
     LIMIT $5`,
    [excludeId, longitude, latitude, radiusKm * 1000, limit]
  );
}

export interface CreateEventInput {
  external_id?: string | null;
  title: string;
  summary: string;
  description?: string | null;
  event_type: string;
  severity: number;
  confidence_score: number;
  verification_status: string;
  geolocation_precision: string;
  latitude: number;
  longitude: number;
  location_radius_km?: number | null;
  country: string;
  region?: string | null;
  city?: string | null;
  occurred_at: Date;
}

export async function createEvent(
  input: CreateEventInput,
  client = pool
): Promise<Event> {
  const result = await (client as typeof pool).query(
    `INSERT INTO events (
       external_id, title, summary, description,
       event_type, severity, confidence_score,
       verification_status, geolocation_precision,
       latitude, longitude, location_radius_km,
       country, region, city, occurred_at,
       first_seen_at, last_updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
     RETURNING *`,
    [
      input.external_id ?? null,
      input.title,
      input.summary,
      input.description ?? null,
      input.event_type,
      input.severity,
      input.confidence_score,
      input.verification_status,
      input.geolocation_precision,
      input.latitude,
      input.longitude,
      input.location_radius_km ?? null,
      input.country,
      input.region ?? null,
      input.city ?? null,
      input.occurred_at.toISOString(),
    ]
  );
  return result.rows[0] as Event;
}

export async function findEventByExternalId(
  externalId: string
): Promise<Event | null> {
  return queryOne<Event>(
    `SELECT * FROM events WHERE external_id = $1`,
    [externalId]
  );
}

export async function updateEventConfidence(
  id: string,
  confidence: number,
  verificationStatus: string
): Promise<void> {
  await pool.query(
    `UPDATE events
     SET confidence_score = $2, verification_status = $3, last_updated_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id, confidence, verificationStatus]
  );
}
