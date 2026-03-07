/**
 * Historical backfill script — run once.
 * Fetches GDELT articles from 2026-02-28 00:00 UTC to now,
 * in 2-hour windows (max 250 records each). Deduplication is
 * handled by ingestRawItem via external_id (URL hash).
 *
 * Run: npx tsx scripts/backfill.ts
 */

import "dotenv/config";
import { createHash } from "crypto";
import { pool } from "../src/db/client";
import { ingestRawItem } from "../src/services/eventService";
import {
  lookupLocation,
  isRelevantToRegion,
  IMPORTANCE_RADIUS,
} from "../src/utils/gazetteer";
import {
  classifyText,
  isConflictRelevant,
  reliabilityForDomain,
} from "../src/utils/classifier";
import { RawItem } from "../src/types";

// ── Config ────────────────────────────────────────────────────────────────────

const START = new Date("2026-02-28T00:00:00Z");
const END   = new Date(); // now
const WINDOW_MS     = 2 * 60 * 60 * 1000; // 2-hour base windows
const MIN_WINDOW_MS = 30 * 60 * 1000;     // minimum split size: 30 min (GDELT rejects < ~15 min)
const MAX_RECORDS   = 250;
const DELAY_MS      = 2_000; // 2 s between requests (be polite)

const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc";
const QUERY =
  "(airstrike OR missile OR drone OR bombing OR blast OR attack OR strike) " +
  "(iran OR iraq OR syria OR lebanon OR yemen OR gaza OR israel " +
  "OR houthi OR hezbollah OR irgc OR dubai OR egypt OR hormuz)";

// ── Helpers ───────────────────────────────────────────────────────────────────

function gdeltDate(d: Date): string {
  // YYYYMMDDHHMMSS
  return d.toISOString().replace(/[-T:]/g, "").slice(0, 14);
}

function parseGdeltDate(s: string): Date {
  const y  = parseInt(s.slice(0, 4));
  const mo = parseInt(s.slice(4, 6)) - 1;
  const d  = parseInt(s.slice(6, 8));
  const h  = parseInt(s.slice(9, 11));
  const mi = parseInt(s.slice(11, 13));
  return new Date(Date.UTC(y, mo, d, h, mi));
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  language: string;
}

async function fetchWindow(from: Date, to: Date): Promise<GdeltArticle[]> {
  const url = new URL(GDELT_DOC_API);
  url.searchParams.set("query", QUERY);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(MAX_RECORDS));
  url.searchParams.set("startdatetime", gdeltDate(from));
  url.searchParams.set("enddatetime",   gdeltDate(to));
  url.searchParams.set("sort", "DateDesc");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20_000),
        headers: { "User-Agent": "ConflictTerminal/1.0 (research backfill)" },
      });

      if (res.status === 429) {
        const wait = 15_000 * (attempt + 1);
        console.warn(`  [gdelt] 429 rate limited, waiting ${wait / 1000}s...`);
        await delay(wait);
        continue;
      }

      if (!res.ok) {
        console.warn(`  [gdelt] HTTP ${res.status} for window ${gdeltDate(from)}–${gdeltDate(to)}`);
        return [];
      }

      const text = await res.text();
      let data: { articles?: GdeltArticle[] };
      try {
        data = JSON.parse(text);
      } catch {
        console.warn(`  [gdelt] Non-JSON response: ${text.slice(0, 120)}`);
        return [];
      }
      return data.articles ?? [];
    } catch (err) {
      console.warn(`  [gdelt] fetch error (attempt ${attempt + 1}):`, (err as Error).message);
      await delay(5_000);
    }
  }
  return [];
}

function articleToRawItem(article: GdeltArticle): RawItem | null {
  if (article.language !== "English") return null;

  const text = article.title;
  if (!isRelevantToRegion(text)) return null;
  if (!isConflictRelevant(text))  return null;

  const location = lookupLocation(text);
  if (!location) return null;

  const { eventType, severity, confidenceBonus } = classifyText(text, article.domain);
  const reliability    = reliabilityForDomain(article.domain);
  const baseConfidence = Math.round(reliability * 0.6);
  const finalConfidence = Math.max(15, Math.min(85, baseConfidence + confidenceBonus));
  const verificationStatus = finalConfidence >= 75 ? "partial" : "unverified";
  const precision =
    location.importance === 3 ? "approximate"
    : "area"; // importance 1 & 2 → area (city match) or country-level fallback

  const externalId = `gdelt-${createHash("md5").update(article.url).digest("hex").slice(0, 12)}`;

  return {
    externalId,
    title:     article.title,
    summary:   `Reported by ${article.domain}. Historical backfill via GDELT.`,
    eventType,
    severity,
    latitude:           location.lat,
    longitude:          location.lon,
    locationRadiusKm:   IMPORTANCE_RADIUS[location.importance],
    country:            location.country,
    region:             location.region,
    city:               location.importance === 1 ? location.names[0] : undefined,
    occurredAt:         parseGdeltDate(article.seendate),
    geolocationPrecision: precision,
    sources: [{
      name:            article.domain,
      sourceType:      "news",
      url:             article.url,
      publisher:       article.domain,
      publishedAt:     parseGdeltDate(article.seendate),
      reliabilityScore: reliability,
      rawText:          article.title,
    }],
  };
}

// ── Ingest a list of articles, return {created, updated} ─────────────────────

async function ingestArticles(articles: GdeltArticle[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  for (const article of articles) {
    const item = articleToRawItem(article);
    if (!item) continue;
    try {
      const { isNew } = await ingestRawItem(item);
      if (isNew) created++;
      else       updated++;
    } catch (err) {
      console.warn(`\n  ingest error: "${article.title.slice(0, 60)}":`, (err as Error).message);
    }
  }
  return { created, updated };
}

// ── Recursively fetch a window, splitting if it hits the 250-article cap ─────

async function fetchAndIngest(
  from: Date,
  to: Date,
  depth = 0
): Promise<{ fetched: number; created: number; updated: number; requests: number }> {
  const articles = await fetchWindow(from, to);
  await delay(DELAY_MS);

  // If we hit the hard cap AND the window is still splittable, divide in two
  if (articles.length === MAX_RECORDS && (to.getTime() - from.getTime()) > MIN_WINDOW_MS * 2) {
    const mid = new Date((from.getTime() + to.getTime()) / 2);
    const indent = "  ".repeat(depth + 1);
    process.stdout.write(`\n${indent}↳ capped at 250, splitting [${gdeltDate(from)}–${gdeltDate(mid)}] and [${gdeltDate(mid)}–${gdeltDate(to)}]`);

    const left  = await fetchAndIngest(from, mid, depth + 1);
    const right = await fetchAndIngest(mid,  to,  depth + 1);
    return {
      fetched:  left.fetched  + right.fetched,
      created:  left.created  + right.created,
      updated:  left.updated  + right.updated,
      requests: left.requests + right.requests + 1,
    };
  }

  const { created, updated } = await ingestArticles(articles);
  return { fetched: articles.length, created, updated, requests: 1 };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const totalMs      = END.getTime() - START.getTime();
  const totalWindows = Math.ceil(totalMs / WINDOW_MS);

  console.log(`Backfill: ${START.toISOString()} → ${END.toISOString()}`);
  console.log(`Base windows: ${totalWindows} × 2h  |  auto-splits when capped at ${MAX_RECORDS}`);
  console.log("");

  let totalFetched   = 0;
  let totalCreated   = 0;
  let totalUpdated   = 0;
  let totalRequests  = 0;
  let windowIdx      = 0;

  for (let t = START.getTime(); t < END.getTime(); t += WINDOW_MS) {
    windowIdx++;
    const from = new Date(t);
    const to   = new Date(Math.min(t + WINDOW_MS, END.getTime()));

    process.stdout.write(
      `[${String(windowIdx).padStart(3)}/${totalWindows}] ${gdeltDate(from)}–${gdeltDate(to)} ... `
    );

    const { fetched, created, updated, requests } = await fetchAndIngest(from, to);

    totalFetched  += fetched;
    totalCreated  += created;
    totalUpdated  += updated;
    totalRequests += requests;

    console.log(`fetched=${fetched} new=${created} updated=${updated}${requests > 1 ? ` (${requests} requests)` : ""}`);
  }

  console.log("");
  console.log("═".repeat(60));
  console.log(`Done. fetched=${totalFetched}  new=${totalCreated}  updated=${totalUpdated}  requests=${totalRequests}`);
  console.log("═".repeat(60));

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end().finally(() => process.exit(1));
});
