import { pool, query } from "../db/client";
import { Source } from "../types";

export interface CreateSourceInput {
  name: string;
  source_type: string;
  url?: string | null;
  publisher?: string | null;
  published_at?: Date | null;
  reliability_score: number;
  raw_text?: string | null;
}

export async function createSource(
  input: CreateSourceInput,
  client = pool
): Promise<Source> {
  // If a URL is provided, upsert by URL to avoid duplicate source rows
  // when the same article is encountered across multiple ingestion runs.
  if (input.url) {
    const result = await (client as typeof pool).query(
      `INSERT INTO sources (name, source_type, url, publisher, published_at, reliability_score, raw_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (url) DO UPDATE
         SET reliability_score = GREATEST(sources.reliability_score, EXCLUDED.reliability_score)
       RETURNING *`,
      [
        input.name,
        input.source_type,
        input.url,
        input.publisher ?? null,
        input.published_at?.toISOString() ?? null,
        input.reliability_score,
        input.raw_text ?? null,
      ]
    );
    return result.rows[0] as Source;
  }

  const result = await (client as typeof pool).query(
    `INSERT INTO sources (name, source_type, url, publisher, published_at, reliability_score, raw_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      input.name,
      input.source_type,
      null,
      input.publisher ?? null,
      input.published_at?.toISOString() ?? null,
      input.reliability_score,
      input.raw_text ?? null,
    ]
  );
  return result.rows[0] as Source;
}

export async function linkEventSource(
  eventId: string,
  sourceId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO event_sources (event_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [eventId, sourceId]
  );
}

export async function findSources(
  limit = 100,
  offset = 0
): Promise<Source[]> {
  return query<Source>(
    `SELECT * FROM sources ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}
