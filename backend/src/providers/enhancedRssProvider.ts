/**
 * Enhanced RSS provider — uses the full 4-tier feed registry.
 * Extends the original 4-feed provider to ~90 feeds with tier-based
 * credibility scoring and parallel batch fetching.
 *
 * Replaces the original RssProvider while maintaining the same interface.
 */

import { createHash } from "crypto";
import { RawItem } from "../types";
import { BaseProvider } from "./base";
import { lookupLocation, isRelevantToRegion, IMPORTANCE_RADIUS } from "../utils/gazetteer";
import { classifyText, isConflictRelevant, reliabilityForDomain } from "../utils/classifier";
import { FEED_REGISTRY, getSourceTier, type FeedEntry } from "../data/feeds";
import { classifyThreatLevel, type ThreatClassification } from "../utils/threatClassifier";
import { createCircuitBreaker } from "../utils/circuitBreaker";

// Per-feed circuit breaker
const feedBreakers = new Map<string, ReturnType<typeof createCircuitBreaker>>();

function getBreaker(feedName: string) {
  let cb = feedBreakers.get(feedName);
  if (!cb) {
    cb = createCircuitBreaker<RssItem[]>({
      name: `rss-${feedName}`,
      maxFailures: 3,
      cooldownMs: 5 * 60 * 1000,
      cacheTtlMs: 3 * 60 * 1000,
    });
    feedBreakers.set(feedName, cb);
  }
  return cb;
}

// ── RSS XML parser (same as original, no deps) ─────────────────────────────

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, "si");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = stripHtml(extractTag(block, "title"));
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const pubDate = extractTag(block, "pubDate");
    const description = stripHtml(
      extractTag(block, "description") || extractTag(block, "content:encoded") || ""
    );
    if (title && link) items.push({ title, link, pubDate, description });
  }
  return items;
}

function parseAtom(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[1];
    const title = stripHtml(extractTag(block, "title"));
    // Atom link: <link href="..." />
    const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/);
    const link = linkMatch ? linkMatch[1] : "";
    const pubDate = extractTag(block, "published") || extractTag(block, "updated");
    const description = stripHtml(extractTag(block, "summary") || extractTag(block, "content") || "");
    if (title && link) items.push({ title, link, pubDate, description });
  }
  return items;
}

function parseFeedXml(xml: string): RssItem[] {
  // Try RSS first, then Atom
  const rssItems = parseRss(xml);
  if (rssItems.length > 0) return rssItems;
  return parseAtom(xml);
}

async function fetchFeed(feed: FeedEntry): Promise<RssItem[]> {
  const cb = getBreaker(feed.name);
  return cb.execute(async () => {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "ConflictTerminal/1.0 (research dashboard)",
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseFeedXml(xml);
  }, []);
}

function parsePubDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ── Extended article metadata (for downstream services) ─────────────────────

export interface EnrichedArticle {
  raw: RawItem;
  feedName: string;
  tier: number;
  threat: ThreatClassification;
  link: string;
  // Convenience accessors (duplicated from raw for downstream services)
  externalId: string;
  title: string;
  source: string;
  publishedAt: number;
  latitude?: number;
  longitude?: number;
  country?: string;
}

// Shared state for downstream consumers (trending keywords, breaking news)
let lastBatchArticles: EnrichedArticle[] = [];

export function getLastBatchArticles(): EnrichedArticle[] {
  return lastBatchArticles;
}

// ── Provider ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 15; // fetch 15 feeds concurrently

export class EnhancedRssProvider extends BaseProvider {
  readonly name = "rss-feeds-enhanced";

  async fetchRawItems(): Promise<RawItem[]> {
    const allItems: RawItem[] = [];
    const enriched: EnrichedArticle[] = [];
    const seenUrls = new Set<string>();

    // Batch feeds to avoid overloading
    for (let i = 0; i < FEED_REGISTRY.length; i += BATCH_SIZE) {
      const batch = FEED_REGISTRY.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(fetchFeed));

      for (let j = 0; j < batch.length; j++) {
        const feed = batch[j];
        const result = results[j];
        if (result.status !== "fulfilled") continue;

        for (const article of result.value) {
          if (seenUrls.has(article.link)) continue;
          seenUrls.add(article.link);

          const fullText = `${article.title} ${article.description}`.slice(0, 500);

          // Pre-filter: conflict relevance
          if (!isConflictRelevant(article.title)) continue;
          if (!isRelevantToRegion(fullText)) continue;

          // Geolocate
          const location =
            lookupLocation(article.title) ?? lookupLocation(article.description);
          if (!location) continue;

          // Classify both event type and threat level
          const domain = extractDomain(feed.url);
          const { eventType, severity, confidenceBonus } = classifyText(fullText, domain);
          const threat = classifyThreatLevel(article.title);

          // Tier-adjusted confidence
          const reliability = reliabilityForDomain(domain);
          const tierBonus = feed.tier === 1 ? 10 : feed.tier === 2 ? 5 : 0;
          const baseConf = Math.round(reliability * 0.55);
          const finalConf = Math.max(15, Math.min(90, baseConf + confidenceBonus + tierBonus));

          const verificationStatus =
            finalConf >= 70 ? "partial" as const : "unverified" as const;

          const precision =
            location.importance === 3 ? "approximate" as const
            : location.importance === 2 ? "approximate" as const
            : "area" as const;

          const externalId = `rss-${createHash("md5")
            .update(article.link)
            .digest("hex")
            .slice(0, 12)}`;

          const rawItem: RawItem = {
            externalId,
            title: article.title,
            summary: article.description
              ? article.description.slice(0, 300)
              : `Reported by ${feed.name}.`,
            eventType,
            severity,
            latitude: location.lat,
            longitude: location.lon,
            locationRadiusKm: IMPORTANCE_RADIUS[location.importance],
            country: location.country,
            region: location.region,
            occurredAt: parsePubDate(article.pubDate),
            geolocationPrecision: precision,
            sources: [
              {
                name: feed.name,
                sourceType: "news",
                url: article.link,
                publisher: feed.name,
                publishedAt: parsePubDate(article.pubDate),
                reliabilityScore: reliability,
                rawText: article.title,
              },
            ],
          };

          allItems.push(rawItem);
          enriched.push({
            raw: rawItem,
            feedName: feed.name,
            tier: feed.tier,
            threat,
            link: article.link,
            externalId,
            title: article.title,
            source: feed.name,
            publishedAt: parsePubDate(article.pubDate).getTime(),
            latitude: location.lat,
            longitude: location.lon,
            country: location.country,
          });
        }
      }
    }

    // Store for downstream services
    lastBatchArticles = enriched;

    return allItems;
  }
}

function extractDomain(url: string): string {
  try {
    // Handle Google News RSS URLs
    const siteMatch = url.match(/site:([^\s+&]+)/);
    if (siteMatch) return siteMatch[1].replace(/^www\./, "");
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
