import { FastifyInstance } from "fastify";

interface UpstreamSparkline {
  place_id: string;
  current_popularity: number | null;
  recorded_at: string;
}

interface UpstreamLocation {
  place_id: string;
  name: string;
  current_popularity: number | null;
  percentage_of_usual: number | null;
  is_spike: boolean;
  spike_magnitude: number | null;
  is_closed_now?: boolean;
  data_source: string;
  recorded_at: string;
  sparkline_24h?: UpstreamSparkline[];
}

export async function proxyRoutes(app: FastifyInstance): Promise<void> {
  // Proxy for pizzint.watch — avoids CORS issues from browser
  app.get("/pizzaint", async (_req, reply) => {
    try {
      const res = await fetch("https://www.pizzint.watch/api/dashboard-data", {
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": "ConflictTerminal/1.0" },
      });
      if (!res.ok) return reply.status(502).send({ error: "upstream error" });

      const json = await res.json() as { success: boolean; data: UpstreamLocation[] };

      if (!json.success || !Array.isArray(json.data)) {
        return reply.status(502).send({ error: "invalid response" });
      }

      const all = json.data;
      const open = all.filter((d) => !d.is_closed_now);
      const spikes = all.filter((d) => d.is_spike);

      // Compute score using both open locations + sparkline history
      const avgPop = open.length
        ? open.reduce((s, d) => s + (d.current_popularity ?? 0), 0) / open.length
        : computeSparklineAvg(all);
      const spikeRatio = all.length ? spikes.length / all.length : 0;
      const activityScore = Math.min(100, Math.round(avgPop * 0.6 + spikeRatio * 100 * 0.4));

      // Build per-location data for frontend
      const locations = all.map((loc) => {
        const sparkline = (loc.sparkline_24h ?? [])
          .map((s) => ({
            popularity: s.current_popularity,
            time: s.recorded_at,
          }))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        return {
          id: loc.place_id,
          name: loc.name,
          currentPopularity: loc.current_popularity,
          percentageOfUsual: loc.percentage_of_usual,
          isSpike: loc.is_spike,
          spikeMagnitude: loc.spike_magnitude,
          isClosed: loc.is_closed_now ?? false,
          sparkline,
        };
      });

      return {
        activityScore,
        locationCount: all.length,
        openCount: open.length,
        spikeCount: spikes.length,
        locations,
      };
    } catch {
      return reply.status(502).send({ error: "fetch failed" });
    }
  });
}

/** When all locations are closed, derive a score from recent sparkline values */
function computeSparklineAvg(locations: UpstreamLocation[]): number {
  let total = 0;
  let count = 0;
  for (const loc of locations) {
    const values = (loc.sparkline_24h ?? [])
      .map((s) => s.current_popularity)
      .filter((v): v is number => v != null && v > 0);
    // Use only last 6 entries (most recent hours)
    const recent = values.slice(-6);
    for (const v of recent) {
      total += v;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}
