/**
 * X (Twitter) posting provider.
 * Requires X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET in .env
 * Free plan allows 500 tweets/month.
 */

import { TwitterApi } from "twitter-api-v2";
import { Event } from "../types";

const TYPE_EMOJI: Record<string, string> = {
  missile:        "🚀",
  airstrike:      "✈️",
  explosion:      "💥",
  drone:          "🛩️",
  infrastructure: "🏗️",
  troop_movement: "🪖",
  alert:          "⚠️",
};

const SITE_URL = process.env.SITE_URL ?? "https://conflict-terminal.xyz";

function buildClient(): TwitterApi | null {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) return null;
  return new TwitterApi({
    appKey:      X_API_KEY,
    appSecret:   X_API_SECRET,
    accessToken:  X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });
}

// Extract og:image from an article URL (best-effort, 5s timeout)
export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ConflictTerminalBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const url = match?.[1]?.trim();
    return url && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

// Download image bytes for upload
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mime = ct.split(";")[0].trim();
    if (!mime.startsWith("image/")) return null;
    const arr = await res.arrayBuffer();
    return { buffer: Buffer.from(arr), mimeType: mime };
  } catch {
    return null;
  }
}

function formatTweet(event: Event): string {
  const emoji  = TYPE_EMOJI[event.event_type] ?? "📡";
  const type   = event.event_type.toUpperCase().replace("_", " ");
  const loc    = [event.city, event.country].filter(Boolean).join(", ");
  const sevBar = "●".repeat(event.severity) + "○".repeat(5 - event.severity);
  const conf   = Math.round(event.confidence_score);
  const tag    = "#" + (event.country ?? "").replace(/\s+/g, "");

  // URL always counts as 23 chars on X regardless of length
  // Budget: 280 - 23 (url) - 1 (newline before url) = 256 usable chars
  const header   = `${emoji} [${type}] — ${loc}\n`;
  const footer   = `\nSev: ${sevBar} | Confidence: ${conf}%\n${tag} #MiddleEast\n`;
  const budget   = 256 - header.length - footer.length;
  const title    = event.title.length > budget
    ? event.title.slice(0, budget - 1) + "…"
    : event.title;

  return `${header}${title}${footer}${SITE_URL}`;
}

export async function postEvent(event: Event, imageUrl?: string | null): Promise<boolean> {
  const client = buildClient();
  if (!client) {
    console.log("[x] X API keys not set — skipping tweet");
    return false;
  }

  try {
    const text = formatTweet(event);
    let mediaId: string | undefined;

    // Try to upload image (requires Basic plan — silently skip on 402)
    if (imageUrl) {
      const img = await fetchImageBuffer(imageUrl);
      if (img) {
        try {
          mediaId = await client.v1.uploadMedia(img.buffer, { mimeType: img.mimeType });
          console.log(`[x] Image uploaded: ${mediaId}`);
        } catch (err: unknown) {
          const code = (err as { code?: number })?.code;
          if (code === 402) {
            console.log("[x] Media upload not available on free plan — posting text only");
          } else {
            console.warn("[x] Image upload failed:", (err as Error).message);
          }
        }
      }
    }

    // Try v2 first; fall back to v1.1 if app is not enrolled in a Project
    let posted = false;

    // --- Attempt 1: v2 endpoint (requires app in a Project) ---
    try {
      const v2Params = mediaId ? { media: { media_ids: [mediaId] } } : {};
      const result = await client.v2.tweet(text, v2Params);
      console.log(`[x] Tweet posted (v2): ${result.data.id} — "${event.title.slice(0, 60)}"`);
      posted = true;
    } catch (v2Err: any) {
      const reason = v2Err?.data?.reason ?? "";
      if (reason === "client-not-enrolled" || v2Err?.code === 403) {
        console.warn("[x] v2 failed (app not in a Project) — falling back to v1.1");
      } else {
        // Non-enrollment v2 error — still try v1
        console.warn("[x] v2 failed:", v2Err?.message ?? v2Err);
      }
    }

    // --- Attempt 2: v1.1 statuses/update (works without Project) ---
    if (!posted) {
      try {
        const v1Params: Record<string, string> = {};
        if (mediaId) v1Params.media_ids = mediaId;
        const result = await client.v1.tweet(text, v1Params);
        console.log(`[x] Tweet posted (v1): ${result.id_str} — "${event.title.slice(0, 60)}"`);
        posted = true;
      } catch (v1Err: any) {
        console.error("[x] v1.1 also failed:", v1Err?.message ?? v1Err);
        if (v1Err?.code)   console.error("[x]   HTTP code:", v1Err.code);
        if (v1Err?.data)   console.error("[x]   API response:", JSON.stringify(v1Err.data));
        if (v1Err?.errors) console.error("[x]   Errors:", JSON.stringify(v1Err.errors));
      }
    }

    return posted;
  } catch (err: any) {
    console.error("[x] Failed to post tweet:", err?.message ?? err);
    if (err?.code)    console.error("[x]   HTTP code:", err.code);
    if (err?.data)    console.error("[x]   API response:", JSON.stringify(err.data));
    return false;
  }
}

export function xEnabled(): boolean {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  return !!(X_API_KEY && X_API_SECRET && X_ACCESS_TOKEN && X_ACCESS_TOKEN_SECRET);
}
