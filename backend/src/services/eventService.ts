import {
  findEvents,
  findEventById,
  findNearbyEvents,
  CreateEventInput,
  createEvent,
  findEventByExternalId,
  updateEventConfidence,
} from "../repositories/eventRepository";
import { createSource, linkEventSource } from "../repositories/sourceRepository";
import { scoreRawItem, mergeConfidence, deriveVerificationStatus } from "../utils/confidence";
import { Event, EventFilters, EventWithSources, RawItem } from "../types";

export async function getEvents(filters: EventFilters): Promise<Event[]> {
  return findEvents(filters);
}

export async function getEventById(id: string): Promise<EventWithSources | null> {
  return findEventById(id);
}

export async function getNearbyEvents(
  latitude: number,
  longitude: number,
  radiusKm: number,
  excludeId: string
): Promise<Event[]> {
  return findNearbyEvents(latitude, longitude, radiusKm, excludeId);
}

/**
 * Ingest a normalized RawItem: deduplicate by external_id, score confidence,
 * create or update event, link sources.
 * Returns { event, isNew }.
 */
export async function ingestRawItem(
  item: RawItem
): Promise<{ event: Event; isNew: boolean }> {
  // 1. Score confidence
  const { confidenceScore, verificationStatus } = scoreRawItem(item);

  // 2. Check for duplicate by external_id
  if (item.externalId) {
    const existing = await findEventByExternalId(item.externalId);
    if (existing) {
      // Upgrade confidence if new sources corroborate
      const sourceWeights = item.sources.map((s) => ({
        sourceType: s.sourceType,
        reliabilityScore: s.reliabilityScore,
      }));
      const mergedScore = mergeConfidence(
        existing.confidence_score,
        sourceWeights,
        item.geolocationPrecision
      );
      const mergedStatus = deriveVerificationStatus(mergedScore, sourceWeights);
      await updateEventConfidence(existing.id, mergedScore, mergedStatus);

      // Link new sources
      for (const src of item.sources) {
        const source = await createSource({
          name: src.name,
          source_type: src.sourceType,
          url: src.url,
          publisher: src.publisher,
          published_at: src.publishedAt,
          reliability_score: src.reliabilityScore,
          raw_text: src.rawText,
        });
        await linkEventSource(existing.id, source.id);
      }

      return { event: { ...existing, confidence_score: mergedScore }, isNew: false };
    }
  }

  // 3. Create new event
  const eventInput: CreateEventInput = {
    external_id: item.externalId ?? null,
    title: item.title,
    summary: item.summary,
    description: item.description ?? null,
    event_type: item.eventType,
    severity: item.severity,
    confidence_score: confidenceScore,
    verification_status: verificationStatus,
    geolocation_precision: item.geolocationPrecision,
    latitude: item.latitude,
    longitude: item.longitude,
    location_radius_km: item.locationRadiusKm ?? null,
    country: item.country,
    region: item.region ?? null,
    city: item.city ?? null,
    occurred_at: item.occurredAt,
  };

  const event = await createEvent(eventInput);

  // 4. Create and link sources
  for (const src of item.sources) {
    const source = await createSource({
      name: src.name,
      source_type: src.sourceType,
      url: src.url,
      publisher: src.publisher,
      published_at: src.publishedAt,
      reliability_score: src.reliabilityScore,
      raw_text: src.rawText,
    });
    await linkEventSource(event.id, source.id);
  }

  return { event, isNew: true };
}
