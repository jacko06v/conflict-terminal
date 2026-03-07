export type EventType =
  | "explosion"
  | "airstrike"
  | "missile"
  | "drone"
  | "infrastructure"
  | "troop_movement"
  | "alert";

export type VerificationStatus = "unverified" | "partial" | "verified";
export type GeolocationPrecision = "exact" | "approximate" | "area";

export interface ConflictEvent {
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
  source_count?: number;
}

export interface Source {
  id: string;
  name: string;
  source_type: string;
  url: string | null;
  publisher: string | null;
  published_at: string | null;
  reliability_score: number;
  raw_text: string | null;
  created_at: string;
}

export interface EventDetail extends ConflictEvent {
  sources: Source[];
  nearby: ConflictEvent[];
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
  visible: boolean;
}

export interface Filters {
  country: string;
  eventType: EventType | "";
  verificationStatus: VerificationStatus | "";
  minConfidence: number;
  start: string;
  end: string;
  timeRange: "24h" | "7d" | "30d";
}

export interface WsMessage {
  type: "connected" | "new_event" | "update_event";
  payload: unknown;
}

export const EVENT_COLORS: Record<EventType, string> = {
  explosion: "#ef4444",
  airstrike: "#f97316",
  missile: "#f59e0b",
  drone: "#eab308",
  infrastructure: "#a855f7",
  troop_movement: "#3b82f6",
  alert: "#06b6d4",
};

export const EVENT_LABELS: Record<EventType, string> = {
  explosion: "Explosion",
  airstrike: "Airstrike",
  missile: "Missile",
  drone: "Drone",
  infrastructure: "Infrastructure",
  troop_movement: "Troop Movement",
  alert: "Alert",
};

export const VERIFICATION_COLORS: Record<VerificationStatus, string> = {
  verified: "#00ff88",
  partial: "#ffa500",
  unverified: "#ff3355",
};
