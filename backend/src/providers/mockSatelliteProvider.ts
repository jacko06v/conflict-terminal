/**
 * Mock Satellite / Thermal Hotspot Provider
 *
 * Simulates ingesting thermal anomaly data similar to NASA FIRMS or
 * commercial satellite fire/heat detection products.
 *
 * In a real integration, this would pull from:
 *  - NASA FIRMS API (https://firms.modaps.eosdis.nasa.gov/)
 *  - Maxar, Planet Labs, Airbus commercial imagery APIs
 *
 * Each hotspot has an associated fire radiative power (FRP) and confidence.
 * Low FRP + isolated = likely agricultural burn (filtered).
 * High FRP + proximate to conflict area = high-interest thermal event.
 */
import { v4 as uuidv4 } from "uuid";
import { RawItem } from "../types";
import { BaseProvider } from "./base";

// Approximate bounding boxes for the Middle East conflict zone of interest
const HOTSPOT_AREAS = [
  { name: "Northern Gaza", minLat: 31.4, maxLat: 31.6, minLon: 34.3, maxLon: 34.6, country: "Gaza" },
  { name: "South Lebanon", minLat: 33.0, maxLat: 33.5, minLon: 35.0, maxLon: 35.9, country: "Lebanon" },
  { name: "Syrian border", minLat: 34.3, maxLat: 35.5, minLon: 38.0, maxLon: 41.5, country: "Syria" },
  { name: "Khuzestan Plains", minLat: 30.5, maxLat: 32.0, minLon: 47.5, maxLon: 49.5, country: "Iran" },
  { name: "Sanaa outskirts", minLat: 15.2, maxLat: 15.6, minLon: 44.0, maxLon: 44.5, country: "Yemen" },
];

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class MockSatelliteProvider extends BaseProvider {
  readonly name = "mock-satellite";

  async fetchRawItems(): Promise<RawItem[]> {
    // Emit 0-2 thermal hotspot events per run (less frequent than news)
    const shouldEmit = Math.random() < 0.6;
    if (!shouldEmit) return [];

    const area = this.randomFrom(HOTSPOT_AREAS);
    const lat = randomInRange(area.minLat, area.maxLat);
    const lon = randomInRange(area.minLon, area.maxLon);

    // FRP: Fire Radiative Power in MW. Above 20 = significant.
    const frp = this.randomBetween(15, 80);
    const isHighIntensity = frp > 35;

    const item: RawItem = {
      externalId: `sat-hotspot-${uuidv4()}`,
      title: `[DEMO] Thermal anomaly detected, ${area.name}`,
      summary: `Satellite thermal sensor detected ${isHighIntensity ? "high-intensity" : "moderate"} heat signature (FRP: ${frp} MW) in ${area.name}. Consistent with ${isHighIntensity ? "active fire or ordnance detonation" : "vehicle or equipment fire"}.`,
      eventType: "fire",
      severity: isHighIntensity ? 3 : 2,
      latitude: lat,
      longitude: lon,
      locationRadiusKm: isHighIntensity ? 2 : 5,
      country: area.country,
      region: area.name,
      occurredAt: this.hoursAgo(this.randomBetween(0, 3)),
      geolocationPrecision: "approximate",
      sources: [
        {
          name: "VIIRS Thermal Sensor",
          sourceType: "satellite",
          reliabilityScore: 82,
          rawText: `VIIRS pass: lat=${lat.toFixed(4)}, lon=${lon.toFixed(4)}, FRP=${frp}MW, confidence=nominal`,
        },
      ],
    };

    return [item];
  }
}
