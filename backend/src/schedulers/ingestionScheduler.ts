import cron from "node-cron";
import { pool } from "../db/client";
import { ingestRawItem } from "../services/eventService";
import { IngestionProvider } from "../providers/base";
import { GdeltProvider } from "../providers/gdeltProvider";
import { FirmsProvider } from "../providers/firmsProvider";
import { RssProvider } from "../providers/rssProvider";
import { EarthquakeProvider } from "../providers/earthquakeProvider";
import { EnhancedRssProvider, getLastBatchArticles } from "../providers/enhancedRssProvider";
import { broadcast } from "../websocket/wsServer";
import { ingestEvents as ingestGeoEvents, detectGeoConvergence } from "../services/geoConvergence";
import { ingestHeadlines, drainTrendingSpikes } from "../services/trendingKeywords";
import { evaluateBatch, drainBreakingAlerts } from "../services/breakingNews";
import { clusterHeadlines } from "../services/clustering";
import { updateAndCheck as temporalCheck, drainAnomalies } from "../services/temporalBaseline";
import { recordEventSignals, tickHourlyCounters, recalculateAll as recalcInstability, getCountryInstability } from "../services/countryInstability";
import {
  updateHotspotEscalation,
  getAllEscalationScores,
  setCIIGetter,
  setGeoAlertGetter,
  shouldEmitSignal,
  markSignalEmitted,
} from "../services/hotspotEscalation";
import {
  analyze as analyzeFocalPoints,
  type ClusterInput,
  type GeoSignalInput,
} from "../services/focalPointDetector";
import { getActiveClusters } from "../services/clustering";
import { INTEL_HOTSPOTS } from "../data/geoStrategic";

// Real providers — all free, no LLM, no paid APIs
const providers: IngestionProvider[] = [
  new GdeltProvider(),          // GDELT DOC API — structured news events, no key
  new FirmsProvider(),          // NASA FIRMS satellite thermal — optional key
  new RssProvider(),            // RSS feeds (Al Jazeera, BBC, ToI, MEE)
  new EarthquakeProvider(),     // USGS earthquake feed
  new EnhancedRssProvider(),    // Enhanced RSS (90+ feeds, threat classification)
];

async function runIngestion(provider: IngestionProvider): Promise<void> {
  const runId = await startIngestionRun(provider.name);
  let fetched = 0;
  let created = 0;
  let updated = 0;

  try {
    const items = await provider.fetchRawItems();
    fetched = items.length;

    for (const item of items) {
      const { event, isNew } = await ingestRawItem(item);
      if (isNew) {
        created++;
        broadcast({ type: "new_event", payload: event });
      } else {
        updated++;
        broadcast({ type: "update_event", payload: event });
      }
    }

    await completeIngestionRun(runId, "completed", fetched, created, updated);
    if (fetched > 0) {
      console.log(
        `[${provider.name}] fetched=${fetched} new=${created} updated=${updated}`
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${provider.name}] failed:`, errMsg);
    await completeIngestionRun(runId, "failed", fetched, created, updated, errMsg);
  }
}

async function startIngestionRun(providerName: string): Promise<string> {
  const result = await pool.query(
    `INSERT INTO ingestion_runs (provider_name, status) VALUES ($1, 'running') RETURNING id`,
    [providerName]
  );
  return result.rows[0].id as string;
}

async function completeIngestionRun(
  id: string,
  status: string,
  fetched: number,
  created: number,
  updated: number,
  errorLog?: string
): Promise<void> {
  await pool.query(
    `UPDATE ingestion_runs
     SET status = $2, completed_at = NOW(),
         records_fetched = $3, records_created = $4, records_updated = $5,
         error_log = $6
     WHERE id = $1`,
    [id, status, fetched, created, updated, errorLog ?? null]
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run analytics pipeline after each Enhanced RSS ingestion.
 * Feeds trending keywords, breaking news, clustering, geo convergence,
 * country instability, and temporal baselines.
 */
async function runAnalyticsPipeline(): Promise<void> {
  try {
    const articles = getLastBatchArticles();
    if (articles.length === 0) return;

    // 1) Trending keywords
    ingestHeadlines(
      articles.map((a) => ({
        title: a.title,
        pubDate: new Date(a.publishedAt),
        source: a.source,
        link: a.link,
      }))
    );

    // 2) Breaking news evaluation
    evaluateBatch(
      articles.map((a) => ({
        title: a.title,
        source: a.source,
        url: a.link ?? "",
      }))
    );

    // 3) Clustering
    clusterHeadlines(
      articles.map((a) => ({
        id: a.externalId,
        title: a.title,
        source: a.source,
        tier: a.tier,
        publishedAt: a.publishedAt,
        link: a.link,
      }))
    );

    // 4) Geo convergence: ingest geolocated events
    const geoArticles = articles
      .filter((a) => a.latitude !== undefined && a.longitude !== undefined)
      .map((a) => ({
        type: "news" as const,
        lat: a.latitude!,
        lon: a.longitude!,
        timestamp: a.publishedAt,
        metadata: { title: a.title, source: a.source },
      }));
    if (geoArticles.length > 0) {
      ingestGeoEvents(geoArticles);
    }

    // 5) Country instability signals
    const signals = articles
      .filter((a) => a.country)
      .map((a) => ({
        country: a.country!,
        category: a.threat?.category ?? "general",
        severity: a.threat?.level === "critical" ? 5
          : a.threat?.level === "high" ? 4
          : a.threat?.level === "medium" ? 3
          : a.threat?.level === "low" ? 2
          : 1,
        timestamp: a.publishedAt,
      }));
    if (signals.length > 0) {
      recordEventSignals(signals);
    }

    // Broadcast any pending spikes / breaking alerts / anomalies
    const spikes = drainTrendingSpikes();
    if (spikes.length > 0) {
      broadcast({ type: "trending_spikes", payload: spikes });
    }
    const breaking = drainBreakingAlerts();
    if (breaking.length > 0) {
      broadcast({ type: "breaking_alerts", payload: breaking });
    }

    // Convergence check
    const convergenceAlerts = detectGeoConvergence();
    if (convergenceAlerts.length > 0) {
      broadcast({ type: "convergence_alerts", payload: convergenceAlerts });
    }

    // Temporal anomalies
    const anomalies = drainAnomalies();
    if (anomalies.length > 0) {
      broadcast({ type: "temporal_anomalies", payload: anomalies });
    }

    // 6) Hotspot escalation — update all hotspots with news match counts
    try {
      const hasAnyBreaking = breaking.length > 0;
      for (const hotspot of INTEL_HOTSPOTS) {
        const kws = hotspot.keywords;
        const matchedArticles = articles.filter((a) =>
          kws.some((kw) => a.title.toLowerCase().includes(kw)),
        );
        const oldScore = getAllEscalationScores().find((s) => s.hotspotId === hotspot.id)?.combinedScore ?? null;
        const result = updateHotspotEscalation(
          hotspot.id,
          matchedArticles.length,
          hasAnyBreaking && matchedArticles.length > 0,
          matchedArticles.length / 2, // velocity ~= matches / 2h
        );
        if (result && oldScore !== null) {
          const signal = shouldEmitSignal(hotspot.id, oldScore, result.combinedScore);
          if (signal) {
            markSignalEmitted(hotspot.id);
            broadcast({
              type: "hotspot_escalation",
              payload: { hotspotId: hotspot.id, name: hotspot.name, ...signal, current: result },
            });
          }
        }
      }
    } catch (err) {
      console.error("[Hotspot escalation] error:", err);
    }

    // 7) Focal point analysis — correlate clusters + geo signals
    try {
      const activeClusters = getActiveClusters();
      const clusterInputs: ClusterInput[] = activeClusters.map((c) => ({
        id: c.id,
        headline: c.headline,
        articleCount: c.articles.length,
        sources: c.sources,
      }));

      const geoSignals = new Map<string, GeoSignalInput>();
      // Merge instability + convergence + escalation into country-keyed signals
      for (const hotspot of INTEL_HOTSPOTS) {
        const esc = getAllEscalationScores().find((s) => s.hotspotId === hotspot.id);
        for (const kw of hotspot.keywords) {
          const cii = getCountryInstability(kw);
          if (cii || esc) {
            geoSignals.set(kw, {
              country: kw,
              instabilityScore: cii?.score,
              escalationScore: esc?.combinedScore,
              convergenceScore: convergenceAlerts.length > 0 ? convergenceAlerts[0].score : undefined,
              hasBreaking: breaking.length > 0,
            });
          }
        }
      }

      if (clusterInputs.length > 0) {
        const summary = analyzeFocalPoints(clusterInputs, geoSignals);
        if (summary.focalPoints.length > 0) {
          broadcast({ type: "focal_points", payload: summary });
        }
      }
    } catch (err) {
      console.error("[Focal point detector] error:", err);
    }
  } catch (err) {
    console.error("[Analytics pipeline] error:", err);
  }
}

export function startScheduler(): void {
  // GDELT: every 15 minutes (their data refreshes every 15 min)
  cron.schedule("*/15 * * * *", () => {
    runIngestion(providers[0]).catch(console.error);
  });

  // NASA FIRMS: every 30 minutes (NRT data has ~3h latency anyway)
  cron.schedule("*/30 * * * *", () => {
    runIngestion(providers[1]).catch(console.error);
  });

  // RSS feeds: every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    runIngestion(providers[2]).catch(console.error);
  });

  // Earthquake (USGS): every 30 minutes
  cron.schedule("*/30 * * * *", () => {
    runIngestion(providers[3]).catch(console.error);
  });

  // Enhanced RSS (90+ feeds): every 5 minutes, then analytics pipeline
  cron.schedule("*/5 * * * *", async () => {
    await runIngestion(providers[4]).catch(console.error);
    await runAnalyticsPipeline();
  });

  // Country instability hourly tick
  cron.schedule("0 * * * *", () => {
    tickHourlyCounters();
    recalcInstability();
  });

  // Country instability recalculate every 15 min
  cron.schedule("*/15 * * * *", () => {
    recalcInstability();
  });

  // Stagger startup runs to avoid hitting multiple APIs simultaneously:
  //  RSS immediately, FIRMS after 8s, GDELT after 20s, Earthquake after 30s, Enhanced RSS after 40s
  console.log("Running initial ingestion (staggered)...");

  // Wire escalation getter hooks
  setCIIGetter((name) => {
    const cii = getCountryInstability(name);
    return cii?.score ?? null;
  });
  setGeoAlertGetter((lat, lon, radiusKm) => {
    const alerts = detectGeoConvergence();
    const nearby = alerts.filter((a) => {
      const dLat = a.lat - lat;
      const dLon = a.lon - lon;
      const roughKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
      return roughKm < radiusKm;
    });
    if (nearby.length === 0) return null;
    return { score: Math.max(...nearby.map((a) => a.score)), types: nearby.length };
  });

  const startupOrder: [IngestionProvider, number][] = [
    [providers[2], 0],      // RSS — first, no rate limit
    [providers[1], 8_000],  // FIRMS — 8s later
    [providers[0], 20_000], // GDELT — 20s later
    [providers[3], 30_000], // Earthquake — 30s later
    [providers[4], 40_000], // Enhanced RSS — 40s later
  ];
  for (const [provider, waitMs] of startupOrder) {
    delay(waitMs).then(() => runIngestion(provider)).catch(console.error);
  }
  // Run analytics pipeline 60s after startup (after enhanced RSS completes)
  delay(60_000).then(() => runAnalyticsPipeline()).catch(console.error);

  console.log("Ingestion scheduler started (RSS: 5min, GDELT: 15min, FIRMS: 30min, USGS: 30min, Enhanced-RSS: 5min).");
}
