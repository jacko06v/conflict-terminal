import { FastifyInstance } from "fastify";
import {
  INTEL_HOTSPOTS,
  STRATEGIC_WATERWAYS,
  CONFLICT_ZONES,
  APT_GROUPS,
  MILITARY_BASES,
  NUCLEAR_FACILITIES,
  SANCTIONED_COUNTRIES,
  ECONOMIC_CENTERS,
  SPACEPORTS,
} from "../data/geoStrategic.js";
import { PIPELINES } from "../data/pipelines.js";
import { PORTS } from "../data/ports.js";
import { UNDERSEA_CABLES } from "../data/underseaCables.js";
import { FEED_REGISTRY, getTotalFeedCount, getFeedsByRegion, getFeedsByTier } from "../data/feeds.js";
import {
  calculateCascade,
  getGraphStats,
  buildDependencyGraph,
} from "../services/infrastructureCascade.js";
import {
  getAllEscalationScores,
  getHotspotEscalation,
  getEscalationChange24h,
} from "../services/hotspotEscalation.js";
import { rankNewsByImportance, type NewsItemInput } from "../services/newsImportanceScoring.js";
import { enrichEventsWithExposure, type EventForExposure } from "../services/populationExposure.js";
import { getLastSummary as getFocalSummary } from "../services/focalPointDetector.js";

export async function strategicRoutes(app: FastifyInstance): Promise<void> {
  // ─── Geo-strategic layers ──────────────────────────────────────────

  app.get("/strategic/hotspots", async () => {
    return { data: INTEL_HOTSPOTS };
  });

  app.get("/strategic/waterways", async () => {
    return { data: STRATEGIC_WATERWAYS };
  });

  app.get("/strategic/conflicts", async () => {
    return { data: CONFLICT_ZONES };
  });

  app.get("/strategic/apt-groups", async () => {
    return { data: APT_GROUPS };
  });

  app.get("/strategic/military-bases", async () => {
    return { data: MILITARY_BASES };
  });

  app.get("/strategic/nuclear", async () => {
    return { data: NUCLEAR_FACILITIES };
  });

  app.get("/strategic/sanctioned", async () => {
    return { data: SANCTIONED_COUNTRIES };
  });

  app.get("/strategic/economic-centers", async () => {
    return { data: ECONOMIC_CENTERS };
  });

  app.get("/strategic/spaceports", async () => {
    return { data: SPACEPORTS };
  });

  // ─── Infrastructure ────────────────────────────────────────────────

  app.get("/strategic/pipelines", async () => {
    return { data: PIPELINES };
  });

  // ─── Feed registry metadata ────────────────────────────────────────

  app.get("/strategic/feeds", async () => {
    return {
      total: getTotalFeedCount(),
      data: FEED_REGISTRY.map((f) => ({
        name: f.name,
        tier: f.tier,
        region: f.region,
      })),
    };
  });

  app.get("/strategic/feeds/by-region", async (request) => {
    const { region } = request.query as { region?: string };
    if (!region) {
      // Return available regions
      const regions = [...new Set(FEED_REGISTRY.map((f) => f.region))];
      return { data: regions };
    }
    return { data: getFeedsByRegion(region) };
  });

  app.get("/strategic/feeds/by-tier", async (request) => {
    const { tier } = request.query as { tier?: string };
    if (!tier) return { data: [] };
    return { data: getFeedsByTier(parseInt(tier, 10) as 1 | 2 | 3 | 4) };
  });

  // ─── Ports & Undersea Cables ───────────────────────────────────────

  app.get("/strategic/ports", async () => {
    return { data: PORTS };
  });

  app.get("/strategic/cables", async () => {
    return { data: UNDERSEA_CABLES };
  });

  // ─── Infrastructure Cascade ────────────────────────────────────────

  app.get("/strategic/cascade/stats", async () => {
    return { data: getGraphStats() };
  });

  app.get("/strategic/cascade/:sourceId", async (request, reply) => {
    const { sourceId } = request.params as { sourceId: string };
    const { disruption } = request.query as { disruption?: string };
    const result = calculateCascade(sourceId, disruption ? parseFloat(disruption) : 1.0);
    if (!result) return reply.status(404).send({ error: "Source node not found" });
    return { data: result };
  });

  // ─── Hotspot Escalation ────────────────────────────────────────────

  app.get("/strategic/escalation", async () => {
    return { data: getAllEscalationScores() };
  });

  app.get("/strategic/escalation/:hotspotId", async (request, reply) => {
    const { hotspotId } = request.params as { hotspotId: string };
    const score = getHotspotEscalation(hotspotId);
    if (!score) return reply.status(404).send({ error: "Hotspot not found" });
    const change24h = getEscalationChange24h(hotspotId);
    return { data: { ...score, change24h } };
  });

  // ─── News Importance Scoring ───────────────────────────────────────

  app.post("/strategic/importance", async (request) => {
    const { items } = request.body as { items: NewsItemInput[] };
    const ranked = rankNewsByImportance(items ?? []);
    return { data: ranked };
  });

  // ─── Population Exposure ───────────────────────────────────────────

  app.post("/strategic/population-exposure", async (request) => {
    const { events } = request.body as { events: EventForExposure[] };
    const results = await enrichEventsWithExposure(events ?? []);
    return { data: results };
  });

  // ─── Focal Point Detector ──────────────────────────────────────────

  app.get("/strategic/focal-points", async () => {
    const summary = getFocalSummary();
    if (!summary) return { data: null, message: "No analysis computed yet" };
    return { data: summary };
  });
}
