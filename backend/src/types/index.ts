export type EventType =
  | "explosion"
  | "airstrike"
  | "missile"
  | "drone"
  | "fire"
  | "infrastructure"
  | "troop_movement"
  | "alert";

export type VerificationStatus = "unverified" | "partial" | "verified";
export type GeolocationPrecision = "exact" | "approximate" | "area";
export type SourceType = "news" | "social" | "satellite" | "manual" | "api";
export type IngestionStatus = "running" | "completed" | "failed";

export interface Event {
  id: string;
  external_id: string | null;
  title: string;
  summary: string;
  description: string | null;
  event_type: EventType;
  severity: number;
  confidence_score: number;
  verification_status: VerificationStatus;
  geolocation_precision: GeolocationPrecision;
  latitude: number;
  longitude: number;
  location_radius_km: number | null;
  country: string;
  region: string | null;
  city: string | null;
  occurred_at: string;
  first_seen_at: string;
  last_updated_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventWithSources extends Event {
  sources: Source[];
  source_count: number;
}

export interface Source {
  id: string;
  name: string;
  source_type: SourceType;
  url: string | null;
  publisher: string | null;
  published_at: string | null;
  reliability_score: number;
  raw_text: string | null;
  created_at: string;
}

export interface Region {
  id: string;
  country: string;
  region: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
}

export interface IngestionRun {
  id: string;
  provider_name: string;
  started_at: string;
  completed_at: string | null;
  status: IngestionStatus;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  error_log: string | null;
}

export interface EventFilters {
  country?: string;
  region?: string;
  city?: string;
  eventType?: EventType;
  verificationStatus?: VerificationStatus;
  minConfidence?: number;
  start?: string;
  end?: string;
  bbox?: string; // "minLon,minLat,maxLon,maxLat"
  limit?: number;
  offset?: number;
}

export interface StatsResult {
  total_events: number;
  high_confidence_events: number;
  missile_drone_events: number;
  countries_affected: number;
  hotspots_count: number;
  last_event_at: string | null;
}

export interface TimelineBucket {
  bucket: string;
  count: number;
  event_type: EventType;
}

export interface MapLayer {
  id: string;
  name: string;
  event_type: EventType;
  color: string;
  icon: string;
  visible: boolean;
}

// Ingestion provider interface
export interface RawItem {
  externalId?: string;
  title: string;
  summary: string;
  description?: string;
  eventType: EventType;
  severity: number;
  latitude: number;
  longitude: number;
  locationRadiusKm?: number;
  country: string;
  region?: string;
  city?: string;
  occurredAt: Date;
  geolocationPrecision: GeolocationPrecision;
  sources: Array<{
    name: string;
    sourceType: SourceType;
    url?: string;
    publisher?: string;
    publishedAt?: Date;
    reliabilityScore: number;
    rawText?: string;
  }>;
}
