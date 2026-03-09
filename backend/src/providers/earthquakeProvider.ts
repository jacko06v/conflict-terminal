/**
 * USGS Earthquake provider — fetches real-time seismic data.
 * Source: USGS Earthquake Hazards Program (free, no API key).
 * Returns M2.5+ earthquakes from the past 24h.
 */

import { BaseProvider } from "./base";
import type { RawItem, EventType } from "../types";
import { createCircuitBreaker } from "../utils/circuitBreaker";

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

const cb = createCircuitBreaker<USGSResponse>({
  name: "usgs-earthquake",
  maxFailures: 3,
  cooldownMs: 5 * 60 * 1000,
  cacheTtlMs: 10 * 60 * 1000,
});

const EMPTY_RESPONSE: USGSResponse = {
  type: "FeatureCollection",
  metadata: { generated: 0, url: "", title: "", count: 0 },
  features: [],
};

interface USGSFeature {
  type: "Feature";
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    title: string;
    status: string;
    tsunami: number;
    sig: number;
    type: string;
    alert?: string | null;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number]; // [lon, lat, depth_km]
  };
  id: string;
}

interface USGSResponse {
  type: "FeatureCollection";
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
  features: USGSFeature[];
}

function magnitudeToSeverity(mag: number): number {
  if (mag >= 7.0) return 5;
  if (mag >= 6.0) return 4;
  if (mag >= 5.0) return 3;
  if (mag >= 4.0) return 2;
  return 1;
}

function extractCountry(place: string): string {
  // USGS format: "123km SSE of City, Country" or "City, State"
  const parts = place.split(",");
  const last = parts[parts.length - 1]?.trim();
  if (!last) return "Unknown";

  // Known US state abbreviations
  const usStates =
    /^(AK|AL|AR|AZ|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|PR|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)$/i;
  if (usStates.test(last)) return "United States";

  return last;
}

export class EarthquakeProvider extends BaseProvider {
  readonly name = "usgs-earthquake";

  async fetchRawItems(): Promise<RawItem[]> {
    const data = await cb.execute<USGSResponse>(async () => {
      const res = await fetch(USGS_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`USGS API ${res.status}`);
      return res.json() as Promise<USGSResponse>;
    }, EMPTY_RESPONSE);

    if (!data?.features) return [];

    // Only M4.0+ for ingestion (lower magnitudes are too noisy)
    const significant = data.features.filter(
      (f) => f.properties.mag >= 4.0 && f.properties.type === "earthquake"
    );

    return significant.map((f): RawItem => {
      const [lon, lat, depthKm] = f.geometry.coordinates;
      const { mag, place, time, url, title, tsunami, sig } = f.properties;
      const severity = magnitudeToSeverity(mag);
      const country = extractCountry(place || "");

      const depthInfo = depthKm ? ` Depth: ${depthKm.toFixed(1)}km.` : "";
      const tsunamiInfo = tsunami ? " Tsunami potential." : "";
      const summary = `M${mag.toFixed(1)} earthquake — ${place}.${depthInfo}${tsunamiInfo} Significance: ${sig}.`;

      return {
        externalId: `usgs-${f.id}`,
        title: title || `M${mag.toFixed(1)} Earthquake near ${place}`,
        summary,
        eventType: "alert" as EventType,
        severity,
        latitude: lat,
        longitude: lon,
        locationRadiusKm: mag >= 6 ? 50 : mag >= 5 ? 20 : 10,
        country,
        occurredAt: new Date(time),
        geolocationPrecision: "exact",
        sources: [
          {
            name: "USGS Earthquake Hazards",
            sourceType: "api",
            url,
            publisher: "United States Geological Survey",
            publishedAt: new Date(time),
            reliabilityScore: 95,
            rawText: summary,
          },
        ],
      };
    });
  }
}
