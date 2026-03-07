/**
 * NASA FIRMS (Fire Information for Resource Management System) Provider
 *
 * Fetches real satellite thermal anomaly data from NASA's VIIRS instrument.
 * FIRMS detects heat signatures from space — fires, large explosions, burning
 * infrastructure — and is widely used in OSINT for conflict monitoring.
 *
 * API: https://firms.modaps.eosdis.nasa.gov/api/area/
 * Free API key: https://firms.modaps.eosdis.nasa.gov/api/area/
 *
 * Requires env var: FIRMS_MAP_KEY
 * If not set, this provider is silently skipped.
 *
 * Coverage area: Middle East bounding box
 *   MinLon=25, MinLat=12, MaxLon=65, MaxLat=42
 *
 * Filtering logic:
 *  - Confidence: only "high" or "nominal" VIIRS confidence
 *  - FRP (Fire Radiative Power): >= 20 MW (filters agricultural burns)
 *  - Location: must fall within our gazetteer region of interest
 *
 * We cannot distinguish a conflict fire from a wildfire purely from FIRMS data.
 * Events are labeled "fire" type with low-medium confidence unless near a
 * known conflict zone (future enhancement: cross-reference with recent events).
 */

import { createHash } from "crypto";
import { RawItem } from "../types";
import { BaseProvider } from "./base";
import { lookupLocation } from "../utils/gazetteer";

const FIRMS_API_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

// Middle East bounding box: approximately covers Iran, Iraq, Syria,
// Lebanon, Israel, Yemen, Gulf region
const BBOX = "25,12,65,42";

// Look back 1 day per run (FIRMS NRT data has ~3h latency)
const DAYS = 1;

// FRP threshold to filter agricultural / low-intensity burns
const MIN_FRP_MW = 20;

interface FirmsRow {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  acq_date: string;   // "2024-03-07"
  acq_time: string;   // "1234" = 12:34 UTC
  confidence: string; // "high" | "nominal" | "low"
  frp: number;        // Fire Radiative Power in MW
  daynight: string;   // "D" | "N"
}

function parseFirmsCsv(csv: string): FirmsRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: FirmsRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < headers.length) continue;

    const get = (field: string) => cols[headers.indexOf(field)]?.trim() ?? "";

    const frp = parseFloat(get("frp"));
    const lat = parseFloat(get("latitude"));
    const lon = parseFloat(get("longitude"));

    if (isNaN(frp) || isNaN(lat) || isNaN(lon)) continue;

    rows.push({
      latitude: lat,
      longitude: lon,
      bright_ti4: parseFloat(get("bright_ti4") || "0"),
      acq_date: get("acq_date"),
      acq_time: get("acq_time").padStart(4, "0"),
      confidence: get("confidence"),
      frp,
      daynight: get("daynight"),
    });
  }

  return rows;
}

function firmsDateToDate(date: string, time: string): Date {
  // date: "2024-03-07", time: "1234"
  const h = time.slice(0, 2);
  const m = time.slice(2, 4);
  return new Date(`${date}T${h}:${m}:00Z`);
}

function frpToSeverity(frp: number): number {
  if (frp >= 150) return 4;
  if (frp >= 80) return 3;
  if (frp >= 40) return 2;
  return 1;
}

function frpToConfidence(frp: number, viirs_confidence: string): number {
  // Start from FRP signal
  let base = frp >= 80 ? 60 : frp >= 40 ? 50 : 40;
  // VIIRS confidence level
  if (viirs_confidence === "high") base += 15;
  else if (viirs_confidence === "nominal") base += 5;
  else base -= 10; // low
  return Math.min(80, base);
}

export class FirmsProvider extends BaseProvider {
  readonly name = "firms-satellite";

  private readonly mapKey: string | null;

  constructor() {
    super();
    this.mapKey = process.env.FIRMS_MAP_KEY ?? null;
  }

  async fetchRawItems(): Promise<RawItem[]> {
    if (!this.mapKey) {
      // Silently skip if no key configured
      return [];
    }

    const url = `${FIRMS_API_BASE}/${this.mapKey}/VIIRS_SNPP_NRT/${BBOX}/${DAYS}`;

    let csv: string;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { "User-Agent": "ConflictTerminal/1.0 (research dashboard)" },
      });
      if (!res.ok) {
        console.warn(`[firms] API returned ${res.status}`);
        return [];
      }
      csv = await res.text();
    } catch (err) {
      console.warn("[firms] Fetch failed:", (err as Error).message);
      return [];
    }

    const rows = parseFirmsCsv(csv);
    if (rows.length === 0) return [];

    const items: RawItem[] = [];

    for (const row of rows) {
      // Filter low-intensity / low-confidence detections
      if (row.frp < MIN_FRP_MW) continue;
      if (row.confidence === "low") continue;

      // Attempt gazetteer lookup to get country/region
      // Build a synthetic text from coordinates — we'll use lat/lon to find
      // the nearest named location via a simple country bounding box check
      const location = nearestLocation(row.latitude, row.longitude);
      if (!location) continue; // outside our region of interest

      const occurredAt = firmsDateToDate(row.acq_date, row.acq_time);
      const externalId = `firms-${createHash("md5")
        .update(`${row.latitude.toFixed(3)}_${row.longitude.toFixed(3)}_${row.acq_date}_${row.acq_time}`)
        .digest("hex")
        .slice(0, 12)}`;

      const confidence = frpToConfidence(row.frp, row.confidence);
      const severity = frpToSeverity(row.frp);

      items.push({
        externalId,
        title: `Satellite thermal anomaly — ${location.country}${location.region ? ", " + location.region : ""}`,
        summary: `VIIRS satellite detected thermal anomaly. FRP: ${row.frp.toFixed(1)} MW. VIIRS confidence: ${row.confidence}. Time: ${row.acq_date} ${row.acq_time.slice(0, 2)}:${row.acq_time.slice(2)}Z. Location is approximate (satellite pixel ~375m).`,
        eventType: "fire",
        severity,
        latitude: row.latitude,
        longitude: row.longitude,
        locationRadiusKm: 2, // VIIRS SNPP pixel = ~375m, but we add buffer
        country: location.country,
        region: location.region,
        occurredAt,
        geolocationPrecision: "exact", // satellite coordinates are precise
        sources: [
          {
            name: "NASA FIRMS VIIRS SNPP NRT",
            sourceType: "satellite",
            url: "https://firms.modaps.eosdis.nasa.gov/",
            publisher: "NASA EOSDIS",
            publishedAt: occurredAt,
            reliabilityScore: 85,
            rawText: `lat=${row.latitude}, lon=${row.longitude}, FRP=${row.frp}MW, confidence=${row.confidence}, bright_ti4=${row.bright_ti4}K`,
          },
        ],
      });
    }

    return items;
  }
}

// Simple lat/lon → country/region using bounding boxes
// Less precise than a full gazetteer reverse geocode, but fast and zero-cost
interface BBox {
  country: string;
  region?: string;
  minLat: number; maxLat: number;
  minLon: number; maxLon: number;
}

const COUNTRY_BOXES: BBox[] = [
  { country: "Gaza", region: "Gaza Strip", minLat: 31.2, maxLat: 31.6, minLon: 34.2, maxLon: 34.6 },
  { country: "Lebanon", minLat: 33.0, maxLat: 34.7, minLon: 35.0, maxLon: 36.7 },
  { country: "Israel", minLat: 29.4, maxLat: 33.4, minLon: 34.2, maxLon: 35.9 },
  { country: "Syria", minLat: 32.3, maxLat: 37.3, minLon: 35.6, maxLon: 42.4 },
  { country: "Iraq", minLat: 29.0, maxLat: 37.4, minLon: 38.8, maxLon: 48.7 },
  { country: "Iran", minLat: 25.0, maxLat: 39.8, minLon: 44.0, maxLon: 63.3 },
  { country: "Yemen", minLat: 12.0, maxLat: 19.0, minLon: 42.0, maxLon: 54.0 },
  { country: "Saudi Arabia", minLat: 16.0, maxLat: 32.2, minLon: 34.5, maxLon: 55.7 },
  { country: "Kuwait", minLat: 28.5, maxLat: 30.2, minLon: 46.5, maxLon: 49.0 },
  { country: "Jordan", minLat: 29.0, maxLat: 33.4, minLon: 34.9, maxLon: 39.3 },
];

function nearestLocation(lat: number, lon: number): BBox | null {
  for (const box of COUNTRY_BOXES) {
    if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
      return box;
    }
  }
  return null;
}
