/**
 * Mock News Provider
 *
 * Simulates ingesting conflict event reports from news feeds / OSINT aggregators.
 * In a real integration, this would call APIs like LiveUAMap, Bellingcat, etc.
 *
 * Generates 1-3 synthetic events per run, with realistic Middle East locations.
 */
import { v4 as uuidv4 } from "uuid";
import { RawItem, EventType } from "../types";
import { BaseProvider } from "./base";

const NEWS_TEMPLATES = [
  {
    title: "[DEMO] Explosion reported in {city}",
    summary: "Multiple witnesses report an explosion in the {city} area. Emergency services responding.",
    event_type: "explosion" as EventType,
    severity: 3,
  },
  {
    title: "[DEMO] Airstrike near {city}",
    summary: "Reports of airstrike activity near {city}. Smoke visible from multiple locations.",
    event_type: "airstrike" as EventType,
    severity: 4,
  },
  {
    title: "[DEMO] Missile launch detected, {region}",
    summary: "Surveillance assets detect ballistic activity over {region}. Trajectory analysis ongoing.",
    event_type: "missile" as EventType,
    severity: 4,
  },
  {
    title: "[DEMO] Drone activity, {city}",
    summary: "Unidentified UAVs tracked over {city}. Air defense on alert.",
    event_type: "drone" as EventType,
    severity: 3,
  },
];

const LOCATIONS = [
  { city: "Tehran", region: "Tehran Province", country: "Iran", lat: 35.6892 + (Math.random() - 0.5) * 0.3, lon: 51.3890 + (Math.random() - 0.5) * 0.3 },
  { city: "Baghdad", region: "Baghdad Governorate", country: "Iraq", lat: 33.3152, lon: 44.3661 },
  { city: "Beirut", region: "Beirut Governorate", country: "Lebanon", lat: 33.8938, lon: 35.5018 },
  { city: "Damascus", region: "Damascus Governorate", country: "Syria", lat: 33.5138, lon: 36.2765 },
  { city: "Sanaa", region: "Sanaa Governorate", country: "Yemen", lat: 15.3694, lon: 44.1910 },
  { city: "Gaza City", region: "North Gaza", country: "Gaza", lat: 31.5017, lon: 34.4668 },
  { city: "Isfahan", region: "Isfahan Province", country: "Iran", lat: 32.6539, lon: 51.6660 },
  { city: "Erbil", region: "Kurdistan Region", country: "Iraq", lat: 36.1911, lon: 44.0091 },
];

const NEWS_PUBLISHERS = [
  { name: "OSINT Wire", publisher: "OSINT Wire", reliability_score: 65 },
  { name: "Middle East Monitor", publisher: "ME Monitor", reliability_score: 72 },
  { name: "War Zone Tracker", publisher: "WZ Tracker", reliability_score: 68 },
  { name: "Conflict Alert", publisher: "Conflict Alert", reliability_score: 60 },
];

export class MockNewsProvider extends BaseProvider {
  readonly name = "mock-news";

  async fetchRawItems(): Promise<RawItem[]> {
    const count = this.randomBetween(1, 3);
    const items: RawItem[] = [];

    for (let i = 0; i < count; i++) {
      const location = this.randomFrom(LOCATIONS);
      const template = this.randomFrom(NEWS_TEMPLATES);
      const publisher = this.randomFrom(NEWS_PUBLISHERS);

      const title = template.title
        .replace("{city}", location.city)
        .replace("{region}", location.region);
      const summary = template.summary
        .replace("{city}", location.city)
        .replace("{region}", location.region);

      // Jitter coordinates slightly for realism
      const latJitter = (Math.random() - 0.5) * 0.1;
      const lonJitter = (Math.random() - 0.5) * 0.1;

      items.push({
        externalId: `news-${uuidv4()}`,
        title,
        summary,
        eventType: template.event_type,
        severity: template.severity,
        latitude: location.lat + latJitter,
        longitude: location.lon + lonJitter,
        locationRadiusKm: this.randomBetween(3, 15),
        country: location.country,
        region: location.region,
        city: location.city,
        occurredAt: this.hoursAgo(this.randomBetween(0, 2)),
        geolocationPrecision: "approximate",
        sources: [
          {
            name: publisher.name,
            sourceType: "news",
            publisher: publisher.publisher,
            publishedAt: this.hoursAgo(this.randomBetween(0, 1)),
            reliabilityScore: publisher.reliability_score,
            rawText: `${publisher.name} reports: ${summary}`,
          },
        ],
      });
    }

    return items;
  }
}
