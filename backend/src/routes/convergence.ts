import { FastifyInstance } from "fastify";
import {
  detectGeoConvergence,
  getAlertsNearLocation,
  getCellCount,
} from "../services/geoConvergence.js";
import {
  getInstabilityRanking,
  getCountryInstability,
  getTrackedCountryCount,
} from "../services/countryInstability.js";
import {
  getBaselineStats,
  getTrackedBuckets,
  drainAnomalies,
} from "../services/temporalBaseline.js";

export async function convergenceRoutes(app: FastifyInstance): Promise<void> {
  // ─── Geo Convergence ───────────────────────────────────────────────
  app.get("/convergence/alerts", async () => {
    const alerts = detectGeoConvergence();
    return { data: alerts, cells: getCellCount() };
  });

  app.get("/convergence/nearby", async (request, reply) => {
    const { lat, lon, radius } = request.query as {
      lat?: string;
      lon?: string;
      radius?: string;
    };
    if (!lat || !lon) {
      return reply.status(400).send({ error: "lat and lon are required" });
    }
    const alerts = getAlertsNearLocation(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : 100
    );
    return { data: alerts };
  });

  // ─── Country Instability ──────────────────────────────────────────
  app.get("/instability/ranking", async (request) => {
    const { limit } = request.query as { limit?: string };
    const ranking = getInstabilityRanking(
      limit ? parseInt(limit, 10) : 20
    );
    return { data: ranking, tracked: getTrackedCountryCount() };
  });

  app.get<{ Params: { country: string } }>(
    "/instability/:country",
    async (request, reply) => {
      const result = getCountryInstability(request.params.country);
      if (!result) {
        return reply.status(404).send({ error: "Country not tracked" });
      }
      return { data: result };
    }
  );

  // ─── Temporal Baseline ────────────────────────────────────────────
  app.get("/temporal/anomalies", async () => {
    const anomalies = drainAnomalies();
    return { data: anomalies };
  });

  app.get("/temporal/buckets", async () => {
    const buckets = getTrackedBuckets();
    return { data: buckets };
  });

  app.get("/temporal/baseline", async (request, reply) => {
    const { eventType, region } = request.query as {
      eventType?: string;
      region?: string;
    };
    if (!eventType || !region) {
      return reply
        .status(400)
        .send({ error: "eventType and region are required" });
    }
    const stats = getBaselineStats(eventType, region);
    if (!stats) {
      return reply.status(404).send({ error: "Baseline not found" });
    }
    return { data: stats };
  });
}
