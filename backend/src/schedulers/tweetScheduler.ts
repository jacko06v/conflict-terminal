/**
 * Tweet scheduler:
 * - Normal: every 2.5h posts the most important unposted event from last 24h
 * - Urgent: checks every 5min for new critical events (severity≥4, high confidence)
 *   and posts immediately, skipping the next scheduled post
 *
 * Fetches og:image from the first source URL and attaches it if available.
 */

import fs from "fs";
import path from "path";
import { query } from "../db/client";
import { Event, Source } from "../types";
import { postEvent, fetchOgImage, xEnabled } from "../providers/xProvider";

const NORMAL_INTERVAL_MS  = 2.5 * 60 * 60 * 1000; // 2h30m
const URGENT_POLL_MS      = 5   * 60 * 1000;       // 5min
const URGENT_COOLDOWN_MS  = 30  * 60 * 1000;       // 30min between urgent posts
const URGENT_TYPES        = new Set(["missile", "airstrike", "explosion"]);
const URGENT_MIN_SEVERITY = 4;
const URGENT_MIN_CONF     = 72; // stored as 0–100 integer in DB

const POSTED_IDS_FILE = path.resolve(process.cwd(), "tweeted_ids.json");

function loadPostedIds(): Set<string> {
  try {
    const data = JSON.parse(fs.readFileSync(POSTED_IDS_FILE, "utf8")) as string[];
    return new Set(data);
  } catch {
    return new Set();
  }
}

function savePostedIds(ids: Set<string>) {
  // Keep only the last 2000 to avoid unbounded growth
  const arr = [...ids].slice(-2000);
  fs.writeFileSync(POSTED_IDS_FILE, JSON.stringify(arr));
}

const postedIds   = loadPostedIds();
let lastPostedAt  = 0;
let skipNext      = false;
let urgentLastAt  = 0;

// Fetch the top source URL for an event
async function getSourceUrl(eventId: string): Promise<string | null> {
  const rows = await query<Source>(
    `SELECT s.url FROM sources s
     JOIN event_sources es ON es.source_id = s.id
     WHERE es.event_id = $1 AND s.url IS NOT NULL
     ORDER BY s.reliability_score DESC LIMIT 1`,
    [eventId]
  );
  return rows[0]?.url ?? null;
}

// Best candidate for the normal scheduled post (highest severity/confidence, last 24h)
async function getBestUnposted(): Promise<Event | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await query<Event>(
    `SELECT * FROM events
     WHERE is_active = true
       AND occurred_at >= $1
       AND event_type != 'fire'
     ORDER BY severity DESC, confidence_score DESC
     LIMIT 50`,
    [since]
  );
  return rows.find((e) => !postedIds.has(e.id)) ?? null;
}

// Urgent: new critical events ingested in the last poll window
async function getUrgentEvent(): Promise<Event | null> {
  const since = new Date(Date.now() - URGENT_POLL_MS * 2).toISOString();
  const rows = await query<Event>(
    `SELECT * FROM events
     WHERE is_active = true
       AND first_seen_at >= $1
       AND severity >= $2
       AND confidence_score >= $3
       AND event_type = ANY($4)
     ORDER BY severity DESC, confidence_score DESC
     LIMIT 10`,
    [since, URGENT_MIN_SEVERITY, URGENT_MIN_CONF, Array.from(URGENT_TYPES)]
  );
  return rows.find((e) => !postedIds.has(e.id)) ?? null;
}

async function tweet(event: Event, label: string) {
  postedIds.add(event.id);
  savePostedIds(postedIds);
  lastPostedAt = Date.now();

  // Try to get an image from the first source article
  const sourceUrl = await getSourceUrl(event.id);
  const imageUrl  = sourceUrl ? await fetchOgImage(sourceUrl) : null;

  console.log(`[x] ${label}: "${event.title.slice(0, 60)}" ${imageUrl ? "📸" : ""}`);
  await postEvent(event, imageUrl);
}

async function runUrgentCheck() {
  if (!xEnabled()) return;

  const now = Date.now();
  if (now - urgentLastAt < URGENT_COOLDOWN_MS) return;

  const event = await getUrgentEvent();
  if (!event) return;

  urgentLastAt = now;
  skipNext = true; // skip the next scheduled post to preserve rate limit
  await tweet(event, "URGENT");
}

async function runScheduled() {
  if (!xEnabled()) return;

  if (skipNext) {
    skipNext = false;
    console.log("[x] Skipping scheduled post (urgent was sent recently)");
    return;
  }

  const event = await getBestUnposted();
  if (!event) {
    console.log("[x] No unposted events to tweet");
    return;
  }

  await tweet(event, "SCHEDULED");
}

export function startTweetScheduler() {
  if (!xEnabled()) {
    console.log("[x] X API keys not set — tweet scheduler disabled");
    return;
  }

  console.log("[x] Tweet scheduler started (normal: 2.5h, urgent poll: 5min)");

  // Run once at startup after 1min (let ingestion warm up first)
  setTimeout(() => runScheduled().catch(() => {}), 60_000);

  // Normal scheduled post every 2.5h
  setInterval(() => runScheduled().catch(() => {}), NORMAL_INTERVAL_MS);

  // Urgent poll every 5min
  setInterval(() => runUrgentCheck().catch(() => {}), URGENT_POLL_MS);
}
