import { query } from "../db/client";
import { TimelineBucket } from "../types";

type TimeRange = "24h" | "7d" | "30d";

export async function getTimeline(range: TimeRange): Promise<TimelineBucket[]> {
  const intervalMap: Record<TimeRange, { truncate: string; interval: string }> = {
    "24h": { truncate: "hour", interval: "24 hours" },
    "7d":  { truncate: "day",  interval: "7 days" },
    "30d": { truncate: "day",  interval: "30 days" },
  };

  const { truncate, interval } = intervalMap[range] ?? intervalMap["7d"];

  const rows = await query<TimelineBucket>(
    `SELECT
       date_trunc($1, occurred_at) AS bucket,
       event_type,
       COUNT(*)::int AS count
     FROM events
     WHERE is_active = true
       AND occurred_at >= NOW() - INTERVAL '${interval}'
     GROUP BY bucket, event_type
     ORDER BY bucket ASC`,
    [truncate]
  );

  return rows;
}
