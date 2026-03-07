/**
 * RSS News Provider
 *
 * Fetches articles from conflict-focused RSS feeds and classifies them
 * using the keyword classifier + gazetteer pipeline.
 *
 * Feeds (all free, no auth):
 *  - Al Jazeera English (all news)
 *  - BBC Middle East
 *  - Times of Israel
 *  - Middle East Eye
 *
 * Pipeline per article:
 *  1. Fetch RSS feed (XML)
 *  2. Parse items (title, link, pubDate, description)
 *  3. Pre-filter: must be conflict-relevant AND region-relevant
 *  4. Keyword classify → eventType + severity
 *  5. Gazetteer lookup → location + coordinates
 *  6. Emit as RawItem
 *
 * Deduplication: SHA-256 of article URL → external_id
 */

import { createHash } from "crypto";
import { RawItem } from "../types";
import { BaseProvider } from "./base";
import { lookupLocation, isRelevantToRegion, IMPORTANCE_RADIUS } from "../utils/gazetteer";
import { classifyText, isConflictRelevant, reliabilityForDomain } from "../utils/classifier";

interface FeedConfig {
  url: string;
  domain: string;
  label: string;
}

const FEEDS: FeedConfig[] = [
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    domain: "aljazeera.com",
    label: "Al Jazeera English",
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    domain: "bbc.com",
    label: "BBC Middle East",
  },
  {
    url: "https://www.timesofisrael.com/feed/",
    domain: "timesofisrael.com",
    label: "Times of Israel",
  },
  {
    url: "https://www.middleeasteye.net/rss",
    domain: "middleeasteye.net",
    label: "Middle East Eye",
  },
];

// ── Minimal RSS XML parser (no dependencies) ──────────────────────────────────

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function extractTag(xml: string, tag: string): string {
  // Handles both <tag>value</tag> and CDATA
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, "si");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // Split on <item> tags
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
    if (title && link) {
      items.push({ title, link, pubDate, description });
    }
  }
  return items;
}

async function fetchFeed(feed: FeedConfig): Promise<RssItem[]> {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "ConflictTerminal/1.0 (research dashboard)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) {
      console.warn(`[rss] ${feed.label}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseRss(xml);
  } catch (err) {
    console.warn(`[rss] ${feed.label}: ${(err as Error).message}`);
    return [];
  }
}

function parsePubDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class RssProvider extends BaseProvider {
  readonly name = "rss-feeds";

  async fetchRawItems(): Promise<RawItem[]> {
    // Fetch all feeds in parallel
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));

    const items: RawItem[] = [];
    const seenUrls = new Set<string>();

    for (let fi = 0; fi < FEEDS.length; fi++) {
      const feed = FEEDS[fi];
      const result = results[fi];
      if (result.status !== "fulfilled") continue;

      for (const article of result.value) {
        // Deduplicate within this run by URL
        if (seenUrls.has(article.link)) continue;
        seenUrls.add(article.link);

        // Combine title + description for classification
        const fullText = `${article.title} ${article.description}`.slice(0, 500);

        // Pre-filters: must be about a conflict AND our region
        if (!isConflictRelevant(article.title)) continue;
        if (!isRelevantToRegion(fullText)) continue;

        // Geolocate: try title first (usually more precise), then description
        const location =
          lookupLocation(article.title) ?? lookupLocation(article.description);
        if (!location) continue;

        // Classify
        const { eventType, severity, confidenceBonus } = classifyText(
          fullText,
          feed.domain
        );

        // Confidence
        const reliability = reliabilityForDomain(feed.domain);
        const baseConf = Math.round(reliability * 0.55); // single source discount
        const finalConf = Math.max(15, Math.min(82, baseConf + confidenceBonus));

        const verificationStatus = finalConf >= 70 ? "partial" : "unverified";

        const precision =
          location.importance === 3 ? "approximate"
          : location.importance === 2 ? "approximate"
          : "area";

        const externalId = `rss-${createHash("md5")
          .update(article.link)
          .digest("hex")
          .slice(0, 12)}`;

        items.push({
          externalId,
          title: article.title,
          summary: article.description
            ? article.description.slice(0, 300)
            : `Reported by ${feed.label}.`,
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
              name: feed.label,
              sourceType: "news",
              url: article.link,
              publisher: feed.label,
              publishedAt: parsePubDate(article.pubDate),
              reliabilityScore: reliability,
              rawText: article.title,
            },
          ],
        });
      }
    }

    return items;
  }
}
