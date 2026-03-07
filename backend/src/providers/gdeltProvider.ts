/**
 * GDELT DOC 2.0 Provider
 *
 * Fetches news articles from the GDELT Document API — a free, public API
 * that indexes millions of news articles in near real-time.
 * No API key required.
 *
 * Pipeline:
 *  1. Query GDELT for conflict-related articles in the Middle East
 *  2. Filter by region relevance (gazetteer pre-check)
 *  3. Classify event type from title + description (keyword classifier)
 *  4. Geolocate from article text (gazetteer lookup)
 *  5. Emit as RawItem for the ingestion service
 *
 * Deduplication: article URL hash used as external_id.
 * GDELT updates every 15 minutes; we query every 10 minutes.
 */

import { createHash } from "crypto";
import { RawItem } from "../types";
import { BaseProvider } from "./base";
import { lookupLocation, isRelevantToRegion, IMPORTANCE_RADIUS } from "../utils/gazetteer";
import { classifyText, isConflictRelevant, reliabilityForDomain } from "../utils/classifier";

const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";

// Conflict + broader Middle East / shipping lanes query
// Keep under ~200 chars — GDELT rejects longer queries with a plain-text error
const QUERY =
  "(airstrike OR missile OR drone OR bombing OR blast OR attack OR strike) " +
  "(iran OR iraq OR syria OR lebanon OR yemen OR gaza OR israel " +
  "OR houthi OR hezbollah OR irgc OR dubai OR egypt OR hormuz)";

const TIMESPAN = "15m"; // look back 15 minutes per run
const MAX_RECORDS = 25;

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string; // "20240307T140000Z"
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

function parseGdeltDate(s: string): Date {
  // Format: 20240307T140000Z
  const y = parseInt(s.slice(0, 4));
  const mo = parseInt(s.slice(4, 6)) - 1;
  const d = parseInt(s.slice(6, 8));
  const h = parseInt(s.slice(9, 11));
  const mi = parseInt(s.slice(11, 13));
  return new Date(Date.UTC(y, mo, d, h, mi));
}

export class GdeltProvider extends BaseProvider {
  readonly name = "gdelt";

  async fetchRawItems(): Promise<RawItem[]> {
    const url = new URL(GDELT_DOC_API);
    url.searchParams.set("query", QUERY);
    url.searchParams.set("mode", "artlist");
    url.searchParams.set("format", "json");
    url.searchParams.set("maxrecords", String(MAX_RECORDS));
    url.searchParams.set("timespan", TIMESPAN);
    url.searchParams.set("sort", "DateDesc");

    let data: GdeltResponse;
    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "ConflictTerminal/1.0 (research dashboard)" },
      });
      if (res.status === 429) {
        // Rate limited — back off and retry once after 12 seconds
        console.warn("[gdelt] Rate limited (429), retrying in 12s...");
        await new Promise((r) => setTimeout(r, 12_000));
        const retry = await fetch(url.toString(), {
          signal: AbortSignal.timeout(15_000),
          headers: { "User-Agent": "ConflictTerminal/1.0 (research dashboard)" },
        });
        if (!retry.ok) {
          console.warn(`[gdelt] Retry failed (${retry.status}), skipping this run`);
          return [];
        }
        data = (await retry.json()) as GdeltResponse;
      } else if (!res.ok) {
        console.warn(`[gdelt] API returned ${res.status}`);
        return [];
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text) as GdeltResponse;
        } catch {
          console.warn("[gdelt] Non-JSON response:", text.slice(0, 120));
          return [];
        }
      }
    } catch (err) {
      console.warn("[gdelt] Fetch failed:", (err as Error).message);
      return [];
    }

    if (!data.articles?.length) return [];

    const items: RawItem[] = [];

    for (const article of data.articles) {
      // English only for better keyword matching
      if (article.language !== "English") continue;

      const text = `${article.title}`;

      // Pre-filters
      if (!isRelevantToRegion(text)) continue;
      if (!isConflictRelevant(text)) continue;

      // Geolocate from title text
      const location = lookupLocation(text);
      if (!location) continue; // skip articles with no identifiable location

      // Classify event type
      const { eventType, severity, confidenceBonus } =
        classifyText(text, article.domain);

      // Build confidence score
      const reliability = reliabilityForDomain(article.domain);
      const baseConfidence = Math.round(reliability * 0.6); // single source, so scale down
      const finalConfidence = Math.max(
        15,
        Math.min(85, baseConfidence + confidenceBonus)
      );

      const verificationStatus =
        finalConfidence >= 75 ? "partial" : "unverified";

      // Precision based on location importance
      const precision =
        location.importance === 3 ? "approximate"
        : location.importance === 2 ? "approximate"
        : "area";

      const externalId = `gdelt-${createHash("md5")
        .update(article.url)
        .digest("hex")
        .slice(0, 12)}`;

      items.push({
        externalId,
        title: article.title,
        summary: `Reported by ${article.domain}. Automated classification from GDELT news index.`,
        eventType,
        severity,
        latitude: location.lat,
        longitude: location.lon,
        locationRadiusKm: IMPORTANCE_RADIUS[location.importance],
        country: location.country,
        region: location.region,
        city: location.importance === 1 ? location.names[0] : undefined,
        occurredAt: parseGdeltDate(article.seendate),
        geolocationPrecision: precision,
        sources: [
          {
            name: article.domain,
            sourceType: "news",
            url: article.url,
            publisher: article.domain,
            publishedAt: parseGdeltDate(article.seendate),
            reliabilityScore: reliability,
            rawText: article.title,
          },
        ],
      });
    }

    return items;
  }
}
