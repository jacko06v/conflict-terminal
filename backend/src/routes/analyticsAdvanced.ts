import { FastifyInstance } from "fastify";
import {
  getActiveClusters,
  getClusterById,
  getClusterStats,
} from "../services/clustering.js";
import {
  ingestHeadlines,
  drainTrendingSpikes,
  getTrendingConfig,
  updateTrendingConfig,
  suppressTerm,
  getTrackedTermCount,
} from "../services/trendingKeywords.js";
import {
  drainBreakingAlerts,
  getAlertHistory,
  getAlertSettings,
  updateAlertSettings,
} from "../services/breakingNews.js";

export async function analyticsAdvancedRoutes(app: FastifyInstance): Promise<void> {
  // ─── Trending Keywords ──────────────────────────────────────────────
  app.get("/analytics/trending", async () => {
    const spikes = drainTrendingSpikes();
    return {
      data: spikes,
      trackedTerms: getTrackedTermCount(),
    };
  });

  app.get("/analytics/trending/config", async () => {
    return { data: getTrendingConfig() };
  });

  app.put("/analytics/trending/config", async (request) => {
    const body = request.body as Record<string, unknown>;
    const updated = updateTrendingConfig(body);
    return { data: updated };
  });

  app.post("/analytics/trending/suppress", async (request) => {
    const { term } = request.body as { term: string };
    if (!term?.trim()) return { error: "term is required" };
    suppressTerm(term);
    return { ok: true };
  });

  // ─── Breaking News ─────────────────────────────────────────────────
  app.get("/analytics/breaking", async () => {
    const alerts = drainBreakingAlerts();
    return { data: alerts };
  });

  app.get("/analytics/breaking/history", async (request) => {
    const { limit } = request.query as { limit?: string };
    const history = getAlertHistory(limit ? parseInt(limit, 10) : 50);
    return { data: history };
  });

  app.get("/analytics/breaking/settings", async () => {
    return { data: getAlertSettings() };
  });

  app.put("/analytics/breaking/settings", async (request) => {
    const body = request.body as Record<string, unknown>;
    const updated = updateAlertSettings(body as any);
    return { data: updated };
  });

  // ─── Clustering ────────────────────────────────────────────────────
  app.get("/analytics/clusters", async (request) => {
    const { minArticles } = request.query as { minArticles?: string };
    const clusters = getActiveClusters(
      minArticles ? parseInt(minArticles, 10) : 2
    );
    return { data: clusters, total: clusters.length };
  });

  app.get<{ Params: { id: string } }>("/analytics/clusters/:id", async (request, reply) => {
    const cluster = getClusterById(request.params.id);
    if (!cluster) return reply.status(404).send({ error: "Cluster not found" });
    return { data: cluster };
  });

  app.get("/analytics/clusters/stats", async () => {
    return { data: getClusterStats() };
  });
}
